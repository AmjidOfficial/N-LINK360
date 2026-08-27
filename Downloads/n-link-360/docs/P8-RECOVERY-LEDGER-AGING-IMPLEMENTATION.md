# N-LINK 360 P8 Recovery + Ledger + Aging Implementation

## Objective
Complete the financial loop for Distributor/Dealer accounts. Recovery and invoice transactions must flow into one authoritative customer ledger.

## Customer Ledger

Every customer account has an append-only financial ledger.

Transaction types:
- OPENING_BALANCE
- INVOICE_DEBIT
- RECOVERY_CREDIT
- CREDIT_NOTE
- DEBIT_NOTE
- ADJUSTMENT_DEBIT
- ADJUSTMENT_CREDIT
- REVERSAL

Each entry records:
- ledger_id
- ledger_code
- customer_id
- transaction_date
- transaction_type
- reference_type
- reference_id
- debit
- credit
- running_balance
- payment/reference number where applicable
- remarks
- created_by
- created_at
- verified_by / verified_at where required

## Opening Balance

Opening balance is entered through an authorized opening-balance transaction. It is not an editable field on an invoice or order.

## Recovery Entry

Sales/Recovery person records:
- customer
- amount
- date
- payment mode
- reference/instrument number
- bank where applicable
- remarks
- optional attachment/proof

Create a pending recovery when verification is required.

Verification workflow:
`DRAFT → SUBMITTED → VERIFIED` or `REJECTED`

Only verified recovery credits reduce the authoritative outstanding balance when verification is enabled.

## Payment Modes

Configurable modes may include:
- CASH
- BANK_TRANSFER
- CHEQUE
- ONLINE
- OTHER

Do not hard-code a single bank or payment method.

## Balance Calculation

`Balance = Opening Balance + Posted Debits - Posted Credits`

Posted debits include invoices/debit notes. Posted credits include verified recoveries/credit notes.

Never calculate financial balance from client-side form state.

## Customer 360 Financial Summary

Show:
- Opening balance
- Current outstanding
- Credit limit
- Available credit
- Total invoiced for selected period
- Total recovered for selected period
- Last invoice
- Last recovery
- Overdue amount

## Customer Statement

Chronological statement columns:
- Date
- Reference
- Description
- Debit
- Credit
- Balance

Filters:
- Date range
- Transaction type
- Reference
- Amount

Actions:
- Print
- PDF
- Excel
- CSV

## Aging

Configurable buckets, default:
- Current / Not Due
- 1–30 days
- 31–60 days
- 61–90 days
- 91–120 days
- 120+ days

Aging must use invoice due dates/payment terms and posted credits. Do not age the full customer balance as one lump sum.

## Outstanding Reports

Support:
- All customers
- Distributor only
- Dealer only
- Sales/Recovery employee
- Area/city
- Aging bucket
- Credit limit utilization

## Recovery Dashboard

Sales/Recovery user sees:
- Today's recovery
- Month recovery
- Pending verification
- Overdue customers
- Today's planned follow-ups
- Recent recoveries

Managers see team rollups according to permission.

## Customer-Level Security

Sales/Recovery users should see assigned customers by default. Broader visibility requires explicit permission.

## Audit and Correction

Posted ledger entries cannot be silently edited/deleted. Corrections use reversal, credit note, debit note or authorized adjustment.

## Concurrency / Idempotency

Recovery submission must have an idempotency key or equivalent duplicate protection so repeated taps/network retries do not create duplicate credits.

Ledger posting and balance update must be atomic.

## Acceptance Gate

P8 is complete when a posted invoice creates a debit, a verified recovery creates a credit, Customer 360 shows the correct balance, statements reconcile, aging is correct by invoice due date, duplicate recovery submissions are prevented, and all financial reports can print/export.