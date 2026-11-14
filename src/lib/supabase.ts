import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch {}
  return '';
};

function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/rest\/v1$/i, '');
}

function isServiceRoleJwt(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

const rawSupabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const rawSupabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY').trim();
const hasServiceRoleLeak = isServiceRoleJwt(rawSupabaseAnonKey);

if (hasServiceRoleLeak && typeof console !== 'undefined') {
  console.error(
    '[N-LINK 360 Security] VITE_SUPABASE_ANON_KEY contains a service_role key. Refusing to initialize browser client with service_role privileges; please use your Supabase anon/publishable key instead.'
  );
}

const supabaseAnonKey = hasServiceRoleLeak ? '' : rawSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

// Create actual Supabase client if configured, otherwise null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Hybrid Sync Adapter: Seamlessly fallback to localStorage when Supabase is not configured.
 */
export const hybridStorage = {
  getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};
