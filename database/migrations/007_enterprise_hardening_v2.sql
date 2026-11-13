-- N-LINK 360 Database & Transaction Hardening (v2)
-- 1. Reconcile customer_type enum
alter type customer_type add value if not exists 'CUSTOMER';
alter type customer_type add value if not exists 'SHOP';

-- 2. Reconcile order_status enum for full order lifecycle
alter type order_status add value if not exists 'CREDIT_CHECK';
alter type order_status add value if not exists 'APPROVAL';
alter type order_status add value if not exists 'DISPATCHED';
alter type order_status add value if not exists 'DELIVERED';

-- 3. Bulk Ingestion Batch & Row Tracking Tables
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code varchar(50) not null unique,
  entity_type varchar(50) not null,
  uploaded_by uuid references users(id),
  total_rows integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  duplicate_count integer not null default 0,
  duplicate_strategy varchar(20) not null default 'UPDATE',
  status varchar(30) not null default 'COMPLETED',
  error_summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  parsed_data jsonb,
  status varchar(20) not null default 'PENDING',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_batches_code on import_batches(batch_code);
create index if not exists idx_import_rows_batch on import_rows(batch_id);

-- 4. Append-Only Audit Logging Helper
create or replace function public.nlink_record_audit(
  p_action varchar(50),
  p_module varchar(50),
  p_record_type varchar(80) default null,
  p_record_id uuid default null,
  p_old_value jsonb default null,
  p_new_value jsonb default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
  v_audit_id uuid;
  v_code text;
begin
  select u.id into v_user
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;

  v_code := 'AUD-' || to_char(current_date, 'YYYY') || '-' || substring(gen_random_uuid()::text from 1 for 8);

  insert into public.audit_logs (
    audit_code, user_id, action, module, record_type, record_id, old_value, new_value, created_at
  ) values (
    v_code, v_user, p_action, p_module, p_record_type, p_record_id, p_old_value, p_new_value, now()
  ) returning id into v_audit_id;

  return v_audit_id;
end;
$$;

grant execute on function public.nlink_record_audit(varchar, varchar, varchar, uuid, jsonb, jsonb) to authenticated;

-- 5. Order Approval Engine (Server-Side Enforcement)
create or replace function public.nlink_approve_order(
  p_order_id uuid,
  p_notes text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid := public.nlink_current_employee_id();
  v_order record;
begin
  if v_employee is null then
    raise exception 'Authenticated employee profile is required';
  end if;

  if not (
    public.nlink_has_role('SUPER_ADMIN') or
    public.nlink_has_role('MANAGEMENT') or
    public.nlink_has_role('SALES_MANAGER') or
    public.nlink_has_role('ACCOUNTS')
  ) then
    raise exception 'Not authorized to approve sales orders';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Sales order not found';
  end if;

  if v_order.status = 'APPROVED' then
    return true;
  end if;

  if v_order.status in ('REJECTED', 'CANCELLED', 'INVOICED', 'DISPATCHED', 'DELIVERED') then
    raise exception 'Cannot approve order currently in % status', v_order.status;
  end if;

  update public.sales_orders
  set status = 'APPROVED',
      updated_at = now()
  where id = p_order_id;

  perform public.nlink_record_audit('ORDER_APPROVE', 'SALES_ORDERS', 'sales_orders', p_order_id, jsonb_build_object('status', v_order.status), jsonb_build_object('status', 'APPROVED', 'notes', p_notes));

  return true;
end;
$$;

grant execute on function public.nlink_approve_order(uuid, text) to authenticated;

-- 6. Order Rejection Engine (Server-Side Enforcement)
create or replace function public.nlink_reject_order(
  p_order_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid := public.nlink_current_employee_id();
  v_order record;
begin
  if v_employee is null then
    raise exception 'Authenticated employee profile is required';
  end if;

  if not (
    public.nlink_has_role('SUPER_ADMIN') or
    public.nlink_has_role('MANAGEMENT') or
    public.nlink_has_role('SALES_MANAGER') or
    public.nlink_has_role('ACCOUNTS')
  ) then
    raise exception 'Not authorized to reject sales orders';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Sales order not found';
  end if;

  if v_order.status in ('INVOICED', 'DISPATCHED', 'DELIVERED') then
    raise exception 'Cannot reject an order that has already been invoiced or dispatched';
  end if;

  update public.sales_orders
  set status = 'REJECTED',
      remarks = coalesce(p_reason, remarks),
      updated_at = now()
  where id = p_order_id;

  perform public.nlink_record_audit('ORDER_REJECT', 'SALES_ORDERS', 'sales_orders', p_order_id, jsonb_build_object('status', v_order.status), jsonb_build_object('status', 'REJECTED', 'reason', p_reason));

  return true;
end;
$$;

grant execute on function public.nlink_reject_order(uuid, text) to authenticated;

-- 7. Hardened Post Invoice Transaction Function
create or replace function public.nlink_post_invoice(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
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
begin
  if v_employee is null then
    raise exception 'Authenticated employee profile is required';
  end if;

  if not (
    public.nlink_has_role('SUPER_ADMIN') or
    public.nlink_has_role('ACCOUNTS') or
    public.nlink_has_role('SALES_MANAGER')
  ) then
    raise exception 'Not authorized to post invoices';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Sales order not found';
  end if;

  -- Strictly enforce that the order MUST be APPROVED before invoicing
  if v_order.status <> 'APPROVED' then
    raise exception 'Order must be in APPROVED status before invoicing. Current status: %', v_order.status;
  end if;

  if exists(select 1 from public.invoices where order_id = p_order_id and status <> 'CANCELLED') then
    raise exception 'Order is already invoiced';
  end if;

  select * into v_customer from public.customers where id = v_order.customer_id for update;
  v_previous := public.nlink_customer_balance(v_order.customer_id);
  v_amount := v_order.requested_amount;

  select w.id into v_warehouse
  from public.warehouses w
  where w.status = true and w.warehouse_type = 'FACTORY_FINISHED_GOODS'
  order by w.created_at
  limit 1;

  if v_warehouse is null then
    raise exception 'No active finished-goods warehouse is configured';
  end if;

  -- Lock and revalidate every SKU before creating document
  for v_item in select soi.* from public.sales_order_items soi where soi.order_id = p_order_id order by soi.line_no loop
    select ib.* into v_balance
    from public.inventory_balances ib
    where ib.warehouse_id = v_warehouse and ib.sku_id = v_item.sku_id
    for update;

    if not found or v_balance.qty < coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty) then
      raise exception 'Insufficient stock while posting invoice for SKU %', v_item.sku_id;
    end if;
  end loop;

  v_invoice_code := 'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_invoice_seq')::text, 6, '0');
  v_new := round(v_previous + v_amount, 2);

  insert into public.invoices(
    invoice_code, order_id, customer_id, invoice_date, previous_balance, invoice_amount, new_balance, status, posted_at, posted_by
  ) values (
    v_invoice_code, p_order_id, v_order.customer_id, current_date, v_previous, v_amount, v_new, 'POSTED', now(), v_employee
  ) returning id into v_invoice_id;

  for v_item in select soi.* from public.sales_order_items soi where soi.order_id = p_order_id order by soi.line_no loop
    v_line := v_line + 1;
    insert into public.invoice_items(invoice_id, line_no, sku_id, qty, unit_price, line_amount)
    values(
      v_invoice_id, v_line, v_item.sku_id,
      coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty),
      v_item.unit_price, v_item.line_amount
    );

    update public.inventory_balances
    set qty = qty - coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty), updated_at = now()
    where warehouse_id = v_warehouse and sku_id = v_item.sku_id;

    insert into public.inventory_transactions(txn_code, warehouse_id, sku_id, txn_type, qty, reference_type, reference_id, posted_by, remarks)
    values(
      'ITX-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_inventory_txn_seq')::text, 6, '0'),
      v_warehouse, v_item.sku_id, 'SALES_OUT',
      coalesce(nullif(v_item.approved_qty, 0), v_item.order_qty),
      'INVOICE', v_invoice_id, v_employee,
      'Automatic stock-out for ' || v_invoice_code
    );
  end loop;

  insert into public.ledger_entries(ledger_code, customer_id, entry_date, reference_type, reference_id, debit, credit, running_balance, posted_by, remarks)
  values(
    'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0'),
    v_order.customer_id, now(), 'INVOICE', v_invoice_id, v_amount, 0, v_new, v_employee, 'Invoice posting'
  );

  update public.sales_orders set status = 'INVOICED', updated_at = now() where id = p_order_id;

  perform public.nlink_record_audit('INVOICE_POST', 'INVOICES', 'invoices', v_invoice_id, null, jsonb_build_object('invoice_code', v_invoice_code, 'order_id', p_order_id, 'amount', v_amount));

  return v_invoice_id;
end;
$$;
