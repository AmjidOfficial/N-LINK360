import {
  CfContext,
  jsonResponse,
  optionsResponse,
  supabaseRestFetch,
  verifyEdgeSessionToken,
} from './_shared';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const contentLength = Number(ctx.request.headers.get('content-length') || '0');
  if (contentLength > 64 * 1024) {
    return jsonResponse({ success: false, error: 'Sync event payload exceeds 64 KB.' }, 413);
  }

  const payload = (await ctx.request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse({ success: false, error: 'A valid JSON event is required.' }, 400);
  }

  const eventType = String(payload.type || 'GENERAL_SYNC').trim().slice(0, 80);
  const idemKey = String(ctx.request.headers.get('x-idempotency-key') || payload.idempotencyKey || '').trim();
  const transactionId = String(payload.transactionSignature || payload.transactionId || payload.id || '').trim();
  const fingerprintHash = String(payload.fingerprintHash || '').trim();

  if (idemKey && !UUID_V4_RE.test(idemKey)) {
    return jsonResponse({ success: false, error: 'Invalid idempotency key. Expected UUID v4.' }, 400);
  }
  if (!transactionId || transactionId.length > 160) {
    return jsonResponse({ success: false, error: 'A valid transaction or event ID is required.' }, 400);
  }

  const dbResponse = await supabaseRestFetch(ctx.env, 'sync_events', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      transaction_id: transactionId,
      event_type: eventType,
      fingerprint_hash: fingerprintHash || null,
      idempotency_key: idemKey || null,
      sync_status: 'EVENT_RECORDED',
      actor_email: session.email,
      received_at: new Date().toISOString(),
    }),
  });

  if (!dbResponse) {
    return jsonResponse({ success: false, error: 'Sync database is not configured. Event was not recorded.' }, 503);
  }
  if (!dbResponse.ok) {
    const detail = (await dbResponse.text()).slice(0, 500);
    return jsonResponse({ success: false, error: 'Sync event could not be persisted.', detail }, 502);
  }

  const rows = await dbResponse.json().catch(() => []);
  return jsonResponse({
    success: true,
    persisted: true,
    message: 'Sync event recorded in the database. This does not confirm the underlying business transaction.',
    transactionId,
    eventType,
    duplicate: Array.isArray(rows) && rows.length === 0,
  });
}
