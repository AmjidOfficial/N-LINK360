# N-LINK 360: Supabase PostgreSQL Installation Guide

This document describes the step-by-step procedure to build and deploy the complete production database for **N-LINK 360** (National Lights).

---

## 📋 Prerequisites
1. An active **Supabase** project: [supabase.com](https://supabase.com).
2. Your project's **Supabase URL** and **Anon Key** (retrieved from *Settings* > *API*).

---

## 🛠️ Step-by-Step Installation

### Step 1: Execute Database Migrations
Go to your **Supabase Dashboard** > **SQL Editor** > **New Query**, and execute the migration files located in `/database/migrations/` in the following sequence:

1. **`001_nlink360_core.sql`**:
   * Creates core corporate structures, products, warehouses, and master tables.
   * *Safe Execution:* Includes pre-compiled conditional checks (`if not exists`) to prevent duplicate enum errors (such as `customer_type`).
2. **`002_auth_and_security.sql`**:
   * Sets up system roles, user profile maps, and role-based helpers.
3. **`003_operational_rls.sql`**:
   * Hardens all transactional tables using Postgres Row-Level Security (RLS).
4. **`004_transaction_engine.sql`**:
   * Builds stored triggers, financial ledgers, and inventory-locking stored procedures (`nlink_submit_order`, `nlink_post_invoice`, etc.).
5. **`005_nlink360_hierarchy_and_ops.sql`**:
   * Provisions geographical hierarchies, CSV import audit trails, target allocations, and reporting performance views.

---

### Step 2: Seed Operational Meta-Data
In the SQL Editor, copy and execute the safe static fixtures inside **`/database/seed/dev_seed.sql`**.
This will:
* Register initial branches, warehouses, and brands.
* Build preloaded products and SKUs.

---

### Step 3: Register Your Admin Account
To create your live administrator login and map it to the application:

1. In Supabase, go to **Authentication** > **Users** > **Add User** > **Create User**.
2. Enter your desired email (e.g., `admin@nationallights.com`) and choose a secure password.
3. Once registered, copy the generated **User ID** (UUID string, e.g., `a7d8c6b9-...`).
4. Execute this SQL mapping query in the **SQL Editor** to pair your login with the Super Admin role:

```sql
INSERT INTO users (id, auth_user_id, user_code, employee_id, status)
VALUES (
  gen_random_uuid(),
  'YOUR_SUPABASE_COPIED_UUID', -- Paste your copied User ID here
  'USR-ADMIN-01',
  'e0000000-0000-0000-0000-000000000001', -- Maps to preseeded Super Admin employee profile
  true
);
```

---

## 🔒 Row-Level Security (RLS) Rules
N-LINK 360 enforces RLS database-wide:
* **SUPER_ADMIN / MANAGEMENT**: Full visibility across all organizations.
* **SALES_RECOVERY / FIELD OFFICERS**: Restricts read/write access strictly to their assigned territories, towns, routes, and customers.
* **ACCOUNTS**: Exclusive verification privileges over payment recovery receipts and ledger entries.
