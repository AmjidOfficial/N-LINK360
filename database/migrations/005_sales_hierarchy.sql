-- N-LINK 360 sales hierarchy foundation
-- Region -> Zone -> Area -> Territory -> Route
-- Keeps existing customers/employees compatible while adding structured sales ownership.

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
  region_id uuid not null references regions(id),
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique(region_id, name)
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  area_code varchar(20) not null unique,
  zone_id uuid not null references zones(id),
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique(zone_id, name)
);

create table if not exists territories (
  id uuid primary key default gen_random_uuid(),
  territory_code varchar(20) not null unique,
  area_id uuid not null references areas(id),
  name varchar(100) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique(area_id, name)
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_code varchar(25) not null unique,
  territory_id uuid not null references territories(id),
  name varchar(120) not null,
  route_day varchar(20),
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique(territory_id, name)
);

create table if not exists employee_hierarchy_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  region_id uuid references regions(id),
  zone_id uuid references zones(id),
  area_id uuid references areas(id),
  territory_id uuid references territories(id),
  route_id uuid references routes(id),
  start_date date not null default current_date,
  end_date date,
  is_primary boolean not null default true,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

alter table customers add column if not exists route_id uuid references routes(id);
alter table customers add column if not exists distributor_id uuid references customers(id);

create index if not exists idx_zones_region on zones(region_id);
create index if not exists idx_areas_zone on areas(zone_id);
create index if not exists idx_territories_area on territories(area_id);
create index if not exists idx_routes_territory on routes(territory_id);
create index if not exists idx_employee_hierarchy_employee on employee_hierarchy_assignments(employee_id);
create index if not exists idx_employee_hierarchy_route on employee_hierarchy_assignments(route_id);
create index if not exists idx_customers_route on customers(route_id);
create index if not exists idx_customers_distributor on customers(distributor_id);

alter table regions enable row level security;
alter table zones enable row level security;
alter table areas enable row level security;
alter table territories enable row level security;
alter table routes enable row level security;
alter table employee_hierarchy_assignments enable row level security;

create policy regions_authenticated_read on regions for select to authenticated using (true);
create policy zones_authenticated_read on zones for select to authenticated using (true);
create policy areas_authenticated_read on areas for select to authenticated using (true);
create policy territories_authenticated_read on territories for select to authenticated using (true);
create policy routes_authenticated_read on routes for select to authenticated using (true);
create policy employee_hierarchy_authenticated_read on employee_hierarchy_assignments for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN')
  or public.nlink_has_role('MANAGEMENT')
  or employee_id = public.nlink_current_employee_id()
  or public.nlink_has_role('SALES_MANAGER')
);

create policy regions_admin_write on regions for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
create policy zones_admin_write on zones for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
create policy areas_admin_write on areas for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
create policy territories_admin_write on territories for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
create policy routes_admin_write on routes for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
create policy employee_hierarchy_admin_write on employee_hierarchy_assignments for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));
