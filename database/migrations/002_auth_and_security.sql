-- N-LINK 360 authentication and baseline security
-- Source of truth: database/migrations/001_nlink360_core.sql

alter table public.users
  add column if not exists auth_user_id uuid unique;

insert into public.roles (role_code, name, description) values
('SUPER_ADMIN','Super Admin','Full system administration'),
('MANAGEMENT','Management','Management dashboard and approved reports'),
('FACTORY_MANAGER','Factory In-Charge','Factory work modes'),
('WAREHOUSE_MANAGER','Warehouse In-Charge','Warehouse and stock work modes'),
('ACCOUNTS','Accounts','Ledger and recovery verification'),
('SALES_MANAGER','Sales Manager','Sales team supervision'),
('SALES_RECOVERY','Sales & Recovery','Customer ordering, recovery, visits and follow-up'),
('DISPATCH_OFFICER','Dispatch & Logistics','Dispatch, vehicle, adda, bility and GRN')
on conflict (role_code) do update
set name = excluded.name,
    description = excluded.description;

create or replace function public.nlink_current_user_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.users
  where auth_user_id = auth.uid() and status = true
  limit 1;
$$;

grant execute on function public.nlink_current_user_id() to authenticated;

create or replace function public.nlink_current_employee_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select employee_id from public.users
  where auth_user_id = auth.uid() and status = true
  limit 1;
$$;

grant execute on function public.nlink_current_employee_id() to authenticated;

create or replace function public.nlink_has_role(required_role text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.employees e on e.id = u.employee_id
    join public.roles r on r.id = e.role_id
    where u.auth_user_id = auth.uid()
      and u.status = true
      and e.status = true
      and r.role_code = required_role
  );
$$;

grant execute on function public.nlink_has_role(text) to authenticated;

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
using (public.nlink_has_role('SUPER_ADMIN'))
with check (public.nlink_has_role('SUPER_ADMIN'));

create policy roles_admin_manage on public.roles
for all to authenticated
using (public.nlink_has_role('SUPER_ADMIN'))
with check (public.nlink_has_role('SUPER_ADMIN'));
