-- ==============================================================================
-- N-LINK 360 Enterprise ERP: Migration 018
-- Global Auto-Sync Telemetry, Immutable Transaction Signatures & Fingerprints,
-- Historical Invoice Price Protection, Central Price List History,
-- Pakistan Timezone (Asia/Karachi) Date Preservation, and Sheet Reconciliation
-- ==============================================================================

-- 1. Transaction Signatures, Fingerprints & Reconciliation Metadata Columns
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS transaction_signature text,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS external_sheet_id text,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'SAVED_IN_DB',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'NLINK_WEB',
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS posted_by uuid REFERENCES public.employees(id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS transaction_signature text,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS external_sheet_id text,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'SAVED_IN_DB',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'NLINK_WEB',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.recoveries
  ADD COLUMN IF NOT EXISTS transaction_signature text,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS external_sheet_id text,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'SAVED_IN_DB',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'NLINK_WEB',
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id);

ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS transaction_signature text,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS external_sheet_id text,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'SAVED_IN_DB',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'NLINK_WEB',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Database Unique Constraints Preventing Duplicate Submissions
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_transaction_signature
  ON public.sales_orders (transaction_signature)
  WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_fingerprint_hash
  ON public.sales_orders (fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_transaction_signature
  ON public.invoices (transaction_signature)
  WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recoveries_transaction_signature
  ON public.recoveries (transaction_signature)
  WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recoveries_fingerprint_hash
  ON public.recoveries (fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_transaction_signature
  ON public.ledger_entries (transaction_signature)
  WHERE transaction_signature IS NOT NULL;

-- 3. Protect Immutable Invoice Business Date & Line-Item Price Snapshots
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS sku_name_snapshot text,
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(18,2),
  ADD COLUMN IF NOT EXISTS trade_price_snapshot numeric(18,2),
  ADD COLUMN IF NOT EXISTS discount_percent_snapshot numeric(6,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric(6,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS price_locked_at timestamptz;

CREATE OR REPLACE FUNCTION public.trg_fn_preserve_invoice_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Once posted/created, invoice_date represents the business document date and must NOT silently change on late edits
  IF OLD.invoice_date IS NOT NULL AND NEW.invoice_date IS DISTINCT FROM OLD.invoice_date THEN
    IF OLD.status IN ('POSTED', 'PAID', 'PARTIALLY_PAID') THEN
      NEW.invoice_date := OLD.invoice_date;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_preserve_invoice_date ON public.invoices;
CREATE TRIGGER trg_preserve_invoice_date
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_preserve_invoice_date();

-- Prevent historical posted invoice line-item prices from mutating when SKU master prices change
CREATE OR REPLACE FUNCTION public.trg_fn_lock_posted_invoice_item_price()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status::text INTO v_status FROM public.invoices WHERE id = NEW.invoice_id;
  IF TG_OP = 'INSERT' THEN
    NEW.unit_price_snapshot := coalesce(NEW.unit_price_snapshot, NEW.unit_price);
    NEW.price_locked_at := coalesce(NEW.price_locked_at, now());
    RETURN NEW;
  END IF;
  IF v_status IN ('POSTED', 'PAID', 'PARTIALLY_PAID') AND NEW.unit_price IS DISTINCT FROM OLD.unit_price THEN
    RAISE EXCEPTION 'Historical posted invoice item price is immutable once invoiced (Invoice ID: %)', NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_posted_invoice_item_price ON public.invoice_items;
CREATE TRIGGER trg_lock_posted_invoice_item_price
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_lock_posted_invoice_item_price();

-- 4. Central SKU Master Enrichments & Price History Log
ALTER TABLE public.skus
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS brand_name text DEFAULT 'National Light',
  ADD COLUMN IF NOT EXISTS uom text DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS purchase_price numeric(18,2),
  ADD COLUMN IF NOT EXISTS distributor_price numeric(18,2),
  ADD COLUMN IF NOT EXISTS discount_percentage text DEFAULT '15%',
  ADD COLUMN IF NOT EXISTS tax_rate numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_price_date date DEFAULT (now() AT TIME ZONE 'Asia/Karachi')::date;

CREATE TABLE IF NOT EXISTS public.sku_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid REFERENCES public.skus(id) ON DELETE CASCADE,
  sku_code text NOT NULL,
  sku_name text NOT NULL,
  old_trade_price numeric(18,2) NOT NULL,
  new_trade_price numeric(18,2) NOT NULL,
  old_list_price numeric(18,2) NOT NULL,
  new_list_price numeric(18,2) NOT NULL,
  old_discount_percent text,
  new_discount_percent text,
  effective_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Karachi')::date,
  changed_by uuid REFERENCES public.employees(id),
  changed_by_email text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sku_price_history_sku ON public.sku_price_history (sku_code, effective_date DESC);

-- 5. Central Sync Monitoring & Reconciliation Audit Tables
CREATE TABLE IF NOT EXISTS public.sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  record_type text NOT NULL,
  database_id text NOT NULL,
  external_sheet_id text,
  transaction_signature text,
  idempotency_key uuid,
  fingerprint_hash text,
  sync_status text NOT NULL DEFAULT 'SAVED_IN_DB',
  source_system text NOT NULL DEFAULT 'NLINK_WEB',
  last_db_saved_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_events_idempotency
  ON public.sync_events (module, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.reconciliation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'REQUIRES_RECONCILIATION',
  record_id text NOT NULL,
  transaction_signature text,
  customer_name text,
  title text NOT NULL,
  description text NOT NULL,
  database_value text,
  external_value text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_flags_status ON public.reconciliation_flags (status, detected_at DESC);

ALTER TABLE public.sku_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sku_price_history_auth_read" ON public.sku_price_history;
CREATE POLICY "sku_price_history_auth_read"
  ON public.sku_price_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sync_events_auth_read" ON public.sync_events;
CREATE POLICY "sync_events_auth_read"
  ON public.sync_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reconciliation_flags_auth_read" ON public.reconciliation_flags;
CREATE POLICY "reconciliation_flags_auth_read"
  ON public.reconciliation_flags FOR SELECT TO authenticated USING (true);

-- 6. RPC: Authorized SKU Price Update With History Logging
CREATE OR REPLACE FUNCTION public.nlink_update_sku_price(
  p_sku_code text,
  p_new_trade_price numeric,
  p_new_list_price numeric,
  p_discount_percent text DEFAULT '15%',
  p_effective_date date DEFAULT (now() AT TIME ZONE 'Asia/Karachi')::date,
  p_reason text DEFAULT 'Official Rate List Update'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sku record;
  v_employee uuid := public.nlink_current_employee_id();
  v_hist_id uuid;
BEGIN
  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('ACCOUNTS') OR
    public.nlink_is_authorized_approver()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin, Accounts, or Authorized Approver may change SKU prices.';
  END IF;

  IF p_new_trade_price IS NULL OR p_new_trade_price <= 0 OR p_new_list_price IS NULL OR p_new_list_price <= 0 THEN
    RAISE EXCEPTION 'Trade price and List price must be greater than zero.';
  END IF;

  SELECT * INTO v_sku FROM public.skus WHERE sku_code = p_sku_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SKU code % not found', p_sku_code;
  END IF;

  INSERT INTO public.sku_price_history (
    sku_id, sku_code, sku_name,
    old_trade_price, new_trade_price,
    old_list_price, new_list_price,
    old_discount_percent, new_discount_percent,
    effective_date, changed_by, reason
  ) VALUES (
    v_sku.id, v_sku.sku_code, v_sku.sku_name,
    coalesce(v_sku.trade_price, 0), p_new_trade_price,
    coalesce(v_sku.sale_price, 0), p_new_list_price,
    v_sku.discount_percentage, p_discount_percent,
    coalesce(p_effective_date, (now() AT TIME ZONE 'Asia/Karachi')::date),
    v_employee, coalesce(nullif(trim(p_reason), ''), 'Official Rate List Update')
  )
  RETURNING id INTO v_hist_id;

  UPDATE public.skus
  SET trade_price = p_new_trade_price,
      sale_price = p_new_list_price,
      dealer_price = p_new_list_price,
      discount_percentage = p_discount_percent,
      effective_price_date = coalesce(p_effective_date, (now() AT TIME ZONE 'Asia/Karachi')::date),
      updated_at = now()
  WHERE id = v_sku.id;

  PERFORM public.nlink_record_audit(
    'SKU_PRICE_UPDATE', 'PRICE_LIST', 'skus', v_sku.id,
    jsonb_build_object('trade_price', v_sku.trade_price, 'sale_price', v_sku.sale_price),
    jsonb_build_object('trade_price', p_new_trade_price, 'sale_price', p_new_list_price, 'effective_date', p_effective_date, 'reason', p_reason)
  );

  RETURN v_hist_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nlink_update_sku_price(text, numeric, numeric, text, date, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_update_sku_price(text, numeric, numeric, text, date, text) FROM public, anon;
