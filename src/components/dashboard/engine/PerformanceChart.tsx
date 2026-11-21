import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type { DashboardTrendPoint, HierarchyPerformanceRow } from '../../../lib/dashboard';

export interface PerformanceChartProps {
  title?: string;
  subtitle?: string;
  trendSeries: DashboardTrendPoint[];
  hierarchyBreakdown?: HierarchyPerformanceRow[];
  territoryBreakdown?: HierarchyPerformanceRow[];
  mode?: 'TREND' | 'HIERARCHY' | 'TERRITORY_RANKING';
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title = 'Posted Sales vs Confirmed Recovery',
  subtitle = '7-day Pakistan Standard Time (PKT) performance comparison',
  trendSeries,
  hierarchyBreakdown = [],
  territoryBreakdown = [],
  mode = 'TREND',
}) => {
  const chartData =
    mode === 'TERRITORY_RANKING'
      ? territoryBreakdown.slice(0, 8).map((row) => ({
          label: row.name,
          sales: row.postedSales,
          recovery: row.confirmedRecovery,
        }))
      : mode === 'HIERARCHY'
      ? hierarchyBreakdown.slice(0, 8).map((row) => ({
          label: row.name,
          sales: row.postedSales,
          recovery: row.confirmedRecovery,
        }))
      : trendSeries;

  const hasAnyValues = chartData.some((d) => d.sales > 0 || d.recovery > 0);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A] inline-block" />
            Posted Sales
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C] inline-block" />
            Confirmed Recovery
          </span>
        </div>
      </div>

      {!hasAnyValues ? (
        <div className="h-56 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700 text-center px-4">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
            No posted invoices or confirmed recoveries in this period
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pending bookings and unverified slips appear in workflow queues until confirmed.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
              <XAxis
                dataKey="label"
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
                cursor={{ fill: 'rgba(22, 163, 74, 0.08)' }}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
                formatter={(value: any, name: string) => [
                  formatCurrencyPKR(Number(value) || 0),
                  name === 'sales' ? 'Posted Sales' : 'Confirmed Recovery',
                ]}
              />
              <Bar dataKey="sales" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="recovery" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
