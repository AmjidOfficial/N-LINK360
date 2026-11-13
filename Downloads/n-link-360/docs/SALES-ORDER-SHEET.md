# N-LINK 360 Simple Sales/Recovery Order Sheet

The Sales/Recovery Team must not see a complicated ERP order form.

## Step 1 - Select Customer

One search/select control:

**Distributor / Dealer:** `[ Select Customer ▼ ]`

Show customer type and short ID, for example:

`DST001 - ABC Distribution`

or

`DLR014 - City Lights Dealer`

## Step 2 - Customer Position

Immediately show:

| Opening Balance | Recovery | Net Balance |
|---:|---:|---:|
| Rs 250,000 | Rs 50,000 | Rs 200,000 |

Definitions:

- Opening Balance = balance before today's transaction
- Recovery = recovery entered in this visit/order session
- Net Balance = Opening Balance - Recovery

If an invoice is posted later, the final ledger balance becomes:

**Net Balance + Posted Invoice - Credits**

## Step 3 - Simple SKU Grid

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

### Rules

1. Available Qty is read-only.
2. Order Qty is the only quantity field the Sales/Recovery person normally enters.
3. Order Qty cannot exceed Available Qty unless the business explicitly allows backorders.
4. Zero-stock SKUs show `0` and cannot be ordered unless backorder permission is enabled.
5. Active SKUs are loaded dynamically from the SKU master.
6. The first ten rows are optimized for the common case, not a hard database limit.
7. Search/filter can find any SKU.
8. Customer balance is visible before submitting the order.
9. The submit button should show a short confirmation summary.

## Step 4 - Submit

Primary button:

**SUBMIT ORDER**

Before submission show:

- Customer
- Opening Balance
- Recovery
- Net Balance
- Total SKUs ordered
- Total quantity
- Estimated order value
- Credit warning if applicable

## Sales/Recovery Principle

The field person should be able to complete the normal order in seconds with minimal typing.

The screen should work well on a phone with one hand.

## Recovery Shortcut

On the same customer screen, show:

**RECOVERY**

The user can enter amount and payment method without leaving the customer context.

After saving recovery, refresh:

**Opening Balance | Recovery | Net Balance**

This makes sales and recovery one continuous customer workflow.
