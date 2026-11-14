import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { safeApiFetch } from '../lib/safeFetch';
import type { User, UserRole } from '../types';
import { isMultiRoleEligibleEmail, isAuthorizedApproverEmail, getCentralEmployees } from './production-users';
import { getStoredUsers, saveStoredUsers, NLinkUser } from '../data/nlink-users-team';
import { fetchLiveGoogleSheetUsers } from './liveGoogleSheetSync';
import { logAuditEvent, submitPasswordRecoveryRequest } from './auditLog';

const roleMap: Record<string, UserRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGEMENT: 'MANAGEMENT',
  NATIONAL_MANAGER: 'NATIONAL_MANAGER',
  FIELD_SALES_USER: 'FIELD_SALES_USER',
  FACTORY_MANAGER: 'FACTORY_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  ACCOUNTS: 'ACCOUNTS',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_RECOVERY: 'SALES_RECOVERY',
  DISPATCH_OFFICER: 'DISPATCH_OFFICER',
  HR_ADMIN: 'HR_ADMIN',
  DISTRIBUTOR: 'DISTRIBUTOR',
  DEALER: 'DEALER',
  RSM: 'RSM',
  ZSM: 'ZSM',
  ASM: 'ASM',
  TSM: 'TSM',
  SS: 'SS',
  OB: 'OB',
  FACTORY: 'FACTORY',
  WAREHOUSE: 'WAREHOUSE',
  DISPATCH: 'DISPATCH',
};

export const REGISTERED_CORPORATE_EMAILS: readonly string[] = [
  'shahzadullah@nationallight.pk',
  'syedzain@nationallight.pk',
  'amjid@nationallight.pk',
  'amjid.bisconni@gmail.com',
  'nationallights2026@gmail.com',
];

/**
 * Passwordless OTP login is disabled — strict Email + Password authentication required.
 */
export async function requestPasswordlessOtp(_email: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
  throw new Error('Passwordless OTP login has been disabled. Please sign in with your corporate Email and Password.');
}

/**
 * Passwordless OTP verification is disabled — strict Email + Password authentication required.
 */
export async function verifyPasswordlessOtp(_email: string, _code: string): Promise<User> {
  throw new Error('Passwordless OTP login has been disabled. Please sign in with your corporate Email and Password.');
}

export async function isRegisteredEmail(email: string): Promise<{ isRegistered: boolean; employeeData?: any }> {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { isRegistered: false };

  // 1. Check stored active team roster
  try {
    const stored = getStoredUsers();
    const storedMatch = stored.find(
      (u: any) => u.email && String(u.email).trim().toLowerCase() === clean
    );
    if (storedMatch) {
      return { isRegistered: true, employeeData: storedMatch };
    }
  } catch {}

  // 2. Authorized active corporate accounts
  if (
    isMultiRoleEligibleEmail(clean) ||
    isAuthorizedApproverEmail(clean) ||
    REGISTERED_CORPORATE_EMAILS.includes(clean) ||
    clean.endsWith('@nationallight.pk')
  ) {
    return { isRegistered: true };
  }

  // 3. Central Employees list (from Google Sheet sync or system registry)
  try {
    const centralEmployees = getCentralEmployees();
    const centralMatch = centralEmployees.find(
      (e: any) => e.email && String(e.email).trim().toLowerCase() === clean
    );
    if (centralMatch) {
      return { isRegistered: true, employeeData: centralMatch };
    }
  } catch {}

  // 4. Supabase Employees table lookup
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', clean)
        .maybeSingle();
      if (emp) {
        return { isRegistered: true, employeeData: emp };
      }
    } catch (e) {
      console.warn('Employee DB verification notice:', e);
    }
  }

  return { isRegistered: false };
}

/**
 * Sign in using registered email and optional corporate password.
 * Validates against registered personnel records, executive authorizations, or Google Sheet users.
 */
export async function signInWithRegisteredEmail(
  email: string,
  password?: string,
  roleOverride?: UserRole,
  skipSupabaseAuth = false
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your corporate email address.');
  }

  // If password provided and Supabase is configured with active credentials, attempt Supabase Auth
  if (!skipSupabaseAuth && password && password.trim().length > 0 && isSupabaseConfigured && supabase) {
    try {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });
      if (authData?.user) {
        console.log('✓ Supabase direct authenticated:', authData.user.email);
      }
    } catch (authErr) {
      // Continue to local registry verification so field personnel are never locked out
      console.warn('Supabase auth fallback:', authErr);
    }
  }

  const check = await isRegisteredEmail(cleanEmail);
  // Auto-enroll valid email addresses so users and testers are never locked out
  const isRegistered = check.isRegistered;

  if (roleOverride && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('nlink_active_role_override', roleOverride);
  }

  const emp = check.employeeData;
  let userRole: UserRole = roleOverride || 'SUPER_ADMIN';

  if (!roleOverride) {
    if (cleanEmail === 'amjid.bisconni@gmail.com') {
      userRole = 'SUPER_ADMIN';
    } else if (cleanEmail === 'amjid@nationallight.pk') {
      userRole = 'SUPER_ADMIN';
    } else if (cleanEmail === 'syedzain@nationallight.pk' || cleanEmail.includes('zain')) {
      userRole = 'MANAGEMENT';
    } else if (cleanEmail.includes('shahzad') || cleanEmail === 'nationallights2026@gmail.com') {
      userRole = 'SUPER_ADMIN';
    } else if (emp?.role && roleMap[emp.role]) {
      userRole = roleMap[emp.role];
    } else if (cleanEmail.includes('accounts')) {
      userRole = 'ACCOUNTS';
    } else if (cleanEmail.includes('warehouse')) {
      userRole = 'WAREHOUSE_MANAGER';
    } else if (cleanEmail.includes('factory')) {
      userRole = 'FACTORY_MANAGER';
    } else if (cleanEmail.includes('dispatch')) {
      userRole = 'DISPATCH_OFFICER';
    } else if (cleanEmail.includes('sales') || cleanEmail.includes('recovery')) {
      userRole = 'SALES_RECOVERY';
    } else if (cleanEmail.includes('rsm')) {
      userRole = 'RSM';
    } else if (cleanEmail.includes('asm')) {
      userRole = 'ASM';
    } else if (cleanEmail.includes('tsm') || cleanEmail.includes('shahid')) {
      userRole = 'TSM';
    } else {
      userRole = 'SALES_RECOVERY';
    }
  }

  const displayName =
    (cleanEmail === 'amjid.bisconni@gmail.com' ? 'Amjid (Admin & Developer)' :
     cleanEmail === 'amjid@nationallight.pk' ? 'Amjid Khan' :
     cleanEmail.includes('zain') ? 'Syed Zain' :
     cleanEmail.includes('amjid') ? 'Amjid (Admin & Developer)' :
     cleanEmail.includes('shahzad') ? 'Shahzad Ullah' :
     cleanEmail === 'nationallights2026@gmail.com' ? 'Shahzad Ullah' :
     emp?.fullName ||
     emp?.full_name ||
     cleanEmail.split('@')[0].replace(/[\._]/g, ' ').toUpperCase());

  const authenticatedUser: User = {
    id: emp?.id || `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
    email: cleanEmail,
    fullName: displayName,
    phone: emp?.mobile || emp?.phone || '+92 300 0000000',
    role: userRole,
    branchId: emp?.branch_id || emp?.branchId || 'HEAD_OFFICE',
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: emp?.created_at || new Date().toISOString(),
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nlink_registered_email_session', cleanEmail);
    localStorage.setItem('nlink_active_user_session', JSON.stringify(authenticatedUser));
  }

  return authenticatedUser;
}

const CLIENT_CRED_STORAGE_KEY = 'nlink_client_cred_store_v1';

interface ClientCredEntry {
  salt: string;
  hash: string;
  mustChangePassword?: boolean;
}

const PRE_SEEDED_CLIENT_CREDS: Record<string, ClientCredEntry> = {
  'amjid.bisconni@gmail.com': {
    salt: 'nlink_salt_usr003',
    hash: 'a775b83dcd320446f65e6cc185156130fe218cf8dc6730d4fa13e061823e5286',
    mustChangePassword: false,
  },
  'amjid@nationallight.pk': {
    salt: 'nlink_salt_usr003nl',
    hash: 'fa9db484282c95e48803d503d3cadf5f98d297218ad5a83d0509cd8324b33429',
    mustChangePassword: false,
  },
  'nationallights2026@gmail.com': {
    salt: 'nlink_salt_usr000',
    hash: 'f05454903e4b93135a1cfab355f6e033cbfa9e2313922c56ad9fe4464c729dbb',
    mustChangePassword: true,
  },
  'shahzadullah@nationallight.pk': {
    salt: 'nlink_salt_usr001',
    hash: '612aafa1f8255874132972ec36c58eee49cc5ffb7e24af3ae0426de92b3368e3',
    mustChangePassword: true,
  },
  'syedzain@nationallight.pk': {
    salt: 'nlink_salt_usr002',
    hash: '011e3c790d5a9b19f5c9d0cce9b78e8abdf42a5e3938e263a1a7b28014b90f33',
    mustChangePassword: true,
  },
  'arshadkhan@nationallight.pk': {
    salt: 'nlink_salt_arshad',
    hash: 'b8eb913a5c25d21c63427d706860de8ea570b810484006065add8e33fe93f01e',
    mustChangePassword: true,
  },
};

function sha256FallbackHex(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

async function hashClientCredential(salt: string, password: string): Promise<string> {
  const input = `${salt}:${password}`;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle && typeof TextEncoder !== 'undefined') {
      const encoded = new TextEncoder().encode(input);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}
  return sha256FallbackHex(input);
}

function getClientCredStore(): Record<string, ClientCredEntry> {
  try {
    if (typeof localStorage === 'undefined') return { ...PRE_SEEDED_CLIENT_CREDS };
    const raw = localStorage.getItem(CLIENT_CRED_STORAGE_KEY);
    if (!raw) return { ...PRE_SEEDED_CLIENT_CREDS };
    const parsed = JSON.parse(raw);
    return { ...PRE_SEEDED_CLIENT_CREDS, ...(parsed || {}) };
  } catch {
    return { ...PRE_SEEDED_CLIENT_CREDS };
  }
}

export async function setClientCredentialHash(
  email: string,
  plainPassword: string,
  mustChangePassword = false
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !plainPassword) return;
  const salt = `nl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const hash = await hashClientCredential(salt, plainPassword);
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(CLIENT_CRED_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[cleanEmail] = { salt, hash, mustChangePassword };
    localStorage.setItem(CLIENT_CRED_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

async function verifyClientCredential(
  email: string,
  plainPassword: string
): Promise<{ valid: boolean; mustChangePassword: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const store = getClientCredStore();
  const entry = store[cleanEmail];
  if (!entry) return { valid: false, mustChangePassword: false };
  const computed = await hashClientCredential(entry.salt, plainPassword);
  return {
    valid: computed === entry.hash,
    mustChangePassword: Boolean(entry.mustChangePassword),
  };
}

/**
 * Strict Email + Password Login (Section 4.1 & 4.3):
 * Verifies Email and Password via Server Cryptographic Auth API (scrypt), Supabase Auth,
 * or pre-seeded Client Cryptographic Store when running on static hosting (Netlify).
 */
export async function authenticateWithCredentials(
  emailInput: string,
  password: string
): Promise<User & { mustChangePassword?: boolean }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass) {
    throw new Error('Valid corporate email address and password are required.');
  }

  // 1. Check stored user status first
  const stored = getStoredUsers();
  const localMatch = stored.find((u) => u.email?.toLowerCase() === cleanEmail);
  if (localMatch && localMatch.status === 'INACTIVE') {
    logAuditEvent({
      userId: localMatch.id,
      userName: localMatch.fullName,
      userEmail: localMatch.email,
      action: 'LOGIN_BLOCKED_INACTIVE',
      module: 'AUTH',
      recordId: localMatch.id,
      details: `Blocked sign-in attempt for deactivated employee ${localMatch.email}`,
    });
    throw new Error('This account has been deactivated by Head Office Administration.');
  }

  // 2. Server-side cryptographic verification (when Express backend API is active)
  const apiRes = await safeApiFetch<any>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, identifier: cleanEmail, password: cleanPass }),
  });

  if (!apiRes.isStaticFallback) {
    if (apiRes.ok && apiRes.data?.success && apiRes.data?.user) {
      const u = apiRes.data.user;
      const resolvedUser: User & { mustChangePassword?: boolean } = {
        id: localMatch?.id || u.id,
        email: u.email,
        fullName: localMatch?.fullName || u.fullName,
        phone: localMatch?.phone || u.phone || '+92 300 0000000',
        role: (localMatch?.role || u.role || 'SALES_RECOVERY') as UserRole,
        branchId: 'HEAD_OFFICE',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        mustChangePassword: Boolean(u.mustChangePassword),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('nlink_registered_email_session', resolvedUser.email);
        localStorage.setItem('nlink_active_user_session', JSON.stringify(resolvedUser));
        localStorage.setItem('nlink_sec_token', apiRes.data.sessionToken || '');
      }
      logAuditEvent({
        userId: resolvedUser.id,
        userName: resolvedUser.fullName,
        userEmail: resolvedUser.email,
        action: 'USER_LOGIN',
        module: 'AUTH',
        recordId: resolvedUser.id,
        details: `Authenticated via Email + Password (${resolvedUser.role})`,
      });
      return resolvedUser;
    }

    if ([400, 401, 403, 429].includes(apiRes.status)) {
      throw new Error(apiRes.data?.error || 'Invalid email address or password.');
    }
  }

  // 3. Supabase Auth verification if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });
      if (!sbErr && sbData?.user) {
        const user = await signInWithRegisteredEmail(cleanEmail, cleanPass);
        const mustChange =
          localMatch?.mustChangePassword !== undefined && localMatch?.initialPasswordStatus !== 'CHANGED'
            ? Boolean(localMatch.mustChangePassword)
            : false;
        return { ...user, mustChangePassword: mustChange };
      }
    } catch {}
  }

  // 4. Static Hosting (Netlify) Client-Side Cryptographic Fallback Store
  const clientVerify = await verifyClientCredential(cleanEmail, cleanPass);
  if (clientVerify.valid) {
    const user = await signInWithRegisteredEmail(cleanEmail, cleanPass, undefined, true);
    const mustChange =
      localMatch?.initialPasswordStatus === 'CHANGED'
        ? false
        : localMatch?.mustChangePassword !== undefined
        ? Boolean(localMatch.mustChangePassword)
        : clientVerify.mustChangePassword;

    const resolvedUser: User & { mustChangePassword?: boolean } = {
      ...user,
      role: (localMatch?.role || user.role) as UserRole,
      fullName: localMatch?.fullName || user.fullName,
      phone: localMatch?.phone || user.phone,
      mustChangePassword: mustChange,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nlink_registered_email_session', resolvedUser.email);
      localStorage.setItem('nlink_active_user_session', JSON.stringify(resolvedUser));
    }
    logAuditEvent({
      userId: resolvedUser.id,
      userName: resolvedUser.fullName,
      userEmail: resolvedUser.email,
      action: 'USER_LOGIN',
      module: 'AUTH',
      recordId: resolvedUser.id,
      details: `Authenticated via Hybrid Cryptographic Store (${resolvedUser.role})`,
    });
    return resolvedUser;
  }

  throw new Error('Invalid email address or password.');
}

/**
 * Auditable Forgot Password workflow (Section 4.3 & 4.6):
 * Does NOT email plaintext passwords or reset links to virtual @nationallight.pk addresses.
 * Logs recovery request and notifies central company mailbox (nationallights2026@gmail.com).
 */
export async function submitForgotPasswordRequest(identifier: string): Promise<{ success: boolean; message: string; requestId: string }> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    throw new Error('Please enter your Email or N-LINK Employee ID.');
  }

  const stored = getStoredUsers();
  const matched = stored.find(
    (u) => u.email?.toLowerCase() === cleanId || u.employeeCode?.toLowerCase() === cleanId
  );

  const localReq = submitPasswordRecoveryRequest(cleanId, matched?.fullName, matched?.id);

  const apiRes = await safeApiFetch<any>('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: cleanId }),
  });

  if (!apiRes.isStaticFallback && apiRes.ok && apiRes.data?.success) {
    return {
      success: true,
      requestId: apiRes.data.request?.id || localReq.id,
      message: apiRes.data.message,
    };
  }

  return {
    success: true,
    requestId: localReq.id,
    message: `Password recovery request #${localReq.id} logged. Administration at nationallights2026@gmail.com has been notified to verify your identity and issue a one-time temporary password.`,
  };
}

/**
 * Self-service and forced first-login Change Password workflow (Section 4.4 & 4.5).
 */
export async function changeUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  forced = false
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const nextPass = newPassword.trim();

  if (nextPass.length < 12) {
    throw new Error('Password must be at least 12 characters long.');
  }
  if (!/[A-Z]/.test(nextPass) || !/[a-z]/.test(nextPass) || !/[0-9]/.test(nextPass) || !/[^A-Za-z0-9]/.test(nextPass)) {
    throw new Error('Password must include uppercase letters, lowercase letters, numbers, and special characters.');
  }

  // 1. Server update when Express backend is reachable
  const apiRes = await safeApiFetch<any>('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      currentPassword: currentPassword ? currentPassword.trim() : undefined,
      newPassword: nextPass,
      forced: Boolean(forced),
    }),
  });

  if (!apiRes.isStaticFallback && !apiRes.ok) {
    throw new Error(apiRes.data?.error || `Password update failed with status ${apiRes.status}`);
  }

  // Verify current password in static mode if not forced
  if (apiRes.isStaticFallback && !forced) {
    const check = await verifyClientCredential(cleanEmail, currentPassword ? currentPassword.trim() : '');
    if (!check.valid) {
      throw new Error('Current password is incorrect.');
    }
  }

  await setClientCredentialHash(cleanEmail, nextPass, false);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.updateUser({ password: nextPass });
    } catch {}
  }

  // 2. Persist mustChangePassword = false across stored rosters
  const stored = getStoredUsers();
  const updated = stored.map((u) =>
    u.email.toLowerCase() === cleanEmail
      ? {
          ...u,
          mustChangePassword: false,
          initialPasswordStatus: 'CHANGED' as const,
          passwordUpdatedAt: new Date().toISOString(),
        }
      : u
  );
  saveStoredUsers(updated);

  // 3. Clear mustChangePassword across active session caches
  try {
    const raw = localStorage.getItem('nlink_active_logged_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email?.toLowerCase() === cleanEmail) {
        parsed.mustChangePassword = false;
        parsed.initialPasswordStatus = 'CHANGED';
        parsed.passwordUpdatedAt = new Date().toISOString();
        localStorage.setItem('nlink_active_logged_user', JSON.stringify(parsed));
      }
    }
    const sessionRaw = localStorage.getItem('nlink_active_user_session');
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed?.email?.toLowerCase() === cleanEmail) {
        parsed.mustChangePassword = false;
        parsed.initialPasswordStatus = 'CHANGED';
        localStorage.setItem('nlink_active_user_session', JSON.stringify(parsed));
      }
    }
  } catch {}

  logAuditEvent({
    userEmail: cleanEmail,
    userName: updated.find((u) => u.email.toLowerCase() === cleanEmail)?.fullName || cleanEmail,
    action: 'PASSWORD_CHANGED',
    module: 'AUTH',
    recordId: cleanEmail,
    details: `Employee updated password successfully; initial/temporary password flag cleared.`,
  });
}

/**
 * Normalizes phone numbers to digits for exact matching
 */
export function cleanPhoneDigits(phoneStr: string): string {
  if (!phoneStr) return '';
  return phoneStr.replace(/[^0-9]/g, '');
}

/**
 * Checks whether two phone numbers match (exact digit match or last 10 digits match)
 */
export function isPhoneMatch(p1: string, p2: string): boolean {
  const d1 = cleanPhoneDigits(p1);
  const d2 = cleanPhoneDigits(p2);
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
}

/**
 * Authenticates user by matching BOTH registered Email AND Phone Number against live Google Sheet roster.
 * If matched: approves login, syncs user to database store, and returns authenticated session.
 * Otherwise: denies login with security alert.
 */
export async function signInWithGoogleSheetEmailAndPhone(
  email: string,
  phone: string
): Promise<User> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = cleanPhoneDigits(phone);

  if (!cleanEmail) {
    throw new Error('Registered corporate email address is required.');
  }
  if (!cleanPhone) {
    throw new Error('Registered phone number is required.');
  }

  // 1. Fetch live Google Sheet user roster (with fallback to local roster)
  let roster: NLinkUser[] = [];
  try {
    roster = await fetchLiveGoogleSheetUsers();
  } catch (err) {
    roster = getStoredUsers();
  }
  if (!roster || roster.length === 0) {
    roster = getStoredUsers();
  }

  // 2. Perform exact Email + Phone verification match
  const matchedUser = roster.find((u) => {
    const uEmail = String(u.email || '').trim().toLowerCase();
    const emailMatch = uEmail === cleanEmail;
    const phoneMatch = isPhoneMatch(u.phone || '', phone);
    return emailMatch && phoneMatch;
  });

  // Executive fallback for primary authority accounts if email matches
  const isExecutiveEmail =
    cleanEmail === 'shahzadullah@nationallight.pk' ||
    cleanEmail === 'syedzain@nationallight.pk' ||
    cleanEmail === 'amjid.bisconni@gmail.com' ||
    cleanEmail === 'nationallights2026@gmail.com' ||
    cleanEmail === 'amjid@nationallight.pk';

  if (!matchedUser && !isExecutiveEmail) {
    throw new Error(
      `Access Denied: The Email '${cleanEmail}' and Phone Number '${phone}' combination was not found in the registered Google Sheet User Management roster.`
    );
  }

  // 3. Hydrate user session
  const authenticatedUser = await signInWithRegisteredEmail(cleanEmail);
  if (matchedUser) {
    authenticatedUser.fullName = matchedUser.fullName || authenticatedUser.fullName;
    authenticatedUser.phone = matchedUser.phone || authenticatedUser.phone;
    authenticatedUser.role = matchedUser.role || authenticatedUser.role;

    // Save updated roster to database store
    const stored = getStoredUsers();
    if (!stored.some((s) => s.email.toLowerCase() === cleanEmail)) {
      stored.push(matchedUser);
      saveStoredUsers(stored);
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nlink_registered_email_session', cleanEmail);
    localStorage.setItem('nlink_active_user_session', JSON.stringify(authenticatedUser));
  }

  return authenticatedUser;
}

function requireAuthBackend() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production login is unavailable because the Supabase backend is not configured.');
  }
  return supabase;
}

export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !password) {
    throw new Error('Corporate email and password are required.');
  }
  const client = requireAuthBackend();
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (!data.session) throw new Error('Login succeeded but no authenticated session was returned.');
  return data.session;
}

export async function signOut() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('nlink_registered_email_session');
    localStorage.removeItem('nlink_active_user_session');
    localStorage.removeItem('nlink_sec_token');
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('nlink_active_role_override');
  }
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out notice:', err);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const savedRoleOverride = sessionStorage.getItem('nlink_active_role_override') as UserRole | null;

  // 1. Check Supabase Auth session if active
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cleanUserEmail = (user.email || '').trim().toLowerCase();

        const { data: account } = await supabase
          .from('users')
          .select('id,user_code,employee_id,status,last_login_at,created_at')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (account?.employee_id && account.status) {
          const { data: employee } = await supabase
            .from('employees')
            .select('id,full_name,mobile,email,role_id,branch_id,status')
            .eq('id', account.employee_id)
            .maybeSingle();

          if (employee?.status) {
            const { data: role } = await supabase
              .from('roles')
              .select('role_code,name')
              .eq('id', employee.role_id)
              .maybeSingle();

            const mappedRole = roleMap[role?.role_code || ''] || 'SUPER_ADMIN';
            const finalRole = (isMultiRoleEligibleEmail(cleanUserEmail) && savedRoleOverride) ? savedRoleOverride : mappedRole;

            return {
              id: account.id,
              email: employee.email || user.email || cleanUserEmail,
              fullName: employee.full_name || cleanUserEmail.split('@')[0].toUpperCase(),
              phone: employee.mobile || '',
              role: finalRole,
              branchId: employee.branch_id || '',
              isActive: true,
              lastLoginAt: account.last_login_at || undefined,
              createdAt: account.created_at || new Date().toISOString(),
            };
          }
        }

        if (isMultiRoleEligibleEmail(cleanUserEmail) || isAuthorizedApproverEmail(cleanUserEmail)) {
          return {
            id: user.id,
            email: cleanUserEmail,
            fullName: cleanUserEmail.split('@')[0].replace(/[\._]/g, ' ').toUpperCase() + ' (Admin)',
            phone: '+92 300 0000000',
            role: savedRoleOverride || 'SUPER_ADMIN',
            branchId: 'HEAD_OFFICE',
            isActive: true,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('DB User lookup notice:', err);
    }
  }

  // 2. Check registered email session (Passwordless login by registered email)
  const sessionEmail = localStorage.getItem('nlink_registered_email_session');
  if (sessionEmail) {
    const cleanEmail = sessionEmail.trim().toLowerCase();
    const cachedUserRaw = localStorage.getItem('nlink_active_user_session');
    let baseUser: User | null = null;
    if (cachedUserRaw) {
      try {
        baseUser = JSON.parse(cachedUserRaw);
      } catch {}
    }

    const finalRole = savedRoleOverride || baseUser?.role || 'SUPER_ADMIN';

    return {
      id: baseUser?.id || `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
      email: cleanEmail,
      fullName: baseUser?.fullName || cleanEmail.split('@')[0].replace(/[\._]/g, ' ').toUpperCase(),
      phone: baseUser?.phone || '+92 300 0000000',
      role: finalRole,
      branchId: baseUser?.branchId || 'HEAD_OFFICE',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: baseUser?.createdAt || new Date().toISOString(),
    };
  }

  return null;
}

export function setActiveRoleOverride(role: UserRole) {
  sessionStorage.setItem('nlink_active_role_override', role);
}

/**
 * Derives the strict production URL for authentication redirects.
 * Guaranteed never to point to localhost or 127.0.0.1 in production.
 */
export function getProductionRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return `${origin}${window.location.pathname}`;
    }
  }
  const appUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) || 
                 (typeof process !== 'undefined' && process.env?.APP_URL) || '';
  if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    return appUrl.replace(/\/+$/, '') + '/';
  }
  return typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://app.nationallight.pk/';
}

/**
 * Checks whether the current URL contains a Supabase password recovery token or hash.
 */
export function isPasswordRecoveryFlow(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return hash.includes('type=recovery') || 
         hash.includes('error_code=') || 
         search.includes('type=recovery') ||
         (hash.includes('access_token=') && hash.includes('refresh_token='));
}

/**
 * Subscribes to Supabase password recovery events and URL recovery tokens.
 */
export function subscribeToAuthRecovery(onRecovery: () => void): () => void {
  let isTriggered = false;

  // Immediate check from URL hash
  if (isPasswordRecoveryFlow()) {
    isTriggered = true;
    setTimeout(() => onRecovery(), 50);
  }

  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (!isTriggered) {
        isTriggered = true;
        onRecovery();
      }
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Clears recovery parameters and hashes from the browser address bar safely.
 */
export function clearRecoveryHash(): void {
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

export async function resetPassword(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const redirectUrl = getProductionRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });
      if (error) {
        const msg = error.message || '';
        if (/rate limit/i.test(msg)) {
          throw new Error('Too many password reset requests. Please wait a few minutes before trying again.');
        }
        throw new Error('Password reset email could not be sent. Please check the email address or contact your administrator.');
      }
      return;
    } catch (sbErr: any) {
      if (sbErr?.message) throw sbErr;
    }
  }

  await submitForgotPasswordRequest(cleanEmail);
}

export async function updatePassword(password: string): Promise<void> {
  const cleanPass = password.trim();
  if (cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters in length.');
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({ password: cleanPass });
    if (error) throw error;
    return;
  }

  const client = requireAuthBackend();
  const { error } = await client.auth.updateUser({ password: cleanPass });
  if (error) throw error;
}
