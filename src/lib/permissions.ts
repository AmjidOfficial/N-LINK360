import { UserRole } from '../types';

export type Permission =
  | 'dashboard.view'
  | 'masters.view'
  | 'masters.manage'
  | 'factory.production'
  | 'factory.qc'
  | 'factory.finished_goods'
  | 'inventory.view'
  | 'inventory.manage'
  | 'sales.order'
  | 'sales.customers'
  | 'recovery.collect'
  | 'recovery.verify'
  | 'invoice.create'
  | 'invoice.post'
  | 'dispatch.manage'
  | 'ledger.view'
  | 'ledger.manage'
  | 'reports.view'
  | 'reports.export'
  | 'users.manage'
  | 'roles.manage'
  | 'hierarchy.manage'
<<<<<<< HEAD
  | 'hr.view'
  | 'hr.manage'
  | 'dashboard.configure'
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  | 'settings.manage';

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' },
<<<<<<< HEAD
  { key: 'dashboard.configure', label: 'Configure Role Dashboards', group: 'Dashboard' },
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  { key: 'sales.customers', label: 'View & Add Customers', group: 'Sales & Customers' },
  { key: 'sales.order', label: 'Create & Manage Orders', group: 'Sales & Customers' },
  { key: 'recovery.collect', label: 'Create Recovery Receipts', group: 'Recovery & Accounts' },
  { key: 'recovery.verify', label: 'Verify & Approve Recovery', group: 'Recovery & Accounts' },
  { key: 'invoice.create', label: 'Create Invoices', group: 'Billing' },
  { key: 'invoice.post', label: 'Post & Print Invoices', group: 'Billing' },
  { key: 'ledger.view', label: 'View Party Ledgers', group: 'Recovery & Accounts' },
  { key: 'ledger.manage', label: 'Adjust & Manage Ledgers', group: 'Recovery & Accounts' },
  { key: 'inventory.view', label: 'View Live Stock Position', group: 'Inventory' },
  { key: 'inventory.manage', label: 'Manage Stock Movements', group: 'Inventory' },
  { key: 'dispatch.manage', label: 'Manage Dispatch & Bilty', group: 'Logistics' },
  { key: 'factory.production', label: 'Factory Production Entry', group: 'Factory' },
  { key: 'factory.qc', label: 'Quality Control & Testing', group: 'Factory' },
  { key: 'factory.finished_goods', label: 'Finished Goods Transfer', group: 'Factory' },
<<<<<<< HEAD
  { key: 'hr.view', label: 'View HR & Attendance', group: 'HR & Administration' },
  { key: 'hr.manage', label: 'Manage Attendance, Leave & Payroll', group: 'HR & Administration' },
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  { key: 'reports.view', label: 'View Performance Reports', group: 'Reports' },
  { key: 'reports.export', label: 'Export Reports to Excel/PDF', group: 'Reports' },
  { key: 'users.manage', label: 'Manage Employees & Users', group: 'Administration' },
  { key: 'roles.manage', label: 'Create & Edit Dynamic Roles', group: 'Administration' },
  { key: 'hierarchy.manage', label: 'Manage Regions, Zones & Routes', group: 'Administration' },
  { key: 'masters.view', label: 'View Master Catalogs', group: 'Masters' },
  { key: 'masters.manage', label: 'Edit SKUs, Brands & Prices', group: 'Masters' },
  { key: 'settings.manage', label: 'Manage Company Settings', group: 'Administration' },
];

<<<<<<< HEAD
export const FIELD_SALES_USER_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'sales.order',
  'sales.customers',
  'recovery.collect',
  'ledger.view',
  'inventory.view',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  MANAGEMENT: [
    'dashboard.view', 'dashboard.configure', 'reports.view', 'reports.export', 'ledger.view',
    'sales.order', 'sales.customers', 'recovery.verify', 'inventory.view', 'masters.view',
    'users.manage', 'hr.view',
  ],
  NATIONAL_MANAGER: [
    'dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'recovery.verify',
    'ledger.view', 'inventory.view', 'reports.view', 'reports.export', 'hierarchy.manage',
=======
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  MANAGEMENT: [
    'dashboard.view', 'reports.view', 'reports.export', 'ledger.view', 'sales.order',
    'sales.customers', 'recovery.verify', 'inventory.view', 'masters.view'
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  ],
  SALES_MANAGER: [
    'dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'recovery.verify',
    'ledger.view', 'inventory.view', 'reports.view', 'reports.export', 'hierarchy.manage'
  ],
<<<<<<< HEAD
  // Territory Manager = Sales Supervisor = Sales Officer -> Unified FIELD_SALES_USER permissions
  FIELD_SALES_USER: [...FIELD_SALES_USER_PERMISSIONS],
  SALES_RECOVERY: [...FIELD_SALES_USER_PERMISSIONS],
=======
  SALES_RECOVERY: [
    'dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect',
    'ledger.view', 'inventory.view'
  ],
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  ACCOUNTS: [
    'dashboard.view', 'ledger.view', 'ledger.manage', 'recovery.verify', 'recovery.collect',
    'invoice.create', 'invoice.post', 'reports.view', 'reports.export'
  ],
  WAREHOUSE_MANAGER: [
    'dashboard.view', 'inventory.view', 'inventory.manage', 'dispatch.manage',
    'reports.view', 'masters.view'
  ],
  FACTORY_MANAGER: [
    'dashboard.view', 'factory.production', 'factory.qc', 'factory.finished_goods',
    'inventory.view', 'reports.view'
  ],
  DISPATCH_OFFICER: [
    'dashboard.view', 'dispatch.manage', 'inventory.view', 'invoice.post'
  ],
<<<<<<< HEAD
  HR_ADMIN: [
    'dashboard.view', 'hr.view', 'hr.manage', 'users.manage', 'reports.view', 'reports.export',
  ],
  DISTRIBUTOR: [
    'dashboard.view', 'sales.order', 'sales.customers', 'ledger.view', 'inventory.view',
  ],
  DEALER: [
    'dashboard.view', 'sales.order', 'ledger.view',
  ],
  RSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view', 'reports.view'],
  ZSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view', 'reports.view'],
  ASM: [...FIELD_SALES_USER_PERMISSIONS],
  TSM: [...FIELD_SALES_USER_PERMISSIONS],
  SS: [...FIELD_SALES_USER_PERMISSIONS],
  OB: [...FIELD_SALES_USER_PERMISSIONS],
  ORDER_BOOKER: [...FIELD_SALES_USER_PERMISSIONS],
  RECOVERY_OFFICER: [...FIELD_SALES_USER_PERMISSIONS],
  FACTORY: ['dashboard.view', 'factory.production', 'factory.qc', 'factory.finished_goods'],
  WAREHOUSE: ['dashboard.view', 'inventory.view', 'inventory.manage'],
  DISPATCH: ['dashboard.view', 'dispatch.manage'],
=======
  RSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view', 'reports.view'],
  ASM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  TSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  SS: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  OB: ['dashboard.view', 'sales.order', 'sales.customers', 'inventory.view'],
  FACTORY: ['factory.production', 'factory.qc', 'factory.finished_goods'],
  WAREHOUSE: ['inventory.view', 'inventory.manage'],
  DISPATCH: ['dispatch.manage'],
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
};

// Export alias for legacy code & test suite
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

<<<<<<< HEAD
export function getEffectivePermissionGroup(role: UserRole | string): string {
  const normalized = String(role || '').trim().toUpperCase();
  if (
    [
      'TSM',
      'SS',
      'OB',
      'SALES_RECOVERY',
      'ASM',
      'ORDER_BOOKER',
      'RECOVERY_OFFICER',
      'FIELD_SALES_USER',
    ].includes(normalized)
  ) {
    return 'FIELD_SALES_USER';
  }
  return normalized;
}

export function getCanonicalDashboardRole(role: UserRole | string): string {
  const group = getEffectivePermissionGroup(role);
  if (group === 'SUPER_ADMIN' || group === 'MANAGEMENT') return 'MD_EXECUTIVE';
  if (group === 'NATIONAL_MANAGER' || group === 'SALES_MANAGER') return 'NATIONAL_MANAGER';
  if (group === 'WAREHOUSE_MANAGER' || group === 'WAREHOUSE' || group === 'FACTORY_MANAGER' || group === 'FACTORY') {
    return 'WAREHOUSE';
  }
  if (group === 'DISPATCH_OFFICER' || group === 'DISPATCH') return 'DISPATCH';
  return group;
}

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
// In-memory or database dynamic role registry
let customRolePermissions: Record<string, Permission[]> = {};

export function setCustomRolePermissions(roles: Record<string, Permission[]>) {
  customRolePermissions = { ...roles };
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true;
<<<<<<< HEAD
  const group = getEffectivePermissionGroup(role);
  const configured = customRolePermissions[group] || customRolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[group] || DEFAULT_ROLE_PERMISSIONS[role];
=======
  const configured = customRolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role];
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  if (!configured) return false;
  return configured.includes(permission);
}

export function workspaceForRole(role: string): 'PORTAL' | 'MOBILE_APP' {
<<<<<<< HEAD
  const group = getEffectivePermissionGroup(role);
  const mobileRoles = ['FIELD_SALES_USER', 'RSM', 'ZSM'];
  return mobileRoles.includes(group) ? 'MOBILE_APP' : 'PORTAL';
}
=======
  const mobileRoles = ['SALES_RECOVERY', 'RSM', 'ASM', 'TSM', 'SS', 'OB'];
  return mobileRoles.includes(role) ? 'MOBILE_APP' : 'PORTAL';
}

>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
