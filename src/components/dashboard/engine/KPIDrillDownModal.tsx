import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type { DrillDownRecord, KpiMetricValue } from '../../../lib/dashboard';

export interface KPIDrillDownModalProps {
  metric: KpiMetricValue | null;
  records: DrillDownRecord[];
  onClose: () => void;
  onSelectCustomer?: (customerId: string) => void;
}

export const KPIDrillDownModal: React.FC<KPIDrillDownModalProps> = ({
  metric,
  records,
  onClose,
  onSelectCustomer,
}) => {
  if (!metric) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kpi-drilldown-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#0E1A14] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab bar */}
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-slate-300 dark:bg-emerald-800 mx-auto mt-3 mb-1" />

        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-emerald-900/50">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              KPI Drill-Down · {metric.sourceNote}
            </div>
            <h2 id="kpi-drilldown-title" className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white truncate">
              {metric.label}
            </h2>
            <div className="mt-1 font-mono tabular-nums text-base font-bold text-emerald-700 dark:text-emerald-300">
              {metric.formattedValue}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drill-down"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/70 text-slate-600 dark:text-emerald-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-emerald-900/40 px-5">
          {records.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-emerald-200/70">
              No underlying records match this metric within the active scope and date range.
            </div>
          ) : (
            records.map((rec) => (
              <div
                key={`${rec.id}-${rec.reference}`}
                className="py-3.5 flex items-center justify-between gap-3 min-h-[56px]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {rec.title}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-emerald-200/70 font-mono truncate">
                    {rec.reference} · {rec.subtitle || 'Record'} · {rec.date} · {rec.status}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-emerald-300">
                    {rec.amount !== undefined
                      ? formatCurrencyPKR(rec.amount)
                      : rec.quantity !== undefined
                      ? `${rec.quantity.toLocaleString('en-PK')} units`
                      : '—'}
                  </div>

                  {rec.customerId && onSelectCustomer && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(rec.customerId!)}
                      title="Open party ledger"
                      className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
