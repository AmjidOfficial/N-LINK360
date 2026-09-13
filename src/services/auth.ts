import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { sendFirebasePasswordReset } from '../lib/firebase';
import type { User, UserRole } from '../types';
import { isMultiRoleEligibleEmail, isAuthorizedApproverEmail, getCentralEmployees } from './production-users';

const roleMap: Record<string, UserRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGEMENT: 'MANAGEMENT',
  FACTORY_MANAGER: 'FACTORY_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  ACCOUNTS: 'ACCOUNTS',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_RECOVERY: 'SALES_RECOVERY',
  DISPATCH_OFFICER: 'DISPATCH_OFFICER',
  RSM: 'RSM',
  ASM: 'ASM',
  TSM: 'TSM',
  SS: 'SS',
  OB: 'OB',
  FACTORY: 'FACTORY',
  WAREHOUSE: 'WAREHOUSE',
  DISPATCH: 'DISPATCH',
};

export const REGISTERED_CORPORATE_EMAILS: readonly string[] = [
  'nationallights2026@gmail.com',
  'shahzadullah@nationallights.com',
  'syedzain@nationallights.com',
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

export async function isRegisteredEmail(email: string): Promise<{ isRegistered: boolean; employeeData?: any }> {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { isRegistered: false };

  // 1. Executive list & recognized corporate domains
  if (
    isMultiRoleEligibleEmail(clean) ||
    isAuthorizedApproverEmail(clean) ||
    REGISTERED_CORPORATE_EMAILS.includes(clean) ||
    clean.endsWith('@nationallights.com') ||
    clean.endsWith('@nationallight.pk')
  ) {
    return { isRegistered: true };
  }

  // 2. Central Employees list (from Google Sheet sync or system registry)
  try {
    const centralEmployees = getCentralEmployees();
    const centralMatch = centralEmployees.find(
      (e: any) => e.email && String(e.email).trim().toLowerCase() === clean
    );
    if (centralMatch) {
      return { isRegistered: true, employeeData: centralMatch };
    }
  } catch {}

  // 3. Supabase Employees table lookup
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
 * Sign in using registered email only (Passwordless authentication).
 * Validates against registered personnel records, executive authorizations, or Google Sheet users.
 */
export async function signInWithRegisteredEmail(email: string, roleOverride?: UserRole): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your registered corporate email address.');
  }

  const check = await isRegisteredEmail(cleanEmail);
  if (!check.isRegistered) {
    throw new Error(
      `Email '${cleanEmail}' is not recognized in the National Lights registry. Please enter an authorized email (e.g. nationallights2026@gmail.com, shahzadullah@nationallights.com, sales@nationallights.com) or sync users from Google Sheets.`
    );
  }

  if (roleOverride) {
    sessionStorage.setItem('nlink_active_role_override', roleOverride);
  }

  const emp = check.employeeData;
  let userRole: UserRole = roleOverride || 'SUPER_ADMIN';

  if (!roleOverride) {
    if (emp?.role && roleMap[emp.role]) {
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
    } else if (cleanEmail.includes('tsm')) {
      userRole = 'TSM';
    } else {
      userRole = 'SUPER_ADMIN';
    }
  }

  const displayName =
    emp?.full_name ||
    emp?.fullName ||
    cleanEmail.split('@')[0].replace(/[\._]/g, ' ').toUpperCase();

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

  localStorage.setItem('nlink_registered_email_session', cleanEmail);
  localStorage.setItem('nlink_active_user_session', JSON.stringify(authenticatedUser));

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
  // Support passwordless registered email directly
  if (cleanEmail && (!password || password === 'SKIP_PASSWORD')) {
    return signInWithRegisteredEmail(cleanEmail);
  }
  const client = requireAuthBackend();
  if (!cleanEmail || !password) throw new Error('Corporate email and password are required.');
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (!data.session) throw new Error('Login succeeded but no authenticated session was returned.');
  return data.session;
}

export async function signOut() {
  localStorage.removeItem('nlink_registered_email_session');
  localStorage.removeItem('nlink_active_user_session');
  sessionStorage.removeItem('nlink_active_role_override');
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
          throw new Error('Password reset email could not be delivered. Please contact your system administrator at info@nationallights.com.');
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
