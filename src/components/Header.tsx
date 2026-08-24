/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights role-based workspace header
 */

import React from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User;
  onSignOut?: () => void;
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
};

export const Header: React.FC<HeaderProps> = ({ currentUser, onSignOut }) => (
  <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
    <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-sm">NL</div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-lg">N-LINK 360</div>
          <p className="truncate text-[11px] text-slate-500">National Lights · {roleLabel[currentUser.role]}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <UserRound className="h-4 w-4 text-amber-600" />
          <div className="leading-tight">
            <div className="text-xs font-semibold text-slate-900">{currentUser.fullName}</div>
            <div className="text-[10px] text-slate-500">{currentUser.id}</div>
          </div>
        </div>
        {onSignOut && (
          <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Sign out">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
      </div>
    </div>
  </header>
);
