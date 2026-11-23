import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  Receipt,
  Package,
  AlertTriangle,
} from 'lucide-react';
import type { KpiMetricValue } from '../../../lib/dashboard';

export interface KPICardProps {
  metric: KpiMetricValue;
  onSelect?: (metric: KpiMetricValue) => void;
  compact?: boolean;
  index?: number;
}

const TONE_ACCENT: Record<KpiMetricValue['statusTone'], string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-[#EA580C] dark:text-orange-400',
  rose: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-600 dark:text-slate-300',
};

const TONE_ICON_BOX: Record<KpiMetricValue['statusTone'], string> = {
  emerald: 'bg-emerald-50 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-400',
  amber: 'bg-orange-50 text-[#EA580C] dark:bg-orange-950/50 dark:text-[#F97316]',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
  neutral: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
};

function resolveMetricIcon(id: string) {
  const key = id.toUpperCase();
  if (key.includes('RECOVERY') || key.includes('CASH') || key.includes('COLLECTION')) return Receipt;
  if (key.includes('RECEIVABLE') || key.includes('BALANCE') || key.includes('CREDIT')) return Wallet;
  if (key.includes('STOCK') || key.includes('INVENTORY') || key.includes('PACK')) return Package;
  if (key.includes('PENDING') || key.includes('OVERDUE') || key.includes('ALERT')) return AlertTriangle;
  if (key.includes('ORDER') || key.includes('SALES') || key.includes('REVENUE')) return ShoppingBag;
  return TrendingUp;
}

export const KPICard: React.FC<KPICardProps> = ({ metric, onSelect, compact = false, index = 0 }) => {
  const hasDelta = metric.deltaPercent !== null && metric.deltaPercent !== undefined;
  const deltaPositive = (metric.deltaPercent || 0) >= 0;
  const Icon = resolveMetricIcon(metric.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="h-full w-full"
    >
      <button
        type="button"
        onClick={() => onSelect?.(metric)}
        className={`group h-full w-full flex flex-col justify-between text-left rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] hover:border-[#16A34A]/80 dark:hover:border-emerald-500/70 transition-colors cursor-pointer min-h-[44px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
          compact ? 'p-3.5' : 'p-4 sm:p-5'
        }`}
      >
        <div className="min-w-0 w-full flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TONE_ICON_BOX[metric.statusTone]}`}
          >
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {compact ? metric.shortLabel : metric.label}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-[#16A34A] dark:group-hover:text-emerald-400 transition-colors" />
            </div>

            <div
              className={`mt-1.5 font-mono tabular-nums font-bold tracking-tight truncate ${
                compact ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'
              } ${
                metric.isAvailable ? 'text-[#0F172A] dark:text-[#F8FAFC]' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {metric.formattedValue}
            </div>
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
    </motion.div>
  );
};
