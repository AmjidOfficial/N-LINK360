# N-LINK 360 P7 Customer 360 + Order UX Enhancements

## 1. Customer 360 Visit History

Add a dedicated `Visit History` tab inside Customer 360.

Chronological feed, newest first, with:
- Visit date/time
- Sales/Recovery employee
- Check-in/location snapshot where available
- Visit notes
- Customer mood/status where configured
- Order outcome: order created, no order, pending
- Recovery outcome: amount collected, pending, none
- Follow-up date/action
- Attachments/snapshots where supported

Each visit is linked to the customer and actor. It must remain auditable and should not be hard-deleted.

The Customer 360 summary should still show current balance, last visit, last order and last recovery.

## 2. Order Confirmation PDF Preview

After order submission, show a confirmation modal containing:
- Order number
- Customer
- Sales/Recovery employee
- Order date/time
- Line count
- Total quantity
- Order value
- Opening/current balance
- Recovery considered
- Projected/new balance
- Credit limit
- Available credit
- Credit status: PASS / REVIEW / BLOCK

Add `Preview PDF`.

Preview must generate a temporary printable order summary from the submitted/persisted order data. It must not create a second order or invoice.

The preview should include company branding, customer details, SKU lines, quantities, prices/totals, balance and credit status, plus a clear `DRAFT / ORDER PREVIEW` label so it cannot be mistaken for an invoice.

Actions:
- Preview PDF
- Print
- Close

Do not issue an invoice number from this preview.

## 3. Order Booking SKU Expandable Detail

The SKU grid keeps the compact columns:
`SKU Name | Available Qty | Order Qty`

Click/tap a SKU row to expand technical detail without leaving the order screen.

Expanded detail:
- SKU ID/code
- Barcode
- Brand
- Product
- Model
- Wattage
- Unit
- Packing unit
- Units per carton
- Trade price
- Dealer price
- Sale price
- Discount where authorized
- Tax where applicable
- Effective price basis
- Stock location/availability context where permitted

Price visibility must respect the logged-in user's permissions. Do not expose confidential cost prices to Sales/Recovery unless explicitly authorized.

Order quantity remains the only primary editable field in the compact grid.

## 4. UX / Responsive Rules

- Desktop: expandable inline row/panel.
- Tablet: expandable card/details panel.
- Mobile: tap row to open a stacked detail drawer/card.
- Maintain the 10-row quick-entry behavior.
- Search/filter remains available for the complete SKU master.
- Do not cause horizontal page scrolling.

## 5. Data Integrity

Visit, order preview and SKU details must use persisted/server-authoritative data.

Preview uses the already submitted order; it must never mutate stock or ledger.

SKU pricing shown to Sales/Recovery must come from the effective pricing rules at order time.

## 6. Acceptance Criteria

Customer 360 has a working Visit History tab with chronological visits and outcomes.

Order confirmation has a working Preview PDF action that creates a temporary branded printable summary and does not create an invoice.

SKU rows expand/collapse and expose technical specs, packing and permitted price breakdown.

All three features work on mobile, tablet and desktop and respect role/permission controls.