# N-LINK 360 Next Build Checklist

## Build now
1. Replace prototype role switching with authenticated user workspace routing.
2. Implement role/permission guards.
3. Implement responsive workspace shell using CSS Grid/Flexbox and media queries.
4. Implement Employee, Distributor, Dealer, Brand, Product and SKU masters with simple IDs.
5. Implement company branding settings and logo upload/replace/remove architecture.
6. Connect master-data screens to PostgreSQL/Supabase repositories.
7. Add validation, loading, empty, error and success states.
8. Add audit logging for master-data changes.

## Then transaction engine
9. Factory production entry.
10. QC and finished-goods stock-in.
11. Inventory transaction ledger and available-stock calculation.
12. Sales/Recovery customer selection and balance summary.
13. Ten-row quick SKU ordering sheet plus searchable expansion.
14. Order approval and credit check.
15. Invoice posting with atomic stock-out and customer ledger debit.
16. Invoice print preview and PDF/print export.
17. Dispatch, vehicle, adda, bility and GRN.
18. Recovery posting and verification.
19. Customer statement and aging.
20. Returns and damage.

## Quality gates
- No fake in-memory data for completed modules.
- No client-only permission enforcement.
- No destructive deletion of posted transactions.
- No fixed desktop-only layouts.
- No role switcher in production UI.
- No separate employee required for every work mode.
- All important financial/inventory operations are auditable.
- Every major report can print and export using the shared document engine.
