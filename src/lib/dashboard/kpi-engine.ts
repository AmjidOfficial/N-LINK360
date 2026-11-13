/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Authoritative Section 17 KPI Calculation Engine
 * Shared by both Frontend Dashboard Views and Backend /api/dashboard Gateway.
 *
 * CRITICAL ACCOUNTING RULES (Section 17):
 * 1. Sales = Posted/Invoiced orders & invoices only (excludes Draft, Submitted, Pending Approval, Rejected, Cancelled),
 *    net of approved credit notes / return adjustments.
 * 2. Recovery = Accounts/Executive-confirmed recoveries only (VERIFIED / APPROVED / POSTED / shahzadApproval=APPROVED).
 *    Pending payment receipts remain isolated in pendingPaymentConfirmations.
 * 3. Outstanding = Opening Balance + Debits - Credits (or active customer ledger balance).
 * 4. Overdue Outstanding = Unpaid balance on invoices past (invoiceDate + creditDays).
 * 5. Available Stock = Physical On Hand - Reserved Stock.
 * 6. Zero values return 0 cleanly; unavailable datasets mark isAvailable=false ("No Data").
 */

import { roundTo2 } from '../business-rules';
import { isDateInKarachiRange, shiftIsoDate, toKarachiDateIso } from './dates';
import type {
  DashboardAlertItem,
  DashboardComputationResult,
  DashboardDataset,
  DashboardPendingAction,
  DashboardTrendPoint,
  DrillDownRecord,
  ExpenseLineItem,
  ExpenseSummaryBreakdown,
  FieldOperationsSummary,
  HierarchyBreakdowns,
  HierarchyPerformanceRow,
  KpiMetricId,
  KpiMetricValue,
  LowStockSummaryItem,
  OverdueFollowUpItem,
  RecentTransactionRow,
  RoleDashboardConfig,
  StockOverviewSummary,
  TeamPerformanceRow,
  UserDataScope,
} from './types';
import type { KarachiDateRange } from './types';
import type { Customer, Invoice, Recovery, SalesOrder } from '../../types';

const POSTED_ORDER_STATUSES = new Set([
  'INVOICED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
]);

const PENDING_ORDER_STATUSES = new Set([
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CREDIT_CHECK',
  'UNDER_REVIEW',
  'APPROVAL',
  'PENDING',
]);

export function isPostedOrder(order: SalesOrder): boolean {
  const status = String(order.status || '').trim().toUpperCase();
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'DRAFT') return false;
  if (POSTED_ORDER_STATUSES.has(status)) return true;
  if (status === 'APPROVED' && Boolean(order.invoiceNumber || order.invoicedAt)) return true;
  return false;
}

export function isPostedInvoice(invoice: Invoice): boolean {
  const status = String(invoice.status || '').trim().toUpperCase();
  return status === 'POSTED' || status === 'PAID' || status === 'PARTIALLY_PAID';
}

export function isConfirmedRecovery(recovery: Recovery): boolean {
  const status = String(recovery.status || '').trim().toUpperCase();
  if (status === 'REJECTED') return false;
  const shahzadApproval = String(recovery.shahzadApproval || '').trim().toUpperCase();
  const dualApproval = String(recovery.dualApprovalStatus || '').trim().toUpperCase();
  return (
    status === 'VERIFIED' ||
    status === 'APPROVED' ||
    status === 'POSTED' ||
    shahzadApproval === 'APPROVED' ||
    dualApproval === 'DUAL_APPROVED'
  );
}

export function isPendingRecovery(recovery: Recovery): boolean {
  const status = String(recovery.status || '').trim().toUpperCase();
  if (status === 'REJECTED') return false;
  return !isConfirmedRecovery(recovery);
}

export function formatCurrencyPKR(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return 'No Data';
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatNumberCount(val: number | null): string {
  if (val === null || Number.isNaN(val)) return 'No Data';
  return Math.round(val).toLocaleString('en-PK');
}

export function formatPercent(val: number | null): string {
  if (val === null || Number.isNaN(val)) return 'N/A';
  return `${roundTo2(val).toFixed(1)}%`;
}

function getRecoveryDate(r: Recovery): string {
  return r.collectionDate || r.paymentDate || r.recordedAt || r.createdAt || '';
}

function getOrderDate(o: SalesOrder): string {
  return o.invoicedAt || o.orderDate || o.createdAt || '';
}

interface UnifiedSalesDoc {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  date: string;
  amount: number;
  status: string;
  dueDate?: string;
}

function buildPostedSalesDocs(dataset: DashboardDataset): {
  hasSalesData: boolean;
  docs: UnifiedSalesDoc[];
  creditDeductionDocs: Array<{ id: string; reference: string; customerId: string; customerName: string; date: string; amount: number; status: string }>;
} {
  const hasInvoicesArray = Array.isArray(dataset.invoices);
  const hasOrdersArray = Array.isArray(dataset.orders);
  if (!hasInvoicesArray && !hasOrdersArray) {
    return { hasSalesData: false, docs: [], creditDeductionDocs: [] };
  }

  const docs: UnifiedSalesDoc[] = [];
  const coveredOrderIds = new Set<string>();
  const coveredInvoiceNumbers = new Set<string>();

  if (hasInvoicesArray) {
    for (const inv of dataset.invoices!) {
      if (!isPostedInvoice(inv)) continue;
      if (inv.orderId) coveredOrderIds.add(inv.orderId);
      if (inv.invoiceNumber) coveredInvoiceNumbers.add(inv.invoiceNumber);
      docs.push({
        id: inv.id,
        reference: inv.invoiceNumber || inv.id,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerCode: inv.customerCode,
        date: inv.invoiceDate || inv.createdAt,
        amount: roundTo2(Number(inv.totalAmount) || 0),
        status: inv.status,
        dueDate: inv.dueDate,
      });
    }
  }

  if (hasOrdersArray) {
    for (const o of dataset.orders!) {
      if (!isPostedOrder(o)) continue;
      if (coveredOrderIds.has(o.id)) continue;
      if (o.invoiceNumber && coveredInvoiceNumbers.has(o.invoiceNumber)) continue;
      docs.push({
        id: o.id,
        reference: o.invoiceNumber || o.orderNumber || o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        customerCode: o.customerCode,
        date: getOrderDate(o),
        amount: roundTo2(Number(o.totalAmount ?? o.netAmount ?? o.netTotal) || 0),
        status: o.status,
      });
    }
  }

  const creditDeductionDocs: Array<{
    id: string;
    reference: string;
    customerId: string;
    customerName: string;
    date: string;
    amount: number;
    status: string;
  }> = [];

  for (const cn of dataset.creditNotes || []) {
    const status = String(cn.status || '').toUpperCase();
    if (status === 'APPROVED' || status === 'POSTED') {
      creditDeductionDocs.push({
        id: cn.id,
        reference: cn.noteNumber,
        customerId: cn.customerId,
        customerName: cn.customerName,
        date: cn.date || cn.createdAt,
        amount: roundTo2(Number(cn.amount) || 0),
        status,
      });
    }
  }

  // Fallback return deductions only if not already represented by a CreditNote ID
  const creditNoteIds = new Set((dataset.creditNotes || []).map((c) => c.id));
  for (const ret of dataset.stockReturns || []) {
    if (ret.status === 'CREDIT_NOTE_ISSUED' && (!ret.creditNoteId || !creditNoteIds.has(ret.creditNoteId))) {
      creditDeductionDocs.push({
        id: ret.id,
        reference: ret.returnNumber,
        customerId: ret.customerId,
        customerName: ret.customerName,
        date: ret.requestDate || ret.createdAt,
        amount: roundTo2(Number(ret.totalApprovedAmount || ret.totalAmount) || 0),
        status: ret.status,
      });
    }
  }

  return { hasSalesData: true, docs, creditDeductionDocs };
}

function buildDrillDown(
  id: string,
  reference: string,
  title: string,
  subtitle: string,
  date: string,
  status: string,
  opts: { amount?: number; quantity?: number; customerId?: string } = {}
): DrillDownRecord {
  return {
    id,
    reference,
    title,
    subtitle,
    date: toKarachiDateIso(date),
    status,
    ...opts,
  };
}

export function computeDashboardMetrics(params: {
  dataset: DashboardDataset;
  dateRange: KarachiDateRange;
  scope: UserDataScope;
  config: RoleDashboardConfig;
  referenceDate?: Date;
}): DashboardComputationResult {
  const { dataset, dateRange, scope, config, referenceDate = new Date() } = params;

  const todayIso = toKarachiDateIso(referenceDate);
  const monthStartIso = `${todayIso.slice(0, 7)}-01`;
  const [refY, refM] = todayIso.split('-').map(Number);
  const prevMonthDate = new Date(Date.UTC(refY, refM - 1, 0));
  const prevMonthStartIso = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEndIso = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevMonthDate.getUTCDate()).padStart(2, '0')}`;

  const customers = dataset.customers;
  const orders = dataset.orders;
  const recoveries = dataset.recoveries;
  const inventoryBalances = dataset.inventoryBalances;
  const dispatches = dataset.dispatches;
  const attendanceRecords = dataset.attendanceRecords;
  const leaveRequests = dataset.leaveRequests;

  const { hasSalesData, docs: postedSalesDocs, creditDeductionDocs } = buildPostedSalesDocs(dataset);

  const sumSalesInRange = (start: string, end: string) => {
    const grossDocs = postedSalesDocs.filter((d) => isDateInKarachiRange(d.date, start, end));
    const credits = creditDeductionDocs.filter((c) => isDateInKarachiRange(c.date, start, end));
    const grossSum = grossDocs.reduce((s, d) => s + d.amount, 0);
    const creditSum = credits.reduce((s, c) => s + c.amount, 0);
    return {
      netAmount: roundTo2(Math.max(0, grossSum - creditSum)),
      docs: grossDocs,
    };
  };

  const todaySalesCalc = hasSalesData ? sumSalesInRange(todayIso, todayIso) : null;
  const mtdSalesCalc = hasSalesData ? sumSalesInRange(monthStartIso, todayIso) : null;
  const periodSalesCalc = hasSalesData ? sumSalesInRange(dateRange.start, dateRange.end) : null;
  const prevPeriodSalesCalc = hasSalesData ? sumSalesInRange(dateRange.previousStart, dateRange.previousEnd) : null;
  const prevMtdSalesCalc = hasSalesData ? sumSalesInRange(prevMonthStartIso, prevMonthEndIso) : null;

  const hasRecoveryData = Array.isArray(recoveries);
  const confirmedRecoveries = hasRecoveryData ? recoveries!.filter(isConfirmedRecovery) : [];
  const pendingRecoveries = hasRecoveryData ? recoveries!.filter(isPendingRecovery) : [];

  const sumRecoveryInRange = (start: string, end: string) => {
    const rows = confirmedRecoveries.filter((r) => isDateInKarachiRange(getRecoveryDate(r), start, end));
    return {
      amount: roundTo2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
      rows,
    };
  };

  const todayRecoveryCalc = hasRecoveryData ? sumRecoveryInRange(todayIso, todayIso) : null;
  const mtdRecoveryCalc = hasRecoveryData ? sumRecoveryInRange(monthStartIso, todayIso) : null;
  const periodRecoveryCalc = hasRecoveryData ? sumRecoveryInRange(dateRange.start, dateRange.end) : null;
  const prevPeriodRecoveryCalc = hasRecoveryData ? sumRecoveryInRange(dateRange.previousStart, dateRange.previousEnd) : null;

  // Ledger / Customer Outstanding
  const hasCustomerData = Array.isArray(customers);
  const customerList: Customer[] = customers || [];

  // Derive live balance from ledgerEntries if provided per customer, otherwise authoritative customer.currentBalance
  const customerOutstandingRows = customerList.map((c) => {
    const ledgerForCust = (dataset.ledgerEntries || []).filter((le) => le.customerId === c.id);
    let balance = roundTo2(Number(c.currentBalance ?? c.openingBalance) || 0);
    if (ledgerForCust.length > 0 && (c.currentBalance === undefined || c.currentBalance === null)) {
      const debits = ledgerForCust.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0);
      const credits = ledgerForCust.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0);
      balance = roundTo2((Number(c.openingBalance) || 0) + debits - credits);
    }
    return { customer: c, balance };
  });

  const totalOutstandingVal = hasCustomerData
    ? roundTo2(customerOutstandingRows.reduce((s, r) => s + r.balance, 0))
    : null;

  const creditLimitRemainingVal = hasCustomerData
    ? roundTo2(
        customerOutstandingRows.reduce(
          (s, r) => s + Math.max(0, (Number(r.customer.creditLimit) || 0) - Math.max(0, r.balance)),
          0
        )
      )
    : null;

  // Overdue Outstanding calculation via FIFO allocation of confirmed recoveries against posted invoices past due
  const overdueDetails: Array<{
    id: string;
    reference: string;
    customerId: string;
    customerName: string;
    dueDate: string;
    unpaidAmount: number;
    daysOverdue: number;
  }> = [];

  if (hasCustomerData) {
    const customerMap = new Map(customerList.map((c) => [c.id, c]));
    const docsByCustomer = new Map<string, UnifiedSalesDoc[]>();
    for (const d of postedSalesDocs) {
      const list = docsByCustomer.get(d.customerId) || [];
      list.push(d);
      docsByCustomer.set(d.customerId, list);
    }

    for (const [custId, docs] of docsByCustomer.entries()) {
      const cust = customerMap.get(custId);
      const creditDays = Number(cust?.creditDays) || 30;
      let recoveryPool = confirmedRecoveries
        .filter((r) => r.customerId === custId)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      const sorted = [...docs].sort((a, b) => toKarachiDateIso(a.date).localeCompare(toKarachiDateIso(b.date)));
      for (const doc of sorted) {
        const applied = Math.min(doc.amount, recoveryPool);
        recoveryPool = roundTo2(recoveryPool - applied);
        const unpaid = roundTo2(doc.amount - applied);
        if (unpaid <= 0) continue;

        const docDateIso = toKarachiDateIso(doc.date);
        const dueIso = doc.dueDate ? toKarachiDateIso(doc.dueDate) : shiftIsoDate(docDateIso, creditDays);
        if (dueIso < todayIso) {
          const [dy, dm, dd] = dueIso.split('-').map(Number);
          const [ty, tm, td] = todayIso.split('-').map(Number);
          const daysOver = Math.max(1, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(dy, dm - 1, dd)) / 86400000));
          overdueDetails.push({
            id: doc.id,
            reference: doc.reference,
            customerId: custId,
            customerName: doc.customerName || cust?.companyName || 'Customer',
            dueDate: dueIso,
            unpaidAmount: unpaid,
            daysOverdue: daysOver,
          });
        }
      }
    }
  }

  const overdueOutstandingVal = hasCustomerData
    ? roundTo2(overdueDetails.reduce((s, o) => s + o.unpaidAmount, 0))
    : null;

  // Targets (real configured targets or 0 — never hardcoded fake numbers)
  const targetList = dataset.targets || [];
  const salesTargetVal =
    targetList.length > 0
      ? roundTo2(targetList.filter((t) => t.targetType === 'SALES').reduce((s, t) => s + (Number(t.targetValue) || 0), 0))
      : dataset.employees && dataset.employees.length > 0
      ? roundTo2(
          dataset.employees.reduce(
            (s, e) => s + (Number(e.salesDetails?.monthlySalesTarget) || 0),
            0
          )
        )
      : 0;

  const recoveryTargetVal =
    targetList.length > 0
      ? roundTo2(targetList.filter((t) => t.targetType === 'RECOVERY').reduce((s, t) => s + (Number(t.targetValue) || 0), 0))
      : dataset.employees && dataset.employees.length > 0
      ? roundTo2(
          dataset.employees.reduce(
            (s, e) => s + (Number(e.salesDetails?.monthlyRecoveryTarget) || 0),
            0
          )
        )
      : 0;

  const salesAchPctVal =
    mtdSalesCalc && salesTargetVal > 0 ? roundTo2((mtdSalesCalc.netAmount / salesTargetVal) * 100) : null;
  const recoveryAchPctVal =
    mtdRecoveryCalc && recoveryTargetVal > 0 ? roundTo2((mtdRecoveryCalc.amount / recoveryTargetVal) * 100) : null;

  // Customer counts
  const activeDealers = customerList.filter(
    (c) => c.isActive !== false && (c.type === 'DEALER' || c.type === 'SHOP' || c.type === 'CUSTOMER')
  );
  const activeDistributors = customerList.filter(
    (c) => c.isActive !== false && c.type === 'DISTRIBUTOR'
  );
  const pendingCustomers = customerList.filter(
    (c) =>
      c.approvalStatus !== 'APPROVED' &&
      c.status !== 'ACTIVE' &&
      (c.approvalStatus === 'PENDING_APPROVAL' || c.status === 'PENDING_APPROVAL')
  );

  // Order workflow queues
  const allOrders = orders || [];
  const awaitingApprovalOrders = allOrders.filter((o) => PENDING_ORDER_STATUSES.has(String(o.status || '').toUpperCase()));
  const awaitingPackingOrders = allOrders.filter(
    (o) => String(o.status || '').toUpperCase() === 'APPROVED' && !o.packingRecord
  );
  const awaitingDispatchOrders = allOrders.filter((o) => {
    const st = String(o.status || '').toUpperCase();
    return st === 'PACKED' || st === 'INVOICED' || (st === 'APPROVED' && Boolean(o.packingRecord));
  });

  // Dispatch metrics
  const hasDispatchData = Array.isArray(dispatches);
  const allDispatches = dispatches || [];
  const todayDispatched = allDispatches.filter((d) => isDateInKarachiRange(d.dispatchDate, todayIso, todayIso));
  const inTransitDispatches = allDispatches.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'LOADED');
  const deliveredDispatches = allDispatches.filter(
    (d) => d.status === 'DELIVERED' && isDateInKarachiRange(d.actualDeliveryDate || d.dispatchDate, dateRange.start, dateRange.end)
  );

  // Inventory metrics: Available Stock = Physical - Reserved
  const hasInventoryData = Array.isArray(inventoryBalances);
  const balances = inventoryBalances || [];
  const availableStockVal = hasInventoryData
    ? roundTo2(balances.reduce((s, b) => s + Math.max(0, (Number(b.quantityOnHand) || 0) - (Number(b.quantityReserved) || 0)), 0))
    : null;
  const reservedStockVal = hasInventoryData
    ? roundTo2(balances.reduce((s, b) => s + (Number(b.quantityReserved) || 0), 0))
    : null;
  const damagedStockVal = hasInventoryData
    ? roundTo2(balances.reduce((s, b) => s + (Number(b.quantityDamaged) || 0), 0))
    : null;

  const skuReorderMap = new Map((dataset.skus || []).map((s) => [s.id, Number(s.reorderLevel) || 20]));
  const lowStockBalances = balances.filter((b) => {
    const avail = Math.max(0, (Number(b.quantityOnHand) || 0) - (Number(b.quantityReserved) || 0));
    const reorder = skuReorderMap.get(b.skuId) ?? 20;
    return avail <= reorder;
  });

  // HR / Attendance metrics
  const hasAttendanceData = Array.isArray(attendanceRecords);
  const todayAttendance = (attendanceRecords || []).filter((a) => isDateInKarachiRange(a.date, todayIso, todayIso));
  const presentRecords = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'FIELD_DUTY');
  const lateRecords = todayAttendance.filter((a) => a.status === 'LATE');
  const absentRecords = todayAttendance.filter((a) => a.status === 'ABSENT');
  const pendingLeaves = (leaveRequests || []).filter((l) => l.status === 'PENDING');
  const pendingProfilesCount = Number(dataset.profileUpdateRequestsCount ?? 0);

  // Visits today
  const hasVisitsData = Array.isArray(dataset.visits);
  const todayVisits = (dataset.visits || []).filter((v) => isDateInKarachiRange(v.checkinTime, todayIso, todayIso));

  const calcDelta = (curr: number | null, prev: number | null): number | null => {
    if (curr === null || prev === null || prev <= 0) return null;
    return roundTo2(((curr - prev) / prev) * 100);
  };

  // Assemble KPI registry & drilldowns
  const kpis = {} as Record<KpiMetricId, KpiMetricValue>;
  const drillDowns = {} as Record<KpiMetricId, DrillDownRecord[]>;

  const registerKpi = (
    id: KpiMetricId,
    label: string,
    shortLabel: string,
    value: number | null,
    format: 'CURRENCY' | 'NUMBER' | 'PERCENT',
    isAvailable: boolean,
    statusTone: 'emerald' | 'amber' | 'rose' | 'neutral',
    sourceNote: string,
    records: DrillDownRecord[],
    extra: { deltaPercent?: number | null; targetValue?: number } = {}
  ) => {
    const formattedValue = !isAvailable
      ? 'No Data'
      : format === 'CURRENCY'
      ? formatCurrencyPKR(value)
      : format === 'PERCENT'
      ? formatPercent(value)
      : formatNumberCount(value);
    kpis[id] = {
      id,
      label,
      shortLabel,
      value: isAvailable ? value : null,
      formattedValue,
      format,
      statusTone,
      sourceNote,
      isAvailable,
      drillDownCount: records.length,
      ...extra,
    };
    drillDowns[id] = records;
  };

  registerKpi(
    'todaySales',
    "Today's Sales",
    'Today Sales',
    todaySalesCalc?.netAmount ?? null,
    'CURRENCY',
    hasSalesData,
    'emerald',
    'Posted invoices today (Asia/Karachi)',
    (todaySalesCalc?.docs || []).map((d) =>
      buildDrillDown(d.id, d.reference, d.customerName, d.customerCode, d.date, d.status, { amount: d.amount, customerId: d.customerId })
    )
  );

  registerKpi(
    'mtdSales',
    'Month-to-Date Sales',
    'MTD Sales',
    mtdSalesCalc?.netAmount ?? null,
    'CURRENCY',
    hasSalesData,
    'emerald',
    'Posted invoices MTD net of credit notes',
    (mtdSalesCalc?.docs || []).map((d) =>
      buildDrillDown(d.id, d.reference, d.customerName, d.customerCode, d.date, d.status, { amount: d.amount, customerId: d.customerId })
    ),
    { deltaPercent: calcDelta(mtdSalesCalc?.netAmount ?? null, prevMtdSalesCalc?.netAmount ?? null) }
  );

  registerKpi(
    'periodSales',
    `Posted Sales (${dateRange.label})`,
    'Period Sales',
    periodSalesCalc?.netAmount ?? null,
    'CURRENCY',
    hasSalesData,
    'emerald',
    `Posted invoices from ${dateRange.start} to ${dateRange.end}`,
    (periodSalesCalc?.docs || []).map((d) =>
      buildDrillDown(d.id, d.reference, d.customerName, d.customerCode, d.date, d.status, { amount: d.amount, customerId: d.customerId })
    ),
    { deltaPercent: calcDelta(periodSalesCalc?.netAmount ?? null, prevPeriodSalesCalc?.netAmount ?? null) }
  );

  registerKpi('salesTarget', 'Sales Target', 'Sales Target', salesTargetVal, 'CURRENCY', true, 'neutral', 'Configured hierarchy target', []);

  registerKpi(
    'salesAchievementPct',
    'Sales Target Achievement',
    'Sales Ach %',
    salesAchPctVal,
    'PERCENT',
    hasSalesData,
    salesAchPctVal !== null && salesAchPctVal >= 80 ? 'emerald' : salesAchPctVal !== null && salesAchPctVal < 50 ? 'rose' : 'amber',
    'MTD Posted Sales ÷ Target',
    (mtdSalesCalc?.docs || []).map((d) =>
      buildDrillDown(d.id, d.reference, d.customerName, d.customerCode, d.date, d.status, { amount: d.amount, customerId: d.customerId })
    ),
    { targetValue: salesTargetVal }
  );

  registerKpi(
    'todayRecovery',
    "Today's Recovery",
    'Today Recovery',
    todayRecoveryCalc?.amount ?? null,
    'CURRENCY',
    hasRecoveryData,
    'emerald',
    'Accounts-confirmed recoveries today',
    (todayRecoveryCalc?.rows || []).map((r) =>
      buildDrillDown(r.id, r.recoveryNumber, r.customerName, r.paymentMode, getRecoveryDate(r), r.status, { amount: r.amount, customerId: r.customerId })
    )
  );

  registerKpi(
    'mtdRecovery',
    'Month-to-Date Recovery',
    'MTD Recovery',
    mtdRecoveryCalc?.amount ?? null,
    'CURRENCY',
    hasRecoveryData,
    'emerald',
    'Confirmed recoveries MTD',
    (mtdRecoveryCalc?.rows || []).map((r) =>
      buildDrillDown(r.id, r.recoveryNumber, r.customerName, r.paymentMode, getRecoveryDate(r), r.status, { amount: r.amount, customerId: r.customerId })
    )
  );

  registerKpi(
    'periodRecovery',
    `Confirmed Recovery (${dateRange.label})`,
    'Period Recovery',
    periodRecoveryCalc?.amount ?? null,
    'CURRENCY',
    hasRecoveryData,
    'emerald',
    `Confirmed recoveries from ${dateRange.start} to ${dateRange.end}`,
    (periodRecoveryCalc?.rows || []).map((r) =>
      buildDrillDown(r.id, r.recoveryNumber, r.customerName, r.paymentMode, getRecoveryDate(r), r.status, { amount: r.amount, customerId: r.customerId })
    ),
    { deltaPercent: calcDelta(periodRecoveryCalc?.amount ?? null, prevPeriodRecoveryCalc?.amount ?? null) }
  );

  registerKpi('recoveryTarget', 'Recovery Target', 'Recovery Target', recoveryTargetVal, 'CURRENCY', true, 'neutral', 'Configured recovery target', []);

  registerKpi(
    'recoveryAchievementPct',
    'Recovery Target Achievement',
    'Rec Ach %',
    recoveryAchPctVal,
    'PERCENT',
    hasRecoveryData,
    recoveryAchPctVal !== null && recoveryAchPctVal >= 80 ? 'emerald' : 'amber',
    'MTD Confirmed Recovery ÷ Target',
    (mtdRecoveryCalc?.rows || []).map((r) =>
      buildDrillDown(r.id, r.recoveryNumber, r.customerName, r.paymentMode, getRecoveryDate(r), r.status, { amount: r.amount, customerId: r.customerId })
    ),
    { targetValue: recoveryTargetVal }
  );

  registerKpi(
    'totalOutstanding',
    'Total Outstanding',
    'Outstanding',
    totalOutstandingVal,
    'CURRENCY',
    hasCustomerData,
    totalOutstandingVal && totalOutstandingVal > 0 ? 'amber' : 'emerald',
    'Opening Balance + Debits − Credits',
    customerOutstandingRows
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .map((r) =>
        buildDrillDown(r.customer.id, r.customer.customerCode, r.customer.companyName, r.customer.town || r.customer.city, todayIso, r.customer.isCreditLocked ? 'LOCKED' : 'ACTIVE', {
          amount: r.balance,
          customerId: r.customer.id,
        })
      )
  );

  registerKpi(
    'overdueOutstanding',
    'Overdue Outstanding',
    'Overdue',
    overdueOutstandingVal,
    'CURRENCY',
    hasCustomerData,
    overdueOutstandingVal && overdueOutstandingVal > 0 ? 'rose' : 'emerald',
    'Unpaid posted invoices past credit due date',
    overdueDetails.map((o) =>
      buildDrillDown(o.id, o.reference, o.customerName, `${o.daysOverdue}d overdue (Due ${o.dueDate})`, o.dueDate, 'OVERDUE', {
        amount: o.unpaidAmount,
        customerId: o.customerId,
      })
    )
  );

  registerKpi(
    'overdueInvoicesCount',
    'Overdue Invoices',
    'Overdue Bills',
    hasCustomerData ? overdueDetails.length : null,
    'NUMBER',
    hasCustomerData,
    overdueDetails.length > 0 ? 'rose' : 'emerald',
    'Invoices past credit terms',
    overdueDetails.map((o) =>
      buildDrillDown(o.id, o.reference, o.customerName, `${o.daysOverdue}d overdue`, o.dueDate, 'OVERDUE', {
        amount: o.unpaidAmount,
        customerId: o.customerId,
      })
    )
  );

  registerKpi(
    'activeDealersCount',
    'Total Active Dealers',
    'Active Dealers',
    hasCustomerData ? activeDealers.length : null,
    'NUMBER',
    hasCustomerData,
    'neutral',
    'Active retail/dealer accounts in scope',
    activeDealers.map((c) =>
      buildDrillDown(c.id, c.customerCode, c.companyName, c.town || c.city, c.updatedAt || c.createdAt, 'ACTIVE', {
        amount: c.currentBalance,
        customerId: c.id,
      })
    )
  );

  registerKpi(
    'activeDistributorsCount',
    'Total Active Distributors',
    'Distributors',
    hasCustomerData ? activeDistributors.length : null,
    'NUMBER',
    hasCustomerData,
    'neutral',
    'Active distributor partners in scope',
    activeDistributors.map((c) =>
      buildDrillDown(c.id, c.customerCode, c.companyName, c.region || c.city, c.updatedAt || c.createdAt, 'ACTIVE', {
        amount: c.currentBalance,
        customerId: c.id,
      })
    )
  );

  registerKpi(
    'pendingPaymentConfirmations',
    'Pending Payment Confirmations',
    'Pending Receipts',
    hasRecoveryData ? pendingRecoveries.length : null,
    'NUMBER',
    hasRecoveryData,
    pendingRecoveries.length > 0 ? 'amber' : 'emerald',
    'Submitted recovery slips awaiting Accounts verification',
    pendingRecoveries.map((r) =>
      buildDrillDown(r.id, r.recoveryNumber, r.customerName, r.paymentMode, getRecoveryDate(r), r.status, {
        amount: r.amount,
        customerId: r.customerId,
      })
    )
  );

  registerKpi(
    'ordersAwaitingApproval',
    'Orders Awaiting Approval',
    'Pending Orders',
    Array.isArray(orders) ? awaitingApprovalOrders.length : null,
    'NUMBER',
    Array.isArray(orders),
    awaitingApprovalOrders.length > 0 ? 'amber' : 'emerald',
    'Field bookings pending executive review',
    awaitingApprovalOrders.map((o) =>
      buildDrillDown(o.id, o.orderNumber, o.customerName, o.salesUserName, o.orderDate, o.status, {
        amount: o.totalAmount,
        customerId: o.customerId,
      })
    )
  );

  registerKpi(
    'ordersAwaitingPacking',
    'Orders Awaiting Packing',
    'To Pack',
    Array.isArray(orders) ? awaitingPackingOrders.length : null,
    'NUMBER',
    Array.isArray(orders),
    awaitingPackingOrders.length > 0 ? 'amber' : 'emerald',
    'Approved orders ready for carton picking',
    awaitingPackingOrders.map((o) =>
      buildDrillDown(o.id, o.orderNumber, o.customerName, o.customerTown || '', o.orderDate, o.status, {
        amount: o.totalAmount,
        customerId: o.customerId,
      })
    )
  );

  registerKpi(
    'ordersAwaitingDispatch',
    'Orders Awaiting Dispatch',
    'To Dispatch',
    Array.isArray(orders) ? awaitingDispatchOrders.length : null,
    'NUMBER',
    Array.isArray(orders),
    awaitingDispatchOrders.length > 0 ? 'amber' : 'emerald',
    'Packed/Invoiced orders awaiting vehicle loading',
    awaitingDispatchOrders.map((o) =>
      buildDrillDown(o.id, o.orderNumber, o.customerName, o.warehouseName || 'Central WH', o.orderDate, o.status, {
        amount: o.totalAmount,
        customerId: o.customerId,
      })
    )
  );

  registerKpi(
    'todayDispatchedCount',
    'Today Dispatched',
    'Dispatched',
    hasDispatchData ? todayDispatched.length : null,
    'NUMBER',
    hasDispatchData,
    'emerald',
    'Vehicles & bilties dispatched today',
    todayDispatched.map((d) =>
      buildDrillDown(d.id, d.dispatchNumber, d.transporterName, d.vehicleNumber, d.dispatchDate, d.status)
    )
  );

  registerKpi(
    'inTransitCount',
    'In-Transit Shipments',
    'In Transit',
    hasDispatchData ? inTransitDispatches.length : null,
    'NUMBER',
    hasDispatchData,
    inTransitDispatches.length > 0 ? 'amber' : 'neutral',
    'Consignments currently on route',
    inTransitDispatches.map((d) =>
      buildDrillDown(d.id, d.dispatchNumber, d.transporterName, d.destinationCity || d.vehicleNumber, d.dispatchDate, d.status)
    )
  );

  registerKpi(
    'deliveredCount',
    'Delivered Orders',
    'Delivered',
    hasDispatchData ? deliveredDispatches.length : null,
    'NUMBER',
    hasDispatchData,
    'emerald',
    `Completed deliveries (${dateRange.label})`,
    deliveredDispatches.map((d) =>
      buildDrillDown(d.id, d.dispatchNumber, d.transporterName, d.destinationCity || '', d.actualDeliveryDate || d.dispatchDate, d.status)
    )
  );

  registerKpi(
    'availableStockUnits',
    'Available Stock Units',
    'Available Stock',
    availableStockVal,
    'NUMBER',
    hasInventoryData,
    'emerald',
    'Physical On Hand − Reserved Stock',
    balances.map((b) =>
      buildDrillDown(
        b.id,
        b.skuCode || b.skuId,
        b.skuName || b.skuId,
        b.warehouseName || b.warehouseId,
        b.lastUpdatedAt,
        'AVAILABLE',
        { quantity: Math.max(0, (b.quantityOnHand || 0) - (b.quantityReserved || 0)) }
      )
    )
  );

  registerKpi(
    'reservedStockUnits',
    'Reserved Stock Units',
    'Reserved Stock',
    reservedStockVal,
    'NUMBER',
    hasInventoryData,
    'neutral',
    'Allocated to approved/packed orders',
    balances.filter((b) => (b.quantityReserved || 0) > 0).map((b) =>
      buildDrillDown(b.id, b.skuCode || b.skuId, b.skuName || b.skuId, b.warehouseName || b.warehouseId, b.lastUpdatedAt, 'RESERVED', {
        quantity: b.quantityReserved,
      })
    )
  );

  registerKpi(
    'damagedStockUnits',
    'Damaged Stock Units',
    'Damaged',
    damagedStockVal,
    'NUMBER',
    hasInventoryData,
    damagedStockVal && damagedStockVal > 0 ? 'rose' : 'emerald',
    'Quarantined / transit-damaged stock',
    balances.filter((b) => (b.quantityDamaged || 0) > 0).map((b) =>
      buildDrillDown(b.id, b.skuCode || b.skuId, b.skuName || b.skuId, b.warehouseName || b.warehouseId, b.lastUpdatedAt, 'DAMAGED', {
        quantity: b.quantityDamaged,
      })
    )
  );

  registerKpi(
    'lowStockSkuCount',
    'Low Stock Alerts',
    'Low Stock SKUs',
    hasInventoryData ? lowStockBalances.length : null,
    'NUMBER',
    hasInventoryData,
    lowStockBalances.length > 0 ? 'rose' : 'emerald',
    'SKUs at or below reorder threshold',
    lowStockBalances.map((b) =>
      buildDrillDown(b.id, b.skuCode || b.skuId, b.skuName || b.skuId, b.warehouseName || b.warehouseId, b.lastUpdatedAt, 'LOW_STOCK', {
        quantity: Math.max(0, (b.quantityOnHand || 0) - (b.quantityReserved || 0)),
      })
    )
  );

  registerKpi(
    'presentStaffCount',
    'Present Today',
    'Present',
    hasAttendanceData ? presentRecords.length : null,
    'NUMBER',
    hasAttendanceData,
    'emerald',
    'Checked-in & field duty employees today',
    presentRecords.map((a) => buildDrillDown(a.id, a.employeeCode, a.employeeName, a.department, a.date, a.status))
  );

  registerKpi(
    'absentStaffCount',
    'Absent Today',
    'Absent',
    hasAttendanceData ? absentRecords.length : null,
    'NUMBER',
    hasAttendanceData,
    absentRecords.length > 0 ? 'rose' : 'emerald',
    'Marked absent today',
    absentRecords.map((a) => buildDrillDown(a.id, a.employeeCode, a.employeeName, a.department, a.date, a.status))
  );

  registerKpi(
    'lateStaffCount',
    'Late Arrivals',
    'Late',
    hasAttendanceData ? lateRecords.length : null,
    'NUMBER',
    hasAttendanceData,
    lateRecords.length > 0 ? 'amber' : 'emerald',
    'Checked-in past shift grace time',
    lateRecords.map((a) => buildDrillDown(a.id, a.employeeCode, a.employeeName, a.checkInTime || a.department, a.date, a.status))
  );

  registerKpi(
    'pendingLeaveRequests',
    'Pending Leave Requests',
    'Leave Queue',
    Array.isArray(leaveRequests) ? pendingLeaves.length : null,
    'NUMBER',
    Array.isArray(leaveRequests),
    pendingLeaves.length > 0 ? 'amber' : 'emerald',
    'Leave applications awaiting HR approval',
    pendingLeaves.map((l) =>
      buildDrillDown(l.id, l.employeeCode, l.employeeName, `${l.leaveType} (${l.daysCount}d)`, l.fromDate, l.status)
    )
  );

  registerKpi(
    'pendingProfileRequests',
    'Profile Update Requests',
    'Profile Edits',
    pendingProfilesCount,
    'NUMBER',
    true,
    pendingProfilesCount > 0 ? 'amber' : 'emerald',
    'Pending employee detail change requests',
    []
  );

  registerKpi(
    'creditLimitRemaining',
    'Available Credit Limit',
    'Available Credit',
    creditLimitRemainingVal,
    'CURRENCY',
    hasCustomerData,
    creditLimitRemainingVal && creditLimitRemainingVal > 0 ? 'emerald' : 'rose',
    'Approved Credit Limit − Current Outstanding',
    customerOutstandingRows.map((r) =>
      buildDrillDown(
        r.customer.id,
        r.customer.customerCode,
        r.customer.companyName,
        `Limit PKR ${(r.customer.creditLimit || 0).toLocaleString()}`,
        todayIso,
        'CREDIT',
        { amount: Math.max(0, (r.customer.creditLimit || 0) - Math.max(0, r.balance)), customerId: r.customer.id }
      )
    )
  );

  registerKpi(
    'todayVisitsCount',
    "Today's Dealer Visits",
    'Today Visits',
    hasVisitsData ? todayVisits.length : null,
    'NUMBER',
    hasVisitsData,
    'emerald',
    'Geotagged dealer check-ins logged today',
    todayVisits.map((v) =>
      buildDrillDown(v.id, v.customerId, v.customerName || 'Dealer Visit', v.purpose, v.checkinTime, v.orderPlaced ? 'ORDERED' : 'VISITED', {
        amount: v.orderAmount,
        customerId: v.customerId,
      })
    )
  );

  // Pending Actions ("NEEDS YOUR ATTENTION")
  const pendingActionCounts: Record<DashboardPendingAction['id'], DashboardPendingAction> = {
    ORDERS_AWAITING_APPROVAL: {
      id: 'ORDERS_AWAITING_APPROVAL',
      label: 'Orders Awaiting Approval',
      count: awaitingApprovalOrders.length,
      urgency: awaitingApprovalOrders.length > 0 ? 'high' : 'normal',
      actionId: 'OPEN_APPROVALS',
      actionLabel: 'Review Orders',
    },
    PAYMENTS_AWAITING_CONFIRMATION: {
      id: 'PAYMENTS_AWAITING_CONFIRMATION',
      label: 'Payments Awaiting Confirmation',
      count: pendingRecoveries.length,
      urgency: pendingRecoveries.length > 0 ? 'high' : 'normal',
      actionId: 'OPEN_APPROVALS',
      actionLabel: 'Verify Receipts',
    },
    CUSTOMER_REGISTRATIONS_PENDING: {
      id: 'CUSTOMER_REGISTRATIONS_PENDING',
      label: 'Pending Dealer Registrations',
      count: pendingCustomers.length,
      urgency: pendingCustomers.length > 0 ? 'high' : 'normal',
      actionId: 'OPEN_APPROVALS',
      actionLabel: 'Review Dealers',
    },
    ORDERS_AWAITING_PACKING: {
      id: 'ORDERS_AWAITING_PACKING',
      label: 'Orders Awaiting Packing',
      count: awaitingPackingOrders.length,
      urgency: awaitingPackingOrders.length > 0 ? 'medium' : 'normal',
      actionId: 'PACK_ORDERS',
      actionLabel: 'Open Packing',
    },
    ORDERS_AWAITING_DISPATCH: {
      id: 'ORDERS_AWAITING_DISPATCH',
      label: 'Orders Awaiting Dispatch',
      count: awaitingDispatchOrders.length,
      urgency: awaitingDispatchOrders.length > 0 ? 'medium' : 'normal',
      actionId: 'DISPATCH_ORDER',
      actionLabel: 'Assign Dispatch',
    },
    LEAVE_REQUESTS_PENDING: {
      id: 'LEAVE_REQUESTS_PENDING',
      label: 'Pending Leave Requests',
      count: pendingLeaves.length,
      urgency: pendingLeaves.length > 0 ? 'medium' : 'normal',
      actionId: 'VIEW_ATTENDANCE',
      actionLabel: 'Review Leaves',
    },
    PROFILE_REQUESTS_PENDING: {
      id: 'PROFILE_REQUESTS_PENDING',
      label: 'Profile Update Requests',
      count: pendingProfilesCount,
      urgency: pendingProfilesCount > 0 ? 'medium' : 'normal',
      actionId: 'OPEN_APPROVALS',
      actionLabel: 'Review Updates',
    },
    OVERDUE_INVOICES: {
      id: 'OVERDUE_INVOICES',
      label: 'Overdue Party Invoices',
      count: overdueDetails.length,
      urgency: overdueDetails.length > 0 ? 'high' : 'normal',
      actionId: 'VIEW_LEDGER',
      actionLabel: 'Inspect Aging',
    },
  };

  const pendingActions = config.allowedPendingTasks.map((t) => pendingActionCounts[t]).filter(Boolean);

  // Business Alerts
  const alerts: DashboardAlertItem[] = [];
  if (config.allowedAlerts.includes('OVERDUE_INVOICE') && overdueDetails.length > 0) {
    const worst = [...overdueDetails].sort((a, b) => b.unpaidAmount - a.unpaidAmount)[0];
    alerts.push({
      id: `ALT-OVERDUE-${worst.id}`,
      type: 'OVERDUE_INVOICE',
      severity: 'critical',
      title: `${overdueDetails.length} Overdue Invoice${overdueDetails.length > 1 ? 's' : ''}`,
      detail: `${worst.customerName} owes ${formatCurrencyPKR(worst.unpaidAmount)} (${worst.daysOverdue}d past due).`,
      recordId: worst.customerId,
      timestamp: todayIso,
    });
  }
  if (config.allowedAlerts.includes('CREDIT_LIMIT_BREACH')) {
    const overLimit = customerOutstandingRows.filter(
      (r) => (r.customer.creditLimit || 0) > 0 && r.balance > r.customer.creditLimit
    );
    if (overLimit.length > 0) {
      const top = overLimit[0];
      alerts.push({
        id: `ALT-CREDIT-${top.customer.id}`,
        type: 'CREDIT_LIMIT_BREACH',
        severity: 'warning',
        title: `${overLimit.length} Account${overLimit.length > 1 ? 's' : ''} Exceeding Credit Limit`,
        detail: `${top.customer.companyName} balance ${formatCurrencyPKR(top.balance)} exceeds limit ${formatCurrencyPKR(top.customer.creditLimit)}.`,
        recordId: top.customer.id,
        timestamp: todayIso,
      });
    }
  }
  if (config.allowedAlerts.includes('LOW_STOCK') && lowStockBalances.length > 0) {
    const first = lowStockBalances[0];
    alerts.push({
      id: `ALT-STOCK-${first.id}`,
      type: 'LOW_STOCK',
      severity: 'warning',
      title: `${lowStockBalances.length} Low-Stock SKU${lowStockBalances.length > 1 ? 's' : ''}`,
      detail: `${first.skuName || first.skuCode || first.skuId} is at or below reorder threshold.`,
      recordId: first.skuId,
      timestamp: todayIso,
    });
  }
  if (config.allowedAlerts.includes('TARGET_BEHIND') && salesTargetVal > 0 && salesAchPctVal !== null && salesAchPctVal < 75) {
    alerts.push({
      id: 'ALT-TARGET-BEHIND',
      type: 'TARGET_BEHIND',
      severity: salesAchPctVal < 40 ? 'critical' : 'warning',
      title: `Monthly Sales Achievement Behind Pace (${salesAchPctVal.toFixed(1)}%)`,
      detail: `MTD posted sales of ${formatCurrencyPKR(mtdSalesCalc?.netAmount ?? 0)} against ${formatCurrencyPKR(salesTargetVal)} target.`,
      timestamp: todayIso,
    });
  }
  if (config.allowedAlerts.includes('ABSENCE_SPIKE') && absentRecords.length > 0) {
    alerts.push({
      id: 'ALT-ABSENT-TODAY',
      type: 'ABSENCE_SPIKE',
      severity: 'info',
      title: `${absentRecords.length} Absent Staff Logged Today`,
      detail: `Review daily attendance roster and pending leave applications.`,
      timestamp: todayIso,
    });
  }

  // 7-day Sales vs Recovery Trend Series (Asia/Karachi)
  const trendSeries: DashboardTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dIso = shiftIsoDate(todayIso, -i);
    const daySales = sumSalesInRange(dIso, dIso).netAmount;
    const dayRec = sumRecoveryInRange(dIso, dIso).amount;
    trendSeries.push({
      date: dIso,
      label: i === 0 ? 'Today' : dIso.slice(5),
      sales: daySales,
      recovery: dayRec,
    });
  }

  // Reusable level breakdown builder (National / Region / Zone / Territory / Town)
  const customerLookupByIdOrCode = new Map<string, Customer>();
  for (const c of customerList) {
    customerLookupByIdOrCode.set(c.id, c);
    if (c.customerCode) customerLookupByIdOrCode.set(c.customerCode, c);
  }
  const overdueByCustomer = new Map<string, number>();
  for (const od of overdueDetails) {
    overdueByCustomer.set(od.customerId, roundTo2((overdueByCustomer.get(od.customerId) || 0) + od.unpaidAmount));
  }
  const targetByEntityKey = new Map<string, number>();
  for (const t of targetList) {
    if (t.targetType === 'SALES') {
      const entityName = t.regionName || t.areaName || t.territoryName || t.townName;
      if (entityName) {
        const k = entityName.trim().toLowerCase();
        targetByEntityKey.set(k, roundTo2((targetByEntityKey.get(k) || 0) + (Number(t.targetValue) || 0)));
      }
    }
  }

  const buildLevelBreakdown = (level: 'REGION' | 'ZONE' | 'TERRITORY' | 'TOWN'): HierarchyPerformanceRow[] => {
    const map = new Map<string, HierarchyPerformanceRow>();
    const customerKeyLookup = new Map<string, string>();

    const extractGroupName = (c?: Customer): string => {
      if (!c) return 'Unassigned';
      const raw =
        level === 'REGION'
          ? c.region || 'Unassigned'
          : level === 'ZONE'
          ? c.zone || c.area || c.city || 'Unassigned'
          : level === 'TERRITORY'
          ? c.territory || c.city || c.town || 'Unassigned'
          : c.town || c.city || 'Unassigned';
      return raw.trim() || 'Unassigned';
    };

    for (const c of customerList) {
      const key = extractGroupName(c);
      customerKeyLookup.set(c.id, key);
      if (c.customerCode) customerKeyLookup.set(c.customerCode, key);

      const row = map.get(key) || {
        key,
        name: key,
        level,
        activeDealers: 0,
        activeDistributors: 0,
        postedSales: 0,
        confirmedRecovery: 0,
        outstanding: 0,
        overdueOutstanding: 0,
        target: targetByEntityKey.get(key.toLowerCase()) || 0,
        achievementPct: null,
        leadCustomerId: c.id || c.customerCode,
      };
      if (c.isActive !== false) {
        if (c.type === 'DISTRIBUTOR') row.activeDistributors += 1;
        else row.activeDealers += 1;
      }
      row.outstanding = roundTo2(row.outstanding + (Number(c.currentBalance ?? c.openingBalance) || 0));
      row.overdueOutstanding = roundTo2(row.overdueOutstanding + (overdueByCustomer.get(c.id) || 0));
      map.set(key, row);
    }

    for (const doc of periodSalesCalc?.docs || []) {
      const key = customerKeyLookup.get(doc.customerId) || 'Unassigned';
      const row = map.get(key);
      if (row) {
        row.postedSales = roundTo2(row.postedSales + doc.amount);
      }
    }
    for (const rec of periodRecoveryCalc?.rows || []) {
      const key = customerKeyLookup.get(rec.customerId) || 'Unassigned';
      const row = map.get(key);
      if (row) {
        row.confirmedRecovery = roundTo2(row.confirmedRecovery + (Number(rec.amount) || 0));
      }
    }

    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      achievementPct: r.target > 0 ? roundTo2((r.postedSales / r.target) * 100) : null,
    }));

    return rows.sort(
      (a, b) =>
        b.postedSales - a.postedSales ||
        b.confirmedRecovery - a.confirmedRecovery ||
        a.name.localeCompare(b.name)
    );
  };

  const breakdownLevel: 'REGION' | 'ZONE' | 'TERRITORY' | 'TOWN' =
    scope.scopeLevel === 'COMPANY' || scope.scopeLevel === 'NATIONAL'
      ? 'REGION'
      : scope.scopeLevel === 'REGION'
      ? 'ZONE'
      : scope.scopeLevel === 'ZONE'
      ? 'TERRITORY'
      : 'TOWN';

  const byRegion = buildLevelBreakdown('REGION');
  const byZone = buildLevelBreakdown('ZONE');
  const byTerritory = buildLevelBreakdown('TERRITORY');
  const byTown = buildLevelBreakdown('TOWN');
  const hierarchyBreakdown =
    breakdownLevel === 'REGION'
      ? byRegion
      : breakdownLevel === 'ZONE'
      ? byZone
      : breakdownLevel === 'TERRITORY'
      ? byTerritory
      : byTown;

  // Team / Field Officer performance breakdown within authorized scope
  const teamMap = new Map<string, TeamPerformanceRow>();
  const customerTeamLookup = new Map<string, { id: string; name: string; territory: string }>();
  const orderOwnerLookup = new Map<string, { id: string; name: string; territory: string }>();

  const ensureTeamRow = (id: string, name: string, territory: string): TeamPerformanceRow => {
    const cleanId = (id || 'UNASSIGNED').trim() || 'UNASSIGNED';
    const existing = teamMap.get(cleanId);
    if (existing) {
      if (existing.salesUserName === cleanId && name && name !== cleanId) existing.salesUserName = name;
      if (!existing.territory && territory) existing.territory = territory;
      return existing;
    }
    const created: TeamPerformanceRow = {
      salesUserId: cleanId,
      salesUserName: (name || cleanId).trim() || 'Unassigned Officer',
      territory: territory || 'Assigned Territory',
      activeDealers: 0,
      postedSales: 0,
      confirmedRecovery: 0,
      outstanding: 0,
      overdueOutstanding: 0,
      pendingOrdersCount: 0,
      visitsCount: 0,
    };
    teamMap.set(cleanId, created);
    return created;
  };

  for (const c of customerList) {
    const ownerId = (c.assignedOfficerId || c.salesUserId || c.assignedEmployee || 'UNASSIGNED').trim();
    const ownerName = (c.assignedOfficerName || c.assignedEmployee || (ownerId === 'UNASSIGNED' ? 'Unassigned Officer' : ownerId)).trim();
    const ownerTerritory = (c.territory || c.town || c.city || '').trim();
    customerTeamLookup.set(c.id, { id: ownerId, name: ownerName, territory: ownerTerritory });
    if (c.customerCode) customerTeamLookup.set(c.customerCode, { id: ownerId, name: ownerName, territory: ownerTerritory });

    const row = ensureTeamRow(ownerId, ownerName, ownerTerritory);
    if (c.isActive !== false) row.activeDealers += 1;
    row.outstanding = roundTo2(row.outstanding + (Number(c.currentBalance ?? c.openingBalance) || 0));
    row.overdueOutstanding = roundTo2(row.overdueOutstanding + (overdueByCustomer.get(c.id) || 0));
  }

  for (const o of allOrders) {
    if (o.salesUserId) {
      const custOwner = customerTeamLookup.get(o.customerId);
      const ownerInfo = {
        id: o.salesUserId.trim(),
        name: (o.salesUserName || o.salesUserId).trim(),
        territory: custOwner?.territory || o.customerTown || o.town || '',
      };
      orderOwnerLookup.set(o.id, ownerInfo);
      if (o.invoiceNumber) orderOwnerLookup.set(o.invoiceNumber, ownerInfo);
    }
  }

  for (const doc of periodSalesCalc?.docs || []) {
    const owner = orderOwnerLookup.get(doc.id) || orderOwnerLookup.get(doc.reference) || customerTeamLookup.get(doc.customerId) || {
      id: 'UNASSIGNED',
      name: 'Unassigned Officer',
      territory: '',
    };
    const row = ensureTeamRow(owner.id, owner.name, owner.territory);
    row.postedSales = roundTo2(row.postedSales + doc.amount);
  }

  for (const rec of periodRecoveryCalc?.rows || []) {
    const custOwner = customerTeamLookup.get(rec.customerId);
    const ownerId = (rec.salesUserId || custOwner?.id || 'UNASSIGNED').trim();
    const ownerName = (rec.salesUserName || custOwner?.name || 'Unassigned Officer').trim();
    const row = ensureTeamRow(ownerId, ownerName, custOwner?.territory || '');
    row.confirmedRecovery = roundTo2(row.confirmedRecovery + (Number(rec.amount) || 0));
  }

  for (const o of awaitingApprovalOrders) {
    const custOwner = customerTeamLookup.get(o.customerId);
    const ownerId = (o.salesUserId || custOwner?.id || 'UNASSIGNED').trim();
    const ownerName = (o.salesUserName || custOwner?.name || 'Unassigned Officer').trim();
    const row = ensureTeamRow(ownerId, ownerName, custOwner?.territory || o.customerTown || '');
    row.pendingOrdersCount += 1;
  }

  for (const v of dataset.visits || []) {
    if (!isDateInKarachiRange(v.checkinTime, dateRange.start, dateRange.end)) continue;
    const custOwner = customerTeamLookup.get(v.customerId);
    const ownerId = (v.salesUserId || custOwner?.id || 'UNASSIGNED').trim();
    const ownerName = (v.salesUserName || custOwner?.name || 'Unassigned Officer').trim();
    const row = ensureTeamRow(ownerId, ownerName, custOwner?.territory || v.townName || '');
    row.visitsCount += 1;
  }

  const byTeam = Array.from(teamMap.values()).sort(
    (a, b) =>
      b.postedSales - a.postedSales ||
      b.confirmedRecovery - a.confirmedRecovery ||
      b.activeDealers - a.activeDealers ||
      a.salesUserName.localeCompare(b.salesUserName)
  );

  const territoryCandidates = byTerritory.filter((r) => r.name !== 'Unassigned' || byTerritory.length === 1);
  const topTerritories = [...territoryCandidates]
    .sort((a, b) => b.postedSales - a.postedSales || b.confirmedRecovery - a.confirmedRecovery || a.name.localeCompare(b.name))
    .slice(0, 5);
  const lowestTerritories = [...territoryCandidates]
    .sort((a, b) => a.postedSales - b.postedSales || a.confirmedRecovery - b.confirmedRecovery || b.outstanding - a.outstanding || a.name.localeCompare(b.name))
    .slice(0, 5);

  const hierarchyBreakdowns: HierarchyBreakdowns = {
    nationalSummary: {
      activeDealers: activeDealers.length,
      activeDistributors: activeDistributors.length,
      postedSales: periodSalesCalc?.netAmount ?? 0,
      confirmedRecovery: periodRecoveryCalc?.amount ?? 0,
      outstanding: totalOutstandingVal ?? 0,
      overdueOutstanding: overdueOutstandingVal ?? 0,
      salesTarget: salesTargetVal,
      salesAchievementPct: salesAchPctVal,
      recoveryTarget: recoveryTargetVal,
      recoveryAchievementPct: recoveryAchPctVal,
    },
    byRegion,
    byZone,
    byTerritory,
    byTown,
    byTeam,
    topTerritories,
    lowestTerritories,
  };

  // Stock Overview summary
  const lowStockItems: LowStockSummaryItem[] = lowStockBalances
    .map((b) => ({
      skuId: b.skuId,
      skuCode: b.skuCode || b.skuId,
      skuName: b.skuName || b.skuCode || b.skuId,
      warehouseName: b.warehouseName || b.warehouseId || 'Main WH',
      availableUnits: Math.max(0, (Number(b.quantityOnHand) || 0) - (Number(b.quantityReserved) || 0)),
      reorderLevel: skuReorderMap.get(b.skuId) ?? 20,
    }))
    .sort((a, b) => a.availableUnits - b.availableUnits)
    .slice(0, 8);

  const totalPhysicalUnits = hasInventoryData
    ? roundTo2(balances.reduce((s, b) => s + (Number(b.quantityOnHand) || 0), 0))
    : null;

  const stockOverview: StockOverviewSummary = {
    hasData: hasInventoryData,
    totalPhysicalUnits,
    availableUnits: availableStockVal,
    reservedUnits: reservedStockVal,
    damagedUnits: damagedStockVal,
    lowStockCount: hasInventoryData ? lowStockBalances.length : null,
    lowStockItems,
  };

  // Expense Summary (Strictly real Dispatch Freight/Other Charges + Field Visit expenseAmount — explicit No Data if empty)
  const expenseItems: ExpenseLineItem[] = [];
  let dispatchFreightTotal = 0;
  let dispatchOtherTotal = 0;
  let fieldVisitExpensesTotal = 0;

  for (const d of allDispatches) {
    if (!isDateInKarachiRange(d.dispatchDate, dateRange.start, dateRange.end)) continue;
    const freight = roundTo2(Number(d.freightCharges) || 0);
    const other = roundTo2(Number(d.otherCharges) || 0);
    if (freight > 0) {
      dispatchFreightTotal = roundTo2(dispatchFreightTotal + freight);
      expenseItems.push({
        id: `EXP-FR-${d.id}`,
        category: 'DISPATCH_FREIGHT',
        reference: d.dispatchNumber || d.id,
        date: toKarachiDateIso(d.dispatchDate),
        amount: freight,
        subtitle: `${d.transporterName || 'Transporter'} · ${d.destinationCity || d.vehicleNumber || 'Dispatch'}`,
      });
    }
    if (other > 0) {
      dispatchOtherTotal = roundTo2(dispatchOtherTotal + other);
      expenseItems.push({
        id: `EXP-OT-${d.id}`,
        category: 'DISPATCH_OTHER',
        reference: d.dispatchNumber || d.id,
        date: toKarachiDateIso(d.dispatchDate),
        amount: other,
        subtitle: `Bilty/Other · ${d.bilityNumber || d.transporterName || 'Dispatch'}`,
      });
    }
  }

  for (const v of dataset.visits || []) {
    if (!isDateInKarachiRange(v.checkinTime, dateRange.start, dateRange.end)) continue;
    const visitExp = roundTo2(Number((v as { expenseAmount?: number }).expenseAmount) || 0);
    if (visitExp > 0) {
      fieldVisitExpensesTotal = roundTo2(fieldVisitExpensesTotal + visitExp);
      expenseItems.push({
        id: `EXP-VS-${v.id}`,
        category: 'FIELD_VISIT',
        reference: v.salesUserName || v.salesUserId,
        date: toKarachiDateIso(v.checkinTime),
        amount: visitExp,
        subtitle: `${v.customerName || 'Field Visit'} · ${v.townName || v.purpose}`,
      });
    }
  }

  expenseItems.sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = roundTo2(dispatchFreightTotal + dispatchOtherTotal + fieldVisitExpensesTotal);
  const expenseSummary: ExpenseSummaryBreakdown = {
    hasData: expenseItems.length > 0,
    dispatchFreightTotal,
    dispatchOtherTotal,
    fieldVisitExpensesTotal,
    totalExpenses,
    entriesCount: expenseItems.length,
    items: expenseItems.slice(0, 12),
  };

  // Field Operations Summary (Attendance, Productive Visits, Priority Collection Follow-Ups & Towns)
  const myTodayAttendance =
    todayAttendance.find((a) => !scope.userId || a.employeeId === scope.userId || a.userId === scope.userId) ||
    todayAttendance[0];
  const periodVisits = (dataset.visits || []).filter((v) =>
    isDateInKarachiRange(v.checkinTime, dateRange.start, dateRange.end)
  );
  const productiveVisitsCount = periodVisits.filter((v) =>
    Boolean(v.orderPlaced || v.orderBooked || v.recoveryCollected)
  ).length;
  const nonProductiveVisitsCount = Math.max(0, periodVisits.length - productiveVisitsCount);

  const maxOverdueDaysByCustomer = new Map<string, number>();
  for (const od of overdueDetails) {
    const prev = maxOverdueDaysByCustomer.get(od.customerId) || 0;
    if (od.daysOverdue > prev) maxOverdueDaysByCustomer.set(od.customerId, od.daysOverdue);
  }

  const priorityFollowUps: OverdueFollowUpItem[] = customerOutstandingRows
    .map((r) => {
      const overdueAmt = overdueByCustomer.get(r.customer.id) || 0;
      const creditLimit = roundTo2(Number(r.customer.creditLimit) || 0);
      const isNearLimit = creditLimit > 0 && r.balance > 0 && r.balance / creditLimit >= 0.8;
      if (overdueAmt <= 0 && !isNearLimit) return null;
      return {
        customerId: r.customer.id,
        customerName: r.customer.companyName || 'Customer',
        customerCode: r.customer.customerCode || r.customer.id,
        town: r.customer.town || r.customer.city || 'Assigned Town',
        overdueAmount: overdueAmt,
        maxDaysOverdue: maxOverdueDaysByCustomer.get(r.customer.id) || 0,
        currentBalance: roundTo2(r.balance),
        creditLimit,
      };
    })
    .filter((item): item is OverdueFollowUpItem => item !== null)
    .sort(
      (a, b) =>
        b.overdueAmount - a.overdueAmount ||
        b.maxDaysOverdue - a.maxDaysOverdue ||
        b.currentBalance - a.currentBalance
    )
    .slice(0, 8);

  const fieldSummary: FieldOperationsSummary = {
    todayAttendanceStatus: myTodayAttendance?.status || 'NOT_MARKED',
    checkInTime: myTodayAttendance?.checkInTime || null,
    checkOutTime: myTodayAttendance?.checkOutTime || null,
    checkInLocation: myTodayAttendance?.checkInLocation || null,
    todayVisitsCount: todayVisits.length,
    productiveVisitsCount,
    nonProductiveVisitsCount,
    periodVisitsCount: periodVisits.length,
    visitExpenseTotal: fieldVisitExpensesTotal,
    pendingOrdersCount: awaitingApprovalOrders.length,
    pendingRecoveriesCount: pendingRecoveries.length,
    priorityFollowUps,
    assignedTownsSummary: byTown,
  };

  // Recent Transactions (strictly posted invoices & confirmed recoveries)
  const recentTransactions: RecentTransactionRow[] = [
    ...postedSalesDocs.map((d) => ({
      id: d.id,
      type: 'INVOICE' as const,
      reference: d.reference,
      partyName: d.customerName,
      date: toKarachiDateIso(d.date),
      amount: d.amount,
      status: d.status,
      customerId: d.customerId,
    })),
    ...confirmedRecoveries.map((r) => ({
      id: r.id,
      type: 'RECOVERY' as const,
      reference: r.recoveryNumber,
      partyName: r.customerName,
      date: toKarachiDateIso(getRecoveryDate(r)),
      amount: roundTo2(Number(r.amount) || 0),
      status: r.status,
      customerId: r.customerId,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  // Available hierarchy filter options derived purely from authorized scoped customers
  const regions = Array.from(new Set(customerList.map((c) => (c.region || '').trim()).filter(Boolean))).sort();
  const zones = Array.from(new Set(customerList.map((c) => (c.zone || c.area || '').trim()).filter(Boolean))).sort();
  const territories = Array.from(new Set(customerList.map((c) => (c.territory || c.city || '').trim()).filter(Boolean))).sort();
  const towns = Array.from(new Set(customerList.map((c) => (c.town || c.city || '').trim()).filter(Boolean))).sort();
  const dealers = customerList
    .filter((c) => c.id && c.companyName)
    .map((c) => ({ id: c.id, name: c.companyName }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    dateRange,
    scope,
    config,
    kpis,
    drillDowns,
    pendingActions,
    pendingCustomerRegistrationsCount: pendingCustomers.length,
    alerts,
    trendSeries,
    hierarchyBreakdown,
    hierarchyBreakdowns,
    stockOverview,
    expenseSummary,
    fieldSummary,
    recentTransactions,
    filterOptions: { regions, zones, territories, towns, dealers },
    computedAt: new Date().toISOString(),
  };
}
