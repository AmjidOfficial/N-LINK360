/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Calm, role-based application header
 */

import React from 'react';
import { Building2, ExternalLink, GitBranch, Smartphone, UserRound } from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  activeApp: 'PORTAL' | 'MOBILE_APP' | 'DOCS' | 'VALIDATOR';
  setActiveApp: (app: 'PORTAL' | 'MOBILE_APP' | 'DOCS' | 'VALIDATOR') => void;
  currentUser: User;
  onRoleChange?: (role: UserRole) => void;
  users?: User[];
}

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGEMENT: 'Management',
  FACTORY_MANAGER: 'Factory In-Charge',
  WAREHOUSE_MANAGER: 'Warehouse In-Charge',
  ACCOUNTS: 'Accounts',
  SALES_MANAGER: 'Sales Manager',
  SALES_RECOVERY: 'Sales & Recovery',
  DISPATCH_OFFICER: 'Dispatch & Logistics',
};

export const Header: React.FC<HeaderProps> = ({ activeApp, setActiveApp, currentUser }) => {
  const isField = currentUser.role === 'SALES_RECOVERY';

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-black text-lg">NL</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight">N-LINK 360</span>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">DEV</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">National Lights • {roleLabel[currentUser.role]}</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            {!isField && (
              <button onClick={() => setActiveApp('PORTAL')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeApp === 'PORTAL' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                <Building2 className="w-4 h-4" /> Company Workspace
              </button>
            )}
            <button onClick={() => setActiveApp('MOBILE_APP')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeApp === 'MOBILE_APP' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
              <Smartphone className="w-4 h-4" /> Sales & Recovery
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
              <UserRound className="w-4 h-4 text-amber-400" />
              <div className="leading-tight">
                <div className="text-xs font-semibold text-white">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500">{roleLabel[currentUser.role]}</div>
              </div>
            </div>
            <a href="https://github.com/AmjidOfficial/N-LINK360" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-300 hover:text-white border border-slate-800" title="Open N-LINK 360 GitHub repository">
              <GitBranch className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
