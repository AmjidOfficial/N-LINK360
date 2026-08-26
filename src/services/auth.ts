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

let currentLocalUser: User | null = null;

const mockUsers: Record<string, User> = {
  'nationallights2026@gmail.com': {
    id: 'usr-admin-national',
    email: 'nationallights2026@gmail.com',
    fullName: 'National Lights Admin',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    branchId: 'b0000000-0000-0000-0000-000000000001',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'admin@nationallights.com': {
    id: 'usr-admin-01',
    email: 'admin@nationallights.com',
    fullName: 'Haris Naeem',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    branchId: 'b0000000-0000-0000-0000-000000000001',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'field.lahore@nationallights.com': {
    id: 'usr-field-lahore',
    email: 'field.lahore@nationallights.com',
    fullName: 'Kamran Bhatti',
    phone: '+92 321 7654321',
    role: 'SALES_RECOVERY',
    branchId: 'b0000000-0000-0000-0000-000000000001',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'accounts@nationallights.com': {
    id: 'usr-accounts-01',
    email: 'accounts@nationallights.com',
    fullName: 'Zainab Qureshi',
    phone: '+92 333 4455667',
    role: 'ACCOUNTS',
    branchId: 'b0000000-0000-0000-0000-000000000001',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  'warehouse@nationallights.com': {
    id: 'usr-warehouse-01',
    email: 'warehouse@nationallights.com',
    fullName: 'Mubashir Khan',
    phone: '+92 345 9988776',
    role: 'WAREHOUSE_MANAGER',
    branchId: 'b0000000-0000-0000-0000-000000000001',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
};

export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!supabase) {
    // Dynamically fallback to a Super Admin for any email (including your own nationallights2026@gmail.com)
    const user = mockUsers[cleanEmail] || {
      id: 'usr-admin-dynamic',
      email: cleanEmail,
      fullName: 'Super Admin',
      phone: '+92 300 1234567',
      role: 'SUPER_ADMIN',
      branchId: 'b0000000-0000-0000-0000-000000000001',
      branchName: 'Lahore Head Office',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    currentLocalUser = user;
    localStorage.setItem('n_link_mock_user', JSON.stringify(user));
    return { user };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  currentLocalUser = null;
  localStorage.removeItem('n_link_mock_user');
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) {
    if (!currentLocalUser) {
      const stored = localStorage.getItem('n_link_mock_user');
      if (stored) {
        try {
          currentLocalUser = JSON.parse(stored);
        } catch {
          currentLocalUser = null;
        }
      }
    }
    return currentLocalUser;
  }

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
