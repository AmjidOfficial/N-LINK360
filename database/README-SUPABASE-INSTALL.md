# N-LINK 360 Supabase Installation

## Complete migration order

Run these files in Supabase SQL Editor, in this exact order:

1. `database/migrations/001_nlink360_core.sql` - company, factory, warehouse, product, customer, order, invoice, inventory, dispatch, recovery and ledger foundation
2. `database/migrations/002_auth_and_security.sql` - roles, auth mapping and security helpers
3. `database/migrations/003_operational_rls.sql` - operational row-level security
4. `database/migrations/004_transaction_engine.sql` - transaction posting functions and ledger/inventory rules
5. `database/migrations/005_sales_hierarchy.sql` - region, zone, area, territory, route and employee assignments
6. `database/migrations/007_nlink360_business_operations.sql` - targets, production, stock transfers, recovery allocation, field activity, contacts and audit log
7. `database/migrations/006_nlink360_install_verification.sql` - read-only verification, run last

## Do not run

Do **not** run the obsolete `database/migrations/001_initial_schema.sql` if present in an older project copy.

Do **not** run `database/seed/dev_seed.sql` against the current schema. It belongs to an older seed/schema design and must be replaced by a current-schema seed package before real data is loaded.

## Environment variables

Browser/client variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

Never commit server-only secrets to GitHub and never expose the service-role key to browser code.

## Authentication

Create the first Super Admin through Supabase Authentication. Do not enable open public registration for the production portal.

After the Auth user exists, link its UUID to the N-LINK `users.auth_user_id` field using the current-schema admin bootstrap process. Never store the password in GitHub or source code.

## Verification

After all migrations complete, run `006_nlink360_install_verification.sql` and confirm that the expected tables exist and the row counts return without errors.
