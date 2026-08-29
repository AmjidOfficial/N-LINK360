/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights role-based workspace header
 */

import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  LogOut,
  Search,
  ShieldAlert,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { User } from '../types';
import { syncManager, getOfflineQueue } from '../services/offlineSyncEngine';

interface HeaderProps {
  currentUser: User;
  onSignOut?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenImportModal?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenOfflineSync?: () => void;
}

const roleLabel: Record<User['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGEMENT: 'Management',
  FACTORY_MANAGER: 'Factory In-Charge',
  WAREHOUSE_MANAGER: 'Warehouse In-Charge',
  ACCOUNTS: 'Accounts',
  SALES_MANAGER: 'Sales Manager',
  SALES_RECOVERY: 'Sales & Recovery',
  DISPATCH_OFFICER: 'Dispatch & Logistics',
  RSM: 'Regional Sales Manager',
  ASM: 'Area Sales Manager',
  TSM: 'Territory Sales Manager',
  SS: 'Sales Supervisor',
  OB: 'Order Booker',
  FACTORY: 'Factory Operations',
  WAREHOUSE: 'Warehouse Operations',
  DISPATCH: 'Dispatch Operations',
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSignOut,
  onOpenGlobalSearch,
  onOpenImportModal,
  onOpenAuditLogs,
  onOpenOfflineSync,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    const unsubNet = syncManager.subscribeNetwork((online) => setIsOnline(online));
    const unsubQueue = syncManager.subscribeQueue((q) => {
      setPendingSyncCount((q || []).filter((i) => i.status === 'PENDING_SYNC' || i.status === 'FAILED').length);
    });

    // Keyboard shortcut for Cmd+K / Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenGlobalSearch?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubNet();
      unsubQueue();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenGlobalSearch]);

  const canImport =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGEMENT' ||
    currentUser.role === 'ACCOUNTS' ||
    currentUser.role === 'SALES_MANAGER';

  const canAudit =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGEMENT' ||
    currentUser.role === 'ACCOUNTS';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80 font-black text-deep-green shadow-sm">
            NL
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight text-deep-green sm:text-lg">
              N-LINK 360
            </div>
            <p className="truncate text-[11px] text-slate-500">
              National Lights · {roleLabel[currentUser.role]}
            </p>
          </div>
        </div>

        {/* Action Controls & User */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Global Search Button */}
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="flex min-h-[38px] items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-bg-secondary px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all"
              title="Global Search (Ctrl+K)"
            >
              <Search className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Excel Import Button */}
          {canImport && onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-bg-secondary px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="Controlled Excel/CSV Import Studio"
            >
              <FileSpreadsheet className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="hidden lg:inline">Excel Import</span>
            </button>
          )}

          {/* Audit Logs Button */}
          {canAudit && onOpenAuditLogs && (
            <button
              onClick={onOpenAuditLogs}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-bg-secondary px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              title="Compliance Audit Trail"
            >
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="hidden lg:inline">Audit</span>
            </button>
          )}

          {/* Offline Sync Status Badge */}
          {onOpenOfflineSync && (
            <button
              onClick={onOpenOfflineSync}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold active:scale-95 transition-all ${
                !isOnline
                  ? 'border-rose-300 bg-rose-50 text-rose-800 animate-pulse'
                  : pendingSyncCount > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
              title="Network & Offline Sync Status"
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-deep-teal shrink-0" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {!isOnline ? 'Offline' : pendingSyncCount > 0 ? `Sync (${pendingSyncCount})` : 'Online'}
              </span>
              {pendingSyncCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-black text-deep-green">
                  {pendingSyncCount}
                </span>
              )}
            </button>
          )}

          {/* Current User Info */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-bg-secondary px-3 py-1.5 md:flex min-h-[38px]">
            <UserRound className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="leading-tight">
              <div className="text-xs font-semibold text-text-primary truncate max-w-[120px]">{currentUser.fullName}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{currentUser.branchName || currentUser.role}</div>
            </div>
          </div>

          {/* Sign Out */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-bg-secondary active:scale-95 transition-all"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
