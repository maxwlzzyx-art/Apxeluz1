import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) || 'https://tgkldegrzhtmcpojkygh.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  'sb_publishable_NJ2AjRYwrFFnoKIbAUcUCA_ZSW-beLY';

const effectiveKey = SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'apxeluz_supabase_auth_session',
  },
});

export default supabase;
