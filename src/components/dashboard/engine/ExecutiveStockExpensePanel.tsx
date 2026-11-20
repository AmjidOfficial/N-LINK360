import React from 'react';
import { Boxes, Receipt, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { formatCurrencyPKR, formatNumberCount } from '../../../lib/dashboard';
import type { ExpenseSummaryBreakdown, StockOverviewSummary } from '../../../lib/dashboard';

export interface ExecutiveStockExpensePanelProps {
  stockOverview: StockOverviewSummary;
  expenseSummary: ExpenseSummaryBreakdown;
  dateRangeLabel: string;
  onOpenInventory?: () => void;
}

export const ExecutiveStockExpensePanel: React.FC<ExecutiveStockExpensePanelProps> = ({
  stockOverview,
  expenseSummary,
  dateRangeLabel,
  onOpenInventory,
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
      {/* STOCK OVERVIEW PANEL */}
      <section className="h-full rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/70">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#3B82F6] dark:text-blue-400" />
              <span>Stock Overview</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Available = Physical On Hand &minus; Reserved Stock
            </p>
          </div>
          {onOpenInventory && (
            <button
              type="button"
              onClick={onOpenInventory}
              className="btn-outline min-h-[44px] sm:min-h-[38px] text-[#3B82F6] dark:text-blue-400"
            >
              <span>Warehouse</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!stockOverview.hasData ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700">
            <div className="text-sm font-mono font-bold text-slate-500 dark:text-slate-400">No Data</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Warehouse inventory balances are not loaded for this view.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Available</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatNumberCount(stockOverview.availableUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Reserved</div>
                <div className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                  {formatNumberCount(stockOverview.reservedUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Damaged</div>
                <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${(stockOverview.damagedUnits || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F172A] dark:text-white'}`}>
                  {formatNumberCount(stockOverview.damagedUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Low Stock</div>
                <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${(stockOverview.lowStockCount || 0) > 0 ? 'text-[#F97316] dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumberCount(stockOverview.lowStockCount)} SKUs
                </div>
              </div>
            </div>

            {stockOverview.lowStockItems.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#F97316] dark:text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>SKUs Below Reorder Threshold</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl">
                  {stockOverview.lowStockItems.slice(0, 4).map((item) => (
                    <div key={`${item.skuId}-${item.warehouseName}`} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0F172A] dark:text-white truncate">{item.skuName}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {item.skuCode} · {item.warehouseName}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{item.availableUnits}</span>
                        <span className="text-slate-400 dark:text-slate-500"> / min {item.reorderLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                All active warehouse SKUs are above reorder levels.
              </div>
            )}
          </div>
        )}
      </section>

      {/* EXPENSE SUMMARY PANEL */}
      <section className="h-full rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/70">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#F97316] dark:text-orange-400" />
              <span>Expense Summary</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dispatch freight, bility charges &amp; logged field visit expenses · {dateRangeLabel}
            </p>
          </div>
          {expenseSummary.hasData && (
            <span className="text-xs font-mono font-bold tabular-nums text-[#F97316] dark:text-orange-400 shrink-0">
              {formatCurrencyPKR(expenseSummary.totalExpenses)}
            </span>
          )}
        </div>

        {!expenseSummary.hasData ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700">
            <div className="text-sm font-mono font-bold text-slate-500 dark:text-slate-400">No Data</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No dispatch freight charges or field visit expense records logged in this date range.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Dispatch Freight</div>
                <div className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.dispatchFreightTotal)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Bilty / Other</div>
                <div className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.dispatchOtherTotal)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">Field Visit Exp</div>
                <div className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.fieldVisitExpensesTotal)}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl">
              {expenseSummary.items.slice(0, 4).map((item) => (
                <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A] dark:text-white truncate">{item.reference}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.date} · {item.subtitle}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-[#F97316] dark:text-orange-400 shrink-0">
                    {formatCurrencyPKR(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
