-- N-LINK 360: Super Admin auth linking helper
-- Run only AFTER the Supabase Auth user has been created.
-- Replace the placeholder UUID with the Auth user's UUID.
-- Never place the user's password in this file.

-- Example usage:
-- select public.nlink_link_super_admin('00000000-0000-0000-0000-000000000000'::uuid);

create or replace function public.nlink_link_super_admin(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_employee_id uuid;
  v_role_id uuid;
  v_branch_id uuid;
begin
  select id into v_role_id from roles where role_code = 'SUPER_ADMIN' limit 1;
  if v_role_id is null then raise exception 'SUPER_ADMIN role is missing'; end if;

  select id into v_branch_id from branches order by created_at asc limit 1;
  if v_branch_id is null then raise exception 'No branch exists. Run the core migration first.'; end if;

  select id into v_employee_id from employees where employee_code = 'EMP-ADMIN-01' limit 1;
  if v_employee_id is null then
    insert into employees (employee_code, full_name, email, role_id, branch_id, status)
    values ('EMP-ADMIN-01', 'N-LINK 360 Administrator', 'admin@nationallights.com', v_role_id, v_branch_id, true)
    returning id into v_employee_id;
  else
    update employees
    set role_id = v_role_id,
        branch_id = v_branch_id,
        email = coalesce(email, 'admin@nationallights.com'),
        status = true
    where id = v_employee_id;
  end if;

  select id into v_user_id from users where user_code = 'USR-ADMIN-01' limit 1;
  if v_user_id is null then
    insert into users (auth_user_id, user_code, employee_id, status)
    values (p_auth_user_id, 'USR-ADMIN-01', v_employee_id, true)
    returning id into v_user_id;
  else
    update users
    set auth_user_id = p_auth_user_id,
        employee_id = v_employee_id,
        status = true
    where id = v_user_id;
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.nlink_link_super_admin(uuid) from public;
