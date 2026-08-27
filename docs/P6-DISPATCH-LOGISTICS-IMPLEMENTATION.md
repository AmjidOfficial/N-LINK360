# N-LINK 360 P6 Dispatch & Logistics Implementation Contract

## Objective
Move a posted invoice into controlled dispatch and delivery tracking with complete Adda, vehicle, driver and Bility information.

## Lifecycle

`DISPATCH_READY → PLANNED → LOADED → IN_TRANSIT → DELIVERED`

Alternative states:

`CANCELLED`, `FAILED`, `PARTIAL_DELIVERY`

## Dispatch Record

Each dispatch must include:

- dispatch_id
- dispatch_code
- invoice_id
- customer_id
- destination
- destination_contact
- transporter_id where applicable
- adda_id
- vehicle_id
- driver_id
- dispatch_date
- expected_delivery_date
- freight_charges
- other_charges
- total_logistics_charges
- bility_number
- status
- remarks
- created_by
- created_at

## Bility

Bility must be its own document/reference with:

- bility_id
- bility_number
- dispatch_id
- invoice_id
- transporter
- adda
- vehicle
- driver
- origin
- destination
- freight
- loading/unloading charges where applicable
- total charges
- date
- status

Bility number must be unique within the configured scope.

## Vehicle Master

- vehicle_id
- vehicle_code
- registration_number
- vehicle_type
- capacity
- transporter_id
- status

## Driver Master

- driver_id
- driver_code
- name
- mobile
- license/reference where required
- transporter_id
- status

## Adda Master

- adda_id
- adda_code
- name
- address
- city
- contact
- transporter_id where applicable
- status

## Dispatch Planning

Dispatch screen should allow authorized users to:

1. Select one or more dispatch-ready invoices according to business rules.
2. Confirm customer/destination.
3. Select Adda.
4. Select vehicle.
5. Select driver.
6. Enter Bility details.
7. Enter charges.
8. Confirm loading.
9. Mark in transit.
10. Record delivery/GRN.

## Invoice Relationship

A posted invoice can become dispatch-ready. Dispatch must reference the invoice and customer. Do not recreate invoice lines manually.

## Delivery / GRN

At receipt, capture:

- GRN number
- received date
- invoice/dispatch reference
- customer
- SKU
- dispatched quantity
- received quantity
- shortage/difference
- damage quantity
- receiver
- remarks

GRN must not silently alter the original invoice. Any shortage/damage must create the appropriate return, claim or adjustment workflow.

## Charges

Keep product invoice value separate from logistics charges. Logistics charges must be clearly classified as freight, loading, unloading, Adda or other approved charge types.

## Print / Documents

Dispatch must support:

- Dispatch note print
- Bility print
- Loading sheet print
- Delivery/GRN print
- PDF download

Use the shared company logo and print settings.

## Security and Audit

Only authorized users can plan, load, cancel or close dispatches. Record actor, time and action. Posted dispatch and Bility documents cannot be silently deleted.

## Acceptance Gate

P6 is complete only when an actual posted invoice can move through dispatch planning, Bility assignment, vehicle/driver/Adda allocation, in-transit status and GRN/delivery, with all records persisted, auditable and printable.