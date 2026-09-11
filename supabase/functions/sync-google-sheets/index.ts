// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs on Supabase Edge Functions (Deno Runtime) server-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TARGET_SPREADSHEET_ID = "1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: any;
  old_record: any;
}

serve(async (req) => {
  // CORS headers for preflight and secure server-to-server invocation
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const googleWebhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
    const serviceAccountKeyJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");

    console.log(`[Edge Function Sync] Triggered by table: ${payload.table}, event: ${payload.type}`);

    // If a Google Apps Script Webhook is configured in Supabase Secrets:
    if (googleWebhookUrl) {
      const response = await fetch(googleWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Supabase Database Webhook",
          table: payload.table,
          event: payload.type,
          record: payload.record,
          timestamp: new Date().toISOString(),
          spreadsheetId: TARGET_SPREADSHEET_ID,
        }),
      });

      const result = await response.text();
      return new Response(JSON.stringify({ success: true, mirrored: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database event processed. Set GOOGLE_SHEETS_WEBHOOK_URL secret in Supabase for live push.",
        event: payload.type,
        table: payload.table,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Edge Function Error]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
