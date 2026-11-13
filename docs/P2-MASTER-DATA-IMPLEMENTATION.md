# N-LINK 360 P2 Master Data Implementation Contract

## Goal
Build the real master-data layer that all later transactions depend on. No fake customer/SKU/user data may remain in completed modules.

## Masters

### Company
- company_id
- company_code
- legal_name
- display_name
- slogan
- logo_url
- website
- email
- phone
- address
- city
- province
- country
- tax_registration
- social_facebook
- social_instagram
- social_linkedin
- social_youtube
- status

Initial display name: National Lights.
Unverified website/contact/social details must remain editable and must not be invented.

### Factory
- factory_id
- factory_code
- name
- address
- contact
- incharge_employee_id
- status

### Warehouse
- warehouse_id
- warehouse_code
- name
- type
- factory_id
- address
- responsible_employee_id
- status

### Employee
- employee_id
- employee_code
- full_name
- mobile
- email
- department
- designation
- role_id
- factory_id
- warehouse_id
- joining_date
- status

### Customer
Customer type must be exactly Distributor or Dealer.

- customer_id
- customer_code
- customer_type
- legal_name
- display_name
- contact_person
- mobile
- alternate_mobile
- email
- address
- city
- area
- credit_limit
- credit_days
- opening_balance
- assigned_sales_employee_id
- status

### Brand
- brand_id
- brand_code
- name
- description
- status

### Product
- product_id
- product_code
- brand_id
- category
- product_name
- description
- status

### SKU
- sku_id
- sku_code
- barcode
- brand_id
- product_id
- sku_name
- model
- wattage
- unit
- units_per_carton
- cost_price
- trade_price
- dealer_price
- tax_rate
- reorder_level
- status

## ID Standard

Use database UUID primary keys plus human-friendly unique IDs:

CMP001, FAC001, WH001, EMP001, DST001, DLR001, BRD001, PRD001, SKU001.

The server/database must generate IDs. The client must never invent the next number.

## CRUD Rules

- Create
- View
- Search
- Filter
- Edit
- Activate/deactivate
- Audit history

Do not hard-delete master records that have transaction history. Deactivate them instead.

## UX Rules

- Mobile-first
- Search before long dropdowns
- Use autocomplete for customer and SKU selection
- Show simple business ID beside names
- Clear validation errors
- Loading, empty and error states
- Confirmation before status changes
- Keyboard-friendly desktop forms
- Touch-friendly mobile controls

## Customer Assignment

A Distributor/Dealer can be assigned to a Sales/Recovery employee. The sales employee sees only assigned customers unless their permissions allow broader access.

## SKU Availability

SKU master stores configuration and pricing. It does not store an editable 'available quantity' field. Available stock must be derived from inventory transactions/balances.

## Branding

Company Settings must support logo upload, replace, preview, remove and fallback. Company information must feed invoice and report templates.

## Completion Gate

P2 is complete only when these masters persist to PostgreSQL/Supabase, have RLS/permission protection, server-side validation, unique simple IDs, audit logging and responsive UI.