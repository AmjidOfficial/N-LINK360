/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - 30-Day Daily Sales Trends & Recovery Progress Section
 * Full-width Recharts visualization tracking daily posted sales (net of credit notes),
 * confirmed recoveries, cumulative realization trajectory, and daily net collection variance.
 * Branded in National Light Emerald Green (#16A34A) & Solar Orange (#EA580C).
 */

import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarRange, TrendingUp } from 'lucide-react';
import { formatCurrencyPKR, formatPercent } from '../../../lib/dashboard';
import type {
  DashboardThirtyDaySummary,
  DashboardThirtyDayTrendPoint,
} from '../../../lib/dashboard';

export interface ThirtyDaySalesRecoverySectionProps {
  series: DashboardThirtyDayTrendPoint[];
  summary: DashboardThirtyDaySummary;
  scopeTitle?: string;
}

type TrendViewMode = 'DAILY_COMBO' | 'CUMULATIVE' | 'NET_GAP';

interface SeriesVisibility {
  sales: boolean;
  recovery: boolean;
  progress: boolean;
}

function formatAxisCompactPKR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
}

const CustomThirtyDayTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: DashboardThirtyDayTrendPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;
  const netSurplus = point.recovery - point.sales;

  return (
    <div className="rounded-xl border border-slate-700/90 bg-[#0F172A] px-3.5 py-3 text-xs text-slate-100 shadow-xl min-w-[235px]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-700/80 pb-2 mb-2">
        <span className="font-bold text-white">{point.dayLabel}</span>
        <span className="font-mono tabular-nums text-[11px] text-slate-400">{point.date}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-xs bg-[#16A34A] inline-block" />
            Daily Posted Sales
          </span>
          <span className="font-mono tabular-nums font-bold text-emerald-400">
            {formatCurrencyPKR(point.sales)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-xs bg-[#EA580C] inline-block" />
            Confirmed Recovery
          </span>
          <span className="font-mono tabular-nums font-bold text-orange-400">
            {formatCurrencyPKR(point.recovery)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Daily Net Balance</span>
          <span
            className={`font-mono tabular-nums font-semibold ${
              netSurplus >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {netSurplus >= 0 ? '+' : ''}
            {formatCurrencyPKR(netSurplus)}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">30D Cumulative Sales</span>
          <span className="font-mono tabular-nums font-semibold text-slate-200">
            {formatCurrencyPKR(point.cumulativeSales)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">30D Cumulative Recovery</span>
          <span className="font-mono tabular-nums font-semibold text-slate-200">
            {formatCurrencyPKR(point.cumulativeRecovery)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
            <span className="w-2 h-2 rounded-xs bg-[#F59E0B] inline-block" />
            Cumulative Progress
          </span>
          <span className="font-mono tabular-nums font-bold text-amber-300">
            {point.cumulativeRecoveryPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const ThirtyDaySalesRecoverySection: React.FC<ThirtyDaySalesRecoverySectionProps> = ({
  series,
  summary,
  scopeTitle,
}) => {
  const [viewMode, setViewMode] = useState<TrendViewMode>('DAILY_COMBO');
  const [visibleSeries, setVisibleSeries] = useState<SeriesVisibility>({
    sales: true,
    recovery: true,
    progress: true,
  });

  const hasAnyActivity = useMemo(
    () => series.some((pt) => pt.sales > 0 || pt.recovery > 0),
    [series]
  );

  const toggleSeries = (key: keyof SeriesVisibility) => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.sales && !next.recovery && !next.progress) {
        return prev;
      }
      return next;
    });
  };

  const progressToneClass =
    summary.overallRecoveryPct >= summary.targetRecoveryPct
      ? 'text-[#16A34A] dark:text-emerald-400'
      : summary.overallRecoveryPct >= 60
      ? 'text-[#D97706] dark:text-amber-400'
      : 'text-[#EA580C] dark:text-orange-400';

  const progressBarFillClass =
    summary.overallRecoveryPct >= summary.targetRecoveryPct
      ? 'bg-[#16A34A]'
      : summary.overallRecoveryPct >= 60
      ? 'bg-[#F59E0B]'
      : 'bg-[#EA580C]';

  const clampedProgressWidth = Math.max(0, Math.min(100, summary.overallRecoveryPct));

  return (
    <section
      aria-label="30-Day Daily Sales Trends and Recovery Progress"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-6 space-y-5"
    >
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              30-Day Daily Sales Trends &amp; Recovery Progress
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono tabular-nums">
                {summary.startDate} to {summary.endDate}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Asia/Karachi PKT Daily Ledger</span>
            {scopeTitle && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{scopeTitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Single-line Segmented Controls */}
        <div
          role="tablist"
          aria-label="30-day chart display mode"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 self-start lg:self-auto overflow-x-auto max-w-full"
        >
          {(
            [
              { id: 'DAILY_COMBO', label: 'Daily + Progress %' },
              { id: 'CUMULATIVE', label: 'Cumulative 30D' },
              { id: 'NET_GAP', label: 'Daily Net Gap' },
            ] as Array<{ id: TrendViewMode; label: string }>
          ).map((tab) => {
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Column Summary Metric Strip (Tabular Figures, Hairline Separated) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1 pb-2 border-y border-[#E2E8F0] dark:border-slate-700/70">
        <div className="py-2 pr-2">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            30-Day Posted Sales
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono tabular-nums text-[#16A34A] dark:text-emerald-400 truncate">
            {formatCurrencyPKR(summary.totalSales)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {summary.activeSalesDays} active billing {summary.activeSalesDays === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="py-2 pr-2 lg:border-l lg:border-[#E2E8F0] dark:lg:border-slate-700/70 lg:pl-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            30-Day Confirmed Recovery
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono tabular-nums text-[#EA580C] dark:text-orange-400 truncate">
            {formatCurrencyPKR(summary.totalRecovery)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {summary.activeRecoveryDays} collection {summary.activeRecoveryDays === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="py-2 pr-2 lg:border-l lg:border-[#E2E8F0] dark:lg:border-slate-700/70 lg:pl-4">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>Recovery Realization</span>
            <span className="font-mono tabular-nums">Target {summary.targetRecoveryPct}%</span>
          </div>
          <div className={`mt-1 text-base sm:text-lg font-bold font-mono tabular-nums ${progressToneClass}`}>
            {formatPercent(summary.overallRecoveryPct)}
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarFillClass}`}
              style={{ width: `${clampedProgressWidth}%` }}
            />
          </div>
        </div>

        <div className="py-2 lg:border-l lg:border-[#E2E8F0] dark:lg:border-slate-700/70 lg:pl-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Peak Billing / Collection
          </div>
          <div className="mt-1 text-xs sm:text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {summary.peakSalesAmount > 0
              ? `${summary.peakSalesLabel} · ${formatAxisCompactPKR(summary.peakSalesAmount)}`
              : 'No billing peak'}
          </div>
          <div className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
            {summary.peakRecoveryAmount > 0
              ? `Rec Peak: ${summary.peakRecoveryLabel} · ${formatAxisCompactPKR(summary.peakRecoveryAmount)}`
              : 'No collection peak'}
          </div>
        </div>
      </div>

      {/* Interactive Series Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {viewMode === 'NET_GAP' ? (
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A] inline-block" />
              Recovery Surplus (Recovery &ge; Sales)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C] inline-block" />
              Credit Exposure Added (Sales &gt; Recovery)
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSeries('sales')}
              aria-pressed={visibleSeries.sales}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                visibleSeries.sales
                  ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-300'
                  : 'border-[#E2E8F0] dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A] inline-block" />
              {viewMode === 'CUMULATIVE' ? 'Cumulative Sales' : 'Posted Sales'}
            </button>

            <button
              type="button"
              onClick={() => toggleSeries('recovery')}
              aria-pressed={visibleSeries.recovery}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                visibleSeries.recovery
                  ? 'border-orange-200 dark:border-orange-800/70 bg-orange-50/70 dark:bg-orange-950/40 text-[#C2410C] dark:text-orange-300'
                  : 'border-[#E2E8F0] dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C] inline-block" />
              {viewMode === 'CUMULATIVE' ? 'Cumulative Recovery' : 'Confirmed Recovery'}
            </button>

            {viewMode === 'DAILY_COMBO' && (
              <button
                type="button"
                onClick={() => toggleSeries('progress')}
                aria-pressed={visibleSeries.progress}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  visibleSeries.progress
                    ? 'border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-[#E2E8F0] dark:border-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                <span className="w-3 h-0.5 bg-[#D97706] inline-block" />
                Cumulative Progress %
              </button>
            )}
          </div>
        )}

        <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
          30D Net Gap:{' '}
          <strong
            className={
              summary.netGap <= 0
                ? 'text-[#16A34A] dark:text-emerald-400'
                : 'text-[#EA580C] dark:text-orange-400'
            }
          >
            {summary.netGap > 0 ? '+' : ''}
            {formatCurrencyPKR(summary.netGap)}
          </strong>
        </div>
      </div>

      {/* Recharts Canvas or Empty State */}
      {!hasAnyActivity ? (
        <div className="h-72 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
            No posted sales or confirmed recoveries recorded in the last 30 days
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Once invoices are posted or field payments are verified within this scope, daily billing trends and cumulative recovery progress will plot automatically.
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'DAILY_COMBO' ? (
              <ComposedChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nlinkSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.18)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortDate"
                  interval={4}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="pkr"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisCompactPKR}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, (dataMax: number) => Math.max(100, Math.ceil((dataMax || 100) / 10) * 10)]}
                  tick={{ fontSize: 11, fill: '#D97706' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v))}%`}
                />
                <Tooltip content={<CustomThirtyDayTooltip />} />
                {visibleSeries.progress && (
                  <ReferenceLine
                    yAxisId="pct"
                    y={summary.targetRecoveryPct}
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    strokeOpacity={0.55}
                  />
                )}
                {visibleSeries.sales && (
                  <Area
                    yAxisId="pkr"
                    type="monotone"
                    dataKey="sales"
                    name="Posted Sales"
                    stroke="#16A34A"
                    strokeWidth={2.2}
                    fill="url(#nlinkSalesAreaGrad)"
                    activeDot={{ r: 4, fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
                {visibleSeries.recovery && (
                  <Bar
                    yAxisId="pkr"
                    dataKey="recovery"
                    name="Confirmed Recovery"
                    fill="#EA580C"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={14}
                  />
                )}
                {visibleSeries.progress && (
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="cumulativeRecoveryPct"
                    name="Cumulative Progress %"
                    stroke="#D97706"
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
              </ComposedChart>
            ) : viewMode === 'CUMULATIVE' ? (
              <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nlinkCumSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="nlinkCumRecGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.18)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortDate"
                  interval={4}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisCompactPKR}
                />
                <Tooltip content={<CustomThirtyDayTooltip />} />
                {visibleSeries.sales && (
                  <Area
                    type="monotone"
                    dataKey="cumulativeSales"
                    name="Cumulative Sales"
                    stroke="#16A34A"
                    strokeWidth={2.4}
                    fill="url(#nlinkCumSalesGrad)"
                    activeDot={{ r: 4, fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
                {visibleSeries.recovery && (
                  <Area
                    type="monotone"
                    dataKey="cumulativeRecovery"
                    name="Cumulative Recovery"
                    stroke="#EA580C"
                    strokeWidth={2.4}
                    fill="url(#nlinkCumRecGrad)"
                    activeDot={{ r: 4, fill: '#EA580C', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            ) : (
              <BarChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.18)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortDate"
                  interval={4}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxisCompactPKR}
                />
                <ReferenceLine y={0} stroke="#94A3B8" strokeOpacity={0.5} />
                <Tooltip content={<CustomThirtyDayTooltip />} />
                <Bar dataKey="netGap" name="Daily Net Gap (Sales - Recovery)" maxBarSize={16}>
                  {series.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={entry.netGap <= 0 ? '#16A34A' : '#EA580C'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
