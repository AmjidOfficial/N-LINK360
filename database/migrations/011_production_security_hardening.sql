-- ==============================================================================
-- N-LINK 360 - 011_production_security_hardening.sql
-- Production security hardening for exposed Supabase functions and customer RLS.
-- ==============================================================================

-- Anonymous clients must never be able to call internal authorization helpers.
revoke execute on function public.nlink_is_admin_or_approver() from anon;
revoke execute on function public.nlink_is_authorized_approver() from anon;

-- Keep authorization helpers available only to signed-in application users.
grant execute on function public.nlink_is_admin_or_approver() to authenticated;
grant execute on function public.nlink_is_authorized_approver() to authenticated;

-- The customer registration workflow is an authenticated employee workflow.
-- Remove any accidental anonymous table access and keep RLS enabled.
alter table public.customers enable row level security;
revoke all on table public.customers from anon;

-- Do not allow anonymous execution of sensitive transaction functions.
revoke execute on function public.nlink_submit_order(uuid, jsonb, numeric, text) from anon;
revoke execute on function public.nlink_post_invoice(uuid) from anon;
revoke execute on function public.nlink_record_recovery(uuid, numeric, text, text, text, text, text) from anon;
revoke execute on function public.nlink_verify_recovery(uuid) from anon;
revoke execute on function public.nlink_current_employee_id() from anon;
revoke execute on function public.nlink_customer_balance(uuid) from anon;

-- Explicitly restore application access for authenticated users.
grant execute on function public.nlink_submit_order(uuid, jsonb, numeric, text) to authenticated;
grant execute on function public.nlink_post_invoice(uuid) to authenticated;
grant execute on function public.nlink_record_recovery(uuid, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.nlink_verify_recovery(uuid) to authenticated;
grant execute on function public.nlink_current_employee_id() to authenticated;
grant execute on function public.nlink_customer_balance(uuid) to authenticated;

-- Prevent the registration trigger helper from being directly invoked by clients.
revoke execute on function public.nlink_customer_stamp_creator() from public, anon, authenticated;

-- Production rule: no direct anonymous access to audit records.
revoke all on table public.audit_logs from anon;
