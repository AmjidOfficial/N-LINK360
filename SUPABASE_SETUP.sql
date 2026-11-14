-- ============================================================================
-- N-LINK-360 MASTER SUPABASE SETUP SCRIPT (10/10 Production Ready)
-- National Lights (Pvt.) Ltd. | Head Office & Field Portal - Peshawar
-- ============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'order_booker', -- super_admin, admin, manager, order_booker, distributor, accountant
  territory TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  must_change_password BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if an earlier profiles table was already provisioned
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'order_booker';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS territory TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. PARTIES TABLE (Customers, Dealers, Distributors, Wholesalers)
CREATE TABLE IF NOT EXISTS public.parties (
  id TEXT PRIMARY KEY,
  party_code TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  city TEXT NOT NULL,
  territory TEXT NOT NULL,
  region TEXT NOT NULL,
  party_type TEXT NOT NULL DEFAULT 'DEALER', -- DEALER, DISTRIBUTOR, WHOLESALER
  credit_limit NUMERIC(12,2) DEFAULT 0.00,
  opening_balance NUMERIC(12,2) DEFAULT 0.00,
  current_balance NUMERIC(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ERP PRODUCTS TABLE (Hybrid Inventory & SKU Catalog; distinct from core UUID products table)
CREATE TABLE IF NOT EXISTS public.erp_products (
  id TEXT PRIMARY KEY,
  sku_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  carton_size INTEGER DEFAULT 1,
  trade_price NUMERIC(10,2) NOT NULL,
  retail_price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 25,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE (Sales Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  booking_date TIMESTAMPTZ DEFAULT NOW(),
  booker_id TEXT NOT NULL,
  booker_name TEXT NOT NULL,
  party_id TEXT REFERENCES public.parties(id),
  party_name TEXT NOT NULL,
  territory TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DISPATCHED, DELIVERED, CANCELLED
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.erp_products(id),
  sku_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

-- 6. PARTY LEDGERS & VOUCHERS TABLE
CREATE TABLE IF NOT EXISTS public.party_ledgers (
  id TEXT PRIMARY KEY,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  party_id TEXT REFERENCES public.parties(id),
  party_name TEXT NOT NULL,
  voucher_type TEXT NOT NULL, -- INVOICE, CRV (Cash Receipt), BRV (Bank Receipt), JV (Journal), CREDIT_NOTE
  reference_no TEXT,
  debit NUMERIC(12,2) DEFAULT 0.00,
  credit NUMERIC(12,2) DEFAULT 0.00,
  running_balance NUMERIC(12,2) NOT NULL,
  narration TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ATTENDANCE & ROUTES TABLE
CREATE TABLE IF NOT EXISTS public.attendance_routes (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  town TEXT NOT NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  status TEXT NOT NULL DEFAULT 'PRESENT',
  productive_visits INTEGER DEFAULT 0,
  non_productive_visits INTEGER DEFAULT 0,
  expenses NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'order_booker'),
    'ACTIVE'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read/write profiles" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write parties" ON public.parties;
CREATE POLICY "Allow authenticated read/write parties" ON public.parties FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write erp_products" ON public.erp_products;
CREATE POLICY "Allow authenticated read/write erp_products" ON public.erp_products FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write orders" ON public.orders;
CREATE POLICY "Allow authenticated read/write orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write order_items" ON public.order_items;
CREATE POLICY "Allow authenticated read/write order_items" ON public.order_items FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write party_ledgers" ON public.party_ledgers;
CREATE POLICY "Allow authenticated read/write party_ledgers" ON public.party_ledgers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated read/write attendance_routes" ON public.attendance_routes;
CREATE POLICY "Allow authenticated read/write attendance_routes" ON public.attendance_routes FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- REAL-TIME PUBLICATION CONFIGURATION
-- ============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.party_ledgers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SEED DATA FOR NATIONAL LIGHTS (PESHAWAR HQ)
-- ============================================================================
INSERT INTO public.erp_products (id, sku_code, item_name, category, carton_size, trade_price, retail_price, stock_quantity)
VALUES
  ('PRD-001', 'NL-12W-LED', 'National LED Bulb 12W White', 'LED Bulbs', 20, 180.00, 220.00, 500),
  ('PRD-002', 'NL-18W-LED', 'National LED Bulb 18W Bright', 'LED Bulbs', 20, 250.00, 300.00, 350),
  ('PRD-003', 'NL-PANEL-36W', 'National Ceiling LED Panel 36W', 'Panels', 10, 1200.00, 1450.00, 120),
  ('PRD-004', 'NL-FAN-56', 'National Deluxe Ceiling Fan 56"', 'Fans', 1, 4800.00, 5500.00, 80)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parties (id, party_code, business_name, contact_person, phone, city, territory, region, party_type, credit_limit, opening_balance, current_balance)
VALUES
  ('CUST-001', 'PST-D1', 'Khyber Electric Store', 'Haji Gulbaz Khan', '0300-5511223', 'Peshawar', 'Peshawar City', 'KPK', 'DEALER', 500000.00, 120000.00, 150000.00),
  ('CUST-002', 'PST-D2', 'Peshawar Light House', 'Tariq Mehmood', '0321-9876543', 'Peshawar', 'Peshawar City', 'KPK', 'DEALER', 750000.00, 200000.00, 240000.00),
  ('CUST-003', 'MRD-D1', 'Swat Electric & Traders', 'Bakhtiar Ali', '0345-1122334', 'Mingora', 'Swat', 'KPK', 'DISTRIBUTOR', 1000000.00, 450000.00, 520000.00)
ON CONFLICT (id) DO NOTHING;
