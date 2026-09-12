import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

const roleMap: Record<string, UserRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN', MANAGEMENT: 'MANAGEMENT', FACTORY_MANAGER: 'FACTORY_MANAGER', WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER', ACCOUNTS: 'ACCOUNTS', SALES_MANAGER: 'SALES_MANAGER', SALES_RECOVERY: 'SALES_RECOVERY', DISPATCH_OFFICER: 'DISPATCH_OFFICER', RSM: 'RSM', ASM: 'ASM', TSM: 'TSM', SS: 'SS', OB: 'OB', FACTORY: 'FACTORY', WAREHOUSE: 'WAREHOUSE', DISPATCH: 'DISPATCH',
};

function requireAuthBackend() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production login is unavailable because the Supabase backend is not configured.');
  }
  return supabase;
}

function productionRedirectUrl() {
  const configured = (import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim();
  if (configured) return configured;
  return window.location.origin;
}

/** Send a real passwordless email OTP. This never creates an unapproved N-LINK user. */
export async function sendLoginCode(email: string) {
  const client = requireAuthBackend();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Registered corporate email is required.');

  const { error } = await client.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: productionRedirectUrl(),
    },
  });
  if (error) throw error;
}

/** Verify the OTP and return the authenticated Supabase session. */
export async function verifyLoginCode(email: string, token: string) {
  const client = requireAuthBackend();
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!cleanEmail || !cleanToken) throw new Error('Email and verification code are required.');

  const { data, error } = await client.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  });
  if (error) throw error;
  if (!data.session) throw new Error('Verification succeeded but no authenticated session was returned.');
  return data.session;
}

/** Backward-compatible alias. New UI should use sendLoginCode + verifyLoginCode. */
export async function signIn(email: string, password?: string) {
  if (password) {
    throw new Error('Password login has been disabled for N-LINK 360. Use the email verification code.');
  }
  return sendLoginCode(email);
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const cleanUserEmail = (user.email || '').trim().toLowerCase();
  const { data: account, error: accountError } = await supabase.from('users').select('id,user_code,employee_id,auth_user_id,username,status,last_login_at,created_at').eq('auth_user_id', user.id).maybeSingle();
  if (accountError) throw accountError;
  if (!account?.employee_id || !account.status) return null;
  const { data: employee, error: employeeError } = await supabase.from('employees').select('id,full_name,mobile,email,role_id,branch_id,status').eq('id', account.employee_id).maybeSingle();
  if (employeeError) throw employeeError;
  if (!employee?.status) return null;
  const { data: role, error: roleError } = await supabase.from('roles').select('role_code,name').eq('id', employee.role_id).maybeSingle();
  if (roleError) throw roleError;
  const mappedRole = roleMap[role?.role_code || ''];
  if (!mappedRole) throw new Error(`Employee role '${role?.role_code || 'UNASSIGNED'}' is not configured for application access.`);
  return { id: account.id, email: employee.email || user.email || cleanUserEmail, fullName: employee.full_name, phone: employee.mobile || '', role: mappedRole, branchId: employee.branch_id || '', isActive: true, lastLoginAt: account.last_login_at || undefined, createdAt: account.created_at };
}

export async function resetPassword(email: string): Promise<void> {
  const client = requireAuthBackend();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Registered corporate email is required.');
  const { error } = await client.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: productionRedirectUrl(),
    },
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const client = requireAuthBackend();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}
