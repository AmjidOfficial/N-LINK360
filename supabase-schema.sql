-- ==============================================================================
-- N-LINK 360 - Database Schema Provisioning File (Supabase SQL)
-- Project: N-LINK360 Enterprise Monorepo
-- Target Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Create ROLES Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to roles" ON public.roles FOR SELECT USING (true);

-- 2. Create PERMISSIONS Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to permissions" ON public.permissions FOR SELECT USING (true);

-- 3. Create ROLE_PERMISSIONS Join Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Enable RLS for Role Permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to role_permissions" ON public.role_permissions FOR SELECT USING (true);

-- 4. Create USERS Profile Table (linked to Supabase Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role_name VARCHAR(50) REFERENCES public.roles(name) ON DELETE SET NULL,
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for User Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- INITIAL CORE DATA SEEDING
-- ==============================================================================

-- Seed Initial Roles
INSERT INTO public.roles (name, description) VALUES
('SUPER_ADMIN', 'Sole Signing Authority, System Owner, and Absolute Administrator'),
('MANAGEMENT', 'Executive Officers, Managing Directors, and Head Office Board'),
('SALES_RECOVERY', 'Field Force Officers responsible for Order Booking & Recovery Collections'),
('ACCOUNTS', 'Head Office Accountants, Ledgers Auditing & Payment Verification')
ON CONFLICT (name) DO NOTHING;

-- Seed Core Permissions
INSERT INTO public.permissions (name, description) VALUES
('dashboard.view', 'Access and view real-time operations dashboards'),
('sales.customers', 'View and register customers / dealers within assigned routes'),
('sales.order', 'Create, validate, and place sales orders / bookings'),
('recovery.collect', 'Log in-customer collection and recovery records'),
('recovery.verify', 'Verify bank/cash collections and update ledger balances'),
('ledger.view', 'View 360-degree party ledgers and audit statements'),
('ledger.manage', 'Perform balance adjustments and ledger synchronization'),
('reports.view', 'Access detailed operational, town, and recovery reports'),
('settings.manage', 'Modify system constants, rates, and Google Sheet sync rules')
ON CONFLICT (name) DO NOTHING;

-- Map Core Permissions to Roles

-- A. SUPER_ADMIN gets ALL permissions mapped
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- B. MANAGEMENT permissions mapping
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'MANAGEMENT'
  AND p.name IN ('dashboard.view', 'reports.view', 'ledger.view', 'sales.customers', 'recovery.verify')
ON CONFLICT DO NOTHING;

-- C. SALES_RECOVERY permissions mapping
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'SALES_RECOVERY'
  AND p.name IN ('dashboard.view', 'sales.customers', 'sales.order', 'recovery.collect', 'ledger.view')
ON CONFLICT DO NOTHING;

-- D. ACCOUNTS permissions mapping
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'ACCOUNTS'
  AND p.name IN ('dashboard.view', 'ledger.view', 'ledger.manage', 'recovery.verify', 'recovery.collect', 'reports.view')
ON CONFLICT DO NOTHING;
