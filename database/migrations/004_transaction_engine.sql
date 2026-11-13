-- N-LINK 360 transactional engine
-- Uses the core schema in 001_nlink360_core.sql.
-- Financial and stock mutations run as SECURITY DEFINER database transactions.

create sequence if not exists nlink_order_seq start 1001;
create sequence if not exists nlink_invoice_seq start 1001;
create sequence if not exists nlink_recovery_seq start 1001;
create sequence if not exists nlink_ledger_seq start 1001;
create sequence if not exists nlink_inventory_txn_seq start 1001;

alter table public.recoveries
  add column if not exists idempotency_key uuid unique;

create or replace function public.nlink_customer_balance(p_customer_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(le.debit - le.credit), 0)::numeric(18,2)
  from public.ledger_entries le
  where le.customer_id = p_customer_id;
$$;

grant execute on function public.nlink_customer_balance(uuid) to authenticated;

create or replace function public.nlink_submit_order(
  p_customer_id uuid,
  p_items jsonb,
  p_recovery_amount numeric default 0,
  p_remarks text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid;
  v_order_id uuid;
  v_order_code text;
  v_previous numeric(18,2);
  v_recovery numeric(18,2) := greatest(coalesce(p_recovery_amount,0),0);
  v_requested numeric(18,2) := 0;
  v_net numeric(18,2);
  v_customer record;
  v_item record;
  v_balance record;
begin
  v_employee := public.nlink_current_employee_id();
  if v_employee is null then raise exception 'Authenticated employee profile is required'; end if;

  if not (
    public.nlink_has_role('SUPER_ADMIN') or
    public.nlink_has_role('SALES_MANAGER') or
    public.nlink_has_role('SALES_RECOVERY')
  ) then
    raise exception 'You are not authorized to submit sales orders';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id and c.status = true
  for share;
  if not found then raise exception 'Customer not found or inactive'; end if;

  if not (
    public.nlink_has_role('SUPER_ADMIN') or
    public.nlink_has_role('SALES_MANAGER') or
    v_customer.assigned_employee_id = v_employee or
    exists (select 1 from public.customer_assignments ca where ca.customer_id = p_customer_id and ca.employee_id = v_employee and (ca.end_date is null or ca.end_date >= current_date))
  ) then
    raise exception 'Customer is not assigned to the current sales employee';
  end if;

  v_previous := public.nlink_customer_balance(p_customer_id);

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order line is required';
  end if;

  for v_item in select * from jsonb_to_recordset(p_items) as x(sku_id uuid, order_qty numeric, unit_price numeric) loop
    if v_item.order_qty is null or v_item.order_qty <= 0 then
      raise exception 'Order quantity must be greater than zero';
    end if;

    select ib.* into v_balance
    from public.inventory_balances ib
    join public.warehouses w on w.id = ib.warehouse_id
    where ib.sku_id = v_item.sku_id
      and w.status = true
      and w.warehouse_type = 'FACTORY_FINISHED_GOODS'
    order by ib.qty desc
    limit 1;

    if not found then raise exception 'No available stock found for SKU %', v_item.sku_id; end if;
    if v_balance.qty < v_item.order_qty then
      raise exception 'Insufficient stock for SKU %. Available %, requested %', v_item.sku_id, v_balance.qty, v_item.order_qty;
    end if;

    if coalesce(v_item.unit_price,0) <= 0 then
      select s.trade_price into v_item.unit_price from public.skus s where s.id = v_item.sku_id and s.status = true;
    end if;
    if coalesce(v_item.unit_price,0) <= 0 then raise exception 'Valid price is required for SKU %', v_item.sku_id; end if;

    v_requested := v_requested + round(v_item.order_qty * v_item.unit_price,2);
  end loop;

  v_net := round(v_previous - v_recovery,2);

  if v_customer.credit_limit > 0 and (v_net + v_requested) > v_customer.credit_limit then
    raise exception 'Credit limit exceeded. Current net balance %, order value %, limit %', v_net, v_requested, v_customer.credit_limit;
  end if;

  v_order_code := 'ORD-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('nlink_order_seq')::text,6,'0');

  insert into public.sales_orders(
    order_code, customer_id, employee_id, previous_balance, recovery_amount,
    net_balance, requested_amount, status, remarks
  ) values (
    v_order_code, p_customer_id, v_employee, v_previous, v_recovery,
    v_net, v_requested, 'SUBMITTED', p_remarks
  ) returning id into v_order_id;

  insert into public.sales_order_items(order_id,line_no,sku_id,available_qty,order_qty,approved_qty,unit_price,line_amount)
  select
    v_order_id,
    row_number() over (),
    x.sku_id,
    coalesce((select ib.qty from public.inventory_balances ib join public.warehouses w on w.id=ib.warehouse_id where ib.sku_id=x.sku_id and w.status=true and w.warehouse_type='FACTORY_FINISHED_GOODS' order by ib.qty desc limit 1),0),
    x.order_qty,
    0,
    case when coalesce(x.unit_price,0)>0 then x.unit_price else (select s.trade_price from public.skus s where s.id=x.sku_id) end,
    round(x.order_qty * case when coalesce(x.unit_price,0)>0 then x.unit_price else (select s.trade_price from public.skus s where s.id=x.sku_id) end,2)
  from jsonb_to_recordset(p_items) as x(sku_id uuid, order_qty numeric, unit_price numeric);

  return v_order_id;
end;
$$;

grant execute on function public.nlink_submit_order(uuid,jsonb,numeric,text) to authenticated;

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
  if v_employee is null then raise exception 'Authenticated employee profile is required'; end if;
  if not (public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('ACCOUNTS') or public.nlink_has_role('SALES_MANAGER')) then
    raise exception 'Not authorized to post invoices';
  end if;

  select * into v_order from public.sales_orders where id=p_order_id for update;
  if not found then raise exception 'Sales order not found'; end if;
  if v_order.status not in ('APPROVED','SUBMITTED') then raise exception 'Order is not ready for invoicing'; end if;
  if exists(select 1 from public.invoices where order_id=p_order_id and status <> 'CANCELLED') then raise exception 'Order is already invoiced'; end if;

  select * into v_customer from public.customers where id=v_order.customer_id for update;
  v_previous := public.nlink_customer_balance(v_order.customer_id);
  v_amount := v_order.requested_amount;

  select w.id into v_warehouse
  from public.warehouses w
  where w.status=true and w.warehouse_type='FACTORY_FINISHED_GOODS'
  order by w.created_at
  limit 1;
  if v_warehouse is null then raise exception 'No active finished-goods warehouse is configured'; end if;

  -- Lock and revalidate every SKU before creating any document.
  for v_item in select soi.* from public.sales_order_items soi where soi.order_id=p_order_id order by soi.line_no loop
    select ib.* into v_balance
    from public.inventory_balances ib
    where ib.warehouse_id=v_warehouse and ib.sku_id=v_item.sku_id
    for update;
    if not found or v_balance.qty < coalesce(nullif(v_item.approved_qty,0),v_item.order_qty) then
      raise exception 'Insufficient stock while posting invoice for SKU %', v_item.sku_id;
    end if;
  end loop;

  v_invoice_code := 'INV-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('nlink_invoice_seq')::text,6,'0');
  v_new := round(v_previous + v_amount,2);

  insert into public.invoices(invoice_code,order_id,customer_id,invoice_date,previous_balance,invoice_amount,new_balance,status,posted_at,posted_by)
  values(v_invoice_code,p_order_id,v_order.customer_id,current_date,v_previous,v_amount,v_new,'POSTED',now(),v_employee)
  returning id into v_invoice_id;

  for v_item in select soi.* from public.sales_order_items soi where soi.order_id=p_order_id order by soi.line_no loop
    v_line := v_line + 1;
    insert into public.invoice_items(invoice_id,line_no,sku_id,qty,unit_price,line_amount)
    values(v_invoice_id,v_line,v_item.sku_id,coalesce(nullif(v_item.approved_qty,0),v_item.order_qty),v_item.unit_price,v_item.line_amount);

    update public.inventory_balances
    set qty = qty - coalesce(nullif(v_item.approved_qty,0),v_item.order_qty), updated_at=now()
    where warehouse_id=v_warehouse and sku_id=v_item.sku_id;

    insert into public.inventory_transactions(txn_code,warehouse_id,sku_id,txn_type,qty,reference_type,reference_id,posted_by,remarks)
    values(
      'ITX-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('nlink_inventory_txn_seq')::text,6,'0'),
      v_warehouse,v_item.sku_id,'SALES_OUT',coalesce(nullif(v_item.approved_qty,0),v_item.order_qty),'INVOICE',v_invoice_id,v_employee,
      'Automatic stock-out for '||v_invoice_code
    );
  end loop;

  insert into public.ledger_entries(ledger_code,customer_id,entry_date,reference_type,reference_id,debit,credit,running_balance,posted_by,remarks)
  values(
    'LED-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text,6,'0'),
    v_order.customer_id,now(),'INVOICE',v_invoice_id,v_amount,0,v_new,v_employee,'Invoice posting'
  );

  update public.sales_orders set status='INVOICED', updated_at=now() where id=p_order_id;
  return v_invoice_id;
end;
$$;

grant execute on function public.nlink_post_invoice(uuid) to authenticated;

create or replace function public.nlink_record_recovery(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_instrument_no text default null,
  p_bank_name text default null,
  p_remarks text default null,
  p_idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid := public.nlink_current_employee_id();
  v_id uuid;
  v_code text;
begin
  if v_employee is null then raise exception 'Authenticated employee profile is required'; end if;
  if not (public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('SALES_RECOVERY') or public.nlink_has_role('SALES_MANAGER')) then raise exception 'Not authorized to record recovery'; end if;
  if p_amount <= 0 then raise exception 'Recovery amount must be greater than zero'; end if;
  if exists(select 1 from public.recoveries where idempotency_key=p_idempotency_key) then
    select id into v_id from public.recoveries where idempotency_key=p_idempotency_key;
    return v_id;
  end if;

  v_code := 'REC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('nlink_recovery_seq')::text,6,'0');
  insert into public.recoveries(recovery_code,customer_id,employee_id,recovery_date,amount,payment_method,instrument_no,bank_name,status,remarks,idempotency_key)
  values(v_code,p_customer_id,v_employee,current_date,p_amount,p_payment_method,p_instrument_no,p_bank_name,'PENDING_VERIFICATION',p_remarks,p_idempotency_key)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.nlink_record_recovery(uuid,numeric,payment_method,text,text,text,uuid) to authenticated;

create or replace function public.nlink_verify_recovery(p_recovery_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid := public.nlink_current_employee_id();
  v_rec record;
  v_balance numeric(18,2);
begin
  if not (public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('ACCOUNTS')) then raise exception 'Not authorized to verify recovery'; end if;
  select * into v_rec from public.recoveries where id=p_recovery_id for update;
  if not found then raise exception 'Recovery not found'; end if;
  if v_rec.status='VERIFIED' then return true; end if;
  if v_rec.status<>'PENDING_VERIFICATION' then raise exception 'Recovery is not pending verification'; end if;

  v_balance := public.nlink_customer_balance(v_rec.customer_id);
  insert into public.ledger_entries(ledger_code,customer_id,entry_date,reference_type,reference_id,debit,credit,running_balance,posted_by,remarks)
  values('LED-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('nlink_ledger_seq')::text,6,'0'),v_rec.customer_id,now(),'RECOVERY',p_recovery_id,0,v_rec.amount,round(v_balance-v_rec.amount,2),v_employee,'Verified recovery');

  update public.recoveries set status='VERIFIED' where id=p_recovery_id;
  return true;
end;
$$;

grant execute on function public.nlink_verify_recovery(uuid) to authenticated;
