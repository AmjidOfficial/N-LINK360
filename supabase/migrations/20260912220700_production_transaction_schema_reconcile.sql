-- Production schema reconciliation already applied to the live Supabase project.
-- This migration records the same non-destructive verification/index hardening in source control.
do $$ begin
  if to_regclass('public.sales_orders') is null then raise exception 'sales_orders missing'; end if;
  if to_regclass('public.sales_order_items') is null then raise exception 'sales_order_items missing'; end if;
  if to_regclass('public.invoices') is null then raise exception 'invoices missing'; end if;
  if to_regclass('public.invoice_items') is null then raise exception 'invoice_items missing'; end if;
  if to_regclass('public.recoveries') is null then raise exception 'recoveries missing'; end if;
  if to_regclass('public.ledger_entries') is null then raise exception 'ledger_entries missing'; end if;
end $$;
create index if not exists idx_sales_orders_customer_date on public.sales_orders(customer_id, created_at desc);
create index if not exists idx_invoices_customer_date on public.invoices(customer_id, invoice_date desc);
create index if not exists idx_recoveries_customer_date on public.recoveries(customer_id, recovery_date desc);
create index if not exists idx_ledger_entries_customer_date on public.ledger_entries(customer_id, entry_date desc);