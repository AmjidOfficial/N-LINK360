import { User, UserRole } from '../types';

/** Production identity policy: Supabase Auth + DB roles/RLS are authoritative. */
export interface ProductionAccount {
  id: string; email: string; fullName: string; phone: string; role: UserRole; roleTitle: string;
  branchId: string; branchName: string; assignedRegion?: string; assignedTowns?: string[]; assignedDealerIds?: string[];
  accessScope: 'GLOBAL_ADMIN' | 'ACCOUNTS_FINANCE' | 'LOGISTICS_WH' | 'FIELD_FORCE_SCOPED'; description: string;
}

export const AVAILABLE_ROLES: { role: UserRole; title: string; category: string }[] = [
  { role:'SUPER_ADMIN', title:'Super Admin', category:'Executive' }, { role:'MANAGEMENT', title:'Management', category:'Executive' },
  { role:'RSM', title:'RSM', category:'Sales Field' }, { role:'ASM', title:'ASM', category:'Sales Field' },
  { role:'TSM', title:'TSM', category:'Sales Field' }, { role:'ACCOUNTS', title:'Accounts', category:'Finance' },
  { role:'WAREHOUSE_MANAGER', title:'Warehouse Manager', category:'Supply Chain' }, { role:'FACTORY_MANAGER', title:'Factory Manager', category:'Manufacturing' },
];

/* Deprecated compatibility exports. They are never used as an authorization source. */
export const PRODUCTION_ACCOUNTS: ProductionAccount[] = [];
export const INITIAL_EMPLOYEES: any[] = [];
export const AUTHORIZED_APPROVER_EMAILS: readonly string[] = [];

export function isAdminUser(user: User | null | undefined): boolean { return Boolean(user && ['SUPER_ADMIN','MANAGEMENT'].includes(user.role)); }
export function isFieldForceUser(user: User | null | undefined): boolean { return Boolean(user && ['OB','TSM','ASM','SS','SALES_RECOVERY','SALES_MANAGER','RSM'].includes(user.role)); }

/** UI hint only; server-side RPC/RLS decides whether the operation is permitted. */
export function isAuthorizedApproverEmail(_email?: string | null): boolean { return false; }
export function assertAuthorizedApprover(_email?: string | null): void { throw new Error('Approval authorization is server-side only.'); }
export function isMultiRoleEligibleEmail(_email: string): boolean { return false; }

/** Empty means unknown, never "all". Customer visibility is enforced by DB RLS/assignments. */
export function getAssignedDealerIds(_user: User | null | undefined): string[] { return []; }

/** Legacy synchronous APIs intentionally cannot create or persist records. */
export function getCentralEmployees(): any[] { return []; }
export function saveCentralEmployee(_employeeData: any): any[] { throw new Error('Employee master data is database-only.'); }
export function deleteCentralEmployee(_id: string): any[] { throw new Error('Employee master data is database-only.'); }
export function registerPortalEmployee(_account: Partial<ProductionAccount> & { email: string }): ProductionAccount { throw new Error('Employee registration is database-only.'); }
export function authenticateProductionEmail(_email: string, _overrideRole?: UserRole): User | null { return null; }
export function authenticateProductionCredentials(_email: string, _password?: string, _overrideRole?: UserRole): User | null { return null; }
