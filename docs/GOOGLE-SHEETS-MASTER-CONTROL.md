# N-LINK 360 Google Sheets Master Control

Google Sheets is the business master-data control plane for these four domains:

1. Users
2. Team / Employees
3. Dealers and Distributors
4. Products / SKUs

Supabase remains the transactional system of record for orders, invoices, ledger, recoveries, inventory movements and audit history.

## Master tabs

Use these tabs in the existing National Lights spreadsheet:

- `Users`
- `Team`
- `Dealers`
- `Products`

Operational mirror tabs remain:

- `Customers`
- `Sales_Orders`
- `Recoveries`
- `Inventory_Stock`
- `Invoices`
- `Visits`

## Control rule

Do not edit invoice, ledger, recovery or stock transaction totals directly in Google Sheets. Those values are mirrored from Supabase.

Master data can be maintained in Sheets and pushed into N-LINK 360 through the protected Edge Function.

## Required columns

### Users

`userCode | email | fullName | status | authUserId`

### Team

`employeeCode | fullName | role | email | phone | region | territory | department | status`

### Dealers

`customerCode | companyName | contactPerson | phone | type | address | city | area | territory | creditLimit | creditDays | openingBalance | status`

`type` must be `DEALER` or `DISTRIBUTOR`.

### Products

`skuCode | productCode | name | brandName | model | wattage | packingUnit | cartonQuantity | costPrice | tradePrice | dealerPrice | retailPrice | taxRate | reorderLevel | barcode | status`

## Secure inbound endpoint

`https://nigvxsjrvkmynwduvemy.supabase.co/functions/v1/sync-master-data-from-sheets`

The endpoint requires the `X-NLINK-SHEET-TOKEN` header. The token is stored as a SHA-256 hash in Supabase, not in the repository.

## Google Apps Script

Use the companion file `docs/google-apps-script/master-control-sync.gs` in the existing spreadsheet's Apps Script project.

Set the script property `NLINK_SHEET_TOKEN` to the provisioned integration token. The script reads the four master tabs, validates the required headers, sends JSON to the Edge Function, and writes the result to `Sync_Log`.

The script never sends passwords. Authentication accounts remain controlled by Supabase Auth. The sheet controls the N-LINK user/team record and role mapping.

## Production data ownership

- Google Sheets: master-data administration.
- Supabase: transactions, financial balances, inventory movement, authentication and audit trail.
- N-LINK UI: operational execution.

This split prevents a spreadsheet edit from rewriting financial history while still allowing the business team to manage the daily master data in the existing sheet.
