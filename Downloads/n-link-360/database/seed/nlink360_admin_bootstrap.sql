-- N-LINK 360: First Super Admin bootstrap
-- Run ONLY after migrations 001 -> 004 have completed successfully.
-- Replace YOUR_SUPABASE_AUTH_USER_UUID with the UUID created in
-- Supabase Dashboard -> Authentication -> Users.
-- Do NOT put a password in this file.

begin;

-- 1. Company
insert into public.companies (company_code, name, email, phone, address)
values (
  'NL-CORP',
  'National Lights (Pvt) Ltd',
  'nationallights2026@gmail.com',
  '+92 42 35910000',
  'Pakistan'
)
on conflict (company_code) do update
set name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    address = excluded.address;

-- 2. Main branch
insert into public.branches (branch_code, company_id, name, city, status)
select
  'BR-MAIN',
  c.id,
  'National Lights Main Branch',
  'Lahore',
  true
from public.companies c
where c.company_code = 'NL-CORP'
on conflict (branch_code) do update
set name = excluded.name,
    city = excluded.city,
    status = true;

-- 3. Super Admin role
insert into public.roles (role_code, name, description, status)
values (
  'SUPER_ADMIN',
  'Super Admin',
  'Full N-LINK 360 system administration',
  true
)
on conflict (role_code) do update
set name = excluded.name,
    description = excluded.description,
    status = true;

-- 4. Super Admin employee profile
insert into public.employees (
  employee_code,
  employee_no,
  full_name,
  mobile,
  email,
  role_id,
  head,
  branch_id,
  status
)
select
  'EMP-ADMIN-01',
  'ADMIN-001',
  'Muhammad Amjid',
  '+92 300 8400000',
  'admin@nationallights.com',
  r.id,
  'MANUFACTURER'::party_head,
  b.id,
  true
from public.roles r
cross join public.branches b
where r.role_code = 'SUPER_ADMIN'
  and b.branch_code = 'BR-MAIN'
on conflict (employee_code) do update
set full_name = excluded.full_name,
    mobile = excluded.mobile,
    email = excluded.email,
    role_id = excluded.role_id,
    branch_id = excluded.branch_id,
    status = true;

-- 5. Link the N-LINK user record to Supabase Auth.
-- Replace the placeholder UUID before running this statement.
insert into public.users (
  user_code,
  employee_id,
  auth_user_id,
  username,
  status
)
select
  'USR-ADMIN-01',
  e.id,
  'YOUR_SUPABASE_AUTH_USER_UUID'::uuid,
  'admin',
  true
from public.employees e
where e.employee_code = 'EMP-ADMIN-01'
on conflict (user_code) do update
set employee_id = excluded.employee_id,
    auth_user_id = excluded.auth_user_id,
    username = excluded.username,
    status = true;

commit;

-- Verification query
select
  u.user_code,
  u.auth_user_id,
  e.employee_code,
  e.full_name,
  r.role_code,
  b.branch_code,
  u.status as user_status,
  e.status as employee_status
from public.users u
join public.employees e on e.id = u.employee_id
join public.roles r on r.id = e.role_id
left join public.branches b on b.id = e.branch_id
where u.user_code = 'USR-ADMIN-01';
