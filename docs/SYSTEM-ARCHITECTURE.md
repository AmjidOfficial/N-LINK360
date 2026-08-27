# N-LINK 360: SYSTEM ARCHITECTURE & TRANSACTION TOPOLOGY

**Target Platform:** National Lights Enterprise  
**Primary Pattern:** Multi-tier client/server with strict transactional consistency and CQRS projection patterns.

---

## 1. High-Level Architecture Topology

```
+------------------------------------+    +------------------------------------+
|        Company Web Portal          |    |       Sales & Recovery App         |
|   (Desktop / Office Dashboard)     |    |      (Mobile-First / Field)        |
+-----------------+------------------+    +-----------------+------------------+
                  |                                         |
                  +--------------------+--------------------+
                                       |
                       HTTPS REST / RPC Gateway
                                       |
                   +-------------------+-------------------+
                   |         Node.js Express Server        |
                   |       (Vite / Production CJS)         |
                   |                                       |
                   |  +---------------------------------+  |
                   |  |      RBAC & Policy Guard        |  |
                   |  +---------------------------------+  |
                   |  |    Credit Verification Engine   |  |
                   |  +---------------------------------+  |
                   |  |   Atomic Transaction Orchestr.  |  |
                   |  +---------------------------------+  |
                   |  |   Inventory Ledger & Balances   |  |
                   |  +---------------------------------+  |
                   |  |   Customer Ledger & Statements  |  |
                   |  +---------------------------------+  |
                   |  |    Audit Trail & Notifications  |  |
                   |  +---------------------------------+  |
                   +-------------------+-------------------+
                                       |
                              Database Engine
                   +-------------------+-------------------+
                   |       PostgreSQL / Supabase           |
                   |    (Immutable Trans. + Projections)   |
                   +---------------------------------------+
```

---

## 2. Server-Side Transaction Orchestrations

### A. Atomic Invoice Posting Pipeline
When an order moves from `APPROVED` to `INVOICED`:
1. **Concurrency Lock:** Acquires row-level locking on target customer record and affected SKU balances.
2. **Stock Verification:** Confirms `quantity_on_hand - quantity_reserved >= order_quantity` for every SKU line.
3. **Invoice Generation:** Inserts row into `invoices` with `previous_balance = customer.current_balance` and `new_balance = customer.current_balance + invoice.total_amount`.
4. **Stock Transaction Emission:** Inserts rows into `inventory_transactions` (`SALES_OUT`) for each SKU.
5. **Fast Balance Projection:** Increments/Decrements `inventory_balances` cached projections.
6. **Customer Ledger Debit:** Inserts `ledger_entries` record with `debit_amount = invoice.total_amount` and calculated `running_balance`.
7. **Customer Outstanding Update:** Updates `customer.current_balance = new_balance`.
8. **Audit Logging:** Inserts audit event with snapshot payload into `audit_logs`.
9. **Commit/Rollback:** All executed inside a single DB transaction block. If any step fails, entire block rolls back cleanly.

### B. Recovery Posting Pipeline
1. Recovery logged by field officer $\rightarrow$ status `PENDING_VERIFICATION`.
2. Accounts officer verifies payment proof $\rightarrow$ clicks `VERIFY`.
3. System inserts `ledger_entries` record with `credit_amount = recovery.amount`.
4. Customer outstanding balance is reduced by exact recovery amount.
5. Audit event recorded.

---

## 3. Data Integrity & Constraint Strategy
- **Foreign Keys with `ON DELETE RESTRICT`**: Crucial master entities (Customers, SKUs, Warehouses, Users) cannot be deleted if referenced in historical transactions.
- **Idempotency Keys**: All financial submissions require unique client request tokens to prevent accidental double-submits.
- **Fixed-Precision Math**: JavaScript `BigNumber` or integer-cent conversions ensure zero floating-point accumulation errors during tax and discount computations.
