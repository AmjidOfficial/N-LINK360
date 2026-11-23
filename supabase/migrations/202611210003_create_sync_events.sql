-- Persist API sync telemetry without treating it as a completed business transaction.
-- Only the server-side service_role may write/read these operational events.

CREATE TABLE IF NOT EXISTS public.sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  fingerprint_hash text,
  idempotency_key uuid,
  sync_status text NOT NULL DEFAULT 'EVENT_RECORDED'
    CHECK (sync_status IN ('EVENT_RECORDED', 'PROCESSING', 'PROCESSED', 'FAILED')),
  actor_email text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_received_at
  ON public.sync_events (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_idempotency_key
  ON public.sync_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sync_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.sync_events TO service_role;
