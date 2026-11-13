# N-LINK-360 BUSINESS WORKFLOWS & OPERATIONAL SPECIFICATION

## 1. End-to-End Operational Lifecycle

N-LINK-360 standardizes 5 core business workflows:

### Workflow A: Sales Order Booking & Pricing Floor
1. Field Officer selects active shop in current beat.
2. Selects SKUs from official rate list (`NLINK_OFFICIAL_PRODUCTS`).
3. System validates minimum trade price floor and applies 15% trade discount.
4. Order submitted in `PENDING` state to Head Office queue.

### Workflow B: Payment Recovery & Verification Queue
1. Officer collects cash/cheque/online transfer and logs receipt details.
2. Recovery starts in `PENDING_ACCOUNTS_VERIFICATION` state. Unverified payments do NOT alter dealer ledger balance.
3. Accounts / Shahzad Ullah reviews instrument details (Cheque #, Bank ref) and approves.
4. Verified recovery credits dealer ledger balance: `Balance = Balance - Verified Recovery`.

### Workflow C: Dispatch-Time Invoicing (5-Step Fulfillment)
1. Warehouse dispatch team opens approved order.
2. Confirms actual loaded quantities (omitting missing/out-of-stock items).
3. System generates Dispatch Note with vehicle registration and bility number.
4. Commercial Tax Invoice generated with 15% trade discount: `Net Invoice = Loaded Gross * 0.85`.
5. Invoice posted to dealer ledger: `Balance = Balance + Net Invoice Total`. Stock deducted from inventory.

### Workflow D: Dealer Self-Service Portal
1. Retailer logs in via OTP / credentials.
2. Views real-time account statement, credit limit, and delivery status.
3. Downloads official PDF invoice or exports WhatsApp statement.

### Workflow E: 2-Way Google Sheets Sync
1. System automatically pushes local changes to Google Sheets Webhook.
2. Live GViz query imports sheet edits into an approval queue for reconciliation.
