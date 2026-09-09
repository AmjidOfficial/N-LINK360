-- N-LINK 360 production security hardening.
-- Internal SECURITY DEFINER helpers are not browser-facing.
revoke execute on function public.nlink_auto_assign_customer() from public, anon, authenticated;
revoke execute on function public.nlink_is_designated_approver() from public, anon, authenticated;
revoke execute on function public.nlink_customer_balance(uuid) from public, anon, authenticated;
revoke execute on function public.nlink_is_field_or_privileged() from public, anon, authenticated;
revoke execute on function public.nlink_is_privileged() from public, anon, authenticated;
-- The field app legitimately resolves its linked employee through this guarded helper.
grant execute on function public.nlink_current_employee_id() to authenticated;
revoke execute on function public.nlink_current_employee_id() from anon;
