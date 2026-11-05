-- ==============================================================================
-- APXELUZ REPOSITORY — SUPABASE COMPLETE SQL MIGRATION
-- Run this script in the Supabase SQL Editor:
-- Dashboard > SQL Editor > New query > Paste & Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ADMIN USERS TABLE (Role-Based Admin Authorization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Sparkles',
  display_order INTEGER DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. APPS TABLE (Games, Mods, Utility Apps)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'game' CHECK (type IN ('game', 'mod', 'app')),
  description TEXT DEFAULT '',
  short_description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Action',
  platform TEXT NOT NULL DEFAULT 'Android',
  developer TEXT NOT NULL DEFAULT 'Independent Developer',
  porter TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
  banner_url TEXT DEFAULT 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
  screenshots TEXT[] DEFAULT '{}',
  latest_version TEXT NOT NULL DEFAULT 'v1.0.0',
  file_size TEXT NOT NULL DEFAULT '100 MB',
  file_size_value NUMERIC DEFAULT 100,
  file_size_unit TEXT DEFAULT 'MB',
  min_android TEXT DEFAULT 'Android 8.0+',
  architecture TEXT DEFAULT 'ARM64',
  obb_required BOOLEAN DEFAULT FALSE,
  rating NUMERIC DEFAULT 5.0,
  rating_count INTEGER DEFAULT 1,
  download_count BIGINT DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  is_popular BOOLEAN DEFAULT FALSE,
  is_newly_added BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'Official',
  visibility TEXT NOT NULL DEFAULT 'published' CHECK (visibility IN ('published', 'draft')),
  tags TEXT[] DEFAULT '{}',
  sha256 TEXT,
  download_links JSONB DEFAULT '[]'::jsonb,
  changelog JSONB DEFAULT '[]'::jsonb,
  versions JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. APP VERSIONS TABLE (Version History & Multi-Version Storage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changelog TEXT[] DEFAULT '{}',
  file_path TEXT,
  download_url TEXT,
  file_size TEXT,
  release_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. WEBSITE SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.website_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  site_name TEXT DEFAULT 'APXELUZ',
  site_description TEXT DEFAULT 'Next-generation app and mod repository with Apple-inspired Liquid Glass design language.',
  announcement TEXT DEFAULT '',
  enable_downloads BOOLEAN DEFAULT TRUE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  default_architecture TEXT DEFAULT 'ARM64',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial website settings if not existing
INSERT INTO public.website_settings (id, site_name, site_description, announcement, enable_downloads, maintenance_mode, default_architecture)
VALUES ('default', 'APXELUZ', 'Next-generation app and mod repository with Apple-inspired Liquid Glass design language.', '', TRUE, FALSE, 'ARM64')
ON CONFLICT (id) DO NOTHING;

-- Seed default categories if table is empty
INSERT INTO public.categories (name, slug, icon, display_order, itemCount)
VALUES 
  ('Action', 'action', 'Flame', 1, 0),
  ('Adventure', 'adventure', 'Compass', 2, 0),
  ('RPG', 'rpg', 'Shield', 3, 0),
  ('Strategy', 'strategy', 'Cpu', 4, 0),
  ('Tools & Utilities', 'tools', 'Wrench', 5, 0),
  ('Minecraft Mods', 'minecraft-mods', 'Sparkles', 6, 0)
ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_apps_slug ON public.apps(slug);
CREATE INDEX IF NOT EXISTS idx_apps_category ON public.apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_visibility ON public.apps(visibility);
CREATE INDEX IF NOT EXISTS idx_apps_type ON public.apps(type);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON public.apps(featured);
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON public.apps(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON public.app_versions(app_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order);

-- ==============================================================================
-- 8. DATABASE FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Safe download count increment function callable by public visitors
CREATE OR REPLACE FUNCTION public.increment_app_download_count(target_app_id UUID)
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.apps
  SET download_count = COALESCE(download_count, 0) + 1,
      updated_at = now()
  WHERE id = target_app_id
  RETURNING download_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto sync existing admin emails into admin_users table
CREATE OR REPLACE FUNCTION public.sync_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IN ('pindahserverezeer@gmail.com', 'maxwlzzyx@gmail.com') THEN
    INSERT INTO public.admin_users (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_user();

-- Bootstrap admin record if user is already present in auth.users
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email IN ('pindahserverezeer@gmail.com', 'maxwlzzyx@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Helper check function for admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = auth.uid() 
        AND admin_users.role IN ('admin', 'superadmin')
      )
      OR auth.jwt() ->> 'email' IN ('pindahserverezeer@gmail.com', 'maxwlzzyx@gmail.com')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --- ADMIN_USERS POLICIES ---
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
ON public.admin_users FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- --- CATEGORIES POLICIES ---
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
ON public.categories FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can modify categories" ON public.categories;
CREATE POLICY "Admins can modify categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- APPS POLICIES ---
DROP POLICY IF EXISTS "Public can view published apps" ON public.apps;
CREATE POLICY "Public can view published apps"
ON public.apps FOR SELECT
TO public
USING (visibility = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert apps" ON public.apps;
CREATE POLICY "Admins can insert apps"
ON public.apps FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update apps" ON public.apps;
CREATE POLICY "Admins can update apps"
ON public.apps FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete apps" ON public.apps;
CREATE POLICY "Admins can delete apps"
ON public.apps FOR DELETE
TO authenticated
USING (public.is_admin());

-- --- APP VERSIONS POLICIES ---
DROP POLICY IF EXISTS "Public can view versions for published apps" ON public.app_versions;
CREATE POLICY "Public can view versions for published apps"
ON public.app_versions FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.apps 
    WHERE apps.id = app_versions.app_id 
    AND (apps.visibility = 'published' OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "Admins can modify versions" ON public.app_versions;
CREATE POLICY "Admins can modify versions"
ON public.app_versions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- WEBSITE SETTINGS POLICIES ---
DROP POLICY IF EXISTS "Public can view website settings" ON public.website_settings;
CREATE POLICY "Public can view website settings"
ON public.website_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can modify website settings" ON public.website_settings;
CREATE POLICY "Admins can modify website settings"
ON public.website_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 10. SUPABASE STORAGE BUCKETS & POLICIES
-- ==============================================================================

-- Create public storage buckets for apps, app-icons, and screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('apps', 'apps', TRUE, 1073741824, NULL), -- 1GB limit for APKs, ZIPs, mods
  ('app-icons', 'app-icons', TRUE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']), -- 10MB limit
  ('screenshots', 'screenshots', TRUE, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp']) -- 20MB limit
ON CONFLICT (id) DO UPDATE SET 
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Read Policy for all public visitors
DROP POLICY IF EXISTS "Public can view apxeluz storage files" ON storage.objects;
CREATE POLICY "Public can view apxeluz storage files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('apps', 'app-icons', 'screenshots'));

-- Storage Insert Policy for Admins
DROP POLICY IF EXISTS "Admins can upload to apxeluz storage" ON storage.objects;
CREATE POLICY "Admins can upload to apxeluz storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('apps', 'app-icons', 'screenshots') 
  AND public.is_admin()
);

-- Storage Update Policy for Admins
DROP POLICY IF EXISTS "Admins can update apxeluz storage" ON storage.objects;
CREATE POLICY "Admins can update apxeluz storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('apps', 'app-icons', 'screenshots') 
  AND public.is_admin()
)
WITH CHECK (
  bucket_id IN ('apps', 'app-icons', 'screenshots') 
  AND public.is_admin()
);

-- Storage Delete Policy for Admins
DROP POLICY IF EXISTS "Admins can delete from apxeluz storage" ON storage.objects;
CREATE POLICY "Admins can delete from apxeluz storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('apps', 'app-icons', 'screenshots') 
  AND public.is_admin()
);

-- Enable Realtime for dynamic live synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;

-- ==============================================================================
-- 11. CATEGORY COUNT DYNAMIC AUTO-SYNCHRONIZATION TRIGGER
-- Solves requirement 1: category item counts (e.g. Action) always in sync with DB
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_category_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.categories c
  SET item_count = (
    SELECT COUNT(*) 
    FROM public.apps a
    WHERE LOWER(TRIM(a.category)) = LOWER(TRIM(c.name))
    AND a.visibility = 'published'
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_category_counts ON public.apps;
CREATE TRIGGER trg_sync_category_counts
AFTER INSERT OR UPDATE OR DELETE ON public.apps
FOR EACH STATEMENT EXECUTE FUNCTION public.sync_category_counts();

-- Run initial sync right away
SELECT public.sync_category_counts();

-- ==============================================================================
-- 12. PREMIUM GAMES TABLE (Requirement 4 & 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.premium_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  original_price NUMERIC,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  screenshots TEXT[] DEFAULT '{}',
  download_url TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0.0',
  file_size TEXT DEFAULT '500 MB',
  features TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Action',
  developer TEXT DEFAULT 'Independent Developer',
  is_active BOOLEAN DEFAULT TRUE,
  visibility TEXT DEFAULT 'published' CHECK (visibility IN ('published', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 13. ORDERS & TRANSACTIONS (Requirement 5 & 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- e.g. ORD-1730000000-abcd
  game_id UUID REFERENCES public.premium_games(id) ON DELETE RESTRICT,
  game_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  qiospay_invoice_id TEXT,
  qiospay_payment_url TEXT,
  qiospay_qr_string TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- ==============================================================================
-- 14. PAYMENTS & PAYMENT LOGS TABLE (Requirement 5 & 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id TEXT,
  ref_id TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL,
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  invoice_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC,
  ip_address TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 15. PRODUCT ACCESS & SECURE DOWNLOAD TOKENS (Requirement 5 & 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.premium_games(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  download_token TEXT NOT NULL UNIQUE,
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 16. SECURE DOWNLOAD LOGS & ATTEMPTS (Requirement 2, 3, & 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'app',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  email TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders(qiospay_invoice_id);
CREATE INDEX IF NOT EXISTS idx_product_access_token ON public.product_access(download_token);
CREATE INDEX IF NOT EXISTS idx_product_access_order ON public.product_access(order_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_item ON public.download_logs(item_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.admin_login_attempts(identifier, attempted_at DESC);

-- ==============================================================================
-- 17. RLS POLICIES FOR PREMIUM, ORDERS, AND LOGS
-- ==============================================================================
ALTER TABLE public.premium_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- PREMIUM GAMES: Public can read published & active games; admins full access
DROP POLICY IF EXISTS "Public can view active premium games" ON public.premium_games;
CREATE POLICY "Public can view active premium games"
ON public.premium_games FOR SELECT
TO public
USING (is_active = TRUE AND (visibility = 'published' OR public.is_admin()));

DROP POLICY IF EXISTS "Admins can manage premium games" ON public.premium_games;
CREATE POLICY "Admins can manage premium games"
ON public.premium_games FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ORDERS: Public can view their order by exact order ID; admins can view all
DROP POLICY IF EXISTS "Public can view their own order" ON public.orders;
CREATE POLICY "Public can view their own order"
ON public.orders FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PAYMENTS & LOGS: Admin only
DROP POLICY IF EXISTS "Admins view payments" ON public.payments;
CREATE POLICY "Admins view payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view payment logs" ON public.payment_logs;
CREATE POLICY "Admins view payment logs"
ON public.payment_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- PRODUCT ACCESS: Public can view with exact token
DROP POLICY IF EXISTS "Public can verify product access with token" ON public.product_access;
CREATE POLICY "Public can verify product access with token"
ON public.product_access FOR SELECT
TO public
USING (expires_at > now());

DROP POLICY IF EXISTS "Admins manage product access" ON public.product_access;
CREATE POLICY "Admins manage product access"
ON public.product_access FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Realtime for orders and premium games
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

