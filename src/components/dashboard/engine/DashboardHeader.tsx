import React from 'react';
import {
  CheckSquare,
  Download,
  FileText,
  PackageCheck,
  Plus,
  Receipt,
  Settings2,
  Sun,
  Moon,
  Truck,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import type { QuickActionId, RoleDashboardConfig, UserDataScope } from '../../../lib/dashboard';

export interface DashboardHeaderProps {
  config: RoleDashboardConfig;
  scope: UserDataScope;
  userName: string;
  dateRangeLabel: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  canConfigure?: boolean;
  onOpenConfigDrawer?: () => void;
  onQuickAction?: (actionId: QuickActionId) => void;
}

const ACTION_META: Record<QuickActionId, { label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean }> = {
  OPEN_APPROVALS: { label: 'Approvals', icon: CheckSquare, primary: true },
  NEW_ORDER: { label: 'New Order', icon: Plus, primary: true },
  RECORD_RECOVERY: { label: 'Record Recovery', icon: Receipt },
  CREATE_INVOICE: { label: 'Generate Invoice', icon: FileText },
  PACK_ORDERS: { label: 'Packing Queue', icon: PackageCheck },
  DISPATCH_ORDER: { label: 'Dispatch Bilty', icon: Truck },
  VIEW_LEDGER: { label: 'Party Ledger', icon: BookOpen },
  VIEW_ATTENDANCE: { label: 'Attendance', icon: UserCheck },
  EXPORT_REPORT: { label: 'Export CSV', icon: Download },
};

function formatScopeBreadCrumb(scope: UserDataScope): string {
  if (scope.isCompanyWide) return scope.scopeLevel === 'DEPARTMENT' ? 'Head Office Dept' : 'National · All Regions';
  const parts = [scope.region, scope.zone, scope.territory].filter(Boolean);
  if (parts.length > 0) return parts.join(' / ');
  if (scope.assignedTowns.length > 0) return scope.assignedTowns.slice(0, 2).join(', ');
  if (scope.scopeLevel === 'DISTRIBUTOR') return 'Distributor Account';
  if (scope.scopeLevel === 'DEALER') return 'Dealer Account';
  return 'Assigned Territory';
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  config,
  scope,
  userName,
  dateRangeLabel,
  isDarkMode,
  onToggleTheme,
  canConfigure = false,
  onOpenConfigDrawer,
  onQuickAction,
}) => {
  const quickActions = config.allowedQuickActions.slice(0, 4);
  let primaryAssigned = false;

  return (
    <header className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#0F172A] px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#16A34A] dark:text-emerald-400">
            {config.roleKey.replace(/_/g, ' ')} · {formatScopeBreadCrumb(scope)} · PKT (Asia/Karachi)
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] truncate">
            {config.title}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {userName} · {config.subtitle} · Period:{' '}
            <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-slate-100">
              {dateRangeLabel}
            </span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {quickActions.map((actionId) => {
            const meta = ACTION_META[actionId];
            if (!meta) return null;
            const Icon = meta.icon;
            const isPrimary = Boolean(meta.primary && !primaryAssigned);
            if (isPrimary) primaryAssigned = true;

            return (
              <button
                key={actionId}
                type="button"
                onClick={() => onQuickAction?.(actionId)}
                className={`${isPrimary ? 'btn-primary' : 'btn-outline'} min-h-[44px]`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{meta.label}</span>
              </button>
            );
          })}

          {canConfigure && onOpenConfigDrawer && (
            <button
              type="button"
              onClick={onOpenConfigDrawer}
              title="Configure role dashboard widgets"
              className="btn-outline min-h-[44px]"
            >
              <Settings2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn-outline min-h-[44px] min-w-[44px] px-0!"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#F97316]" /> : <Moon className="w-4 h-4 text-[#16A34A]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
