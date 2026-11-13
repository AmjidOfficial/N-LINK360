# N-LINK 360 Supabase Setup

## 1. Create the free Supabase project

Create one Supabase project for N-LINK 360 development/pilot. Keep production as a separate project later.

## 2. Add Vite environment variables

Create a local `.env.local` file and never commit it:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The browser must only receive the Supabase anon/publishable key. Never put a service-role key in Vite variables.

## 3. Run database migrations

Run these files in order:

1. `database/migrations/001_nlink360_core.sql`
2. `database/migrations/002_auth_and_security.sql`
3. `database/migrations/003_operational_rls.sql`
4. `database/migrations/004_transaction_engine.sql`

`001_initial_schema.sql` was an obsolete duplicate schema and has been removed. Do not mix the old schema with the N-LINK 360 core schema.

## 4. Create an Auth user

In Supabase Authentication, create the employee's email/password account.

Then create the matching N-LINK records:

1. `roles`
2. `employees`
3. `users`

Set `users.auth_user_id` to the Supabase Auth user's UUID.

The `users.employee_id` must point to the active employee and the employee's `role_id` must point to the correct N-LINK role.

## 5. First account

Create the first Super Admin manually in the database. Do not build an open public sign-up page.

## 6. Transaction engine

The browser uses Supabase RPC functions for sensitive operations:

- `nlink_submit_order`
- `nlink_post_invoice`
- `nlink_record_recovery`
- `nlink_verify_recovery`
- `nlink_current_employee_id`
- `nlink_customer_balance`

These functions perform server-side authorization and transaction validation. The browser never receives a service-role key.

## 7. Security

- Do not expose service-role keys in the browser.
- Do not commit `.env.local`.
- Keep development and production Supabase projects separate.
- Keep company accounts separate from developer/personal accounts.
- Use RLS for read/write scope.
- Use database transactions for financial and inventory posting.
- Never trust client-calculated balances or stock values for posting.
