# N-LINK 360 SalesPulse Clone: Dealer / Distributor Edition

## Purpose

N-LINK 360 now uses SalesPulse as the reference implementation for the field-sales interaction model, but it is **not** a copy of the SalesPulse database or Firebase architecture.

The original `AmjidOfficial/SALESPULSE` repository remains unchanged and independent.

This branch adapts the proven SalesPulse interaction model one level down:

**SalesPulse**
- Order Booker / field-force entry
- Distributor / route context
- SKU order entry
- Attendance / visit execution
- Sales intelligence

**N-LINK 360 Dealer / Distributor Edition**
- Field Force selects a real Dealer / Distributor
- Customer 360 financial summary
- Brand/category-first SKU order entry
- Live available stock
- Recovery / collection entry
- Invoice visibility and invoice creation through the N-LINK transaction engine
- Live ledger / balance update
- Customer onboarding and approval
- Visit and GPS capture
- Offline queue and sync
- Management dashboard

## Non-negotiable architecture

### 1. Supabase is the system of record

All operational and financial transactions are authoritative in Supabase/PostgreSQL.

This includes:

- users and permissions
- customers
- products / SKUs
- inventory
- sales orders
- invoices
- recoveries
- ledger entries
- visits
- approvals
- audit history

The SalesPulse Firebase implementation is **not** copied into N-LINK 360.

### 2. Google Sheets is an integration layer

The configured National Lights Google Sheet is retained for controlled master-data import/export, operational visibility and synchronization where the business workflow requires it.

It must not become a second financial source of truth.

For financial records, the safe direction is:

`Supabase transaction -> Google Sheet reporting/sync`

For approved master-data workflows, controlled import may be:

`Google Sheet -> validation -> Supabase`

Every import must validate IDs, status, duplicates and permissions before writing.

### 3. Original SalesPulse is protected

Do not modify:

`AmjidOfficial/SALESPULSE`

All changes belong in:

`AmjidOfficial/N-LINK360`

## SalesPulse concepts intentionally carried forward

1. Category/brand-first order entry.
2. Expandable brand sections.
3. Compact SKU entry.
4. Keyboard-friendly numeric entry.
5. Focus mode for fast field work.
6. Customer/route history as decision support.
7. Simple, mobile-first field workflow.
8. Strong dashboard drill-downs.
9. Operational reporting and export.

## SalesPulse concepts intentionally removed

Do not copy into N-LINK 360:

- hard-coded user roles
- hard-coded customer/SKU arrays
- Firebase authentication
- Firebase Firestore as the production store
- localStorage as the source of truth
- demo/fallback business values
- unrelated SalesPulse business hierarchy
- SalesPulse-specific OB-only fields unless the N-LINK business model explicitly needs them

## Dealer / Distributor order flow

1. Authenticate the real N-LINK user.
2. Open Field Force dashboard.
3. Select Dealer / Distributor.
4. Show current opening balance, invoicing, recovery and net balance.
5. Show real available inventory.
6. Enter quantities by brand/category.
7. Validate stock and customer permissions server-side.
8. Review the order.
9. Submit to the real N-LINK transaction engine.
10. Refresh Customer 360, order status and financial views.
11. Invoice only through the approved invoice workflow.
12. Update ledger from the posted financial transaction.

## Recovery flow

1. Select Dealer / Distributor.
2. Show current outstanding balance.
3. Enter payment amount and method.
4. Capture reference/instrument details when required.
5. Apply approval rules.
6. Post the approved recovery transaction.
7. Recalculate the ledger from transactions.
8. Refresh the dashboard and Customer 360 view.
9. Sync approved operational data to Google Sheets where configured.

## Ledger rule

The displayed balance must be explainable from transactions.

`Opening Balance + Approved Invoices - Approved Recoveries +/- Approved Adjustments = Current Balance`

Do not patch a balance on individual screens.

## Invoice rule

Invoice creation must use the N-LINK order/invoice transaction engine. Opening an invoice screen must never reduce inventory or alter the ledger by itself.

When an invoice is posted, the appropriate financial and stock transactions must be committed atomically according to the N-LINK database rules.

## Production acceptance

The clone is not considered complete until the following work against real N-LINK data:

- real authentication
- Dealer / Distributor selection
- customer financial summary
- real SKU master
- real stock availability
- real order submission
- invoice workflow
- recovery workflow
- live ledger recalculation
- approval controls
- Google Sheet integration
- offline sync without duplicate posting
- audit history
- role-based access
- mobile and desktop responsive UI

No dummy records are required to make the screens look populated.

## Current implementation note

N-LINK 360 already contains the `SalesRecoveryApp`, Supabase transaction/data services, offline sync engine, Google Sheets live service and production-oriented database migrations. The correct implementation strategy is therefore **incremental replacement/refinement of N-LINK modules**, not a blind copy of the SalesPulse repository.
