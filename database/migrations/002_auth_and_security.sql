-- N-LINK 360 authentication and baseline security
-- Supabase Auth owns passwords/sessions. Public users table only links Auth UUID to an employee.

insert into roles (role_code, name, description) values
('SUPER_ADMIN','Super Admin','Full system administration'),
('MANAGEMENT','Management','Management dashboard and approved reports'),
('FACTORY_MANAGER','Factory In-Charge','Factory work modes'),
('WAREHOUSE_MANAGER','Warehouse In-Charge','Warehouse and stock work modes'),
('ACCOUNTS','Accounts','Ledger and recovery verification'),
('SALES_MANAGER','Sales Manager','Sales team supervision'),
('SALES_RECOVERY','Sales & Recovery','Customer ordering, recovery, visits and follow-up'),
('DISPATCH_OFFICER','Dispatch & Logistics','Dispatch, vehicle, adda, bility and GRN')
on conflict (role_code) do update set name = excluded.name, description = excluded.description;

create or replace function public.nlink_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users
  where auth_user_id = auth.uid()
    and status = true
  limit 1;
$$;

create or replace function public.nlink_current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.users
  where auth_user_id = auth.uid()
    and status = true
  limit 1;
$$;

grant execute on function public.nlink_current_user_id() to authenticated;
grant execute on function public.nlink_current_employee_id() to authenticated;

alter table users enable row level security;
alter table employees enable row level security;
alter table roles enable row level security;

create policy users_self_read on users for select to authenticated
using (auth_user_id = auth.uid());

create policy employees_self_read on employees for select to authenticated
using (id = public.nlink_current_employee_id());

create policy roles_authenticated_read on roles for select to authenticated
using (true);

-- Admins may manage master/security records. The application should still hide
-- controls by permission; RLS is the final database boundary.
create policy users_admin_manage on users for all to authenticated
using (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
))
with check (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
));

create policy employees_admin_manage on employees for all to authenticated
using (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
))
with check (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
));

create policy roles_admin_manage on roles for all to authenticated
using (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
))
with check (exists (
  select 1 from employees e join roles r on r.id = e.role_id
  where e.id = public.nlink_current_employee_id() and r.role_code = 'SUPER_ADMIN'
));
