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

  const { data, error } = await supabase
    .from('users')
    .select('user_code, status, last_login_at, employee:employees!users_employee_id_fkey(employee_code, full_name, mobile, branch_id, role:roles!employees_role_id_fkey(role_code), branch:branches!employees_branch_id_fkey(name))')
    .eq('auth_user_id', user.id)
    .eq('status', true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.employee) throw new Error('Your login exists, but no active N-LINK employee profile is linked to it.');

  const employee = Array.isArray(data.employee) ? data.employee[0] : data.employee;
  const role = Array.isArray(employee.role) ? employee.role[0] : employee.role;
  const branch = Array.isArray(employee.branch) ? employee.branch[0] : employee.branch;
  const mappedRole = roleMap[role?.role_code || ''];
  if (!mappedRole) throw new Error('Your N-LINK role is not configured.');

  return {
    id: data.user_code,
    email: user.email || '',
    fullName: employee.full_name,
    phone: employee.mobile || '',
    role: mappedRole,
    branchId: employee.branch_id || '',
    branchName: branch?.name,
    isActive: Boolean(data.status),
    lastLoginAt: data.last_login_at || undefined,
    createdAt: user.created_at,
  };
}
