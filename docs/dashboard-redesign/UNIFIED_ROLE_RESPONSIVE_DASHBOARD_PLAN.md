# N-LINK-360 Unified Role, Hierarchy & Responsive Dashboard Rebuild

## Status
Implementation branch: `feat/unified-role-responsive-dashboards`
Baseline: `ff0743d080320d079799cacb24b38072796ab7ea`
Production/main is not modified.

This is a staged rebuild. Existing financial records, customer IDs, invoice numbers, ledger entries, recovery references, posted documents and historical price snapshots must remain unchanged.

## 1. Canonical business roles

| Canonical role | Legacy labels accepted during migration | Dashboard |
|---|---|---|
| SUPER_ADMIN | SUPER_ADMIN | Executive / system administration |
| TOP_MANAGEMENT | MANAGEMENT, MD_EXECUTIVE | Executive |
| NSM | NATIONAL_MANAGER, SALES_MANAGER | National |
| RSM | RSM | Regional |
| ZSM | ZSM | Zonal |
| SALES_OFFICER | TSM, ASM, SS, OB, ORDER_BOOKER, RECOVERY_OFFICER, FIELD_SALES_USER, SALES_RECOVERY | Territory / field sales |
| TRADE_PARTNER | DEALER, DISTRIBUTOR | One shared trade partner portal |
| ACCOUNTS | ACCOUNTS | Accounts and finance |
| WAREHOUSE | WAREHOUSE, WAREHOUSE_MANAGER | Warehouse |
| FACTORY | FACTORY, FACTORY_MANAGER | Factory / production |
| DISPATCH | DISPATCH, DISPATCH_OFFICER | Dispatch and logistics |
| HR_ADMIN | HR_ADMIN | HR and workforce |

Legacy labels remain accepted during migration. They must not create duplicate dashboard implementations.

Dealer and Distributor share the same dashboard, navigation and base permission policy. Their customer classification and data scope remain distinct: a dealer sees only its own account; a distributor sees its own account and only explicitly linked dealer accounts. Never infer linkage from town name alone.

TSM and Sales Officer are one business role and one dashboard. Preserve the person's designation as employee metadata, not as a separate access role.

## 2. Reporting hierarchy

Company / National
→ Region (RSM)
→ Zone (ZSM)
→ Territory and Town
→ Sales Officer (TSM)
→ Trade Partner (Dealer / Distributor)

The hierarchy is a reporting and access model. Department users such as Accounts, HR, Warehouse, Factory and Dispatch receive department-scoped access according to their assigned permissions. Department roles do not inherit sales hierarchy access unless explicitly granted.

## 3. Dashboard layout contract

Every dashboard must render these sections in this order:

1. Page title, role/department, date range and authorized scope.
2. Primary KPI cards, visible without scrolling on common desktop and mobile screens where practical.
3. Daily quick actions permitted for the current user.
4. Pending approvals / tasks and critical alerts.
5. Relevant charts and comparisons.
6. Hierarchy or department breakdown.
7. Recent transactions and drill-down records.

KPI cards must use real, verified records. Never use credit limits as a substitute for sales targets. A missing target must display “Not configured”, not a fabricated percentage. A missing or stale data source must be clearly identified.

## 4. Role KPI requirements

### Executive / Top Management / NSM
Today and MTD sales, today and MTD confirmed recovery, total and overdue outstanding, sales and recovery achievement, active trade partners, approvals, regional performance and business alerts.

### RSM
Region sales and recovery, target achievement, zone comparison, overdue exposure, active trade partners, territory ranking, pending approvals and officer productivity.

### ZSM
Zone sales and recovery, target achievement, territory/town ranking, officer activity, overdue accounts, dealer coverage and pending actions.

### TSM / Sales Officer
Today's and MTD sales, today's and MTD recovery, assigned targets, target achievement, attendance, visits, pending orders, assigned customer outstanding and quick order/recovery/visit actions.

### Dealer / Distributor
Own account balance, available credit, invoices due, payment history, order status, delivery status, approved price list and statements. Distributor views may include only explicitly linked dealers.

### Accounts
Invoices created/posted, confirmed and pending recovery verification, receivables, overdue aging, unallocated receipts, ledger exceptions and reconciliation tasks.

### Warehouse
Available, reserved and damaged stock, low-stock SKUs, pick/pack queue, orders awaiting dispatch, stock movements and inventory exceptions.

### Factory
Production plan versus actual, work in progress, finished goods, quality pass/reject, material shortages and downtime. Do not reuse warehouse KPIs as factory production KPIs.

### Dispatch
Orders awaiting dispatch, dispatched today, in-transit consignments, delivered orders, delivery proof pending, bilty/freight and delayed shipments.

### HR
Active headcount, present/absent/late, attendance exceptions, leave approvals, profile approvals and department staffing.

## 5. Management dashboard preview

Management, Super Admin and NSM may select a dashboard role and an allowed organizational scope to preview its layout and KPI configuration.

Preview is read-only. It must not:
- change the signed-in user's role or session;
- widen the signed-in user's server-side data scope;
- enable actions that the signed-in user cannot perform;
- allow the preview user to post invoices, approve recovery, alter ledgers or submit orders as another user.

Preview data must be either explicitly labelled simulation or fetched through the administrator's own authorized scope with the selected role used only for layout simulation. Never impersonate a user in the browser.

## 6. Responsive behaviour

Use one responsive dashboard component system across all screen sizes. Do not select a different department dashboard merely because the device is a phone.

- 320–389 px: one or two compact KPI columns as space allows; no page-level horizontal scrolling; fixed bottom navigation for field/trade roles.
- 390–599 px: two KPI columns; touch-friendly actions; compact filters and charts.
- 600–1023 px: two or three KPI columns; collapsible navigation; responsive panels.
- 1024–1439 px: desktop sidebar and multi-column analytics.
- 1440 px and above: full dashboard grid with tables, rankings and comparison panels.

All controls need accessible labels, keyboard focus, adequate touch targets, loading/empty/error states and safe overflow for long names and numbers. Tables must become card/list views or use a clearly bounded horizontal scroller on narrow screens.

## 7. Security and data rules

- Supabase Auth is the identity source. No local-password fallback or local session when authentication fails.
- Server-side authorization and Supabase RLS are mandatory. Hiding a button is not security.
- Dashboard scope must be derived from trusted user assignments, not request-supplied filters alone.
- RSM is locked to assigned region; ZSM to assigned zone; Sales Officer to assigned territory/towns and own activity; Dealer to own customer; Distributor to itself and explicitly linked dealers.
- Accounts, HR, Warehouse, Factory and Dispatch use department permissions and least privilege.
- Dashboard configuration may hide/reorder permitted KPIs and sections. It cannot grant data access or new transaction permissions.
- Financial KPI definitions must distinguish posted sales, confirmed recovery, credit notes, reversals, unallocated payments and overdue balances.
- Use Asia/Karachi business dates consistently and retain UTC timestamps.
- Never mark a sync successful until the destination confirms the write.

## 8. Migration and rollout

1. Capture the current main SHA and preserve it as rollback baseline.
2. Inventory every role, route, dashboard entry point, department page and permission check.
3. Add canonical role mapping while retaining legacy aliases.
4. Unify Dealer/Distributor dashboard presentation without merging their data scopes.
5. Unify TSM/Sales Officer presentation and permissions.
6. Add dedicated Factory dashboard metrics and screens.
7. Replace device-based dashboard switching with role/department-based routing plus responsive layout.
8. Add a safe management preview mode.
9. Connect KPI cards to authoritative Supabase-backed queries and documented formulas.
10. Add tests for hierarchy isolation, partner isolation, role aliases, preview safety and KPI formulas.
11. Run typecheck, unit tests, production build and responsive E2E tests.
12. Open a pull request. Do not merge or deploy until checks pass and production data/RLS are reviewed.

## 9. Required acceptance tests

- TSM and Sales Officer resolve to the same dashboard and permission policy.
- Dealer and Distributor resolve to the same dashboard configuration.
- A Dealer cannot view another Dealer's invoices, ledger, orders or recoveries.
- A Distributor sees only itself and explicitly linked dealer records.
- RSM cannot query another region; ZSM cannot query another zone; Sales Officer cannot query another territory.
- Department dashboards do not show unrelated sales-only KPI fallbacks.
- Factory has production KPIs and does not silently resolve to Warehouse.
- Management preview cannot elevate privileges or execute another role's actions.
- Every role can use its dashboard at 320, 375, 390, 768, 1024, 1366 and 1920 px widths.
- No page-level horizontal overflow at phone widths.
- KPI totals reconcile with the underlying source records for the same PKT date range.
- Existing invoice, ledger, recovery, order and customer records remain unchanged.

## 10. Current implementation note

The first code steps on this branch map Dealer and Distributor to the same dashboard key while preserving their separate data-scope enforcement, add regression tests for that mapping, and route small-screen users to the field/trade workspace only when their role requires it. Other departments stay in the responsive Head Office workspace on phones. The remaining work must follow the migration plan above. Do not treat these first steps as proof that all dashboards are complete or production-ready.
