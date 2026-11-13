import React from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { KpiMetricValue } from '../../../lib/dashboard';

export interface KPICardProps {
  metric: KpiMetricValue;
  onSelect?: (metric: KpiMetricValue) => void;
  compact?: boolean;
}

const TONE_ACCENT: Record<KpiMetricValue['statusTone'], string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400',
  amber: 'text-amber-700 dark:text-amber-400',
  rose: 'text-rose-700 dark:text-rose-400',
  neutral: 'text-slate-700 dark:text-emerald-200',
};

export const KPICard: React.FC<KPICardProps> = ({ metric, onSelect, compact = false }) => {
  const hasDelta = metric.deltaPercent !== null && metric.deltaPercent !== undefined;
  const deltaPositive = (metric.deltaPercent || 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(metric)}
      className={`group w-full text-left rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#111E17] hover:border-emerald-500/70 dark:hover:border-emerald-500/60 transition-colors cursor-pointer min-h-[44px] ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-emerald-300/75 truncate">
          {compact ? metric.shortLabel : metric.label}
        </span>
        <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-400 dark:text-emerald-500/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors" />
      </div>

      <div className={`mt-2 font-mono tabular-nums font-bold tracking-tight ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} ${
        metric.isAvailable ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
      }`}>
        {metric.formattedValue}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-emerald-200/60">
        <span className="truncate">{metric.sourceNote}</span>

        {hasDelta ? (
          <span
            className={`inline-flex items-center gap-0.5 font-mono tabular-nums font-semibold shrink-0 ${
              deltaPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {deltaPositive ? '+' : ''}
            {metric.deltaPercent}%
          </span>
        ) : (
          <span className={`font-mono tabular-nums font-medium shrink-0 ${TONE_ACCENT[metric.statusTone]}`}>
            {metric.drillDownCount} {metric.drillDownCount === 1 ? 'record' : 'records'}
          </span>
        )}
      </div>
    </button>
  );
};
