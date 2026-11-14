-- ==============================================================================
-- N-LINK 360 Enterprise ERP: Migration 017
-- Financial Idempotency Keys, Unique Transaction Constraints, Rate Limiting,
-- Security Event Auditing, and Serialized Row-Level Locks (Atomic RPCs)
-- ==============================================================================

-- 0. Ensure enum and missing lifecycle columns exist safely
ALTER TYPE recovery_status ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TABLE public.recoveries
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.employees(id);

-- 1. Persistent Idempotency Keys Across All Financial & Operational Tables
ALTER TABLE public.sales_orders        ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.invoices            ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.recoveries          ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.ledger_entries      ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.stock_returns       ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.customer_visits     ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.customers           ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_idempotency_key
  ON public.sales_orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_idempotency_key
  ON public.invoices (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recoveries_idempotency_key
  ON public.recoveries (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_idempotency_key
  ON public.ledger_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_txns_idempotency_key
  ON public.inventory_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_returns_idempotency_key
  ON public.stock_returns (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_visits_idempotency_key
  ON public.customer_visits (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_idempotency_key
  ON public.customers (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Prevent duplicate ledger postings or duplicate stock deductions for the same reference
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_reference_pair
  ON public.ledger_entries (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_txns_reference_sku
  ON public.inventory_transactions (reference_type, reference_id, sku_id, txn_type)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- 2. Centralized Server-Side Rate Limiting & Abuse Telemetry Tables
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key text PRIMARY KEY,
  action_name text NOT NULL,
  auth_user_id uuid,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON public.api_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  action_name text NOT NULL,
  severity text NOT NULL DEFAULT 'WARN',
  auth_user_id uuid,
  employee_id uuid REFERENCES public.employees(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events (created_at DESC);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limits FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.security_events FROM public, anon, authenticated;

DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events;
CREATE POLICY "security_events_admin_read"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (public.nlink_has_role('SUPER_ADMIN'));

-- 3. Rate Limit Enforcement & Security Event Logging RPCs
CREATE OR REPLACE FUNCTION public.nlink_log_security_event(
  p_event_type text,
  p_action_name text,
  p_severity text DEFAULT 'WARN',
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, action_name, severity, auth_user_id, employee_id, details
  ) VALUES (
    p_event_type, p_action_name, coalesce(p_severity, 'WARN'), auth.uid(), public.nlink_current_employee_id(), coalesce(p_details, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nlink_check_rate_limit(
  p_action text,
  p_max_requests integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bucket text;
  v_now timestamptz := now();
  v_rec record;
  v_window interval := make_interval(secs => greatest(coalesce(p_window_seconds, 60), 1));
  v_limit integer := greatest(coalesce(p_max_requests, 30), 1);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_bucket := v_uid::text || ':' || coalesce(nullif(trim(p_action), ''), 'DEFAULT');

  INSERT INTO public.api_rate_limits (bucket_key, action_name, auth_user_id, window_start, request_count, updated_at)
  VALUES (v_bucket, p_action, v_uid, v_now, 0, v_now)
  ON CONFLICT (bucket_key) DO NOTHING;

  SELECT * INTO v_rec
  FROM public.api_rate_limits
  WHERE bucket_key = v_bucket
  FOR UPDATE;

  IF v_rec.blocked_until IS NOT NULL AND v_rec.blocked_until > v_now THEN
    PERFORM public.nlink_log_security_event(
      'RATE_LIMIT_BLOCKED',
      p_action,
      'HIGH',
      jsonb_build_object('blocked_until', v_rec.blocked_until, 'count', v_rec.request_count)
    );
    RAISE EXCEPTION 'Rate limit exceeded for %. Retry after % seconds.',
      p_action,
      ceil(extract(epoch FROM (v_rec.blocked_until - v_now)))::integer;
  END IF;

  IF (v_now - v_rec.window_start) >= v_window THEN
    UPDATE public.api_rate_limits
    SET window_start = v_now,
        request_count = 1,
        blocked_until = NULL,
        updated_at = v_now
    WHERE bucket_key = v_bucket;
    RETURN true;
  END IF;

  IF (v_rec.request_count + 1) > v_limit THEN
    UPDATE public.api_rate_limits
    SET request_count = v_rec.request_count + 1,
        blocked_until = v_rec.window_start + v_window,
        updated_at = v_now
    WHERE bucket_key = v_bucket;

    PERFORM public.nlink_log_security_event(
      'RATE_LIMIT_EXCEEDED',
      p_action,
      'HIGH',
      jsonb_build_object('limit', v_limit, 'window_seconds', p_window_seconds, 'attempts', v_rec.request_count + 1)
    );

    RAISE EXCEPTION 'Rate limit exceeded for %. Retry after % seconds.',
      p_action,
      greatest(1, ceil(extract(epoch FROM ((v_rec.window_start + v_window) - v_now)))::integer);
  END IF;

  UPDATE public.api_rate_limits
  SET request_count = v_rec.request_count + 1,
      updated_at = v_now
  WHERE bucket_key = v_bucket;

  RETURN true;
END;
$$;

-- 4. Atomic Idempotent Sales Order Submission
DROP FUNCTION IF EXISTS public.nlink_submit_order(uuid, jsonb, numeric, text);
DROP FUNCTION IF EXISTS public.nlink_submit_order(uuid, jsonb, numeric, text, uuid);

CREATE OR REPLACE FUNCTION public.nlink_submit_order(
  p_customer_id uuid,
  p_items jsonb,
  p_recovery_amount numeric DEFAULT 0,
  p_remarks text DEFAULT null,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee uuid;
  v_order_id uuid;
  v_order_code text;
  v_previous numeric(18,2);
  v_recovery numeric(18,2) := greatest(coalesce(p_recovery_amount, 0), 0);
  v_requested numeric(18,2) := 0;
  v_net numeric(18,2);
  v_customer record;
  v_item record;
  v_balance record;
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
BEGIN
  v_employee := public.nlink_current_employee_id();
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Authenticated employee profile is required';
  END IF;

  -- Idempotency short-circuit before quota/lock consumption
  SELECT so.id INTO v_order_id
  FROM public.sales_orders so
  WHERE so.idempotency_key = v_key
  LIMIT 1;
  IF v_order_id IS NOT NULL THEN
    RETURN v_order_id;
  END IF;

  PERFORM public.nlink_check_rate_limit('ORDER_SUBMIT', 30, 60);

  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('SALES_MANAGER') OR
    public.nlink_has_role('SALES_RECOVERY')
  ) THEN
    RAISE EXCEPTION 'You are not authorized to submit sales orders';
  END IF;

  -- Lock customer row FOR UPDATE to serialize concurrent credit limit checks
  SELECT * INTO v_customer
  FROM public.customers c
  WHERE c.id = p_customer_id AND c.status = true
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found or inactive';
  END IF;

  -- Re-check idempotency after acquiring lock
  SELECT so.id INTO v_order_id
  FROM public.sales_orders so
  WHERE so.idempotency_key = v_key
  LIMIT 1;
  IF v_order_id IS NOT NULL THEN
    RETURN v_order_id;
  END IF;

  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('SALES_MANAGER') OR
    v_customer.assigned_employee_id = v_employee OR
    EXISTS (
      SELECT 1 FROM public.customer_assignments ca
      WHERE ca.customer_id = p_customer_id
        AND ca.employee_id = v_employee
        AND (ca.end_date IS NULL OR ca.end_date >= current_date)
    )
  ) THEN
    RAISE EXCEPTION 'Customer is not assigned to the current sales employee';
  END IF;

  v_previous := public.nlink_customer_balance(p_customer_id);

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order line is required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(sku_id uuid, order_qty numeric, unit_price numeric) LOOP
    IF v_item.order_qty IS NULL OR v_item.order_qty <= 0 THEN
      RAISE EXCEPTION 'Order quantity must be greater than zero';
    END IF;

    SELECT ib.* INTO v_balance
    FROM public.inventory_balances ib
    JOIN public.warehouses w ON w.id = ib.warehouse_id
    WHERE ib.sku_id = v_item.sku_id
      AND w.status = true
      AND w.warehouse_type = 'FACTORY_FINISHED_GOODS'
    ORDER BY ib.qty DESC
    LIMIT 1
    FOR UPDATE OF ib;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No available stock found for SKU %', v_item.sku_id;
    END IF;
    IF v_balance.qty < v_item.order_qty THEN
      RAISE EXCEPTION 'Insufficient stock for SKU %. Available %, requested %', v_item.sku_id, v_balance.qty, v_item.order_qty;
    END IF;

    IF coalesce(v_item.unit_price, 0) <= 0 THEN
      SELECT s.trade_price INTO v_item.unit_price FROM public.skus s WHERE s.id = v_item.sku_id AND s.status = true;
    END IF;
    IF coalesce(v_item.unit_price, 0) <= 0 THEN
      RAISE EXCEPTION 'Valid price is required for SKU %', v_item.sku_id;
    END IF;

    v_requested := v_requested + round(v_item.order_qty * v_item.unit_price, 2);
  END LOOP;

  v_net := round(v_previous - v_recovery, 2);

  IF v_customer.credit_limit > 0 AND (v_net + v_requested) > v_customer.credit_limit THEN
    RAISE EXCEPTION 'Credit limit exceeded. Current net balance %, order value %, limit %', v_net, v_requested, v_customer.credit_limit;
  END IF;

  v_order_code := 'ORD-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_order_seq')::text, 6, '0');

  INSERT INTO public.sales_orders (
    order_code, customer_id, employee_id, previous_balance, recovery_amount,
    net_balance, requested_amount, status, remarks, idempotency_key
  ) VALUES (
    v_order_code, p_customer_id, v_employee, v_previous, v_recovery,
    v_net, v_requested, 'SUBMITTED', p_remarks, v_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT so.id INTO v_order_id FROM public.sales_orders so WHERE so.idempotency_key = v_key;
    RETURN v_order_id;
  END IF;

  INSERT INTO public.sales_order_items (order_id, line_no, sku_id, available_qty, order_qty, approved_qty, unit_price, line_amount)
  SELECT
    v_order_id,
    row_number() OVER (),
    x.sku_id,
    coalesce((SELECT ib.qty FROM public.inventory_balances ib JOIN public.warehouses w ON w.id = ib.warehouse_id WHERE ib.sku_id = x.sku_id AND w.status = true AND w.warehouse_type = 'FACTORY_FINISHED_GOODS' ORDER BY ib.qty DESC LIMIT 1), 0),
    x.order_qty,
    0,
    CASE WHEN coalesce(x.unit_price, 0) > 0 THEN x.unit_price ELSE (SELECT s.trade_price FROM public.skus s WHERE s.id = x.sku_id) END,
    round(x.order_qty * CASE WHEN coalesce(x.unit_price, 0) > 0 THEN x.unit_price ELSE (SELECT s.trade_price FROM public.skus s WHERE s.id = x.sku_id) END, 2)
  FROM jsonb_to_recordset(p_items) AS x(sku_id uuid, order_qty numeric, unit_price numeric);

  RETURN v_order_id;
END;
$$;

-- 5. Atomic Idempotent Recovery Posting
CREATE OR REPLACE FUNCTION public.nlink_record_recovery(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_instrument_no text DEFAULT null,
  p_bank_name text DEFAULT null,
  p_remarks text DEFAULT null,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee uuid := public.nlink_current_employee_id();
  v_id uuid;
  v_code text;
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
BEGIN
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Authenticated employee profile is required';
  END IF;

  SELECT id INTO v_id FROM public.recoveries WHERE idempotency_key = v_key LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  PERFORM public.nlink_check_rate_limit('RECOVERY_SUBMIT', 30, 60);

  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('SALES_RECOVERY') OR
    public.nlink_has_role('SALES_MANAGER')
  ) THEN
    RAISE EXCEPTION 'Not authorized to record recovery';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Recovery amount must be greater than zero';
  END IF;

  v_code := 'REC-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_recovery_seq')::text, 6, '0');

  INSERT INTO public.recoveries (
    recovery_code, customer_id, employee_id, recovery_date, amount,
    payment_method, instrument_no, bank_name, status, remarks, idempotency_key
  ) VALUES (
    v_code, p_customer_id, v_employee, current_date, p_amount,
    p_payment_method, p_instrument_no, p_bank_name, 'PENDING_VERIFICATION', p_remarks, v_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.recoveries WHERE idempotency_key = v_key LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

-- 6. Hardened Idempotent Invoice Posting (Locks order, customer, and SKUs FOR UPDATE)
DROP FUNCTION IF EXISTS public.nlink_post_invoice(uuid);
DROP FUNCTION IF EXISTS public.nlink_post_invoice(uuid, uuid);

CREATE OR REPLACE FUNCTION public.nlink_post_invoice(
  p_order_id uuid,
  p_idempotency_key uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee uuid := public.nlink_current_employee_id();
  v_order record;
  v_customer record;
  v_invoice_id uuid;
  v_invoice_code text;
  v_previous numeric(18,2);
  v_new numeric(18,2);
  v_item record;
  v_balance record;
  v_amount numeric(18,2);
  v_warehouse uuid;
  v_line integer := 0;
BEGIN
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Authenticated employee profile is required';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_invoice_id FROM public.invoices WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_invoice_id IS NOT NULL THEN
      RETURN v_invoice_id;
    END IF;
  END IF;

  PERFORM public.nlink_check_rate_limit('INVOICE_POST', 30, 60);

  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('ACCOUNTS') OR
    public.nlink_has_role('SALES_MANAGER')
  ) THEN
    RAISE EXCEPTION 'Not authorized to post invoices';
  END IF;

  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- Idempotent return if the same order was already invoiced cleanly
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE order_id = p_order_id AND status <> 'CANCELLED'
  LIMIT 1;
  IF v_invoice_id IS NOT NULL THEN
    IF p_idempotency_key IS NOT NULL THEN
      RETURN v_invoice_id;
    END IF;
    RAISE EXCEPTION 'Order is already invoiced';
  END IF;

  IF v_order.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Order must be in APPROVED status before invoicing. Current status: %', v_order.status;
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = v_order.customer_id FOR UPDATE;
  v_previous := public.nlink_customer_balance(v_order.customer_id);
  v_amount := v_order.requested_amount;

  SELECT w.id INTO v_warehouse
  FROM public.warehouses w
  WHERE w.status = true AND w.warehouse_type = 'FACTORY_FINISHED_GOODS'
  ORDER BY w.created_at
  LIMIT 1;

  IF v_warehouse IS NULL THEN
    RAISE EXCEPTION 'No active finished-goods warehouse is configured';
  END IF;

  FOR v_item IN SELECT soi.* FROM public.sales_order_items soi WHERE soi.order_id = p_order_id ORDER BY soi.line_no LOOP
    SELECT ib.* INTO v_balance
    FROM public.inventory_balances ib
    WHERE ib.warehouse_id = v_warehouse AND ib.sku_id = v_item.sku_id
    FOR UPDATE;

    IF NOT FOUND OR v_balance.qty < coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty) THEN
      RAISE EXCEPTION 'Insufficient stock while posting invoice for SKU %', v_item.sku_id;
    END IF;
  END LOOP;

  v_invoice_code := 'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_invoice_seq')::text, 6, '0');
  v_new := round(v_previous + v_amount, 2);

  INSERT INTO public.invoices (
    invoice_code, order_id, customer_id, invoice_date, previous_balance,
    invoice_amount, new_balance, status, posted_at, posted_by, idempotency_key
  ) VALUES (
    v_invoice_code, p_order_id, v_order.customer_id, current_date, v_previous,
    v_amount, v_new, 'POSTED', now(), v_employee, coalesce(p_idempotency_key, gen_random_uuid())
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT soi.* FROM public.sales_order_items soi WHERE soi.order_id = p_order_id ORDER BY soi.line_no LOOP
    v_line := v_line + 1;
    INSERT INTO public.invoice_items (invoice_id, line_no, sku_id, qty, unit_price, line_amount)
    VALUES (
      v_invoice_id, v_line, v_item.sku_id,
      coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty),
      v_item.unit_price, v_item.line_amount
    );

    UPDATE public.inventory_balances
    SET qty = qty - coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty), updated_at = now()
    WHERE warehouse_id = v_warehouse AND sku_id = v_item.sku_id;

    INSERT INTO public.inventory_transactions (
      txn_code, warehouse_id, sku_id, txn_type, qty, reference_type, reference_id, posted_by, remarks
    ) VALUES (
      'ITX-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_inventory_txn_seq')::text, 6, '0'),
      v_warehouse, v_item.sku_id, 'SALES_OUT',
      coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty),
      'INVOICE', v_invoice_id, v_employee,
      'Automatic stock-out for ' || v_invoice_code
    )
    ON CONFLICT (reference_type, reference_id, sku_id, txn_type)
    WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL DO NOTHING;
  END LOOP;

  INSERT INTO public.ledger_entries (
    ledger_code, customer_id, entry_date, reference_type, reference_id,
    debit, credit, running_balance, posted_by, remarks
  ) VALUES (
    'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0'),
    v_order.customer_id, now(), 'INVOICE', v_invoice_id,
    v_amount, 0, v_new, v_employee, 'Invoice posting'
  )
  ON CONFLICT (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL DO NOTHING;

  UPDATE public.sales_orders SET status = 'INVOICED', updated_at = now() WHERE id = p_order_id;

  PERFORM public.nlink_record_audit(
    'INVOICE_POST', 'INVOICES', 'invoices', v_invoice_id, NULL,
    jsonb_build_object('invoice_code', v_invoice_code, 'order_id', p_order_id, 'amount', v_amount)
  );

  RETURN v_invoice_id;
END;
$$;

-- 7. Serialized Ledger Trigger Functions (Lock customer row FOR UPDATE)
CREATE OR REPLACE FUNCTION public.trg_fn_auto_create_invoice_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_running numeric(18,2);
  v_employee uuid;
  v_ledger_code text;
BEGIN
  IF (NEW.status IN ('POSTED', 'APPROVED')) THEN
    PERFORM 1 FROM public.customers WHERE id = NEW.customer_id FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries
      WHERE reference_type = 'INVOICE' AND reference_id = NEW.id
    ) THEN
      v_running := public.nlink_customer_balance(NEW.customer_id) + NEW.invoice_amount;
      v_employee := coalesce(NEW.posted_by, public.nlink_current_employee_id());
      v_ledger_code := 'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0');

      INSERT INTO public.ledger_entries (
        ledger_code, customer_id, entry_date, reference_type, reference_id,
        debit, credit, running_balance, posted_by, remarks
      ) VALUES (
        v_ledger_code, NEW.customer_id, now(), 'INVOICE', NEW.id,
        NEW.invoice_amount, 0, v_running, v_employee,
        'Auto-generated ledger debit upon invoice approval/posting (' || NEW.invoice_code || ')'
      )
      ON CONFLICT (reference_type, reference_id)
      WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_fn_auto_create_recovery_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_running numeric(18,2);
  v_employee uuid;
  v_ledger_code text;
BEGIN
  IF (NEW.status IN ('APPROVED', 'VERIFIED')) THEN
    PERFORM 1 FROM public.customers WHERE id = NEW.customer_id FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries
      WHERE reference_type = 'RECOVERY' AND reference_id = NEW.id
    ) THEN
      v_running := public.nlink_customer_balance(NEW.customer_id) - NEW.amount;
      v_employee := coalesce(NEW.verified_by, NEW.employee_id, public.nlink_current_employee_id());
      v_ledger_code := 'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0');

      INSERT INTO public.ledger_entries (
        ledger_code, customer_id, entry_date, reference_type, reference_id,
        debit, credit, running_balance, posted_by, remarks
      ) VALUES (
        v_ledger_code, NEW.customer_id, now(), 'RECOVERY', NEW.id,
        0, NEW.amount, v_running, v_employee,
        'Auto-generated ledger credit upon recovery verification/approval (' || coalesce(NEW.recovery_code, NEW.id::text) || ')'
      )
      ON CONFLICT (reference_type, reference_id)
      WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Hardened Recovery Verification (Sole Approver Shahzad Ullah + Serialized Lock)
CREATE OR REPLACE FUNCTION public.nlink_verify_recovery(p_recovery_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recovery record;
  v_customer record;
  v_previous numeric(18,2);
  v_new numeric(18,2);
  v_employee uuid := public.nlink_current_employee_id();
BEGIN
  PERFORM public.nlink_check_rate_limit('RECOVERY_VERIFY', 40, 60);

  IF NOT public.nlink_is_authorized_approver() THEN
    RAISE EXCEPTION 'Unauthorized: Only Shahzad Ullah (shahzadullah@nationallights.com) is authorized to verify recoveries.';
  END IF;

  SELECT * INTO v_recovery FROM public.recoveries WHERE id = p_recovery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recovery record not found';
  END IF;

  IF v_recovery.status IN ('APPROVED', 'VERIFIED') THEN
    RETURN true;
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = v_recovery.customer_id FOR UPDATE;
  v_previous := public.nlink_customer_balance(v_recovery.customer_id);
  v_new := round(v_previous - v_recovery.amount, 2);

  UPDATE public.recoveries
  SET status = 'APPROVED',
      verified_by = v_employee,
      updated_at = now()
  WHERE id = p_recovery_id;

  INSERT INTO public.ledger_entries (
    ledger_code, customer_id, entry_date, reference_type, reference_id,
    debit, credit, running_balance, posted_by, remarks
  ) VALUES (
    'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0'),
    v_recovery.customer_id, now(), 'RECOVERY', p_recovery_id,
    0, v_recovery.amount, v_new, v_employee, 'Recovery verification confirmed by Head Office'
  )
  ON CONFLICT (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL DO NOTHING;

  PERFORM public.nlink_record_audit(
    'RECOVERY_VERIFY', 'RECOVERIES', 'recoveries', p_recovery_id,
    jsonb_build_object('status', v_recovery.status),
    jsonb_build_object('status', 'APPROVED', 'amount', v_recovery.amount)
  );

  RETURN true;
END;
$$;

-- 9. Atomic Idempotent Customer Visit & Stock Adjustment RPCs
CREATE OR REPLACE FUNCTION public.nlink_log_visit(
  p_customer_id uuid,
  p_productive boolean DEFAULT false,
  p_latitude numeric DEFAULT null,
  p_longitude numeric DEFAULT null,
  p_notes text DEFAULT null,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee uuid := public.nlink_current_employee_id();
  v_id uuid;
  v_code text;
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
BEGIN
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Authenticated employee profile is required';
  END IF;

  SELECT id INTO v_id FROM public.customer_visits WHERE idempotency_key = v_key LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  PERFORM public.nlink_check_rate_limit('VISIT_LOG', 60, 60);

  v_code := 'VST-' || to_char(current_date, 'YYYY') || '-' || substring(gen_random_uuid()::text FROM 1 FOR 8);

  INSERT INTO public.customer_visits (
    visit_code, customer_id, employee_id, visit_at, latitude, longitude, productive, notes, idempotency_key
  ) VALUES (
    v_code, p_customer_id, v_employee, now(), p_latitude, p_longitude, coalesce(p_productive, false), p_notes, v_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.customer_visits WHERE idempotency_key = v_key LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nlink_stock_adjustment(
  p_warehouse_id uuid,
  p_sku_id uuid,
  p_txn_type inventory_txn_type,
  p_qty numeric,
  p_remarks text DEFAULT null,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee uuid := public.nlink_current_employee_id();
  v_txn_id uuid;
  v_balance record;
  v_delta numeric(18,3);
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
BEGIN
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Authenticated employee profile is required';
  END IF;

  SELECT id INTO v_txn_id FROM public.inventory_transactions WHERE idempotency_key = v_key LIMIT 1;
  IF v_txn_id IS NOT NULL THEN
    RETURN v_txn_id;
  END IF;

  PERFORM public.nlink_check_rate_limit('STOCK_ADJUST', 25, 60);

  IF NOT (
    public.nlink_has_role('SUPER_ADMIN') OR
    public.nlink_has_role('WAREHOUSE') OR
    public.nlink_has_role('FACTORY')
  ) THEN
    RAISE EXCEPTION 'Not authorized to adjust warehouse inventory';
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  v_delta := CASE
    WHEN p_txn_type IN ('PRODUCTION_IN', 'TRANSFER_IN', 'RETURN_IN', 'ADJUSTMENT_IN', 'DAMAGE_RECOVERY') THEN p_qty
    ELSE -p_qty
  END;

  INSERT INTO public.inventory_balances (warehouse_id, sku_id, qty, updated_at)
  VALUES (p_warehouse_id, p_sku_id, 0, now())
  ON CONFLICT (warehouse_id, sku_id) DO NOTHING;

  SELECT * INTO v_balance
  FROM public.inventory_balances
  WHERE warehouse_id = p_warehouse_id AND sku_id = p_sku_id
  FOR UPDATE;

  IF (v_balance.qty + v_delta) < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory balance (%) for deduction (%)', v_balance.qty, p_qty;
  END IF;

  INSERT INTO public.inventory_transactions (
    txn_code, warehouse_id, sku_id, txn_type, qty, remarks, posted_by, idempotency_key
  ) VALUES (
    'ITX-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_inventory_txn_seq')::text, 6, '0'),
    p_warehouse_id, p_sku_id, p_txn_type, p_qty, p_remarks, v_employee, v_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_txn_id;

  IF v_txn_id IS NULL THEN
    SELECT id INTO v_txn_id FROM public.inventory_transactions WHERE idempotency_key = v_key LIMIT 1;
    RETURN v_txn_id;
  END IF;

  UPDATE public.inventory_balances
  SET qty = qty + v_delta,
      updated_at = now()
  WHERE warehouse_id = p_warehouse_id AND sku_id = p_sku_id;

  RETURN v_txn_id;
END;
$$;

-- 10. Strict Function Privilege Grants (Authenticated Only, No Anonymous Access)
REVOKE EXECUTE ON FUNCTION public.nlink_log_security_event(text, text, text, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_check_rate_limit(text, integer, integer) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.nlink_submit_order(uuid, jsonb, numeric, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_submit_order(uuid, jsonb, numeric, text, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.nlink_record_recovery(uuid, numeric, payment_method, text, text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_record_recovery(uuid, numeric, payment_method, text, text, text, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.nlink_post_invoice(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_post_invoice(uuid, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.nlink_verify_recovery(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_verify_recovery(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.nlink_log_visit(uuid, boolean, numeric, numeric, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_log_visit(uuid, boolean, numeric, numeric, text, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.nlink_stock_adjustment(uuid, uuid, inventory_txn_type, numeric, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nlink_stock_adjustment(uuid, uuid, inventory_txn_type, numeric, text, uuid) FROM public, anon;
