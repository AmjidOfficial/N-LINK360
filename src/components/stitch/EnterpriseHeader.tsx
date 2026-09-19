/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Header Component
 * Pixel-perfect, professional, clean & clear executive design with Side Drawer
 */

import React, { useState, useMemo } from 'react';
import { NLinkUser, getStoredUsers, TEAM_USERS } from '../../data/nlink-users-team';
import { Menu, X, RefreshCw, Tag, Settings, ShieldCheck, Moon, Sun, User as UserIcon } from 'lucide-react';

export interface EnterpriseHeaderProps {
  activeTab: 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS';
  currentUser: NLinkUser;
  onSelectUser: (user: NLinkUser) => void;
  onOpenRateCard: () => void;
  onOpenSettings?: () => void;
  onOpenDualApprovals?: () => void;
  pendingApprovalsCount?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isOnline?: boolean;
  onTriggerManualSync?: () => Promise<void>;
}

const TAB_CONFIG: Record<
  EnterpriseHeaderProps['activeTab'],
  { label: string; icon: string }
> = {
  DASHBOARD: { label: 'Dashboard', icon: 'dashboard' },
  ATTENDANCE: { label: 'Attendance & Punch', icon: 'how_to_reg' },
  ORDERS: { label: 'Sales & Orders', icon: 'shopping_cart_checkout' },
  LEDGERS: { label: 'Party Ledgers', icon: 'menu_book' },
  DEALERS: { label: 'Distributor Network', icon: 'storefront' },
};

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  activeTab,
  currentUser,
  onSelectUser,
  onOpenRateCard,
  onOpenSettings,
  onOpenDualApprovals,
  pendingApprovalsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
  isOnline = true,
  onTriggerManualSync,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dynamic stored users (Shahzad Ullah & Syed Zain + corporate employees)
  const availableUsers = useMemo(() => {
    try {
      const stored = getStoredUsers();
      return stored && stored.length > 0 ? stored : TEAM_USERS;
    } catch {
      return TEAM_USERS;
    }
  }, []);

  const isAdmin = useMemo(() => {
    return (
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'MANAGEMENT' ||
      currentUser.email?.includes('zain') ||
      currentUser.email?.includes('shahzad')
    );
  }, [currentUser]);

  const activeTabMeta = TAB_CONFIG[activeTab] || { label: activeTab, icon: 'grid_view' };

  const handleManualSync = async () => {
    if (!onTriggerManualSync) return;
    setIsSyncing(true);
    try {
      await onTriggerManualSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1420]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-colors">
        <div className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Prestigious Company Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://nationallight.pk/"
              target="_blank"
              rel="noreferrer"
              title="National Light Official Website (nationallight.pk)"
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs flex items-center justify-center p-1 shrink-0 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all hover:scale-102"
            >
              <img
                src="/national_light_logo.jpg"
                alt="National Light Pakistan"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).innerHTML =
                    '<div class="w-full h-full bg-[#001428] text-[#76f4e0] flex items-center justify-center font-black text-xs rounded-lg">NL</div>';
                }}
              />
            </a>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  NATIONAL<span className="text-[#006b5f] dark:text-[#76f4e0] font-black"> LIGHT</span>
                </span>
                <a
                  href="https://nationallight.pk/"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
                >
                  nationallight.pk
                </a>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                  N-LINK 360
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1.5" title={isOnline ? 'Cloud Synced Live' : 'Offline Mode'}>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {isOnline ? 'Synced' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Current User Greeting */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Welcome,</span>
            <span className="text-xs font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-lg">
              {currentUser.fullName} <span className="text-emerald-600 dark:text-[#76f4e0] text-[10px] font-mono ml-1 uppercase">({currentUser.roleTitle || currentUser.role})</span>
            </span>
          </div>

          {/* Right: Drawer Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white transition-all cursor-pointer active:scale-95 shadow-2xs font-bold text-xs"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#006b5f] dark:text-[#76f4e0]" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>

        </div>
      </header>

      {/* Side Drawer Modal Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="side-drawer-container">
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Panel content container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md transform transition-all duration-300 bg-white dark:bg-[#070c14] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full">
              
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0c1420]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#001428] flex items-center justify-center font-black text-xs text-[#76f4e0] border border-emerald-500/20 shadow-xs">
                    NL
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block leading-tight">
                      System Drawer
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      N-LINK 360 Enterprise Roster
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                
                {/* Active User Card Section */}
                <div className="bg-slate-50 dark:bg-[#0c1420] rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#006b5f] text-white flex items-center justify-center font-black text-sm shadow-xs">
                      {currentUser.avatarInitials || currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {currentUser.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {currentUser.email || 'National Lights Team'}
                      </p>
                      <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50 uppercase">
                        {currentUser.roleTitle || currentUser.role}
                      </span>
                    </div>
                  </div>

                  {/* Manual/Auto Sync Trigger Action Button */}
                  {onTriggerManualSync && (
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-colors cursor-pointer active:scale-98 shadow-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Synchronizing State...' : 'Sync Live Data Now'}</span>
                    </button>
                  )}
                </div>

                {/* Main Actions & Modules List */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                    Enterprise Actions
                  </h5>

                  {/* 1. Rate Card (Accessible to All Users) */}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRateCard();
                      setIsDrawerOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200/65 dark:border-slate-800 text-left transition-colors cursor-pointer active:scale-98 shadow-2xs font-bold text-xs"
                  >
                    <Tag className="w-5 h-5 text-[#006b5f] dark:text-[#76f4e0]" />
                    <div className="flex-1">
                      <span className="block">Master FMCG Rate Card</span>
                      <span className="text-[9px] text-slate-400 font-medium block">All products standard tiered lists</span>
                    </div>
                  </button>

                  {/* 2. Dual Approvals (Admins Only) */}
                  {isAdmin && onOpenDualApprovals && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDualApprovals();
                        setIsDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200/65 dark:border-slate-800 text-left transition-colors cursor-pointer active:scale-98 shadow-2xs font-bold text-xs"
                    >
                      <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1 flex justify-between items-center gap-2">
                        <div>
                          <span className="block">Dual Approvals Center</span>
                          <span className="text-[9px] text-slate-400 font-medium block">Zain & Shahzad authority controls</span>
                        </div>
                        {pendingApprovalsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[10px] font-bold">
                            {pendingApprovalsCount}
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  {/* 3. System Preferences / Settings (Admins Only) */}
                  {isAdmin && onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        setIsDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200/65 dark:border-slate-800 text-left transition-colors cursor-pointer active:scale-98 shadow-2xs font-bold text-xs"
                    >
                      <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <span className="block">System Settings</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Google Sheet connection mapping</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Team Roster Account Switcher (Admins Only) */}
                {isAdmin && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                      Account Switcher <span className="text-[9px] text-emerald-600 font-mono lowercase">(admin override)</span>
                    </h5>
                    
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {availableUsers.map((user) => {
                        const isCurrent = currentUser.id === user.id;
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              onSelectUser(user);
                              setIsDrawerOpen(false);
                            }}
                            className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-xl text-left transition-colors cursor-pointer active:scale-98 ${
                              isCurrent
                                ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/50 dark:border-teal-800/40 text-slate-900 dark:text-white'
                                : 'bg-slate-50/55 dark:bg-slate-900/60 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-transparent'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isCurrent
                                ? 'bg-[#006b5f] text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {user.avatarInitials || user.fullName.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs font-extrabold truncate">{user.fullName}</span>
                              <span className="block text-[9px] text-slate-400 truncate">{user.roleTitle || user.role}</span>
                            </div>
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Light/Dark Mode Setting (Available to All) */}
                {onToggleDarkMode && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                      Theme Settings
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleDarkMode();
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0c1420] hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800 transition-colors cursor-pointer active:scale-98 shadow-2xs font-bold text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        <span>{isDarkMode ? 'Clean Light Layout' : 'Sleek Dark Scheme'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-black">Switch</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1420] text-center text-[10px] text-slate-400">
                <span>National Lights Pakistan © 2026</span>
                <span className="mx-1.5">•</span>
                <a
                  href="https://nationallight.pk/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline font-bold text-emerald-600 dark:text-emerald-400"
                >
                  nationallight.pk
                </a>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
