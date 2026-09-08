import { User, UserRole } from '../types';

/**
 * Production identity policy.
 *
 * Authentication and authorization are authoritative in Supabase Auth + public.users
 * + employee/role/permission tables. This module intentionally contains no users,
 * passwords, emails, customer IDs, demo records, or localStorage persistence.
 */

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

export const AVAILABLE_ROLES: { role: UserRole; title: string; category: string }[] = [
  { role: 'SUPER_ADMIN', title: 'Super Admin', category: 'Executive' },
  { role: 'MANAGEMENT', title: 'Management', category: 'Executive' },
  { role: 'RSM', title: 'RSM', category: 'Sales Field' },
  { role: 'ASM', title: 'ASM', category: 'Sales Field' },
  { role: 'TSM', title: 'TSM', category: 'Sales Field' },
  { role: 'ACCOUNTS', title: 'Accounts', category: 'Finance' },
  { role: 'WAREHOUSE_MANAGER', title: 'Warehouse Manager', category: 'Supply Chain' },
  { role: 'FACTORY_MANAGER', title: 'Factory Manager', category: 'Manufacturing' },
];

export const PRODUCTION_ACCOUNTS: ProductionAccount[] = [];
export const INITIAL_EMPLOYEES: any[] = [];

export function isAdminUser(user: User | null | undefined): boolean {
  return Boolean(user && ['SUPER_ADMIN', 'MANAGEMENT'].includes(user.role));
}

export function isFieldForceUser(user: User | null | undefined): boolean {
  return Boolean(user && ['OB', 'TSM', 'ASM', 'SS', 'SALES_RECOVERY', 'SALES_MANAGER', 'RSM'].includes(user.role));
}

/** UI-only hint. Transaction authorization is enforced server-side by Supabase RPC/RLS. */
export function isAuthorizedApproverEmail(_email?: string | null): boolean {
  return false;
}

/** Never authorize by email. Kept only for compatibility with legacy UI callers. */
export function assertAuthorizedApprover(_email?: string | null): void {
  throw new Error('Approval authorization is server-side only. Use the authenticated Supabase transaction policy.');
}

export function isMultiRoleEligibleEmail(_email: string): boolean {
  return false;
}

/**
 * Dealer/customer visibility is determined by database RLS and assignment joins.
 * An empty array here must never be interpreted as permission to access all data.
 */
export function getAssignedDealerIds(_user: User | null | undefined): string[] {
  return [];
}

/**
 * Legacy synchronous employee APIs are intentionally disabled. Employee master data
 * must be loaded from Supabase; silently returning demo data would be a production defect.
 */
export function getCentralEmployees(): any[] {
  return [];
}

export function saveCentralEmployee(_employeeData: any): any[] {
  throw new Error('Employee master data is database-only. Use the Supabase employee transaction service.');
}

export function deleteCentralEmployee(_id: string): any[] {
  throw new Error('Employee master data is database-only. Use the Supabase employee transaction service.');
}

export function registerPortalEmployee(_account: Partial<ProductionAccount> & { email: string }): ProductionAccount {
  throw new Error('Portal employee registration is database-only. Create the employee through Supabase Auth and the employee/user transaction workflow.');
}

export function authenticateProductionEmail(_email: string, _overrideRole?: UserRole): User | null {
  return null;
}

export function authenticateProductionCredentials(_email: string, _password?: string, _overrideRole?: UserRole): User | null {
  return null;
}
