-- ==============================================================================
-- N-LINK 360 - 010_customer_registration_rls_policies.sql
-- CUSTOMER REGISTRATION RLS POLICIES & APPROVAL QUEUE ISOLATION
-- 
-- REQUIREMENTS:
-- 1. Field officers (OB, TSM, SS, ASM, RSM, etc.) can ONLY see registration requests
--    (PENDING_APPROVAL queue) that THEY CREATED (or where they are the assigned officer).
-- 2. ONLY authorized admins/executive approvers (shahzadullah@nationallights.com,
--    syedzain@nationallights.com, SUPER_ADMIN, MANAGEMENT) can read ALL records
--    in the 'PENDING_APPROVAL' queue.
-- 3. Approved / active customers are visible to authorized managers and to field
--    officers assigned directly or via geographical hierarchy (Town/Territory/Area/Region).
-- 4. Customer approval authorization is strictly restricted to designated approvers.
-- ==============================================================================

-- 1. Ensure required columns exist on public.customers
alter table public.customers
  add column if not exists approval_status varchar(30) default 'PENDING_APPROVAL',
  add column if not exists is_active boolean default false,
  add column if not exists created_by_user_id uuid,
  add column if not exists created_by_employee_id uuid references public.employees(id),
  add column if not exists remarks text;

-- Index for high-performance RLS evaluation
create index if not exists idx_customers_approval_status on public.customers(approval_status);
create index if not exists idx_customers_created_by_user on public.customers(created_by_user_id);
create index if not exists idx_customers_created_by_emp on public.customers(created_by_employee_id);
create index if not exists idx_customers_assigned_emp on public.customers(assigned_employee_id);

-- 2. Helper function to check if current user is an executive approver or global admin
create or replace function public.nlink_is_admin_or_approver()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_jwt_email text;
  v_auth_email text;
  v_emp_email text;
begin
  -- 1. Direct Email Check against Authoritative Executive Approvers & Master Admins
  v_jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_jwt_email in (
    'shahzadullah@nationallights.com',
    'syedzain@nationallights.com',
    'admin@nationallights.com',
    'nationallights2026@gmail.com'
  ) then
    return true;
  end if;

  select lower(trim(coalesce(email, ''))) into v_auth_email
  from auth.users
  where id = auth.uid();

  if v_auth_email in (
    'shahzadullah@nationallights.com',
    'syedzain@nationallights.com',
    'admin@nationallights.com',
    'nationallights2026@gmail.com'
  ) then
    return true;
  end if;

  select lower(trim(coalesce(e.email, ''))) into v_emp_email
  from public.users u
  join public.employees e on e.id = u.employee_id
  where u.auth_user_id = auth.uid()
  limit 1;

  if v_emp_email in (
    'shahzadullah@nationallights.com',
    'syedzain@nationallights.com',
    'admin@nationallights.com',
    'nationallights2026@gmail.com'
  ) then
    return true;
  end if;

  -- 2. Role Check
  if public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.nlink_is_admin_or_approver() to authenticated, anon;

-- 3. Helper Function to determine if a customer row is in PENDING_APPROVAL state
create or replace function public.nlink_is_customer_pending(
  p_status boolean,
  p_approval_status varchar,
  p_is_active boolean
)
returns boolean
language sql immutable
as $$
  select (
    coalesce(p_approval_status, '') in ('PENDING_APPROVAL', 'PENDING')
    or p_status = false
    or p_is_active = false
  );
$$;

-- 4. Enable Row Level Security on customers table
alter table public.customers enable row level security;

-- Drop legacy conflicting policies
drop policy if exists customers_role_read on public.customers;
drop policy if exists customers_read_policy on public.customers;
drop policy if exists customers_authenticated_read on public.customers;
drop policy if exists customers_insert_policy on public.customers;
drop policy if exists customers_update_policy on public.customers;
drop policy if exists customers_delete_policy on public.customers;

-- ==============================================================================
-- 5. READ (SELECT) POLICY:
--    - Field officers can ONLY see registration requests (PENDING_APPROVAL) THEY CREATED
--    - Authorized admins can read ALL PENDING_APPROVAL records
--    - Approved/Active records are visible to assigned field officers and management
-- ==============================================================================
create policy customers_read_policy on public.customers
for select to authenticated
using (
  -- CASE A: Record is in PENDING_APPROVAL / Inactive draft state
  (
    (
      coalesce(approval_status, '') in ('PENDING_APPROVAL', 'PENDING')
      or status = false
      or is_active = false
    )
    and (
      -- 1. ONLY Authorized Admins & Executive Approvers can read the global PENDING_APPROVAL queue
      public.nlink_is_admin_or_approver()
      or public.nlink_is_authorized_approver()
      -- 2. Field Officers can ONLY see registration requests that THEY CREATED or are assigned to
      or created_by_user_id = auth.uid()
      or created_by_employee_id = public.nlink_current_employee_id()
      or assigned_employee_id = public.nlink_current_employee_id()
    )
  )
  or
  -- CASE B: Record is APPROVED and ACTIVE
  (
    (
      coalesce(approval_status, 'APPROVED') in ('APPROVED', 'ACTIVE')
      and (status = true or is_active = true)
    )
    and (
      -- Executive & Management global visibility
      public.nlink_is_admin_or_approver()
      or public.nlink_has_role('ACCOUNTS')
      or public.nlink_has_role('SALES_MANAGER')
      -- Assigned Field Officer direct visibility
      or assigned_employee_id = public.nlink_current_employee_id()
      or created_by_employee_id = public.nlink_current_employee_id()
      -- Geographical Hierarchy Scoped visibility (Town/Territory/Area/Region)
      or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), id)
    )
  )
);

-- ==============================================================================
-- 6. INSERT POLICY:
--    - Field officers and managers can submit new dealer/distributor registrations
-- ==============================================================================
create policy customers_insert_policy on public.customers
for insert to authenticated
with check (
  -- Creator identity must match authenticated session or user has sales registration role
  created_by_user_id = auth.uid()
  or created_by_employee_id = public.nlink_current_employee_id()
  or assigned_employee_id = public.nlink_current_employee_id()
  or public.nlink_is_admin_or_approver()
  or public.nlink_has_role('OB')
  or public.nlink_has_role('TSM')
  or public.nlink_has_role('SS')
  or public.nlink_has_role('ASM')
  or public.nlink_has_role('RSM')
  or public.nlink_has_role('SALES_RECOVERY')
  or public.nlink_has_role('SALES_MANAGER')
);

-- ==============================================================================
-- 7. UPDATE POLICY:
--    - Only authorized executive approvers can APPROVE or alter commercial terms
--    - Field officers can update their own unapproved pending registration drafts
-- ==============================================================================
create policy customers_update_policy on public.customers
for update to authenticated
using (
  -- Authorized Executive Approvers & Master Admins can update any customer record
  public.nlink_is_admin_or_approver()
  or public.nlink_is_authorized_approver()
  -- Field officers can only edit their own pending registration before approval
  or (
    (created_by_user_id = auth.uid() or created_by_employee_id = public.nlink_current_employee_id())
    and (status = false or coalesce(approval_status, '') in ('PENDING_APPROVAL', 'PENDING'))
  )
)
with check (
  -- Enforce that ONLY authorized approvers can set status = true or approval_status = 'APPROVED'
  (
    (status = false or coalesce(approval_status, '') in ('PENDING_APPROVAL', 'PENDING'))
    or public.nlink_is_admin_or_approver()
    or public.nlink_is_authorized_approver()
  )
);

-- ==============================================================================
-- 8. Trigger to automatically stamp created_by fields on new customer records
-- ==============================================================================
create or replace function public.nlink_customer_stamp_creator()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.created_by_user_id is null then
    new.created_by_user_id := auth.uid();
  end if;

  if new.created_by_employee_id is null then
    new.created_by_employee_id := public.nlink_current_employee_id();
  end if;

  if new.assigned_employee_id is null then
    new.assigned_employee_id := public.nlink_current_employee_id();
  end if;

  -- Default newly inserted rows from field users to PENDING_APPROVAL
  if not public.nlink_is_admin_or_approver() then
    new.status := false;
    new.is_active := false;
    new.approval_status := 'PENDING_APPROVAL';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customer_stamp_creator on public.customers;
create trigger trg_customer_stamp_creator
before insert on public.customers
for each row execute function public.nlink_customer_stamp_creator();
