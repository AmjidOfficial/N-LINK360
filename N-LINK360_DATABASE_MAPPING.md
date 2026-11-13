# N-LINK-360 DATABASE MAPPING & SUPABASE SCHEMA SPECIFICATION

## 1. Relational Entity Domain Mapping

N-LINK-360 models 17 core database domains in Supabase PostgreSQL:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE DATABASE SCHEMAS                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Domain            │ Supabase Table    │ Key Attributes                 │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 1. Users          │ nlink_users       │ id, email, role, department    │
│ 2. Dealers        │ customers         │ customer_code, balance, limit  │
│ 3. Hierarchy      │ town_nodes        │ town_name, routes, radius      │
│ 4. SKUs           │ official_products │ sku_code, trade_price, carton  │
│ 5. Orders         │ sales_orders      │ order_number, net_total, status│
│ 6. Invoices       │ invoices          │ invoice_number, discount_15    │
│ 7. Recoveries     │ recoveries        │ payment_mode, cheque_no, status│
│ 8. Financial Ledger│ ledger_entries   │ debit, credit, running_balance │
│ 9. Inventory      │ inventory_balances│ sku_code, quantity_on_hand     │
│ 10. Attendance    │ field_attendance  │ check_in_time, gps_lat_lng     │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 2. Table Schemas & Foreign Key Constraints

1. **`customers` Table**:
   - `id`: UUID (Primary Key)
   - `customer_code`: VARCHAR(50) UNIQUE NOT NULL
   - `company_name`: VARCHAR(255) NOT NULL
   - `opening_balance`: NUMERIC(12, 2) DEFAULT 0.00
   - `current_balance`: NUMERIC(12, 2) DEFAULT 0.00
   - `credit_limit`: NUMERIC(12, 2) DEFAULT 350000.00
   - `status`: VARCHAR(30) DEFAULT 'ACTIVE'
   - `approval_status`: VARCHAR(30) DEFAULT 'APPROVED'

2. **`sales_orders` Table**:
   - `id`: UUID (Primary Key)
   - `order_number`: VARCHAR(50) UNIQUE NOT NULL
   - `customer_id`: UUID REFERENCES `customers(id)`
   - `gross_subtotal`: NUMERIC(12, 2) NOT NULL
   - `discount_amount`: NUMERIC(12, 2) NOT NULL -- 15% Trade Discount
   - `net_total`: NUMERIC(12, 2) NOT NULL
   - `status`: VARCHAR(30) DEFAULT 'PENDING'
   - `shahzad_approval`: VARCHAR(30) DEFAULT 'PENDING'

3. **`recoveries` Table**:
   - `id`: UUID (Primary Key)
   - `recovery_number`: VARCHAR(50) UNIQUE NOT NULL
   - `customer_id`: UUID REFERENCES `customers(id)`
   - `amount`: NUMERIC(12, 2) NOT NULL
   - `payment_method`: VARCHAR(30) -- 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER'
   - `status`: VARCHAR(30) DEFAULT 'PENDING' -- PENDING until verified by Accounts / Shahzad Ullah
   - `verified_by`: VARCHAR(255)
