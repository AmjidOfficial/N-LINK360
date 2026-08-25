import { supabase } from '../lib/supabase';
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
};

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: account, error: accountError } = await supabase
    .from('users')
    .select('id,user_code,employee_id,status,last_login_at,created_at')
    .eq('auth_user_id', user.id)
    .eq('status', true)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account?.employee_id) throw new Error('Your login exists, but no active N-LINK employee profile is linked to it.');

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id,full_name,mobile,email,role_id,branch_id,status')
    .eq('id', account.employee_id)
    .eq('status', true)
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (!employee) throw new Error('Your employee profile is inactive or missing.');

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('role_code,name')
    .eq('id', employee.role_id)
    .maybeSingle();

  if (roleError) throw roleError;
  const mappedRole = roleMap[role?.role_code || ''];
  if (!mappedRole) throw new Error('Your N-LINK role is not configured.');

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
