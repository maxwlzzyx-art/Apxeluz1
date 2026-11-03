import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) || 'https://tgkldegrzhtmcpojkygh.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

// Safe fallback placeholder to prevent client initialization crash if key not yet injected
const effectiveKey =
  SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2xkZWdyemh0bWNwb2preWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0Mzg0MDAsImV4cCI6MjAyNTAxNDQwMH0.placeholder';

export const supabase = createClient(SUPABASE_URL, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'apxeluz_supabase_auth_session',
  },
});

export default supabase;
