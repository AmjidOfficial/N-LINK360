# N-LINK 360 Supabase Setup

## 1. Create the free Supabase project

Create one Supabase project for N-LINK 360 development/pilot. Keep production as a separate project later.

## 2. Add Vite environment variables

Create a local `.env.local` file (never commit it):

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The browser must only receive the Supabase anon/publishable key. Never put a service-role key in Vite variables.

## 3. Run database migrations

Run, in order:

- `database/migrations/001_nlink360_core.sql`
- `database/migrations/002_auth_and_security.sql`

## 4. Create an Auth user

In Supabase Authentication, create the employee's email/password account.

Then create the matching employee, role and `users` record using the auth user's UUID in `users.auth_user_id`.

## 5. First account

Create the first Super Admin manually in the database. Do not build an open public sign-up page.

## 6. Security

- Do not expose service-role keys in the browser.
- Do not commit `.env.local`.
- Keep production credentials separate from development.
- Use database RLS and server-side transaction validation for financial and inventory operations.
