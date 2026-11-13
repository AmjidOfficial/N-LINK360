-- ==============================================================================
-- N-LINK 360 - 011_production_security_hardening.sql
-- Production security hardening for exposed Supabase functions and customer RLS.
-- ============================================================================

-- Anonymous clients must never be able to call internal authorization helpers.
revoke execute on function public.nlink_is_admin_or_approver() from anon;
revoke execute on function public.nlink_is_authorized_approver() from anon;

grant execute on function public.nlink_is_admin_or_approver() to authenticated;
grant execute on function public.nlink_is_authorized_approver() to authenticated;

-- Customer registration is an authenticated employee workflow.
alter table public.customers enable row level security;
revoke all on table public.customers from anon;

-- Revoke anonymous execution for every N-LINK transaction/authorization helper
-- without assuming overloaded function signatures.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'nlink_submit_order',
        'nlink_post_invoice',
        'nlink_record_recovery',
        'nlink_verify_recovery',
        'nlink_current_employee_id',
        'nlink_customer_balance',
        'nlink_record_audit',
        'nlink_customer_stamp_creator'
      )
  loop
    execute format('revoke execute on function %s from anon', r.signature);
  end loop;
end $$;

-- Keep application transaction helpers available to authenticated users.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'nlink_submit_order',
        'nlink_post_invoice',
        'nlink_record_recovery',
        'nlink_verify_recovery',
        'nlink_current_employee_id',
        'nlink_customer_balance',
        'nlink_record_audit'
      )
  loop
    execute format('grant execute on function %s to authenticated', r.signature);
  end loop;
end $$;

-- Trigger helpers are database-internal only.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'nlink_customer_stamp_creator'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
  end loop;
end $$;

-- Audit records are never directly readable by anonymous clients.
revoke all on table public.audit_logs from anon;
