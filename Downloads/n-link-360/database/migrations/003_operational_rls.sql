-- N-LINK 360 operational RLS baseline
-- Source of truth: database/migrations/001_nlink360_core.sql

alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.skus enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.customer_visits enable row level security;
alter table public.sales_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.recoveries enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.dispatches enable row level security;
alter table public.stock_returns enable row level security;
alter table public.damage_stock enable row level security;
alter table public.audit_logs enable row level security;

DROP POLICY IF EXISTS companies_authenticated_read ON public.companies;
create policy companies_authenticated_read on public.companies
for select to authenticated using (true);

DROP POLICY IF EXISTS branches_authenticated_read ON public.branches;
create policy branches_authenticated_read on public.branches
for select to authenticated using (true);

DROP POLICY IF EXISTS employees_scope_read ON public.employees;
create policy employees_scope_read on public.employees
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or id = public.nlink_current_employee_id()
  or manager_employee_id = public.nlink_current_employee_id()
);

DROP POLICY IF EXISTS customers_role_read ON public.customers;
create policy customers_role_read on public.customers
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or assigned_employee_id = public.nlink_current_employee_id()
  or exists (
    select 1 from public.customer_assignments ca
    where ca.customer_id = customers.id
      and ca.employee_id = public.nlink_current_employee_id()
      and (ca.end_date is null or ca.end_date >= current_date)
  )
);

DROP POLICY IF EXISTS skus_role_read ON public.skus;
create policy skus_role_read on public.skus
for select to authenticated using (true);

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
  or employee_id = public.nlink_current_employee_id()
)
with check (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('SALES_MANAGER')
  or employee_id = public.nlink_current_employee_id()
);

DROP POLICY IF EXISTS orders_role_read ON public.sales_orders;
create policy orders_role_read on public.sales_orders
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('SALES_MANAGER')
  or public.nlink_has_role('ACCOUNTS')
  or employee_id = public.nlink_current_employee_id()
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
    select 1 from public.sales_orders so
    where so.id = invoices.order_id
      and so.employee_id = public.nlink_current_employee_id()
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
  or employee_id = public.nlink_current_employee_id()
)
with check (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('SALES_MANAGER')
  or employee_id = public.nlink_current_employee_id()
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
    select 1 from public.customers c
    where c.id = ledger_entries.customer_id
      and (c.assigned_employee_id = public.nlink_current_employee_id()
        or exists (select 1 from public.customer_assignments ca where ca.customer_id = c.id and ca.employee_id = public.nlink_current_employee_id() and (ca.end_date is null or ca.end_date >= current_date)))
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

DROP POLICY IF EXISTS returns_role_read ON public.stock_returns;
create policy returns_role_read on public.stock_returns
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('WAREHOUSE_MANAGER')
  or public.nlink_has_role('ACCOUNTS')
  or employee_id = public.nlink_current_employee_id()
);

DROP POLICY IF EXISTS damage_role_read ON public.damage_stock;
create policy damage_role_read on public.damage_stock
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('WAREHOUSE_MANAGER')
  or public.nlink_has_role('FACTORY_MANAGER')
);

DROP POLICY IF EXISTS audit_role_read ON public.audit_logs;
create policy audit_role_read on public.audit_logs
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
);
