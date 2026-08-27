# N-LINK 360 Prioritized Phase Execution Plan

This document is the execution order for the application. The goal is to reach a usable end-to-end system without building a large collection of disconnected screens.

## P0 Foundation
- PostgreSQL migrations
- UUID + simple business IDs
- Authentication
- Users/employees
- Roles and permissions
- Environment separation
- Audit foundation
- Shared validation/types

## P1 Role Workspaces
- Login redirects to the user's workspace
- No production role switcher
- One user can have one primary role plus explicit permissions
- Work modes are buttons inside the workspace
- Factory In-Charge is one person with multiple factory work modes
- Similar lean staffing for other departments

## P2 Master Data
- Company / branch / factory / warehouse
- Employee master
- Customer master: Distributor / Dealer
- Product category / brand / product / SKU
- Transporter / Adda / Vehicle / Driver
- Customer assignment
- Simple searchable IDs

## P3 Factory + Inventory
- Production entry
- QC / inspection
- Finished goods stock-in
- Factory stock
- Warehouse stock
- Transfers / handover
- Stock ledger
- Returns / damage
- Stock availability API

## P4 Sales + Recovery App
- Customer selection
- Opening balance
- Recovery entry
- Net balance
- Simple SKU order sheet
- Available quantity read-only
- Order quantity input
- Order submit
- Visit and follow-up

## P5 Order to Invoice
- Order approval
- Credit check
- Stock check
- Invoice creation
- Invoice items
- Inventory stock-out
- Customer ledger debit
- Previous balance / invoice / new balance

## P6 Dispatch
- Dispatch planning
- Transporter
- Adda
- Vehicle
- Driver
- Bility
- Freight / charges
- Destination / contact
- Dispatch status
- GRN

## P7 Accounts + Recovery
- Recovery verification
- Ledger
- Outstanding
- Aging
- Statements
- Credit notes
- Debit notes

## P8 Returns + Damage
- Return request
- Approval
- Warehouse receipt
- Inspection
- Saleable vs damaged
- Inventory adjustment
- Credit note
- Damage resolution

## P9 Reports
- Management dashboard
- Sales
- Recovery
- Outstanding
- Inventory
- Customer
- SKU
- Dispatch
- Returns / damage
- Sales/Recovery employee performance

## P10 Production Readiness
- End-to-end testing
- Permission testing
- Stock reconciliation
- Ledger reconciliation
- Backup/export procedure
- Error monitoring
- Security review
- Production environment

## Release Gate
Do not call a phase complete until the underlying transaction is real, persisted, permission checked, auditable and tested. A visual screen without the required backend transaction is not complete.
