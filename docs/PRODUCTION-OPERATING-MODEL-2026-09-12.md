# N-LINK 360 Production Operating Model

## Purpose
N-LINK 360 is the company-wide management system for National Lights. It has two user experiences on one database.

## 1. Mobile: Field Force

Mobile is for market execution and must remain simple.

Core actions:
- Attendance with real time and GPS location
- Market visits
- Distributor / Dealer selection
- SKU-wise order entry
- Recovery entry
- Invoice / order status
- Customer ledger and balance
- Customer visit history
- Team tracking and field performance
- Offline queue with safe sync when connectivity returns

Field Force sees only the assigned customer portfolio and permitted data.

## 2. Desktop: Head Office

Desktop is the full management portal.

Domains:
- Executive dashboard
- Customers: Distributor and Dealer only
- Employee / HR management
- Region / Area / Territory / Town hierarchy
- Sales and orders
- Invoicing
- Customer ledgers
- Recovery and outstanding
- Targets and achievement
- Factory management
- Warehouse and finished goods
- Inventory receipts, movement and dispatch
- Approvals
- Reports and exports
- Google Sheets master-data synchronization
- Audit and security

## 3. Data ownership

Supabase Auth owns identity and sessions.

Supabase PostgreSQL owns operational transactions and business state.

Google Sheets is a controlled master-data and synchronization layer for approved users, customers, assignments and selected reporting. It is not an authentication bypass and it is not the primary transaction ledger.

## 4. Customer balance

Customer closing balance is derived from transaction history:

Opening Balance + Invoice Debits + Debit Notes - Recoveries - Credit Notes = Closing Balance

Do not store a manually editable current balance as the source of truth.

## 5. Inventory

Inventory is transaction based:

Opening Stock + Production / Receipt In - Sales / Dispatch Out + Approved Returns = Current Stock

Posted transactions must be auditable.

## 6. Authentication

N-LINK uses passwordless email verification for the current production phase:

Registered email -> OTP / Magic Link -> Supabase session -> active employee profile -> role -> permissions.

A matching email address by itself never grants access.

Passwords must never be exposed or retrievable.

## 7. Production rule

REAL USER -> REAL AUTH -> REAL PERMISSION -> REAL UI -> REAL DATABASE -> REAL TRANSACTION -> REAL RESULT.

No dummy business records, fake dashboard values, demo login bypasses, hardcoded credentials or client-side-only authorization.
