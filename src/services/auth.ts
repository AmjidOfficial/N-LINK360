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
    .select('id,email,full_name,phone,branch_id,is_active,last_login_at,created_at,role:roles!users_role_id_fkey(code,name),branch:branches!users_branch_id_fkey(name)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Your login exists, but no active N-LINK user profile is linked to it.');

  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  const branch = Array.isArray(data.branch) ? data.branch[0] : data.branch;
  const mappedRole = roleMap[role?.code || ''];

  if (!mappedRole) throw new Error('Your N-LINK role is not configured.');

  return {
    id: data.id,
    email: data.email || user.email || '',
    fullName: data.full_name,
    phone: data.phone || '',
    role: mappedRole,
    branchId: data.branch_id || '',
    branchName: branch?.name,
    isActive: Boolean(data.is_active),
    lastLoginAt: data.last_login_at || undefined,
    createdAt: data.created_at,
  };
}
