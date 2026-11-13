import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

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

export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production Backend Required: Supabase is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Resolve auth.users -> public.users
  const { data: account, error: accountError } = await supabase
    .from('users')
    .select('id,user_code,employee_id,status,last_login_at,created_at')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) {
    throw new Error('Your login exists, but no N-LINK user account profile is mapped to your auth ID.');
  }
  if (!account.status) {
    throw new Error('Your user account has been deactivated. Please contact your system administrator.');
  }
  if (!account.employee_id) {
    throw new Error('Your login exists, but no active N-LINK employee profile is linked to it.');
  }

  // Resolve public.users -> public.employees
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id,full_name,mobile,email,role_id,branch_id,status')
    .eq('id', account.employee_id)
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (!employee) {
    throw new Error('Your employee profile is missing in the database.');
  }
  if (!employee.status) {
    throw new Error('Your employee profile is currently marked as inactive.');
  }

  // Resolve public.employees -> public.roles
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('role_code,name')
    .eq('id', employee.role_id)
    .maybeSingle();

  if (roleError) throw roleError;
  const mappedRole = roleMap[role?.role_code || ''];
  if (!mappedRole) {
    throw new Error(`Your N-LINK role '${role?.role_code || 'UNKNOWN'}' is not configured in the security registry.`);
  }

  let branchName: string | undefined;
  if (employee.branch_id) {
    const { data: branch, error: branchError } = await supabase
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
  const cleanEmail = email.trim().toLowerCase();
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production Backend Required: Supabase is not configured.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Production Backend Required: Supabase is not configured.');
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

