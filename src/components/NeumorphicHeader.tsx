import React, { useState } from 'react';
import {
  Building2,
  Package,
  Users,
  Target,
  GitFork,
  BarChart3,
  CreditCard,
  Banknote,
  BookOpen,
  Warehouse,
  Store,
  LayoutDashboard,
  Bell,
  RefreshCw,
  User,
  LogOut,
  CheckCircle2,
  X,
  Menu,
  MapPin,
  CalendarCheck,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { User as UserType } from '../types';
import { isAdminUser } from '../services/production-users';

export type MainDomain = 'DASHBOARDS' | 'OPERATIONS' | 'REPORTS';

export type OperationSubTab =
  | 'COMPANY'
  | 'BRANDS_PRODUCTS'
  | 'DEALERS_DISTRIBUTORS'
  | 'TARGET'
  | 'SALES_TEAM'
  | 'HIERARCHY';

export type ReportSubTab =
  | 'SALES'
  | 'CREDIT'
  | 'RECOVERY'
  | 'LEDGERS'
  | 'STOCKS_WAREHOUSE'
  | 'DEALERS_DISTRIBUTOR';

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
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Operations domain is strictly restricted to Admins & Managers
  const canAccessOperations = isAdminUser(currentUser) || currentUser.role === 'ACCOUNTS' || currentUser.role === 'WAREHOUSE_MANAGER';

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
      <div className="nm-container py-3 flex items-center justify-between gap-3">
        {/* Brand, Logo & Side Drawer Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 rounded-2xl nm-btn text-teal-800 flex items-center gap-2 hover:border-teal-500/40 transition-all cursor-pointer"
            title="Open Main Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-teal-700" />
            <span className="text-xs font-black">Navigation Drawer</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center nm-flat text-teal-700 font-black text-sm sm:text-base tracking-wider border border-white shrink-0">
              NL
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800">
                  N-LINK <span className="text-teal-600 font-black">360</span>
                </span>
                <span className="hidden sm:inline-block nm-badge-teal text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-500 font-medium">National Lights Enterprise Workspace</p>
            </div>
          </div>
        </div>

        {/* Current Domain Badge & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Section Badge */}
          <div className="hidden md:flex items-center gap-2 nm-inset px-3.5 py-1.5 rounded-2xl text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>
              {activeDomain === 'DASHBOARDS'
                ? 'Sales & Recovery Analysis'
                : activeDomain === 'OPERATIONS'
                ? `Operations — ${activeOpTab.replace('_', ' ')}`
                : `Reports — ${activeRepTab.replace('_', ' ')}`}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="nm-btn p-2.5 rounded-2xl text-slate-700 hover:text-teal-700 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={onOpenAuditLogs}
            className="nm-btn p-2.5 rounded-2xl text-slate-700 hover:text-amber-700 transition-colors relative"
            title="Audit Logs & System Activity"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-[#E8ECF2]" />
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="nm-flat-sm px-3 py-1.5 rounded-2xl flex items-center gap-2 border border-white/80 hover:border-teal-500/40 transition-colors text-left"
            title="View Account Profile"
          >
            <div className="w-7 h-7 rounded-xl nm-inset flex items-center justify-center text-teal-700 font-black">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-none hidden md:block">
              <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </button>

          <button
            onClick={onSignOut}
            className="nm-btn p-2.5 rounded-2xl text-slate-600 hover:text-rose-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Side Drawer Overlay Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="nm-flat w-full max-w-sm sm:max-w-md h-full bg-[#E8ECF2] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto border-r border-white">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl nm-flat flex items-center justify-center text-teal-700 font-black text-base border border-white">
                    NL
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">N-LINK 360</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Navigation & Operations Drawer</p>
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

              {/* Navigation Group 1: Dashboards & Analysis */}
              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-teal-600" />
                  1. Dashboards & Analysis
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => navTo('DASHBOARDS')}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'DASHBOARDS'
                        ? 'nm-btn-primary shadow-sm'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>Sales & Recovery Analysis</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>

                  <button
                    onClick={() => navTo('OPERATIONS', 'TARGET')}
                    className="w-full text-left p-3 rounded-2xl text-xs font-bold nm-btn text-slate-700 hover:text-slate-900 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span>Target vs Achievement</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Navigation Group 2: Operation Domain */}
              {canAccessOperations && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    2. Operation Domain
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => navTo('OPERATIONS', 'COMPANY')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'COMPANY'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Company Master</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'BRANDS_PRODUCTS')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'BRANDS_PRODUCTS'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-teal-600" />
                        <span>Brands / Products</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'DEALERS_DISTRIBUTORS')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'DEALERS_DISTRIBUTORS'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-teal-600" />
                        <span>Dealers / Distributors</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'TARGET')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'TARGET'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>Target Allocation</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'SALES_TEAM')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'SALES_TEAM'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sales Team</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'HIERARCHY')}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        activeDomain === 'OPERATIONS' && activeOpTab === 'HIERARCHY'
                          ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                          : 'nm-btn text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GitFork className="w-3.5 h-3.5 text-teal-600" />
                        <span>Hierarchy & Regional Tree</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'HIERARCHY')}
                      className="w-full text-left p-2.5 rounded-xl text-xs font-bold nm-btn text-slate-700 hover:text-slate-900 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                        <span>Towns & Territories</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      onClick={() => navTo('OPERATIONS', 'SALES_TEAM')}
                      className="w-full text-left p-2.5 rounded-xl text-xs font-bold nm-btn text-slate-700 hover:text-slate-900 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Attendance & Field Visits</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Group 3: Reports & Registers */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                  3. Reports & Registers
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => navTo('REPORTS', 'SALES')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'SALES'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Sales Report</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => navTo('REPORTS', 'CREDIT')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'CREDIT'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                      <span>Credit & Aging</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => navTo('REPORTS', 'RECOVERY')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'RECOVERY'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Recovery Register</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => navTo('REPORTS', 'LEDGERS')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'LEDGERS'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      <span>Party Ledgers</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'STOCKS_WAREHOUSE'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                      <span>Stocks / Warehouse Floor</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    onClick={() => navTo('REPORTS', 'DEALERS_DISTRIBUTOR')}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeDomain === 'REPORTS' && activeRepTab === 'DEALERS_DISTRIBUTOR'
                        ? 'nm-inset text-teal-900 font-extrabold bg-[#E8ECF2] border border-teal-500/20'
                        : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dealers / Distributor Performance</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-300 space-y-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenAuditLogs();
                }}
                className="w-full nm-btn p-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-3"
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
        </div>
      )}

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
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
        </div>
      )}
    </header>
  );
};

