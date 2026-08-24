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
  | 'settings.manage';

const ALL: Permission[] = [
  'dashboard.view', 'masters.view', 'masters.manage', 'factory.production', 'factory.qc',
  'factory.finished_goods', 'inventory.view', 'inventory.manage', 'sales.order',
  'sales.customers', 'recovery.collect', 'recovery.verify', 'invoice.create', 'invoice.post',
  'dispatch.manage', 'ledger.view', 'ledger.manage', 'reports.view', 'reports.export', 'settings.manage'
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  MANAGEMENT: ['dashboard.view', 'masters.view', 'inventory.view', 'sales.customers', 'recovery.verify', 'invoice.create', 'invoice.post', 'dispatch.manage', 'ledger.view', 'reports.view', 'reports.export'],
  FACTORY_MANAGER: ['dashboard.view', 'inventory.view', 'inventory.manage', 'factory.production', 'factory.qc', 'factory.finished_goods', 'reports.view', 'reports.export'],
  WAREHOUSE_MANAGER: ['dashboard.view', 'inventory.view', 'inventory.manage', 'dispatch.manage', 'reports.view', 'reports.export'],
  ACCOUNTS: ['dashboard.view', 'masters.view', 'recovery.verify', 'invoice.create', 'invoice.post', 'ledger.view', 'ledger.manage', 'reports.view', 'reports.export'],
  SALES_MANAGER: ['dashboard.view', 'masters.view', 'sales.customers', 'sales.order', 'recovery.collect', 'invoice.create', 'reports.view', 'reports.export'],
  SALES_RECOVERY: ['dashboard.view', 'sales.customers', 'sales.order', 'recovery.collect', 'reports.view'],
  DISPATCH_OFFICER: ['dashboard.view', 'inventory.view', 'dispatch.manage', 'reports.view', 'reports.export'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function workspaceForRole(role: UserRole): 'PORTAL' | 'MOBILE_APP' {
  return role === 'SALES_RECOVERY' ? 'MOBILE_APP' : 'PORTAL';
}
