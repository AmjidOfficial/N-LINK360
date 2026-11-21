// N-LINK 360 — Authenticated Outbound Google Sheets UPSERT Synchronization Edge Function
// Target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TARGET_SPREADSHEET_ID = "1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nlink-sync-secret, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OutboundSyncRequest {
  source?: string;
  mode?: "UPSERT" | "BATCH_UPSERT" | "PROCESS_OUTBOX";
  outboxId?: string;
  idempotencyKey?: string;
  transactionId?: string;
  type?: "INSERT" | "UPDATE" | "DELETE" | "UPSERT";
  table?: string;
  entityType?: string;
  entityId?: string;
  sheetTab?: string;
  record?: Record<string, unknown>;
  records?: Array<{
    sheetTab: string;
    entityType: string;
    entityId: string;
    record: Record<string, unknown>;
    idempotencyKey?: string;
  }>;
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authorizeRequest(req: Request, admin: ReturnType<typeof getSupabaseAdmin>): Promise<boolean> {
  const expectedSecret = Deno.env.get("NLINK_SYNC_SECRET") || "";
  const providedSecret = req.headers.get("x-nlink-sync-secret") || "";
  if (expectedSecret && providedSecret && providedSecret === expectedSecret) {
    return true;
  }

  const authHeader = req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    // Allow internal Supabase webhook invocations when neither secret nor client JWT is configured
    return !expectedSecret;
  }

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceRole && jwt === serviceRole) {
    return true;
  }

  if (admin) {
    const { data, error } = await admin.auth.getUser(jwt);
    if (!error && data?.user) return true;
  }
  return false;
}

function resolveTabName(entityOrTable?: string, explicitTab?: string): string {
  if (explicitTab) return explicitTab;
  const key = String(entityOrTable || "").toLowerCase();
  if (key.includes("customer") || key.includes("dealer")) return "Customers";
  if (key.includes("order")) return "Sales_Orders";
  if (key.includes("recover")) return "Recoveries";
  if (key.includes("inventory") || key.includes("sku")) return "Inventory_Stock";
  if (key.includes("invoice")) return "Invoices";
  if (key.includes("visit")) return "Visits";
  if (key.includes("attendance")) return "Attendance";
  if (key.includes("ledger")) return "Ledger";
  if (key.includes("dispatch")) return "Dispatch";
  if (key.includes("return")) return "Returns";
  return "Sync_Log";
}

function computeNextRetryIso(retryCount: number): string {
  const delaySeconds = Math.min(3600, Math.pow(2, Math.max(1, retryCount)) * 30);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "POST required" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  const admin = getSupabaseAdmin();
  const isAuthorized = await authorizeRequest(req, admin);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized sync invocation" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const body = (await req.json()) as OutboundSyncRequest;
    const googleWebhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL") || "";
    const sheetToken = Deno.env.get("NLINK_SHEET_TOKEN") || "";

    const targetTab = resolveTabName(body.table || body.entityType, body.sheetTab);
    const idempotencyKey =
      body.idempotencyKey ||
      req.headers.get("x-idempotency-key") ||
      `edge-${targetTab}-${body.entityId || (body.record as any)?.id || Date.now()}`;

    const outboundPayload = {
      action: "UPSERT",
      mode: body.mode || "UPSERT",
      spreadsheetId: TARGET_SPREADSHEET_ID,
      source: body.source || "Supabase Edge Function",
      sheetTab: targetTab,
      entityType: body.entityType || body.table || targetTab,
      entityId: body.entityId || (body.record as any)?.id || idempotencyKey,
      event: body.type || "UPSERT",
      idempotencyKey,
      transactionId: body.transactionId || idempotencyKey,
      sheetToken: sheetToken || undefined,
      record: body.record || null,
      records: body.records || null,
      timestamp: new Date().toISOString(),
    };

    if (!googleWebhookUrl) {
      if (admin && body.outboxId) {
        await admin
          .from("sync_outbox")
          .update({
            status: "FAILED",
            last_error: "GOOGLE_SHEETS_WEBHOOK_URL is not configured in Supabase Edge Function secrets.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.outboxId);
      }
      return new Response(
        JSON.stringify({
          success: false,
          queued: true,
          error: "GOOGLE_SHEETS_WEBHOOK_URL secret is not configured in Supabase.",
          spreadsheetId: TARGET_SPREADSHEET_ID,
          sheetTab: targetTab,
          idempotencyKey,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const sheetResponse = await fetch(googleWebhookUrl, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        ...(sheetToken ? { "X-NLINK-SHEET-TOKEN": sheetToken } : {}),
      },
      body: JSON.stringify(outboundPayload),
    });

    const responseText = await sheetResponse.text();
    let parsedSheetResult: Record<string, unknown> = {};
    try {
      parsedSheetResult = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsedSheetResult = { raw: responseText.slice(0, 300) };
    }

    const remoteFailed =
      !sheetResponse.ok ||
      String(parsedSheetResult?.status || "").toLowerCase() === "error" ||
      parsedSheetResult?.success === false;

    if (remoteFailed) {
      const errMessage =
        String(parsedSheetResult?.message || parsedSheetResult?.error || "") ||
        `Apps Script HTTP ${sheetResponse.status}`;

      if (admin && body.outboxId) {
        const { data: existingRow } = await admin
          .from("sync_outbox")
          .select("retry_count")
          .eq("id", body.outboxId)
          .maybeSingle();
        const nextRetryCount = Number(existingRow?.retry_count || 0) + 1;
        await admin
          .from("sync_outbox")
          .update({
            status: "FAILED",
            retry_count: nextRetryCount,
            next_retry_at: computeNextRetryIso(nextRetryCount),
            last_error: errMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.outboxId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errMessage,
          sheetTab: targetTab,
          idempotencyKey,
          spreadsheetId: TARGET_SPREADSHEET_ID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    const nowIso = new Date().toISOString();
    if (admin) {
      if (body.outboxId) {
        await admin
          .from("sync_outbox")
          .update({
            status: "COMPLETED",
            last_error: null,
            response_metadata: parsedSheetResult,
            synced_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", body.outboxId);
      }

      await admin.from("google_sheet_sync_runs").insert({
        direction: "OUTBOUND",
        entity_type: String(body.entityType || body.table || targetTab),
        received_rows: Array.isArray(body.records) ? body.records.length : 1,
        applied_rows: Array.isArray(body.records) ? body.records.length : 1,
        rejected_rows: 0,
        source: "SUPABASE_EDGE_UPSERT",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        spreadsheetId: TARGET_SPREADSHEET_ID,
        sheetTab: targetTab,
        idempotencyKey,
        mirrored: parsedSheetResult,
        syncedAt: nowIso,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
