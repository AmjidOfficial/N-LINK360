# N-LINK 360 P3 Factory + Inventory Implementation Contract

## Objective
Build a transaction-based factory and inventory engine. Stock must never be maintained by manually editing an available-quantity field.

## Operating Model

A Factory In-Charge is one employee with multiple work modes:

- Production Entry
- QC / Inspection
- Finished Goods Stock In
- Factory Stock
- Stock Transfer / Handover
- Returns
- Damage
- Factory Daily Report

Do not create separate employees for each function unless the business later assigns additional staff.

## Stock Locations

Every stock movement must have a source and destination where applicable:

- Factory
- Warehouse
- Distributor/Dealer only when an approved transaction supports it

## Inventory Transaction Types

Use an append-oriented inventory transaction ledger:

- PRODUCTION_IN
- PURCHASE_IN where applicable
- TRANSFER_OUT
- TRANSFER_IN
- INVOICE_OUT
- RETURN_IN
- DAMAGE_OUT
- ADJUSTMENT_IN
- ADJUSTMENT_OUT

Each transaction should record:

- transaction_id
- transaction_code
- transaction_type
- transaction_date
- sku_id
- quantity
- source_location_id
- destination_location_id
- reference_type
- reference_id
- reason
- created_by
- created_at

## Production Flow

Production Entry → QC/Inspection → Finished Goods Stock In.

Production quantities must not become available finished stock before the required posting step.

QC can record:

- accepted quantity
- rejected quantity
- remarks

Accepted finished goods become inventory through a controlled stock-in transaction.

## Transfers

Factory/warehouse transfer:

Draft → Approve → Stock Out Source → Stock In Destination → Complete.

The two stock movements must be linked by one transfer reference.

## Returns

Customer return:

Return Request → Approval → Receipt → Inspection →

- Saleable: RETURN_IN
- Damaged: DAMAGE_OUT / damage location handling

Do not automatically increase saleable stock before inspection.

## Damage

Damage must record:

- SKU
- quantity
- location
- reason
- reference
- reported by
- approved by where required
- date
- disposition

## Available Stock

For a SKU/location:

`Available = Sum(Stock-In) - Sum(Stock-Out)`

Use server/database calculations. Never trust a client-provided available quantity.

## Reservations

Draft orders do not reduce physical inventory.

If reservation is later required, maintain a separate reservation mechanism. Do not mix reservations with posted stock movements.

## Audit

Every stock-changing transaction must have:

- authenticated actor
- timestamp
- reference document
- before/after quantity where practical
- reason for adjustments

Posted inventory transactions must not be silently edited or deleted. Corrections require reversal/adjustment transactions.

## Concurrency

Stock posting must be atomic. Prevent two simultaneous invoices/transfers from consuming the same available stock.

Use database transactions and row-level locking or an equivalent safe concurrency mechanism.

## Factory Dashboard

Keep it simple:

- Today's Production
- Pending QC
- Finished Goods Today
- Factory Stock
- Transfers Pending
- Returns Pending
- Damage Pending

Then the work buttons.

## Acceptance Gate

P3 is complete only when production, QC, stock-in, transfer, return and damage transactions persist to PostgreSQL/Supabase, update stock correctly, are permission checked, are auditable and survive page refresh/re-login.
