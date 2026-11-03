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

-- Auto sync existing admin email (pindahserverezeer@gmail.com) into admin_users table
CREATE OR REPLACE FUNCTION public.sync_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'pindahserverezeer@gmail.com' THEN
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
WHERE email = 'pindahserverezeer@gmail.com'
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
      OR auth.jwt() ->> 'email' = 'pindahserverezeer@gmail.com'
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
