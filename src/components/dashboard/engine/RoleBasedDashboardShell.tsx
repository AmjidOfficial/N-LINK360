import React, { useEffect, useMemo, useState } from 'react';
import {
  computeDashboardMetrics,
  filterDashboardDatasetByScope,
  getKarachiDateRange,
  loadLocalRoleConfigOverrides,
  resolveRoleDashboardConfig,
  resolveUserDataScope,
  toKarachiDateIso,
  validateRequestedFilter,
} from '../../../lib/dashboard';
import { hasPermission } from '../../../lib/permissions';
import { fetchScopedDashboardSummary, saveRoleDashboardConfigOverride } from '../../../services/dashboardApi';
import type {
  AdminRoleConfigOverride,
  DashboardComputationResult,
  DashboardDataset,
  DashboardDatePreset,
  DashboardHierarchyFilter,
  KpiMetricValue,
  QuickActionId,
} from '../../../lib/dashboard';
import type { NLinkUser } from '../../../data/nlink-users-team';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFilters } from './DashboardFilters';
import { KPIGrid } from './KPIGrid';
import { KPIDrillDownModal } from './KPIDrillDownModal';
import { PerformanceChart } from './PerformanceChart';
import { PendingActions } from './PendingActions';
import { RecentTransactions } from './RecentTransactions';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardConfigDrawer } from './DashboardConfigDrawer';
import { HierarchyBreakdownPanel } from './HierarchyBreakdownPanel';
import { ExecutiveStockExpensePanel } from './ExecutiveStockExpensePanel';
import { FieldOperationsPanel, type FieldLiveContext } from './FieldOperationsPanel';

export interface RoleBasedDashboardShellProps {
  currentUser: NLinkUser;
  dataset: DashboardDataset;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onQuickAction?: (actionId: QuickActionId) => void;
  onSelectCustomer?: (customerId: string) => void;
  onOpenInventory?: () => void;
  fieldLiveContext?: FieldLiveContext;
}

export const RoleBasedDashboardShell: React.FC<RoleBasedDashboardShellProps> = ({
  currentUser,
  dataset,
  isDarkMode,
  onToggleTheme,
  onQuickAction,
  onSelectCustomer,
  onOpenInventory,
  fieldLiveContext,
}) => {
  const [datePreset, setDatePreset] = useState<DashboardDatePreset>('THIS_MONTH');
  const todayIso = useMemo(() => toKarachiDateIso(), []);
  const [customStart, setCustomStart] = useState(() => `${todayIso.slice(0, 7)}-01`);
  const [customEnd, setCustomEnd] = useState(todayIso);
  const [filter, setFilter] = useState<DashboardHierarchyFilter>({});
  const [selectedKpi, setSelectedKpi] = useState<KpiMetricValue | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configOverride, setConfigOverride] = useState<AdminRoleConfigOverride | null>(() => {
    const scope = resolveUserDataScope(currentUser);
    return loadLocalRoleConfigOverrides()[scope.dashboardRoleKey] || null;
  });

  const effectiveDataset = useMemo<DashboardDataset>(() => {
    const userScope = resolveUserDataScope({
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      region: currentUser.region,
      zone: currentUser.zone || currentUser.area,
      territory: currentUser.territory,
      assignedTowns: currentUser.assignedTowns,
    });
    const hasConfiguredTargets = Boolean(dataset.targets && dataset.targets.length > 0);
    const hasEmployees = Boolean(dataset.employees && dataset.employees.length > 0);
    const hasUserQuota =
      (Number(currentUser.monthlySalesTarget) || 0) > 0 ||
      (Number(currentUser.monthlyRecoveryTarget) || 0) > 0;

    if (userScope.scopeLevel === 'TERRITORY' && !hasConfiguredTargets && !hasEmployees && hasUserQuota) {
      return {
        ...dataset,
        employees: [
          {
            id: currentUser.id,
            employeeCode: currentUser.employeeCode || currentUser.id,
            fullName: currentUser.fullName,
            email: currentUser.email,
            mobile: currentUser.phone || '',
            joiningDate: todayIso,
            employmentStatus: 'ACTIVE',
            department: currentUser.department || 'SALES_FIELD',
            designation: currentUser.roleTitle || 'Field Sales User',
            salesDetails: {
              region: currentUser.region,
              area: currentUser.zone || currentUser.area,
              territory: currentUser.territory,
              assignedTowns: currentUser.assignedTowns || [],
              monthlySalesTarget: Number(currentUser.monthlySalesTarget) || 0,
              monthlyRecoveryTarget: Number(currentUser.monthlyRecoveryTarget) || 0,
            },
            createdAt: todayIso,
          },
        ],
      };
    }
    return dataset;
  }, [currentUser, dataset, todayIso]);

  // Immediate synchronous calculation for crisp zero-flicker render, optionally refined by server gateway
  const localSummary = useMemo<DashboardComputationResult>(() => {
    const userScope = resolveUserDataScope({
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      region: currentUser.region,
      zone: currentUser.zone || currentUser.area,
      territory: currentUser.territory,
      assignedTowns: currentUser.assignedTowns,
      distributorId: (currentUser as any).distributorId,
      dealerId: (currentUser as any).dealerId,
    });
    const config = resolveRoleDashboardConfig(currentUser.role, configOverride);
    const dateRange = getKarachiDateRange(datePreset, customStart, customEnd);
    const validation = validateRequestedFilter(userScope, filter);
    const scopedDataset = filterDashboardDatasetByScope(userScope, effectiveDataset, validation.effectiveFilter);
    return computeDashboardMetrics({
      dataset: scopedDataset,
      dateRange,
      scope: userScope,
      config,
    });
  }, [currentUser, effectiveDataset, datePreset, customStart, customEnd, filter, configOverride]);

  const [serverSummary, setServerSummary] = useState<DashboardComputationResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchScopedDashboardSummary({
      user: currentUser,
      dataset: effectiveDataset,
      preset: datePreset,
      customStart,
      customEnd,
      filter,
      configOverride,
    })
      .then((res) => {
        if (active) setServerSummary(res);
      })
      .catch(() => {
        if (active) setServerSummary(null);
      });
    return () => {
      active = false;
    };
  }, [currentUser, effectiveDataset, datePreset, customStart, customEnd, filter, configOverride]);

  const summary = serverSummary || localSummary;
  const canConfigure =
    hasPermission(currentUser.role, 'dashboard.configure') ||
    hasPermission(currentUser.role, 'roles.manage');

  const handleSaveConfig = async (nextOverride: AdminRoleConfigOverride) => {
    await saveRoleDashboardConfigOverride(nextOverride);
    setConfigOverride(nextOverride);
  };

  const showTrendChart = summary.config.allowedCharts.includes('SALES_RECOVERY_TREND');
  const showRegionalChart =
    summary.config.allowedCharts.includes('REGIONAL_PERFORMANCE') &&
    summary.hierarchyBreakdown.length > 0;
  const showTerritoryRankingChart =
    summary.config.allowedCharts.includes('TERRITORY_RANKING') &&
    (summary.hierarchyBreakdowns?.byTerritory.length || 0) > 0;
  const showStockExpensePanel =
    summary.config.roleKey === 'MD_EXECUTIVE' ||
    summary.config.allowedCharts.includes('STOCK_OVERVIEW');

  return (
    <>
      <DashboardLayout
        header={
          <DashboardHeader
            config={summary.config}
            scope={summary.scope}
            userName={currentUser.fullName}
            dateRangeLabel={summary.dateRange.label}
            isDarkMode={isDarkMode}
            onToggleTheme={onToggleTheme}
            canConfigure={canConfigure}
            onOpenConfigDrawer={() => setIsConfigOpen(true)}
            onQuickAction={onQuickAction}
          />
        }
        filters={
          <DashboardFilters
            config={summary.config}
            scope={summary.scope}
            datePreset={datePreset}
            customStart={customStart}
            customEnd={customEnd}
            filter={filter}
            filterOptions={summary.filterOptions}
            onDatePresetChange={setDatePreset}
            onCustomDateChange={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
            }}
            onFilterChange={setFilter}
            onResetFilters={() => setFilter({})}
          />
        }
      >
        {summary.config.layoutSections.includes('KPIS') && (
          <KPIGrid
            config={summary.config}
            kpis={summary.kpis}
            onSelectKpi={(m) => setSelectedKpi(m)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            {summary.config.layoutSections.includes('CHARTS') && summary.config.allowedCharts.length > 0 && (
              <>
                {showTrendChart && (
                  <PerformanceChart
                    title="Sales & Recovery Trend (7-Day PKT)"
                    subtitle="Posted sales net of credit notes vs confirmed recoveries"
                    trendSeries={summary.trendSeries}
                    hierarchyBreakdown={summary.hierarchyBreakdown}
                    mode="TREND"
                  />
                )}
                {showRegionalChart && (
                  <PerformanceChart
                    title="Regional Performance Comparison"
                    subtitle={`Posted sales & confirmed recoveries by region (${summary.dateRange.label})`}
                    trendSeries={summary.trendSeries}
                    hierarchyBreakdown={summary.hierarchyBreakdown}
                    mode="HIERARCHY"
                  />
                )}
                {showTerritoryRankingChart && (
                  <PerformanceChart
                    title="Top Territory Ranking"
                    subtitle={`Territory sales vs recovery within authorized scope (${summary.dateRange.label})`}
                    trendSeries={summary.trendSeries}
                    territoryBreakdown={summary.hierarchyBreakdowns?.byTerritory || []}
                    mode="TERRITORY_RANKING"
                  />
                )}
              </>
            )}

            {summary.config.layoutSections.includes('RECENT_TRANSACTIONS') && (
              <RecentTransactions
                transactions={summary.recentTransactions}
                onSelectCustomer={onSelectCustomer}
              />
            )}
          </div>

          <div className="lg:col-span-4 space-y-5">
            {summary.config.layoutSections.includes('PENDING_ACTIONS') && (
              <PendingActions
                items={summary.pendingActions}
                onAction={(actionId) => onQuickAction?.(actionId)}
              />
            )}

            {summary.config.layoutSections.includes('ALERTS') && (
              <DashboardAlerts
                alerts={summary.alerts}
                onInspectRecord={(id) => onSelectCustomer?.(id)}
              />
            )}
          </div>
        </div>

        {summary.config.layoutSections.includes('HIERARCHY_BREAKDOWN') && summary.hierarchyBreakdowns && (
          <HierarchyBreakdownPanel
            breakdowns={summary.hierarchyBreakdowns}
            scopeLevel={summary.scope.scopeLevel}
            dateRangeLabel={summary.dateRange.label}
            onSelectCustomer={onSelectCustomer}
          />
        )}

        {summary.config.roleKey === 'FIELD_SALES_USER' && summary.fieldSummary && (
          <FieldOperationsPanel
            fieldSummary={summary.fieldSummary}
            kpis={summary.kpis}
            dateRangeLabel={summary.dateRange.label}
            liveContext={fieldLiveContext}
            onSelectCustomer={onSelectCustomer}
            onQuickAction={onQuickAction}
          />
        )}

        {showStockExpensePanel && summary.stockOverview && summary.expenseSummary && (
          <ExecutiveStockExpensePanel
            stockOverview={summary.stockOverview}
            expenseSummary={summary.expenseSummary}
            dateRangeLabel={summary.dateRange.label}
            onOpenInventory={onOpenInventory}
          />
        )}
      </DashboardLayout>

      <KPIDrillDownModal
        metric={selectedKpi}
        records={selectedKpi ? summary.drillDowns[selectedKpi.id] || [] : []}
        onClose={() => setSelectedKpi(null)}
        onSelectCustomer={(id) => {
          setSelectedKpi(null);
          onSelectCustomer?.(id);
        }}
      />

      <DashboardConfigDrawer
        isOpen={isConfigOpen}
        initialRoleKey={summary.config.roleKey}
        currentOverride={configOverride}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleSaveConfig}
      />
    </>
  );
};
