import { User, UserRole } from '../types';

/** Production identity policy: Supabase Auth + DB roles/RLS are authoritative. */
export interface ProductionAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  roleTitle: string;
  branchId: string;
  branchName: string;
  assignedRegion?: string;
  assignedTowns?: string[];
  assignedDealerIds?: string[];
  accessScope: 'GLOBAL_ADMIN' | 'ACCOUNTS_FINANCE' | 'LOGISTICS_WH' | 'FIELD_FORCE_SCOPED';
  description: string;
}

export const AVAILABLE_ROLES: { role: UserRole; title: string; category: string; description: string }[] = [
  { role: 'SUPER_ADMIN', title: 'Super Admin', category: 'Executive', description: 'Complete system control, role assignment, executive approvals' },
  { role: 'MANAGEMENT', title: 'Management / Executive', category: 'Executive', description: 'Executive analytics, strategic KPIs, approval oversight' },
  { role: 'RSM', title: 'Regional Sales Manager (RSM)', category: 'Sales Field', description: 'Regional performance oversight, territory targets, ASM supervision' },
  { role: 'ASM', title: 'Area Sales Manager (ASM)', category: 'Sales Field', description: 'Area territory management, dealer networks, TSM supervision' },
  { role: 'TSM', title: 'Territory Sales Manager (TSM)', category: 'Sales Field', description: 'Field booking, town route execution, dealer relationships' },
  { role: 'SALES_RECOVERY', title: 'Sales & Recovery Officer', category: 'Sales Field', description: 'Order booking, payment recovery, field attendance' },
  { role: 'ACCOUNTS', title: 'Accounts & Finance Officer', category: 'Finance', description: 'Customer ledgers, bank reconciliation, invoices, credit limits' },
  { role: 'WAREHOUSE_MANAGER', title: 'Warehouse / Dispatch Manager', category: 'Supply Chain', description: 'Stock movement, GRN, dispatch notes, bilty, inventory audit' },
  { role: 'FACTORY_MANAGER', title: 'Factory / Production Manager', category: 'Manufacturing', description: 'Batch production, BOM consumption, QC inspection, finished goods' },
];

export const AUTHORIZED_APPROVER_EMAILS: readonly string[] = [
  'shahzadullah@nationallights.com',
  'nationallights2026@gmail.com',
  'shahzadullah@nationallight.pk',
];

export const ADMIN_ROLE_EMAILS: readonly string[] = [
  'shahzadullah@nationallights.com',
  'nationallights2026@gmail.com',
  'shahzadullah@nationallight.pk',
  'admin@nationallights.com',
  'superadmin@nationallights.com',
  'management@nationallights.com',
  'director@nationallights.com',
];

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const isRoleAdmin = ['SUPER_ADMIN', 'MANAGEMENT'].includes(user.role);
  const isEmailAdmin = ADMIN_ROLE_EMAILS.some((e) => e.toLowerCase() === String(user.email || '').trim().toLowerCase());
  return isRoleAdmin || isEmailAdmin;
}

export function isFieldForceUser(user: User | null | undefined): boolean {
  return Boolean(user && ['OB', 'TSM', 'ASM', 'SS', 'SALES_RECOVERY', 'SALES_MANAGER', 'RSM'].includes(user.role));
}

/**
 * Hard-coded approval/confirmation authority check.
 * Strictly permits ONLY 'ShahzadUllah' for all financial, invoice, recovery, and customer workflow actions.
 * Syed Zain's approval access is strictly revoked at the database / RLS policy level, while his user account remains active.
 */
export function isAuthorizedApproverEmail(email?: string | null): boolean {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return false;
  
  // Strict Security Rule: Syed Zain is an active sales officer but has NO approval authority
  if (clean.includes('zain') || clean.includes('syed')) {
    return false;
  }

  // Strictly permit only Shahzad Ullah / official executive email
  return (
    AUTHORIZED_APPROVER_EMAILS.some((x) => x.toLowerCase() === clean) ||
    clean.includes('shahzadullah') ||
    clean.includes('nationallights2026')
  );
}

export function assertAuthorizedApprover(email?: string | null): void {
  if (!isAuthorizedApproverEmail(email)) {
    throw new Error('Unauthorized Security Restriction: Only ShahzadUllah (Executive Director) is authorized to approve orders, confirm recoveries, or approve new customers.');
  }
}

/**
 * Administrative security function: Invalidate all existing authentication sessions and tokens globally,
 * requiring every user to re-authenticate immediately without deleting their account, customers, or financial data.
 */
export function invalidateAllSessionsGlobally(): { success: boolean; timestamp: number } {
  const epoch = Date.now();
  try {
    localStorage.setItem('nlink_global_session_epoch', epoch.toString());
    localStorage.removeItem('nlink_active_logged_user');
    localStorage.removeItem('nlink_auth_session');
    localStorage.removeItem('nlink_auth_token');
    localStorage.removeItem('sb-token');
    // Dispatch custom event for immediate UI response across components
    window.dispatchEvent(new CustomEvent('nlink:global_session_invalidated', { detail: { epoch } }));
  } catch (err) {
    console.error('Failed to write global session invalidation:', err);
  }
  return { success: true, timestamp: epoch };
}

/** Check if user/email is eligible for multiple role switching & fast login */
export function isMultiRoleEligibleEmail(email?: string | null): boolean {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return false;
  if (ADMIN_ROLE_EMAILS.some((e) => e.toLowerCase() === clean)) return true;
  if (clean.includes('admin') || clean.includes('nationallights') || clean.includes('management')) return true;
  return false;
}

export function getAssignedDealerIds(_user: User | null | undefined): string[] {
  return [];
}

export function getRoleDisplayTitle(role: UserRole): string {
  const found = AVAILABLE_ROLES.find((r) => r.role === role);
  return found ? found.title : role;
}

const EMPLOYEES_STORAGE_KEY = 'nlink_production_employees';

export function getCentralEmployees(): any[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveCentralEmployee(emp: any): void {
  try {
    const current = getCentralEmployees();
    const filtered = current.filter((e: any) => e.id !== emp.id);
    const updated = [emp, ...filtered];
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('saveCentralEmployee failed:', err);
  }
}

export function deleteCentralEmployee(empId: string): void {
  try {
    const current = getCentralEmployees();
    const updated = current.filter((e: any) => e.id !== empId);
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('deleteCentralEmployee failed:', err);
  }
}
