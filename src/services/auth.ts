import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

const roleMap: Record<string, UserRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN', MANAGEMENT: 'MANAGEMENT', FACTORY_MANAGER: 'FACTORY_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER', ACCOUNTS: 'ACCOUNTS', SALES_MANAGER: 'SALES_MANAGER',
  SALES_RECOVERY: 'SALES_RECOVERY', DISPATCH_OFFICER: 'DISPATCH_OFFICER', RSM: 'RSM', ASM: 'ASM',
  TSM: 'TSM', SS: 'SS', OB: 'OB', FACTORY: 'FACTORY', WAREHOUSE: 'WAREHOUSE', DISPATCH: 'DISPATCH',
};

function requiredClient() {
  if (!supabase) {
    throw new Error('N-LINK 360 is not configured for production authentication. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export async function signIn(email: string, password: string) {
  const db = requiredClient();
  const { data, error } = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const db = requiredClient();
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const db = requiredClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data: account, error: accountError } = await db
    .from('users')
    .select('id,user_code,employee_id,status,last_login_at,created_at')
    .eq('auth_user_id', user.id)
    .eq('status', true)
    .maybeSingle();
  if (accountError) throw accountError;
  if (!account?.employee_id) throw new Error('Your login exists, but no active N-LINK employee profile is linked to it.');

  const { data: employee, error: employeeError } = await db
    .from('employees')
    .select('id,full_name,mobile,email,role_id,branch_id,status')
    .eq('id', account.employee_id)
    .eq('status', true)
    .maybeSingle();
  if (employeeError) throw employeeError;
  if (!employee) throw new Error('Your employee profile is inactive or missing.');

  const { data: role, error: roleError } = await db
    .from('roles')
    .select('role_code,name')
    .eq('id', employee.role_id)
    .maybeSingle();
  if (roleError) throw roleError;
  const mappedRole = roleMap[role?.role_code || ''];
  if (!mappedRole) throw new Error('Your N-LINK role is not configured.');

  let branchName: string | undefined;
  if (employee.branch_id) {
    const { data: branch, error: branchError } = await db
      .from('branches')
      .select('name')
      .eq('id', employee.branch_id)
      .maybeSingle();
    if (branchError) throw branchError;
    branchName = branch?.name;
  }

  return {
    id: account.id,
    email: employee.email || user.email || '',
    fullName: employee.full_name,
    phone: employee.mobile || '',
    role: mappedRole,
    branchId: employee.branch_id || '',
    branchName,
    isActive: Boolean(account.status && employee.status),
    lastLoginAt: account.last_login_at || undefined,
    createdAt: account.created_at,
  };
}

export async function resetPassword(email: string): Promise<void> {
  const db = requiredClient();
  const { error } = await db.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const db = requiredClient();
  const { error } = await db.auth.updateUser({ password });
  if (error) throw error;
}
