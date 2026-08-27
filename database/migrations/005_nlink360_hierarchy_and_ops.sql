-- N-LINK 360 geographical hierarchy and operational expansion
-- Add value if not exists isn't supported inside transactional blocks easily, so we run them as separate steps if needed.
-- We safely alter the customer_type enum to include 'SHOP' and 'OTHER'.

-- 1. Extend customer_type enum
alter type customer_type add value if not exists 'SHOP';
alter type customer_type add value if not exists 'OTHER';

-- 2. Geographical Hierarchy tables
create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  region_code varchar(20) not null unique,
  name varchar(100) not null unique,
  status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  zone_code varchar(20) not null unique,
  region_id uuid not null references regions(id) on delete restrict,
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (region_id, name)
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  area_code varchar(20) not null unique,
  zone_id uuid not null references zones(id) on delete restrict,
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (zone_id, name)
);

create table if not exists territories (
  id uuid primary key default gen_random_uuid(),
  territory_code varchar(20) not null unique,
  area_id uuid not null references areas(id) on delete restrict,
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (area_id, name)
);

create table if not exists towns (
  id uuid primary key default gen_random_uuid(),
  town_code varchar(20) not null unique,
  territory_id uuid not null references territories(id) on delete restrict,
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (territory_id, name)
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_code varchar(20) not null unique,
  town_id uuid not null references towns(id) on delete restrict,
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (town_id, name)
);

-- 3. Add geographical references to customers
alter table customers add column if not exists region_id uuid references regions(id);
alter table customers add column if not exists zone_id uuid references zones(id);
alter table customers add column if not exists area_id uuid references areas(id);
alter table customers add column if not exists territory_id uuid references territories(id);
alter table customers add column if not exists town_id uuid references towns(id);
alter table customers add column if not exists route_id uuid references routes(id);

-- 4. Employee Hierarchy Assignments
create table if not exists employee_hierarchy_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  hierarchy_level varchar(30) not null check (hierarchy_level in ('REGION', 'ZONE', 'AREA', 'TERRITORY', 'TOWN', 'ROUTE')),
  reference_id uuid not null, -- references id of respective region/zone/etc
  status boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Sales Targets and Items
create table if not exists sales_targets (
  id uuid primary key default gen_random_uuid(),
  target_code varchar(20) not null unique,
  month varchar(7) not null, -- Format: YYYY-MM
  assigned_to_level varchar(30) not null check (assigned_to_level in ('REGION', 'ZONE', 'AREA', 'TERRITORY', 'TOWN', 'ROUTE', 'EMPLOYEE')),
  assigned_to_id uuid not null, -- matches employee_id or geography_id
  target_amount numeric(18,2) not null default 0,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (month, assigned_to_level, assigned_to_id)
);

create table if not exists sales_target_items (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references sales_targets(id) on delete cascade,
  sku_id uuid not null references skus(id) on delete restrict,
  target_qty numeric(18,3) not null default 0,
  target_amount numeric(18,2) not null default 0,
  unique (target_id, sku_id)
);

-- 6. Sales Activities & Follow-ups
create table if not exists sales_activities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  activity_type varchar(50) not null check (activity_type in ('CHECK_IN', 'CHECK_OUT', 'ORDER_BOOKING', 'RECOVERY', 'MEETING', 'OTHER')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  followup_date date not null,
  notes text,
  status varchar(30) not null default 'PENDING' check (status in ('PENDING', 'COMPLETED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

-- 7. Excel/CSV Master Data Import tables
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code varchar(30) not null unique,
  import_type varchar(50) not null check (import_type in ('EMPLOYEES', 'REGIONS', 'ZONES', 'AREAS', 'TERRITORIES', 'TOWNS', 'ROUTES', 'CUSTOMERS', 'SKUS', 'PRICES')),
  status varchar(30) not null default 'PENDING' check (status in ('PENDING', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED')),
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  uploaded_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  row_index integer not null,
  row_data jsonb not null,
  status varchar(30) not null default 'PENDING' check (status in ('PENDING', 'VALID', 'INVALID', 'IMPORTED')),
  unique (batch_id, row_index)
);

create table if not exists import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  row_index integer not null,
  column_name varchar(100),
  error_message text not null,
  created_at timestamptz not null default now()
);

create table if not exists import_audit (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  action varchar(50) not null,
  performed_by uuid references employees(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

-- 8. Enable Row-Level Security
alter table regions enable row level security;
alter table zones enable row level security;
alter table areas enable row level security;
alter table territories enable row level security;
alter table towns enable row level security;
alter table routes enable row level security;
alter table employee_hierarchy_assignments enable row level security;
alter table sales_targets enable row level security;
alter table sales_target_items enable row level security;
alter table sales_activities enable row level security;
alter table followups enable row level security;
alter table import_batches enable row level security;
alter table import_rows enable row level security;
alter table import_errors enable row level security;
alter table import_audit enable row level security;

-- 9. Setup RLS policies
DROP POLICY IF EXISTS regions_auth_read ON regions;
create policy regions_auth_read on regions for select to authenticated using (true);

DROP POLICY IF EXISTS zones_auth_read ON zones;
create policy zones_auth_read on zones for select to authenticated using (true);

DROP POLICY IF EXISTS areas_auth_read ON areas;
create policy areas_auth_read on areas for select to authenticated using (true);

DROP POLICY IF EXISTS territories_auth_read ON territories;
create policy territories_auth_read on territories for select to authenticated using (true);

DROP POLICY IF EXISTS towns_auth_read ON towns;
create policy towns_auth_read on towns for select to authenticated using (true);

DROP POLICY IF EXISTS routes_auth_read ON routes;
create policy routes_auth_read on routes for select to authenticated using (true);

DROP POLICY IF EXISTS employee_hierarchy_auth_read ON employee_hierarchy_assignments;
create policy employee_hierarchy_auth_read on employee_hierarchy_assignments 
  for select to authenticated 
  using (
    public.nlink_has_role('SUPER_ADMIN') or 
    public.nlink_has_role('MANAGEMENT') or 
    employee_id = public.nlink_current_employee_id()
  );

DROP POLICY IF EXISTS sales_targets_auth_read ON sales_targets;
create policy sales_targets_auth_read on sales_targets 
  for select to authenticated 
  using (true);

DROP POLICY IF EXISTS sales_target_items_auth_read ON sales_target_items;
create policy sales_target_items_auth_read on sales_target_items 
  for select to authenticated 
  using (true);

DROP POLICY IF EXISTS sales_activities_all ON sales_activities;
create policy sales_activities_all on sales_activities 
  for all to authenticated 
  using (
    public.nlink_has_role('SUPER_ADMIN') or 
    public.nlink_has_role('MANAGEMENT') or 
    public.nlink_has_role('SALES_MANAGER') or 
    employee_id = public.nlink_current_employee_id()
  );

DROP POLICY IF EXISTS followups_all ON followups;
create policy followups_all on followups 
  for all to authenticated 
  using (
    public.nlink_has_role('SUPER_ADMIN') or 
    public.nlink_has_role('MANAGEMENT') or 
    public.nlink_has_role('SALES_MANAGER') or 
    employee_id = public.nlink_current_employee_id()
  );

DROP POLICY IF EXISTS imports_admin_all ON import_batches;
create policy imports_admin_all on import_batches 
  for all to authenticated 
  using (public.nlink_has_role('SUPER_ADMIN'))
  with check (public.nlink_has_role('SUPER_ADMIN'));

DROP POLICY IF EXISTS import_rows_admin_all ON import_rows;
create policy import_rows_admin_all on import_rows 
  for all to authenticated 
  using (public.nlink_has_role('SUPER_ADMIN'))
  with check (public.nlink_has_role('SUPER_ADMIN'));

DROP POLICY IF EXISTS import_errors_admin_all ON import_errors;
create policy import_errors_admin_all on import_errors 
  for all to authenticated 
  using (public.nlink_has_role('SUPER_ADMIN'))
  with check (public.nlink_has_role('SUPER_ADMIN'));

-- 10. Reporting Views for Multi-tier Dashboards
create or replace view public.view_sales_performance as
select 
  so.id as order_id,
  so.order_code,
  so.order_date,
  so.requested_amount,
  so.status as order_status,
  e.id as employee_id,
  e.full_name as employee_name,
  e.employee_code,
  r.id as region_id,
  r.name as region_name,
  z.id as zone_id,
  z.name as zone_name,
  a.id as area_id,
  a.name as area_name,
  t.id as territory_id,
  t.name as territory_name,
  c.id as customer_id,
  c.name as customer_name,
  c.customer_type
from public.sales_orders so
join public.employees e on e.id = so.employee_id
join public.customers c on c.id = so.customer_id
left join public.regions r on r.id = c.region_id
left join public.zones z on z.id = c.zone_id
left join public.areas a on a.id = c.area_id
left join public.territories t on t.id = c.territory_id;

create or replace view public.view_outstanding_balances as
select 
  c.id as customer_id,
  c.customer_code,
  c.name as customer_name,
  c.credit_limit,
  c.credit_days,
  c.opening_balance,
  public.nlink_customer_balance(c.id) as current_balance,
  r.name as region_name,
  z.name as zone_name,
  e.full_name as assigned_employee
from public.customers c
left join public.regions r on r.id = c.region_id
left join public.zones z on z.id = c.zone_id
left join public.employees e on e.id = c.assigned_employee_id
where c.status = true;
