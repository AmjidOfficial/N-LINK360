/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Central Role-Based Dashboard Configuration Registry
 * One engine driving distinct role-specific KPI cards, charts, filters, quick actions, and tasks.
 */

import { getCanonicalDashboardRole } from '../permissions';
import type {
  AdminRoleConfigOverride,
  DashboardRoleKey,
  RoleDashboardConfig,
} from './types';

export const DEFAULT_ROLE_DASHBOARD_CONFIGS: Record<DashboardRoleKey, RoleDashboardConfig> = {
  MD_EXECUTIVE: {
    roleKey: 'MD_EXECUTIVE',
    title: 'Managing Director Command Center',
    subtitle: 'Company-Wide Financial, Sales & Operational Oversight',
    dataScope: 'COMPANY',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'HIERARCHY_BREAKDOWN', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todaySales',
      'mtdSales',
      'todayRecovery',
      'mtdRecovery',
      'totalOutstanding',
      'overdueOutstanding',
      'salesAchievementPct',
      'recoveryAchievementPct',
      'activeDealersCount',
      'activeDistributorsCount',
      'pendingPaymentConfirmations',
      'ordersAwaitingDispatch',
    ],
    mobilePrimaryKpis: ['todaySales', 'mtdSales', 'todayRecovery', 'totalOutstanding'],
    allowedCharts: ['SALES_RECOVERY_TREND', 'REGIONAL_PERFORMANCE', 'AGING_BREAKDOWN'],
    allowedFilters: ['DATE_RANGE', 'REGION', 'ZONE', 'TERRITORY', 'TOWN', 'DEALER'],
    allowedQuickActions: ['OPEN_APPROVALS', 'NEW_ORDER', 'RECORD_RECOVERY', 'EXPORT_REPORT'],
    allowedPendingTasks: [
      'ORDERS_AWAITING_APPROVAL',
      'PAYMENTS_AWAITING_CONFIRMATION',
      'CUSTOMER_REGISTRATIONS_PENDING',
      'ORDERS_AWAITING_DISPATCH',
      'PROFILE_REQUESTS_PENDING',
    ],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH', 'LOW_STOCK', 'TARGET_BEHIND'],
    configurableByAdmin: true,
  },

  NATIONAL_MANAGER: {
    roleKey: 'NATIONAL_MANAGER',
    title: 'National Sales Command Dashboard',
    subtitle: 'National · Regional · Zonal Sales & Recovery Performance',
    dataScope: 'NATIONAL',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'HIERARCHY_BREAKDOWN', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todaySales',
      'mtdSales',
      'salesTarget',
      'salesAchievementPct',
      'todayRecovery',
      'mtdRecovery',
      'recoveryTarget',
      'recoveryAchievementPct',
      'totalOutstanding',
      'overdueOutstanding',
      'activeDealersCount',
      'ordersAwaitingApproval',
    ],
    mobilePrimaryKpis: ['todaySales', 'mtdSales', 'todayRecovery', 'salesAchievementPct'],
    allowedCharts: ['SALES_RECOVERY_TREND', 'REGIONAL_PERFORMANCE', 'TERRITORY_RANKING'],
    allowedFilters: ['DATE_RANGE', 'REGION', 'ZONE', 'TERRITORY', 'TOWN'],
    allowedQuickActions: ['OPEN_APPROVALS', 'NEW_ORDER', 'RECORD_RECOVERY', 'EXPORT_REPORT'],
    allowedPendingTasks: ['ORDERS_AWAITING_APPROVAL', 'PAYMENTS_AWAITING_CONFIRMATION', 'OVERDUE_INVOICES'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH', 'TARGET_BEHIND'],
    configurableByAdmin: true,
  },

  RSM: {
    roleKey: 'RSM',
    title: 'Regional Sales Dashboard',
    subtitle: 'Assigned Region Zones, Territories & Recovery Tracking',
    dataScope: 'REGION',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'HIERARCHY_BREAKDOWN', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todaySales',
      'mtdSales',
      'salesTarget',
      'salesAchievementPct',
      'todayRecovery',
      'mtdRecovery',
      'recoveryTarget',
      'recoveryAchievementPct',
      'totalOutstanding',
      'overdueOutstanding',
      'activeDealersCount',
      'ordersAwaitingApproval',
    ],
    mobilePrimaryKpis: ['todaySales', 'mtdSales', 'todayRecovery', 'totalOutstanding'],
    allowedCharts: ['SALES_RECOVERY_TREND', 'TERRITORY_RANKING'],
    allowedFilters: ['DATE_RANGE', 'ZONE', 'TERRITORY', 'TOWN', 'DEALER'],
    allowedQuickActions: ['NEW_ORDER', 'RECORD_RECOVERY', 'VIEW_LEDGER', 'EXPORT_REPORT'],
    allowedPendingTasks: ['ORDERS_AWAITING_APPROVAL', 'OVERDUE_INVOICES'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH', 'TARGET_BEHIND'],
    configurableByAdmin: true,
  },

  ZSM: {
    roleKey: 'ZSM',
    title: 'Zonal Sales Dashboard',
    subtitle: 'Assigned Zone Territories, Dealers & Field Targets',
    dataScope: 'ZONE',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'HIERARCHY_BREAKDOWN', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todaySales',
      'mtdSales',
      'salesTarget',
      'salesAchievementPct',
      'todayRecovery',
      'mtdRecovery',
      'recoveryTarget',
      'recoveryAchievementPct',
      'totalOutstanding',
      'overdueOutstanding',
      'activeDealersCount',
      'ordersAwaitingApproval',
    ],
    mobilePrimaryKpis: ['todaySales', 'mtdSales', 'todayRecovery', 'totalOutstanding'],
    allowedCharts: ['SALES_RECOVERY_TREND', 'TERRITORY_RANKING'],
    allowedFilters: ['DATE_RANGE', 'TERRITORY', 'TOWN', 'DEALER'],
    allowedQuickActions: ['NEW_ORDER', 'RECORD_RECOVERY', 'VIEW_LEDGER', 'EXPORT_REPORT'],
    allowedPendingTasks: ['ORDERS_AWAITING_APPROVAL', 'OVERDUE_INVOICES'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH', 'TARGET_BEHIND'],
    configurableByAdmin: true,
  },

  // Unified role group: Territory Manager = Sales Supervisor = Sales Officer
  FIELD_SALES_USER: {
    roleKey: 'FIELD_SALES_USER',
    title: 'Field Sales Execution Dashboard',
    subtitle: 'Assigned Territory & Towns · Orders, Recoveries & Party Balances',
    dataScope: 'TERRITORY',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todaySales',
      'mtdSales',
      'salesTarget',
      'salesAchievementPct',
      'todayRecovery',
      'mtdRecovery',
      'recoveryTarget',
      'totalOutstanding',
      'overdueOutstanding',
      'activeDealersCount',
      'ordersAwaitingApproval',
      'todayVisitsCount',
    ],
    mobilePrimaryKpis: ['todaySales', 'todayRecovery', 'mtdSales', 'totalOutstanding'],
    allowedCharts: ['SALES_RECOVERY_TREND'],
    allowedFilters: ['DATE_RANGE', 'TOWN', 'DEALER'],
    allowedQuickActions: ['NEW_ORDER', 'RECORD_RECOVERY', 'VIEW_LEDGER', 'VIEW_ATTENDANCE'],
    allowedPendingTasks: ['ORDERS_AWAITING_APPROVAL', 'OVERDUE_INVOICES'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH', 'TARGET_BEHIND'],
    configurableByAdmin: true,
  },

  ACCOUNTS: {
    roleKey: 'ACCOUNTS',
    title: 'Accounts & Finance Dashboard',
    subtitle: 'Confirmed Recoveries, Posted Invoicing, Aging & Ledgers',
    dataScope: 'DEPARTMENT',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'todayRecovery',
      'mtdRecovery',
      'pendingPaymentConfirmations',
      'totalOutstanding',
      'overdueOutstanding',
      'overdueInvoicesCount',
      'todaySales',
      'mtdSales',
      'ordersAwaitingApproval',
    ],
    mobilePrimaryKpis: ['todayRecovery', 'pendingPaymentConfirmations', 'totalOutstanding', 'overdueOutstanding'],
    allowedCharts: ['SALES_RECOVERY_TREND', 'AGING_BREAKDOWN'],
    allowedFilters: ['DATE_RANGE', 'REGION', 'ZONE', 'DEALER'],
    allowedQuickActions: ['OPEN_APPROVALS', 'CREATE_INVOICE', 'RECORD_RECOVERY', 'VIEW_LEDGER', 'EXPORT_REPORT'],
    allowedPendingTasks: ['PAYMENTS_AWAITING_CONFIRMATION', 'OVERDUE_INVOICES', 'ORDERS_AWAITING_APPROVAL'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH'],
    configurableByAdmin: true,
  },

  WAREHOUSE: {
    roleKey: 'WAREHOUSE',
    title: 'Warehouse & Inventory Dashboard',
    subtitle: 'Stock Availability, Packing Queue & Fulfillment Readiness',
    dataScope: 'DEPARTMENT',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'availableStockUnits',
      'reservedStockUnits',
      'damagedStockUnits',
      'lowStockSkuCount',
      'ordersAwaitingPacking',
      'ordersAwaitingDispatch',
      'todayDispatchedCount',
    ],
    mobilePrimaryKpis: ['availableStockUnits', 'ordersAwaitingPacking', 'ordersAwaitingDispatch', 'lowStockSkuCount'],
    allowedCharts: ['STOCK_OVERVIEW', 'DISPATCH_PIPELINE'],
    allowedFilters: ['DATE_RANGE', 'WAREHOUSE'],
    allowedQuickActions: ['PACK_ORDERS', 'DISPATCH_ORDER', 'EXPORT_REPORT'],
    allowedPendingTasks: ['ORDERS_AWAITING_PACKING', 'ORDERS_AWAITING_DISPATCH'],
    allowedAlerts: ['LOW_STOCK', 'DISPATCH_DELAY'],
    configurableByAdmin: true,
  },

  DISPATCH: {
    roleKey: 'DISPATCH',
    title: 'Dispatch & Logistics Dashboard',
    subtitle: 'Bilty Management, In-Transit Consignments & Delivery Confirmation',
    dataScope: 'DEPARTMENT',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'ordersAwaitingDispatch',
      'todayDispatchedCount',
      'inTransitCount',
      'deliveredCount',
      'ordersAwaitingPacking',
    ],
    mobilePrimaryKpis: ['ordersAwaitingDispatch', 'todayDispatchedCount', 'inTransitCount', 'deliveredCount'],
    allowedCharts: ['DISPATCH_PIPELINE'],
    allowedFilters: ['DATE_RANGE', 'REGION', 'WAREHOUSE'],
    allowedQuickActions: ['DISPATCH_ORDER', 'EXPORT_REPORT'],
    allowedPendingTasks: ['ORDERS_AWAITING_DISPATCH', 'ORDERS_AWAITING_PACKING'],
    allowedAlerts: ['DISPATCH_DELAY'],
    configurableByAdmin: true,
  },

  HR_ADMIN: {
    roleKey: 'HR_ADMIN',
    title: 'HR & Workforce Dashboard',
    subtitle: 'Daily Attendance, Late Arrivals, Leave Requests & Profile Approvals',
    dataScope: 'DEPARTMENT',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'ALERTS'],
    allowedKpis: [
      'presentStaffCount',
      'absentStaffCount',
      'lateStaffCount',
      'pendingLeaveRequests',
      'pendingProfileRequests',
    ],
    mobilePrimaryKpis: ['presentStaffCount', 'absentStaffCount', 'lateStaffCount', 'pendingLeaveRequests'],
    allowedCharts: ['ATTENDANCE_OVERVIEW'],
    allowedFilters: ['DATE_RANGE', 'REGION', 'ZONE'],
    allowedQuickActions: ['VIEW_ATTENDANCE', 'OPEN_APPROVALS', 'EXPORT_REPORT'],
    allowedPendingTasks: ['LEAVE_REQUESTS_PENDING', 'PROFILE_REQUESTS_PENDING'],
    allowedAlerts: ['ABSENCE_SPIKE'],
    configurableByAdmin: true,
  },

  DISTRIBUTOR: {
    roleKey: 'DISTRIBUTOR',
    title: 'Distributor Partner Portal',
    subtitle: 'Own Purchases, Linked Dealer Orders, Credit & Settlement Status',
    dataScope: 'DISTRIBUTOR',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'CHARTS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'periodSales',
      'mtdRecovery',
      'totalOutstanding',
      'overdueOutstanding',
      'creditLimitRemaining',
      'activeDealersCount',
      'ordersAwaitingDispatch',
    ],
    mobilePrimaryKpis: ['periodSales', 'totalOutstanding', 'creditLimitRemaining', 'ordersAwaitingDispatch'],
    allowedCharts: ['SALES_RECOVERY_TREND'],
    allowedFilters: ['DATE_RANGE', 'DEALER'],
    allowedQuickActions: ['NEW_ORDER', 'VIEW_LEDGER'],
    allowedPendingTasks: ['OVERDUE_INVOICES', 'ORDERS_AWAITING_DISPATCH'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH'],
    configurableByAdmin: true,
  },

  DEALER: {
    roleKey: 'DEALER',
    title: 'Dealer Account Portal',
    subtitle: 'My Orders, Invoices, Confirmed Payments & Available Credit',
    dataScope: 'DEALER',
    layoutSections: ['KPIS', 'PENDING_ACTIONS', 'RECENT_TRANSACTIONS', 'ALERTS'],
    allowedKpis: [
      'periodSales',
      'mtdRecovery',
      'totalOutstanding',
      'overdueOutstanding',
      'creditLimitRemaining',
      'ordersAwaitingDispatch',
    ],
    mobilePrimaryKpis: ['totalOutstanding', 'creditLimitRemaining', 'periodSales', 'ordersAwaitingDispatch'],
    allowedCharts: ['SALES_RECOVERY_TREND'],
    allowedFilters: ['DATE_RANGE'],
    allowedQuickActions: ['NEW_ORDER', 'VIEW_LEDGER'],
    allowedPendingTasks: ['OVERDUE_INVOICES'],
    allowedAlerts: ['OVERDUE_INVOICE', 'CREDIT_LIMIT_BREACH'],
    configurableByAdmin: true,
  },
};

const CONFIG_STORAGE_KEY = 'nlink_dashboard_role_overrides_v1';

export function loadLocalRoleConfigOverrides(): Record<string, AdminRoleConfigOverride> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalRoleConfigOverride(override: AdminRoleConfigOverride): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = loadLocalRoleConfigOverrides();
    current[override.roleKey] = {
      ...override,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

/**
 * Resolves the effective RoleDashboardConfig for any user role, applying optional admin visibility overrides
 * strictly within the role's permitted KPIs, charts, sections, and actions (never expanding permissions).
 */
export function resolveRoleDashboardConfig(
  role: string,
  override?: AdminRoleConfigOverride | null
): RoleDashboardConfig {
  const key = getCanonicalDashboardRole(role) as DashboardRoleKey;
  const base = DEFAULT_ROLE_DASHBOARD_CONFIGS[key] || DEFAULT_ROLE_DASHBOARD_CONFIGS.FIELD_SALES_USER;
  if (!override) return { ...base };

  const hiddenKpiSet = new Set(override.hiddenKpis || []);
  const hiddenChartSet = new Set(override.hiddenCharts || []);
  const hiddenSectionSet = new Set(override.hiddenSections || []);
  const hiddenActionSet = new Set(override.hiddenQuickActions || []);

  // Only allow reordering/filtering of KPIs that are already authorized in base.allowedKpis
  const allowedSet = new Set(base.allowedKpis);
  const orderedKpis = override.kpiOrder?.length
    ? [
        ...override.kpiOrder.filter((id) => allowedSet.has(id)),
        ...base.allowedKpis.filter((id) => !override.kpiOrder!.includes(id)),
      ]
    : [...base.allowedKpis];

  const allowedKpis = orderedKpis.filter((id) => !hiddenKpiSet.has(id));

  return {
    ...base,
    layoutSections: base.layoutSections.filter((s) => !hiddenSectionSet.has(s)),
    allowedKpis,
    mobilePrimaryKpis: base.mobilePrimaryKpis.filter((id) => allowedKpis.includes(id)),
    allowedCharts: base.allowedCharts.filter((c) => !hiddenChartSet.has(c)),
    allowedQuickActions: base.allowedQuickActions.filter((a) => !hiddenActionSet.has(a)),
  };
}
