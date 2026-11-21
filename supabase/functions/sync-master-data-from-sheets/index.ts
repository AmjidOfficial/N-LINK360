import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-nlink-sheet-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "MANAGEMENT",
  "NSM",
  "ZSM",
  "RSM",
  "ASM",
  "TSM",
  "SS",
  "OB",
  "SALES_MANAGER",
  "SALES_RECOVERY",
  "ACCOUNTS",
  "WAREHOUSE_MANAGER",
  "FACTORY_MANAGER",
  "DISPATCH_OFFICER",
  "FACTORY",
  "WAREHOUSE",
  "DISPATCH",
]);

// Financial entities are authoritative in Supabase and MUST NEVER be overwritten from external spreadsheets
const PROHIBITED_FINANCIAL_TABS = [
  "invoices",
  "recoveries",
  "ledger",
  "ledger_entries",
  "inventory",
  "inventory_balances",
  "salesOrders",
  "sales_orders",
];

interface RejectedRow {
  tab: string;
  rowNumber: number;
  code?: string;
  reason: string;
}

interface ConflictSummary {
  entityType: string;
  entityId: string;
  sheetTab: string;
  conflictType: "UNAUTHORIZED_FINANCIAL_EDIT" | "VALIDATION_REJECTED" | "DUPLICATE_KEY";
  reason: string;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown): number {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function bool(value: unknown, fallback = true): boolean {
  const v = clean(value).toLowerCase();
  if (!v) return fallback;
  return !["false", "0", "inactive", "no", "disabled"].includes(v);
}

async function authenticate(req: Request): Promise<boolean> {
  const token = req.headers.get("x-nlink-sheet-token") || "";
  if (token) {
    const envToken = Deno.env.get("NLINK_SHEET_TOKEN") || "";
    if (envToken && token === envToken) return true;
    const hash = await sha256(token);
    const { data, error } = await admin
      .from("google_sheet_sync_tokens")
      .select("id")
      .eq("token_hash", hash)
      .eq("is_active", true)
      .maybeSingle();
    if (!error && data) return true;
  }

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    if (!error && data?.user) return true;
  }
  return false;
}

async function quarantineFinancialAttempts(
  payload: Record<string, unknown>,
  conflicts: ConflictSummary[]
): Promise<void> {
  for (const key of PROHIBITED_FINANCIAL_TABS) {
    const rawList = payload[key];
    if (!Array.isArray(rawList) || rawList.length === 0) continue;

    for (let idx = 0; idx < rawList.length; idx++) {
      const row = (rawList[idx] || {}) as Record<string, unknown>;
      const entityId = clean(
        row.id || row.invoiceNumber || row.invoiceCode || row.recoveryNumber || row.orderNumber || `ROW-${idx + 1}`
      );
      const reason = `Financial entity '${key}' attempted inbound write from Google Sheets. Supabase DB is authoritative; quarantined without mutating financial balances.`;

      await admin.from("sync_conflicts").insert({
        entity_type: key.toUpperCase(),
        entity_id: entityId,
        sheet_tab: key,
        conflict_type: "UNAUTHORIZED_FINANCIAL_EDIT",
        severity: "CRITICAL",
        db_snapshot: null,
        sheet_snapshot: row,
        status: "OPEN",
        reason,
        detected_by: "EDGE_INBOUND_GUARD",
      });

      await admin.from("audit_logs").insert({
        action: "INBOUND_FINANCIAL_EDIT_QUARANTINED",
        module: "GOOGLE_SHEETS_SYNC",
        record_type: key,
        record_id: entityId,
        details: reason,
        new_value: row,
      });

      conflicts.push({
        entityType: key.toUpperCase(),
        entityId,
        sheetTab: key,
        conflictType: "UNAUTHORIZED_FINANCIAL_EDIT",
        reason,
      });
    }
  }
}

async function upsertEmployees(rows: any[], rejected: RejectedRow[]): Promise<{ created: number; updated: number }> {
  if (!rows.length) return { created: 0, updated: 0 };
  const roleCodes = [...new Set(rows.map((r) => clean(r.role || r.designationCode || "OB").toUpperCase()).filter(Boolean))];
  const { data: roles, error: roleError } = await admin.from("roles").select("id,role_code").in("role_code", roleCodes);
  if (roleError) throw roleError;
  const roleMap = new Map((roles || []).map((r: any) => [r.role_code, r.id]));

  const seenCodes = new Set<string>();
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNumber = Number(row._rowNumber || i + 2);
    const employeeCode = clean(row.employeeCode || row.code || row.employee_code);
    const fullName = clean(row.fullName || row.name || row.employee_name);
    const email = clean(row.email).toLowerCase() || null;
    const roleCode = clean(row.role || row.designationCode || "OB").toUpperCase();

    if (!employeeCode) {
      rejected.push({ tab: "Team", rowNumber, reason: "Missing mandatory employeeCode" });
      continue;
    }
    if (!fullName) {
      rejected.push({ tab: "Team", rowNumber, code: employeeCode, reason: "Missing mandatory fullName" });
      continue;
    }
    if (seenCodes.has(employeeCode.toLowerCase())) {
      rejected.push({ tab: "Team", rowNumber, code: employeeCode, reason: `Duplicate employeeCode '${employeeCode}' in batch` });
      continue;
    }
    seenCodes.add(employeeCode.toLowerCase());

    if (email && !EMAIL_REGEX.test(email)) {
      rejected.push({ tab: "Team", rowNumber, code: employeeCode, reason: `Invalid email format '${email}'` });
      continue;
    }
    if (!ALLOWED_ROLES.has(roleCode)) {
      rejected.push({ tab: "Team", rowNumber, code: employeeCode, reason: `Invalid role '${roleCode}'` });
      continue;
    }

    const { data: existing } = await admin
      .from("employees")
      .select("id")
      .eq("employee_code", employeeCode)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      employee_code: employeeCode,
      full_name: fullName,
      mobile: clean(row.phone || row.mobile) || null,
      email,
      department: clean(row.department) || "SALES",
      designation_code: roleCode,
      designation_id: roleMap.get(roleCode) || null,
      territory: clean(row.region || row.territory) || null,
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("employees").upsert(payload, { onConflict: "employee_code" });
    if (error) {
      rejected.push({ tab: "Team", rowNumber, code: employeeCode, reason: error.message });
      continue;
    }
    if (existing) updated++;
    else created++;
  }
  return { created, updated };
}

async function upsertUsers(rows: any[], rejected: RejectedRow[]): Promise<{ created: number; updated: number }> {
  if (!rows.length) return { created: 0, updated: 0 };
  const seenEmails = new Set<string>();
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNumber = Number(row._rowNumber || i + 2);
    const email = clean(row.email).toLowerCase();
    const fullName = clean(row.fullName || row.name);
    const userCode = clean(row.userCode || row.user_code) || `USR-${email.replace(/[^a-z0-9]/g, "").slice(0, 12).toUpperCase()}`;

    if (!email || !EMAIL_REGEX.test(email)) {
      rejected.push({ tab: "Users", rowNumber, code: userCode, reason: "Missing or invalid email" });
      continue;
    }
    if (!fullName) {
      rejected.push({ tab: "Users", rowNumber, code: userCode, reason: "Missing mandatory fullName" });
      continue;
    }
    if (seenEmails.has(email)) {
      rejected.push({ tab: "Users", rowNumber, code: userCode, reason: `Duplicate user email '${email}' in batch` });
      continue;
    }
    seenEmails.add(email);

    const { data: employee } = await admin.from("employees").select("id").eq("email", email).maybeSingle();
    const { data: existing } = await admin.from("users").select("id").eq("user_code", userCode).maybeSingle();

    const { error } = await admin.from("users").upsert({
      user_code: userCode,
      employee_id: employee?.id || null,
      username: email,
      status: bool(row.status, true),
      auth_user_id: clean(row.authUserId || row.auth_user_id) || null,
    }, { onConflict: "user_code" });

    if (error) {
      rejected.push({ tab: "Users", rowNumber, code: userCode, reason: error.message });
      continue;
    }
    if (existing) updated++;
    else created++;
  }
  return { created, updated };
}

async function upsertCustomers(
  rows: any[],
  rejected: RejectedRow[],
  conflicts: ConflictSummary[]
): Promise<{ created: number; updated: number }> {
  if (!rows.length) return { created: 0, updated: 0 };
  const seenCodes = new Set<string>();
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNumber = Number(row._rowNumber || i + 2);
    const code = clean(row.customerCode || row.code || row.customer_code);
    const name = clean(row.companyName || row.businessName || row.name);
    const type = clean(row.type || row.customerType || "DEALER").toUpperCase();
    const creditLimit = num(row.creditLimit);
    const creditDays = Math.round(num(row.creditDays));

    if (!code) {
      rejected.push({ tab: "Dealers", rowNumber, reason: "Missing mandatory customerCode" });
      continue;
    }
    if (!name) {
      rejected.push({ tab: "Dealers", rowNumber, code, reason: "Missing mandatory companyName / businessName" });
      continue;
    }
    if (!["DEALER", "DISTRIBUTOR"].includes(type)) {
      rejected.push({ tab: "Dealers", rowNumber, code, reason: `Invalid dealer type '${type}' (expected DEALER or DISTRIBUTOR)` });
      continue;
    }
    if (creditLimit < 0 || creditDays < 0) {
      rejected.push({ tab: "Dealers", rowNumber, code, reason: "Negative creditLimit or creditDays not permitted" });
      continue;
    }
    if (seenCodes.has(code.toLowerCase())) {
      rejected.push({ tab: "Dealers", rowNumber, code, reason: `Duplicate customerCode '${code}' in batch` });
      continue;
    }
    seenCodes.add(code.toLowerCase());

    const { data: existing } = await admin
      .from("customers")
      .select("id, current_balance, opening_balance")
      .eq("customer_code", code)
      .maybeSingle();

    // Protect existing posted ledger balance from unauthorized Sheet override
    if (existing && row.currentBalance !== undefined && clean(row.currentBalance) !== "") {
      const sheetBalance = num(row.currentBalance);
      const dbBalance = Number(existing.current_balance || 0);
      if (Math.abs(sheetBalance - dbBalance) > 0.01) {
        const reason = `Sheet attempted to alter authoritative current_balance for ${code} (DB: ${dbBalance}, Sheet: ${sheetBalance}). Ignored & quarantined.`;
        await admin.from("sync_conflicts").insert({
          entity_type: "CUSTOMER_BALANCE",
          entity_id: code,
          sheet_tab: "Dealers",
          conflict_type: "UNAUTHORIZED_FINANCIAL_EDIT",
          severity: "HIGH",
          db_snapshot: { current_balance: dbBalance },
          sheet_snapshot: row,
          status: "OPEN",
          reason,
          detected_by: "EDGE_INBOUND_GUARD",
        });
        conflicts.push({
          entityType: "CUSTOMER_BALANCE",
          entityId: code,
          sheetTab: "Dealers",
          conflictType: "UNAUTHORIZED_FINANCIAL_EDIT",
          reason,
        });
      }
    }

    const upsertDoc: Record<string, unknown> = {
      customer_code: code,
      name,
      customer_type: type,
      owner_name: clean(row.contactPerson || row.ownerName) || null,
      mobile: clean(row.phone || row.mobile) || null,
      address: clean(row.address) || null,
      city: clean(row.city || row.town) || null,
      area: clean(row.area) || null,
      territory: clean(row.territory || row.route) || null,
      credit_limit: creditLimit,
      credit_days: creditDays,
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    };
    // Only set opening_balance on initial creation
    if (!existing) {
      upsertDoc.opening_balance = Math.max(0, num(row.openingBalance));
    }

    const { error } = await admin.from("customers").upsert(upsertDoc, { onConflict: "customer_code" });
    if (error) {
      rejected.push({ tab: "Dealers", rowNumber, code, reason: error.message });
      continue;
    }
    if (existing) updated++;
    else created++;
  }
  return { created, updated };
}

async function upsertProducts(rows: any[], rejected: RejectedRow[]): Promise<{ created: number; updated: number }> {
  if (!rows.length) return { created: 0, updated: 0 };
  const seenSkus = new Set<string>();
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowNumber = Number(row._rowNumber || i + 2);
    const skuCode = clean(row.skuCode || row.code || row.sku_code);
    const name = clean(row.name || row.skuName || row.description);
    const brandName = clean(row.brandName || row.brand) || "National Lights";
    const tradePrice = num(row.tradePrice);

    if (!skuCode) {
      rejected.push({ tab: "Products", rowNumber, reason: "Missing mandatory skuCode" });
      continue;
    }
    if (!name) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: "Missing mandatory product/SKU name" });
      continue;
    }
    if (tradePrice < 0 || num(row.retailPrice || row.salePrice) < 0) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: "Prices cannot be negative" });
      continue;
    }
    if (seenSkus.has(skuCode.toLowerCase())) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: `Duplicate skuCode '${skuCode}' in batch` });
      continue;
    }
    seenSkus.add(skuCode.toLowerCase());

    const brandCode = brandName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 40);
    const { data: brand, error: brandError } = await admin
      .from("brands")
      .upsert({ brand_code: brandCode, name: brandName, status: true }, { onConflict: "brand_code" })
      .select("id")
      .single();
    if (brandError) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: brandError.message });
      continue;
    }

    const productCode = clean(row.productCode || row.product_code) || skuCode;
    const { data: product, error: productError } = await admin
      .from("products")
      .upsert({
        product_code: productCode,
        brand_id: brand.id,
        name,
        model: clean(row.model) || null,
        wattage: clean(row.wattage) || null,
        status: bool(row.status, true),
      }, { onConflict: "product_code" })
      .select("id")
      .single();
    if (productError) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: productError.message });
      continue;
    }

    const { data: existingSku } = await admin.from("skus").select("id").eq("sku_code", skuCode).maybeSingle();
    const { error: skuError } = await admin.from("skus").upsert({
      sku_code: skuCode,
      barcode: clean(row.barcode) || null,
      product_id: product.id,
      sku_name: name,
      packing_unit: clean(row.packingUnit) || "PIECE",
      units_per_carton: Math.max(1, num(row.cartonQuantity || row.unitsPerCarton || 1)),
      cost_price: num(row.costPrice),
      trade_price: tradePrice,
      dealer_price: num(row.minimumPrice || row.dealerPrice || row.tradePrice),
      sale_price: num(row.retailPrice || row.salePrice),
      tax_rate: num(row.taxRate),
      reorder_level: num(row.reorderLevel),
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    }, { onConflict: "sku_code" });

    if (skuError) {
      rejected.push({ tab: "Products", rowNumber, code: skuCode, reason: skuError.message });
      continue;
    }
    if (existingSku) updated++;
    else created++;
  }
  return { created, updated };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!(await authenticate(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const rejected: RejectedRow[] = [];
    const conflicts: ConflictSummary[] = [];

    await quarantineFinancialAttempts(payload, conflicts);

    const empRes = await upsertEmployees(Array.isArray(payload.employees) ? payload.employees : [], rejected);
    const usrRes = await upsertUsers(Array.isArray(payload.users) ? payload.users : [], rejected);
    const custRes = await upsertCustomers(Array.isArray(payload.customers) ? payload.customers : [], rejected, conflicts);
    const prodRes = await upsertProducts(Array.isArray(payload.products) ? payload.products : [], rejected);

    const results = {
      employees: empRes.created + empRes.updated,
      users: usrRes.created + usrRes.updated,
      customers: custRes.created + custRes.updated,
      products: prodRes.created + prodRes.updated,
    };

    const createdCount = empRes.created + usrRes.created + custRes.created + prodRes.created;
    const updatedCount = empRes.updated + usrRes.updated + custRes.updated + prodRes.updated;
    const totalReceived =
      (Array.isArray(payload.employees) ? payload.employees.length : 0) +
      (Array.isArray(payload.users) ? payload.users.length : 0) +
      (Array.isArray(payload.customers) ? payload.customers.length : 0) +
      (Array.isArray(payload.products) ? payload.products.length : 0);

    await admin.from("google_sheet_sync_runs").insert({
      direction: "INBOUND",
      entity_type: "MASTER_DATA",
      received_rows: totalReceived,
      applied_rows: createdCount + updatedCount,
      rejected_rows: rejected.length,
      error_message: conflicts.length ? `${conflicts.length} financial conflict(s) quarantined` : null,
      source: "GOOGLE_SHEETS",
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        createdCount,
        updatedCount,
        rejectedCount: rejected.length,
        conflictCount: conflicts.length,
        rejected,
        conflicts,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("google_sheet_sync_runs").insert({
      direction: "INBOUND",
      entity_type: "MASTER_DATA",
      error_message: message,
      source: "GOOGLE_SHEETS",
    });
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
