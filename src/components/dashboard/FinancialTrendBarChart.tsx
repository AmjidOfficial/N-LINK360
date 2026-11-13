/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Financial Trend Dual-Bar Chart
 * Computes real monthly Sales vs Confirmed Recoveries from database records.
 */

import React, { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { SalesOrder, Recovery } from '../../types';

export interface TrendDataPoint {
  month: string;
  sales: number;
  recovery: number;
}

export interface FinancialTrendBarChartProps {
  data?: TrendDataPoint[];
  orders?: SalesOrder[];
  recoveries?: Recovery[];
  className?: string;
}

export const FinancialTrendBarChart: React.FC<FinancialTrendBarChartProps> = ({
  data,
  orders = [],
  recoveries = [],
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const computedData: TrendDataPoint[] = useMemo(() => {
    if (data && data.length > 0) return data;

    // Build last 6 calendar months from real orders & recoveries
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label });
    }

    return months.map(({ key, label }) => {
      const sales = orders
        .filter((o) => o.status !== 'REJECTED' && (o.orderDate || o.createdAt || '').slice(0, 7) === key)
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const recovery = recoveries
        .filter((r) => r.status !== 'REJECTED' && (r.recordedAt || r.createdAt || '').slice(0, 7) === key)
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      return { month: label, sales, recovery };
    });
  }, [data, orders, recoveries]);

  const hasAnyActivity = computedData.some((d) => d.sales > 0 || d.recovery > 0);
  const maxVal = Math.max(...computedData.flatMap((d) => [d.sales, d.recovery]), 1);

  return (
    <div
      className={`rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 ${className}`}
    >
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
            Sales &amp; Recovery Realization Trend
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            6-month realization comparison (PKR) &middot; Supabase Authoritative
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0B132B] dark:bg-[#0D9488]" />
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">Recovery</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {!hasAnyActivity ? (
        <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-1">
          <BarChart3 className="w-7 h-7 opacity-40" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">No 6-Month Transaction History Yet</p>
          <p className="text-[11px]">Monthly bars populate automatically as sales orders and recoveries are recorded.</p>
        </div>
      ) : (
        <div className="pt-2">
          <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 px-2">
            {computedData.map((item, idx) => {
              const salesHeightPct = item.sales > 0 ? Math.max(4, Math.min(100, Math.round((item.sales / maxVal) * 100))) : 0;
              const recoveryHeightPct = item.recovery > 0 ? Math.max(4, Math.min(100, Math.round((item.recovery / maxVal) * 100))) : 0;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                >
                  {isHovered && (
                    <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 whitespace-nowrap pointer-events-none">
                      <div>Sales: Rs. {item.sales.toLocaleString()}</div>
                      <div className="text-emerald-300">Rec: Rs. {item.recovery.toLocaleString()}</div>
                    </div>
                  )}

                  <div className="w-full max-w-[44px] h-full flex items-end justify-center gap-1.5">
                    <div
                      className="flex-1 bg-[#0B132B] dark:bg-[#0D9488] hover:bg-[#0D9488] rounded-t transition-all duration-300"
                      style={{ height: `${salesHeightPct}%` }}
                      title={`Sales: Rs. ${item.sales.toLocaleString()}`}
                    />
                    <div
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all duration-300"
                      style={{ height: `${recoveryHeightPct}%` }}
                      title={`Recovery: Rs. ${item.recovery.toLocaleString()}`}
                    />
                  </div>

                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
