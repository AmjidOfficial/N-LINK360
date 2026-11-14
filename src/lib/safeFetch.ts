/**
 * Safe API Fetch & JSON Parsing utility for N-LINK-360.
 * Inspects Content-Type and response body BEFORE parsing JSON so Netlify SPA HTML fallbacks
 * never throw "Unexpected token '<', '<!DOCTYPE '... is not valid JSON".
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  isStaticFallback: boolean;
  data: T | null;
  error?: string;
}

function getApiBaseUrl(): string {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
      return String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, '');
    }
  } catch {}
  return '';
}

export function resolveApiUrl(url: string): string {
  if (!url.startsWith('/api/')) return url;
  const base = getApiBaseUrl();
  return base ? `${base}${url}` : url;
}

function looksLikeHtml(contentType: string, text: string): boolean {
  const trimmed = text.trim();
  const lowerCt = contentType.toLowerCase();
  if (lowerCt.includes('text/html')) return true;
  if (!trimmed) return false;
  return (
    trimmed.startsWith('<') ||
    trimmed.toLowerCase().startsWith('<!doctype')
  );
}

/**
 * Parses a Fetch Response safely without throwing SyntaxError on HTML or empty bodies.
 */
export async function parseJsonResponse<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text || !text.trim()) {
    return null;
  }
  if (looksLikeHtml(contentType, text)) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Executes an API request safely. Automatically detects Netlify static HTML responses,
 * 404/405 responses without JSON, or network errors and marks `isStaticFallback: true`.
 */
export async function safeApiFetch<T = any>(
  url: string,
  init?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const resolved = resolveApiUrl(url);
    const res = await fetch(resolved, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (looksLikeHtml(contentType, text)) {
      return {
        ok: false,
        status: res.status,
        isStaticFallback: true,
        data: null,
      };
    }

    if (!text || !text.trim()) {
      return {
        ok: res.ok,
        status: res.status,
        isStaticFallback: res.status === 404 || res.status === 405,
        data: null,
        error: res.ok ? undefined : `Server returned empty response (${res.status})`,
      };
    }

    if (!contentType.toLowerCase().includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      return {
        ok: false,
        status: res.status,
        isStaticFallback: true,
        data: null,
        error: text.slice(0, 120),
      };
    }

    try {
      const data = JSON.parse(text) as T;
      return {
        ok: res.ok,
        status: res.status,
        isStaticFallback: res.status === 404 || res.status === 405,
        data,
        error: !res.ok ? (data as any)?.error || `Request failed (${res.status})` : undefined,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        isStaticFallback: true,
        data: null,
        error: 'Invalid JSON response from server.',
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      isStaticFallback: true,
      data: null,
      error: err?.message || 'Network unavailable',
    };
  }
}
