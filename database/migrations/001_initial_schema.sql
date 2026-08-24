-- ==============================================================================
-- N-LINK 360: PostgreSQL Database Schema Migration (001_initial_schema.sql)
-- Product: National Lights Integrated Sales, Recovery, Inventory & Distribution
-- Target: PostgreSQL 15+ / Supabase Free Tier
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ORGANIZATION DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tax_number VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    currency VARCHAR(10) DEFAULT 'PKR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('CENTRAL', 'REGIONAL', 'TRANSIT', 'DAMAGE')),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. SECURITY & RBAC DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'ALERT', 'SUCCESS')),
    reference_module VARCHAR(50),
    reference_id VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. PRODUCTS & SKUs DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50) DEFAULT 'PCS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    wattage VARCHAR(50),
    color_temperature VARCHAR(50),
    voltage VARCHAR(50),
    packaging_unit VARCHAR(50) DEFAULT 'CARTON',
    carton_quantity NUMERIC(10, 2) DEFAULT 1,
    trade_price NUMERIC(15, 2) NOT NULL,
    retail_price NUMERIC(15, 2) NOT NULL,
    minimum_price NUMERIC(15, 2) NOT NULL,
    reorder_level NUMERIC(10, 2) DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. SALES FIELD TEAM & CUSTOMERS DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sales_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    sales_region VARCHAR(100) NOT NULL,
    sales_area VARCHAR(100) NOT NULL,
    target_monthly_sales NUMERIC(15, 2) DEFAULT 0.00,
    target_monthly_recovery NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('DISTRIBUTOR', 'DEALER')),
    tax_number VARCHAR(100),
    cnic VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    credit_days INTEGER DEFAULT 30,
    opening_balance NUMERIC(15, 2) DEFAULT 0.00,
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    is_credit_locked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES sales_users(id) ON DELETE RESTRICT,
    assigned_from DATE DEFAULT CURRENT_DATE,
    assigned_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES sales_users(id) ON DELETE RESTRICT,
    checkin_time TIMESTAMPTZ NOT NULL,
    checkout_time TIMESTAMPTZ,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    purpose VARCHAR(100),
    notes TEXT,
    order_placed BOOLEAN DEFAULT FALSE,
    recovery_collected BOOLEAN DEFAULT FALSE,
    next_followup_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. PRODUCTION & INVENTORY DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    completion_date DATE,
    supervisor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'QC_PASSED', 'REJECTED')),
    qc_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    planned_quantity NUMERIC(12, 2) NOT NULL,
    produced_quantity NUMERIC(12, 2) DEFAULT 0,
    rejected_quantity NUMERIC(12, 2) DEFAULT 0,
    unit_cost NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'PRODUCTION_IN', 'SALES_OUT', 'TRANSFER_IN', 'TRANSFER_OUT',
        'RETURN_IN', 'DAMAGE_OUT', 'DAMAGE_RECOVERY', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'
    )),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(15, 2) DEFAULT 0.00,
    reference_module VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(12, 2) DEFAULT 0.00,
    quantity_reserved NUMERIC(12, 2) DEFAULT 0.00,
    quantity_damaged NUMERIC(12, 2) DEFAULT 0.00,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_wh_sku UNIQUE (warehouse_id, sku_id)
);

-- ==============================================================================
-- 6. SALES ORDERS & INVOICING DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES sales_users(id) ON DELETE RESTRICT,
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'ON_HOLD', 'REJECTED', 'INVOICED', 'CANCELLED'
    )),
    subtotal NUMERIC(15, 2) DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    credit_check_status VARCHAR(20) DEFAULT 'GREEN' CHECK (credit_check_status IN ('GREEN', 'AMBER', 'RED')),
    credit_check_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    ordered_quantity NUMERIC(12, 2) NOT NULL,
    approved_quantity NUMERIC(12, 2),
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES sales_orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED')),
    subtotal NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    previous_balance NUMERIC(15, 2) NOT NULL,
    new_balance NUMERIC(15, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    printed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. LOGISTICS & DISPATCH DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS transporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location_address TEXT,
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transporter_id UUID NOT NULL REFERENCES transporters(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(100),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transporter_id UUID NOT NULL REFERENCES transporters(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    license_number VARCHAR(100),
    cnic VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    transporter_id UUID REFERENCES transporters(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES drivers(id) ON DELETE RESTRICT,
    adda_id UUID REFERENCES addas(id) ON DELETE RESTRICT,
    bility_number VARCHAR(100),
    dispatch_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    freight_charges NUMERIC(15, 2) DEFAULT 0.00,
    other_charges NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')),
    gate_pass_number VARCHAR(100),
    remarks TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(100) UNIQUE NOT NULL,
    dispatch_id UUID REFERENCES dispatches(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    received_date DATE DEFAULT CURRENT_DATE,
    received_by_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'DISCREPANCY', 'REJECTED')),
    inspection_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    invoiced_quantity NUMERIC(12, 2) NOT NULL,
    received_quantity NUMERIC(12, 2) NOT NULL,
    short_quantity NUMERIC(12, 2) DEFAULT 0.00,
    excess_quantity NUMERIC(12, 2) DEFAULT 0.00,
    damaged_quantity NUMERIC(12, 2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. ACCOUNTS & CUSTOMER LEDGER DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES sales_users(id) ON DELETE RESTRICT,
    collection_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('CASH', 'CHEQUE', 'ONLINE_TRANSFER', 'PAY_ORDER')),
    instrument_number VARCHAR(100),
    bank_name VARCHAR(100),
    instrument_date DATE,
    proof_attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    entry_date DATE DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'OPENING_BALANCE', 'INVOICE', 'RECOVERY', 'CREDIT_NOTE', 'DEBIT_NOTE', 'RETURN_ADJUSTMENT'
    )),
    reference_module VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    debit_amount NUMERIC(15, 2) DEFAULT 0.00,
    credit_amount NUMERIC(15, 2) DEFAULT 0.00,
    running_balance NUMERIC(15, 2) NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. REVERSE LOGISTICS & DAMAGE DOMAIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS stock_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES sales_users(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'REPORTED' CHECK (status IN (
        'REPORTED', 'WAREHOUSE_RECEIVED', 'INSPECTED', 'APPROVED', 'REJECTED', 'CREDIT_NOTE_ISSUED'
    )),
    inspection_result VARCHAR(50) CHECK (inspection_result IN ('SALEABLE', 'DAMAGED', 'SCRAP')),
    total_claimed_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_approved_amount NUMERIC(15, 2) DEFAULT 0.00,
    credit_note_id UUID REFERENCES credit_notes(id) ON DELETE SET NULL,
    inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inspected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES stock_returns(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    claimed_quantity NUMERIC(12, 2) NOT NULL,
    received_quantity NUMERIC(12, 2),
    approved_quantity NUMERIC(12, 2),
    unit_price NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    condition_notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS damage_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    damage_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) DEFAULT 0.00,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('PRODUCTION', 'TRANSIT', 'CUSTOMER_RETURN', 'WAREHOUSE_HANDLING')),
    source_reference_id VARCHAR(255),
    resolution_type VARCHAR(50) DEFAULT 'PENDING' CHECK (resolution_type IN ('PENDING', 'REPAIR', 'SCRAP', 'REPLACEMENT', 'CREDIT_NOTE')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE LEDGERS AND LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_region ON customers(region);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_sales ON customer_assignments(sales_user_id);
CREATE INDEX IF NOT EXISTS idx_skus_code ON skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_wh_sku ON inventory_transactions(warehouse_id, sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_created ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_cust ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_cust ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_recoveries_cust ON recoveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_recoveries_status ON recoveries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_cust_date ON ledger_entries(customer_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_stock_returns_cust ON stock_returns(customer_id);
