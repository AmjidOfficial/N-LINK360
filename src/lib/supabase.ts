import { createClient } from '@supabase/supabase-js';

// Clean and normalize Supabase project URL (stripping any /rest/v1 or trailing slashes)
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

const rawUrl = (envUrl as string | undefined) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const rawKey = (envKey as string | undefined) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = rawKey?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
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

