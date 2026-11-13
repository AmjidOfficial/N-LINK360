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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* STOCK OVERVIEW PANEL */}
      <section className="rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#0E1A14] p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Stock Overview</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-emerald-200/65 mt-0.5">
              Available = Physical On Hand &minus; Reserved Stock
            </p>
          </div>
          {onOpenInventory && (
            <button
              type="button"
              onClick={onOpenInventory}
              className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-800/70 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 shrink-0 cursor-pointer"
            >
              <span>Warehouse</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!stockOverview.hasData ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-emerald-900/50">
            <div className="text-sm font-mono font-bold text-slate-500 dark:text-emerald-200/60">No Data</div>
            <p className="text-xs text-slate-500 dark:text-emerald-200/50 mt-1">
              Warehouse inventory balances are not loaded for this view.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Available</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatNumberCount(stockOverview.availableUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Reserved</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatNumberCount(stockOverview.reservedUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Damaged</div>
                <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${(stockOverview.damagedUnits || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {formatNumberCount(stockOverview.damagedUnits)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Low Stock</div>
                <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${(stockOverview.lowStockCount || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumberCount(stockOverview.lowStockCount)} SKUs
                </div>
              </div>
            </div>

            {stockOverview.lowStockItems.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>SKUs Below Reorder Threshold</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-emerald-900/40 border border-slate-100 dark:border-emerald-900/40 rounded-xl">
                  {stockOverview.lowStockItems.slice(0, 4).map((item) => (
                    <div key={`${item.skuId}-${item.warehouseName}`} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{item.skuName}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-emerald-200/60">
                          {item.skuCode} · {item.warehouseName}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{item.availableUnits}</span>
                        <span className="text-slate-400 dark:text-emerald-200/50"> / min {item.reorderLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-700 dark:text-emerald-300/80 font-medium">
                All active warehouse SKUs are above reorder levels.
              </div>
            )}
          </div>
        )}
      </section>

      {/* EXPENSE SUMMARY PANEL */}
      <section className="rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#0E1A14] p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Expense Summary</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-emerald-200/65 mt-0.5">
              Dispatch freight, bility charges & logged field visit expenses · {dateRangeLabel}
            </p>
          </div>
          {expenseSummary.hasData && (
            <span className="text-xs font-mono font-bold tabular-nums text-amber-700 dark:text-amber-300 shrink-0">
              {formatCurrencyPKR(expenseSummary.totalExpenses)}
            </span>
          )}
        </div>

        {!expenseSummary.hasData ? (
          <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-emerald-900/50">
            <div className="text-sm font-mono font-bold text-slate-500 dark:text-emerald-200/60">No Data</div>
            <p className="text-xs text-slate-500 dark:text-emerald-200/50 mt-1 max-w-sm mx-auto">
              No dispatch freight charges or field visit expense records logged in this date range.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Dispatch Freight</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.dispatchFreightTotal)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Bilty / Other</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.dispatchOtherTotal)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#13241C] border border-slate-200/70 dark:border-emerald-900/50 p-3">
                <div className="text-[11px] font-mono uppercase text-slate-500 dark:text-emerald-300/65">Field Visit Exp</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatCurrencyPKR(expenseSummary.fieldVisitExpensesTotal)}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-emerald-900/40 border border-slate-100 dark:border-emerald-900/40 rounded-xl">
              {expenseSummary.items.slice(0, 4).map((item) => (
                <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{item.reference}</div>
                    <div className="text-[11px] text-slate-500 dark:text-emerald-200/60 truncate">
                      {item.date} · {item.subtitle}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-amber-300 shrink-0">
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
