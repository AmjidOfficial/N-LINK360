import { CfContext, jsonResponse, optionsResponse, verifyEdgeSessionToken } from '../_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();
  if (ctx.request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const secret = String(ctx.env.NLINK_SESSION_SECRET || '');
  const authHeader = ctx.request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = await verifyEdgeSessionToken(token, secret);
  if (!session) {
    return jsonResponse({ success: false, error: 'Authentication required.' }, 401);
  }

  return jsonResponse({
    success: false,
    retryAvailable: false,
    error: 'Automatic retry worker is not configured. No records were changed.',
  }, 501);
}
