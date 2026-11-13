-- ==============================================================================
-- N-LINK 360 - 008_core_erp_master_architecture.sql
-- CORE ERP MASTER MODULE: EMPLOYEES + CUSTOMERS + INVENTORY + INVOICING + LEDGER + SKU MASTER
-- ==============================================================================

-- 1. Controlled Designation Master Table
create table if not exists public.designations (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(100) not null,
  description text,
  department varchar(100) not null default 'SALES',
  grade_level varchar(20) default 'L1',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed standard enterprise designations if not present
insert into public.designations (code, name, description, department, grade_level) values
('NSM', 'National Sales Manager', 'National sales head supervising all regions', 'SALES', 'EXECUTIVE'),
('RSM', 'Regional Sales Manager', 'Supervising regional sales teams & territories', 'SALES', 'MANAGEMENT'),
('ASM', 'Area Sales Manager', 'Managing area operations and target realization', 'SALES', 'MANAGEMENT'),
('TSM', 'Territory Sales Manager', 'Managing territory routes and field staff', 'SALES', 'SUPERVISORY'),
('SS', 'Sales Supervisor', 'Town and distributor execution supervisor', 'SALES', 'SUPERVISORY'),
('OB', 'Field Sales / Recovery (Order Booker)', 'Field order booking, customer visits and recovery', 'SALES', 'FIELD'),
('HO', 'Head Office Operations', 'Central executive administration & approvals', 'OPERATIONS', 'EXECUTIVE'),
('FINANCE', 'Finance & Accounts', 'Financial ledgers, posting, and recovery audit', 'FINANCE', 'MANAGEMENT'),
('WAREHOUSE', 'Warehouse & Inventory', 'Stock movement, storage, receiving and dispatch', 'LOGISTICS', 'OPERATIONS'),
('HR', 'Human Resources', 'Personnel records, designations and payroll', 'HR', 'MANAGEMENT'),
('ADMIN', 'System Administrator', 'Full platform configuration and RBAC control', 'IT', 'EXECUTIVE')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    department = excluded.department,
    grade_level = excluded.grade_level;

-- 2. Employee Master Table (Separated from Login/User Accounts)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code varchar(50) not null unique,
  full_name varchar(150) not null,
  father_name varchar(150),
  cnic varchar(30),
  mobile varchar(30) not null,
  whatsapp varchar(30),
  email varchar(120),
  address text,
  joining_date date not null default current_date,
  employment_status varchar(30) not null default 'ACTIVE', -- ACTIVE, PROBATION, ON_LEAVE, TERMINATED, RESIGNED
  department varchar(100) not null default 'SALES',
  designation_id uuid references public.designations(id),
  designation_code varchar(50),
  reporting_manager_id uuid references public.employees(id),
  profile_photo_url text,
  documents jsonb default '[]'::jsonb,
  user_id uuid references public.users(id), -- Linked system login account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_code on public.employees(employee_code);
create index if not exists idx_employees_designation on public.employees(designation_id);
create index if not exists idx_employees_reporting on public.employees(reporting_manager_id);
create index if not exists idx_employees_user on public.employees(user_id);

-- 3. Employee Salary History Table (Immutable History)
create table if not exists public.employee_salaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  basic_salary numeric(14,2) not null default 0.00,
  allowances jsonb default '[]'::jsonb, -- e.g. [{"name": "Fuel", "amount": 15000}, {"name": "Mobile", "amount": 5000}]
  gross_salary numeric(14,2) not null default 0.00,
  effective_from date not null,
  effective_to date, -- NULL means currently active
  salary_status varchar(30) not null default 'ACTIVE', -- ACTIVE, ARCHIVED, SUPERSEDED
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_salaries_emp on public.employee_salaries(employee_id);
create index if not exists idx_employee_salaries_effective on public.employee_salaries(effective_from, effective_to);

-- 4. Employee Town / Organizational Assignments (Region -> Area -> Territory -> Town)
create table if not exists public.employee_town_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  region_id uuid references public.regions(id),
  area_id uuid references public.areas(id),
  territory_id uuid references public.territories(id),
  town_id uuid references public.towns(id),
  route_id uuid references public.routes(id),
  is_active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now()
);

create index if not exists idx_emp_town_assignments_emp on public.employee_town_assignments(employee_id);
create index if not exists idx_emp_town_assignments_town on public.employee_town_assignments(town_id);

-- 5. Sales & Recovery Targets (Time-series / Multi-level Target History)
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  target_type varchar(30) not null default 'SALES', -- SALES, RECOVERY
  period_type varchar(30) not null default 'MONTHLY', -- DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  period_key varchar(30) not null, -- e.g., '2026-08', '2026-W35', '2026-Q3'
  employee_id uuid references public.employees(id),
  designation_code varchar(50),
  region_id uuid references public.regions(id),
  area_id uuid references public.areas(id),
  territory_id uuid references public.territories(id),
  town_id uuid references public.towns(id),
  customer_id uuid references public.customers(id),
  target_value numeric(14,2) not null default 0.00,
  target_quantity numeric(14,2) default 0.00,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_targets_emp_period on public.sales_targets(employee_id, period_key, target_type);
create index if not exists idx_targets_cust_period on public.sales_targets(customer_id, period_key, target_type);

-- 6. SKU Master Versioning & Packaging / Price History
create table if not exists public.sku_versions (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.skus(id) on delete cascade,
  version_number integer not null default 1,
  effective_from timestamptz not null default now(),
  effective_to timestamptz, -- NULL means currently active version
  packaging_unit varchar(30) not null default 'CARTON',
  units_per_pack integer not null default 1,
  packs_per_carton integer not null default 50,
  units_per_carton integer not null default 50,
  carton_rate numeric(12,2) not null default 0.00,
  trade_price numeric(12,2) not null default 0.00, -- Rate per piece
  retail_price numeric(12,2) not null default 0.00,
  dealer_price numeric(12,2) not null default 0.00,
  cost_price numeric(12,2) default 0.00,
  tax_rate numeric(6,2) not null default 18.00,
  status varchar(30) not null default 'ACTIVE', -- ACTIVE, INACTIVE, DISCONTINUED, REPLACED
  change_reason text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_sku_versions_sku on public.sku_versions(sku_id);
create index if not exists idx_sku_versions_dates on public.sku_versions(effective_from, effective_to);

-- 7. Helper Function: Dynamic Town-Based Customer Resolution
create or replace function public.nlink_get_employee_town_customers(p_employee_id uuid)
returns table (
  customer_id uuid,
  customer_code varchar,
  customer_name varchar,
  customer_type customer_type,
  town_name varchar,
  credit_limit numeric,
  current_balance numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  select distinct
    c.id as customer_id,
    c.customer_code,
    c.name as customer_name,
    c.customer_type,
    t.name as town_name,
    c.credit_limit,
    c.opening_balance as current_balance
  from public.customers c
  left join public.towns t on t.id = c.town_id
  where c.status = true
    and (
      c.assigned_employee_id = p_employee_id
      or c.town_id in (
        select eta.town_id 
        from public.employee_town_assignments eta 
        where eta.employee_id = p_employee_id and eta.is_active = true
      )
      or c.territory_id in (
        select eta.territory_id 
        from public.employee_town_assignments eta 
        where eta.employee_id = p_employee_id and eta.is_active = true and eta.town_id is null
      )
    );
end;
$$;

grant execute on function public.nlink_get_employee_town_customers(uuid) to authenticated;

-- 8. Customer Code Generator Function (Format: CUST-DLR-XXXX or CUST-DST-XXXX)
create or replace function public.nlink_generate_customer_code(
  p_type text,
  p_town_name text default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_prefix text := 'CUST';
  v_type_code text := 'DLR';
  v_seq integer;
  v_code text;
begin
  if upper(p_type) = 'DISTRIBUTOR' then
    v_type_code := 'DST';
  elsif upper(p_type) = 'DEALER' then
    v_type_code := 'DLR';
  else
    v_type_code := 'RET';
  end if;

  select coalesce(count(*), 0) + 1 into v_seq
  from public.customers
  where customer_type::text = upper(p_type);

  v_code := v_prefix || '-' || v_type_code || '-' || lpad(v_seq::text, 4, '0');
  
  -- Ensure unique
  while exists (select 1 from public.customers where customer_code = v_code) loop
    v_seq := v_seq + 1;
    v_code := v_prefix || '-' || v_type_code || '-' || lpad(v_seq::text, 4, '0');
  end loop;

  return v_code;
end;
$$;

grant execute on function public.nlink_generate_customer_code(text, text) to authenticated;
