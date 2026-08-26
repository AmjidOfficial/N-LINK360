-- N-LINK 360 sales hierarchy extension
-- Region -> Zone -> Area -> Territory -> Town -> Route

create table if not exists towns (
  id uuid primary key default gen_random_uuid(),
  town_code varchar(25) not null unique,
  territory_id uuid not null references territories(id),
  name varchar(120) not null,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique(territory_id, name)
);

alter table routes add column if not exists town_id uuid references towns(id);

alter table customers add column if not exists town_id uuid references towns(id);

create index if not exists idx_towns_territory on towns(territory_id);
create index if not exists idx_routes_town on routes(town_id);
create index if not exists idx_customers_town on customers(town_id);

alter table towns enable row level security;
create policy towns_authenticated_read on towns for select to authenticated using (true);
create policy towns_admin_write on towns for all to authenticated using (public.nlink_has_role('SUPER_ADMIN')) with check (public.nlink_has_role('SUPER_ADMIN'));

-- Replace/extend the hierarchy documentation to include Town.
