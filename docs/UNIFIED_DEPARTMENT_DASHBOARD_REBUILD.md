# N-LINK-360 Unified Department Dashboard Rebuild

## Status

This is a controlled migration foundation on branch `feat/unified-role-dashboard-rebuild`.
It does not replace the current dashboard or change production records.

## Official role model

| Canonical role | Legacy login/designation aliases | Default scope |
|---|---|---|
| SUPER_ADMIN | ADMIN | COMPANY |
| TOP_MANAGEMENT | MANAGEMENT, MD, MD_EXECUTIVE | COMPANY |
| NSM | NATIONAL_MANAGER | NATIONAL |
| RSM | REGIONAL_MANAGER | REGION |
| ZSM | ZONAL_MANAGER | ZONE |
| SALES_OFFICER | TSM, ASM, SS, OB, SALES_RECOVERY, FIELD_SALES_USER | TERRITORY |
| TRADE_PARTNER | DEALER, DISTRIBUTOR | ASSIGNED_CUSTOMERS |
| ACCOUNTS | FINANCE | DEPARTMENT |
| WAREHOUSE | WAREHOUSE_MANAGER | DEPARTMENT |
| FACTORY | FACTORY_MANAGER | DEPARTMENT |
| DISPATCH | DISPATCH_OFFICER | DEPARTMENT |
| HR | HR_ADMIN | DEPARTMENT |

Dealer and Distributor become one login/portal role. Their business type remains a customer attribute and is not rewritten.
TSM and Sales Officer become one canonical login/permission group. Their display designation may remain TSM or Sales Officer.

## Dashboard standards

Every department dashboard must render, in order:

1. Page title, selected period, last successful data refresh and scope label.
2. Department's primary KPI cards.
3. High-priority pending actions and alerts.
4. Primary daily actions.
5. Trends and performance charts.
6. Scoped drill-down tables and recent activity.

KPI cards must show a verified value, a loading state, an unavailable state, or a true zero. Never substitute credit limits, sample values, cached unrelated metrics or placeholder calculations for sales targets or actual activity.

## Department dashboard ownership

- Executive: national sales, recovery, outstanding, overdue, approvals, partner coverage and cross-department exceptions.
- Sales: sales, recovery, targets, outstanding, overdue, visits, attendance and partner coverage.
- Trade partner: own account balance, credit availability, invoices, order status, catalogue and statements.
- Finance: receivables, overdue aging, unallocated receipts, recovery verification, invoice posting and ledger reconciliation.
- Warehouse: on-hand, reserved, damaged, low stock, packing queue and stock movements.
- Manufacturing: planned/actual output, work in progress, quality rejection, material shortages and finished goods.
- Logistics: dispatch queue, dispatched, in transit, delivered, delayed and proof of delivery.
- HR: headcount, attendance, late arrivals, leave and employee requests.

## Management dashboard preview

Preview is a read-only UI simulation. It must not switch the authenticated user, role, session, data access or RLS claims. A preview may only use records the signed-in user is already authorised to read. Hide or disable all write actions during preview. Server endpoints must independently enforce permissions; hiding a button is not security.

## Responsive design contract

- 320–389px: one-column content, two compact KPI cards only when each remains readable, bottom navigation and large touch targets.
- 390–599px: two-column KPI grid, compact charts and bottom navigation.
- 600–1023px: tablet layout, two or three KPI columns and collapsible navigation.
- 1024–1439px: desktop sidebar, four KPI columns and analytical panels.
- 1440px+: wider tables and multi-panel analytical layout with a readable max-width.
- No page-level horizontal overflow at any supported width.
- Same role, scope, metrics and actions on every device; only layout changes.
- Use accessible labels, keyboard focus, contrast and reduced-motion support.

## Data and security invariants

- Supabase and its row-level security are authoritative for identity, permissions and business records.
- Google Sheets is an integration/mirror, not a second competing source of truth.
- Never infer user scope from a requested filter. Derive it from the authenticated server-side identity and assignments.
- Apply scope to every dataset: customers, orders, invoices, recoveries, ledger, visits, targets, attendance, stock and dispatch.
- A selected region/zone/territory must be a subset of the actor's assigned scope.
- Never merge Dealer and Distributor customer data or change customer IDs while consolidating their login role.
- Never change posted invoice, recovery or ledger history as part of dashboard work.
- Sales targets come from approved target records or explicit employee target fields, never customer credit limits.
- Recovery KPIs include only confirmed/posted recovery according to the accounting rules.
- Use Asia/Karachi business dates for daily and MTD reporting. Store timestamps consistently and convert only for display/range calculation.

## Migration plan

1. Inventory all role aliases, departments, route guards, menu builders, mobile/desktop shells, API handlers and RLS policies.
2. Add the canonical role adapter and tests. Keep persisted legacy roles intact during the transition.
3. Migrate permission groups and server checks. Add explicit tests for every alias and scope boundary.
4. Consolidate Dealer and Distributor portal presentation while preserving customer type.
5. Consolidate TSM and Sales Officer presentation while preserving designation.
6. Replace device-based experience switching with one responsive, role/department-based dashboard shell.
7. Implement each department dashboard using the blueprint registry and real domain queries.
8. Add read-only management preview with server-side scope enforcement.
9. Verify every dashboard KPI against source transactions and accounting rules.
10. Run unit, integration, RLS, build and Playwright viewport tests before merging.

## Acceptance gates

- All canonical roles and legacy aliases resolve deterministically.
- Unknown roles receive no dashboard and no permissions by default.
- Management preview cannot mutate data or widen data scope.
- Each department sees only its own authorised modules and records.
- Sales Officer sees only assigned territory/team/customer data.
- Dealer/Distributor sees only its own trade account and permitted linked records.
- All department KPIs have documented formulas, source tables and refresh behaviour.
- No false zero: unavailable data is visibly different from a real zero.
- 320px to 1920px screens have no horizontal page overflow.
- Mobile primary actions are reachable without navigating desktop-only menus.
- Existing invoice, ledger, recovery, customer, stock and attendance workflows pass regression tests.
- No migration deletes or rewrites production records.

## Current limitations

The new canonical model and department blueprint are groundwork, not yet wired into the live application shell. Existing role/scope code and UI routes must be migrated in controlled, reviewed steps. Do not describe this branch as production-ready until build, tests, RLS checks and device tests pass.
