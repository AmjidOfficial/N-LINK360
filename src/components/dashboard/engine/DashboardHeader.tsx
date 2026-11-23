import React from 'react';
import {
  CheckSquare,
  Download,
  FileText,
  PackageCheck,
  Plus,
  Receipt,
  Settings2,
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
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
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
  canConfigure = false,
  onOpenConfigDrawer,
  onQuickAction,
}) => {
  const quickActions = config.allowedQuickActions.slice(0, 3);
  let primaryAssigned = false;

  return (
    <header
      aria-label="Dashboard Top Bar"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl shadow-xs"
    >
      <div className="min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-white truncate">
              {config.title}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800/60 shrink-0">
              {config.roleKey.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {userName} &bull; {formatScopeBreadCrumb(scope)} &bull; <span className="font-mono tabular-nums">{dateRangeLabel}</span>
          </p>
        </div>
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
              className={`${isPrimary ? 'btn-primary' : 'btn-outline'} min-h-[40px] px-3 text-xs`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{meta.label}</span>
            </button>
          );
        })}

        {canConfigure && onOpenConfigDrawer && (
          <button
            type="button"
            onClick={onOpenConfigDrawer}
            title="Configure role dashboard widgets"
            className="btn-outline min-h-[40px] px-3 text-xs"
          >
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}
      </div>
    </header>
  );
};
