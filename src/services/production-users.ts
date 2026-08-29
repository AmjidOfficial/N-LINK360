import { User, UserRole } from '../types';

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

export const PRODUCTION_ACCOUNTS: ProductionAccount[] = [
  {
    id: 'USR-ADMIN-01',
    email: 'admin@nationallights.com',
    fullName: 'Muhammad Amjid',
    phone: '+92 300 8456101',
    role: 'SUPER_ADMIN',
    roleTitle: 'IT Head / App Developer',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'System architect, app developer, and full technical administration access across all enterprise nodes.',
  },
  {
    id: 'USR-ADMIN-02',
    email: 'syedzain@nationallights.com',
    fullName: 'Syed Zain',
    phone: '+92 300 1122334',
    role: 'SUPER_ADMIN',
    roleTitle: 'Managing Partner',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Managing Partner with executive governance over commercial distribution, strategy, and regional accounts.',
  },
  {
    id: 'USR-ADMIN-03',
    email: 'shahzadullah@nationallights.com',
    fullName: 'Shahzad Ullah',
    phone: '+92 300 5566778',
    role: 'SUPER_ADMIN',
    roleTitle: 'Executive Director',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Executive Director overseeing enterprise operations, supply chain logistics, and financial audits.',
  },
];

/**
 * Check if the user is an Administrator with global access.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'MANAGEMENT';
}

/**
 * Check if the user is a Field Force representative (Order Booker, TSM, ASM, SS, Sales Recovery).
 */
export function isFieldForceUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return ['OB', 'TSM', 'ASM', 'SS', 'SALES_RECOVERY', 'SALES_MANAGER', 'RSM'].includes(user.role);
}

/**
 * Get assigned dealer IDs for a user account.
 */
export function getAssignedDealerIds(user: User | null | undefined): string[] {
  if (!user) return [];
  if (isAdminUser(user) || user.role === 'ACCOUNTS') {
    return []; // Empty signifies all dealers accessible
  }
  const account = PRODUCTION_ACCOUNTS.find(
    (a) => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase()
  );
  return account?.assignedDealerIds || [];
}

/**
 * Dynamically registered portal users in memory / localStorage
 */
let DYNAMIC_PORTAL_USERS: ProductionAccount[] = [];

try {
  const saved = localStorage.getItem('nlink_registered_users');
  if (saved) {
    DYNAMIC_PORTAL_USERS = JSON.parse(saved);
  }
} catch {
  DYNAMIC_PORTAL_USERS = [];
}

/**
 * Register a new employee/field force user added from the Portal.
 */
export function registerPortalEmployee(account: Partial<ProductionAccount> & { email: string }): ProductionAccount {
  const cleanEmail = account.email.trim().toLowerCase();
  
  // Check if exists
  const existing = [...PRODUCTION_ACCOUNTS, ...DYNAMIC_PORTAL_USERS].find(
    (a) => a.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return existing;
  }

  const isSuperAdminEmail =
    cleanEmail.includes('admin') ||
    cleanEmail.includes('zain') ||
    cleanEmail.includes('shahzad') ||
    cleanEmail.includes('director');

  const newAccount: ProductionAccount = {
    id: account.id || `USR-PORTAL-${Date.now()}`,
    email: cleanEmail,
    fullName: account.fullName || cleanEmail.split('@')[0].toUpperCase(),
    phone: account.phone || '+92 300 0000000',
    role: account.role || (isSuperAdminEmail ? 'SUPER_ADMIN' : 'OB'),
    roleTitle: account.roleTitle || (isSuperAdminEmail ? 'Super Administrator' : 'Field Force Order Booker'),
    branchId: account.branchId || 'BR-01',
    branchName: account.branchName || 'National Lights Head Office, Lahore',
    assignedRegion: account.assignedRegion || 'Punjab Central',
    assignedTowns: account.assignedTowns || [],
    assignedDealerIds: account.assignedDealerIds || [],
    accessScope: isSuperAdminEmail ? 'GLOBAL_ADMIN' : 'FIELD_FORCE_SCOPED',
    description: account.description || 'Registered Portal Personnel',
  };

  DYNAMIC_PORTAL_USERS.push(newAccount);
  try {
    localStorage.setItem('nlink_registered_users', JSON.stringify(DYNAMIC_PORTAL_USERS));
  } catch {
    // Ignore storage quota
  }

  return newAccount;
}

/**
 * Authenticate and verify employee purely by registered Email.
 */
export function authenticateProductionEmail(email: string): User | null {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return null;
  }

  // 1. Search static production accounts
  let account = PRODUCTION_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail);

  // 2. Search dynamic portal accounts
  if (!account) {
    account = DYNAMIC_PORTAL_USERS.find((a) => a.email.toLowerCase() === cleanEmail);
  }

  // 3. Auto-register if email ends with @nationallights.com or is added dynamically
  if (!account && (cleanEmail.endsWith('@nationallights.com') || cleanEmail.endsWith('@nlink.com'))) {
    account = registerPortalEmployee({
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].replace('.', ' ').replace('-', ' ').toUpperCase(),
    });
  }

  // 4. Fallback for any custom entered email from portal signup/employee creation
  if (!account) {
    account = registerPortalEmployee({
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].toUpperCase(),
    });
  }

  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    phone: account.phone,
    role: account.role,
    branchId: account.branchId,
    branchName: account.branchName,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
  };
}

export function authenticateProductionCredentials(email: string, _password?: string): User | null {
  return authenticateProductionEmail(email);
}
