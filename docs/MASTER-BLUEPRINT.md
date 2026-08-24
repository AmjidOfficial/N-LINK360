# N-LINK 360: MASTER BLUEPRINT

**Company:** National Lights  
**Contact:** nationallights2026@gmail.com  
**Repository:** AmjidOfficial/N-LINK360  
**Version:** 1.0.0-PROD-SPEC  

---

## 1. System Vision & Core Value Proposition
N-LINK 360 is the centralized operating system for **National Lights**, unifying production, inventory control, field sales, field recovery, credit monitoring, invoicing, logistics/dispatch, customer ledger accounting, and returns/damages into an unbreakable, auditable system.

### The Single-Role Principle
The field workforce operating under National Lights carries dual responsibility: **Sales and Recovery are handled by the same officer**. 
- Field users book orders, track dispatch status, visit clients, record debt recovery collections, report damages, and handle client inquiries.
- System safeguards ensure field users cannot bypass credit restrictions, arbitrarily modify stock quantities, or tamper with financial ledgers.

---

## 2. The Core Transaction Loops

### A. Order-to-Invoice-to-Dispatch Cycle
1. **Field Order Placement:**
   - Representative checks customer current outstanding balance, credit limit, and overdue days.
   - Representative selects SKUs with live system stock visibility.
   - System calculates line totals, order subtotals, discounts, and tax.
   - Status: `SUBMITTED`.
2. **Credit & Stock Check:**
   - Credit Equation: $\text{Current Outstanding} + \text{Pending Orders} + \text{New Order} \le \text{Credit Limit}$.
   - Evaluation returns `GREEN` (Automated approval ready), `AMBER` (Requires Sales Manager override), or `RED` (Blocked).
3. **Invoice Generation (Atomic Server Transaction):**
   - Creates immutable `invoices` and `invoice_items` record.
   - Decrements stock through `inventory_transactions` (`SALES_OUT`).
   - Debits customer account in `ledger_entries`.
   - Snapshot contains: `Previous Balance`, `Invoice Total`, `New Balance`.
4. **Logistics & Dispatch:**
   - Warehouse prepares cargo.
   - Assigns Transporter, Vehicle, Driver, Adda, and Bility Number.
   - Generates Delivery Note / Bility Challan.
   - Status evolves: `PENDING_DISPATCH` $\rightarrow$ `LOADED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED` $\rightarrow$ `GRN_VERIFIED`.

### B. Recovery & Customer Balance Settlement Cycle
1. **Field Collection:**
   - Field representative receives cash, cheque, online transfer, or pay order.
   - Enters instrument number, bank name, date, and collected sum.
2. **Accounts Verification:**
   - Accounts department reviews recovery receipt and instrument clearance.
3. **Ledger Posting:**
   - System posts `ledger_entries` credit record with verified recovery ID.
   - Customer outstanding drops by the exact recovery amount.

### C. Reverse Logistics & Damage Cycle
1. **Field Return/Damage Request:**
   - Representative logs claim with original invoice reference, SKU, quantity, damage reason, and photo evidence.
2. **Warehouse Inspection & QA:**
   - Inspector evaluates received goods: Saleable vs. Defective / Scrap.
3. **Financial Resolution:**
   - If Saleable Return: Adds to warehouse stock (`RETURN_IN`), generates `credit_notes` to reduce customer debt.
   - If Damage: Moves to damaged stock holding (`DAMAGE_OUT`), routes for repair, scrap, or replacement.

---

## 3. Role-Based Access Matrix

| Role | Scope & Permissions | Key Restrictions |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Full system configuration, user provisioning, global overrides, audit inspection. | None. |
| **MANAGEMENT** | Executive dashboards, national/regional KPIs, high-value credit overrides, financial audits. | Cannot modify core database schemas directly. |
| **ACCOUNTS** | Recovery verification, ledger entries, credit/debit notes, bank reconciliations, statements. | Cannot alter physical warehouse movements directly. |
| **SALES_MANAGER** | Regional sales oversight, credit exceptions (Amber tier), target allocations, team performance. | Cannot edit posted accounting entries. |
| **WAREHOUSE_MANAGER**| Stock in/out, goods receipt (GRN), transfers, batch tracking, physical counts, damage inspection. | Cannot alter customer credit terms or prices. |
| **FACTORY_MANAGER** | Production runs, batch creation, raw material consumption, QC approvals, finished goods dispatch. | No access to customer financial ledgers. |
| **DISPATCH_OFFICER** | Vehicle assignment, driver/adda logistics, bility generation, gate pass, transit tracking. | Cannot modify invoice prices or quantities. |
| **SALES_RECOVERY** | Assigned customer visits, mobile order booking, recovery logging, customer balance inquiries, return reporting. | Cannot edit posted invoices, inventory balances, or ledgers. |

---

## 4. Architectural Rules for Zero Data Corruption
1. **Fixed Precision Money:** All financial transactions stored as `NUMERIC(15, 2)`. Float math is prohibited.
2. **Quantities Precision:** Quantities stored as `NUMERIC(12, 2)` or `INTEGER` based on SKU unit of measure.
3. **Immutable Ledgers & Stock Ledgers:** Never update a posted balance in-place. All state changes require compensating transactions (e.g., Credit Notes, Debit Notes, Stock Adjustments).
4. **Authoritative Timestamping:** All operational events store UTC `timestamptz`. Display formats map to local company timezone (`Asia/Karachi` / `Asia/Dubai` / `UTC+5`).
