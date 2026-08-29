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
  Search,
  Bell,
  RefreshCw,
  User,
  LogOut,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Menu
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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
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
  searchQuery,
  setSearchQuery,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 bg-[#E8ECF2]/95 backdrop-blur-md border-b border-white/60 shadow-sm transition-all">
      {/* Top Command Bar */}
      <div className="nm-container py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center justify-between w-full md:w-auto">
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
              <p className="hidden sm:block text-[10px] sm:text-[11px] text-slate-500 font-medium">National Lights Operations Platform</p>
            </div>
          </div>

          {/* Mobile Side Drawer Toggle */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2.5 rounded-xl text-xs font-bold nm-btn text-slate-800 flex items-center gap-1.5"
              title="Open Navigation Drawer"
            >
              <Menu className="w-4 h-4 text-teal-700" />
              <span className="text-[11px]">Menu</span>
            </button>
          </div>
        </div>

        {/* Search & Actions Ribbon */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Debossed Search Bar */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU, dealer, town, invoice..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl nm-inset text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="nm-btn p-2.5 rounded-xl text-slate-700 hover:text-teal-700 transition-colors"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              onClick={onOpenAuditLogs}
              className="nm-btn p-2.5 rounded-xl text-slate-700 hover:text-amber-700 transition-colors relative"
              title="Audit Logs & System Activity"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-[#E8ECF2]" />
            </button>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="nm-flat-sm px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/80 hover:border-teal-500/40 transition-colors text-left"
              title="View Account Profile"
            >
              <div className="w-7 h-7 rounded-lg nm-inset flex items-center justify-center text-teal-700">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left leading-none">
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </button>

            <button
              onClick={onSignOut}
              className="nm-btn p-2.5 rounded-xl text-slate-600 hover:text-rose-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Domains Bar */}
      <div className="nm-container pt-0.5 pb-2.5">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl nm-inset overflow-x-auto scrollbar-none">
          {/* Domain 1: Dashboards */}
          <button
            onClick={() => setActiveDomain('DASHBOARDS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeDomain === 'DASHBOARDS'
                ? 'nm-btn-primary shadow-md'
                : 'nm-btn text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboards</span>
          </button>

          {/* Domain 2: Operation Domain (Admins Only) */}
          {canAccessOperations && (
            <button
              onClick={() => setActiveDomain('OPERATIONS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeDomain === 'OPERATIONS'
                  ? 'nm-btn-primary shadow-md'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Operation Domain</span>
            </button>
          )}

          {/* Domain 3: Reports */}
          <button
            onClick={() => setActiveDomain('REPORTS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeDomain === 'REPORTS'
                ? 'nm-btn-primary shadow-md'
                : 'nm-btn text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Reports & Registers</span>
          </button>
        </div>
      </div>

      {/* Secondary Sub-Tabs Strip */}
      {activeDomain === 'OPERATIONS' && (
        <div className="bg-[#E2E7EE]/80 border-t border-b border-white/60 py-2">
          <div className="nm-container flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setActiveOpTab('COMPANY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'COMPANY'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Company Master
            </button>
            <button
              onClick={() => setActiveOpTab('BRANDS_PRODUCTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'BRANDS_PRODUCTS'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-teal-600" />
              Brands / Products
            </button>
            <button
              onClick={() => setActiveOpTab('DEALERS_DISTRIBUTORS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'DEALERS_DISTRIBUTORS'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-teal-600" />
              Dealers / Distributors
            </button>
            <button
              onClick={() => setActiveOpTab('TARGET')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'TARGET'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-600" />
              Target Allocation
            </button>
            <button
              onClick={() => setActiveOpTab('SALES_TEAM')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'SALES_TEAM'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              Sales Team
            </button>
            <button
              onClick={() => setActiveOpTab('HIERARCHY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeOpTab === 'HIERARCHY'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-teal-600" />
              Territory Hierarchy
            </button>
          </div>
        </div>
      )}

      {activeDomain === 'REPORTS' && (
        <div className="bg-[#E2E7EE]/80 border-t border-b border-white/60 py-2">
          <div className="nm-container flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setActiveRepTab('SALES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'SALES'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
              Sales Report
            </button>
            <button
              onClick={() => setActiveRepTab('CREDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'CREDIT'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-600" />
              Credit & Aging
            </button>
            <button
              onClick={() => setActiveRepTab('RECOVERY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'RECOVERY'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              Recovery Register
            </button>
            <button
              onClick={() => setActiveRepTab('LEDGERS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'LEDGERS'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              Party Ledgers
            </button>
            <button
              onClick={() => setActiveRepTab('STOCKS_WAREHOUSE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'STOCKS_WAREHOUSE'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5 text-amber-600" />
              Stocks / Warehouse
            </button>
            <button
              onClick={() => setActiveRepTab('DEALERS_DISTRIBUTOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeRepTab === 'DEALERS_DISTRIBUTOR'
                  ? 'nm-inset text-teal-800 bg-[#E8ECF2] border border-teal-500/20'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              Dealer Performance
            </button>
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

      {/* Mobile Slide-Over Side Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-all md:hidden">
          <div className="nm-flat w-4/5 max-w-sm h-full bg-[#E8ECF2] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto border-l border-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl nm-flat flex items-center justify-center text-teal-700 font-black">
                    NL
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">N-LINK 360</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Mobile Operations Menu</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="nm-btn p-2 rounded-full text-slate-600 font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Card inside Drawer */}
              <div className="nm-inset p-3.5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Signed In User</span>
                <p className="text-xs font-black text-slate-800">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>

              {/* Drawer Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleRefresh();
                  }}
                  className="w-full nm-btn p-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-3"
                >
                  <RefreshCw className={`w-4 h-4 text-teal-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Workspace Data</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenAuditLogs();
                  }}
                  className="w-full nm-btn p-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-3"
                >
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>System Audit Logs</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full nm-btn p-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-3"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>View Account Profile</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
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
    </header>
  );
};
