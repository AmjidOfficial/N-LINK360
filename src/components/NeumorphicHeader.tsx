import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  RefreshCw,
  User,
  LogOut,
  CheckCircle2,
  X,
  Menu,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { User as UserType } from '../types';
import {
  NAVIGATION_CONFIG,
  MainDomain,
  OperationSubTab,
  ReportSubTab,
  getFilteredNavItems
} from '../config/navigation';

export type { MainDomain, OperationSubTab, ReportSubTab };

interface HeaderProps {
  activeDomain: MainDomain;
  setActiveDomain: (domain: MainDomain) => void;
  activeOpTab: OperationSubTab;
  setActiveOpTab: (tab: OperationSubTab) => void;
  activeRepTab: ReportSubTab;
  setActiveRepTab: (tab: ReportSubTab) => void;
  currentUser: UserType;
  onSignOut: () => void;
  onOpenAuditLogs: () => void;
  onRefreshData: () => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onToggleViewMode?: () => void;
}

export const NeumorphicHeader: React.FC<HeaderProps> = ({
  activeDomain,
  setActiveDomain,
  activeOpTab,
  setActiveOpTab,
  activeRepTab,
  setActiveRepTab,
  currentUser,
  onSignOut,
  onOpenAuditLogs,
  onRefreshData,
  onToggleViewMode,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Expanded sections in drawer
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    DASHBOARDS: true,
    OPERATIONS: true,
    REPORTS: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const navTo = (domain: MainDomain, subTab?: string) => {
    setActiveDomain(domain);
    if (domain === 'OPERATIONS' && subTab) setActiveOpTab(subTab as OperationSubTab);
    if (domain === 'REPORTS' && subTab) setActiveRepTab(subTab as ReportSubTab);
    setIsDrawerOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#E8ECF2]/95 backdrop-blur-md border-b border-white/60 shadow-sm transition-all">
      {/* Top Command Bar */}
      <div className="nm-container py-4 md:py-4.5 flex items-center justify-between gap-4 md:gap-6">
        {/* Brand, Logo & Mobile Drawer Trigger (Mobile/Tablet Only on < lg) */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="lg:hidden p-2.5 rounded-2xl nm-btn text-teal-800 flex items-center gap-2 hover:border-teal-500/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Open Main Navigation Menu"
          >
            <Menu className="w-5 h-5 text-teal-700" />
            <span className="text-xs font-extrabold tracking-tight hidden sm:inline">Menu</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center nm-flat text-teal-700 font-black text-sm sm:text-base tracking-wider border border-white shrink-0 shadow-sm">
              NL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800 leading-none">
                  N-LINK <span className="text-teal-600 font-black">360</span>
                </span>
                <span className="hidden sm:inline-block nm-badge-teal text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Enterprise
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-500 font-medium mt-1">National Lights Enterprise Workspace</p>
            </div>
          </div>
        </div>

        {/* Current Domain Badge & Quick Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Active Section Badge */}
          <div className="hidden lg:flex items-center gap-2 nm-inset px-4 py-2 rounded-2xl text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>
              {activeDomain === 'DASHBOARDS'
                ? 'Dashboards — Executive Cockpit'
                : activeDomain === 'OPERATIONS'
                ? `Operations — ${activeOpTab.replace('_', ' ')}`
                : `Reports — ${activeRepTab.replace('_', ' ')}`}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="nm-btn p-2.5 rounded-2xl text-slate-700 hover:text-teal-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={onOpenAuditLogs}
            className="nm-btn p-2.5 rounded-2xl text-slate-700 hover:text-amber-700 transition-all hover:scale-[1.02] active:scale-[0.98] relative"
            title="Audit Logs & System Activity"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-[#E8ECF2]" />
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="nm-flat-sm px-3.5 py-2 rounded-2xl flex items-center gap-2.5 border border-white/80 hover:border-teal-500/40 transition-all text-left hover:scale-[1.02] active:scale-[0.98]"
            title="View Account Profile"
          >
            <div className="w-7 h-7 rounded-xl nm-inset flex items-center justify-center text-teal-700 font-black">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-none hidden md:block">
              <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </button>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="px-3 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-black text-xs flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Switch to Field Force Mobile View"
            >
              <User className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Field Force App</span>
              <span className="inline sm:hidden">Field Force</span>
            </button>
          )}

          <button
            onClick={onSignOut}
            className="nm-btn p-2.5 rounded-2xl text-slate-600 hover:text-rose-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Synchronized Side / Mobile Drawer Modal */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="nm-flat w-full max-w-sm sm:max-w-md h-full bg-[#E8ECF2] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto border-r border-white">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl nm-flat flex items-center justify-center text-teal-700 font-black text-base border border-white">
                    NL
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">N-LINK 360</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Enterprise Menu &amp; Reports</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="nm-btn p-2.5 rounded-full text-slate-600 font-bold hover:text-rose-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Summary */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Signed In User</span>
                <p className="text-xs font-black text-slate-800">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[9px] px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>

              {/* Synchronized Navigation Groups */}
              <div className="space-y-4">
                {NAVIGATION_CONFIG.map((group) => {
                  const visibleItems = getFilteredNavItems(group, currentUser);
                  if (visibleItems.length === 0) return null;

                  const isOpen = openSections[group.id];

                  return (
                    <div key={group.id} className="nm-flat p-2 rounded-2xl border border-white space-y-2">
                      <button
                        onClick={() => toggleSection(group.id)}
                        className="w-full flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider px-1 py-1 hover:text-teal-700 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-lg nm-inset flex items-center justify-center text-[10px] text-teal-700 font-bold">
                            {group.number}
                          </span>
                          {group.label}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform text-slate-500 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="space-y-1 pt-1">
                          {visibleItems.map((item) => {
                            const Icon = item.icon;
                            let isActive = false;
                            if (group.id === 'DASHBOARDS') {
                              isActive = activeDomain === 'DASHBOARDS';
                            } else if (group.id === 'OPERATIONS') {
                              isActive = activeDomain === 'OPERATIONS' && activeOpTab === item.id;
                            } else if (group.id === 'REPORTS') {
                              isActive = activeDomain === 'REPORTS' && activeRepTab === item.id;
                            }

                            return (
                              <button
                                key={item.id}
                                onClick={() => navTo(group.id, item.id === 'COCKPIT' ? undefined : item.id)}
                                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between ${
                                  isActive
                                    ? 'nm-btn-primary shadow-sm text-white font-bold'
                                    : 'nm-btn text-slate-700 hover:text-teal-900 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-teal-700'}`} />
                                  <div className="overflow-hidden">
                                    <span className="text-xs truncate block">{item.label}</span>
                                    <span className={`text-[10px] truncate block ${isActive ? 'text-teal-100' : 'text-slate-500'}`}>
                                      {item.description}
                                    </span>
                                  </div>
                                </div>
                                {item.badge ? (
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 ${item.badgeColor || 'bg-teal-800 text-teal-100'}`}>
                                    {item.badge}
                                  </span>
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Drawer Actions */}
            <div className="pt-4 border-t border-slate-300 space-y-2 mt-6">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenAuditLogs();
                }}
                className="w-full nm-btn p-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                <span>System Audit Logs</span>
              </button>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onSignOut();
                }}
                className="w-full nm-btn py-3 rounded-2xl text-xs font-bold text-rose-600 flex items-center justify-center gap-2 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Enterprise</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Profile Modal */}
      {isProfileModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="nm-flat w-full max-w-md p-6 rounded-3xl space-y-4 border border-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl nm-inset flex items-center justify-center text-teal-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{currentUser.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="nm-btn p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="nm-inset p-3 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Assigned Role:</span>
                  <span className="font-bold text-teal-800">{currentUser.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Branch / Location:</span>
                  <span className="font-bold text-slate-800">{currentUser.branchName || 'Lahore Head Office'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onOpenAuditLogs();
                }}
                className="nm-btn flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700"
              >
                View Activity Logs
              </button>
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onSignOut();
                }}
                className="nm-btn py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
