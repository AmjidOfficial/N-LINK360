-- N-LINK 360 installation verification
-- Run AFTER migrations 001 through 005.
-- This script is intentionally read-only. It does not create or alter business data.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'companies','branches','employees','users','roles','customers',
    'products','skus','warehouses','inventory_transactions',
    'sales_orders','invoices','recoveries','ledger_entries',
    'regions','zones','areas','territories','routes',
    'employee_hierarchy_assignments'
  )
order by table_name;

select 'companies' as object_name, count(*) as row_count from companies
union all select 'branches', count(*) from branches
union all select 'employees', count(*) from employees
union all select 'users', count(*) from users
union all select 'roles', count(*) from roles
union all select 'customers', count(*) from customers
union all select 'products', count(*) from products
union all select 'skus', count(*) from skus
union all select 'warehouses', count(*) from warehouses
union all select 'regions', count(*) from regions
union all select 'zones', count(*) from zones
union all select 'areas', count(*) from areas
union all select 'territories', count(*) from territories
union all select 'routes', count(*) from routes
union all select 'employee_hierarchy_assignments', count(*) from employee_hierarchy_assignments
order by object_name;

select current_database() as database_name, now() as checked_at;
