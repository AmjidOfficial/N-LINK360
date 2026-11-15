import { CfContext, getSupabaseAdminConfig, jsonResponse, optionsResponse } from './_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  return jsonResponse({
    application: 'N-LINK 360 - National Lights',
    mode: 'Cloudflare Pages Serverless Edge ($0 Forever)',
    supabaseConfigured: Boolean(getSupabaseAdminConfig(ctx.env) || ctx.env.VITE_SUPABASE_URL),
    authorizedApprovers: [
      'shahzadullah@nationallight.pk',
      'nationallights2026@gmail.com',
    ],
    activeModules: [
      'Attendance & 500m Geofence',
      'Customer 360 (Distributors & Dealers)',
      'Sales Order Engine & SKU Inventory',
      'Recovery & Financial Ledger',
      'Approval Security Gateway',
      'Google Sheets Live Database Sync',
      'AI Recovery Slip OCR & Verification',
    ],
  });
}
