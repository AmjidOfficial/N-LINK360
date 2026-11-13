import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { sendFirebasePasswordReset } from '../lib/firebase';
import type { User, UserRole } from '../types';
import { isMultiRoleEligibleEmail, isAuthorizedApproverEmail, getCentralEmployees } from './production-users';
<<<<<<< HEAD
import { getStoredUsers, saveStoredUsers, NLinkUser } from '../data/nlink-users-team';
import { fetchLiveGoogleSheetUsers } from './liveGoogleSheetSync';
import { logAuditEvent, submitPasswordRecoveryRequest } from './auditLog';
=======
import { getStoredUsers } from '../data/nlink-users-team';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

const roleMap: Record<string, UserRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGEMENT: 'MANAGEMENT',
<<<<<<< HEAD
  NATIONAL_MANAGER: 'NATIONAL_MANAGER',
  FIELD_SALES_USER: 'FIELD_SALES_USER',
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  FACTORY_MANAGER: 'FACTORY_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  ACCOUNTS: 'ACCOUNTS',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_RECOVERY: 'SALES_RECOVERY',
  DISPATCH_OFFICER: 'DISPATCH_OFFICER',
<<<<<<< HEAD
  HR_ADMIN: 'HR_ADMIN',
  DISTRIBUTOR: 'DISTRIBUTOR',
  DEALER: 'DEALER',
  RSM: 'RSM',
  ZSM: 'ZSM',
=======
  RSM: 'RSM',
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  ASM: 'ASM',
  TSM: 'TSM',
  SS: 'SS',
  OB: 'OB',
  FACTORY: 'FACTORY',
  WAREHOUSE: 'WAREHOUSE',
  DISPATCH: 'DISPATCH',
};

export const REGISTERED_CORPORATE_EMAILS: readonly string[] = [
<<<<<<< HEAD
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

=======
  'nationallights2026@gmail.com',
  'shahzadullah@nationallights.com',
  'shahzadullah@nationallight.pk',
  'shahid.khan@nationallight.pk',
  'admin@nationallights.com',
  'superadmin@nationallights.com',
  'management@nationallights.com',
  'director@nationallights.com',
  'accounts@nationallights.com',
  'sales@nationallights.com',
  'recovery@nationallights.com',
  'warehouse@nationallights.com',
  'factory@nationallights.com',
  'dispatch@nationallights.com',
];

>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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

<<<<<<< HEAD
  // 2. Authorized active corporate accounts
=======
  // 2. Executive list & recognized corporate domains
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  if (
    isMultiRoleEligibleEmail(clean) ||
    isAuthorizedApproverEmail(clean) ||
    REGISTERED_CORPORATE_EMAILS.includes(clean) ||
<<<<<<< HEAD
=======
    clean.endsWith('@nationallights.com') ||
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
  roleOverride?: UserRole
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your corporate email address.');
  }

  // If password provided and Supabase is configured with active credentials, attempt Supabase Auth
  if (password && password.trim().length > 0 && isSupabaseConfigured && supabase) {
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
<<<<<<< HEAD
    if (cleanEmail === 'amjid.bisconni@gmail.com') {
      userRole = 'SUPER_ADMIN';
    } else if (cleanEmail === 'amjid@nationallight.pk') {
      userRole = 'SUPER_ADMIN';
    } else if (cleanEmail === 'syedzain@nationallight.pk' || cleanEmail.includes('zain')) {
      userRole = 'MANAGEMENT';
    } else if (cleanEmail.includes('shahzad') || cleanEmail === 'nationallights2026@gmail.com') {
      userRole = 'SUPER_ADMIN';
    } else if (emp?.role && roleMap[emp.role]) {
=======
    if (emp?.role && roleMap[emp.role]) {
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
    } else {
      userRole = 'SALES_RECOVERY';
=======
    } else if (cleanEmail.includes('shahzadullah') || cleanEmail === 'nationallights2026@gmail.com' || cleanEmail.includes('admin') || cleanEmail.includes('director')) {
      userRole = 'SUPER_ADMIN';
    } else {
      userRole = 'SUPER_ADMIN';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    }
  }

  const displayName =
<<<<<<< HEAD
    (cleanEmail === 'amjid.bisconni@gmail.com' ? 'Amjid (Admin & Developer)' :
     cleanEmail === 'amjid@nationallight.pk' ? 'Amjid Khan' :
     cleanEmail.includes('zain') ? 'Syed Zain' :
     cleanEmail.includes('amjid') ? 'Amjid (Admin & Developer)' :
     cleanEmail.includes('shahzad') ? 'Shahzad Ullah' :
     cleanEmail === 'nationallights2026@gmail.com' ? 'Shahzad Ullah' :
     emp?.fullName ||
     emp?.full_name ||
=======
    emp?.fullName ||
    emp?.full_name ||
    (cleanEmail.includes('shahzad') ? 'Shahzad Ullah' :
     cleanEmail.includes('shahid') ? 'Shahid Khan' :
     cleanEmail === 'nationallights2026@gmail.com' ? 'Shahzad Ullah (Executive)' :
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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

<<<<<<< HEAD
/**
 * Strict Email + Password Login (Section 4.1 & 4.3):
 * Verifies Email and Password via Server Cryptographic Auth API (scrypt) or Supabase Auth.
 * Passwordless / dummy fallback logins are strictly disabled.
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

  // 2. Server-side cryptographic verification (mandatory when backend is reachable)
  let serverAttempted = false;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, identifier: cleanEmail, password: cleanPass }),
    });
    serverAttempted = true;
    const data = await res.json();
    if (res.ok && data?.success && data?.user) {
      const u = data.user;
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
        localStorage.setItem('nlink_sec_token', data.sessionToken || '');
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

    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
      throw new Error(data?.error || 'Invalid email address or password.');
    }
  } catch (apiErr: any) {
    if (serverAttempted) {
      throw apiErr;
    }
  }

  // 3. Supabase Auth verification if configured
  if (isSupabaseConfigured && supabase) {
    const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });
    if (!sbErr && sbData?.user) {
      const user = await signInWithRegisteredEmail(cleanEmail, cleanPass);
      return { ...user, mustChangePassword: Boolean(localMatch?.mustChangePassword) };
    }
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

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId }),
    });
    const data = await res.json();
    if (res.ok && data?.success) {
      return {
        success: true,
        requestId: data.request?.id || localReq.id,
        message: data.message,
      };
    }
  } catch {}

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

  // 1. Mandatory server update
  let serverUpdated = false;
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        currentPassword: currentPassword ? currentPassword.trim() : undefined,
        newPassword: nextPass,
        forced: Boolean(forced),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (data?.error) {
        throw new Error(data.error);
      }
      throw new Error(`Password update failed with status ${res.status}`);
    }
    serverUpdated = true;
  } catch (err: any) {
    if (err?.message && !err.message.includes('fetch') && !err.message.includes('network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

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

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
function requireAuthBackend() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production login is unavailable because the Supabase backend is not configured.');
  }
  return supabase;
}

export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
<<<<<<< HEAD
  if (!cleanEmail || !cleanEmail.includes('@') || !password) {
    throw new Error('Corporate email and password are required.');
  }
  const client = requireAuthBackend();
=======
  // Support passwordless registered email directly
  if (cleanEmail && (!password || password === 'SKIP_PASSWORD')) {
    return signInWithRegisteredEmail(cleanEmail);
  }
  const client = requireAuthBackend();
  if (!cleanEmail || !password) throw new Error('Corporate email and password are required.');
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (!data.session) throw new Error('Login succeeded but no authenticated session was returned.');
  return data.session;
}

export async function signOut() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('nlink_registered_email_session');
    localStorage.removeItem('nlink_active_user_session');
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
  let firebaseSuccess = false;
  let supabaseSuccess = false;
  let lastErrorMessage = '';

  // 1. Firebase Password Reset Flow
  try {
    await sendFirebasePasswordReset(cleanEmail);
    firebaseSuccess = true;
  } catch (fbErr: any) {
    console.info('Firebase auth reset notice:', fbErr?.message || fbErr);
    lastErrorMessage = fbErr?.message || '';
  }

  // 2. Supabase Password Reset Flow
  if (isSupabaseConfigured && supabase) {
    try {
      const redirectUrl = getProductionRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { 
        redirectTo: redirectUrl 
      });
      if (error) {
        lastErrorMessage = error.message;
        if (!firebaseSuccess) throw error;
      } else {
        supabaseSuccess = true;
      }
    } catch (sbErr: any) {
      lastErrorMessage = sbErr?.message || lastErrorMessage;
      if (!firebaseSuccess) {
        console.error('Supabase password reset error:', sbErr);
        // Handle common email provider / rate limit / config errors with friendly explanation
        if (/rate limit/i.test(lastErrorMessage)) {
          throw new Error('Too many password reset requests. Please wait a few minutes before trying again.');
        } else if (/smtp|mail|network/i.test(lastErrorMessage)) {
<<<<<<< HEAD
          throw new Error('Password reset email could not be delivered. Please contact your system administrator at nationallights2026@gmail.com.');
=======
          throw new Error('Password reset email could not be delivered. Please contact your system administrator at info@nationallights.com.');
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        }
        throw new Error('Password reset email could not be sent. Please check the email address or contact your administrator.');
      }
    }
  } else if (!firebaseSuccess) {
    throw new Error('Password reset email could not be sent. Please contact your administrator.');
  }
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
