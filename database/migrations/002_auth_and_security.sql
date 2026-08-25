-- N-LINK 360 authentication and baseline security
-- Supabase Auth owns passwords/sessions. The public users row links an Auth UUID
-- to the N-LINK user record. The existing 001 schema is the source of truth.

alter table public.users
  add column if not exists auth_user_id uuid unique;

insert into public.roles (code, name, description) values
('SUPER_ADMIN','Super Admin','Full system administration'),
('MANAGEMENT','Management','Management dashboard and approved reports'),
('FACTORY_MANAGER','Factory In-Charge','Factory work modes'),
('WAREHOUSE_MANAGER','Warehouse In-Charge','Warehouse and stock work modes'),
('ACCOUNTS','Accounts','Ledger and recovery verification'),
('SALES_MANAGER','Sales Manager','Sales team supervision'),
('SALES_RECOVERY','Sales & Recovery','Customer ordering, recovery, visits and follow-up'),
('DISPATCH_OFFICER','Dispatch & Logistics','Dispatch, vehicle, adda, bility and GRN')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

create or replace function public.nlink_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

grant execute on function public.nlink_current_user_id() to authenticated;

alter table public.users enable row level security;
alter table public.roles enable row level security;

DROP POLICY IF EXISTS users_self_read ON public.users;
DROP POLICY IF EXISTS users_admin_manage ON public.users;
DROP POLICY IF EXISTS roles_authenticated_read ON public.roles;
DROP POLICY IF EXISTS roles_admin_manage ON public.roles;

create policy users_self_read on public.users
for select to authenticated
using (auth_user_id = auth.uid());

create policy roles_authenticated_read on public.roles
for select to authenticated
using (true);

create policy users_admin_manage on public.users
for all to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and r.code = 'SUPER_ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and r.code = 'SUPER_ADMIN'
  )
);

create policy roles_admin_manage on public.roles
for all to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and r.code = 'SUPER_ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and r.code = 'SUPER_ADMIN'
  )
);
