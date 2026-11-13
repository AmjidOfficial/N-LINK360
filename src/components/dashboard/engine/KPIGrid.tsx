import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { KpiMetricId, KpiMetricValue, RoleDashboardConfig } from '../../../lib/dashboard';
import { KPICard } from './KPICard';

export interface KPIGridProps {
  config: RoleDashboardConfig;
  kpis: Record<KpiMetricId, KpiMetricValue>;
  onSelectKpi?: (metric: KpiMetricValue) => void;
  isLoading?: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  config,
  kpis,
  onSelectKpi,
  isLoading = false,
}) => {
  const [showAllMobile, setShowAllMobile] = useState(false);

  const visibleMetrics = config.allowedKpis
    .map((id) => kpis[id])
    .filter((m): m is KpiMetricValue => Boolean(m));

  const primaryMobileSet = new Set(config.mobilePrimaryKpis);
  const mobileMetrics = showAllMobile
    ? visibleMetrics
    : visibleMetrics.filter((m) => primaryMobileSet.has(m.id)).slice(0, 6);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-busy="true">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl border border-slate-200 dark:border-emerald-900/40 bg-slate-100 dark:bg-[#111E17] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (visibleMetrics.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-[#111E17] p-6 text-center text-sm text-slate-500 dark:text-emerald-300/70">
        No KPI cards are enabled for this role configuration.
      </div>
    );
  }

  const hiddenCount = Math.max(0, visibleMetrics.length - mobileMetrics.length);

  return (
    <div className="space-y-3">
      {/* Mobile 2-Column Priority Grid (shows 4-6 key KPIs + View All toggle) */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {mobileMetrics.map((metric) => (
          <KPICard key={metric.id} metric={metric} onSelect={onSelectKpi} compact />
        ))}
      </div>

      {visibleMetrics.length > config.mobilePrimaryKpis.length && (
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setShowAllMobile((v) => !v)}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-emerald-800/70 bg-white dark:bg-[#111E17] px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {showAllMobile ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Show Priority KPIs</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>View All KPIs ({hiddenCount} more)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tablet & Desktop Multi-Column Grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMetrics.map((metric) => (
          <KPICard key={metric.id} metric={metric} onSelect={onSelectKpi} />
        ))}
      </div>
    </div>
  );
};
