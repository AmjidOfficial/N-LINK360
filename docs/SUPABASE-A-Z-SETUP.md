# N-LINK 360: Supabase A-Z Setup

This guide creates the live N-LINK 360 database safely.

## 0. Before starting

- Use the Supabase project created for N-LINK 360.
- Do not paste passwords, service-role keys, or database passwords into GitHub.
- Take a backup/snapshot if the project already contains important data.

## 1. Get API settings

Supabase Dashboard -> Project Settings -> API.

Set these in the AI Studio/Vite environment:

- `VITE_SUPABASE_URL` = your project URL
- `VITE_SUPABASE_ANON_KEY` = your publishable/anon key

The service-role key is server-only and is not required by the browser application.

## 2. Create the database

Open Supabase -> SQL Editor -> New Query.

Run the migrations in this order, one at a time:

1. `001_nlink360_core.sql`
2. `002_auth_and_security.sql`
3. `003_operational_rls.sql`
4. `004_transaction_engine.sql`
5. `005_sales_hierarchy.sql`
6. `007_nlink360_business_operations.sql`
7. `008_town_layer.sql`
8. `009_admin_link_helper.sql`
9. `010_master_data_import.sql`
10. `006_nlink360_install_verification.sql`

If any statement fails, stop and fix that migration before continuing. Do not repeatedly rerun later migrations to hide an earlier failure.

## 3. Verify tables

Run migration 006 last. It reports the expected tables and row counts. Confirm there are no SQL errors.

## 4. Create the first Admin Auth user

Supabase -> Authentication -> Users -> Add User -> Create User.

Recommended first account:

- Email: `admin@nationallights.com`
- Password: choose a strong private password
- Auto Confirm: enabled if available

Never put the password into GitHub, SQL files, screenshots, or chat.

Copy only the generated Auth User UID.

## 5. Link Admin to N-LINK

After the Auth user exists, run:

`select public.nlink_link_super_admin('AUTH-USER-UUID'::uuid);`

Replace the placeholder with the actual Supabase Auth UID.

The function creates/updates `USR-ADMIN-01`, links the employee record, and assigns `SUPER_ADMIN`.

## 6. Test application login

Open N-LINK 360 with the same Supabase environment variables.

Login using the Admin email and the password you created in step 4.

Expected chain:

Supabase Auth -> users.auth_user_id -> employee -> SUPER_ADMIN -> Company Portal.

## 7. Load master data

Do not import real data directly into production tables from an arbitrary spreadsheet.

Use the N-LINK import flow:

Excel/CSV -> import_batches -> import_rows -> validation -> preview -> approval -> production master tables -> master_data_change_log.

Recommended load order:

1. Company/Branch/Factory/Warehouse
2. Roles
3. Regions
4. Zones
5. Areas
6. Territories
7. Towns
8. Routes
9. Employees and manager relationships
10. Employee hierarchy assignments
11. Distributors/Dealers/Shops
12. Product categories
13. Brands
14. Products
15. SKUs and packaging
16. Price lists
17. Opening inventory
18. Opening customer balances
19. Targets

## 8. Production security

- Keep RLS enabled.
- Keep public registration disabled for the company portal.
- Never expose the service-role key to browser code.
- Use role-based permissions for all management operations.
- Keep audit logging enabled.

## 9. Go-live checks

Test each role with a real Auth user:

- SUPER_ADMIN
- MANAGEMENT
- FACTORY_MANAGER
- WAREHOUSE_MANAGER
- ACCOUNTS
- SALES_MANAGER
- SALES_RECOVERY
- DISPATCH_OFFICER

Test the critical flows:

Order -> Approval -> Invoice -> Stock Out -> Ledger
Recovery -> Verification -> Ledger
Factory -> Warehouse -> Dispatch
Return/Damage -> Approval -> Stock adjustment
Visit -> GPS -> Order/Recovery

## 10. Backup and release rule

Never make large schema changes directly in the live database without a migration file committed to GitHub first. Test on a safe branch/project, verify, then promote.
