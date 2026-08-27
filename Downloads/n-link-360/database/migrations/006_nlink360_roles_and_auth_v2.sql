-- N-LINK 360 updated hierarchy roles and database-enforced geography permissions
-- This extends our security and access control with the complete sales hierarchy roles

-- 1. Insert the newly requested hierarchy and operational roles into public.roles
insert into public.roles (role_code, name, description) values
('RSM', 'Regional Sales Manager', 'Regional level executive sales supervisor'),
('ASM', 'Area Sales Manager', 'Area level operational supervisor'),
('TSM', 'Territory Sales Manager', 'Territory level manager'),
('SS', 'Sales Supervisor', 'Town/Route level supervisor'),
('OB', 'Order Booker', 'Field sales booking officer'),
('FACTORY', 'Factory In-Charge', 'Factory operations management'),
('WAREHOUSE', 'Warehouse In-Charge', 'Warehouse stock and storage control'),
('DISPATCH', 'Dispatch Officer', 'Dispatch and bility coordination')
on conflict (role_code) do update
set name = excluded.name,
    description = excluded.description;

-- 2. Create high-performance geographical access helper
create or replace function public.nlink_employee_has_customer_access(p_employee_id uuid, p_customer_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_cust record;
  v_assign record;
begin
  -- Retrieve the customer's hierarchical parent nodes
  select region_id, zone_id, area_id, territory_id, town_id, route_id, assigned_employee_id
  into v_cust
  from public.customers
  where id = p_customer_id;

  if not found then
    return false;
  end if;

  -- 1. Direct assignment access
  if v_cust.assigned_employee_id = p_employee_id then
    return true;
  end if;

  -- 2. Indirect geographical hierarchy access
  for v_assign in 
    select hierarchy_level, reference_id 
    from public.employee_hierarchy_assignments 
    where employee_id = p_employee_id and status = true
  loop
    if v_assign.hierarchy_level = 'REGION' and v_assign.reference_id = v_cust.region_id then
      return true;
    elsif v_assign.hierarchy_level = 'ZONE' and v_assign.reference_id = v_cust.zone_id then
      return true;
    elsif v_assign.hierarchy_level = 'AREA' and v_assign.reference_id = v_cust.area_id then
      return true;
    elsif v_assign.hierarchy_level = 'TERRITORY' and v_assign.reference_id = v_cust.territory_id then
      return true;
    elsif v_assign.hierarchy_level = 'TOWN' and v_assign.reference_id = v_cust.town_id then
      return true;
    elsif v_assign.hierarchy_level = 'ROUTE' and v_assign.reference_id = v_cust.route_id then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

grant execute on function public.nlink_employee_has_customer_access(uuid, uuid) to authenticated;

-- 3. Re-apply operational Row-Level Security policies with updated role checks
-- Customers
DROP POLICY IF EXISTS customers_role_read ON public.customers;
create policy customers_role_read on public.customers
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), id)
);

-- Sales Orders
DROP POLICY IF EXISTS orders_role_read ON public.sales_orders;
create policy orders_role_read on public.sales_orders
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('FACTORY')
  or public.nlink_has_role('WAREHOUSE')
  or public.nlink_has_role('DISPATCH')
  or employee_id = public.nlink_current_employee_id()
  or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), customer_id)
);

-- Invoices
DROP POLICY IF EXISTS invoices_role_read ON public.invoices;
create policy invoices_role_read on public.invoices
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_has_role('DISPATCH')
  or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), customer_id)
);

-- Recoveries
DROP POLICY IF EXISTS recovery_role_access ON public.recoveries;
create policy recovery_role_access on public.recoveries
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or employee_id = public.nlink_current_employee_id()
  or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), customer_id)
);

-- Ledger Entries
DROP POLICY IF EXISTS ledger_role_read ON public.ledger_entries;
create policy ledger_role_read on public.ledger_entries
for select to authenticated
using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or public.nlink_has_role('ACCOUNTS')
  or public.nlink_employee_has_customer_access(public.nlink_current_employee_id(), customer_id)
);
