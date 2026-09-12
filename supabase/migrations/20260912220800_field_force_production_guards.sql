-- Field-force production guards; intentionally non-destructive.
create unique index if not exists uq_field_attendance_employee_date on public.field_attendance(employee_id, attendance_date);
create index if not exists idx_field_attendance_employee_date on public.field_attendance(employee_id, attendance_date desc);
create index if not exists idx_customer_visits_employee_at on public.customer_visits(employee_id, visit_at desc);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='sales_orders_requested_amount_nonnegative') then
    alter table public.sales_orders add constraint sales_orders_requested_amount_nonnegative check (requested_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='recoveries_amount_positive') then
    alter table public.recoveries add constraint recoveries_amount_positive check (amount > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='sales_order_items_order_qty_positive') then
    alter table public.sales_order_items add constraint sales_order_items_order_qty_positive check (order_qty > 0);
  end if;
end $$;