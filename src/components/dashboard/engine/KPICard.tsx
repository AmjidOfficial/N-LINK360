import React from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { KpiMetricValue } from '../../../lib/dashboard';

export interface KPICardProps {
  metric: KpiMetricValue;
  onSelect?: (metric: KpiMetricValue) => void;
  compact?: boolean;
}

const TONE_ACCENT: Record<KpiMetricValue['statusTone'], string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-[#F97316] dark:text-orange-400',
  rose: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-600 dark:text-slate-300',
};

export const KPICard: React.FC<KPICardProps> = ({ metric, onSelect, compact = false }) => {
  const hasDelta = metric.deltaPercent !== null && metric.deltaPercent !== undefined;
  const deltaPositive = (metric.deltaPercent || 0) >= 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(metric)}
      className={`group h-full w-full flex flex-col justify-between text-left rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] hover:border-[#3B82F6]/80 dark:hover:border-[#3B82F6]/70 transition-colors cursor-pointer min-h-[44px] ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="min-w-0 w-full">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {compact ? metric.shortLabel : metric.label}
          </span>
          <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#3B82F6] dark:group-hover:text-blue-400 transition-colors" />
        </div>

        <div
          className={`mt-2 font-mono tabular-nums font-bold tracking-tight truncate ${
            compact ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'
          } ${
            metric.isAvailable ? 'text-[#0F172A] dark:text-[#F8FAFC]' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {metric.formattedValue}
        </div>
      </div>

      <div className="mt-auto pt-3 w-full flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate min-w-0">{metric.sourceNote}</span>

        {hasDelta ? (
          <span
            className={`inline-flex items-center gap-0.5 font-mono tabular-nums font-semibold shrink-0 ${
              deltaPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
