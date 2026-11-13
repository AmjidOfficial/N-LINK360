# N-LINK 360: Database Architecture & Schema Specification

This document details the database schema design, cascading hierarchies, and transaction specifications for **N-LINK 360**.

---

## 🗺️ 1. Geographical & Sales Hierarchy

To manage field operations at scale, N-LINK 360 employs a cascaded, strict multi-tier location model:

$$\text{Region} \rightarrow \text{Zone} \rightarrow \text{Area} \rightarrow \text{Territory} \rightarrow \text{Town} \rightarrow \text{Route}$$

### Database Schema Map:
* **`regions`**: Stores major distribution territories (e.g. `Punjab North`, `Sindh South`).
* **`zones`**: Linked to `regions` via `region_id`.
* **`areas`**: Linked to `zones` via `zone_id`.
* **`territories`**: Linked to `areas` via `area_id`.
* **`towns`**: Linked to `territories` via `territory_id`.
* **`routes`**: Final route tracks linked to `towns` via `town_id`. Customers are assigned to individual routes.

---

## 🏢 2. Corporate Structure & Supply Chain
* **`companies`**: Top-level group representation.
* **`branches`**: Multi-branch operational model (e.g., Lahore Head Office, Karachi Branch).
* **`factories`**: Plant locations where products are manufactured.
* **`warehouses`**: Tracks inventory categories (e.g. Finished Goods, Damage Quarantine).
* **`inventory_balances`**: Main stock tracking table enforcing a compound unique index: `unique(warehouse_id, sku_id)`.

---

## 📦 3. Products & SKU Customizations
* **`product_categories`**: Grouping of product ranges (e.g., Bulbs, Flood Lights).
* **`brands`**: Connected to product categories.
* **`products`**: Connected to brands. Includes models and power wattages.
* **`skus`**: Detailed packaging-specific items storing trade price, retail price, weight, units per carton, and barcode.

---

## 👥 4. Users, Employees & Permissions
* **`roles`**: Defines access roles (e.g., `SUPER_ADMIN`, `ACCOUNTS`, `SALES_RECOVERY`).
* **`employees`**: Details of national staff, reporting lines, and branch assignments.
* **`users`**: Secure connector table linking Supabase Authentication `auth_user_id` with employee records.

---

## 📈 5. Transaction Engine & Ledgers
All financial movements run in single-transaction database operations with ledger-audited entries:

### Customer Ledger Calculations:
$$\text{Opening Balance} + \text{Invoiced Sales} - \text{Verified Recoveries} \pm \text{Adjustments} = \text{Closing Running Balance}$$

* **`ledger_entries`**: Real-time audit trail of double-entry credits and debits per customer. No calculated balances are stored stale.
* **`sales_orders`** & **`sales_order_items`**: Tracks order lifecycles (Draft, Submitted, Invoiced).
* **`invoices`** & **`invoice_items`**: Final posted billing records.
* **`recoveries`**: Tracks field payment recovery receipts (Cash, Bank Transfer, Cheques) pending account verification.
