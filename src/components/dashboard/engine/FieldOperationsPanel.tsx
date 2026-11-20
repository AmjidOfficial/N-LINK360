import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Receipt,
  ShoppingBag,
  Target,
  UserCheck,
} from 'lucide-react';
import type {
  FieldOperationsSummary,
  KpiMetricId,
  KpiMetricValue,
  QuickActionId,
} from '../../../lib/dashboard';
import { formatCurrencyPKR, formatNumberCount } from '../../../lib/dashboard';

export interface FieldLiveContext {
  isCheckedIn?: boolean;
  checkedInTime?: string | null;
  checkedOutTime?: string | null;
  selectedTown?: string;
  onToggleCheckIn?: () => void;
}

export interface FieldOperationsPanelProps {
  fieldSummary: FieldOperationsSummary;
  kpis: Record<KpiMetricId, KpiMetricValue>;
  dateRangeLabel: string;
  liveContext?: FieldLiveContext;
  onSelectCustomer?: (customerId: string) => void;
  onQuickAction?: (actionId: QuickActionId) => void;
}

export const FieldOperationsPanel: React.FC<FieldOperationsPanelProps> = ({
  fieldSummary,
  kpis,
  dateRangeLabel,
  liveContext,
  onSelectCustomer,
  onQuickAction,
}) => {
  const isLiveCheckedIn = Boolean(liveContext?.isCheckedIn);
  const effectiveStatus = isLiveCheckedIn
    ? 'PRESENT'
    : fieldSummary.todayAttendanceStatus;
  const effectiveCheckIn = liveContext?.checkedInTime || fieldSummary.checkInTime;
  const effectiveCheckOut = liveContext?.checkedOutTime || fieldSummary.checkOutTime;
  const activeLocation =
    fieldSummary.checkInLocation || liveContext?.selectedTown || 'Assigned Route';

  const mtdSalesVal = kpis.mtdSales?.value ?? 0;
  const salesTargetVal = kpis.salesTarget?.value ?? 0;
  const salesPct =
    salesTargetVal > 0 ? Math.min(100, Math.round((mtdSalesVal / salesTargetVal) * 1000) / 10) : null;

  const mtdRecVal = kpis.mtdRecovery?.value ?? 0;
  const recTargetVal = kpis.recoveryTarget?.value ?? 0;
  const recPct =
    recTargetVal > 0 ? Math.min(100, Math.round((mtdRecVal / recTargetVal) * 1000) / 10) : null;

  const statusLabel =
    effectiveStatus === 'PRESENT' || effectiveStatus === 'FIELD_DUTY'
      ? 'ON DUTY · CHECKED IN'
      : effectiveStatus === 'LATE'
      ? 'LATE ARRIVAL'
      : effectiveStatus === 'ON_LEAVE'
      ? 'ON LEAVE'
      : effectiveStatus === 'HALF_DAY'
      ? 'HALF DAY'
      : effectiveStatus === 'ABSENT'
      ? 'ABSENT'
      : 'SHIFT NOT STARTED';

  const statusColorClass =
    effectiveStatus === 'PRESENT' || effectiveStatus === 'FIELD_DUTY'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
      : effectiveStatus === 'LATE' || effectiveStatus === 'HALF_DAY'
      ? 'bg-orange-50 text-[#EA580C] border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60'
      : 'bg-slate-100 text-slate-700 border-[#E2E8F0] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <section aria-label="Field Execution Operations" className="space-y-5">
      {/* Row 1: Shift Attendance, Target Pacing & Visit Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 h-full rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#3B82F6] dark:text-blue-400">
                Daily Field Attendance
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5 truncate">
                Shift Status &amp; GPS Beat
              </h3>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold tracking-wide uppercase ${statusColorClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Check-In
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                {effectiveCheckIn || 'Not marked'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Active Town
              </div>
              <div className="mt-1 text-xs font-bold text-[#0F172A] dark:text-white truncate">
                {activeLocation}
              </div>
            </div>
            {effectiveCheckOut && (
              <div className="col-span-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Last Check-Out</span>
                <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-slate-200">
                  {effectiveCheckOut}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-auto">
            {liveContext?.onToggleCheckIn && (
              <button
                type="button"
                onClick={liveContext.onToggleCheckIn}
                className={`flex-1 min-h-[44px] ${
                  isLiveCheckedIn ? 'btn-danger' : 'btn-primary'
                }`}
              >
                {isLiveCheckedIn ? (
                  <>
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Check Out Shift</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>Check In ({liveContext.selectedTown || 'Town'})</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onQuickAction?.('VIEW_ATTENDANCE')}
              className="btn-outline min-h-[44px]"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#3B82F6] dark:text-blue-400" />
              <span>Attendance Log</span>
            </button>
          </div>
        </div>

        {/* Quota Progress & Visit Pulse */}
        <div className="lg:col-span-7 h-full rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#3B82F6] dark:text-blue-400">
                Quota &amp; Visit Productivity
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">
                Monthly Target Attainment ({dateRangeLabel})
              </h3>
            </div>
            <Target className="w-4 h-4 text-[#3B82F6] dark:text-blue-400 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sales Quota */}
            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  MTD Posted Sales
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-[#3B82F6] dark:text-blue-400">
                  {salesPct !== null ? `${salesPct.toFixed(1)}%` : 'No Target'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] transition-all"
                  style={{ width: `${salesPct ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>{formatCurrencyPKR(mtdSalesVal)}</span>
                <span>Target {formatCurrencyPKR(salesTargetVal)}</span>
              </div>
            </div>

            {/* Recovery Quota */}
            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  MTD Confirmed Recovery
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                  {recPct !== null ? `${recPct.toFixed(1)}%` : 'No Target'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${recPct ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>{formatCurrencyPKR(mtdRecVal)}</span>
                <span>Target {formatCurrencyPKR(recTargetVal)}</span>
              </div>
            </div>
          </div>

          {/* 4 Operational Visit & Queue Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Today Visits
              </div>
              <div className="mt-1 text-base font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                {formatNumberCount(fieldSummary.todayVisitsCount)}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Productive
              </div>
              <div className="mt-1 text-base font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumberCount(fieldSummary.productiveVisitsCount)}
                <span className="ml-1 text-[10px] font-normal text-slate-400">
                  / {formatNumberCount(fieldSummary.periodVisitsCount)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-[#F97316]" /> Orders Pending
              </div>
              <div className="mt-1 text-base font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                {formatNumberCount(fieldSummary.pendingOrdersCount)}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Receipt className="w-3 h-3 text-[#F97316]" /> Receipts Unverified
              </div>
              <div className="mt-1 text-base font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                {formatNumberCount(fieldSummary.pendingRecoveriesCount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Priority Overdue Collection Follow-Ups & Assigned Towns Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6 h-full rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Priority Collection Follow-Ups
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Overdue invoices &amp; high credit utilization accounts in your territory
              </p>
            </div>
            <AlertTriangle className="w-4 h-4 text-[#F97316] shrink-0" />
          </div>

          {fieldSummary.priorityFollowUps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
              All assigned party ledgers are within credit terms — no overdue invoices pending collection.
            </div>
          ) : (
            <div className="space-y-2">
              {fieldSummary.priorityFollowUps.map((item) => (
                <button
                  key={item.customerId}
                  type="button"
                  onClick={() => onSelectCustomer?.(item.customerId)}
                  className="w-full min-h-[48px] text-left rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] hover:border-[#3B82F6] p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                        {item.customerName}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {item.customerCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.town} ·{' '}
                      {item.maxDaysOverdue > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                          {item.maxDaysOverdue}d past due
                        </span>
                      ) : (
                        <span className="text-[#F97316] dark:text-orange-400 font-semibold">
                          High credit utilization
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div className="text-xs font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        {item.overdueAmount > 0
                          ? formatCurrencyPKR(item.overdueAmount)
                          : formatCurrencyPKR(item.currentBalance)}
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        Bal {formatCurrencyPKR(item.currentBalance)}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 h-full rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Assigned Towns Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Posted sales, confirmed recovery &amp; net party balances ({dateRangeLabel})
            </p>
          </div>

          {fieldSummary.assignedTownsSummary.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400">
              No assigned town records found for the active filter.
            </div>
          ) : (
            <>
              {/* Mobile Compact Cards */}
              <div className="sm:hidden space-y-2">
                {fieldSummary.assignedTownsSummary.map((town) => (
                  <div
                    key={town.key}
                    className="rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {town.name}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {town.activeDealers} Dealers
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-sans">Sales</span>
                        <span className="font-semibold text-[#3B82F6] dark:text-blue-400">
                          {formatCurrencyPKR(town.postedSales)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-sans">Recovery</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyPKR(town.confirmedRecovery)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-sans">Balance</span>
                        <span className="font-semibold text-[#F97316] dark:text-orange-400">
                          {formatCurrencyPKR(town.outstanding)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Clean Hairline Table */}
              <div className="hidden sm:block responsive-table-container">
                <table className="w-full text-left border-collapse text-xs frozen-first-col">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-semibold">Town</th>
                      <th className="py-2.5 px-2 font-semibold text-right">Dealers</th>
                      <th className="py-2.5 px-2 font-semibold text-right">Posted Sales</th>
                      <th className="py-2.5 px-2 font-semibold text-right">Recovery</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {fieldSummary.assignedTownsSummary.map((town) => (
                      <tr
                        key={town.key}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                          {town.name}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {town.activeDealers}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-[#3B82F6] dark:text-blue-400">
                          {formatCurrencyPKR(town.postedSales)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyPKR(town.confirmedRecovery)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#F97316] dark:text-orange-400">
                          {formatCurrencyPKR(town.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
