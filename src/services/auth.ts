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

export async function signIn(email: string, password: string) {
  const client = requireAuthBackend();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Corporate email and password are required.');
  const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (!data.session) throw new Error('Login succeeded but no authenticated session was returned.');
  return data.session;
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
  const { data: account, error: accountError } = await supabase.from('users').select('id,user_code,employee_id,status,last_login_at,created_at').eq('auth_user_id', user.id).maybeSingle();
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
  const { error } = await client.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/` });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const client = requireAuthBackend();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}
