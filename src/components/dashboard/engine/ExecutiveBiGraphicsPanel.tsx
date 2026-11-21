/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Executive BI Graphics Panel
 * Semi-circular Target Gauges, Brand/SKU Mix Donut, Payment Channel Donut,
 * Top 10 Towns Bar Chart & Coordinator Achievement Leaderboard.
 * Branded in National Light Emerald Green (#16A34A) & Solar Orange (#EA580C).
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Award, Gauge, MapPin, PieChart as PieChartIcon, Users, Wallet } from 'lucide-react';
import { formatCurrencyPKR, formatNumberCount } from '../../../lib/dashboard';
import type {
  DashboardBiSummary,
  HierarchyPerformanceRow,
  TeamPerformanceRow,
} from '../../../lib/dashboard';

export interface ExecutiveBiGraphicsPanelProps {
  biSummary: DashboardBiSummary;
  teamBreakdown?: TeamPerformanceRow[];
  dateRangeLabel: string;
  onSelectCustomer?: (customerId: string) => void;
}

interface SpeedometerGaugeProps {
  title: string;
  subtitle: string;
  percent: number;
  primaryValue: string;
  targetLabel: string;
  accentColor: string;
  statusText: string;
  statusTone: 'green' | 'orange' | 'red';
}

const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  title,
  subtitle,
  percent,
  primaryValue,
  targetLabel,
  accentColor,
  statusText,
  statusTone,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 64;
  const cx = 90;
  const cy = 82;
  const arcLen = Math.PI * radius;
  const dashOffset = arcLen - (clamped / 100) * arcLen;

  // Needle angle: -180 deg (left, 0%) to 0 deg (right, 100%)
  const angleRad = Math.PI - (clamped / 100) * Math.PI;
  const needleLen = 50;
  const nx = cx + needleLen * Math.cos(angleRad);
  const ny = cy - needleLen * Math.sin(angleRad);

  const statusColorClass =
    statusTone === 'green'
      ? 'text-[#16A34A] dark:text-emerald-400'
      : statusTone === 'red'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-[#EA580C] dark:text-orange-400';

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-[11px] font-mono font-bold tabular-nums shrink-0 ${statusColorClass}`}>
          {statusText}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center my-2">
        <svg viewBox="0 0 180 102" className="w-full max-w-[210px] overflow-visible">
          {/* Background segmented arc track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Subtle segmented markers at 0%, 50%, 100% */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={accentColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          {/* Indicator Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="currentColor"
            className="text-[#0F172A] dark:text-white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill={accentColor} stroke="#FFFFFF" strokeWidth="1.5" />
          <text
            x={cx - radius}
            y={cy + 16}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
          >
            0%
          </text>
          <text
            x={cx}
            y={cy - radius - 8}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
          >
            50%
          </text>
          <text
            x={cx + radius}
            y={cy + 16}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
          >
            100%
          </text>
        </svg>

        <div className="text-center -mt-1">
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#0F172A] dark:text-white">
            {percent.toFixed(1)}%
          </div>
          <div className="text-xs font-mono tabular-nums font-bold text-[#16A34A] dark:text-emerald-400 mt-0.5">
            {primaryValue}
          </div>
        </div>
      </div>

      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
        <span>Benchmark</span>
        <span className="font-semibold text-[#0F172A] dark:text-slate-200 truncate max-w-[65%]">
          {targetLabel}
        </span>
      </div>
    </div>
  );
};

export const ExecutiveBiGraphicsPanel: React.FC<ExecutiveBiGraphicsPanelProps> = ({
  biSummary,
  teamBreakdown = [],
  dateRangeLabel,
  onSelectCustomer,
}) => {
  const [townMetric, setTownMetric] = useState<'SALES' | 'RECOVERY'>('SALES');
  const { gauges, brandSkuMix, paymentModeMix, topTowns } = biSummary;

  const townChartData = topTowns.slice(0, 8).map((t: HierarchyPerformanceRow) => ({
    name: t.name.length > 14 ? `${t.name.slice(0, 12)}..` : t.name,
    fullName: t.name,
    sales: t.postedSales,
    recovery: t.confirmedRecovery,
    dealers: t.activeDealers + t.activeDistributors,
    leadCustomerId: t.leadCustomerId,
  }));

  const topTeamRows = teamBreakdown.slice(0, 6);
  const maxTeamSales = Math.max(...topTeamRows.map((r) => r.postedSales), 1);

  return (
    <section aria-label="Executive Business Intelligence Graphics" className="space-y-5">
      {/* 1. Three Executive Speedometer Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <SpeedometerGauge
          title="Sales vs Target Attainment"
          subtitle={`Posted sales performance (${dateRangeLabel})`}
          percent={gauges.salesAchievementPct}
          primaryValue={formatCurrencyPKR(gauges.salesPosted)}
          targetLabel={`Target ${formatCurrencyPKR(gauges.salesTarget)}`}
          accentColor="#16A34A"
          statusText={gauges.salesAchievementPct >= 80 ? 'On Track' : gauges.salesAchievementPct >= 45 ? 'Building' : 'Behind'}
          statusTone={gauges.salesAchievementPct >= 80 ? 'green' : 'orange'}
        />

        <SpeedometerGauge
          title="Recovery Collection Efficiency"
          subtitle="Confirmed cash & bank receipts vs target"
          percent={gauges.recoveryEfficiencyPct}
          primaryValue={formatCurrencyPKR(gauges.recoveryCollected)}
          targetLabel={`Target ${formatCurrencyPKR(gauges.recoveryTarget)}`}
          accentColor="#EA580C"
          statusText={gauges.recoveryEfficiencyPct >= 75 ? 'Healthy Cash' : 'Follow-Up'}
          statusTone={gauges.recoveryEfficiencyPct >= 75 ? 'green' : 'orange'}
        />

        <SpeedometerGauge
          title="Credit Exposure & Outlet Reach"
          subtitle={`${formatNumberCount(gauges.billedDealersCount)} of ${formatNumberCount(gauges.activeDealersCount)} dealers billed`}
          percent={gauges.creditUtilizationPct}
          primaryValue={formatCurrencyPKR(gauges.totalReceivables)}
          targetLabel={`Limit ${formatCurrencyPKR(gauges.totalCreditLimit)}`}
          accentColor={gauges.creditUtilizationPct > 85 ? '#DC2626' : '#F59E0B'}
          statusText={gauges.creditUtilizationPct > 85 ? 'High Exposure' : 'Controlled'}
          statusTone={gauges.creditUtilizationPct > 85 ? 'red' : 'green'}
        />
      </div>

      {/* 2. Product Category / Brand Mix Donut + Payment Channel Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Brand / SKU Family Mix Donut */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                <span>Product Family &amp; SKU Mix</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revenue contribution across National Light product lines
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-[#16A34A] dark:text-emerald-400">
              {brandSkuMix.length} lines
            </span>
          </div>

          {brandSkuMix.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4 my-3">
              <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                No posted SKU volume in this period
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Approved invoices with product line items automatically populate this breakdown.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-3">
              <div className="sm:col-span-5 h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandSkuMix}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {brandSkuMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                      formatter={(val: any) => [formatCurrencyPKR(Number(val) || 0), 'Sales Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Net Sales</span>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                    {gauges.salesPosted >= 1000000
                      ? `${(gauges.salesPosted / 1000000).toFixed(2)}M`
                      : `${Math.round(gauges.salesPosted / 1000)}k`}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-7 space-y-2">
                {brandSkuMix.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 min-w-0 font-medium text-[#0F172A] dark:text-slate-200 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white shrink-0">
                        {item.sharePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, item.sharePct)}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="shrink-0">{formatCurrencyPKR(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recovery Payment Method Mix */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#EA580C] dark:text-orange-400" />
                <span>Recovery Payment Channels</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confirmed cash, online bank transfers &amp; instrument collections
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-[#EA580C] dark:text-orange-400">
              {formatCurrencyPKR(gauges.recoveryCollected)}
            </span>
          </div>

          {paymentModeMix.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4 my-3">
              <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                No confirmed recovery receipts in this period
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verified cash and bank transfer recoveries will render channel share graphics here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-3">
              <div className="sm:col-span-5 h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentModeMix}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {paymentModeMix.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                      formatter={(val: any) => [formatCurrencyPKR(Number(val) || 0), 'Collected']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Recovered</span>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#16A34A] dark:text-emerald-400">
                    {gauges.recoveryCollected >= 1000000
                      ? `${(gauges.recoveryCollected / 1000000).toFixed(2)}M`
                      : `${Math.round(gauges.recoveryCollected / 1000)}k`}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-7 space-y-2.5">
                {paymentModeMix.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#0F172A] dark:text-white truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-200">
                        {item.sharePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{item.count} receipts</span>
                      <span className="font-semibold text-[#0F172A] dark:text-white">
                        {formatCurrencyPKR(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Top Towns BI Chart & Coordinator Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Top Towns Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                <span>Top Performing Towns</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Market distribution ranking across active towns ({dateRangeLabel})
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTownMetric('SALES')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  townMetric === 'SALES'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Sales Volume
              </button>
              <button
                type="button"
                onClick={() => setTownMetric('RECOVERY')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  townMetric === 'RECOVERY'
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Recovery
              </button>
            </div>
          </div>

          {townChartData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4 my-3">
              <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                No town activity recorded in this period
              </div>
            </div>
          ) : (
            <div className="h-64 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={townChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(22, 163, 74, 0.08)' }}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                    formatter={(value: any) => [
                      formatCurrencyPKR(Number(value) || 0),
                      townMetric === 'SALES' ? 'Posted Sales' : 'Confirmed Recovery',
                    ]}
                  />
                  <Bar
                    dataKey={townMetric === 'SALES' ? 'sales' : 'recovery'}
                    fill={townMetric === 'SALES' ? '#16A34A' : '#EA580C'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Field Team / Sales Coordinator Contribution Leaderboard */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#EA580C] dark:text-orange-400" />
                <span>Sales Team Contribution</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Posted sales &amp; recovery share by officer
              </p>
            </div>
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {topTeamRows.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4 my-3">
              <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                No officer transactions in selected scope
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {topTeamRows.map((member, index) => {
                const barPct = Math.max(4, Math.min(100, Math.round((member.postedSales / maxTeamSales) * 100)));
                return (
                  <div key={member.salesUserId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                            index === 0
                              ? 'bg-[#EA580C] text-white'
                              : index === 1
                              ? 'bg-[#16A34A] text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-semibold text-[#0F172A] dark:text-white truncate">
                          {member.salesUserName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                          &middot; {member.territory}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white shrink-0">
                        {formatCurrencyPKR(member.postedSales)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${index === 0 ? 'bg-[#EA580C]' : 'bg-[#16A34A]'}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-[#16A34A] dark:text-emerald-400 shrink-0">
                        Rec {formatCurrencyPKR(member.confirmedRecovery)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {onSelectCustomer && topTowns[0]?.leadCustomerId && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Top Market: <strong className="text-[#0F172A] dark:text-white">{topTowns[0].name}</strong></span>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(topTowns[0].leadCustomerId!)}
                    className="font-semibold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Inspect Lead Dealer &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
