import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://tgkldegrzhtmcpojkygh.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_NJ2AjRYwrFFnoKIbAUcUCA_ZSW-beLY';

export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

export const SUPABASE_JWKS_URL =
  process.env.SUPABASE_JWKS_URL ||
  'https://tgkldegrzhtmcpojkygh.supabase.co/auth/v1/.well-known/jwks.json';

/**
 * Server-side Supabase client for backend operations
 */
export const supabaseServer = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY || SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabaseServer;
