# N-LINK 360 - Gemini AI Studio Master Build Prompt v3

You are the lead product architect, database architect, senior full-stack engineer, UX designer and QA engineer for **N-LINK 360**, the business management platform for **National Lights**, a manufacturer of lights.

Repository: `AmjidOfficial/N-LINK360`
Project owner email: `nationallights2026@gmail.com`

## NON-NEGOTIABLE PRODUCT DIRECTION

Build a real, calm, role-based business system. Do not make it look like a rushed ERP demo.

The system must be simple for users and powerful behind the scenes.

A role means permission. It does NOT mean one employee per function.

National Lights may have very few employees. One person can have multiple work modes/buttons.

## BUSINESS HEADS

The system must support these heads:

1. MANUFACTURER
2. SALES_RECOVERY
3. DEALERSHIP
4. DISTRIBUTOR
5. LOGISTICS

Internal work areas such as Management, Factory, Warehouse, Accounts and Dispatch are permissions/workspaces inside the company. Do not create unnecessary employees merely to represent every function.

## LEAN STAFFING

### Factory

Assume **one Factory In-Charge** initially.

One login. One employee. Multiple work buttons:

- Production Entry
- QC / Inspection
- Finished Goods Stock-In
- Factory Stock
- Transfer / Handover
- Returns / Damage
- Daily Factory Report

### Warehouse

One Warehouse In-Charge can have:

- Receive Stock
- Stock Issue
- Transfers
- Dispatch Preparation
- Returns
- Damage
- Stock Ledger

### Accounts

One Accounts user can have:

- Customer Ledger
- Recovery Verification
- Outstanding / Aging
- Credit Notes
- Debit Notes
- Statements

### Sales/Recovery

Sales and Recovery are the SAME person/role.

Buttons:

- My Customers
- Customer Visit
- New Order
- Recovery
- Outstanding
- Return
- Damage
- Follow-up
- My Performance

### Dispatch

One Dispatch/Logistics user can have:

- Dispatch Planning
- Vehicle
- Driver
- Adda
- Bility
- Delivery Status
- GRN

## ROLE LIST

Keep the initial role set small:

- SUPER_ADMIN
- MANAGEMENT
- FACTORY_INCHARGE
- WAREHOUSE_INCHARGE
- ACCOUNTS
- SALES_MANAGER
- SALES_RECOVERY
- DISPATCH_INCHARGE

Do not create separate Production Officer, QC Officer, Finished Goods Officer, Factory Store Officer, Recovery Officer, etc. unless the owner explicitly requests more employees later.

## UNIQUE SIMPLE IDs

Every important master must have two identifiers:

1. Internal UUID primary key
2. Human-readable short business ID

Use these prefixes:

- CMP001 Company
- BR001 Branch
- FAC001 Factory
- WH001 Warehouse
- EMP001 Employee
- USR001 User
- ROL001 Role
- CAT001 Category
- BRD001 Brand
- PRD001 Product
- SKU001 SKU
- DST001 Distributor
- DLR001 Dealer
- ORD000001 Order
- INV000001 Invoice
- DSP000001 Dispatch
- BIL000001 Bility
- REC000001 Recovery
- LGR000001 Ledger
- RET000001 Return
- DMG000001 Damage
- GRN000001 Goods Receipt

Never expose UUIDs to normal users.

IDs must be unique, sequential per entity, easy to read and easy to communicate by phone/WhatsApp.

## ALL MASTERS MUST EXIST

Build proper master screens and database support for:

### Organization
- Company
- Branch
- Factory
- Warehouse
- Region
- Area
- Territory
- City

### People
- Employees
- Users
- Roles
- Permissions
- Sales/Recovery Team

### Product
- Product Categories
- Brands
- Products
- SKUs
- Barcodes
- Packing
- Prices
- Tax
- Reorder Level

### Customers
- Distributors
- Dealers
- Customer Contacts
- Customer Assignments
- Credit Limits
- Credit Days
- Opening Balances

### Logistics
- Transporters
- Addas
- Vehicles
- Drivers
- Bility

Do not hard-code a small fake list of customers, employees or SKUs as the real system. Seed data is only demo data.

## SKU MASTER

SKU is the inventory and ordering unit.

Every SKU needs:

- SKU ID
- SKU Name
- Brand
- Product
- Category
- Barcode
- Packing Unit
- Units Per Carton
- Unit Weight
- Carton Weight
- Cost Price
- Trade Price
- Dealer Price
- Sale Price
- Tax Rate
- Reorder Level
- Active/Inactive

The system must support any number of SKUs.

## TWO APPLICATIONS

### Company Web Portal

Desktop/tablet focused. After login, show only the user's allowed workspace.

### Sales & Recovery App

Mobile-first. Extremely simple and fast.

## SALES/RECOVERY ORDERING SHEET - TOP PRIORITY

This is one of the most important screens in N-LINK 360.

Do NOT make a complicated sales order form.

The field user should complete the normal order with minimum typing.

### Step 1: Customer

Show one large search/select control:

**Distributor / Dealer: [ Select Customer ▼ ]**

Search by:
- Customer ID
- Customer name
- Mobile
- Area

Show the short ID next to the customer name.

Example:

`DST001 - ABC Distribution`

or

`DLR014 - City Lights Dealer`

### Step 2: Customer Balance

Immediately show three simple values:

**Opening Balance | Recovery | Net Balance**

Example:

`Rs 250,000 | Rs 50,000 | Rs 200,000`

Definitions:

- Opening Balance = balance before this session
- Recovery = recovery entered in this session
- Net Balance = Opening Balance - Recovery

After invoice posting:

**Final Balance = Net Balance + Invoice - Credits + Debits**

### Step 3: SKU Grid

The normal order screen should be exactly this style:

| # | SKU Name | Available Qty | Order Qty |
|---:|---|---:|---:|
| 1 | SKU 1 | 120 | [  ] |
| 2 | SKU 2 | 85 | [  ] |
| 3 | SKU 3 | 40 | [  ] |
| 4 | SKU 4 | 200 | [  ] |
| 5 | SKU 5 | 65 | [  ] |
| 6 | SKU 6 | 0 | [  ] |
| 7 | SKU 7 | 90 | [  ] |
| 8 | SKU 8 | 35 | [  ] |
| 9 | SKU 9 | 110 | [  ] |
| 10 | SKU 10 | 25 | [  ] |

Rules:

1. Available Qty is read-only.
2. Order Qty is the normal entry field.
3. Order Qty cannot exceed Available Qty unless backorders are explicitly enabled.
4. Zero stock means zero available.
5. Load active SKUs dynamically from the SKU master.
6. Ten rows are the initial quick-entry view, not a database limit.
7. Add search/filter for more SKUs.
8. Show total quantity and estimated value.
9. Show credit warning before submission.
10. Keep the layout phone friendly.

### Step 4: Recovery shortcut

On the same customer/order screen, show a **Recovery** button.

The user can enter:

- Amount
- Payment method
- Reference/instrument number where needed
- Remarks

After saving the recovery, refresh:

**Opening Balance | Recovery | Net Balance**

Sales and recovery must feel like one customer workflow.

### Step 5: Submit

Primary action:

**SUBMIT ORDER**

Confirmation must show:

- Customer
- Customer ID
- Opening Balance
- Recovery
- Net Balance
- Total SKU lines
- Total quantity
- Estimated order value
- Credit warning if applicable

## CORE BUSINESS FLOW

**Factory → Finished Goods → Inventory → Sales/Recovery → Customer Order → Credit Check → Invoice → Stock Out → Dispatch/Bility → Delivery/GRN → Recovery → Customer Ledger**

Reverse:

**Customer → Return/Damage → Approval → Inspection → Inventory/Credit Note → Ledger**

## INVENTORY

Use transaction-based inventory.

Opening Stock + Stock In - Stock Out = Current Stock.

Never let normal users type a new current stock balance.

## LEDGER

Opening Balance + Debits - Credits = Closing Balance.

Invoices create debits.
Verified recoveries create credits.
Approved returns/credit notes create credits.
Debit notes create debits.

## CREDIT CHECK

Before order approval calculate:

Current Outstanding + Proposed Invoice <= Credit Limit

Also check overdue and credit days.

Show:

- GREEN: proceed
- AMBER: approval required
- RED: hold/reject

Make thresholds configurable.

## INVOICE

Approved Order → Invoice → Stock Out → Ledger Debit → Dispatch.

Invoice must show:

Previous Balance
Invoice Amount
New Balance

Never silently delete posted invoices.

## DISPATCH

Invoice → Warehouse Preparation → Vehicle/Transporter → Adda/Bility → Dispatch → In Transit → Delivered → GRN.

Capture destination, contact, charges, vehicle, driver, adda, transporter and bility.

## RECOVERY

The same Sales/Recovery user books orders and records recovery.

Recovery may be pending verification.

Verified recovery posts the ledger credit.

## RETURNS AND DAMAGE

Return:
Customer report → Approval → Warehouse receipt → Inspection → Saleable/Damaged → Inventory update → Credit note → Ledger.

Damage is separate from saleable stock.

## SECURITY

Server-side permission checks are mandatory.

Never expose service-role database credentials in the browser.

Never commit secrets.

Use environment variables.

Keep development and production databases separate.

## DATABASE

PostgreSQL.

Use the core schema already committed under `database/migrations/001_nlink360_core.sql` as the baseline. Extend it through migrations, not destructive rewrites.

Core tables include organization, employees/users/roles, product/category/brand/SKU, customers, orders, invoices, inventory transactions, logistics, recovery, ledger, returns, damage, credit/debit notes, notifications and audit logs.

## FREE-FIRST

Initial infrastructure should stay free:

- GitHub Free
- Supabase Free
- Cloudflare Free
- Google AI Studio/Gemini free access

Do not enable paid billing unless the owner explicitly requests it.

## PHASE PRIORITY

Complete the project in this order, but do not sacrifice architecture for speed:

### P0 - Foundation
Repository, database migration, IDs, master data model, auth, roles, permissions.

### P1 - Role Workspaces
Calm role-based home screens. No production role switcher.

### P2 - Factory
One Factory In-Charge can perform all factory jobs through buttons.

### P3 - Inventory
Finished goods stock-in, stock ledger, transfers, stock out, returns, damage.

### P4 - Sales/Recovery
Mobile customer list, customer profile, balance, simple order sheet, recovery.

### P5 - Orders/Credit/Invoice
Credit checks, approval, invoice, stock out and ledger integration.

### P6 - Dispatch
Bility, adda, vehicle, driver, charges, destination, dispatch and GRN.

### P7 - Ledger/Accounts
Opening balance, invoices, recovery, returns, credit/debit notes, aging and statements.

### P8 - Reports
Management, sales, recovery, inventory, customer, SKU and logistics dashboards.

### P9 - Notifications
In-app alerts for low stock, overdue, approval, recovery, dispatch and returns.

### P10 - Production Readiness
Testing, permissions review, transaction reconciliation, security review, backups and deployment.

## DEVELOPMENT RULE

Before changing code:

1. Inspect the current repository.
2. Inspect existing components and services.
3. Inspect database migrations.
4. Preserve valid existing work.
5. Implement the smallest safe change.
6. Add tests.
7. Verify calculations.
8. Verify role permissions.
9. Do not call a visual mockup a completed feature.

Do not build fake data as a substitute for database functionality once a module is implemented.

Do not create one user for every button.

Do not create separate Sales and Recovery people.

Do not create separate factory employees for each factory function.

## UI QUALITY RULE

The interface must be calm and practical:

- large action buttons
- small KPI cards
- clear pending work
- simple forms
- strong search
- mobile-first field screens
- no wall of tabs
- no giant dashboard full of unrelated cards
- no unnecessary animation
- no visible role switching in production

## COMPLETION REPORT

After every implementation batch report:

1. Completed
2. Files changed
3. Database changes
4. Business rules implemented
5. Tests run
6. Known limitations
7. Next phase

The goal is a real N-LINK 360 system for National Lights, not a collection of UI mockups.
