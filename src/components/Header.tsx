/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Header & Application Navigation Bar
 */

import React from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Flame,
  GitBranch,
  Globe2,
  Layers,
  LucideIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  activeApp: 'PORTAL' | 'MOBILE_APP' | 'DOCS' | 'VALIDATOR';
  setActiveApp: (app: 'PORTAL' | 'MOBILE_APP' | 'DOCS' | 'VALIDATOR') => void;
  currentUser: User;
  onRoleChange: (role: UserRole) => void;
  users: User[];
}

export const Header: React.FC<HeaderProps> = ({
  activeApp,
  setActiveApp,
  currentUser,
  onRoleChange,
  users,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Banner / Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-inner">
                NL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">N-LINK 360</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                    DEV • FREE-FIRST
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  National Lights Integrated Sales, Recovery, Inventory & Distribution
                </p>
              </div>
            </div>
          </div>

          {/* Dual-App Switcher Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700 w-full md:w-auto justify-center">
            <button
              id="btn-switch-portal"
              onClick={() => setActiveApp('PORTAL')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeApp === 'PORTAL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Company Web Portal
            </button>

            <button
              id="btn-switch-mobile"
              onClick={() => setActiveApp('MOBILE_APP')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeApp === 'MOBILE_APP'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Sales & Recovery App
            </button>

            <button
              id="btn-switch-docs"
              onClick={() => setActiveApp('DOCS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeApp === 'DOCS'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Docs & Schema
            </button>

            <button
              id="btn-switch-validator"
              onClick={() => setActiveApp('VALIDATOR')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeApp === 'VALIDATOR'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Rules Sandbox
            </button>
          </div>

          {/* Right Controls: Active Role Switcher & GitHub Repo Link */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 hidden sm:inline">Active Role:</span>
              <select
                id="select-user-role"
                value={currentUser.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="SUPER_ADMIN" className="bg-slate-900 text-white">Super Admin (M. Amjid)</option>
                <option value="SALES_RECOVERY" className="bg-slate-900 text-white">Sales & Recovery (Rashid Ali - Field)</option>
                <option value="ACCOUNTS" className="bg-slate-900 text-white">Accounts Officer (F. Qureshi)</option>
                <option value="WAREHOUSE_MANAGER" className="bg-slate-900 text-white">Warehouse In-Charge (Bilal A.)</option>
                <option value="SALES_MANAGER" className="bg-slate-900 text-white">Sales Manager (Tariq Butt)</option>
                <option value="FACTORY_MANAGER" className="bg-slate-900 text-white">Factory Manager (T. Mahmood)</option>
                <option value="DISPATCH_OFFICER" className="bg-slate-900 text-white">Dispatch Officer (Logistics)</option>
                <option value="MANAGEMENT" className="bg-slate-900 text-white">Executive Management</option>
              </select>
            </div>

            <a
              id="link-github-repo"
              href="https://github.com/AmjidOfficial/N-LINK360"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all shrink-0"
              title="Open GitHub Repository: AmjidOfficial/N-LINK360"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
