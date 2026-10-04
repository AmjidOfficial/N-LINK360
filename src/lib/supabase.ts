import { createClient } from '@supabase/supabase-js';

// Clean and normalize Supabase project URL (stripping any /rest/v1 or trailing slashes)
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const envUrl = typeof import.meta !== 'undefined' && import.meta.env 
  ? (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_DEV_SUPABASE_URL || import.meta.env.VITE_PROD_SUPABASE_URL) 
  : undefined;
const envKey = typeof import.meta !== 'undefined' && import.meta.env 
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_DEV_SUPABASE_ANON_KEY || import.meta.env.VITE_PROD_SUPABASE_ANON_KEY) 
  : undefined;

const rawUrl = (envUrl as string | undefined) || 
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.VITE_DEV_SUPABASE_URL || process.env?.SUPABASE_URL)) || '';
const rawKey = (envKey as string | undefined) || 
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_DEV_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) || '';

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = rawKey?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('[YOUR') &&
  !supabaseAnonKey.includes('[YOUR') &&
  !supabaseUrl.includes('demo.supabase') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('example.com') &&
  supabaseAnonKey !== 'demo-anon-key' &&
  supabaseAnonKey !== 'placeholder' &&
  supabaseAnonKey !== 'none'
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

