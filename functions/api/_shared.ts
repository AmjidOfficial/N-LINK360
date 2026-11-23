/**
 * Shared Edge Functions Helpers ($0 Forever Edge Runtime)
 * Uses pure Web Standard APIs (Request, Response, crypto.subtle, fetch).
 */

export interface CfEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NLINK_SESSION_SECRET?: string;
  NLINK_SUPERADMIN_PASS?: string;
  NLINK_SHEET_TOKEN?: string;
  GOOGLE_SHEETS_WEBHOOK_URL?: string;
  VITE_GOOGLE_SHEETS_WEBHOOK_URL?: string;
  GEMINI_API_KEY?: string;
}

export interface CfContext {
  request: Request;
  env: CfEnv;
  params?: Record<string, string>;
}

export const DEFAULT_GOOGLE_SHEETS_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbyH0eZXxZDJ_Xfvgq2O817NUBJ-AFs7xesSq3kwET6ZpRwXTcSQMv8QLajGN5GQrjO0Aw/exec';

const ALLOWED_CORS_ORIGINS = new Set([
  'https://nlink360.netlify.app',
  'https://app.nationallight.pk',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
]);

export function resolveCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('origin') || '';
  let allowedOrigin = '';
  if (origin) {
    if (ALLOWED_CORS_ORIGINS.has(origin)) {
      allowedOrigin = origin;
    } else {
      try {
        const parsed = new URL(origin);
        if (
          (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
          (parsed.hostname.endsWith('.netlify.app') || parsed.hostname.endsWith('.run.app'))
        ) {
          allowedOrigin = origin;
        }
      } catch {}
    }
  }
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, X-Google-Sheets-Webhook',
    Vary: 'Origin',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return headers;
}

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  request?: Request
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...resolveCorsHeaders(request),
      ...extraHeaders,
    },
  });
}

export function optionsResponse(request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(request),
  });
}

export function normalizeCorporateEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/@nationa(l|ll)ights?(\.com|\.pk)$/i, '@nationallight.pk');
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(b64u: string): string {
  const padded = b64u.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64u.length + 3) % 4);
  return atob(padded);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const trimmed = String(secret || '').trim();
  if (trimmed.length < 32) {
    throw new Error('NLINK_SESSION_SECRET must be configured with at least 32 characters.');
  }
  const raw = new TextEncoder().encode(trimmed);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signEdgeSessionToken(
  payload: { sub: string; email: string; role: string },
  secret: string
): Promise<string> {
  const fullPayload = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const key = await getHmacKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `nlink_sec_${encoded}.${sig}`;
}

export async function verifyEdgeSessionToken(
  token: string,
  secret: string
): Promise<{ sub: string; email: string; role: string } | null> {
  if (!secret || secret.trim().length < 32 || !token || !token.startsWith('nlink_sec_')) {
    return null;
  }
  const raw = token.slice('nlink_sec_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  try {
    const key = await getHmacKey(secret);
    const signatureBytes = new Uint8Array(
      Array.from(fromBase64Url(sig), (character) => character.charCodeAt(0))
    );
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(encoded)
    );
    if (!isValid) return null;
    const decoded = JSON.parse(fromBase64Url(encoded));
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return {
      sub: String(decoded.sub || ''),
      email: String(decoded.email || ''),
      role: String(decoded.role || ''),
    };
  } catch {
    return null;
  }
}

export function getSupabaseClientConfig(env: CfEnv): { url: string; anonKey: string } | null {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = String(
    env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getSupabaseAdminConfig(env: CfEnv): { url: string; serviceKey: string } | null {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export async function supabaseRestFetch(
  env: CfEnv,
  pathAndQuery: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const cfg = getSupabaseAdminConfig(env);
  if (!cfg) return null;
  return fetch(`${cfg.url}/rest/v1/${pathAndQuery.replace(/^\/+/, '')}`, {
    ...init,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
