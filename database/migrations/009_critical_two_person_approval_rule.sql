-- ==============================================================================
-- N-LINK 360 - 009_critical_two_person_approval_rule.sql
-- CRITICAL TWO-PERSON APPROVAL RULE (SECTION 10 & 11)
-- ONLY THESE TWO ACCOUNTS MAY APPROVE INVOICES, RECOVERY AND APPROVAL-CONTROLLED TRANSACTIONS:
-- 1. shahzadullah@nationallights.com
-- 2. syedzain@nationallights.com
-- ABSOLUTE RESTRICTION: No other role, admin, super-admin, or client condition may bypass this.
-- ==============================================================================

-- 1. Helper Function to strictly verify authorized approver identity
create or replace function public.nlink_is_authorized_approver()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_jwt_email text;
  v_auth_email text;
  v_emp_email text;
begin
  -- Retrieve email from auth JWT claims
  v_jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_jwt_email in ('shahzadullah@nationallights.com', 'syedzain@nationallights.com') then
    return true;
  end if;

  -- Retrieve email from auth.users record
  select lower(trim(coalesce(email, ''))) into v_auth_email
  from auth.users
  where id = auth.uid();

  if v_auth_email in ('shahzadullah@nationallights.com', 'syedzain@nationallights.com') then
    return true;
  end if;

  -- Retrieve email from linked employee profile
  select lower(trim(coalesce(e.email, ''))) into v_emp_email
  from public.users u
  join public.employees e on e.id = u.employee_id
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_emp_email in ('shahzadullah@nationallights.com', 'syedzain@nationallights.com') then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.nlink_is_authorized_approver() to authenticated, anon;

-- 2. Hardened Order Approval Engine
create or replace function public.nlink_approve_order(
  p_order_id uuid,
  p_notes text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
begin
  -- ABSOLUTE APPROVAL RULE ENFORCEMENT: Only Syed Zain and Shahzad Ullah
  if not public.nlink_is_authorized_approver() then
    raise exception 'Unauthorized: Only designated executive approvers (shahzadullah@nationallights.com, syedzain@nationallights.com) are authorized to approve transactions.';
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

  perform public.nlink_record_audit(
    'ORDER_APPROVE',
    'SALES_ORDERS',
    'sales_orders',
    p_order_id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', 'APPROVED', 'notes', p_notes)
  );

  return true;
end;
$$;

grant execute on function public.nlink_approve_order(uuid, text) to authenticated;

-- 3. Hardened Order Rejection Engine
create or replace function public.nlink_reject_order(
  p_order_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
begin
  if not public.nlink_is_authorized_approver() then
    raise exception 'Unauthorized: Only designated executive approvers (shahzadullah@nationallights.com, syedzain@nationallights.com) are authorized to reject transactions.';
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

  perform public.nlink_record_audit(
    'ORDER_REJECT',
    'SALES_ORDERS',
    'sales_orders',
    p_order_id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', 'REJECTED', 'reason', p_reason)
  );

  return true;
end;
$$;

grant execute on function public.nlink_reject_order(uuid, text) to authenticated;

-- 4. Hardened Recovery Verification Engine
create or replace function public.nlink_verify_recovery(p_recovery_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_recovery record;
  v_customer record;
  v_previous numeric(18,2);
  v_new numeric(18,2);
  v_employee uuid := public.nlink_current_employee_id();
begin
  if not public.nlink_is_authorized_approver() then
    raise exception 'Unauthorized: Only designated executive approvers (shahzadullah@nationallights.com, syedzain@nationallights.com) are authorized to verify recoveries.';
  end if;

  select * into v_recovery from public.recoveries where id = p_recovery_id for update;
  if not found then
    raise exception 'Recovery record not found';
  end if;

  if v_recovery.status = 'APPROVED' then
    return true;
  end if;

  select * into v_customer from public.customers where id = v_recovery.customer_id for update;
  v_previous := public.nlink_customer_balance(v_recovery.customer_id);
  v_new := round(v_previous - v_recovery.amount, 2);

  update public.recoveries
  set status = 'APPROVED',
      updated_at = now()
  where id = p_recovery_id;

  -- Post Credit Entry to Party Ledger
  insert into public.ledger_entries (
    ledger_code,
    customer_id,
    entry_date,
    reference_type,
    reference_id,
    debit,
    credit,
    running_balance,
    posted_by,
    remarks
  ) values (
    'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0'),
    v_recovery.customer_id,
    now(),
    'RECOVERY',
    p_recovery_id,
    0,
    v_recovery.amount,
    v_new,
    v_employee,
    'Recovery verification confirmed by Head Office'
  );

  perform public.nlink_record_audit(
    'RECOVERY_VERIFY',
    'RECOVERIES',
    'recoveries',
    p_recovery_id,
    jsonb_build_object('status', v_recovery.status),
    jsonb_build_object('status', 'APPROVED', 'amount', v_recovery.amount)
  );

  return true;
end;
$$;

grant execute on function public.nlink_verify_recovery(uuid) to authenticated;

-- 5. Auto Employee Code Generator (Section 8: NL-EMP-000001)
create sequence if not exists public.nlink_employee_seq start 101;

create or replace function public.nlink_generate_employee_code()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_seq bigint;
begin
  v_seq := nextval('public.nlink_employee_seq');
  v_code := 'NL-EMP-' || lpad(v_seq::text, 6, '0');
  while exists (select 1 from public.employees where employee_code = v_code) loop
    v_seq := nextval('public.nlink_employee_seq');
    v_code := 'NL-EMP-' || lpad(v_seq::text, 6, '0');
  end loop;
  return v_code;
end;
$$;

grant execute on function public.nlink_generate_employee_code() to authenticated, anon;
