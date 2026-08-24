-- ==============================================================================
-- N-LINK 360: Development Seed Dataset (dev_seed.sql)
-- Environment: DEV ONLY (Strictly synthetic test fixtures, no real customer data)
-- Company: National Lights
-- ==============================================================================

-- 1. Insert Company Master
INSERT INTO companies (id, code, name, tax_number, email, phone, address, currency)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'NL-CORP',
    'National Lights (Pvt) Ltd',
    'TRN-99887766-NL',
    'nationallights2026@gmail.com',
    '+92 42 35910000',
    'Plot 42, Industrial Area, Sundar Estate, Lahore, Pakistan',
    'PKR'
) ON CONFLICT (code) DO NOTHING;

-- 2. Insert Branches
INSERT INTO branches (id, company_id, code, name, city, region, address, phone)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'BR-LHR',
    'Lahore Central Branch',
    'Lahore',
    'Punjab North',
    'Sundar Industrial Estate, Lahore',
    '+92 42 35910001'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'BR-KHI',
    'Karachi South Branch',
    'Karachi',
    'Sindh South',
    'Korangi Industrial Area, Karachi',
    '+92 21 35010002'
) ON CONFLICT (code) DO NOTHING;

-- 3. Insert Factories & Warehouses
INSERT INTO factories (id, company_id, branch_id, code, name, address, contact_person, phone)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'FACT-LHR-01',
    'National Lights Main Plant 1',
    'Plot 42-45, Sundar Estate, Lahore',
    'Engr. Tariq Mahmood',
    '+92 300 1112233'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (id, company_id, branch_id, code, name, type, address)
VALUES 
(
    'w0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'WH-LHR-CENTRAL',
    'Lahore Central Distribution Warehouse',
    'CENTRAL',
    'Sundar Estate Warehouse Bay 1-4, Lahore'
),
(
    'w0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'WH-LHR-DAMAGE',
    'Lahore Inspection & Damage Quarantine',
    'DAMAGE',
    'Sundar Estate Warehouse Bay 9, Lahore'
) ON CONFLICT (code) DO NOTHING;

-- 4. Insert Roles
INSERT INTO roles (id, code, name, description, is_system)
VALUES 
('r0000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator', 'Full administrative authority', true),
('r0000000-0000-0000-0000-000000000002', 'MANAGEMENT', 'Executive Management', 'Strategic oversight and KPI dashboard access', true),
('r0000000-0000-0000-0000-000000000003', 'FACTORY_MANAGER', 'Factory Operations Manager', 'Plant production and QC oversight', true),
('r0000000-0000-0000-0000-000000000004', 'WAREHOUSE_MANAGER', 'Warehouse In-Charge', 'Inventory movements, GRN, and physical stock', true),
('r0000000-0000-0000-0000-000000000005', 'ACCOUNTS', 'Accounts & Finance Officer', 'Recovery verification, ledgers, credit/debit notes', true),
('r0000000-0000-0000-0000-000000000006', 'SALES_MANAGER', 'Regional Sales Manager', 'Team targets, credit approval overrides, reviews', true),
('r0000000-0000-0000-0000-000000000007', 'SALES_RECOVERY', 'Sales & Recovery Officer (Field)', 'Single unified field role: visits, booking, recovery', true),
('r0000000-0000-0000-0000-000000000008', 'DISPATCH_OFFICER', 'Logistics & Dispatch Officer', 'Transport, vehicle, bility, and transit coordination', true)
ON CONFLICT (code) DO NOTHING;

-- 5. Insert Users
INSERT INTO users (id, email, full_name, phone, role_id, branch_id, is_active)
VALUES 
(
    'u0000000-0000-0000-0000-000000000001',
    'admin@nationallights.com',
    'Muhammad Amjid (Super Admin)',
    '+92 300 8400000',
    'r0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    true
),
(
    'u0000000-0000-0000-0000-000000000002',
    'field.lahore@nationallights.com',
    'Rashid Ali (Sales & Recovery Lead)',
    '+92 321 4455667',
    'r0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    true
),
(
    'u0000000-0000-0000-0000-000000000003',
    'accounts@nationallights.com',
    'Farhan Qureshi (Head of Accounts)',
    '+92 333 7788990',
    'r0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    true
),
(
    'u0000000-0000-0000-0000-000000000004',
    'warehouse@nationallights.com',
    'Bilal Ahmed (Warehouse Supervisor)',
    '+92 312 9988776',
    'r0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    true
) ON CONFLICT (email) DO NOTHING;

-- 6. Insert Sales User Profile
INSERT INTO sales_users (id, user_id, employee_code, sales_region, sales_area, target_monthly_sales, target_monthly_recovery)
VALUES (
    's0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    'EMP-SR-101',
    'Punjab North',
    'Lahore Central & Brandreth Rd',
    2500000.00,
    2200000.00
) ON CONFLICT (employee_code) DO NOTHING;

-- 7. Insert Product Categories & Brands
INSERT INTO product_categories (id, code, name, description)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'CAT-BULB', 'LED Bulbs & SMD Lamps', 'Energy-saving home and commercial LED bulbs'),
('c0000000-0000-0000-0000-000000000002', 'CAT-PANEL', 'Slim LED Panels & Downlights', 'Ceiling recessed & surface lighting panels'),
('c0000000-0000-0000-0000-000000000003', 'CAT-FLOOD', 'Heavy Duty Flood & Street Lights', 'Outdoor industrial and street luminaire series')
ON CONFLICT (code) DO NOTHING;

INSERT INTO brands (id, code, name)
VALUES 
('d0000000-0000-0000-0000-000000000001', 'BR-NL-PREMIUM', 'National Lights Pro'),
('d0000000-0000-0000-0000-000000000002', 'BR-NL-ECO', 'National EcoLine')
ON CONFLICT (code) DO NOTHING;

-- 8. Insert Products & SKUs
INSERT INTO products (id, category_id, brand_id, code, name, description, unit_of_measure)
VALUES 
('p0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'PRD-BLB-12W', 'National 12W Super Bright LED Bulb', 'E27 screw base high lumen LED bulb', 'PCS'),
('p0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'PRD-BLB-18W', 'National 18W High Output LED Bulb', 'B22 pin base high power bulb', 'PCS'),
('p0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'PRD-PNL-7W', 'National 7W SMD Concealed Downlight', '3-inch cutout warm/cool downlight', 'PCS'),
('p0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'PRD-FLD-50W', 'National 50W Industrial IP66 Flood Light', 'Die-cast aluminum high power flood luminaire', 'PCS')
ON CONFLICT (code) DO NOTHING;

INSERT INTO skus (id, product_id, sku_code, barcode, name, wattage, color_temperature, voltage, carton_quantity, trade_price, retail_price, minimum_price, reorder_level)
VALUES 
(
    'k0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    'SKU-NL-BLB12-CW',
    '896400011201',
    '12W LED Bulb (Cool Daylight 6500K)',
    '12W',
    '6500K',
    '220V-240V',
    50,
    310.00,
    380.00,
    295.00,
    200
),
(
    'k0000000-0000-0000-0000-000000000002',
    'p0000000-0000-0000-0000-000000000001',
    'SKU-NL-BLB12-WW',
    '896400011202',
    '12W LED Bulb (Warm White 3000K)',
    '12W',
    '3000K',
    '220V-240V',
    50,
    310.00,
    380.00,
    295.00,
    150
),
(
    'k0000000-0000-0000-0000-000000000003',
    'p0000000-0000-0000-0000-000000000002',
    'SKU-NL-BLB18-CW',
    '896400011801',
    '18W High Output LED (Cool Daylight)',
    '18W',
    '6500K',
    '220V-240V',
    40,
    460.00,
    550.00,
    440.00,
    100
),
(
    'k0000000-0000-0000-0000-000000000004',
    'p0000000-0000-0000-0000-000000000003',
    'SKU-NL-PNL07-CW',
    '896400020701',
    '7W SMD Downlight (Cool Daylight)',
    '7W',
    '6500K',
    '220V-240V',
    30,
    280.00,
    350.00,
    265.00,
    100
),
(
    'k0000000-0000-0000-0000-000000000005',
    'p0000000-0000-0000-0000-000000000004',
    'SKU-NL-FLD50-CW',
    '896400035001',
    '50W IP66 Outdoor Flood Light (6500K)',
    '50W',
    '6500K',
    '220V-240V',
    10,
    2150.00,
    2650.00,
    2050.00,
    25
) ON CONFLICT (sku_code) DO NOTHING;

-- 9. Insert Initial Inventory Balances & Transactions
INSERT INTO inventory_balances (warehouse_id, sku_id, quantity_on_hand, quantity_reserved, quantity_damaged)
VALUES 
('w0000000-0000-0000-0000-000000000001', 'k0000000-0000-0000-0000-000000000001', 2500, 150, 0),
('w0000000-0000-0000-0000-000000000001', 'k0000000-0000-0000-0000-000000000002', 1800, 0, 0),
('w0000000-0000-0000-0000-000000000001', 'k0000000-0000-0000-0000-000000000003', 1200, 80, 0),
('w0000000-0000-0000-0000-000000000001', 'k0000000-0000-0000-0000-000000000004', 950, 0, 0),
('w0000000-0000-0000-0000-000000000001', 'k0000000-0000-0000-0000-000000000005', 320, 20, 4)
ON CONFLICT (warehouse_id, sku_id) DO UPDATE 
SET quantity_on_hand = EXCLUDED.quantity_on_hand, last_updated_at = NOW();

-- 10. Insert Customers (Distributors & Dealers)
INSERT INTO customers (id, customer_code, company_name, contact_person, phone, email, type, address, city, region, credit_limit, credit_days, opening_balance, current_balance, is_credit_locked)
VALUES 
(
    'c1000000-0000-0000-0000-000000000001',
    'CUST-DST-001',
    'Al-Madina Electric Corporation',
    'Haji Shafiq ur Rehman',
    '+92 300 4211223',
    'shafiq@almadinaelectric.pk',
    'DISTRIBUTOR',
    'Shop 14-16, Brandreth Road, Lahore',
    'Lahore',
    'Punjab North',
    1500000.00,
    45,
    350000.00,
    580000.00,
    false
),
(
    'c1000000-0000-0000-0000-000000000002',
    'CUST-DLR-002',
    'Bright Spark Light House',
    'Chaudhry Nadeem Akhtar',
    '+92 322 8901234',
    'nadeem@brightspark.pk',
    'DEALER',
    'Shop 4, Main Hall Road Electric Market, Lahore',
    'Lahore',
    'Punjab North',
    600000.00,
    30,
    120000.00,
    240000.00,
    false
),
(
    'c1000000-0000-0000-0000-000000000003',
    'CUST-DST-003',
    'Khyber Light & Cable Centre',
    'Malik Jahangir Khan',
    '+92 333 9112244',
    'jahangir@khyberlights.pk',
    'DISTRIBUTOR',
    'Karkhano Market, Ring Road, Peshawar',
    'Peshawar',
    'KP West',
    2000000.00,
    60,
    750000.00,
    1150000.00,
    false
) ON CONFLICT (customer_code) DO NOTHING;

-- 11. Customer Assignment
INSERT INTO customer_assignments (id, customer_id, sales_user_id, is_active)
VALUES 
('ca000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', true),
('ca000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;
