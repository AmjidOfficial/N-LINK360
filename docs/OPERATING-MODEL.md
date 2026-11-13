# N-LINK 360 Operating Model

## Core Principle

N-LINK 360 is **role-based**, but it is not **job-title-count based**.

A role defines what a user is allowed to do. It does not mean National Lights must hire a separate person for every function.

One person can hold one primary role and perform several controlled work functions through separate buttons/work modes.

## Factory Reality

National Lights may have **one person responsible for factory operations**.

Do NOT create separate Factory Manager, QC Officer, Production Officer and Finished Goods Officer accounts just because the system contains these functions.

Instead create one user, for example:

**Factory Operator / Factory In-Charge**

That user sees a Factory Workspace with clear work buttons:

1. Production Entry
2. QC / Inspection
3. Finished Goods Stock-In
4. Factory Stock
5. Stock Transfer / Handover
6. Factory Returns / Damage
7. Daily Factory Report

The user switches work mode by button. The underlying permission remains the same factory role.

## Other Functions

The same principle applies elsewhere when staffing is lean.

### Warehouse

One Warehouse In-Charge can have:

- Receive Stock
- Stock Issue
- Transfer
- Dispatch Preparation
- Returns
- Damage
- Stock Ledger

### Accounts

One Accounts person can have:

- Customer Ledger
- Recovery Verification
- Credit Notes
- Debit Notes
- Aging
- Statements

### Dispatch

One Dispatch/Logistics person can have:

- Dispatch Planning
- Vehicle
- Driver
- Adda
- Bility
- Delivery Status
- GRN

### Sales / Recovery

Sales and recovery are already one combined field role:

- Customers
- Visit
- Order
- Recovery
- Outstanding
- Return
- Damage
- Follow-up

## Management / Admin

Management and Super Admin can have broader visibility, but even they should see modules grouped into clean work areas instead of a wall of unrelated buttons.

## UI Rule

The first screen after login is a **Role Workspace**, not the complete ERP.

Show:

- User name
- Primary role
- Branch/factory/area
- Today's work
- Pending actions
- A small number of large work buttons

Then open the selected work mode.

## Permission Rule

Work modes are a UI concept. Server-side permissions remain the security authority.

Example:

`FACTORY_OPERATOR` can access factory production, QC, finished goods and factory stock functions.

The UI may show separate buttons, but the backend still checks the factory permission for every operation.

## No Fake Staffing

Demo data must not imply that National Lights has eight people performing eight separate jobs when the actual operating model uses fewer people.

Seed data should represent a realistic lean organization.

## No Role Switcher in Production

The current demo role switcher is for development only and must not exist in production.

Production users authenticate with their own account. Their role and permissions determine their workspace.

## Goal

The system should make a small team look organized without pretending the company has a large administrative staff.
