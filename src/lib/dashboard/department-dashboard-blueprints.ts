/**
 * N-LINK-360 department dashboard blueprint.
 *
 * This is presentation configuration only. KPI values must be supplied by
 * verified domain queries and must never be fabricated in the UI.
 */

import type { CanonicalRole, Department } from './unified-role-model';

export type DashboardMetric =
  | 'sales_today'
  | 'sales_mtd'
  | 'recovery_today'
  | 'recovery_mtd'
  | 'sales_target_achievement'
  | 'recovery_target_achievement'
  | 'total_outstanding'
  | 'overdue_outstanding'
  | 'pending_approvals'
  | 'active_trade_partners'
  | 'attendance_today'
  | 'customer_visits_today'
  | 'orders_pending'
  | 'available_stock'
  | 'reserved_stock'
  | 'damaged_stock'
  | 'low_stock_skus'
  | 'production_today'
  | 'production_vs_plan'
  | 'quality_rejection_rate'
  | 'material_shortages'
  | 'dispatch_today'
  | 'dispatch_pending'
  | 'in_transit'
  | 'delivery_delays'
  | 'receivables'
  | 'unallocated_receipts'
  | 'invoice_aging'
  | 'employee_headcount'
  | 'leave_pending'
  | 'late_arrivals'
  | 'account_balance'
  | 'available_credit'
  | 'unpaid_invoices'
  | 'order_status';

export type DashboardAction =
  | 'create_order'
  | 'record_recovery'
  | 'customer_visit'
  | 'check_in'
  | 'view_ledger'
  | 'view_invoices'
  | 'view_catalogue'
  | 'approve_recovery'
  | 'post_invoice'
  | 'reconcile_ledger'
  | 'manage_stock'
  | 'pack_order'
  | 'dispatch_order'
  | 'production_entry'
  | 'quality_check'
  | 'manage_attendance'
  | 'approve_leave'
  | 'export_report';

export interface DepartmentDashboardDefinition {
  department: Department;
  title: string;
  description: string;
  roles: CanonicalRole[];
  topMetrics: DashboardMetric[];
  primaryActions: DashboardAction[];
  charts: string[];
  filters: string[];
  showRecentActivity: boolean;
  showAlerts: boolean;
}

export const DEPARTMENT_DASHBOARDS: Record<Department, DepartmentDashboardDefinition> = {
  EXECUTIVE: {
    department: 'EXECUTIVE',
    title: 'Executive Command Centre',
    description: 'Company-wide business health, decisions and exceptions.',
    roles: ['SUPER_ADMIN', 'TOP_MANAGEMENT'],
    topMetrics: [
      'sales_today', 'sales_mtd', 'recovery_today', 'recovery_mtd',
      'total_outstanding', 'overdue_outstanding', 'pending_approvals',
      'active_trade_partners',
    ],
    primaryActions: ['approve_recovery', 'post_invoice', 'export_report'],
    charts: ['sales-recovery-trend', 'regional-performance', 'receivable-aging'],
    filters: ['period', 'region', 'zone', 'territory', 'town', 'sales-officer'],
    showRecentActivity: true,
    showAlerts: true,
  },
  SALES: {
    department: 'SALES',
    title: 'Sales Performance',
    description: 'Sales, recovery, targets, field execution and trade coverage.',
    roles: ['NSM', 'RSM', 'ZSM', 'SALES_OFFICER'],
    topMetrics: [
      'sales_today', 'sales_mtd', 'recovery_today', 'recovery_mtd',
      'sales_target_achievement', 'recovery_target_achievement',
      'total_outstanding', 'overdue_outstanding',
    ],
    primaryActions: ['create_order', 'record_recovery', 'customer_visit', 'check_in', 'view_ledger'],
    charts: ['sales-recovery-trend', 'team-performance', 'target-achievement'],
    filters: ['period', 'region', 'zone', 'territory', 'town', 'sales-officer', 'trade-partner'],
    showRecentActivity: true,
    showAlerts: true,
  },
  TRADE: {
    department: 'TRADE',
    title: 'Trade Partner Portal',
    description: 'A shared dealer and distributor experience with customer-specific records.',
    roles: ['TRADE_PARTNER'],
    topMetrics: ['account_balance', 'available_credit', 'unpaid_invoices', 'order_status'],
    primaryActions: ['create_order', 'view_ledger', 'view_invoices', 'view_catalogue'],
    charts: ['monthly-purchases', 'invoice-aging'],
    filters: ['period', 'order-status', 'invoice-status'],
    showRecentActivity: true,
    showAlerts: true,
  },
  FINANCE: {
    department: 'FINANCE',
    title: 'Accounts & Finance',
    description: 'Receivables, invoice posting, payment verification and reconciliation.',
    roles: ['ACCOUNTS'],
    topMetrics: [
      'receivables', 'overdue_outstanding', 'unallocated_receipts',
      'invoice_aging', 'pending_approvals', 'sales_mtd',
    ],
    primaryActions: ['approve_recovery', 'post_invoice', 'reconcile_ledger', 'view_ledger', 'export_report'],
    charts: ['receivable-aging', 'collections-trend', 'unallocated-receipts'],
    filters: ['period', 'region', 'zone', 'territory', 'trade-partner', 'payment-status'],
    showRecentActivity: true,
    showAlerts: true,
  },
  WAREHOUSE: {
    department: 'WAREHOUSE',
    title: 'Warehouse Operations',
    description: 'Stock availability, reservations, packing queues and stock control.',
    roles: ['WAREHOUSE'],
    topMetrics: [
      'available_stock', 'reserved_stock', 'damaged_stock',
      'low_stock_skus', 'orders_pending', 'dispatch_pending',
    ],
    primaryActions: ['manage_stock', 'pack_order', 'dispatch_order', 'export_report'],
    charts: ['stock-by-category', 'packing-queue', 'stock-movement'],
    filters: ['period', 'warehouse', 'category', 'sku', 'order-status'],
    showRecentActivity: true,
    showAlerts: true,
  },
  MANUFACTURING: {
    department: 'MANUFACTURING',
    title: 'Factory & Production',
    description: 'Production plans, work in progress, quality and material readiness.',
    roles: ['FACTORY'],
    topMetrics: [
      'production_today', 'production_vs_plan', 'quality_rejection_rate',
      'material_shortages', 'available_stock', 'orders_pending',
    ],
    primaryActions: ['production_entry', 'quality_check', 'manage_stock', 'export_report'],
    charts: ['production-vs-plan', 'quality-trend', 'production-by-line'],
    filters: ['period', 'plant', 'production-line', 'shift', 'sku'],
    showRecentActivity: true,
    showAlerts: true,
  },
  LOGISTICS: {
    department: 'LOGISTICS',
    title: 'Dispatch & Logistics',
    description: 'Dispatch queues, in-transit orders and delivery performance.',
    roles: ['DISPATCH'],
    topMetrics: [
      'dispatch_today', 'dispatch_pending', 'in_transit',
      'delivery_delays', 'orders_pending',
    ],
    primaryActions: ['dispatch_order', 'view_invoices', 'export_report'],
    charts: ['dispatch-pipeline', 'delivery-performance', 'carrier-performance'],
    filters: ['period', 'warehouse', 'region', 'delivery-status', 'carrier'],
    showRecentActivity: true,
    showAlerts: true,
  },
  HR: {
    department: 'HR',
    title: 'People & Attendance',
    description: 'Workforce presence, leave, attendance exceptions and staffing.',
    roles: ['HR'],
    topMetrics: [
      'employee_headcount', 'attendance_today', 'late_arrivals',
      'leave_pending', 'pending_approvals',
    ],
    primaryActions: ['manage_attendance', 'approve_leave', 'export_report'],
    charts: ['attendance-trend', 'department-headcount', 'leave-summary'],
    filters: ['period', 'department', 'region', 'manager', 'employment-status'],
    showRecentActivity: true,
    showAlerts: true,
  },
};

export function getDashboardDefinition(department: Department): DepartmentDashboardDefinition {
  return DEPARTMENT_DASHBOARDS[department];
}

export function getDashboardDefinitionForRole(role: CanonicalRole): DepartmentDashboardDefinition {
  const definition = Object.values(DEPARTMENT_DASHBOARDS).find((item) => item.roles.includes(role));
  if (!definition) throw new Error(`No dashboard definition registered for role: ${role}`);
  return definition;
}
