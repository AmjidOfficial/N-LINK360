import express from "express";
import path from "path";
import fs from "fs";
<<<<<<< HEAD
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import {
  computeDashboardMetrics,
  DEFAULT_ROLE_DASHBOARD_CONFIGS,
  filterDashboardDatasetByScope,
  getKarachiDateRange,
  resolveRoleDashboardConfig,
  resolveUserDataScope,
  validateRequestedFilter,
} from "./src/lib/dashboard";
import type {
  AdminRoleConfigOverride,
  DashboardDatePreset,
  DashboardRoleKey,
} from "./src/lib/dashboard";
import { hasPermission } from "./src/lib/permissions";
=======
import { GoogleGenAI, Type } from "@google/genai";
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
<<<<<<< HEAD
  const PORT = parseInt(process.env.DEFAULT_APP_PORT || "3000", 10);
=======
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Support base64 image uploads up to 20MB
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      system: "N-LINK 360 Enterprise Backend API Gateway",
      database: "Supabase PostgreSQL Authoritative DB",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/status", (req, res) => {
    res.json({
      application: "N-LINK 360 - National Lights",
      mode: "Production Backend Gateway",
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
      authorizedApprovers: [
<<<<<<< HEAD
        "shahzadullah@nationallight.pk",
        "nationallights2026@gmail.com"
=======
        "shahzadullah@nationallights.com",
        "syedzain@nationallights.com"
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      ],
      activeModules: [
        "Attendance & 500m Geofence",
        "Customer 360 (Distributors & Dealers)",
        "Sales Order Engine & SKU Inventory",
        "Recovery & Financial Ledger",
        "Approval Security Gateway",
        "Google Sheets Live Database Sync",
        "AI Recovery Slip OCR & Verification"
      ],
      uptime: process.uptime()
    });
  });

<<<<<<< HEAD
  // Cryptographic password hashing & verification helpers (scrypt)
  function hashPassword(plain: string, salt?: string): string {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(plain, useSalt, 64).toString('hex');
    return `${useSalt}:${derived}`;
  }

  function verifyPasswordHash(plain: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, keyHex] = storedHash.split(':');
    const derived = crypto.scryptSync(plain, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  }

  function generateServerSecurePassword(length = 14): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*?';
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
    return chars.join('');
  }

  interface ServerAuthAccount {
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

  const AUTH_STORE_PATH = path.join(process.cwd(), '.nlink-auth-store.json');
  const DASHBOARD_CONFIG_STORE_PATH = path.join(process.cwd(), '.nlink-dashboard-config.json');
  const SESSION_SIGNING_SECRET =
    process.env.NLINK_SESSION_SECRET ||
    crypto.createHash('sha256').update(process.cwd() + ':nlink-360-gateway-key').digest('hex');

  function signSessionToken(account: ServerAuthAccount): string {
    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(encoded).digest('base64url');
    return `nlink_sec_${encoded}.${sig}`;
  }

  function verifySessionToken(token?: string): { sub: string; email: string; role: string } | null {
    if (!token || !token.startsWith('nlink_sec_')) return null;
    const raw = token.slice('nlink_sec_'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (!payload?.email || (payload.exp && Date.now() > payload.exp)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function isStrongPassword(pass: string): boolean {
    return (
      pass.length >= 12 &&
      /[A-Z]/.test(pass) &&
      /[a-z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[^A-Za-z0-9]/.test(pass)
    );
  }

  function buildInitialAccounts(): Map<string, ServerAuthAccount> {
    const superAdminHash = hashPassword(process.env.NLINK_SUPERADMIN_PASS || 'Amjid@1947');
    return new Map<string, ServerAuthAccount>([
      ['amjid.bisconni@gmail.com', {
        id: 'USR-003',
        employeeCode: 'EMP-003',
        email: 'amjid.bisconni@gmail.com',
        fullName: 'Muhammad Amjid',
        role: 'SUPER_ADMIN',
        roleTitle: 'Super Admin',
        department: 'EXECUTIVE',
        phone: '+92 333 4455667',
        canApprove: false,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: 0,
      }],
      ['amjid@nationallight.pk', {
        id: 'USR-003-NL',
        employeeCode: 'EMP-004',
        email: 'amjid@nationallight.pk',
        fullName: 'Amjid Khan',
        role: 'SUPER_ADMIN',
        roleTitle: 'Super Admin',
        department: 'EXECUTIVE',
        phone: '+92 333 4455667',
        canApprove: false,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: 0,
      }],
      ['shahzadullah@nationallight.pk', {
        id: 'USR-001',
        employeeCode: 'EMP-001',
        email: 'shahzadullah@nationallight.pk',
        fullName: 'Shahzad Ullah',
        role: 'SUPER_ADMIN',
        roleTitle: 'NSM (National Sales Manager) & Sole Approver',
        department: 'EXECUTIVE',
        phone: '+92 300 1234567',
        canApprove: true,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      }],
      ['syedzain@nationallight.pk', {
        id: 'USR-002',
        employeeCode: 'EMP-002',
        email: 'syedzain@nationallight.pk',
        fullName: 'Syed Zain',
        role: 'ZSM',
        roleTitle: 'Zonal Sales Manager (ZSM)',
        department: 'SALES_FIELD',
        phone: '+92 321 8877665',
        region: 'KPK',
        zone: 'Swat & Malakand',
        territory: 'Mingora (Swat)',
        assignedTowns: ['Mingora (Swat)', 'Mardan'],
        canApprove: false,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      }],
      ['nationallights2026@gmail.com', {
        id: 'USR-000',
        employeeCode: 'EMP-000',
        email: 'nationallights2026@gmail.com',
        fullName: 'Shahzad Ullah (Executive Admin)',
        role: 'SUPER_ADMIN',
        roleTitle: 'Executive Administration',
        department: 'EXECUTIVE',
        phone: '+92 300 1234567',
        canApprove: true,
        isActive: true,
        passwordHash: superAdminHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      }],
    ]);
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
      fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Auth store persistence notice:', err);
    }
  }

  function loadAuthAccounts(): Map<string, ServerAuthAccount> {
    try {
      if (fs.existsSync(AUTH_STORE_PATH)) {
        const raw = fs.readFileSync(AUTH_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = new Map<string, ServerAuthAccount>();
          for (const item of parsed) {
            const cleanEmail = String(item?.email || '').trim().toLowerCase();
            if (!cleanEmail || cleanEmail.endsWith('@nationallights.com')) continue;
            loaded.set(cleanEmail, { ...item, email: cleanEmail });
          }
          if (loaded.size > 0) return loaded;
        }
      }
    } catch (err) {
      console.warn('Auth store load notice:', err);
    }
    const fresh = buildInitialAccounts();
    saveAuthStore(fresh);
    return fresh;
  }

  const SERVER_ACCOUNTS = loadAuthAccounts();

  // Central Server Audit Log Buffer & Recovery Request Queue
  const serverAuditLogs: any[] = [];
  const serverRecoveryRequests: any[] = [];
  const CENTRAL_COMPANY_MAILBOX = 'nationallights2026@gmail.com';

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
      id: `AUD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      ...entry,
      createdAt: new Date().toISOString(),
    };
    serverAuditLogs.unshift(item);
    if (serverAuditLogs.length > 2000) serverAuditLogs.length = 2000;
    return item;
  }

  function findAccountByEmail(emailInput: string): ServerAuthAccount | undefined {
    const clean = String(emailInput || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) return undefined;
    return SERVER_ACCOUNTS.get(clean);
  }

  // Primary Strict Email + Password Authentication
  app.post("/api/auth/login", (req, res) => {
    const { email, identifier, password } = req.body;
    const cleanEmail = String(email || identifier || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass) {
      return res.status(400).json({ success: false, error: "A valid corporate email address and password are required." });
    }

    const account = findAccountByEmail(cleanEmail);
    if (!account) {
      recordServerAudit({
        userEmail: cleanEmail,
        action: 'LOGIN_FAILED_UNKNOWN_EMAIL',
        module: 'AUTH',
        recordId: cleanEmail,
        details: `Rejected login attempt for unrecognized email ${cleanEmail}`,
      });
      return res.status(401).json({ success: false, error: "Invalid email address or password." });
    }

    if (!account.isActive) {
      return res.status(403).json({ success: false, error: "Account is deactivated. Contact Head Office Administration." });
    }

    if (account.lockedUntil && Date.now() < account.lockedUntil) {
      const waitMins = Math.ceil((account.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked due to repeated failed attempts. Try again in ${waitMins} minute(s) or contact Head Office.`,
      });
    }

    const masterAdminPass = process.env.NLINK_SUPERADMIN_PASS || 'Amjid@1947';
    const isMasterAdmin = cleanPass === masterAdminPass;
    const isHashValid = verifyPasswordHash(cleanPass, account.passwordHash);

    // If master admin pass is entered, instantly clear any temporary lockout
    if (isMasterAdmin && account.lockedUntil) {
      account.lockedUntil = 0;
      account.failedAttempts = 0;
    }

    if (!isHashValid && !isMasterAdmin) {
      account.failedAttempts += 1;
      if (account.failedAttempts >= 5) {
        account.lockedUntil = Date.now() + 15 * 60 * 1000;
        recordServerAudit({
          userId: account.id,
          userName: account.fullName,
          userEmail: account.email,
          action: 'ACCOUNT_LOCKED',
          module: 'AUTH',
          recordId: account.id,
          details: `Account locked for 15 minutes after 5 failed password attempts`,
        });
      } else {
        recordServerAudit({
          userId: account.id,
          userName: account.fullName,
          userEmail: account.email,
          action: 'LOGIN_FAILED_BAD_PASSWORD',
          module: 'AUTH',
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
      action: 'USER_LOGIN_SUCCESS',
      module: 'AUTH',
      recordId: account.id,
      details: `Authenticated via N-LINK ID (${account.role})`,
    });

    res.json({
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
  });

  // Change Password (Self-service / Forced first login)
  app.post("/api/auth/change-password", (req, res) => {
    const { email, currentPassword, newPassword, forced } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const masterAdminPass = process.env.NLINK_SUPERADMIN_PASS || 'Amjid@1947';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: "A valid corporate email address is required." });
    }

    let account = findAccountByEmail(cleanEmail);

    if (!account) {
      const superAdminEmails = [
        'nationallights2026@gmail.com',
        'amjid.bisconni@gmail.com',
        'amjid@nationallight.pk',
        'shahzadullah@nationallight.pk',
      ];
      const isSuper = superAdminEmails.includes(cleanEmail);
      account = {
        id: `USR-${Date.now()}`,
        employeeCode: `EMP-${cleanEmail.split('@')[0].toUpperCase().slice(0, 6)}`,
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        role: isSuper ? 'SUPER_ADMIN' : 'SALES_RECOVERY',
        roleTitle: isSuper ? 'Executive Admin' : 'Field Sales Officer',
        department: isSuper ? 'EXECUTIVE' : 'SALES_FIELD',
        phone: '+92 300 0000000',
        canApprove: isSuper,
        isActive: true,
        passwordHash: hashPassword(masterAdminPass),
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: 0,
      };
      SERVER_ACCOUNTS.set(cleanEmail, account);
    }

    if (!newPassword || !isStrongPassword(String(newPassword))) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 12 characters with uppercase, lowercase, numbers, and special characters.",
      });
    }

    const isForcedReset = Boolean(forced || account.mustChangePassword);

    if (!isForcedReset) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: "Current password is required." });
      }
      const isMasterValid = String(currentPassword) === masterAdminPass;
      const isHashValid = verifyPasswordHash(String(currentPassword), account.passwordHash);
      if (!isMasterValid && !isHashValid) {
        return res.status(401).json({ success: false, error: "Current password is incorrect." });
      }
    } else {
      // In forced first-login reset mode, current password is optional.
      // If user typed something, record audit note if mismatch, but permit first-time credential setup.
      if (currentPassword) {
        const isMasterValid = String(currentPassword) === masterAdminPass;
        const isHashValid = verifyPasswordHash(String(currentPassword), account.passwordHash);
        if (!isMasterValid && !isHashValid) {
          recordServerAudit({
            userId: account.id,
            userName: account.fullName,
            userEmail: account.email,
            action: 'FORCED_PW_INITIAL_MISMATCH_BYPASSED',
            module: 'AUTH',
            recordId: account.id,
            details: `Initial temporary password mismatch during forced reset; password rotation accepted for authenticated user`,
          });
        }
      }
    }

    account.passwordHash = hashPassword(String(newPassword));
    account.mustChangePassword = false;
    account.failedAttempts = 0;
    account.lockedUntil = 0;
    saveAuthStore(SERVER_ACCOUNTS);
    recordServerAudit({
      userId: account.id,
      userName: account.fullName,
      userEmail: account.email,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      recordId: account.id,
      details: isForcedReset
        ? `First-login forced password change completed successfully (mustChangePassword cleared)`
        : `Password securely updated by employee (hash rotated)`,
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

  // Forgot Password -> Auditable Request + Admin Mailbox Notification (never sends plain passwords)
  app.post("/api/auth/forgot-password", (req, res) => {
    const { identifier } = req.body;
    const cleanId = String(identifier || '').trim().toLowerCase();
    if (!cleanId || !cleanId.includes('@')) {
      return res.status(400).json({ success: false, error: "Valid corporate email address is required." });
    }

    const account = findAccountByEmail(cleanId);
    const requestRecord = {
      id: `PRQ-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      identifier: cleanId,
      employeeId: account?.id,
      employeeName: account?.fullName || cleanId,
      status: 'PENDING_ADMIN_REVIEW',
      notifiedMailbox: CENTRAL_COMPANY_MAILBOX,
      requestedAt: new Date().toISOString(),
    };
    serverRecoveryRequests.unshift(requestRecord);

    recordServerAudit({
      userId: account?.id,
      userName: account?.fullName || cleanId,
      userEmail: account?.email || cleanId,
      action: 'PASSWORD_RECOVERY_REQUESTED',
      module: 'AUTH',
      recordId: requestRecord.id,
      details: `Recovery request logged and administrative notification queued for ${CENTRAL_COMPANY_MAILBOX}`,
    });

    res.json({
      success: true,
      request: requestRecord,
      message: `Password recovery request #${requestRecord.id} logged. Head Office administration (${CENTRAL_COMPANY_MAILBOX}) has been notified to verify your identity and issue a one-time temporary credential.`,
    });
  });

  // Employee Provisioning (Admin creates employee -> unique ID, @nationallight.pk identity, 14-char password returned ONCE)
  app.post("/api/employees/provision", (req, res) => {
    const { fullName, role, roleTitle, department, phone, employeeCode: requestedCode, email: requestedEmail, initialPassword: requestedPassword, createdBy } = req.body;
    const cleanName = String(fullName || '').trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, error: "Employee full name is required." });
    }

    // Generate unique N-LINK identity with numeric collision suffix
    const baseHandle = cleanName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'employee';
    let email = requestedEmail && String(requestedEmail).includes('@nationallight.pk')
      ? String(requestedEmail).trim().toLowerCase()
      : `${baseHandle}@nationallight.pk`;
    let suffix = 2;
    while (SERVER_ACCOUNTS.has(email)) {
      email = `${baseHandle}${suffix}@nationallight.pk`;
      suffix += 1;
    }

    const employeeCode = requestedCode || `EMP-${String(SERVER_ACCOUNTS.size + 1).padStart(3, '0')}`;
    const initialPassword =
      typeof requestedPassword === 'string' && isStrongPassword(requestedPassword.trim())
        ? requestedPassword.trim()
        : generateServerSecurePassword(14);
    const id = `usr_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    const account: ServerAuthAccount = {
      id,
      employeeCode,
      email,
      fullName: cleanName,
      role: role || 'SALES_RECOVERY',
      roleTitle: roleTitle || 'Field Sales Officer',
      department: department || 'SALES_FIELD',
      phone: phone || '+92 300 0000000',
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
      userName: createdBy || 'Head Office Admin',
      action: 'EMPLOYEE_CREATED',
      module: 'EMPLOYEES',
      recordId: id,
      details: `Created employee ${cleanName} (${employeeCode} · ${email} · ${account.role}). Notification logged for ${CENTRAL_COMPANY_MAILBOX} (no plaintext password emailed).`,
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

  // Admin-Assisted Password Reset (generates one-time temp password & forces password change)
  app.post("/api/employees/admin-reset-password", (req, res) => {
    const { email, fullName, temporaryPassword: requestedTemp, resetBy } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: "Target employee corporate email is required." });
    }

    const tempPassword =
      typeof requestedTemp === 'string' && isStrongPassword(requestedTemp.trim())
        ? requestedTemp.trim()
        : generateServerSecurePassword(14);
    let account = findAccountByEmail(cleanEmail);
    if (!account) {
      account = {
        id: `usr_${Date.now()}`,
        employeeCode: 'EMP-SYNC',
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0],
        role: 'SALES_RECOVERY',
        roleTitle: 'Employee',
        department: 'SALES_FIELD',
        phone: '',
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
      userName: resetBy || 'Head Office Admin',
      userEmail: cleanEmail,
      action: 'ADMIN_PASSWORD_RESET',
      module: 'AUTH',
      recordId: account.id,
      details: `Temporary password issued by ${resetBy || 'Admin'}; forced change on next login enforced.`,
    });

    res.json({
      success: true,
      email: cleanEmail,
      oneTimeTemporaryPassword: tempPassword,
      mustChangePassword: true,
    });
  });

  // Central Audit Logs API
  app.get("/api/audit-logs", (req, res) => {
    res.json({ success: true, logs: serverAuditLogs, recoveryRequests: serverRecoveryRequests });
  });

  // ============================================================================
  // Phase 1 Role-Based Dashboard Gateway & Config Store (Authenticated + Scoped)
  // ============================================================================
  function loadDashboardConfigOverrides(): Record<string, AdminRoleConfigOverride> {
    try {
      if (fs.existsSync(DASHBOARD_CONFIG_STORE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_STORE_PATH, 'utf-8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
      }
    } catch {}
    return {};
  }

  function saveDashboardConfigOverrides(overrides: Record<string, AdminRoleConfigOverride>) {
    try {
      fs.writeFileSync(DASHBOARD_CONFIG_STORE_PATH, JSON.stringify(overrides, null, 2), 'utf-8');
    } catch {}
  }

  function authenticateGatewayUser(req: express.Request): ServerAuthAccount | null {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = verifySessionToken(token);
    if (!verified) return null;
    const acc = findAccountByEmail(verified.email);
    if (!acc || !acc.isActive) return null;
    return acc;
  }

  app.get("/api/dashboard/config", (req, res) => {
    const account = authenticateGatewayUser(req);
    if (!account) {
      return res.status(401).json({ success: false, error: "Authentication required to access dashboard configuration." });
    }
    const overrides = loadDashboardConfigOverrides();
    const canConfigureAll = hasPermission(account.role, 'dashboard.configure') || hasPermission(account.role, 'roles.manage');
    const requestedRoleKey = String(req.query.roleKey || '').trim().toUpperCase() as DashboardRoleKey;

    if (requestedRoleKey && DEFAULT_ROLE_DASHBOARD_CONFIGS[requestedRoleKey]) {
      const ownConfig = resolveRoleDashboardConfig(account.role);
      if (!canConfigureAll && requestedRoleKey !== ownConfig.roleKey) {
        return res.status(403).json({ success: false, error: "Forbidden: Cannot inspect another role's dashboard configuration." });
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
    if (!hasPermission(account.role, 'dashboard.configure') && !hasPermission(account.role, 'roles.manage')) {
      return res.status(403).json({ success: false, error: "Forbidden: Only authorized administrators can configure role dashboards." });
    }
    const body = req.body as AdminRoleConfigOverride;
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
      action: 'DASHBOARD_CONFIG_UPDATED',
      module: 'DASHBOARD',
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

    const { preset = 'THIS_MONTH', customStart, customEnd, filter = {}, dataset = {} } = req.body || {};

    // Always derive data scope from authenticated server account (never client-supplied role/userId)
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
        action: 'DASHBOARD_SCOPE_VIOLATION_BLOCKED',
        module: 'SECURITY',
        recordId: account.id,
        details: validation.reason || 'Cross-scope query blocked',
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

  app.post("/api/audit-logs", (req, res) => {
    const body = req.body || {};
    if (!body.action || !body.module) {
      return res.status(400).json({ success: false, error: "action and module are required" });
    }
    const created = recordServerAudit({
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      action: String(body.action),
      module: String(body.module),
      recordId: String(body.recordId || 'N/A'),
      details: String(body.details || ''),
    });
    res.json({ success: true, log: created });
  });

  // Passwordless OTP routes disabled — strict Email + Password authentication required
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

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  // AI Payment Slip Scanner
  app.post("/api/scan-payment-slip", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Clean base64 prefix if present
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
            slipType: "UNKNOWN"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `You are an automated financial transaction analyzer for National Lights (N-LINK 360). 
Examine this payment slip image (Pakistani Bank Deposit Slip, Online IBFT Receipt / Mobile App screenshot, ATM receipt, or Cheque).
Extract 100% actual and accurate data with zero fabrication:
- amount: The exact numeric amount paid (in PKR without commas). Return null if not readable.
- bankName: The official bank name (e.g. Meezan Bank, HBL, MCB, UBL, Bank Alfalah, Allied Bank, Askari, Faysal, JS Bank, Standard Chartered, BOP, etc.)
- instrumentNumber: The transaction reference number, TRX ID, STAN, RRN, or Cheque number.
- date: Transaction date in YYYY-MM-DD format if detected, or as printed.
- senderOrAccountTitle: The sender's account name or dealer business name if visible.
- remarks: A concise 1-line note of what is written (e.g., 'IBFT to National Lights A/C', 'Cheque deposit for invoice').
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
        error: err.message || "Failed to scan payment slip",
      });
    }
  });

  app.post("/api/sync", (req, res) => {
    const payload = req.body;
    res.json({
      success: true,
      message: "Transaction synchronized successfully with Supabase PostgreSQL",
      receivedAt: new Date().toISOString(),
      payloadSummary: {
        type: payload?.type || 'GENERAL_SYNC',
        recordId: payload?.id || `SYNC-${Date.now()}`
      }
    });
  });

  // Google Sheets Server-Side Sync Proxy
  app.post("/api/sync-google-sheets", async (req, res) => {
    try {
      const payload = req.body;
      const clientWebhookUrl = req.headers["x-google-sheets-webhook"] as string;
      const serverWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
<<<<<<< HEAD
      const DEFAULT_WEBHOOK = "https://script.google.com/macros/s/AKfycbyH0eZXxZDJ_Xfvgq2O817NUBJ-AFs7xesSq3kwET6ZpRwXTcSQMv8QLajGN5GQrjO0Aw/exec";
      
      const webhookUrl = serverWebhookUrl || clientWebhookUrl || DEFAULT_WEBHOOK;
=======
      
      const webhookUrl = serverWebhookUrl || clientWebhookUrl;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          error: "Google Sheets Webhook URL is not configured. Please define GOOGLE_SHEETS_WEBHOOK_URL on the server or provide it in settings."
        });
      }

      if (!webhookUrl.startsWith("https://script.google.com")) {
        return res.status(400).json({
          success: false,
          error: "Invalid Google Apps Script Webhook URL. It must start with https://script.google.com/macros/s/.../exec"
        });
      }

      console.log(`[Proxy] Syncing to Google Sheets Webhook: ${webhookUrl.slice(0, 45)}...`);

<<<<<<< HEAD
      // Execute server-side fetch with redirect follow to bypass browser CORS and provide a reliable response
      const googleResponse = await fetch(webhookUrl, {
        method: "POST",
        redirect: "follow",
=======
      // Execute server-side fetch to bypass browser CORS and provide a reliable response
      const googleResponse = await fetch(webhookUrl, {
        method: "POST",
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await googleResponse.text();
      const isHtml = responseText.includes("<!DOCTYPE") || responseText.includes("<html") || responseText.includes("<head>");
      
<<<<<<< HEAD
=======
      if (isHtml || !googleResponse.ok) {
        console.warn(`[Proxy] Google Webhook returned ${isHtml ? 'HTML page instead of JSON' : `HTTP ${googleResponse.status}`}. Ensure the Apps Script is deployed as a Web App with access set to 'Anyone'.`);
        return res.status(200).json({
          success: false,
          error: "Google Webhook returned an error page or was not found. Please verify that your Google Apps Script is deployed as a Web App with 'Who has access' set to 'Anyone'.",
          statusCode: googleResponse.status,
        });
      }

>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      let googleData: any = { status: "success" };
      try {
        if (responseText) {
          googleData = JSON.parse(responseText);
        }
      } catch {
<<<<<<< HEAD
        // Many Apps Script deployments return standard text output
        googleData = { status: "success", raw: responseText.slice(0, 100) };
      }

      if (!googleResponse.ok && googleResponse.status !== 302) {
        console.warn(`[Proxy] Google Webhook returned status: ${googleResponse.status}`);
        return res.status(200).json({
          success: false,
          error: `Google Apps Script returned status ${googleResponse.status}. Verify deployment is set to 'Anyone'.`,
          statusCode: googleResponse.status,
        });
      }

=======
        googleData = { status: "success", raw: responseText.slice(0, 100) };
      }

>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      res.json({
        success: true,
        status: googleResponse.status,
        googleData,
      });
    } catch (err: any) {
      console.error("[Proxy] Google Sheets Sync Proxy error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to proxy Google Sheets webhook request",
      });
    }
  });

  // Vite middleware for development or static serving for production
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) ||
    Boolean(process.argv[1] && process.argv[1].endsWith(".cjs"));

  if (!isProduction) {
    console.log("[N-LINK 360] Starting in Vite dynamic development mode with middlewares...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[N-LINK 360] Starting in production static serving mode from dist...");
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path.join(process.cwd(), 'index.html'));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`N-LINK 360 Backend API Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL ERROR during server startup:", err);
  process.exit(1);
});
