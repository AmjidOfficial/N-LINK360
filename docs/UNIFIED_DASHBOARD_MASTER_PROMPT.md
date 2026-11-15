# N-LINK-360 Unified Dashboard and Hierarchy Rebuild
## Approved source of truth for AI Studio and repository work

**Baseline:** GitHub `main` at commit `425c07001fe1591d7ccc2479733326aa190ccde6`.
**Implementation:** controlled branch `rebuild/unified-department-dashboards-2026-11-15`.
**Production status:** not yet approved or deployed.

## 1. Instruction priority and prompt audit

This document consolidates the active N-LINK-360 instructions. If older prompts, screenshots, code comments or demo data conflict with this document, follow this document and the user's latest written decisions.

Reviewed saved AI Studio prompts:
- `public/assets/aistudio/Paste_November_10__2026_-_9_30AM_1b4fa86c`
- `public/assets/aistudio/Paste_November_10__2026_-_9_50AM_619b77e7`
- `public/assets/aistudio/Paste_November_10__2026_-_2_14PM_2ecbd6c1`

### Conflicts resolved

1. Older prompts describe Dealer and Distributor as separate account roles. Approved model: one canonical `TRADE_PARTNER` login/dashboard/permission group. Preserve `DEALER` or `DISTRIBUTOR` as the customer's business type. Preserve separate customer IDs, ledgers, invoices, transactions and assignment rules. A distributor may see linked dealers only where an explicit, verified relationship exists.
2. Older prompts list TSM, ASM, SS, OB and Recovery Officer as separate roles. Approved model: one canonical `SALES_OFFICER` role and dashboard. Preserve employee designation as metadata and legacy role strings only as migration aliases.
3. Older prompts describe separate mobile and desktop applications selected by device. Approved model: one role/department experience with responsive layouts. The screen size changes layout and navigation density, never the user's department, KPI definitions, access scope or business functions.
4. Older prompts ask to remove and recreate the entire frontend or rebuild the database. Approved model: incremental replacement of audited components. Preserve sound business workflows and all production records. No database reset, destructive migration or broad rewrite without evidence and approval.
5. Older prompts include extra roles such as ASM, OB, SS and Recovery Officer. Keep these as legacy aliases for Sales Officer where they represent field-sales work. Do not silently convert distinct HR, Finance, Warehouse, Factory or Dispatch permissions into sales permissions.
6. Older prompts request two-way Google Sheets sync. Supabase remains authoritative. Sheets imports must pass validation and review; posted financial and inventory transactions cannot be overwritten by sheet edits.

## 2. Canonical role and hierarchy

### Sales and trade hierarchy

- SUPER_ADMIN: system administration, company-wide scope.
- TOP_MANAGEMENT: executive dashboard and company-wide oversight.
- NSM: national sales scope.
- RSM: assigned region only.
- ZSM: assigned zone only.
- SALES_OFFICER: assigned territory, towns, customers and own field activity.
- TRADE_PARTNER: one shared Dealer/Distributor portal, scoped to own account and explicitly linked records.

Department roles:
- ACCOUNTS
- WAREHOUSE
- FACTORY
- DISPATCH
- HR

Reporting chain:
Company / National → Region (RSM) → Zone (ZSM) → Territory / Town → Sales Officer → Trade Partner.

Department staff do not inherit sales hierarchy access by default. Department-level access must be separately assigned and enforced.

### Role mapping

| Canonical role | Legacy aliases |
|---|---|
| SUPER_ADMIN | ADMIN |
| TOP_MANAGEMENT | MANAGEMENT, MD, MD_EXECUTIVE |
| NSM | NATIONAL_MANAGER, NATIONAL_SALES_MANAGER |
| RSM | REGIONAL_MANAGER, REGIONAL_SALES_MANAGER |
| ZSM | ZONAL_MANAGER, ZONAL_SALES_MANAGER |
| SALES_OFFICER | TSM, ASM, SS, OB, ORDER_BOOKER, RECOVERY_OFFICER, SALES_RECOVERY, FIELD_SALES_USER |
| TRADE_PARTNER | DEALER, DISTRIBUTOR |
| ACCOUNTS | FINANCE, ACCOUNTS_MANAGER, FINANCE_MANAGER |
| WAREHOUSE | WAREHOUSE_MANAGER |
| FACTORY | FACTORY_MANAGER, PRODUCTION, PRODUCTION_MANAGER |
| DISPATCH | DISPATCH_OFFICER, LOGISTICS, LOGISTICS_MANAGER |
| HR | HR_ADMIN, HR_MANAGER |

Unknown roles must fail closed. Never grant a default or administrator role to an unknown account.

## 3. Department dashboard requirements

Every dashboard follows this order:
1. Role, department, authorized scope, date range and last confirmed refresh.
2. Main KPI cards at the top.
3. Daily actions permitted for that user.
4. Pending tasks, approvals and urgent alerts.
5. Trends and comparisons.
6. Hierarchy or department breakdown.
7. Recent activity and drill-down to source records.

### Executive / Top Management
Today's and MTD sales; today's and MTD confirmed recovery; total and overdue outstanding; sales and recovery target achievement; pending approvals; active trade partners; regional performance; operational and financial exceptions.

### NSM / RSM / ZSM
Sales and recovery; target achievement; outstanding and overdue; regional/zonal/territory ranking; partner coverage; officer productivity; attendance and visits; pending orders and approvals. Drill-down is limited to the signed-in user's assigned hierarchy.

### Sales Officer / TSM
Today's and MTD sales and recovery; approved targets; target achievement; attendance; visits; pending orders; assigned customer balances; quick order, recovery, visit and check-in actions.

### Dealer / Distributor
Own account balance, available credit, unpaid invoices, payment history, order and delivery status, approved catalogue and statements. One shared portal; explicit record-level scope remains distinct.

### Accounts
Receivables, overdue aging, unallocated receipts, recovery verification queue, invoice posting queue, ledger exceptions and reconciliation tasks.

### Warehouse
Available, reserved and damaged stock, low-stock SKUs, pick/pack queue, orders awaiting dispatch, stock movements and inventory exceptions.

### Factory
Production today, plan versus actual, work in progress, finished goods, quality pass/rejection, material shortage and downtime. Factory must never silently reuse Warehouse dashboard or KPI logic.

### Dispatch
Dispatch queue, dispatched today, in-transit, delivered, delivery proof pending, bilty/freight and delayed shipments.

### HR
Active headcount, present/absent/late, attendance exceptions, leave approvals, employee requests and department staffing.

No dashboard may use demo numbers, credit limits as sales targets, or unrelated fallback calculations. Missing targets show “Not configured”; missing or stale data is distinct from a true zero.

## 4. Management preview

Super Admin and Top Management can preview every registered department dashboard. NSM can preview only NSM/RSM/ZSM/Sales Officer/Trade Partner sales dashboards within national scope.

Preview is read-only. It must not change the authenticated user, role, session, RLS claims, server permissions or data scope. Hide or disable write actions during preview. Server APIs and Supabase RLS remain authoritative. Never impersonate another user in the browser.

## 5. Responsive design contract

One dashboard system for mobile, tablet, laptop and desktop:
- 320–389px: compact one/two-column KPI cards, touch-first actions, no page overflow.
- 390–599px: two KPI columns, compact filters and charts.
- 600–1023px: tablet layout, two/three KPI columns, collapsible navigation.
- 1024–1439px: desktop sidebar, four KPI columns and analytical panels.
- 1440px+: multi-panel analytics and readable max-width tables.

Same role, KPIs, data scope and allowed actions on every device. Use responsive layout only. Tables may become cards or use bounded horizontal scrolling. Meet keyboard, contrast, focus and touch-target needs.

## 6. Data, finance and security invariants

- Supabase Auth is authoritative for identity.
- Supabase/PostgreSQL and RLS are authoritative for business data and access.
- Google Sheets is an integration/mirror, not a competing master database.
- Derive user scope from authenticated identity and trusted assignments, never request filters alone.
- Apply scope consistently to customers, orders, invoices, recoveries, ledger, visits, targets, attendance, stock and dispatch.
- Distributor-to-dealer visibility requires an explicit relationship, never town-name matching alone.
- Sales targets come from approved target records or employee target fields, never customer credit limits.
- Recovery KPIs include confirmed/posted receipts only, according to accounting policy.
- Preserve posted invoices, recoveries, ledger history, stock movements, customer IDs and historical price snapshots.
- Financial corrections use authorised reversals/adjustments with audit history.
- Use Asia/Karachi business dates and preserve UTC timestamps.
- Never show “saved”, “posted” or “synced” until the destination confirms the operation.
- Never put passwords, service-role keys or tokens in source, localStorage, Sheets or logs.

## 7. Required implementation sequence

1. Inventory every role, department, route, dashboard, navigation path, API permission and RLS policy.
2. Add canonical role normalization and regression tests; retain legacy persisted role values during migration.
3. Unify permission groups and server-side checks. Fix role/dashboard mapping so Factory remains Factory.
4. Unify Dealer/Distributor portal presentation without merging account data or scope.
5. Unify TSM/Sales Officer presentation without losing designation metadata.
6. Remove device-only department switching. Use role/department routing and responsive layout.
7. Implement top KPI cards and daily actions for every department using verified domain queries.
8. Add read-only management preview.
9. Validate data-scope boundaries and every KPI formula against source transactions.
10. Run typecheck, unit tests, build, RLS tests, business workflow tests and Playwright viewport tests.
11. Open a pull request. Do not merge or deploy until all checks pass and production data/security review is complete.

## 8. Acceptance gates

- All known legacy role aliases normalize deterministically; unknown roles fail closed.
- TSM and Sales Officer resolve to the same canonical role and dashboard.
- Dealer and Distributor resolve to the same portal/dashboard; business type and data ownership remain intact.
- RSM cannot access another region; ZSM cannot access another zone; Sales Officer cannot access another territory.
- Dealer cannot see another dealer's private records. Distributor sees only itself and explicitly linked dealers.
- Accounts, Warehouse, Factory, Dispatch and HR have distinct dashboards and permissions.
- Management preview cannot mutate records or widen scope.
- KPI values reconcile with source records for the same Asia/Karachi date range.
- All dashboard roles work at 320, 375, 390, 768, 1024, 1366 and 1920px.
- No page-level horizontal overflow on phones.
- Existing sales, recovery, order, invoice, ledger, customer, attendance, stock and dispatch workflows pass regression tests.
- No production records are deleted or rewritten.

## 9. AI Studio execution instruction

Read this document first. Then inspect the current repository and compare every existing prompt, role, dashboard, route, permission and data query against it. Implement in small, reviewable stages. For each stage report: files inspected, files changed, business rules preserved, tests run, test results, unresolved risks and exact commit/branch. Do not claim completion for work that has not been built and tested. Do not overwrite main or production data.
