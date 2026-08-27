# N-LINK 360 Master Data and ID Standard

## 1. Heads

N-LINK 360 uses business heads to organize the system. Heads are not the same thing as employee count.

- `MANUFACTURER` - National Lights / factory operations
- `SALES_RECOVERY` - combined field sales and recovery team
- `DEALERSHIP` - dealer customer accounts
- `DISTRIBUTOR` - distributor customer accounts
- `LOGISTICS` - adda, vehicle, driver, transporter and bility

Internal support functions such as Management, Accounts, Warehouse and Dispatch are controlled through permissions/work modes. They do not require a large number of employees.

## 2. Lean Staffing Rule

A role describes what a user is allowed to do. It does NOT imply that National Lights must employ a separate person for every function.

Examples:

- One Factory In-Charge can use Production, QC, Finished Goods, Factory Stock, Transfer, Return/Damage and Daily Report buttons.
- One Warehouse In-Charge can use Receiving, Stock Issue, Transfer, Dispatch Preparation, Return and Damage buttons.
- One Accounts person can use Ledger, Recovery Verification, Outstanding, Credit Note and Debit Note buttons.
- One Sales/Recovery Officer performs both sales and recovery.
- Management can see multiple reporting areas without becoming an operational user.

## 3. Roles

Keep the initial role set small:

1. `SUPER_ADMIN`
2. `MANAGEMENT`
3. `FACTORY_INCHARGE`
4. `WAREHOUSE_INCHARGE`
5. `ACCOUNTS`
6. `SALES_MANAGER`
7. `SALES_RECOVERY`
8. `DISPATCH_INCHARGE`

A person may hold more than one work permission if management assigns it. Do not create separate roles simply because there are multiple buttons.

## 4. Master Data

### Organization

- Company
- Branch
- Factory
- Warehouse
- Territory
- Area
- City

### People

- Employees
- Users
- Roles
- Permissions
- Sales/Recovery team

### Product

- Category
- Brand
- Product
- SKU
- Barcode
- Packing
- Pricing
- Tax
- Reorder level

### Customers

- Distributor
- Dealer
- Customer contacts
- Customer assignments
- Credit limit
- Credit days
- Opening balance

### Logistics

- Transporter
- Adda
- Vehicle
- Driver
- Bility

## 5. Simple Human IDs

Every master record has a short business ID. UUID remains the internal primary key.

| Entity | Prefix | Example |
|---|---|---|
| Company | CMP | CMP001 |
| Branch | BR | BR001 |
| Factory | FAC | FAC001 |
| Warehouse | WH | WH001 |
| Employee | EMP | EMP001 |
| User | USR | USR001 |
| Role | ROL | ROL001 |
| Category | CAT | CAT001 |
| Brand | BRD | BRD001 |
| Product | PRD | PRD001 |
| SKU | SKU | SKU001 |
| Distributor | DST | DST001 |
| Dealer | DLR | DLR001 |
| Order | ORD | ORD000001 |
| Invoice | INV | INV000001 |
| Dispatch | DSP | DSP000001 |
| Bility | BIL | BIL000001 |
| Recovery | REC | REC000001 |
| Ledger | LGR | LGR000001 |
| Return | RET | RET000001 |
| Damage | DMG | DMG000001 |
| GRN | GRN | GRN000001 |

Do not expose UUIDs to normal users.

## 6. SKU Rule

SKU is the inventory and ordering unit.

Each SKU must have:

- SKU ID
- SKU name
- Brand
- Product
- Category
- Barcode if available
- Packing unit
- Units per carton
- Available quantity
- Price
- Status

Never hard-code ten SKUs in the database. The ordering screen may initially display ten rows for speed, but it must load active SKUs dynamically and allow more rows when required.
