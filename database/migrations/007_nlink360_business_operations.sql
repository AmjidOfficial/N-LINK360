-- N-LINK 360 business operations extension
-- Targets, production, stock movement, recovery allocation, visits, and audit-ready operational masters.

create table if not exists sales_targets (
  id uuid primary key default gen_random_uuid(),
  target_code varchar(30) not null unique,
  employee_id uuid references employees(id),
  region_id uuid references regions(id),
  zone_id uuid references zones(id),
  area_id uuid references areas(id),
  territory_id uuid references territories(id),
  route_id uuid references routes(id),
  customer_id uuid references customers(id),
  sku_id uuid references skus(id),
  period_start date not null,
  period_end date not null,
  target_qty numeric(18,3) not null default 0,
  target_value numeric(18,2) not null default 0,
  target_recovery numeric(18,2) not null default 0,
  status boolean not null default true,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code varchar(30) not null unique,
  factory_id uuid not null references factories(id),
  warehouse_id uuid not null references warehouses(id),
  production_date date not null default current_date,
  status varchar(30) not null default 'POSTED',
  produced_by uuid references employees(id),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists production_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references production_batches(id) on delete cascade,
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null,
  unit_cost numeric(18,2) not null default 0,
  total_cost numeric(18,2) not null default 0
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_code varchar(30) not null unique,
  from_warehouse_id uuid not null references warehouses(id),
  to_warehouse_id uuid not null references warehouses(id),
  transfer_date date not null default current_date,
  status varchar(30) not null default 'POSTED',
  created_by uuid references employees(id),
  received_by uuid references employees(id),
  remarks text,
  check (from_warehouse_id <> to_warehouse_id)
);

create table if not exists stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references stock_transfers(id) on delete cascade,
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null
);

create table if not exists recovery_allocations (
  id uuid primary key default gen_random_uuid(),
  recovery_id uuid not null references recoveries(id) on delete cascade,
  invoice_id uuid references invoices(id),
  allocated_amount numeric(18,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists sales_activity (
  id uuid primary key default gen_random_uuid(),
  activity_code varchar(30) not null unique,
  employee_id uuid not null references employees(id),
  customer_id uuid references customers(id),
  route_id uuid references routes(id),
  activity_date date not null default current_date,
  activity_type varchar(40) not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  contact_name varchar(150) not null,
  designation varchar(100),
  mobile varchar(30),
  whatsapp varchar(30),
  email varchar(200),
  is_primary boolean not null default false,
  status boolean not null default true
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_employee_id uuid references employees(id),
  action varchar(50) not null,
  entity_name varchar(100) not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_targets_employee_period on sales_targets(employee_id, period_start, period_end);
create index if not exists idx_sales_targets_route_period on sales_targets(route_id, period_start, period_end);
create index if not exists idx_production_batches_factory_date on production_batches(factory_id, production_date);
create index if not exists idx_stock_transfers_date on stock_transfers(transfer_date);
create index if not exists idx_recovery_allocations_recovery on recovery_allocations(recovery_id);
create index if not exists idx_sales_activity_employee_date on sales_activity(employee_id, activity_date);
create index if not exists idx_sales_activity_customer_date on sales_activity(customer_id, activity_date);
create index if not exists idx_audit_log_entity on audit_log(entity_name, entity_id);

alter table sales_targets enable row level security;
alter table production_batches enable row level security;
alter table production_batch_items enable row level security;
alter table stock_transfers enable row level security;
alter table stock_transfer_items enable row level security;
alter table recovery_allocations enable row level security;
alter table sales_activity enable row level security;
alter table customer_contacts enable row level security;
alter table audit_log enable row level security;

create policy sales_targets_read on sales_targets for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
  or employee_id = public.nlink_current_employee_id()
);
create policy sales_targets_admin_write on sales_targets for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);

create policy production_batches_ops on production_batches for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('FACTORY_MANAGER')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('FACTORY_MANAGER')
);
create policy production_batch_items_ops on production_batch_items for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('FACTORY_MANAGER')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('FACTORY_MANAGER')
);

create policy stock_transfers_ops on stock_transfers for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('WAREHOUSE_MANAGER')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('WAREHOUSE_MANAGER')
);
create policy stock_transfer_items_ops on stock_transfer_items for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('WAREHOUSE_MANAGER')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('WAREHOUSE_MANAGER')
);

create policy recovery_allocations_read on recovery_allocations for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('ACCOUNTS')
);
create policy recovery_allocations_write on recovery_allocations for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('ACCOUNTS')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('ACCOUNTS')
);

create policy sales_activity_read on sales_activity for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or employee_id = public.nlink_current_employee_id()
);
create policy sales_activity_write on sales_activity for insert to authenticated with check (
  public.nlink_has_role('SUPER_ADMIN') or employee_id = public.nlink_current_employee_id()
);

create policy customer_contacts_read on customer_contacts for select to authenticated using (true);
create policy customer_contacts_write on customer_contacts for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('SALES_MANAGER')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT') or public.nlink_has_role('SALES_MANAGER')
);

create policy audit_log_admin_read on audit_log for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);
create policy audit_log_admin_write on audit_log for insert to authenticated with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);

-- Helpful reporting views for the portal.
create or replace view v_customer_outstanding as
select c.id, c.customer_code, c.name, c.customer_type,
       coalesce(sum(l.debit - l.credit),0) + c.opening_balance as outstanding
from customers c
left join ledger_entries l on l.customer_id = c.id
group by c.id, c.customer_code, c.name, c.customer_type, c.opening_balance;

create or replace view v_inventory_summary as
select w.id as warehouse_id, w.warehouse_code, w.name as warehouse_name,
       s.id as sku_id, s.sku_code, s.sku_name, ib.qty
from inventory_balances ib
join warehouses w on w.id = ib.warehouse_id
join skus s on s.id = ib.sku_id;

create or replace view v_sales_performance as
select e.id as employee_id, e.employee_code, e.full_name,
       count(distinct so.id) as orders,
       coalesce(sum(so.requested_amount),0) as order_value,
       coalesce(sum(i.invoice_amount) filter (where i.status='POSTED'),0) as invoiced_value,
       coalesce(sum(r.amount) filter (where r.status='VERIFIED'),0) as verified_recovery
from employees e
left join sales_orders so on so.employee_id=e.id
left join invoices i on i.order_id=so.id
left join recoveries r on r.employee_id=e.id
group by e.id, e.employee_code, e.full_name;
