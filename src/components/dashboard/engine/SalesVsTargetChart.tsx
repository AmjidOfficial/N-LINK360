/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Responsive Sales vs Target Line Chart
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Target, Award, TrendingUp } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type { DashboardTrendPoint, DashboardDataset } from '../../../lib/dashboard';

export interface SalesVsTargetChartProps {
  trendSeries: DashboardTrendPoint[];
  dataset: DashboardDataset;
  dateRangeLabel?: string;
}

export const SalesVsTargetChart: React.FC<SalesVsTargetChartProps> = ({
  trendSeries,
  dataset,
  dateRangeLabel = 'Current Month',
}) => {
  const chartData = useMemo(() => {
    const totalTarget = dataset.targets?.reduce((sum, t) => sum + (t.targetValue || 500000), 0) || 3500000;
    const dailyTarget = Math.round(totalTarget / Math.max(1, trendSeries.length || 30));

    return trendSeries.map((pt) => ({
      date: pt.label,
      sales: pt.sales,
      target: dailyTarget,
    }));
  }, [trendSeries, dataset]);

  const totalSales = useMemo(() => chartData.reduce((s, d) => s + d.sales, 0), [chartData]);
  const cumulativeTarget = useMemo(() => chartData.reduce((s, d) => s + d.target, 0), [chartData]);
  const achievementRate = cumulativeTarget > 0 ? Math.round((totalSales / cumulativeTarget) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
              <span>Current Month Sales vs. Targets</span>
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {achievementRate}% Achieved
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Actual posted sales trajectory compared with monthly targets ({dateRangeLabel})
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#16A34A] inline-block" />
            <span>Actual Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#EA580C] inline-block" />
            <span>Target Trajectory</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total Sales</span>
          <span className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white">
            {formatCurrencyPKR(totalSales)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Monthly Target</span>
          <span className="text-sm font-black font-mono tabular-nums text-[#EA580C] dark:text-orange-400">
            {formatCurrencyPKR(cumulativeTarget)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Achievement Ratio</span>
          <span className="text-sm font-black font-mono tabular-nums text-[#16A34A] dark:text-emerald-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {achievementRate}%
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No sales trend data available for target comparison.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : String(val))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
                formatter={(value: any, name: string) => [
                  formatCurrencyPKR(Number(value) || 0),
                  name === 'sales' ? 'Actual Sales' : 'Monthly Target',
                ]}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#16A34A"
                strokeWidth={3}
                dot={{ r: 3, fill: '#16A34A' }}
                activeDot={{ r: 6 }}
                name="sales"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#EA580C"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                name="target"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
