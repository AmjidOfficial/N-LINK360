-- N-LINK 360 installation verification
-- Run AFTER migrations 001 through 007.
-- Read-only: this script does not create or alter business data.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'companies','branches','factories','warehouses','employees','users','roles',
    'product_categories','brands','products','skus','customers','customer_assignments',
    'customer_visits','inventory_balances','inventory_transactions','sales_orders',
    'sales_order_items','invoices','invoice_items','recoveries','recovery_allocations',
    'ledger_entries','stock_returns','stock_return_items','damage_stock','transporters',
    'addas','vehicles','drivers','bility','dispatches','goods_receipts','goods_receipt_items',
    'regions','zones','areas','territories','routes','employee_hierarchy_assignments',
    'sales_targets','production_batches','production_batch_items','stock_transfers',
    'stock_transfer_items','sales_activity','customer_contacts','audit_log'
  )
order by table_name;

select 'companies' as object_name, count(*) as row_count from companies
union all select 'branches', count(*) from branches
union all select 'factories', count(*) from factories
union all select 'warehouses', count(*) from warehouses
union all select 'employees', count(*) from employees
union all select 'users', count(*) from users
union all select 'roles', count(*) from roles
union all select 'product_categories', count(*) from product_categories
union all select 'brands', count(*) from brands
union all select 'products', count(*) from products
union all select 'skus', count(*) from skus
union all select 'customers', count(*) from customers
union all select 'customer_assignments', count(*) from customer_assignments
union all select 'customer_visits', count(*) from customer_visits
union all select 'inventory_balances', count(*) from inventory_balances
union all select 'inventory_transactions', count(*) from inventory_transactions
union all select 'sales_orders', count(*) from sales_orders
union all select 'sales_order_items', count(*) from sales_order_items
union all select 'invoices', count(*) from invoices
union all select 'invoice_items', count(*) from invoice_items
union all select 'recoveries', count(*) from recoveries
union all select 'recovery_allocations', count(*) from recovery_allocations
union all select 'ledger_entries', count(*) from ledger_entries
union all select 'stock_returns', count(*) from stock_returns
union all select 'stock_return_items', count(*) from stock_return_items
union all select 'regions', count(*) from regions
union all select 'zones', count(*) from zones
union all select 'areas', count(*) from areas
union all select 'territories', count(*) from territories
union all select 'routes', count(*) from routes
union all select 'employee_hierarchy_assignments', count(*) from employee_hierarchy_assignments
union all select 'sales_targets', count(*) from sales_targets
union all select 'production_batches', count(*) from production_batches
union all select 'production_batch_items', count(*) from production_batch_items
union all select 'stock_transfers', count(*) from stock_transfers
union all select 'stock_transfer_items', count(*) from stock_transfer_items
union all select 'sales_activity', count(*) from sales_activity
union all select 'customer_contacts', count(*) from customer_contacts
union all select 'audit_log', count(*) from audit_log
order by object_name;

select current_database() as database_name, now() as checked_at;
