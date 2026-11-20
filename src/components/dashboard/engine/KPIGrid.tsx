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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch" aria-busy="true">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-full min-h-[116px] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-slate-100 dark:bg-[#1E293B] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (visibleMetrics.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No KPI cards are enabled for this role configuration.
      </div>
    );
  }

  const hiddenCount = Math.max(0, visibleMetrics.length - mobileMetrics.length);

  return (
    <div className="space-y-3">
      {/* Mobile 2-Column Priority Grid (shows 4-6 key KPIs + View All toggle) */}
      <div className="grid grid-cols-2 gap-3 sm:hidden items-stretch">
        {mobileMetrics.map((metric) => (
          <KPICard key={metric.id} metric={metric} onSelect={onSelectKpi} compact />
        ))}
      </div>

      {visibleMetrics.length > config.mobilePrimaryKpis.length && (
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setShowAllMobile((v) => !v)}
            className="btn-outline w-full min-h-[44px] text-[#3B82F6] dark:text-blue-400"
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
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
        {visibleMetrics.map((metric) => (
          <KPICard key={metric.id} metric={metric} onSelect={onSelectKpi} />
        ))}
      </div>
    </div>
  );
};
