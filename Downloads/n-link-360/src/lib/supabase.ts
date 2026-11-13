import { createClient } from '@supabase/supabase-js';

// Clean and normalize Supabase project URL (stripping any /rest/v1 or trailing slashes)
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://nigvxsjrvkmynwduvemy.supabase.co';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_fqnVbiThIN9HpkCebQb42Q_7U3pfkxi';

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = rawKey?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('[YOUR') &&
  !supabaseAnonKey.includes('[YOUR')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

