# SalesPulse Reference Integration

SalesPulse is a reference source for UX and sales-operating ideas. Do not copy its hard-coded/demo data, credentials, or architecture into N-LINK 360. Rebuild useful patterns against N-LINK 360's real Supabase/RBAC model.

## Approved ideas to carry forward

### 1. Ordering workspace
SalesPulse's ordering experience supports category-first entry, expandable category sections, compact SKU input, units-per-carton visibility, distributor-aware filtering, keyboard-friendly entry and a focus mode. fileciteturn118file0

N-LINK 360 adaptation:
- Keep the simple customer-first order flow already defined.
- Keep the compact SKU grid.
- Add expandable SKU technical/pricing detail.
- Add quick-entry focus mode.
- Add keyboard navigation on desktop.
- Use server-authoritative SKU/customer/stock/pricing data.
- Never copy SalesPulse's local storage or hard-coded datasets.

### 2. Next-visit intelligence
SalesPulse surfaces route history, visited/productive shops, productivity index and suggested booking focus. fileciteturn118file0

N-LINK 360 adaptation:
- Show recent customer visits and order/recovery history inside Customer 360.
- Provide simple next-visit hints only when enough real data exists.
- Clearly label predictive/recommended information.
- Never invent a recommendation when there is insufficient history.

### 3. Hierarchical filters
SalesPulse has cascading Month → NSM → RSM → SC → TSM → Town → OB → Route filtering with role-based hierarchy restriction. fileciteturn120file0

N-LINK 360 adaptation:
- Use permission-aware cascading filters across management reports.
- Never allow a user to bypass server-side scope restrictions by changing frontend filters.
- Support Company → Factory → Warehouse → Sales/Recovery → Customer where relevant.

### 4. Executive reporting
SalesPulse includes monthly KPI matrices, brand/category views, active/inactive field force, rankings, drilldowns and trend views. fileciteturn121file0

N-LINK 360 adaptation:
- Build management dashboards around real N-LINK transactions.
- KPIs: orders, invoices, sales value, recovery, outstanding, inventory, dispatch, returns, damage, customer coverage.
- Support month-over-month and year-over-year trends where data permits.
- Drill from management → employee → customer → transaction.

### 5. Reports
SalesPulse has report tabs, product filters, hierarchy drilldown, audit views and export/print affordances. fileciteturn119file0

N-LINK 360 adaptation:
- Add shared report filters and drilldowns.
- Provide print, PDF, Excel and CSV from the common export engine.
- Add audit exception reports for stock, credit, recovery and dispatch.

## Ideas explicitly NOT to copy

- Hard-coded user emails/roles.
- LocalStorage as the source of truth.
- Demo/fallback numbers in production.
- Estimated primary/closing values.
- Client-only RBAC.
- Static SKU/customer arrays as production data.
- Any private credentials, tokens or unrelated business data.

## N-LINK 360 design rule

SalesPulse can influence interaction design and useful sales intelligence. N-LINK 360 remains the system of record for National Lights with PostgreSQL/Supabase, server-side permissions, atomic financial/inventory transactions and complete audit history.
