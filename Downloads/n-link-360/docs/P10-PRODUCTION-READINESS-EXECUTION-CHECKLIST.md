# N-LINK 360 P10 Production Readiness Execution Checklist

## Purpose
This is the final engineering gate before calling N-LINK 360 production-ready. A documented feature is not considered implemented until the UI, database, permissions, transactions and tests are connected.

## 1. Source of Truth

Production paths must not import `inMemoryStore` or rely on localStorage for business records.

Allowed local storage:
- non-sensitive UI preferences
- temporary draft UI state where explicitly designed

Not allowed:
- customers
- employees
- SKUs
- stock balances
- orders
- invoices
- recoveries
- ledger
- dispatches
- visits

## 2. Database

Required persisted domains:
- company settings
- roles/permissions
- employees
- factories
- warehouses
- customers
- brands/products/SKUs
- production/QC
- inventory transactions/balances
- visits
- sales orders/order lines
- invoices/invoice lines
- dispatch/Bility/GRN
- recovery/ledger
- returns/damage/claims
- audit events

## 3. Transaction Safety

Stock and financial posting must use database transactions.

Invoice posting:
order approval → stock lock/recheck → invoice → inventory OUT → ledger DEBIT → order update.

Recovery posting:
recovery validation → idempotency check → ledger CREDIT.

Return posting:
receipt → inspection → saleable/damage transaction → credit/claim where approved.

## 4. Authorization

Permissions are enforced server-side/RLS, not only by hiding buttons.

Scope examples:
- Sales/Recovery: assigned customers by default
- Factory In-Charge: assigned factory/warehouse operations
- Finance: ledger/recovery/invoice permissions
- Dispatch: dispatch/Bility/GRN permissions
- Management: permitted aggregate/report scope
- Admin: master/configuration permissions

## 5. Demo Data Removal

Remove hard-coded production fallbacks, sample KPIs, fake GPS, static customer/SKU arrays and demo balances from production paths.

Development seed data must be clearly isolated from production.

## 6. UI

All screens must follow the responsive design system:
- mobile-first
- Grid for page composition
- Flexbox for controls/rows
- media queries
- no accidental horizontal scrolling
- 44px touch targets where practical
- accessible forms
- keyboard support
- reduced-motion support

## 7. Reports / Exports

Every report should support the formats appropriate to its data:
- Print
- PDF
- Excel
- CSV

Exports must use filtered server-authoritative data and include generated date/time and scope where useful.

## 8. Invoice / Document Controls

Posted documents:
- unique number
- company branding
- customer details
- transaction totals
- previous/new balance where applicable
- print preview
- browser print
- PDF

Posted financial documents are immutable except through controlled reversal/credit/debit workflows.

## 9. Security

- Never expose Supabase service-role keys in frontend code.
- Validate all user input server-side.
- Apply RLS to tenant/company and role scope.
- Avoid logging passwords, tokens or sensitive payment data.
- Audit privileged actions.
- Review storage policies for logo/attachments.

## 10. Verification Matrix

Test at minimum:
- 320×568
- 360×800
- 390×844
- 412×915
- 768×1024
- 1024×768
- 1280×800
- 1440×900
- 1920×1080

Functional E2E flows:
1. Login → correct workspace
2. Create employee/customer/SKU
3. Production → QC → stock in
4. Sales/Recovery visit → order
5. Credit check → invoice
6. Invoice → stock out → ledger debit
7. Dispatch → Bility → delivery/GRN
8. Recovery → verification → ledger credit
9. Customer 360 → visit history → statement
10. Return → inspection → saleable/damage
11. Reports → filters → print/PDF/Excel/CSV
12. Logout → session revoked

## Final Definition of Done

N-LINK 360 is production-ready only when all twelve flows pass against a real test database, permissions are verified with multiple roles, no production module depends on `inMemoryStore`, TypeScript/build/lint checks pass, and critical inventory/financial transactions are covered by automated tests.
