import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('[YOUR_DEV_REF]'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (isSupabaseConfigured) {
  console.log('🔌 N-LINK 360: Supabase database client initialized successfully.');
} else {
  console.log('ℹ️ N-LINK 360: Supabase credentials not found/configured. Operating in offline-fallback in-memory mode.');
}
