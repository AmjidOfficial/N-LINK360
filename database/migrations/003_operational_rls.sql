-- N-LINK 360 operational RLS baseline
-- This migration keeps business data behind authenticated role/scope checks.

create or replace function public.nlink_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and r.code = required_role
  );
$$;

grant execute on function public.nlink_has_role(text) to authenticated;

alter table public.customers enable row level security;
alter table public.skus enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.customer_visits enable row level security;
alter table public.sales_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.recoveries enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.dispatches enable row level security;

DROP POLICY IF EXISTS customers_role_read ON public.customers;
create policy customers_role_read on public.customers
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1
    from public.customer_assignments ca
    join public.sales_users su on su.id = ca.sales_user_id
    join public.users u on u.id = su.user_id
    where ca.customer_id = customers.id
      and ca.is_active = true
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS skus_role_read ON public.skus;
create policy skus_role_read on public.skus
for select to authenticated
using (true);

DROP POLICY IF EXISTS inventory_role_read ON public.inventory_balances;
create policy inventory_role_read on public.inventory_balances
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('FACTORY_MANAGER')
  or public.nlink_has_role('WAREHOUSE_MANAGER')
  or public.nlink_has_role('SALES_MANAGER')
  or public.nlink_has_role('SALES_RECOVERY')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('DISPATCH_OFFICER')
);

DROP POLICY IF EXISTS visits_role_access ON public.customer_visits;
create policy visits_role_access on public.customer_visits
for all to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1
    from public.sales_users su
    join public.users u on u.id = su.user_id
    where su.id = customer_visits.sales_user_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
)
with check (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1
    from public.sales_users su
    join public.users u on u.id = su.user_id
    where su.id = customer_visits.sales_user_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS orders_role_read ON public.sales_orders;
create policy orders_role_read on public.sales_orders
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or public.nlink_has_role('ACCOUNTS')
  or exists (
    select 1 from public.sales_users su
    join public.users u on u.id = su.user_id
    where su.id = sales_orders.sales_user_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS invoices_role_read ON public.invoices;
create policy invoices_role_read on public.invoices
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('SALES_MANAGER')
  or public.nlink_has_role('DISPATCH_OFFICER')
  or exists (
    select 1
    from public.sales_orders so
    join public.sales_users su on su.id = so.sales_user_id
    join public.users u on u.id = su.user_id
    where so.id = invoices.order_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS recovery_role_access ON public.recoveries;
create policy recovery_role_access on public.recoveries
for all to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1 from public.sales_users su
    join public.users u on u.id = su.user_id
    where su.id = recoveries.sales_user_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
)
with check (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1 from public.sales_users su
    join public.users u on u.id = su.user_id
    where su.id = recoveries.sales_user_id
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS ledger_role_read ON public.ledger_entries;
create policy ledger_role_read on public.ledger_entries
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('SALES_MANAGER')
  or exists (
    select 1
    from public.customer_assignments ca
    join public.sales_users su on su.id = ca.sales_user_id
    join public.users u on u.id = su.user_id
    where ca.customer_id = ledger_entries.customer_id
      and ca.is_active = true
      and u.auth_user_id = auth.uid()
      and u.is_active = true
  )
);

DROP POLICY IF EXISTS dispatch_role_read ON public.dispatches;
create policy dispatch_role_read on public.dispatches
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('WAREHOUSE_MANAGER')
  or public.nlink_has_role('DISPATCH_OFFICER')
  or public.nlink_has_role('ACCOUNTS')
);
