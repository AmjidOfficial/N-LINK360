# N-LINK 360 P4 Sales + Recovery Implementation Contract

## Objective
Deliver the field Sales/Recovery experience as one simple mobile-first app. Sales and Recovery are the same person and the same role.

## Workspace
The logged-in Sales/Recovery employee sees:

- My Customers
- New Order
- Recovery
- Visits
- Outstanding
- Follow-ups
- My Performance

Do not create separate Sales and Recovery employees for these functions.

## Customer Selection

Start the order/recovery flow with a searchable customer selector.

Show:

- Customer ID
- Distributor/Dealer type
- Customer name
- City/area
- Contact

Only customers assigned to the user are shown unless the user's permission allows broader access.

## Balance Strip

Immediately after selecting a customer show:

`Opening Balance | Recovery | Net Balance`

Values are server/database calculated. The Sales/Recovery user cannot type these balances.

Definitions:

- Opening Balance: opening/previous ledger balance relevant to the selected customer and period.
- Recovery: verified recovery posted in the relevant period.
- Net Balance: current outstanding after posted recoveries and ledger transactions.

The UI must make it clear that these are system values.

## Order Sheet

The main order entry is deliberately simple:

| SKU Name | Available Qty | Order Qty |
| --- | ---: | ---: |
| 1 | read-only | input |
| 2 | read-only | input |
| 3 | read-only | input |
| 4 | read-only | input |
| 5 | read-only | input |
| 6 | read-only | input |
| 7 | read-only | input |
| 8 | read-only | input |
| 9 | read-only | input |
| 10 | read-only | input |

Show 10 quick-entry rows by default. Add SKU search/filter for larger masters. Do not require the field user to type SKU codes unless they choose search.

Available Qty comes from the inventory service. Never accept a client-supplied available quantity as authoritative.

## Order Rules

- Quantity must be non-negative.
- Zero quantities are ignored on submit.
- Quantity cannot exceed available quantity unless an authorized backorder rule exists.
- SKU must be active.
- Customer must be active.
- Customer must be assigned to the Sales/Recovery user unless broader permission exists.
- Credit policy is evaluated using the authoritative customer ledger.
- Draft/submitted orders do not reduce physical stock.

## Submit Flow

`Select Customer → Read Balance → Read Stock → Enter Qty → Validate → Credit Check → Submit Order`

The order gets a server-generated order number such as `ORD000001`.

## Recovery

Recovery is available from the same customer context.

Required:

- Customer
- Amount
- Payment mode
- Instrument/reference when applicable
- Bank when applicable
- Remarks

Recovery receives a server-generated number such as `REC000001`.

A recovery must create a controlled ledger credit. If verification is required, distinguish submitted recovery from verified recovery.

## Visit

The same Sales/Recovery user can record:

- Customer
- Check-in
- Check-out
- GPS where permission is granted
- Purpose
- Notes
- Order taken
- Recovery collected
- Follow-up date

## UX Rules

- Mobile first
- Large touch targets
- Sticky customer/balance context while entering an order
- Minimal typing
- Clear save/submit state
- Offline-safe draft capability may be added later, but posted financial transactions require server confirmation
- No desktop-style dense ERP form on the phone

## Error Handling

Show clear messages for:

- Customer unavailable
- Stock insufficient
- Credit limit exceeded
- Network failure
- Duplicate submission
- Session expired

Prevent duplicate order/recovery submissions using idempotency/reference controls.

## Acceptance Gate

P4 is complete only when a real authenticated Sales/Recovery user can select an assigned Distributor/Dealer, see authoritative Opening Balance/Recovery/Net Balance, enter the simple 10-row SKU order, submit a persisted order, record recovery, record a visit, and see the results after refresh/re-login.