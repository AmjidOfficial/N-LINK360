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
  | 'settings.manage';

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' },
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
  { key: 'reports.view', label: 'View Performance Reports', group: 'Reports' },
  { key: 'reports.export', label: 'Export Reports to Excel/PDF', group: 'Reports' },
  { key: 'users.manage', label: 'Manage Employees & Users', group: 'Administration' },
  { key: 'roles.manage', label: 'Create & Edit Dynamic Roles', group: 'Administration' },
  { key: 'hierarchy.manage', label: 'Manage Regions, Zones & Routes', group: 'Administration' },
  { key: 'masters.view', label: 'View Master Catalogs', group: 'Masters' },
  { key: 'masters.manage', label: 'Edit SKUs, Brands & Prices', group: 'Masters' },
  { key: 'settings.manage', label: 'Manage Company Settings', group: 'Administration' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  MANAGEMENT: [
    'dashboard.view', 'reports.view', 'reports.export', 'ledger.view', 'sales.order',
    'sales.customers', 'recovery.verify', 'inventory.view', 'masters.view'
  ],
  SALES_MANAGER: [
    'dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'recovery.verify',
    'ledger.view', 'inventory.view', 'reports.view', 'reports.export', 'hierarchy.manage'
  ],
  SALES_RECOVERY: [
    'dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect',
    'ledger.view', 'inventory.view'
  ],
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
  RSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view', 'reports.view'],
  ASM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  TSM: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  SS: ['dashboard.view', 'sales.order', 'sales.customers', 'recovery.collect', 'ledger.view', 'inventory.view'],
  OB: ['dashboard.view', 'sales.order', 'sales.customers', 'inventory.view'],
  FACTORY: ['factory.production', 'factory.qc', 'factory.finished_goods'],
  WAREHOUSE: ['inventory.view', 'inventory.manage'],
  DISPATCH: ['dispatch.manage'],
};

// Export alias for legacy code & test suite
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// In-memory or database dynamic role registry
let customRolePermissions: Record<string, Permission[]> = {};

export function setCustomRolePermissions(roles: Record<string, Permission[]>) {
  customRolePermissions = { ...roles };
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const configured = customRolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role];
  if (!configured) return false;
  return configured.includes(permission);
}

export function workspaceForRole(role: string): 'PORTAL' | 'MOBILE_APP' {
  const mobileRoles = ['SALES_RECOVERY', 'RSM', 'ASM', 'TSM', 'SS', 'OB'];
  return mobileRoles.includes(role) ? 'MOBILE_APP' : 'PORTAL';
}

