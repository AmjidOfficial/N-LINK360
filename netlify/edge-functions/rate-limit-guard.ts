import type { Context } from "@netlify/edge-functions";

type RatePolicyTier = "AUTH" | "FINANCIAL_WRITE" | "READ";

interface BucketRecord {
  count: number;
  resetAt: number;
}

const POLICY_LIMITS: Record<RatePolicyTier, { max: number; windowMs: number }> = {
  AUTH: { max: 12, windowMs: 60_000 },
  FINANCIAL_WRITE: { max: 30, windowMs: 60_000 },
  READ: { max: 90, windowMs: 60_000 },
};

const edgeBuckets = new Map<string, BucketRecord>();
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolvePolicyTier(pathname: string, method: string): RatePolicyTier {
  const lower = pathname.toLowerCase();
  if (lower.startsWith("/api/auth/") || lower.includes("login") || lower.includes("reset-password")) {
    return "AUTH";
  }
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    return "FINANCIAL_WRITE";
  }
  return "READ";
}

function getClientIp(req: Request, context: Context): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
  if (realIp) return realIp.trim();
  return context?.ip || "unknown";
}

function getAuthSubject(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return "anon";
  const token = authHeader.slice(7).trim();
  return token ? `tok_${token.slice(-16)}` : "anon";
}

function pruneBuckets(now: number) {
  if (edgeBuckets.size < 2000) return;
  for (const [k, rec] of edgeBuckets.entries()) {
    if (now >= rec.resetAt) edgeBuckets.delete(k);
  }
}

export default async function rateLimitGuard(req: Request, context: Context): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return context.next();
  }

  const tier = resolvePolicyTier(url.pathname, method);
  const policy = POLICY_LIMITS[tier];
  const now = Date.now();
  pruneBuckets(now);

  const ip = getClientIp(req, context);
  const subject = getAuthSubject(req);
  const key = `${tier}:${ip}:${subject}`;

  let bucket = edgeBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + policy.windowMs };
    edgeBuckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, policy.max - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Tier": tier,
    "X-RateLimit-Limit": String(policy.max),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
  };

  if (bucket.count > policy.max) {
    console.warn(`[N-LINK Edge Guard] Rate limit blocked ${tier} from ${ip} on ${url.pathname}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Too many ${tier.toLowerCase()} requests. Please retry after ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          ...rateHeaders,
        },
      }
    );
  }

  // Validate Content-Type and optional X-Idempotency-Key on financial writes
  if (tier === "FINANCIAL_WRITE" && (method === "POST" || method === "PUT" || method === "PATCH")) {
    const idemHeader = req.headers.get("x-idempotency-key");
    if (idemHeader && !UUID_V4_RE.test(idemHeader.trim())) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid X-Idempotency-Key format. Expected RFC-4122 UUID v4.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...rateHeaders },
        }
      );
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Request payload exceeds 20MB safety threshold.",
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json", ...rateHeaders },
        }
      );
    }
  }

  const upstream = await context.next();
  const clonedHeaders = new Headers(upstream.headers);
  Object.entries(rateHeaders).forEach(([k, v]) => clonedHeaders.set(k, v));
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: clonedHeaders,
  });
}
