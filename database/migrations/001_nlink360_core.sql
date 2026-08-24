-- N-LINK 360 core PostgreSQL schema
-- National Lights Integrated Sales, Recovery, Inventory & Distribution Management
-- IDs are UUID internally plus short human-readable business codes.

create extension if not exists pgcrypto;

create type customer_type as enum ('DISTRIBUTOR','DEALER');
create type party_head as enum ('MANUFACTURER','SALES_RECOVERY','DEALERSHIP','DISTRIBUTOR','LOGISTICS');
create type order_status as enum ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','PARTIALLY_APPROVED','ON_HOLD','REJECTED','INVOICED','CANCELLED');
create type invoice_status as enum ('DRAFT','POSTED','CANCELLED');
create type recovery_status as enum ('PENDING_VERIFICATION','VERIFIED','REJECTED','CANCELLED');
create type inventory_txn_type as enum ('PRODUCTION_IN','SALES_OUT','TRANSFER_IN','TRANSFER_OUT','RETURN_IN','DAMAGE_OUT','DAMAGE_RECOVERY','ADJUSTMENT_IN','ADJUSTMENT_OUT');
create type payment_method as enum ('CASH','BANK_TRANSFER','CHEQUE','ONLINE_TRANSFER','OTHER');

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  company_code varchar(20) not null unique,
  name varchar(200) not null,
  email varchar(200),
  phone varchar(50),
  address text,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  branch_code varchar(20) not null unique,
  company_id uuid not null references companies(id),
  name varchar(150) not null,
  city varchar(100),
  status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists factories (
  id uuid primary key default gen_random_uuid(),
  factory_code varchar(20) not null unique,
  company_id uuid not null references companies(id),
  name varchar(150) not null,
  location text,
  incharge_employee_id uuid,
  status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  warehouse_code varchar(20) not null unique,
  company_id uuid not null references companies(id),
  name varchar(150) not null,
  warehouse_type varchar(30) not null default 'FACTORY_FINISHED_GOODS',
  location text,
  status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_code varchar(30) not null unique,
  name varchar(100) not null unique,
  description text,
  status boolean not null default true
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code varchar(20) not null unique,
  employee_no varchar(30) unique,
  full_name varchar(150) not null,
  mobile varchar(30),
  email varchar(200),
  role_id uuid references roles(id),
  head party_head not null,
  manager_employee_id uuid references employees(id),
  branch_id uuid references branches(id),
  factory_id uuid references factories(id),
  warehouse_id uuid references warehouses(id),
  territory varchar(100),
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table factories add constraint fk_factory_incharge foreign key (incharge_employee_id) references employees(id);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  user_code varchar(20) not null unique,
  employee_id uuid unique references employees(id),
  auth_user_id uuid unique,
  username varchar(100) unique,
  status boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  category_code varchar(20) not null unique,
  name varchar(100) not null unique,
  status boolean not null default true
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  brand_code varchar(20) not null unique,
  name varchar(100) not null unique,
  category_id uuid references product_categories(id),
  status boolean not null default true
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_code varchar(30) not null unique,
  brand_id uuid not null references brands(id),
  name varchar(150) not null,
  model varchar(100),
  wattage varchar(50),
  status boolean not null default true
);

create table if not exists skus (
  id uuid primary key default gen_random_uuid(),
  sku_code varchar(30) not null unique,
  barcode varchar(100) unique,
  product_id uuid not null references products(id),
  sku_name varchar(200) not null,
  packing_unit varchar(50) not null default 'PCS',
  units_per_carton numeric(14,3) not null default 1,
  unit_weight_kg numeric(14,4),
  carton_weight_kg numeric(14,4),
  cost_price numeric(18,2) not null default 0,
  trade_price numeric(18,2) not null default 0,
  dealer_price numeric(18,2) not null default 0,
  sale_price numeric(18,2) not null default 0,
  tax_rate numeric(7,3) not null default 0,
  reorder_level numeric(18,3) not null default 0,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_code varchar(20) not null unique,
  customer_type customer_type not null,
  name varchar(200) not null,
  owner_name varchar(150),
  mobile varchar(30),
  mobile2 varchar(30),
  address text,
  city varchar(100),
  area varchar(100),
  territory varchar(100),
  assigned_employee_id uuid references employees(id),
  credit_limit numeric(18,2) not null default 0,
  credit_days integer not null default 0,
  opening_balance numeric(18,2) not null default 0,
  opening_balance_date date,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  employee_id uuid not null references employees(id),
  start_date date not null default current_date,
  end_date date,
  is_primary boolean not null default true
);

create table if not exists customer_visits (
  id uuid primary key default gen_random_uuid(),
  visit_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  employee_id uuid not null references employees(id),
  visit_at timestamptz not null default now(),
  latitude numeric(10,7),
  longitude numeric(10,7),
  productive boolean not null default false,
  notes text
);

create table if not exists inventory_balances (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references warehouses(id),
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique(warehouse_id, sku_id)
);

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  employee_id uuid not null references employees(id),
  order_date date not null default current_date,
  previous_balance numeric(18,2) not null default 0,
  recovery_amount numeric(18,2) not null default 0,
  net_balance numeric(18,2) not null default 0,
  requested_amount numeric(18,2) not null default 0,
  status order_status not null default 'DRAFT',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales_orders(id) on delete cascade,
  line_no integer not null,
  sku_id uuid not null references skus(id),
  available_qty numeric(18,3) not null default 0,
  order_qty numeric(18,3) not null default 0,
  approved_qty numeric(18,3) not null default 0,
  unit_price numeric(18,2) not null default 0,
  line_amount numeric(18,2) not null default 0,
  unique(order_id, line_no)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_code varchar(25) not null unique,
  order_id uuid unique references sales_orders(id),
  customer_id uuid not null references customers(id),
  invoice_date date not null default current_date,
  previous_balance numeric(18,2) not null default 0,
  invoice_amount numeric(18,2) not null default 0,
  new_balance numeric(18,2) not null default 0,
  status invoice_status not null default 'DRAFT',
  posted_at timestamptz,
  posted_by uuid references employees(id),
  created_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  line_no integer not null,
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null,
  unit_price numeric(18,2) not null,
  line_amount numeric(18,2) not null,
  unique(invoice_id, line_no)
);

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_code varchar(30) not null unique,
  warehouse_id uuid not null references warehouses(id),
  sku_id uuid not null references skus(id),
  txn_type inventory_txn_type not null,
  qty numeric(18,3) not null,
  reference_type varchar(40),
  reference_id uuid,
  txn_date timestamptz not null default now(),
  posted_by uuid references employees(id),
  remarks text
);

create table if not exists transporters (
  id uuid primary key default gen_random_uuid(),
  transporter_code varchar(20) not null unique,
  name varchar(150) not null,
  phone varchar(30),
  status boolean not null default true
);

create table if not exists addas (
  id uuid primary key default gen_random_uuid(),
  adda_code varchar(20) not null unique,
  name varchar(150) not null,
  city varchar(100),
  phone varchar(30),
  status boolean not null default true
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_code varchar(20) not null unique,
  registration_no varchar(30) not null unique,
  vehicle_type varchar(80),
  owner_name varchar(150),
  phone varchar(30),
  status boolean not null default true
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  driver_code varchar(20) not null unique,
  name varchar(150) not null,
  mobile varchar(30),
  license_no varchar(80),
  status boolean not null default true
);

create table if not exists bility (
  id uuid primary key default gen_random_uuid(),
  bility_code varchar(30) not null unique,
  transporter_id uuid references transporters(id),
  adda_id uuid references addas(id),
  vehicle_id uuid references vehicles(id),
  driver_id uuid references drivers(id),
  destination text,
  freight numeric(18,2) not null default 0,
  other_charges numeric(18,2) not null default 0,
  contact_no varchar(30),
  created_at timestamptz not null default now()
);

create table if not exists dispatches (
  id uuid primary key default gen_random_uuid(),
  dispatch_code varchar(25) not null unique,
  invoice_id uuid not null references invoices(id),
  bility_id uuid references bility(id),
  dispatch_date date not null default current_date,
  status varchar(30) not null default 'READY',
  expected_delivery_date date,
  actual_delivery_date date,
  created_by uuid references employees(id)
);

create table if not exists goods_receipts (
  id uuid primary key default gen_random_uuid(),
  grn_code varchar(25) not null unique,
  dispatch_id uuid references dispatches(id),
  customer_id uuid not null references customers(id),
  received_date date not null default current_date,
  received_by uuid references employees(id),
  remarks text
);

create table if not exists goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references goods_receipts(id) on delete cascade,
  sku_id uuid not null references skus(id),
  invoice_qty numeric(18,3) not null default 0,
  received_qty numeric(18,3) not null default 0,
  short_qty numeric(18,3) not null default 0,
  excess_qty numeric(18,3) not null default 0,
  damaged_qty numeric(18,3) not null default 0
);

create table if not exists recoveries (
  id uuid primary key default gen_random_uuid(),
  recovery_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  employee_id uuid not null references employees(id),
  recovery_date date not null default current_date,
  amount numeric(18,2) not null,
  payment_method payment_method not null,
  instrument_no varchar(100),
  bank_name varchar(150),
  status recovery_status not null default 'PENDING_VERIFICATION',
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  ledger_code varchar(30) not null unique,
  customer_id uuid not null references customers(id),
  entry_date timestamptz not null default now(),
  reference_type varchar(40) not null,
  reference_id uuid,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  running_balance numeric(18,2) not null default 0,
  posted_by uuid references employees(id),
  remarks text
);

create table if not exists stock_returns (
  id uuid primary key default gen_random_uuid(),
  return_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  invoice_id uuid references invoices(id),
  employee_id uuid not null references employees(id),
  return_date date not null default current_date,
  status varchar(30) not null default 'PENDING_APPROVAL',
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists stock_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references stock_returns(id) on delete cascade,
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null,
  condition varchar(30) not null default 'SALEABLE',
  remarks text
);

create table if not exists damage_stock (
  id uuid primary key default gen_random_uuid(),
  damage_code varchar(25) not null unique,
  customer_id uuid references customers(id),
  sku_id uuid not null references skus(id),
  qty numeric(18,3) not null,
  reported_by uuid not null references employees(id),
  report_date date not null default current_date,
  evidence_url text,
  status varchar(30) not null default 'PENDING_INSPECTION',
  resolution varchar(30),
  remarks text
);

create table if not exists credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  reference_id uuid,
  amount numeric(18,2) not null,
  reason text,
  posted_by uuid references employees(id),
  posted_at timestamptz
);

create table if not exists debit_notes (
  id uuid primary key default gen_random_uuid(),
  debit_note_code varchar(25) not null unique,
  customer_id uuid not null references customers(id),
  reference_id uuid,
  amount numeric(18,2) not null,
  reason text,
  posted_by uuid references employees(id),
  posted_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  audit_code varchar(30) not null unique,
  user_id uuid references users(id),
  action varchar(50) not null,
  module varchar(50) not null,
  record_type varchar(80),
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  title varchar(200) not null,
  message text not null,
  notification_type varchar(50),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_type on customers(customer_type);
create index if not exists idx_customers_assigned on customers(assigned_employee_id);
create index if not exists idx_skus_product on skus(product_id);
create index if not exists idx_inventory_sku_warehouse on inventory_transactions(sku_id, warehouse_id, txn_date);
create index if not exists idx_orders_customer_date on sales_orders(customer_id, order_date);
create index if not exists idx_invoices_customer_date on invoices(customer_id, invoice_date);
create index if not exists idx_ledger_customer_date on ledger_entries(customer_id, entry_date);
create index if not exists idx_recoveries_customer_date on recoveries(customer_id, recovery_date);

-- Recommended short ID prefixes:
-- CMP company, BR branch, FAC factory, WH warehouse, EMP employee,
-- USR user, CAT category, BRD brand, PRD product, SKU SKU,
-- DST distributor, DLR dealer, ORD order, INV invoice, DSP dispatch,
-- BIL bility, REC recovery, LGR ledger, RET return, DMG damage.
