import { CfContext, jsonResponse, optionsResponse, supabaseRestFetch } from '../_shared';

export async function onRequest(ctx: CfContext): Promise<Response> {
  if (ctx.request.method === 'OPTIONS') return optionsResponse();

  let events: any[] = [];
  try {
    const res = await supabaseRestFetch(
      ctx.env,
      'sync_events?select=*&order=received_at.desc&limit=50'
    );
    if (res && res.ok) {
      const rows = (await res.json()) as any[];
      if (Array.isArray(rows)) {
        events = rows.map((r) => ({
          id: String(r.id || r.transaction_id || `SEV-${Date.now()}`),
          type: String(r.event_type || 'GENERAL_SYNC'),
          transactionId: String(r.transaction_id || ''),
          fingerprintHash: r.fingerprint_hash || undefined,
          idempotencyKey: r.idempotency_key || undefined,
          syncStatus: String(r.sync_status || 'SAVED_IN_DB'),
          receivedAt: String(r.received_at || new Date().toISOString()),
        }));
      }
    }
  } catch {}

  const pendingCount = events.filter((e) => e.syncStatus === 'PENDING_GOOGLE_SYNC').length;
  const failedCount = events.filter((e) => e.syncStatus === 'SYNC_FAILED').length;
  const reconciliationCount = events.filter((e) => e.syncStatus === 'REQUIRES_RECONCILIATION').length;

  return jsonResponse({
    success: true,
    lastDbSavedAt: events[0]?.receivedAt || null,
    lastGoogleSyncedAt: null,
    duplicatesPrevented: 0,
    pendingCount,
    failedCount,
    reconciliationCount,
    totalTrackedRecords: events.length,
    events,
  });
}
