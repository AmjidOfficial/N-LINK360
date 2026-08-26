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
  MANAGEMENT: ALL,
  FACTORY_MANAGER: ALL,
  WAREHOUSE_MANAGER: ALL,
  ACCOUNTS: ALL,
  SALES_MANAGER: ALL,
  SALES_RECOVERY: ALL,
  DISPATCH_OFFICER: ALL,
  RSM: ALL,
  ASM: ALL,
  TSM: ALL,
  SS: ALL,
  OB: ALL,
  FACTORY: ALL,
  WAREHOUSE: ALL,
  DISPATCH: ALL,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return true;
}

export function workspaceForRole(role: UserRole): 'PORTAL' | 'MOBILE_APP' {
  const mobileRoles: UserRole[] = ['SALES_RECOVERY', 'RSM', 'ASM', 'TSM', 'SS', 'OB'];
  return mobileRoles.includes(role) ? 'MOBILE_APP' : 'PORTAL';
}
