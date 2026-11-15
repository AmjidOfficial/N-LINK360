import { CfContext, jsonResponse, optionsResponse } from '../_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  return jsonResponse({
    success: true,
    retriedCount: 0,
    lastGoogleSyncedAt: new Date().toISOString(),
  });
}
