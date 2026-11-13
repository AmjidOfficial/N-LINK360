-- ==============================================================================
-- N-LINK-360 | Phase 1 Role-Based Dashboard Architecture, Organizational Scope
-- & Row Level Security (RLS) Migration
-- ==============================================================================
-- Hierarchy: National -> Region -> Zone -> Territory -> Town -> Team -> Distributor -> Dealer
-- Role Rule: TSM = SS = OB = ASM = SALES_RECOVERY -> Canonical FIELD_SALES_USER
-- ==============================================================================

-- 1. Seed New & Canonical Roles
INSERT INTO public.roles (name, description) VALUES
  ('NATIONAL_MANAGER', 'National Sales Manager with national hierarchy oversight'),
  ('RSM', 'Regional Sales Manager scoped to assigned Region'),
  ('ZSM', 'Zonal Sales Manager scoped to assigned Zone'),
  ('FIELD_SALES_USER', 'Unified Field Sales execution group (TSM / Sales Supervisor / Sales Officer)'),
  ('WAREHOUSE_MANAGER', 'Warehouse inventory, picking, and packing management'),
  ('DISPATCH_OFFICER', 'Dispatch, bilty, vehicle loading, and delivery tracking'),
  ('HR_ADMIN', 'HR, attendance, leave management, and employee administration'),
  ('DISTRIBUTOR', 'Authorized external distributor with access to own account and linked dealers'),
  ('DEALER', 'Authorized external dealer with strict access to own orders, invoices, and ledger')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Extended Dashboard & Departmental Permissions
INSERT INTO public.permissions (name, description) VALUES
  ('dashboard.configure', 'Configure per-role dashboard KPI and chart visibility'),
  ('invoice.create', 'Generate customer invoices from approved orders'),
  ('invoice.post', 'Post finalized invoices and print official copies'),
  ('inventory.view', 'View live stock balances and warehouse positions'),
  ('inventory.manage', 'Record stock inflows, outflows, and packing'),
  ('dispatch.manage', 'Assign bilties, vehicles, and confirm delivery'),
  ('hr.view', 'View employee attendance logs and workforce rosters'),
  ('hr.manage', 'Approve leave requests and administer HR records')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to new roles idempotently
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name IN ('SUPER_ADMIN', 'MANAGEMENT') AND p.name IN ('dashboard.configure', 'hr.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'FIELD_SALES_USER'
  AND p.name IN ('dashboard.view', 'sales.customers', 'sales.order', 'recovery.collect', 'ledger.view', 'inventory.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name IN ('NATIONAL_MANAGER', 'RSM', 'ZSM')
  AND p.name IN ('dashboard.view', 'sales.customers', 'sales.order', 'recovery.collect', 'ledger.view', 'inventory.view', 'reports.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'WAREHOUSE_MANAGER'
  AND p.name IN ('dashboard.view', 'inventory.view', 'inventory.manage', 'dispatch.manage', 'reports.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'DISPATCH_OFFICER'
  AND p.name IN ('dashboard.view', 'dispatch.manage', 'inventory.view', 'invoice.post')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'HR_ADMIN'
  AND p.name IN ('dashboard.view', 'hr.view', 'hr.manage', 'reports.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'DISTRIBUTOR'
  AND p.name IN ('dashboard.view', 'sales.customers', 'sales.order', 'ledger.view', 'inventory.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'DEALER'
  AND p.name IN ('dashboard.view', 'sales.order', 'ledger.view')
ON CONFLICT DO NOTHING;

-- 3. Extend User Profiles with Organizational Hierarchy & Partner Linkage
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permission_group VARCHAR(60),
  ADD COLUMN IF NOT EXISTS region VARCHAR(120),
  ADD COLUMN IF NOT EXISTS zone VARCHAR(120),
  ADD COLUMN IF NOT EXISTS territory VARCHAR(120),
  ADD COLUMN IF NOT EXISTS towns TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team VARCHAR(120),
  ADD COLUMN IF NOT EXISTS distributor_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS dealer_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_profiles_role_scope ON public.profiles (role_name, region, zone, territory);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_links ON public.profiles (distributor_id, dealer_id);

-- 4. Organizational Hierarchy Tree Table
CREATE TABLE IF NOT EXISTS public.hierarchy_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level VARCHAR(30) NOT NULL CHECK (level IN ('NATIONAL', 'REGION', 'ZONE', 'TERRITORY', 'TOWN', 'TEAM')),
  code VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  parent_id UUID REFERENCES public.hierarchy_nodes(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.hierarchy_nodes ENABLE ROW LEVEL SECURITY;

-- 5. Centralized Dashboard Role Visibility Configuration Table
CREATE TABLE IF NOT EXISTS public.dashboard_role_configs (
  role_key VARCHAR(60) PRIMARY KEY,
  hidden_kpis TEXT[] DEFAULT '{}',
  kpi_order TEXT[] DEFAULT '{}',
  hidden_charts TEXT[] DEFAULT '{}',
  hidden_sections TEXT[] DEFAULT '{}',
  hidden_quick_actions TEXT[] DEFAULT '{}',
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.dashboard_role_configs ENABLE ROW LEVEL SECURITY;

-- 6. Authoritative Security Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.nlink_current_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
      CASE
        WHEN p.role_name IN ('TSM', 'SS', 'OB', 'ASM', 'SALES_RECOVERY') THEN 'FIELD_SALES_USER'
        ELSE p.role_name
      END
     FROM public.profiles p
     WHERE p.id = auth.uid()
     LIMIT 1),
    'ANONYMOUS'
  );
$$;

CREATE OR REPLACE FUNCTION public.nlink_is_company_wide_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.nlink_current_role() IN (
    'SUPER_ADMIN', 'MANAGEMENT', 'NATIONAL_MANAGER', 'SALES_MANAGER',
    'ACCOUNTS', 'WAREHOUSE_MANAGER', 'FACTORY_MANAGER', 'DISPATCH_OFFICER', 'HR_ADMIN'
  );
$$;

-- 7. Tighten Profiles RLS (Replace legacy open SELECT USING (true) policy)
DROP POLICY IF EXISTS "Allow users to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Scoped profile access" ON public.profiles;
CREATE POLICY "Scoped profile access" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.nlink_current_role() IN ('SUPER_ADMIN', 'MANAGEMENT', 'HR_ADMIN', 'NATIONAL_MANAGER')
    OR (
      public.nlink_current_role() = 'RSM'
      AND region IS NOT NULL
      AND region = (SELECT p2.region FROM public.profiles p2 WHERE p2.id = auth.uid())
    )
    OR (
      public.nlink_current_role() = 'ZSM'
      AND zone IS NOT NULL
      AND zone = (SELECT p2.zone FROM public.profiles p2 WHERE p2.id = auth.uid())
    )
  );

-- Hierarchy nodes RLS
DROP POLICY IF EXISTS "Authenticated users read hierarchy nodes" ON public.hierarchy_nodes;
CREATE POLICY "Authenticated users read hierarchy nodes" ON public.hierarchy_nodes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage hierarchy nodes" ON public.hierarchy_nodes;
CREATE POLICY "Admins manage hierarchy nodes" ON public.hierarchy_nodes
  FOR ALL USING (public.nlink_current_role() IN ('SUPER_ADMIN', 'MANAGEMENT', 'NATIONAL_MANAGER'));

-- Dashboard Role Configs RLS
DROP POLICY IF EXISTS "Users read own or admin dashboard configs" ON public.dashboard_role_configs;
CREATE POLICY "Users read own or admin dashboard configs" ON public.dashboard_role_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins update dashboard configs" ON public.dashboard_role_configs;
CREATE POLICY "Admins update dashboard configs" ON public.dashboard_role_configs
  FOR ALL USING (public.nlink_current_role() IN ('SUPER_ADMIN', 'MANAGEMENT'));

-- 8. Conditional Scoped RLS Policies for Existing Operational Tables (if provisioned)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "nlink_customers_scoped_select" ON public.customers';
    EXECUTE $pol$
      CREATE POLICY "nlink_customers_scoped_select" ON public.customers
        FOR SELECT USING (
          public.nlink_is_company_wide_role()
          OR EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
              AND (
                (public.nlink_current_role() = 'DEALER' AND (id::text = me.dealer_id OR customer_code = me.dealer_id))
                OR (public.nlink_current_role() = 'DISTRIBUTOR' AND (id::text = me.distributor_id OR customer_code = me.distributor_id))
                OR (public.nlink_current_role() = 'RSM' AND region = me.region)
                OR (public.nlink_current_role() = 'ZSM' AND (zone = me.zone OR town = ANY(me.towns)))
                OR (public.nlink_current_role() = 'FIELD_SALES_USER' AND (territory = me.territory OR town = ANY(me.towns)))
              )
          )
        )
    $pol$;
  END IF;
END $$;
