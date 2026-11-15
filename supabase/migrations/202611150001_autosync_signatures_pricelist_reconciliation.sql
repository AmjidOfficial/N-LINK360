-- ==============================================================================
-- N-LINK 360 Enterprise ERP: Supabase Migration 202611150001
-- Mirrors database/migrations/018_autosync_signatures_pricelist_reconciliation.sql
-- ==============================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_transaction_signature
  ON public.sales_orders (transaction_signature) WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_fingerprint_hash
  ON public.sales_orders (fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_transaction_signature
  ON public.invoices (transaction_signature) WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recoveries_transaction_signature
  ON public.recoveries (transaction_signature) WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recoveries_fingerprint_hash
  ON public.recoveries (fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_transaction_signature
  ON public.ledger_entries (transaction_signature) WHERE transaction_signature IS NOT NULL;

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
  BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trg_fn_preserve_invoice_date();

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
  BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_fn_lock_posted_invoice_item_price();

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
