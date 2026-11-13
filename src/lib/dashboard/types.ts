/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Role-Based Dashboard Architecture Types
 */

import type {
  AttendanceStatus,
  CreditNote,
  Customer,
  CustomerVisit,
  Dispatch,
  Employee,
  EmployeeAttendance,
  InventoryBalance,
  Invoice,
  LeaveRequest,
  LedgerEntry,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  Target,
  UserRole,
} from '../../types';

export type DashboardRoleKey =
  | 'MD_EXECUTIVE'
  | 'NATIONAL_MANAGER'
  | 'RSM'
  | 'ZSM'
  | 'FIELD_SALES_USER'
  | 'ACCOUNTS'
  | 'WAREHOUSE'
  | 'DISPATCH'
  | 'HR_ADMIN'
  | 'DISTRIBUTOR'
  | 'DEALER';

export type DataScopeLevel =
  | 'COMPANY'
  | 'NATIONAL'
  | 'REGION'
  | 'ZONE'
  | 'TERRITORY'
  | 'TOWN'
  | 'TEAM'
  | 'DISTRIBUTOR'
  | 'DEALER'
  | 'DEPARTMENT';

export type DashboardDatePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface KarachiDateRange {
  preset: DashboardDatePreset;
  start: string; // YYYY-MM-DD in Asia/Karachi
  end: string; // YYYY-MM-DD in Asia/Karachi
  label: string;
  previousStart: string;
  previousEnd: string;
}

export type DashboardSectionId =
  | 'KPIS'
  | 'PENDING_ACTIONS'
  | 'CHARTS'
  | 'HIERARCHY_BREAKDOWN'
  | 'RECENT_TRANSACTIONS'
  | 'ALERTS';

export type KpiMetricId =
  | 'todaySales'
  | 'mtdSales'
  | 'periodSales'
  | 'salesTarget'
  | 'salesAchievementPct'
  | 'todayRecovery'
  | 'mtdRecovery'
  | 'periodRecovery'
  | 'recoveryTarget'
  | 'recoveryAchievementPct'
  | 'totalOutstanding'
  | 'overdueOutstanding'
  | 'overdueInvoicesCount'
  | 'activeDealersCount'
  | 'activeDistributorsCount'
  | 'pendingPaymentConfirmations'
  | 'ordersAwaitingApproval'
  | 'ordersAwaitingPacking'
  | 'ordersAwaitingDispatch'
  | 'todayDispatchedCount'
  | 'inTransitCount'
  | 'deliveredCount'
  | 'availableStockUnits'
  | 'reservedStockUnits'
  | 'damagedStockUnits'
  | 'lowStockSkuCount'
  | 'presentStaffCount'
  | 'absentStaffCount'
  | 'lateStaffCount'
  | 'pendingLeaveRequests'
  | 'pendingProfileRequests'
  | 'creditLimitRemaining'
  | 'todayVisitsCount';

export type DashboardChartId =
  | 'SALES_RECOVERY_TREND'
  | 'REGIONAL_PERFORMANCE'
  | 'TERRITORY_RANKING'
  | 'AGING_BREAKDOWN'
  | 'STOCK_OVERVIEW'
  | 'DISPATCH_PIPELINE'
  | 'ATTENDANCE_OVERVIEW';

export type DashboardFilterId =
  | 'DATE_RANGE'
  | 'REGION'
  | 'ZONE'
  | 'TERRITORY'
  | 'TOWN'
  | 'DISTRIBUTOR'
  | 'DEALER'
  | 'WAREHOUSE';

export type QuickActionId =
  | 'NEW_ORDER'
  | 'RECORD_RECOVERY'
  | 'OPEN_APPROVALS'
  | 'CREATE_INVOICE'
  | 'PACK_ORDERS'
  | 'DISPATCH_ORDER'
  | 'VIEW_LEDGER'
  | 'VIEW_ATTENDANCE'
  | 'EXPORT_REPORT';

export type PendingTaskId =
  | 'ORDERS_AWAITING_APPROVAL'
  | 'PAYMENTS_AWAITING_CONFIRMATION'
  | 'CUSTOMER_REGISTRATIONS_PENDING'
  | 'ORDERS_AWAITING_PACKING'
  | 'ORDERS_AWAITING_DISPATCH'
  | 'LEAVE_REQUESTS_PENDING'
  | 'PROFILE_REQUESTS_PENDING'
  | 'OVERDUE_INVOICES';

export type DashboardAlertType =
  | 'OVERDUE_INVOICE'
  | 'CREDIT_LIMIT_BREACH'
  | 'LOW_STOCK'
  | 'DISPATCH_DELAY'
  | 'TARGET_BEHIND'
  | 'ABSENCE_SPIKE';

export interface RoleDashboardConfig {
  roleKey: DashboardRoleKey;
  title: string;
  subtitle: string;
  dataScope: DataScopeLevel;
  layoutSections: DashboardSectionId[];
  allowedKpis: KpiMetricId[];
  mobilePrimaryKpis: KpiMetricId[];
  allowedCharts: DashboardChartId[];
  allowedFilters: DashboardFilterId[];
  allowedQuickActions: QuickActionId[];
  allowedPendingTasks: PendingTaskId[];
  allowedAlerts: DashboardAlertType[];
  configurableByAdmin: boolean;
}

export interface AdminRoleConfigOverride {
  roleKey: DashboardRoleKey;
  hiddenKpis?: KpiMetricId[];
  kpiOrder?: KpiMetricId[];
  hiddenCharts?: DashboardChartId[];
  hiddenSections?: DashboardSectionId[];
  hiddenQuickActions?: QuickActionId[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface DashboardHierarchyFilter {
  region?: string;
  zone?: string;
  territory?: string;
  town?: string;
  team?: string;
  distributorId?: string;
  dealerId?: string;
  warehouseId?: string;
}

export interface UserDataScope {
  userId: string;
  email: string;
  rawRole: UserRole | string;
  permissionGroup: string;
  dashboardRoleKey: DashboardRoleKey;
  scopeLevel: DataScopeLevel;
  region?: string;
  zone?: string;
  territory?: string;
  assignedTowns: string[];
  team?: string;
  distributorId?: string;
  dealerId?: string;
  isCompanyWide: boolean;
}

export interface ScopeValidationResult {
  authorized: boolean;
  reason?: string;
  effectiveFilter: DashboardHierarchyFilter;
}

export type KpiFormatType = 'CURRENCY' | 'NUMBER' | 'PERCENT';

export interface DrillDownRecord {
  id: string;
  reference: string;
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  quantity?: number;
  status: string;
  customerId?: string;
}

export interface KpiMetricValue {
  id: KpiMetricId;
  label: string;
  shortLabel: string;
  value: number | null;
  formattedValue: string;
  format: KpiFormatType;
  targetValue?: number;
  comparisonValue?: number | null;
  deltaPercent?: number | null;
  statusTone: 'emerald' | 'amber' | 'rose' | 'neutral';
  sourceNote: string;
  isAvailable: boolean;
  drillDownCount: number;
}

export interface DashboardPendingAction {
  id: PendingTaskId;
  label: string;
  count: number;
  urgency: 'high' | 'medium' | 'normal';
  actionId: QuickActionId;
  actionLabel: string;
}

export interface DashboardAlertItem {
  id: string;
  type: DashboardAlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  recordId?: string;
  timestamp: string;
}

export interface DashboardTrendPoint {
  date: string;
  label: string;
  sales: number;
  recovery: number;
}

export interface HierarchyPerformanceRow {
  key: string;
  name: string;
  level: 'REGION' | 'ZONE' | 'TERRITORY' | 'TOWN';
  activeDealers: number;
  activeDistributors: number;
  postedSales: number;
  confirmedRecovery: number;
  outstanding: number;
  overdueOutstanding: number;
  target: number;
  achievementPct: number | null;
  leadCustomerId?: string;
}

export interface NationalSummaryTotals {
  activeDealers: number;
  activeDistributors: number;
  postedSales: number;
  confirmedRecovery: number;
  outstanding: number;
  overdueOutstanding: number;
  salesTarget: number;
  salesAchievementPct: number | null;
  recoveryTarget: number;
  recoveryAchievementPct: number | null;
}

export interface TeamPerformanceRow {
  salesUserId: string;
  salesUserName: string;
  territory: string;
  activeDealers: number;
  postedSales: number;
  confirmedRecovery: number;
  outstanding: number;
  overdueOutstanding: number;
  pendingOrdersCount: number;
  visitsCount: number;
}

export interface HierarchyBreakdowns {
  nationalSummary: NationalSummaryTotals;
  byRegion: HierarchyPerformanceRow[];
  byZone: HierarchyPerformanceRow[];
  byTerritory: HierarchyPerformanceRow[];
  byTown: HierarchyPerformanceRow[];
  byTeam: TeamPerformanceRow[];
  topTerritories: HierarchyPerformanceRow[];
  lowestTerritories: HierarchyPerformanceRow[];
}

export interface LowStockSummaryItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  warehouseName: string;
  availableUnits: number;
  reorderLevel: number;
}

export interface StockOverviewSummary {
  hasData: boolean;
  totalPhysicalUnits: number | null;
  availableUnits: number | null;
  reservedUnits: number | null;
  damagedUnits: number | null;
  lowStockCount: number | null;
  lowStockItems: LowStockSummaryItem[];
}

export interface ExpenseLineItem {
  id: string;
  category: 'DISPATCH_FREIGHT' | 'DISPATCH_OTHER' | 'FIELD_VISIT';
  reference: string;
  date: string;
  amount: number;
  subtitle: string;
}

export interface ExpenseSummaryBreakdown {
  hasData: boolean;
  dispatchFreightTotal: number;
  dispatchOtherTotal: number;
  fieldVisitExpensesTotal: number;
  totalExpenses: number;
  entriesCount: number;
  items: ExpenseLineItem[];
}

export interface RecentTransactionRow {
  id: string;
  type: 'INVOICE' | 'RECOVERY' | 'DISPATCH';
  reference: string;
  partyName: string;
  date: string;
  amount: number;
  status: string;
  customerId?: string;
}

export interface DashboardDataset {
  customers?: Customer[];
  orders?: SalesOrder[];
  invoices?: Invoice[];
  recoveries?: Recovery[];
  ledgerEntries?: LedgerEntry[];
  inventoryBalances?: InventoryBalance[];
  skus?: SKU[];
  dispatches?: Dispatch[];
  attendanceRecords?: EmployeeAttendance[];
  leaveRequests?: LeaveRequest[];
  profileUpdateRequestsCount?: number;
  employees?: Employee[];
  targets?: Target[];
  creditNotes?: CreditNote[];
  stockReturns?: StockReturn[];
  visits?: CustomerVisit[];
}

export interface OverdueFollowUpItem {
  customerId: string;
  customerName: string;
  customerCode: string;
  town: string;
  overdueAmount: number;
  maxDaysOverdue: number;
  currentBalance: number;
  creditLimit: number;
}

export interface FieldOperationsSummary {
  todayAttendanceStatus: AttendanceStatus | 'NOT_MARKED';
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLocation: string | null;
  todayVisitsCount: number;
  productiveVisitsCount: number;
  nonProductiveVisitsCount: number;
  periodVisitsCount: number;
  visitExpenseTotal: number;
  pendingOrdersCount: number;
  pendingRecoveriesCount: number;
  priorityFollowUps: OverdueFollowUpItem[];
  assignedTownsSummary: HierarchyPerformanceRow[];
}

export interface DashboardComputationResult {
  dateRange: KarachiDateRange;
  scope: UserDataScope;
  config: RoleDashboardConfig;
  kpis: Record<KpiMetricId, KpiMetricValue>;
  drillDowns: Record<KpiMetricId, DrillDownRecord[]>;
  pendingActions: DashboardPendingAction[];
  pendingCustomerRegistrationsCount: number;
  alerts: DashboardAlertItem[];
  trendSeries: DashboardTrendPoint[];
  hierarchyBreakdown: HierarchyPerformanceRow[];
  hierarchyBreakdowns: HierarchyBreakdowns;
  stockOverview: StockOverviewSummary;
  expenseSummary: ExpenseSummaryBreakdown;
  fieldSummary?: FieldOperationsSummary;
  recentTransactions: RecentTransactionRow[];
  filterOptions: {
    regions: string[];
    zones: string[];
    territories: string[];
    towns: string[];
    dealers: Array<{ id: string; name: string }>;
  };
  computedAt: string;
}
