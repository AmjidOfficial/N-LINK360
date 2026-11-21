-- Mirror of database/migrations/019_unified_sync_outbox_conflicts_notifications.sql for Supabase CLI workflows.
-- Keep identical to database/migrations/019_unified_sync_outbox_conflicts_notifications.sql.

-- 1. Durable Outbound Synchronization Outbox
CREATE TABLE IF NOT EXISTS public.sync_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  transaction_id text NOT NULL,
  direction text NOT NULL DEFAULT 'OUTBOUND' CHECK (direction IN ('OUTBOUND', 'INBOUND')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  sheet_tab text NOT NULL,
  operation text NOT NULL DEFAULT 'UPSERT' CHECK (operation IN ('UPSERT', 'INSERT', 'UPDATE', 'DELETE')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CONFLICT')),
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 6,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  external_sheet_id text DEFAULT '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo',
  response_metadata jsonb,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_outbox_idempotency
  ON public.sync_outbox (direction, entity_type, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_retry
  ON public.sync_outbox (status, next_retry_at ASC);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON public.sync_outbox (entity_type, entity_id, created_at DESC);

-- 2. Quarantine Table for Conflicts & Unauthorized Sheet Financial Edits
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  sheet_tab text NOT NULL,
  conflict_type text NOT NULL CHECK (
    conflict_type IN (
      'UNAUTHORIZED_FINANCIAL_EDIT',
      'VERSION_MISMATCH',
      'DUPLICATE_KEY',
      'VALIDATION_REJECTED',
      'REFERENTIAL_ERROR'
    )
  ),
  severity text NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  db_snapshot jsonb,
  sheet_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'RESOLVED_KEEP_DB', 'RESOLVED_ACCEPT_SHEET', 'DISMISSED')
  ),
  reason text NOT NULL,
  detected_by text NOT NULL DEFAULT 'SYNC_ENGINE',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_by text,
  resolved_at timestamptz,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status
  ON public.sync_conflicts (status, detected_at DESC);

-- 3. Persistent User-Scoped Notification Store
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  dedupe_key text,
  category text NOT NULL DEFAULT 'SYNC' CHECK (category IN ('SYNC', 'APPROVAL', 'CONFLICT', 'OFFLINE', 'SYSTEM')),
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id text,
  transaction_id text,
  sync_status text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_dedupe
  ON public.user_notifications (lower(user_email), dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (lower(user_email), is_read, created_at DESC);

ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_outbox_auth_select" ON public.sync_outbox;
CREATE POLICY "sync_outbox_auth_select"
  ON public.sync_outbox FOR SELECT TO authenticated
  USING (
    public.nlink_has_role('SUPER_ADMIN')
    OR public.nlink_has_role('MANAGEMENT')
    OR public.nlink_has_role('ACCOUNTS')
    OR lower(coalesce(created_by_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "sync_outbox_auth_insert" ON public.sync_outbox;
CREATE POLICY "sync_outbox_auth_insert"
  ON public.sync_outbox FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sync_conflicts_admin_select" ON public.sync_conflicts;
CREATE POLICY "sync_conflicts_admin_select"
  ON public.sync_conflicts FOR SELECT TO authenticated
  USING (
    public.nlink_has_role('SUPER_ADMIN')
    OR public.nlink_has_role('MANAGEMENT')
    OR public.nlink_has_role('ACCOUNTS')
  );

DROP POLICY IF EXISTS "user_notifications_owner_select" ON public.user_notifications;
CREATE POLICY "user_notifications_owner_select"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.nlink_has_role('SUPER_ADMIN')
  );

DROP POLICY IF EXISTS "user_notifications_owner_update" ON public.user_notifications;
CREATE POLICY "user_notifications_owner_update"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  WITH CHECK (lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE OR REPLACE FUNCTION public.nlink_enqueue_sync_outbox(
  p_idempotency_key text,
  p_transaction_id text,
  p_entity_type text,
  p_entity_id text,
  p_sheet_tab text,
  p_operation text DEFAULT 'UPSERT',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_emp uuid := public.nlink_current_employee_id();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  INSERT INTO public.sync_outbox (
    idempotency_key, transaction_id, direction, entity_type, entity_id,
    sheet_tab, operation, payload, status, created_by, created_by_email
  ) VALUES (
    p_idempotency_key, p_transaction_id, 'OUTBOUND', p_entity_type, p_entity_id,
    p_sheet_tab, coalesce(p_operation, 'UPSERT'), coalesce(p_payload, '{}'::jsonb),
    'PENDING', v_emp, nullif(v_email, '')
  )
  ON CONFLICT (direction, entity_type, idempotency_key)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    updated_at = now(),
    status = CASE WHEN public.sync_outbox.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'PENDING' END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nlink_resolve_sync_conflict(
  p_conflict_id uuid,
  p_resolution text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conflict record;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF NOT (
    public.nlink_has_role('SUPER_ADMIN')
    OR public.nlink_has_role('MANAGEMENT')
    OR public.nlink_has_role('ACCOUNTS')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin, Management, or Accounts can resolve sync conflicts.';
  END IF;

  SELECT * INTO v_conflict FROM public.sync_conflicts WHERE id = p_conflict_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sync conflict % not found.', p_conflict_id;
  END IF;

  IF p_resolution = 'RESOLVED_ACCEPT_SHEET'
     AND upper(v_conflict.entity_type) IN ('INVOICE', 'INVOICES', 'RECOVERY', 'RECOVERIES', 'LEDGER', 'LEDGER_ENTRIES', 'INVENTORY', 'INVENTORY_BALANCES')
     AND NOT public.nlink_has_role('SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Financial safety lock: Only SUPER_ADMIN can accept external overrides on financial entities.';
  END IF;

  UPDATE public.sync_conflicts
  SET status = p_resolution,
      resolved_by = coalesce(nullif(v_email, ''), 'SYSTEM_ADMIN'),
      resolved_at = now(),
      resolution_notes = p_notes
  WHERE id = p_conflict_id;

  PERFORM public.nlink_record_audit(
    'SYNC_CONFLICT_RESOLVE', 'SYNC_ENGINE', v_conflict.entity_type, p_conflict_id,
    jsonb_build_object('status', v_conflict.status, 'conflict_type', v_conflict.conflict_type),
    jsonb_build_object('status', p_resolution, 'notes', p_notes, 'resolved_by', v_email)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nlink_enqueue_sync_outbox(text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nlink_resolve_sync_conflict(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_enqueue_sync_outbox(text, text, text, text, text, text, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.nlink_resolve_sync_conflict(uuid, text, text) FROM public, anon;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'sales_orders', 'recoveries', 'customers', 'invoices',
    'inventory_balances', 'customer_visits', 'field_attendance',
    'sync_outbox', 'sync_conflicts', 'user_notifications'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY v_tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = v_table
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
END $$;
