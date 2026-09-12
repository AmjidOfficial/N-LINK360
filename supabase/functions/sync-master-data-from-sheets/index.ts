import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-nlink-sheet-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  if (!token) return false;
  const hash = await sha256(token);
  const { data, error } = await admin
    .from("google_sheet_sync_tokens")
    .select("id")
    .eq("token_hash", hash)
    .eq("is_active", true)
    .maybeSingle();
  return !error && !!data;
}

async function upsertEmployees(rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  const roleCodes = [...new Set(rows.map((r) => clean(r.role || r.designationCode || "OB")).filter(Boolean))];
  const { data: roles, error: roleError } = await admin.from("roles").select("id,role_code").in("role_code", roleCodes);
  if (roleError) throw roleError;
  const roleMap = new Map((roles || []).map((r: any) => [r.role_code, r.id]));

  let applied = 0;
  for (const row of rows) {
    const employeeCode = clean(row.employeeCode || row.code || row.employee_code);
    const fullName = clean(row.fullName || row.name || row.employee_name);
    const email = clean(row.email).toLowerCase() || null;
    if (!employeeCode || !fullName) continue;
    const roleCode = clean(row.role || row.designationCode || "OB");
    const roleId = roleMap.get(roleCode) || null;
    const payload: any = {
      employee_code: employeeCode,
      full_name: fullName,
      mobile: clean(row.phone || row.mobile) || null,
      email,
      department: clean(row.department) || "SALES",
      designation_code: roleCode,
      designation_id: roleId,
      territory: clean(row.region || row.territory) || null,
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("employees").upsert(payload, { onConflict: "employee_code" });
    if (error) throw error;
    applied++;
  }
  return applied;
}

async function upsertUsers(rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  let applied = 0;
  for (const row of rows) {
    const email = clean(row.email).toLowerCase();
    const fullName = clean(row.fullName || row.name);
    const userCode = clean(row.userCode || row.user_code) || `USR-${email.replace(/[^a-z0-9]/g, "").slice(0, 12).toUpperCase()}`;
    if (!email || !fullName) continue;

    const { data: employee } = await admin
      .from("employees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { error } = await admin.from("users").upsert({
      user_code: userCode,
      employee_id: employee?.id || null,
      username: email,
      status: bool(row.status, true),
      auth_user_id: clean(row.authUserId || row.auth_user_id) || null,
    }, { onConflict: "user_code" });
    if (error) throw error;
    applied++;
  }
  return applied;
}

async function upsertCustomers(rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  let applied = 0;
  for (const row of rows) {
    const code = clean(row.customerCode || row.code || row.customer_code);
    const name = clean(row.companyName || row.businessName || row.name);
    const type = clean(row.type || row.customerType || "DEALER").toUpperCase();
    if (!code || !name || !["DEALER", "DISTRIBUTOR"].includes(type)) continue;
    const { error } = await admin.from("customers").upsert({
      customer_code: code,
      name,
      owner_name: clean(row.contactPerson || row.ownerName) || null,
      mobile: clean(row.phone || row.mobile) || null,
      address: clean(row.address) || null,
      city: clean(row.city || row.town) || null,
      area: clean(row.area) || null,
      territory: clean(row.territory || row.route) || null,
      credit_limit: num(row.creditLimit),
      credit_days: Math.max(0, Math.round(num(row.creditDays))),
      opening_balance: num(row.openingBalance),
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    }, { onConflict: "customer_code" });
    if (error) throw error;
    applied++;
  }
  return applied;
}

async function upsertProducts(rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  let applied = 0;
  for (const row of rows) {
    const skuCode = clean(row.skuCode || row.code || row.sku_code);
    const name = clean(row.name || row.skuName || row.description);
    const brandName = clean(row.brandName || row.brand) || "National Lights";
    if (!skuCode || !name) continue;

    const brandCode = brandName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 40);
    const { data: brand, error: brandError } = await admin.from("brands").upsert({
      brand_code: brandCode,
      name: brandName,
      status: true,
    }, { onConflict: "brand_code" }).select("id").single();
    if (brandError) throw brandError;

    const productCode = clean(row.productCode || row.product_code) || skuCode;
    const { data: product, error: productError } = await admin.from("products").upsert({
      product_code: productCode,
      brand_id: brand.id,
      name,
      model: clean(row.model) || null,
      wattage: clean(row.wattage) || null,
      status: bool(row.status, true),
    }, { onConflict: "product_code" }).select("id").single();
    if (productError) throw productError;

    const { error: skuError } = await admin.from("skus").upsert({
      sku_code: skuCode,
      barcode: clean(row.barcode) || null,
      product_id: product.id,
      sku_name: name,
      packing_unit: clean(row.packingUnit) || "PIECE",
      units_per_carton: Math.max(1, num(row.cartonQuantity || row.unitsPerCarton || 1)),
      cost_price: num(row.costPrice),
      trade_price: num(row.tradePrice),
      dealer_price: num(row.minimumPrice || row.dealerPrice || row.tradePrice),
      sale_price: num(row.retailPrice || row.salePrice),
      tax_rate: num(row.taxRate),
      reorder_level: num(row.reorderLevel),
      status: bool(row.status, true),
      updated_at: new Date().toISOString(),
    }, { onConflict: "sku_code" });
    if (skuError) throw skuError;
    applied++;
  }
  return applied;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!(await authenticate(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    const results: Record<string, number> = {};
    results.employees = await upsertEmployees(Array.isArray(payload.employees) ? payload.employees : []);
    results.users = await upsertUsers(Array.isArray(payload.users) ? payload.users : []);
    results.customers = await upsertCustomers(Array.isArray(payload.customers) ? payload.customers : []);
    results.products = await upsertProducts(Array.isArray(payload.products) ? payload.products : []);

    const totalReceived = Object.values(payload).reduce((sum: number, value: unknown) => sum + (Array.isArray(value) ? value.length : 0), 0);
    const totalApplied = Object.values(results).reduce((sum, value) => sum + value, 0);
    await admin.from("google_sheet_sync_runs").insert({
      direction: "INBOUND",
      entity_type: "MASTER_DATA",
      received_rows: totalReceived,
      applied_rows: totalApplied,
      rejected_rows: Math.max(0, totalReceived - totalApplied),
      source: "GOOGLE_SHEETS",
    });

    return new Response(JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("google_sheet_sync_runs").insert({ direction: "INBOUND", entity_type: "MASTER_DATA", error_message: message, source: "GOOGLE_SHEETS" });
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
