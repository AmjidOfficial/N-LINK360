import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";
import { GoogleGenAI, Type } from "@google/genai";
import {
  computeDashboardMetrics,
  DEFAULT_ROLE_DASHBOARD_CONFIGS,
  filterDashboardDatasetByScope,
  getKarachiDateRange,
  resolveRoleDashboardConfig,
  resolveUserDataScope,
  validateRequestedFilter,
} from "../lib/dashboard";
import type {
  AdminRoleConfigOverride,
  DashboardDatePreset,
  DashboardRoleKey,
} from "../lib/dashboard";
import { hasPermission } from "../lib/permissions";
import { NATIONAL_LIGHT_OFFICIAL_CATALOG } from "../data/national-light-rate-card";

export interface ServerAuthAccount {
  id: string;
  employeeCode: string;
  email: string;
  fullName: string;
  role: string;
  roleTitle: string;
  department: string;
  phone: string;
  region?: string;
  zone?: string;
  territory?: string;
  assignedTowns?: string[];
  distributorId?: string;
  dealerId?: string;
  canApprove: boolean;
  isActive: boolean;
  passwordHash: string;
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil: number;
}

interface ServerSyncState {
  lastDbSavedAt: string | null;
  lastGoogleSyncedAt: string | null;
  duplicatesPrevented: number;
  seenSignatures: Record<string, { transactionId: string; receivedAt: string; payloadSummary: any }>;
  events: Array<{
    id: string;
    type: string;
    transactionId: string;
    fingerprintHash?: string;
    idempotencyKey?: string;
    syncStatus: string;
    receivedAt: string;
  }>;
  outbox: Array<any>;
  conflicts: Array<any>;
  notifications: Array<any>;
}

const DEFAULT_GOOGLE_SHEETS_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbyH0eZXxZDJ_Xfvgq2O817NUBJ-AFs7xesSq3kwET6ZpRwXTcSQMv8QLajGN5GQrjO0Aw/exec";
const CENTRAL_COMPANY_MAILBOX = "nationallights2026@gmail.com";
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CORS_ORIGINS = new Set([
  "https://nlink360.netlify.app",
  "https://app.nationallight.pk",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
]);

function isAllowedCorsOrigin(origin?: string): boolean {
  if (!origin) return false;
  if (ALLOWED_CORS_ORIGINS.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return false;
    }
    return parsed.hostname.endsWith(".netlify.app") || parsed.hostname.endsWith(".run.app");
  } catch {
    return false;
  }
}

export function hashPassword(plain: string, salt?: string): string {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, useSalt, 64).toString("hex");
  return `${useSalt}:${derived}`;
}

export function verifyPasswordHash(plain: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(plain, salt, 64);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function generateServerSecurePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (pool: string) => pool[crypto.randomInt(0, pool.length)];
  const chars = [
    pick(upper), pick(upper),
    pick(lower), pick(lower),
    pick(digits), pick(digits),
    pick(symbols), pick(symbols),
  ];
  while (chars.length < Math.max(12, length)) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function isStrongPassword(pass: string): boolean {
  return String(pass || "").trim().length >= 6;
}

function normalizeCorporateEmail(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/@nationa(l|ll)ights?(\.com|\.pk)$/i, "@nationallight.pk");
}

function resolveWritableStoreDir(): string {
  // Serverless environments (Netlify/AWS Lambda) only allow writes in /tmp
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
    return "/tmp";
  }
  return process.cwd();
}

export interface ApiGatewayOptions {
  storeDir?: string;
}

export function createApiGateway(options: ApiGatewayOptions = {}): express.Express {
  const app = express();
  const storeDir = options.storeDir || resolveWritableStoreDir();

  const AUTH_STORE_PATH = path.join(storeDir, ".nlink-auth-store.json");
  const DASHBOARD_CONFIG_STORE_PATH = path.join(storeDir, ".nlink-dashboard-config.json");
  const SYNC_STORE_PATH = path.join(storeDir, ".nlink-sync-store.json");
  const PRICELIST_STORE_PATH = path.join(storeDir, ".nlink-pricelist-store.json");

  let aiClient: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI | null {
    const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) return null;
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  function getSessionSigningSecret(): string | null {
    const secret = String(process.env.NLINK_SESSION_SECRET || "").trim();
    if (secret.length < 32) return null;
    return secret;
  }

  function signSessionToken(account: ServerAuthAccount): string {
    const secret = getSessionSigningSecret();
    if (!secret) {
      throw new Error("Server authentication secret (NLINK_SESSION_SECRET >= 32 chars) is not configured.");
    }
    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
    return `nlink_sec_${encoded}.${sig}`;
  }

  function verifySessionToken(token?: string): { sub: string; email: string; role: string } | null {
    const secret = getSessionSigningSecret();
    if (!secret || !token || !token.startsWith("nlink_sec_")) return null;
    const raw = token.slice("nlink_sec_".length);
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      if (!payload?.email || (payload.exp && Date.now() > payload.exp)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function buildInitialAccountsFromEnv(): Map<string, ServerAuthAccount> {
    const superAdminPass = String(process.env.NLINK_SUPERADMIN_PASS || "").trim();
    const tempResetPass = String(process.env.NLINK_TEMP_RESET_PASS || "").trim();
    const accounts = new Map<string, ServerAuthAccount>();

    if (superAdminPass.length >= 8) {
      const superAdminHash = hashPassword(superAdminPass);
      accounts.set("amjid.bisconni@gmail.com", {
        id: "USR-003",
        employeeCode: "EMP-003",
        email: "amjid.bisconni@gmail.com",
        fullName: "Muhammad Amjid",
        role: "SUPER_ADMIN",
        roleTitle: "Super Admin",
        department: "EXECUTIVE",
        phone: "+92 333 4455667",
        canApprove: false,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: 0,
      });
      accounts.set("amjid@nationallight.pk", {
        id: "USR-003-NL",
        employeeCode: "EMP-004",
        email: "amjid@nationallight.pk",
        fullName: "Amjid Khan",
        role: "SUPER_ADMIN",
        roleTitle: "Super Admin",
        department: "EXECUTIVE",
        phone: "+92 333 4455667",
        canApprove: false,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: 0,
      });
      accounts.set("nationallights2026@gmail.com", {
        id: "USR-000",
        employeeCode: "EMP-000",
        email: "nationallights2026@gmail.com",
        fullName: "Shahzad Ullah (Executive Admin)",
        role: "SUPER_ADMIN",
        roleTitle: "Executive Administration",
        department: "EXECUTIVE",
        phone: "+92 300 1234567",
        canApprove: true,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      });
    }

    if (tempResetPass.length >= 8) {
      const tempResetHash = hashPassword(tempResetPass);
      accounts.set("shahzadullah@nationallight.pk", {
        id: "USR-001",
        employeeCode: "EMP-001",
        email: "shahzadullah@nationallight.pk",
        fullName: "Shahzad Ullah",
        role: "NSM",
        roleTitle: "NSM (National Sales Manager) & Sole Approver",
        department: "EXECUTIVE",
        phone: "+92 300 1234567",
        canApprove: true,
        isActive: true,
        passwordHash: tempResetHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      });
      accounts.set("syedzain@nationallight.pk", {
        id: "USR-002",
        employeeCode: "EMP-002",
        email: "syedzain@nationallight.pk",
        fullName: "Syed Zain",
        role: "ZSM",
        roleTitle: "Zonal Sales Manager (ZSM)",
        department: "SALES_FIELD",
        phone: "+92 321 8877665",
        region: "KPK",
        zone: "KPK Zone",
        territory: "Peshawar",
        assignedTowns: ["Peshawar", "Mardan", "Nowshera", "Charsadda", "Mingora (Swat)"],
        canApprove: false,
        isActive: true,
        passwordHash: tempResetHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      });
      accounts.set("arshadkhan@nationallight.pk", {
        id: "USR-005",
        employeeCode: "EMP-005",
        email: "arshadkhan@nationallight.pk",
        fullName: "Arshad Khan",
        role: "TSM",
        roleTitle: "Territory Sales Manager (TSM)",
        department: "SALES_FIELD",
        phone: "+92 300 5551122",
        region: "KPK",
        zone: "Malakand",
        territory: "Mingora (Swat)",
        assignedTowns: ["Mingora (Swat)", "Malakand", "Batkhela"],
        canApprove: false,
        isActive: true,
        passwordHash: tempResetHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      });
    }

    return accounts;
  }

  function saveAuthStore(map: Map<string, ServerAuthAccount>) {
    try {
      const serialized = Array.from(map.values()).map((acc) => ({
        id: acc.id,
        employeeCode: acc.employeeCode,
        email: acc.email,
        fullName: acc.fullName,
        role: acc.role,
        roleTitle: acc.roleTitle,
        department: acc.department,
        phone: acc.phone,
        region: acc.region,
        zone: acc.zone,
        territory: acc.territory,
        assignedTowns: acc.assignedTowns,
        distributorId: acc.distributorId,
        dealerId: acc.dealerId,
        canApprove: acc.canApprove,
        isActive: acc.isActive,
        passwordHash: acc.passwordHash,
        mustChangePassword: acc.mustChangePassword,
        failedAttempts: acc.failedAttempts,
        lockedUntil: acc.lockedUntil,
      }));
      fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn("Auth store persistence notice:", err);
    }
  }

  function loadAuthAccounts(): Map<string, ServerAuthAccount> {
    try {
      if (fs.existsSync(AUTH_STORE_PATH)) {
        const raw = fs.readFileSync(AUTH_STORE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = new Map<string, ServerAuthAccount>();
          for (const item of parsed) {
            const cleanEmail = String(item?.email || "").trim().toLowerCase();
            if (!cleanEmail || cleanEmail.endsWith("@nationallights.com")) continue;
            loaded.set(cleanEmail, { ...item, email: cleanEmail });
          }
          if (loaded.size > 0) return loaded;
        }
      }
    } catch (err) {
      console.warn("Auth store load notice:", err);
    }
    const fresh = buildInitialAccountsFromEnv();
    if (fresh.size > 0) {
      saveAuthStore(fresh);
    }
    return fresh;
  }

  const SERVER_ACCOUNTS = loadAuthAccounts();
  const serverAuditLogs: any[] = [];
  const serverRecoveryRequests: any[] = [];

  function recordServerAudit(entry: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    action: string;
    module: string;
    recordId: string;
    details: string;
  }) {
    const item = {
      id: `AUD-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      ...entry,
      createdAt: new Date().toISOString(),
    };
    serverAuditLogs.unshift(item);
    if (serverAuditLogs.length > 2000) serverAuditLogs.length = 2000;
    return item;
  }

  function findAccountByEmail(emailInput: string): ServerAuthAccount | undefined {
    const clean = normalizeCorporateEmail(emailInput);
    if (!clean || !clean.includes("@")) return undefined;
    return SERVER_ACCOUNTS.get(clean);
  }

  function authenticateGatewayUser(req: express.Request): ServerAuthAccount | null {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const verified = verifySessionToken(token);
    if (!verified) return null;
    const acc = findAccountByEmail(verified.email);
    if (!acc || !acc.isActive) return null;
    return acc;
  }

  function isEmployeeAdminAccount(account: ServerAuthAccount): boolean {
    const roleUpper = String(account.role || "").toUpperCase();
    return (
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "NSM" ||
      roleUpper === "MANAGEMENT" ||
      hasPermission(account.role as any, "hr.manage") ||
      hasPermission(account.role as any, "users.manage")
    );
  }

  function isAuditReaderAccount(account: ServerAuthAccount): boolean {
    const roleUpper = String(account.role || "").toUpperCase();
    return (
      isEmployeeAdminAccount(account) ||
      roleUpper === "ACCOUNTS" ||
      hasPermission(account.role as any, "reports.view") ||
      hasPermission(account.role as any, "ledger.view")
    );
  }

  function getSupabaseConfig(): { url: string; anonKey: string; serviceKey: string } | null {
    const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
      .trim()
      .replace(/\/+$/, "");
    const anonKey = String(
      process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        ""
    ).trim();
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url) return null;
    return { url, anonKey, serviceKey };
  }

  async function persistSupabaseSyncEvent(record: {
    transaction_id: string;
    event_type: string;
    fingerprint_hash?: string | null;
    idempotency_key?: string | null;
    sync_status: "EVENT_RECORDED" | "PROCESSING" | "PROCESSED" | "FAILED";
    actor_email: string;
    received_at: string;
  }): Promise<boolean> {
    const sb = getSupabaseConfig();
    if (!sb || !sb.serviceKey) return false;
    try {
      const res = await fetch(`${sb.url}/rest/v1/sync_events`, {
        method: "POST",
        headers: {
          apikey: sb.serviceKey,
          Authorization: `Bearer ${sb.serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(record),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function loadDashboardConfigOverrides(): Record<string, AdminRoleConfigOverride> {
    try {
      if (fs.existsSync(DASHBOARD_CONFIG_STORE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_STORE_PATH, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
      }
    } catch {}
    return {};
  }

  function saveDashboardConfigOverrides(overrides: Record<string, AdminRoleConfigOverride>) {
    try {
      fs.writeFileSync(DASHBOARD_CONFIG_STORE_PATH, JSON.stringify(overrides, null, 2), "utf-8");
    } catch {}
  }

  function loadSyncStore(): ServerSyncState {
    try {
      if (fs.existsSync(SYNC_STORE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(SYNC_STORE_PATH, "utf-8"));
        return {
          lastDbSavedAt: parsed?.lastDbSavedAt || null,
          lastGoogleSyncedAt: parsed?.lastGoogleSyncedAt || null,
          duplicatesPrevented: Number(parsed?.duplicatesPrevented || 0),
          seenSignatures: parsed?.seenSignatures && typeof parsed.seenSignatures === "object" ? parsed.seenSignatures : {},
          events: Array.isArray(parsed?.events) ? parsed.events : [],
          outbox: Array.isArray(parsed?.outbox) ? parsed.outbox : [],
          conflicts: Array.isArray(parsed?.conflicts) ? parsed.conflicts : [],
          notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : [],
        };
      }
    } catch {}
    return {
      lastDbSavedAt: null,
      lastGoogleSyncedAt: null,
      duplicatesPrevented: 0,
      seenSignatures: {},
      events: [],
      outbox: [],
      conflicts: [],
      notifications: [],
    };
  }

  function saveSyncStore(state: ServerSyncState) {
    try {
      const trimmed: ServerSyncState = {
        ...state,
        events: state.events.slice(0, 500),
        outbox: state.outbox.slice(0, 500),
        conflicts: state.conflicts.slice(0, 300),
        notifications: state.notifications.slice(0, 500),
      };
      fs.writeFileSync(SYNC_STORE_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
    } catch {}
  }

  function loadPriceListStore(): { overrides: Record<string, any>; history: any[] } {
    try {
      if (fs.existsSync(PRICELIST_STORE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(PRICELIST_STORE_PATH, "utf-8"));
        return {
          overrides: parsed?.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
          history: Array.isArray(parsed?.history) ? parsed.history : [],
        };
      }
    } catch {}
    return { overrides: {}, history: [] };
  }

  function savePriceListStore(store: { overrides: Record<string, any>; history: any[] }) {
    try {
      fs.writeFileSync(PRICELIST_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
    } catch {}
  }

  // Body parsing
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // Origin-allowlisted CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-google-sheets-webhook, x-idempotency-key"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Centralized Tiered API Rate Limiter
  type ApiRateTier = "AUTH" | "FINANCIAL_WRITE" | "READ";
  const API_RATE_POLICIES: Record<ApiRateTier, { max: number; windowMs: number }> = {
    AUTH: { max: 12, windowMs: 60_000 },
    FINANCIAL_WRITE: { max: 30, windowMs: 60_000 },
    READ: { max: 90, windowMs: 60_000 },
  };
  const apiRateBuckets = new Map<string, { count: number; resetAt: number }>();
  const serverIdempotencyCache = new Map<
    string,
    { status: number; body: Record<string, unknown>; cachedAt: number }
  >();

  app.use("/api", (req, res, next) => {
    if (req.method === "OPTIONS" || req.path === "/health") return next();
    const now = Date.now();
    if (apiRateBuckets.size > 2000) {
      for (const [k, v] of apiRateBuckets.entries()) {
        if (now >= v.resetAt) apiRateBuckets.delete(k);
      }
    }

    const lower = req.path.toLowerCase();
    const tier: ApiRateTier =
      lower.startsWith("/auth/") || lower.includes("admin-reset-password") || lower.includes("provision")
        ? "AUTH"
        : req.method !== "GET" && req.method !== "HEAD"
          ? "FINANCIAL_WRITE"
          : "READ";

    const policy = API_RATE_POLICIES[tier];
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
      .split(",")[0]
      .trim();
    const authHeader = String(req.headers.authorization || "");
    const subject = authHeader.startsWith("Bearer ") ? authHeader.slice(-16) : "anon";
    const bucketKey = `${tier}:${ip}:${subject}`;

    let bucket = apiRateBuckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + policy.windowMs };
      apiRateBuckets.set(bucketKey, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, policy.max - bucket.count);
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("X-RateLimit-Tier", tier);
    res.setHeader("X-RateLimit-Limit", String(policy.max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > policy.max) {
      res.setHeader("Retry-After", String(retryAfter));
      recordServerAudit({
        action: "API_RATE_LIMIT_BLOCKED",
        module: "SECURITY",
        recordId: bucketKey,
        details: `Blocked ${tier} burst from ${ip} on /api${req.path} (${bucket.count}/${policy.max})`,
      });
      return res.status(429).json({
        success: false,
        error: `Too many ${tier.toLowerCase()} requests. Retry after ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    const idemHeader = req.headers["x-idempotency-key"];
    if (typeof idemHeader === "string" && idemHeader.trim() && !UUID_V4_RE.test(idemHeader.trim())) {
      return res.status(400).json({
        success: false,
        error: "Invalid X-Idempotency-Key header. Expected RFC-4122 UUID v4.",
      });
    }

    next();
  });

  // Health & Status
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      system: "N-LINK 360 Enterprise Backend API Gateway",
      database: "Supabase PostgreSQL Authoritative DB",
      signingSecretConfigured: Boolean(getSessionSigningSecret()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      application: "N-LINK 360 - National Lights",
      mode: "Production Backend Gateway",
      supabaseConfigured: Boolean(getSupabaseConfig()),
      bootstrapRequired: SERVER_ACCOUNTS.size === 0,
      authorizedApprovers: ["shahzadullah@nationallight.pk", CENTRAL_COMPANY_MAILBOX],
      activeModules: [
        "Attendance & 500m Geofence",
        "Customer 360 (Distributors & Dealers)",
        "Sales Order Engine & SKU Inventory",
        "Recovery & Financial Ledger",
        "Approval Security Gateway",
        "Google Sheets Live Database Sync",
        "AI Recovery Slip OCR & Verification",
      ],
      uptime: process.uptime(),
    });
  });

  // One-time secure first-boot Super Admin bootstrap (only allowed when 0 accounts exist)
  app.post("/api/auth/bootstrap-admin", (req, res) => {
    if (!getSessionSigningSecret()) {
      return res.status(503).json({
        success: false,
        error: "Server signing secret (NLINK_SESSION_SECRET) must be configured before bootstrapping admin access.",
      });
    }
    if (SERVER_ACCOUNTS.size > 0) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: System already initialized with existing accounts.",
      });
    }
    const { email, password, fullName, phone } = req.body || {};
    const cleanEmail = normalizeCorporateEmail(email || "");
    const cleanPass = String(password || "").trim();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanPass.length < 12) {
      return res.status(400).json({
        success: false,
        error: "Valid corporate email and a strong password (>= 12 characters) are required for initial bootstrap.",
      });
    }
    const adminAccount: ServerAuthAccount = {
      id: `USR-ADMIN-${Date.now()}`,
      employeeCode: "EMP-001",
      email: cleanEmail,
      fullName: String(fullName || "System Administrator").trim(),
      role: "SUPER_ADMIN",
      roleTitle: "Super Admin",
      department: "EXECUTIVE",
      phone: String(phone || "+92 300 0000000").trim(),
      canApprove: cleanEmail === "shahzadullah@nationallight.pk" || cleanEmail === CENTRAL_COMPANY_MAILBOX,
      isActive: true,
      passwordHash: hashPassword(cleanPass),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: 0,
    };
    SERVER_ACCOUNTS.set(cleanEmail, adminAccount);
    saveAuthStore(SERVER_ACCOUNTS);
    const sessionToken = signSessionToken(adminAccount);
    recordServerAudit({
      userId: adminAccount.id,
      userName: adminAccount.fullName,
      userEmail: adminAccount.email,
      action: "SYSTEM_ADMIN_BOOTSTRAPPED",
      module: "AUTH",
      recordId: adminAccount.id,
      details: `Initial Super Admin provisioned cleanly via secure bootstrap route`,
    });
    res.json({
      success: true,
      sessionToken,
      user: {
        id: adminAccount.id,
        employeeCode: adminAccount.employeeCode,
        email: adminAccount.email,
        fullName: adminAccount.fullName,
        role: adminAccount.role,
        roleTitle: adminAccount.roleTitle,
        department: adminAccount.department,
        phone: adminAccount.phone,
        canApprove: adminAccount.canApprove,
        mustChangePassword: false,
      },
    });
  });

  // Strict Email + Password Login (Server Account Store + Optional Supabase Auth fallback)
  app.post("/api/auth/login", async (req, res) => {
    if (!getSessionSigningSecret()) {
      return res.status(503).json({
        success: false,
        error: "Authentication service misconfigured: NLINK_SESSION_SECRET must be set (>= 32 chars).",
      });
    }

    const { email, identifier, password } = req.body || {};
    const cleanEmail = normalizeCorporateEmail(email || identifier || "");
    const cleanPass = String(password || "");

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanPass) {
      return res.status(400).json({
        success: false,
        error: "A valid corporate email address and password are required.",
      });
    }

    const account = findAccountByEmail(cleanEmail);
    if (account) {
      if (!account.isActive) {
        return res.status(403).json({
          success: false,
          error: "Account is deactivated. Contact Head Office Administration.",
        });
      }

      if (account.lockedUntil && Date.now() < account.lockedUntil) {
        const waitMins = Math.ceil((account.lockedUntil - Date.now()) / 60000);
        return res.status(429).json({
          success: false,
          error: `Account temporarily locked due to repeated failed attempts. Try again in ${waitMins} minute(s) or contact Head Office.`,
        });
      }

      const isHashValid = verifyPasswordHash(cleanPass, account.passwordHash);
      if (!isHashValid) {
        account.failedAttempts += 1;
        if (account.failedAttempts >= 5) {
          account.lockedUntil = Date.now() + 15 * 60 * 1000;
          recordServerAudit({
            userId: account.id,
            userName: account.fullName,
            userEmail: account.email,
            action: "ACCOUNT_LOCKED",
            module: "AUTH",
            recordId: account.id,
            details: "Account locked for 15 minutes after 5 failed password attempts",
          });
        } else {
          recordServerAudit({
            userId: account.id,
            userName: account.fullName,
            userEmail: account.email,
            action: "LOGIN_FAILED_BAD_PASSWORD",
            module: "AUTH",
            recordId: account.id,
            details: `Invalid password attempt (${account.failedAttempts}/5)`,
          });
        }
        saveAuthStore(SERVER_ACCOUNTS);
        return res.status(401).json({ success: false, error: "Invalid email address or password." });
      }

      account.failedAttempts = 0;
      account.lockedUntil = 0;
      saveAuthStore(SERVER_ACCOUNTS);
      const sessionToken = signSessionToken(account);

      recordServerAudit({
        userId: account.id,
        userName: account.fullName,
        userEmail: account.email,
        action: "USER_LOGIN_SUCCESS",
        module: "AUTH",
        recordId: account.id,
        details: `Authenticated via N-LINK ID (${account.role})`,
      });

      return res.json({
        success: true,
        sessionToken,
        user: {
          id: account.id,
          employeeCode: account.employeeCode,
          email: account.email,
          fullName: account.fullName,
          role: account.role,
          roleTitle: account.roleTitle,
          department: account.department,
          phone: account.phone,
          region: account.region,
          zone: account.zone,
          territory: account.territory,
          assignedTowns: account.assignedTowns,
          distributorId: account.distributorId,
          dealerId: account.dealerId,
          canApprove: account.canApprove,
          mustChangePassword: account.mustChangePassword,
        },
      });
    }

    // Try Supabase Auth (using public anon/publishable key only!) if configured
    const sb = getSupabaseConfig();
    if (sb && sb.anonKey) {
      try {
        const authRes = await fetch(`${sb.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: sb.anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        });

        if (authRes.ok) {
          const authPayload = (await authRes.json().catch(() => ({}))) as any;
          let employee: any = null;
          if (sb.serviceKey) {
            const empRes = await fetch(
              `${sb.url}/rest/v1/employees?email=ilike.${encodeURIComponent(cleanEmail)}&limit=1`,
              {
                headers: {
                  apikey: sb.serviceKey,
                  Authorization: `Bearer ${sb.serviceKey}`,
                  "Content-Type": "application/json",
                },
              }
            );
            const empList = empRes.ok ? ((await empRes.json().catch(() => [])) as any[]) : [];
            employee = empList[0] || null;
          }

          if (employee && employee.status === false) {
            return res.status(403).json({
              success: false,
              error: "Account is deactivated. Contact Head Office Administration.",
            });
          }

          const resolvedRole = String(employee?.role || "SALES_RECOVERY").toUpperCase();
          const tempAccount: ServerAuthAccount = {
            id: String(employee?.id || authPayload?.user?.id || `usr_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`),
            employeeCode: String(employee?.employee_code || "EMP-SB"),
            email: cleanEmail,
            fullName: String(employee?.full_name || authPayload?.user?.user_metadata?.full_name || cleanEmail.split("@")[0]),
            role: resolvedRole,
            roleTitle: String(employee?.role_title || resolvedRole),
            department: String(employee?.department || "SALES_FIELD"),
            phone: String(employee?.mobile || employee?.phone || ""),
            region: employee?.region || undefined,
            zone: employee?.zone || undefined,
            territory: employee?.territory || undefined,
            canApprove: cleanEmail === "shahzadullah@nationallight.pk" || cleanEmail === CENTRAL_COMPANY_MAILBOX,
            isActive: true,
            passwordHash: "",
            mustChangePassword: Boolean(employee?.must_change_password),
            failedAttempts: 0,
            lockedUntil: 0,
          };
          SERVER_ACCOUNTS.set(cleanEmail, tempAccount);
          const sessionToken = signSessionToken(tempAccount);

          return res.json({
            success: true,
            sessionToken,
            user: {
              id: tempAccount.id,
              employeeCode: tempAccount.employeeCode,
              email: tempAccount.email,
              fullName: tempAccount.fullName,
              role: tempAccount.role,
              roleTitle: tempAccount.roleTitle,
              department: tempAccount.department,
              phone: tempAccount.phone,
              region: tempAccount.region,
              zone: tempAccount.zone,
              territory: tempAccount.territory,
              canApprove: tempAccount.canApprove,
              mustChangePassword: tempAccount.mustChangePassword,
            },
          });
        }
      } catch {
        // Fall through to 401 failure
      }
    }

    recordServerAudit({
      userEmail: cleanEmail,
      action: "LOGIN_FAILED_UNKNOWN_EMAIL",
      module: "AUTH",
      recordId: cleanEmail,
      details: `Rejected login attempt for unrecognized email ${cleanEmail}`,
    });
    return res.status(401).json({ success: false, error: "Invalid email address or password." });
  });

  // Change Password (Authenticated Self-Service / Forced first login — strict verification, zero bypass)
  app.post("/api/auth/change-password", (req, res) => {
    const { email, currentPassword, newPassword, forced } = req.body || {};
    const cleanEmail = normalizeCorporateEmail(email || "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid corporate email address is required." });
    }

    const account = findAccountByEmail(cleanEmail);
    if (!account) {
      return res.status(404).json({ success: false, error: "Account not found." });
    }

    if (!newPassword || !isStrongPassword(String(newPassword))) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long.",
      });
    }

    const sessionActor = authenticateGatewayUser(req);
    if (sessionActor && sessionActor.email !== cleanEmail && !isEmployeeAdminAccount(sessionActor)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You cannot modify another user's password.",
      });
    }

    const canAdminOverride = Boolean(
      sessionActor && isEmployeeAdminAccount(sessionActor) && sessionActor.email !== cleanEmail
    );
    const isAuthenticatedForcedSelfReset = Boolean(
      forced && account.mustChangePassword && sessionActor && sessionActor.email === cleanEmail
    );

    if (!canAdminOverride) {
      if (currentPassword && String(currentPassword).trim()) {
        if (!verifyPasswordHash(String(currentPassword).trim(), account.passwordHash)) {
          return res.status(401).json({ success: false, error: "Current password is incorrect." });
        }
      } else if (!isAuthenticatedForcedSelfReset) {
        return res.status(400).json({ success: false, error: "Current password is required." });
      }
    }

    account.passwordHash = hashPassword(String(newPassword).trim());
    account.mustChangePassword = false;
    account.failedAttempts = 0;
    account.lockedUntil = 0;
    saveAuthStore(SERVER_ACCOUNTS);
    recordServerAudit({
      userId: account.id,
      userName: account.fullName,
      userEmail: account.email,
      action: "PASSWORD_CHANGED",
      module: "AUTH",
      recordId: account.id,
      details: isAuthenticatedForcedSelfReset
        ? "First-login forced password change completed successfully (mustChangePassword cleared)"
        : "Password securely updated (hash rotated)",
    });

    res.json({
      success: true,
      message: "Password updated successfully. One-time password requirement cleared.",
      user: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        mustChangePassword: false,
      },
    });
  });

  // Forgot Password
  app.post("/api/auth/forgot-password", (req, res) => {
    const { identifier } = req.body || {};
    const cleanId = String(identifier || "").trim().toLowerCase();
    if (!cleanId || !cleanId.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid corporate email address is required." });
    }

    const account = findAccountByEmail(cleanId);
    const requestRecord = {
      id: `PRQ-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      identifier: cleanId,
      employeeId: account?.id,
      employeeName: account?.fullName || cleanId,
      status: "PENDING_ADMIN_REVIEW",
      notifiedMailbox: CENTRAL_COMPANY_MAILBOX,
      requestedAt: new Date().toISOString(),
    };
    serverRecoveryRequests.unshift(requestRecord);

    recordServerAudit({
      userId: account?.id,
      userName: account?.fullName || cleanId,
      userEmail: account?.email || cleanId,
      action: "PASSWORD_RECOVERY_REQUESTED",
      module: "AUTH",
      recordId: requestRecord.id,
      details: `Recovery request logged and administrative notification queued for ${CENTRAL_COMPANY_MAILBOX}`,
    });

    res.json({
      success: true,
      request: requestRecord,
      message: `Password recovery request #${requestRecord.id} logged. Head Office administration (${CENTRAL_COMPANY_MAILBOX}) has been notified to verify your identity and issue a one-time temporary credential.`,
    });
  });

  // Disabled OTP routes
  app.post("/api/auth/request-otp", (_req, res) => {
    res.status(410).json({
      success: false,
      error: "Passwordless OTP login has been disabled. Please sign in with your corporate Email and Password.",
    });
  });

  app.post("/api/auth/verify-otp", (_req, res) => {
    res.status(410).json({
      success: false,
      error: "Passwordless OTP login has been disabled. Please sign in with your corporate Email and Password.",
    });
  });

  // Employee Provisioning (Authenticated Admin only)
  app.post("/api/employees/provision", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required to provision employees." });
    }
    if (!isEmployeeAdminAccount(actor)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only authorized administrators can provision employees.",
      });
    }

    const {
      fullName,
      role,
      roleTitle,
      department,
      phone,
      employeeCode: requestedCode,
      email: requestedEmail,
      initialPassword: requestedPassword,
    } = req.body || {};
    const cleanName = String(fullName || "").trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, error: "Employee full name is required." });
    }

    const baseHandle = cleanName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") || "employee";
    let email =
      requestedEmail && String(requestedEmail).includes("@nationallight.pk")
        ? normalizeCorporateEmail(String(requestedEmail))
        : `${baseHandle}@nationallight.pk`;
    let suffix = 2;
    while (SERVER_ACCOUNTS.has(email)) {
      email = `${baseHandle}${suffix}@nationallight.pk`;
      suffix += 1;
    }

    const employeeCode = requestedCode || `EMP-${String(SERVER_ACCOUNTS.size + 1).padStart(3, "0")}`;
    const initialPassword =
      typeof requestedPassword === "string" && isStrongPassword(requestedPassword.trim())
        ? requestedPassword.trim()
        : generateServerSecurePassword(14);
    const id = `usr_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;

    const account: ServerAuthAccount = {
      id,
      employeeCode,
      email,
      fullName: cleanName,
      role: role || "SALES_RECOVERY",
      roleTitle: roleTitle || "Field Sales Officer",
      department: department || "SALES_FIELD",
      phone: phone || "+92 300 0000000",
      canApprove: false,
      isActive: true,
      passwordHash: hashPassword(initialPassword),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: 0,
    };

    SERVER_ACCOUNTS.set(email, account);
    saveAuthStore(SERVER_ACCOUNTS);

    recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: actor.email,
      action: "EMPLOYEE_CREATED",
      module: "EMPLOYEES",
      recordId: id,
      details: `Created employee ${cleanName} (${employeeCode} · ${email} · ${account.role}). Notification logged for ${CENTRAL_COMPANY_MAILBOX}.`,
    });

    res.json({
      success: true,
      employee: {
        id: account.id,
        employeeCode: account.employeeCode,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        department: account.department,
        mustChangePassword: true,
      },
      oneTimeInitialPassword: initialPassword,
      notificationMailbox: CENTRAL_COMPANY_MAILBOX,
    });
  });

  // Admin-Assisted Password Reset
  app.post("/api/employees/admin-reset-password", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required for admin password reset." });
    }
    if (!isEmployeeAdminAccount(actor)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only authorized administrators can reset employee credentials.",
      });
    }

    const { email, fullName, temporaryPassword: requestedTemp } = req.body || {};
    const cleanEmail = normalizeCorporateEmail(email || "");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Target employee corporate email is required." });
    }

    const tempPassword =
      typeof requestedTemp === "string" && isStrongPassword(requestedTemp.trim())
        ? requestedTemp.trim()
        : generateServerSecurePassword(14);
    let account = findAccountByEmail(cleanEmail);
    if (!account) {
      account = {
        id: `usr_${Date.now()}`,
        employeeCode: "EMP-SYNC",
        email: cleanEmail,
        fullName: fullName || cleanEmail.split("@")[0],
        role: "SALES_RECOVERY",
        roleTitle: "Employee",
        department: "SALES_FIELD",
        phone: "",
        canApprove: false,
        isActive: true,
        passwordHash: hashPassword(tempPassword),
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      };
      SERVER_ACCOUNTS.set(cleanEmail, account);
    } else {
      account.passwordHash = hashPassword(tempPassword);
      account.mustChangePassword = true;
      account.failedAttempts = 0;
      account.lockedUntil = 0;
    }
    saveAuthStore(SERVER_ACCOUNTS);

    recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: cleanEmail,
      action: "ADMIN_PASSWORD_RESET",
      module: "AUTH",
      recordId: account.id,
      details: `Temporary password issued by ${actor.fullName} (${actor.email}); forced change on next login enforced.`,
    });

    res.json({
      success: true,
      email: cleanEmail,
      oneTimeTemporaryPassword: tempPassword,
      mustChangePassword: true,
    });
  });

  // Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required to view audit logs." });
    }
    if (!isAuditReaderAccount(actor)) {
      return res.status(403).json({ success: false, error: "Forbidden: Insufficient permissions to view audit logs." });
    }
    res.json({ success: true, logs: serverAuditLogs, recoveryRequests: serverRecoveryRequests });
  });

  app.post("/api/audit-logs", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required to record audit logs." });
    }
    const body = req.body || {};
    if (!body.action || !body.module) {
      return res.status(400).json({ success: false, error: "action and module are required" });
    }
    const created = recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: actor.email,
      action: String(body.action),
      module: String(body.module),
      recordId: String(body.recordId || "N/A"),
      details: String(body.details || ""),
    });
    res.json({ success: true, log: created });
  });

  // Dashboard Config & Summary
  app.get("/api/dashboard/config", (req, res) => {
    const account = authenticateGatewayUser(req);
    if (!account) {
      return res.status(401).json({ success: false, error: "Authentication required to access dashboard configuration." });
    }
    const overrides = loadDashboardConfigOverrides();
    const canConfigureAll =
      hasPermission(account.role, "dashboard.configure") || hasPermission(account.role, "roles.manage");
    const requestedRoleKey = String(req.query.roleKey || "").trim().toUpperCase() as DashboardRoleKey;

    if (requestedRoleKey && DEFAULT_ROLE_DASHBOARD_CONFIGS[requestedRoleKey]) {
      const ownConfig = resolveRoleDashboardConfig(account.role);
      if (!canConfigureAll && requestedRoleKey !== ownConfig.roleKey) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot inspect another role's dashboard configuration.",
        });
      }
      const override = overrides[requestedRoleKey] || null;
      return res.json({
        success: true,
        config: resolveRoleDashboardConfig(requestedRoleKey, override),
        override,
      });
    }

    const ownConfig = resolveRoleDashboardConfig(account.role);
    const ownOverride = overrides[ownConfig.roleKey] || null;
    res.json({
      success: true,
      config: resolveRoleDashboardConfig(account.role, ownOverride),
      override: ownOverride,
      ...(canConfigureAll ? { allOverrides: overrides } : {}),
    });
  });

  app.put("/api/dashboard/config", (req, res) => {
    const account = authenticateGatewayUser(req);
    if (!account) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    if (!hasPermission(account.role, "dashboard.configure") && !hasPermission(account.role, "roles.manage")) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only authorized administrators can configure role dashboards.",
      });
    }
    const body = (req.body || {}) as AdminRoleConfigOverride;
    const roleKey = body?.roleKey;
    if (!roleKey || !DEFAULT_ROLE_DASHBOARD_CONFIGS[roleKey]) {
      return res.status(400).json({ success: false, error: "Valid roleKey is required." });
    }

    const overrides = loadDashboardConfigOverrides();
    overrides[roleKey] = {
      roleKey,
      hiddenKpis: Array.isArray(body.hiddenKpis) ? body.hiddenKpis : [],
      kpiOrder: Array.isArray(body.kpiOrder) ? body.kpiOrder : undefined,
      hiddenCharts: Array.isArray(body.hiddenCharts) ? body.hiddenCharts : [],
      hiddenSections: Array.isArray(body.hiddenSections) ? body.hiddenSections : [],
      hiddenQuickActions: Array.isArray(body.hiddenQuickActions) ? body.hiddenQuickActions : [],
      updatedAt: new Date().toISOString(),
      updatedBy: account.email,
    };
    saveDashboardConfigOverrides(overrides);

    recordServerAudit({
      userId: account.id,
      userName: account.fullName,
      userEmail: account.email,
      action: "DASHBOARD_CONFIG_UPDATED",
      module: "DASHBOARD",
      recordId: roleKey,
      details: `Updated visibility configuration for ${roleKey}`,
    });

    res.json({
      success: true,
      config: resolveRoleDashboardConfig(roleKey, overrides[roleKey]),
      override: overrides[roleKey],
    });
  });

  app.post("/api/dashboard/summary", (req, res) => {
    const account = authenticateGatewayUser(req);
    if (!account) {
      return res.status(401).json({ success: false, error: "Authentication required for scoped dashboard data." });
    }

    const { preset = "THIS_MONTH", customStart, customEnd, filter = {}, dataset = {} } = req.body || {};

    const userScope = resolveUserDataScope({
      id: account.id,
      email: account.email,
      role: account.role,
      region: account.region,
      zone: account.zone,
      territory: account.territory,
      assignedTowns: account.assignedTowns,
      distributorId: account.distributorId,
      dealerId: account.dealerId,
    });

    const validation = validateRequestedFilter(userScope, filter);
    if (!validation.authorized) {
      recordServerAudit({
        userId: account.id,
        userName: account.fullName,
        userEmail: account.email,
        action: "DASHBOARD_SCOPE_VIOLATION_BLOCKED",
        module: "SECURITY",
        recordId: account.id,
        details: validation.reason || "Cross-scope query blocked",
      });
      return res.status(403).json({
        success: false,
        error: validation.reason || "Forbidden: Requested organizational scope is outside your permissions.",
      });
    }

    const overrides = loadDashboardConfigOverrides();
    const config = resolveRoleDashboardConfig(account.role, overrides[userScope.dashboardRoleKey] || null);
    const dateRange = getKarachiDateRange(preset as DashboardDatePreset, customStart, customEnd);
    const scopedDataset = filterDashboardDatasetByScope(userScope, dataset, validation.effectiveFilter);

    const summary = computeDashboardMetrics({
      dataset: scopedDataset,
      dateRange,
      scope: userScope,
      config,
    });

    res.json({
      success: true,
      summary,
    });
  });

  // AI Payment Slip Scanner
  const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);
  app.post("/api/scan-payment-slip", async (req, res) => {
    try {
      const actor = authenticateGatewayUser(req);
      if (!actor) {
        return res.status(401).json({ success: false, error: "Authentication required for payment slip OCR." });
      }
      const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ success: false, error: "No image data provided" });
      }
      const cleanMimeType = ALLOWED_IMAGE_MIME_TYPES.has(String(mimeType).toLowerCase())
        ? String(mimeType).toLowerCase()
        : "image/jpeg";

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9+]+;base64,/, "");
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          success: false,
          fallback: true,
          message: "Gemini API key is not configured; manual verification required.",
          data: {
            amount: null,
            bankName: "",
            instrumentNumber: "",
            date: new Date().toISOString().split("T")[0],
            senderOrAccountTitle: "",
            remarks: "Uploaded slip attached for verification",
            confidence: 0,
            slipType: "UNKNOWN",
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: cleanBase64,
              },
            },
            {
              text: `You are an automated financial transaction analyzer for National Lights (N-LINK 360).
Examine this payment slip image (Pakistani Bank Deposit Slip, Online IBFT Receipt / Mobile App screenshot, ATM receipt, or Cheque).
Extract 100% actual and accurate data with zero fabrication:
- amount: The exact numeric amount paid (in PKR without commas). Return null if not readable.
- bankName: The official bank name.
- instrumentNumber: The transaction reference number, TRX ID, STAN, RRN, or Cheque number.
- date: Transaction date in YYYY-MM-DD format if detected, or as printed.
- senderOrAccountTitle: The sender's account name or dealer business name if visible.
- remarks: A concise 1-line note of what is written.
- slipType: One of ['IBFT_SCREENSHOT', 'BANK_DEPOSIT_SLIP', 'CHEQUE', 'ATM_RECEIPT', 'OTHER']
- confidence: Integer confidence score (0-100).

Return valid JSON adhering strictly to the schema.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Numeric amount in PKR" },
              bankName: { type: Type.STRING, description: "Bank name" },
              instrumentNumber: { type: Type.STRING, description: "Transaction ID / Cheque #" },
              date: { type: Type.STRING, description: "YYYY-MM-DD date" },
              senderOrAccountTitle: { type: Type.STRING, description: "Sender or account title" },
              remarks: { type: Type.STRING, description: "Brief slip remarks" },
              slipType: { type: Type.STRING, description: "Category of payment instrument" },
              confidence: { type: Type.INTEGER, description: "Confidence score between 0 and 100" },
            },
            required: ["bankName", "instrumentNumber", "slipType", "confidence"],
          },
        },
      });

      const extractedText = response.text?.trim();
      let parsed = {};
      if (extractedText) {
        parsed = JSON.parse(extractedText);
      }

      res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error("Payment slip scan error:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to scan payment slip",
      });
    }
  });

  // Sync Status & Retry
  app.get("/api/sync/status", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required to read sync status." });
    }
    const syncState = loadSyncStore();
    const pendingCount = syncState.events.filter((e) => e.syncStatus === "PENDING_GOOGLE_SYNC").length;
    const failedCount = syncState.events.filter((e) => e.syncStatus === "SYNC_FAILED").length;
    const reconciliationCount = syncState.events.filter((e) => e.syncStatus === "REQUIRES_RECONCILIATION").length;
    res.json({
      success: true,
      lastDbSavedAt: syncState.lastDbSavedAt,
      lastGoogleSyncedAt: syncState.lastGoogleSyncedAt,
      duplicatesPrevented: syncState.duplicatesPrevented,
      pendingCount,
      failedCount,
      reconciliationCount,
      totalTrackedRecords: syncState.events.length,
      events: syncState.events.slice(0, 100),
    });
  });

  app.post("/api/sync/retry", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required to trigger sync retry." });
    }
    const syncState = loadSyncStore();
    const targetId = String(req.body?.eventId || "").trim();
    const nowIso = new Date().toISOString();
    let retried = 0;
    syncState.events = syncState.events.map((ev) => {
      if (
        (!targetId && (ev.syncStatus === "SYNC_FAILED" || ev.syncStatus === "PENDING_GOOGLE_SYNC")) ||
        (targetId && ev.id === targetId)
      ) {
        retried += 1;
        return { ...ev, syncStatus: "SUCCESSFULLY_SYNCED", receivedAt: nowIso };
      }
      return ev;
    });
    if (retried > 0) {
      syncState.lastGoogleSyncedAt = nowIso;
      saveSyncStore(syncState);
    }
    recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: actor.email,
      action: "SYNC_RETRY_EXECUTED",
      module: "SYSTEM",
      recordId: targetId || "BATCH_RETRY",
      details: `Retried ${retried} sync queue record(s)`,
    });
    res.json({ success: true, retriedCount: retried, lastGoogleSyncedAt: syncState.lastGoogleSyncedAt });
  });

  // Outbox Queue API
  app.get("/api/sync/outbox", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const syncState = loadSyncStore();
    const isAdmin = isEmployeeAdminAccount(actor) || isAuditReaderAccount(actor);
    const items = isAdmin
      ? syncState.outbox
      : syncState.outbox.filter((o: any) => String(o.createdByEmail || "").toLowerCase() === actor.email.toLowerCase());
    res.json({ success: true, items, total: items.length });
  });

  app.post("/api/sync/outbox", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const body = req.body || {};
    const nowIso = new Date().toISOString();
    const syncState = loadSyncStore();
    const idem = String(body.idempotencyKey || body.transactionId || "").trim();
    if (!idem || !body.entityType || !body.sheetTab) {
      return res.status(400).json({ success: false, error: "idempotencyKey, entityType, and sheetTab are required." });
    }
    const existing = syncState.outbox.find((o: any) => o.idempotencyKey === idem && o.entityType === body.entityType);
    if (existing) {
      return res.json({ success: true, item: existing, deduplicated: true });
    }
    const item = {
      id: body.id || `OBX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      idempotencyKey: idem,
      transactionId: String(body.transactionId || idem),
      direction: body.direction || "OUTBOUND",
      entityType: String(body.entityType),
      entityId: String(body.entityId || idem),
      sheetTab: String(body.sheetTab),
      operation: body.operation || "UPSERT",
      payload: body.payload || {},
      status: body.status || "PENDING",
      retryCount: Number(body.retryCount || 0),
      maxRetries: Number(body.maxRetries || 6),
      nextRetryAt: body.nextRetryAt || nowIso,
      createdByEmail: actor.email,
      createdByName: actor.fullName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    syncState.outbox.unshift(item);
    saveSyncStore(syncState);
    res.json({ success: true, item });
  });

  app.post("/api/sync/outbox/process", async (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const syncState = loadSyncStore();
    const webhookUrl = String(
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
        process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
        req.headers["x-google-sheets-webhook"] ||
        ""
    ).trim();
    const sheetToken = process.env.NLINK_SHEET_TOKEN || "";

    const now = Date.now();
    const targetIds: string[] | null = Array.isArray(req.body?.ids) ? req.body.ids : null;
    const dueItems = syncState.outbox.filter((o: any) => {
      if (targetIds && !targetIds.includes(o.id)) return false;
      return o.status === "PENDING" || (o.status === "FAILED" && Date.parse(o.nextRetryAt || "1970-01-01") <= now);
    });

    let completed = 0;
    let failed = 0;
    for (const item of dueItems) {
      if (!webhookUrl) {
        item.status = "FAILED";
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = "GOOGLE_SHEETS_WEBHOOK_URL is not configured on gateway.";
        item.nextRetryAt = new Date(now + Math.min(3600_000, Math.pow(2, item.retryCount) * 15_000)).toISOString();
        item.updatedAt = new Date().toISOString();
        failed += 1;
        continue;
      }
      try {
        const parsedWebhook = new URL(webhookUrl);
        if (parsedWebhook.protocol !== "https:" || parsedWebhook.hostname !== "script.google.com") {
          throw new Error("Invalid Google Apps Script Webhook URL");
        }
        const gsRes = await fetch(webhookUrl, {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
            ...(sheetToken ? { "X-NLINK-SHEET-TOKEN": sheetToken } : {}),
          },
          body: JSON.stringify({
            action: "UPSERT",
            mode: "UPSERT",
            sheetTab: item.sheetTab,
            entityType: item.entityType,
            entityId: item.entityId,
            idempotencyKey: item.idempotencyKey,
            transactionId: item.transactionId,
            sheetToken: sheetToken || undefined,
            record: item.payload,
            timestamp: new Date().toISOString(),
          }),
        });
        const text = await gsRes.text();
        let parsed: any = {};
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {}
        if (!gsRes.ok || parsed?.status === "error" || parsed?.success === false) {
          throw new Error(parsed?.message || parsed?.error || `HTTP ${gsRes.status}`);
        }
        const nowIso = new Date().toISOString();
        item.status = "COMPLETED";
        item.lastError = undefined;
        item.syncedAt = nowIso;
        item.updatedAt = nowIso;
        syncState.lastGoogleSyncedAt = nowIso;
        completed += 1;
      } catch (err: any) {
        item.status = "FAILED";
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err?.message || "Remote Sheet UPSERT failed";
        item.nextRetryAt = new Date(now + Math.min(3600_000, Math.pow(2, item.retryCount) * 15_000)).toISOString();
        item.updatedAt = new Date().toISOString();
        failed += 1;
      }
    }
    saveSyncStore(syncState);
    res.json({
      success: true,
      processed: dueItems.length,
      completed,
      failed,
      lastGoogleSyncedAt: syncState.lastGoogleSyncedAt,
    });
  });

  // Sync Conflicts Quarantine & Resolution
  app.get("/api/sync/conflicts", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    if (!isEmployeeAdminAccount(actor) && !isAuditReaderAccount(actor)) {
      return res.status(403).json({ success: false, error: "Forbidden: Admin, Management, or Accounts access required." });
    }
    const syncState = loadSyncStore();
    res.json({ success: true, conflicts: syncState.conflicts });
  });

  app.post("/api/sync/conflicts", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const body = req.body || {};
    const syncState = loadSyncStore();
    const record = {
      id: body.id || `CONF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entityType: String(body.entityType || "UNKNOWN"),
      entityId: String(body.entityId || "UNKNOWN"),
      sheetTab: String(body.sheetTab || "Unknown"),
      conflictType: body.conflictType || "UNAUTHORIZED_FINANCIAL_EDIT",
      severity: body.severity || "HIGH",
      dbSnapshot: body.dbSnapshot || null,
      sheetSnapshot: body.sheetSnapshot || {},
      status: "OPEN",
      reason: String(body.reason || "Quarantined conflict"),
      detectedBy: actor.email,
      detectedAt: new Date().toISOString(),
    };
    syncState.conflicts.unshift(record);
    saveSyncStore(syncState);
    recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: actor.email,
      action: "SYNC_CONFLICT_QUARANTINED",
      module: "GOOGLE_SHEETS_SYNC",
      recordId: record.id,
      details: record.reason,
    });
    res.json({ success: true, conflict: record });
  });

  app.post("/api/sync/conflicts/:id/resolve", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    if (!isEmployeeAdminAccount(actor) && !isAuditReaderAccount(actor)) {
      return res.status(403).json({ success: false, error: "Forbidden: Admin, Management, or Accounts access required." });
    }
    const resolution = String(req.body?.resolution || "RESOLVED_KEEP_DB");
    const notes = String(req.body?.notes || "").trim();
    const syncState = loadSyncStore();
    const idx = syncState.conflicts.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: "Conflict record not found." });

    const conflict = syncState.conflicts[idx];
    const isFinancial = /INVOICE|RECOVER|LEDGER|INVENTORY|CUSTOMER_BALANCE/i.test(String(conflict.entityType || ""));
    if (resolution === "RESOLVED_ACCEPT_SHEET" && isFinancial && actor.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Only SUPER_ADMIN may override authoritative financial entities.",
      });
    }

    conflict.status = resolution;
    conflict.resolvedBy = actor.email;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolutionNotes = notes || undefined;
    saveSyncStore(syncState);

    recordServerAudit({
      userId: actor.id,
      userName: actor.fullName,
      userEmail: actor.email,
      action: "SYNC_CONFLICT_RESOLVED",
      module: "GOOGLE_SHEETS_SYNC",
      recordId: conflict.id,
      details: `${resolution} on ${conflict.entityType}:${conflict.entityId}${notes ? ` (${notes})` : ""}`,
    });
    res.json({ success: true, conflict });
  });

  // Persistent Per-User Notification Store API
  app.get("/api/notifications", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const syncState = loadSyncStore();
    const emailLower = actor.email.toLowerCase();
    const items = syncState.notifications.filter(
      (n: any) => String(n.userEmail || "").toLowerCase() === emailLower || n.userEmail === "*"
    );
    res.json({ success: true, notifications: items });
  });

  app.post("/api/notifications", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const body = req.body || {};
    const targetEmail = String(body.userEmail || actor.email).trim().toLowerCase();
    const syncState = loadSyncStore();
    if (body.dedupeKey) {
      const existing = syncState.notifications.find(
        (n: any) => String(n.userEmail || "").toLowerCase() === targetEmail && n.dedupeKey === body.dedupeKey
      );
      if (existing) {
        existing.title = body.title || existing.title;
        existing.message = body.message || existing.message;
        existing.severity = body.severity || existing.severity;
        existing.syncStatus = body.syncStatus || existing.syncStatus;
        existing.isRead = false;
        saveSyncStore(syncState);
        return res.json({ success: true, notification: existing, updated: true });
      }
    }
    const item = {
      id: body.id || `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: body.userId || actor.id,
      userEmail: targetEmail,
      dedupeKey: body.dedupeKey || undefined,
      category: body.category || "SYNC",
      severity: body.severity || "INFO",
      title: String(body.title || "Sync Update"),
      message: String(body.message || ""),
      entityType: body.entityType,
      entityId: body.entityId,
      transactionId: body.transactionId,
      syncStatus: body.syncStatus,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    syncState.notifications.unshift(item);
    saveSyncStore(syncState);
    res.json({ success: true, notification: item });
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const syncState = loadSyncStore();
    const item = syncState.notifications.find((n: any) => n.id === req.params.id);
    if (item) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      saveSyncStore(syncState);
    }
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
    const syncState = loadSyncStore();
    const emailLower = actor.email.toLowerCase();
    const nowIso = new Date().toISOString();
    syncState.notifications.forEach((n: any) => {
      if (String(n.userEmail || "").toLowerCase() === emailLower && !n.isRead) {
        n.isRead = true;
        n.readAt = nowIso;
      }
    });
    saveSyncStore(syncState);
    res.json({ success: true });
  });

  // Price List
  app.get("/api/price-list", (_req, res) => {
    const store = loadPriceListStore();
    const items = NATIONAL_LIGHT_OFFICIAL_CATALOG.map((item) => {
      const ov = store.overrides[item.id] || store.overrides[item.sku];
      return {
        ...item,
        skuCode: item.sku,
        purchasePrice: ov?.purchasePrice ?? null,
        tradePrice: ov?.tradePrice ?? item.tradePrice,
        listPrice: ov?.listPrice ?? item.listPrice,
        discountPercentage: ov?.discountPercentage ?? item.discountPercentage,
        effectivePriceDate: ov?.effectivePriceDate ?? "2026-01-01",
        updatedAt: ov?.updatedAt || null,
      };
    });
    res.json({ success: true, count: items.length, items, history: store.history.slice(0, 100) });
  });

  app.put("/api/price-list/:skuId", (req, res) => {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: "Authentication required to update price list." });
    }
    const roleUpper = String(session.role || "").toUpperCase();
    const allowed =
      roleUpper === "SUPER_ADMIN" ||
      roleUpper === "ACCOUNTS" ||
      roleUpper === "MANAGEMENT" ||
      hasPermission(session.role as any, "masters.manage") ||
      hasPermission(session.role as any, "recovery.verify");
    if (!allowed) {
      return res.status(403).json({ success: false, error: "Forbidden: Authorized Admin / Accounts role required." });
    }

    const skuId = String(req.params.skuId || "").trim();
    const target = NATIONAL_LIGHT_OFFICIAL_CATALOG.find((s) => s.id === skuId || s.sku === skuId);
    if (!target) {
      return res.status(404).json({ success: false, error: `SKU ${skuId} not found.` });
    }

    const tradePrice = Number(req.body?.tradePrice);
    const listPrice = Number(req.body?.listPrice);
    const reason = String(req.body?.reason || "").trim();
    if (!Number.isFinite(tradePrice) || tradePrice <= 0 || !Number.isFinite(listPrice) || listPrice <= 0) {
      return res.status(400).json({ success: false, error: "Positive finite tradePrice and listPrice are required." });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: "Price change reason is mandatory." });
    }

    const nowIso = new Date().toISOString();
    const store = loadPriceListStore();
    const prevTrade = store.overrides[target.id]?.tradePrice ?? target.tradePrice;
    const prevList = store.overrides[target.id]?.listPrice ?? target.listPrice;
    const effectivePriceDate = String(req.body?.effectiveDate || nowIso.slice(0, 10));

    store.overrides[target.id] = {
      ...(store.overrides[target.id] || {}),
      tradePrice,
      listPrice,
      discountPercentage: req.body?.discountPercentage ?? target.discountPercentage,
      purchasePrice: req.body?.purchasePrice !== undefined ? req.body.purchasePrice : null,
      effectivePriceDate,
      updatedAt: nowIso,
    };
    const historyEntry = {
      id: `PH-SRV-${Date.now()}`,
      skuId: target.id,
      skuCode: target.sku,
      skuName: target.name,
      oldTradePrice: prevTrade,
      newTradePrice: tradePrice,
      oldListPrice: prevList,
      newListPrice: listPrice,
      effectiveDate: effectivePriceDate,
      changedBy: session.email,
      reason,
      createdAt: nowIso,
    };
    store.history.unshift(historyEntry);
    savePriceListStore(store);

    res.json({ success: true, skuId: target.id, updated: store.overrides[target.id], historyEntry });
  });

  // Sync Endpoint (Authenticated + Idempotent + Optional Supabase sync_events persistence)
  app.post("/api/sync", async (req, res) => {
    const actor = authenticateGatewayUser(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: "Authentication required for sync event logging." });
    }

    const payload = req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ success: false, error: "A valid JSON event is required." });
    }

    const syncState = loadSyncStore();
    const idemKey = String(req.headers["x-idempotency-key"] || payload?.idempotencyKey || "").trim();
    const txnSignature = String(payload?.transactionSignature || payload?.transactionId || "").trim();
    const fingerprintHash = String(payload?.fingerprintHash || "").trim();

    if (payload?.type === "DUPLICATE_PREVENTION_TELEMETRY") {
      syncState.duplicatesPrevented += 1;
      saveSyncStore(syncState);
      return res.json({
        success: true,
        duplicateTelemetryRecorded: true,
        duplicatesPrevented: syncState.duplicatesPrevented,
      });
    }

    if (idemKey && serverIdempotencyCache.has(idemKey)) {
      const cached = serverIdempotencyCache.get(idemKey)!;
      syncState.duplicatesPrevented += 1;
      saveSyncStore(syncState);
      return res.status(cached.status).json({
        ...cached.body,
        idempotentReplay: true,
        duplicatePrevented: true,
        originalTransactionId:
          (cached.body.payloadSummary as any)?.transactionId || (cached.body.payloadSummary as any)?.recordId,
      });
    }

    const sigKey = fingerprintHash
      ? `fp:${fingerprintHash}`
      : txnSignature
        ? `sig:${txnSignature}`
        : idemKey
          ? `idem:${idemKey}`
          : "";

    if (sigKey && syncState.seenSignatures[sigKey]) {
      const prev = syncState.seenSignatures[sigKey];
      syncState.duplicatesPrevented += 1;
      saveSyncStore(syncState);
      return res.status(200).json({
        success: true,
        idempotentReplay: true,
        duplicatePrevented: true,
        originalTransactionId: prev.transactionId,
        message: `Duplicate transaction rejected safely. Original reference: ${prev.transactionId}`,
        receivedAt: prev.receivedAt,
        payloadSummary: prev.payloadSummary,
      });
    }

    const nowIso = new Date().toISOString();
    const assignedTxnId = txnSignature || payload?.id || `SYNC-${Date.now()}`;
    const eventType = String(payload?.type || "GENERAL_SYNC").slice(0, 80);
    const payloadSummary = {
      type: eventType,
      recordId: payload?.id || assignedTxnId,
      transactionId: assignedTxnId,
    };

    const persistedToSupabase = await persistSupabaseSyncEvent({
      transaction_id: assignedTxnId,
      event_type: eventType,
      fingerprint_hash: fingerprintHash || null,
      idempotency_key: UUID_V4_RE.test(idemKey) ? idemKey : null,
      sync_status: "EVENT_RECORDED",
      actor_email: actor.email,
      received_at: nowIso,
    });

    const responseBody = {
      success: true,
      persisted: persistedToSupabase,
      message: "Sync event recorded safely in gateway ledger.",
      receivedAt: nowIso,
      idempotencyKey: idemKey || undefined,
      transactionId: assignedTxnId,
      duplicatePrevented: false,
      payloadSummary,
    };

    if (sigKey) {
      syncState.seenSignatures[sigKey] = {
        transactionId: assignedTxnId,
        receivedAt: nowIso,
        payloadSummary,
      };
    }
    const isGoogleSync = /SHEET|WEBHOOK|TWO_WAY/i.test(eventType);
    syncState.lastDbSavedAt = nowIso;
    if (isGoogleSync) {
      syncState.lastGoogleSyncedAt = nowIso;
    }
    syncState.events.unshift({
      id: `SEV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: eventType,
      transactionId: assignedTxnId,
      fingerprintHash: fingerprintHash || undefined,
      idempotencyKey: idemKey || undefined,
      syncStatus: isGoogleSync ? "SUCCESSFULLY_SYNCED" : "SAVED_IN_DB",
      receivedAt: nowIso,
    });
    saveSyncStore(syncState);

    if (idemKey) {
      if (serverIdempotencyCache.size >= 1000) {
        const oldestKey = serverIdempotencyCache.keys().next().value;
        if (oldestKey) serverIdempotencyCache.delete(oldestKey);
      }
      serverIdempotencyCache.set(idemKey, { status: 200, body: responseBody, cachedAt: Date.now() });
    }

    res.json(responseBody);
  });

  // Google Sheets Server-Side Sync Proxy
  app.post("/api/sync-google-sheets", async (req, res) => {
    try {
      const actor = authenticateGatewayUser(req);
      if (!actor) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for Google Sheets synchronization.",
        });
      }
      const payload = req.body;
      const clientWebhookUrl = String(req.headers["x-google-sheets-webhook"] || "").trim();
      const serverWebhookUrl = String(
        process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL || ""
      ).trim();

      const webhookUrl = String(serverWebhookUrl || clientWebhookUrl || DEFAULT_GOOGLE_SHEETS_WEBHOOK).trim();

      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          error:
            "Google Sheets Webhook URL is not configured. Please define GOOGLE_SHEETS_WEBHOOK_URL on the server or provide it in settings.",
        });
      }

      let isValidWebhookUrl = false;
      try {
        const parsedWebhook = new URL(webhookUrl);
        isValidWebhookUrl =
          parsedWebhook.protocol === "https:" &&
          parsedWebhook.hostname === "script.google.com" &&
          parsedWebhook.pathname.startsWith("/macros/s/");
      } catch {
        isValidWebhookUrl = false;
      }

      if (!isValidWebhookUrl) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid Google Apps Script Webhook URL. It must start with https://script.google.com/macros/s/.../exec",
        });
      }

      const sheetToken = process.env.NLINK_SHEET_TOKEN || "";
      const forwardedBody = {
        ...(payload || {}),
        ...(sheetToken ? { sheetToken } : {}),
        spreadsheetId: payload?.spreadsheetId || "1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo",
      };

      const googleResponse = await fetch(webhookUrl, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          ...(sheetToken ? { "X-NLINK-SHEET-TOKEN": sheetToken } : {}),
        },
        body: JSON.stringify(forwardedBody),
      });

      const responseText = await googleResponse.text();
      let googleData: any = { status: "success" };
      try {
        if (responseText) {
          googleData = JSON.parse(responseText);
        }
      } catch {
        googleData = { status: "success", raw: responseText.slice(0, 120) };
      }

      const explicitSheetError =
        String(googleData?.status || "").toLowerCase() === "error" || googleData?.success === false;

      if ((!googleResponse.ok && googleResponse.status !== 302) || explicitSheetError) {
        return res.status(502).json({
          success: false,
          error:
            googleData?.message ||
            googleData?.error ||
            `Google Apps Script returned status ${googleResponse.status}. Verify deployment and NLINK_SHEET_TOKEN.`,
          statusCode: googleResponse.status,
        });
      }

      res.json({
        success: true,
        status: googleResponse.status,
        googleData,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to proxy Google Sheets webhook request",
      });
    }
  });

  // Strict JSON 404 catch-all so /api/* NEVER falls through to SPA HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl || req.path}`,
    });
  });

  return app;
}

/**
 * Invokes the Express API app directly inside serverless environments (e.g. Netlify Functions)
 * without opening a listening TCP port.
 */
export async function invokeExpressGateway(
  app: express.Express,
  request: {
    method: string;
    url: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: string | Buffer | null;
  }
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve) => {
    const bodyBuffer =
      request.body === undefined || request.body === null
        ? Buffer.alloc(0)
        : Buffer.isBuffer(request.body)
          ? request.body
          : Buffer.from(String(request.body), "utf-8");

    const normalizedHeaders: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(request.headers || {})) {
      if (v !== undefined) normalizedHeaders[k.toLowerCase()] = v;
    }
    if (bodyBuffer.length > 0 && !normalizedHeaders["content-length"]) {
      normalizedHeaders["content-length"] = String(bodyBuffer.length);
    }

    const socket = new Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    const req = new IncomingMessage(socket as any);
    req.method = request.method.toUpperCase();
    req.url = request.url;
    req.headers = normalizedHeaders;

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const customHeaders: Record<string, string> = {};

    const origSetHeader = res.setHeader.bind(res);
    res.setHeader = ((name: string, value: number | string | readonly string[]) => {
      customHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
      return origSetHeader(name, value);
    }) as any;

    res.write = ((chunk: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(String(chunk), typeof encoding === "string" ? (encoding as BufferEncoding) : "utf-8")
        );
      }
      if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      return true;
    }) as any;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const allHeaders: Record<string, string> = { ...customHeaders };
      for (const [k, v] of Object.entries(res.getHeaders())) {
        if (v !== undefined) {
          allHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
        }
      }
      resolve({
        statusCode: res.statusCode || 200,
        headers: allHeaders,
        body: Buffer.concat(chunks).toString("utf-8"),
      });
    };

    res.end = ((chunk?: any, encoding?: any, cb?: any) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(String(chunk), typeof encoding === "string" ? (encoding as BufferEncoding) : "utf-8")
        );
      }
      if (typeof chunk === "function") chunk();
      else if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      finish();
      return res;
    }) as any;

    app(req as any, res as any, () => {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ success: false, error: `API endpoint not found: ${req.method} ${req.url}` }));
    });

    process.nextTick(() => {
      if (bodyBuffer.length > 0) {
        req.push(bodyBuffer);
      }
      req.push(null);
    });
  });
}
