-- N-LINK 360 production security baseline.
-- Customer types are strictly DISTRIBUTOR or DEALER.
-- Business data is never anonymously readable or writable.

revoke execute on function public.rls_auto_enable() from anon, authenticated;

create or replace function public.nlink_current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select u.employee_id from public.users u
  where u.auth_user_id = (select auth.uid()) and u.status = true limit 1
$$;

grant execute on function public.nlink_current_employee_id() to authenticated;
revoke execute on function public.nlink_current_employee_id() from anon;

alter table public.customers drop constraint if exists customers_customer_type_check;
alter table public.customers add constraint customers_customer_type_check
  check (customer_type::text in ('DEALER','DISTRIBUTOR')) not valid;

-- Keep anonymous users completely outside business tables.
do $$
declare t text;
begin
  foreach t in array array[
    'addas','audit_logs','bility','branches','brands','companies','credit_notes',
    'customer_assignments','customer_visits','customers','damage_stock','debit_notes',
    'dispatches','drivers','employees','factories','goods_receipt_items','goods_receipts',
    'inventory_balances','inventory_transactions','invoice_items','invoices','ledger_entries',
    'notifications','product_categories','products','recoveries','roles','sales_order_items',
    'sales_orders','skus','stock_return_items','stock_returns','transporters','users','vehicles','warehouses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end $$;

-- Do not expose the internal employee resolver publicly.
revoke execute on function public.nlink_current_employee_id() from anon;
