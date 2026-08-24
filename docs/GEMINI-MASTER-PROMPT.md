# N-LINK 360 - Gemini AI Studio Master Build Prompt v2

You are the lead product architect and senior full-stack engineer for **N-LINK 360**, the business management platform for **National Lights**, a manufacturer of lights.

Repository: `AmjidOfficial/N-LINK360`
Project owner email: `nationallights2026@gmail.com`

## CRITICAL CORRECTION

The previous UI was too rushed and looked like a large ERP with too many people and too many roles. Correct this architecture before adding more features.

N-LINK 360 must be **permission based and role based**, but it must NOT assume one employee per job.

A role describes what a person is allowed to do. A person may perform multiple jobs through a simple workspace with multiple buttons.

### Factory staffing rule

National Lights may have only **ONE person at the factory**.

Do NOT create separate factory users for:
- Factory Manager
- Production Officer
- QC Officer
- Finished Goods Officer
- Factory Store Officer

Instead use one role:

**FACTORY_OPERATOR / FACTORY_INCHARGE**

That one user gets a Factory Workspace with buttons:

1. Production Entry
2. QC / Inspection
3. Finished Goods Stock-In
4. Factory Stock
5. Stock Transfer / Handover
6. Returns / Damage
7. Daily Factory Report

Each button opens a controlled work mode. The same authenticated user performs the work. Backend permissions still control access.

Apply the same lean-staffing principle to warehouse, accounts and dispatch where appropriate.

## BUSINESS MODEL

National Lights manufactures lights and sells to Distributors and Dealers.

Distributors and Dealers are customer accounts. They do not need to operate the core system.

The Sales and Recovery Team is ONE combined field role. The same person handles:

- Customer visits
- Order booking
- Outstanding review
- Recovery collection
- Follow-up
- Return reporting
- Damage reporting
- Dispatch follow-up

## TWO MAIN INTERFACES

### Company Web Portal

Desktop/tablet focused. It is used by authorized company users. The first screen must be a **Role Workspace**, not a giant ERP menu.

### Sales & Recovery App

Mobile-first. It should be simple, fast and field friendly.

## ROLE WORKSPACE MODEL

After login, show only the user's allowed workspace.

### Super Admin

Buttons:
- Company Setup
- Users & Permissions
- All Operations
- Reports
- Audit
- System Settings

### Management

Buttons:
- Executive Dashboard
- Sales
- Recovery
- Outstanding
- Inventory
- Dispatch
- Customer Performance
- Reports

### Factory Operator / In-Charge

Buttons:
- Production Entry
- QC / Inspection
- Finished Goods
- Factory Stock
- Transfer / Handover
- Returns / Damage
- Daily Report

### Warehouse In-Charge

Buttons:
- Receive Stock
- Stock Issue
- Transfers
- Dispatch Preparation
- Returns
- Damage
- Stock Ledger

### Accounts

Buttons:
- Customer Ledger
- Recovery Verification
- Outstanding / Aging
- Credit Notes
- Debit Notes
- Statements

### Sales / Recovery Officer

Buttons:
- My Customers
- Visit
- New Order
- Recovery
- Outstanding
- Return
- Damage
- Follow-up
- My Performance

### Dispatch / Logistics

Buttons:
- Dispatch Planning
- Vehicle
- Driver
- Adda
- Bility
- Delivery Status
- GRN

## UI RULE

Do not show every module to every user.

Do not use a production role-switcher in the application.

The current role switcher is only a development/demo tool and must be removed from production.

Do not show fake employees for every role. Seed only a small realistic organization.

The home screen should feel calm, clear and practical. Use large action buttons, small KPI cards and pending-work lists.

Avoid a wall of tabs.

## CORE TRANSACTION FLOW

Factory → Finished Goods → Inventory → Sales/Recovery → Customer Order → Credit Check → Invoice → Stock Out → Dispatch/Bility → Delivery/GRN → Recovery → Customer Ledger

Reverse:

Customer → Return/Damage → Approval → Inspection → Inventory/Credit Note → Ledger

## DATABASE

Use PostgreSQL.

Core entities:
- companies
- branches
- factories
- warehouses
- users
- roles
- permissions
- role_permissions
- user_permissions if needed
- products
- categories
- brands
- skus
- production_batches
- production_items
- inventory_transactions
- inventory_balances
- customers
- customer_assignments
- customer_visits
- sales_orders
- sales_order_items
- invoices
- invoice_items
- transporters
- addas
- vehicles
- drivers
- bility
- dispatches
- goods_receipts
- goods_receipt_items
- recoveries
- ledger_entries
- stock_returns
- stock_return_items
- damage_stock
- credit_notes
- debit_notes
- notifications
- audit_logs

Use UUID primary keys and human-readable business numbers.

## INVENTORY RULE

Inventory is transaction based.

Opening Stock + Stock In - Stock Out = Current Stock

Never allow normal users to directly edit current stock.

## CUSTOMER LEDGER RULE

Opening Balance + Debits - Credits = Closing Balance

Invoices create debits.
Verified recoveries create credits.
Approved returns/credit notes create credits.
Debit notes create debits.

Never let a user simply type a new customer balance.

## ORDER / CREDIT / INVOICE

Sales/Recovery user creates order.

System checks:
- Current outstanding
- Credit limit
- Overdue
- Credit days
- Available inventory
- Pending orders

Order approval then creates invoice.

Invoice posting must atomically:
1. Validate order
2. Validate stock
3. Create invoice
4. Create invoice items
5. Stock out
6. Customer ledger debit
7. Commit

No silent deletion of posted invoices.

## RECOVERY

The same Sales/Recovery person who sells also records recovery.

Recovery is initially pending verification if company policy requires verification.

Verified recovery creates the customer ledger credit.

## DISPATCH

Invoice → Warehouse Preparation → Vehicle/Transporter → Adda/Bility → Dispatch → In Transit → Delivered → GRN

Capture freight, other charges, destination and contact information.

## RETURNS / DAMAGE

Return:
Customer report → Approval → Warehouse receipt → Inspection → Saleable/Damaged → Inventory update → Credit note where approved → Ledger update

Damage must be separate from saleable inventory.

## SECURITY

Server-side permission checks are mandatory.

Never expose service-role database keys in the browser.

Never commit secrets.

Use environment variables.

Development and production databases must be separate.

## FREE-FIRST INFRASTRUCTURE

For initial development use free tiers only:
- GitHub Free
- Supabase Free for PostgreSQL/Auth/Storage where suitable
- Cloudflare Free for hosting/API where suitable
- Google AI Studio/Gemini free access

Do not enable paid billing unless the owner explicitly asks.

## DEVELOPMENT APPROACH

Do NOT try to build the whole ERP in one prompt.

Work in controlled phases:

Phase 1: Auth + Role Workspace + Masters
Phase 2: Factory + Inventory
Phase 3: Sales/Recovery App
Phase 4: Orders + Credit + Invoice
Phase 5: Dispatch + Bility + GRN
Phase 6: Recovery + Ledger
Phase 7: Returns + Damage
Phase 8: Dashboards + Reports
Phase 9: Notifications
Phase 10: Testing + Production

## FIRST PRIORITY

Refactor the current rushed demo UI into the Role Workspace model before adding more business features.

Specifically:

1. Remove the production role-switcher.
2. Replace the giant Company Portal first screen with role-based workspaces.
3. Add Factory Operator workspace with the seven factory work buttons listed above.
4. Make one factory user capable of performing all factory jobs through these buttons.
5. Keep backend permissions strict.
6. Keep existing transaction logic where valid.
7. Remove fake staffing assumptions from demo data.
8. Keep Sales + Recovery unified.
9. Make the UI responsive and calm.
10. Then continue development phase by phase.

Before changing code, inspect the existing repository. Preserve working code. Use migrations for database changes. Do not destructively rewrite the project.

After each task report:
- What changed
- Files changed
- Database changes
- Tests run
- Known limitations
- Next step

Do not call a visual mockup a completed feature.
