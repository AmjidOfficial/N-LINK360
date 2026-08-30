import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  const [expandedCategory, setExpandedCategory] = useState<string | null>('SALES');

  const toggleCategory = (cat: string) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
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
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-start bg-slate-900/60 backdrop-blur-sm transition-all">
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

              {/* N-LINK 360 Full Hierarchy Navigation Tree */}
              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-teal-600" />
                  N-LINK 360 Enterprise Hierarchy
                </div>

                <div className="space-y-1.5 text-xs font-bold">
                  {/* 1. Dashboard */}
                  <button
                    onClick={() => navTo('DASHBOARDS')}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between ${
                      activeDomain === 'DASHBOARDS' ? 'nm-btn-primary shadow-sm' : 'nm-btn text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-teal-600" />
                      <span>Dashboard</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>

                  {/* 2. SALES */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('SALES')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-teal-600" />
                        <span>SALES</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'SALES' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'SALES' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('OPERATIONS', 'DEALERS_DISTRIBUTORS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold flex items-center gap-1.5">├─ Customers</button>
                        <button onClick={() => navTo('REPORTS', 'SALES')} className="w-full text-left py-1 hover:text-teal-800 font-semibold flex items-center gap-1.5">├─ Orders</button>
                        <button onClick={() => navTo('REPORTS', 'SALES')} className="w-full text-left py-1 hover:text-teal-800 font-semibold flex items-center gap-1.5">├─ Invoices</button>
                        <button onClick={() => navTo('OPERATIONS', 'SALES_TEAM')} className="w-full text-left py-1 hover:text-teal-800 font-semibold flex items-center gap-1.5">└─ Sales Team</button>
                      </div>
                    )}
                  </div>

                  {/* 3. RECOVERY */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('RECOVERY')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>RECOVERY</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'RECOVERY' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'RECOVERY' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'RECOVERY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Collection</button>
                        <button onClick={() => navTo('REPORTS', 'RECOVERY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Verification</button>
                        <button onClick={() => navTo('REPORTS', 'CREDIT')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Outstanding</button>
                        <button onClick={() => navTo('REPORTS', 'LEDGERS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Ledger</button>
                      </div>
                    )}
                  </div>

                  {/* 4. CREDIT */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('CREDIT')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-rose-600" />
                        <span>CREDIT</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'CREDIT' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'CREDIT' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'CREDIT')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Credit Limits</button>
                        <button onClick={() => navTo('REPORTS', 'CREDIT')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Credit Status</button>
                        <button onClick={() => navTo('REPORTS', 'CREDIT')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Overdue</button>
                        <button onClick={() => navTo('OPERATIONS', 'DEALERS_DISTRIBUTORS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Approvals</button>
                      </div>
                    )}
                  </div>

                  {/* 5. INVENTORY */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('INVENTORY')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-amber-600" />
                        <span>INVENTORY</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'INVENTORY' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'INVENTORY' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Factory Stock</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Warehouse Stock</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Floor Stock</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Stock Movement</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Returns</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Damage</button>
                      </div>
                    )}
                  </div>

                  {/* 6. PRODUCTION */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('PRODUCTION')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>PRODUCTION</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'PRODUCTION' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'PRODUCTION' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Batches</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Production</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ QC</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Finished Goods</button>
                      </div>
                    )}
                  </div>

                  {/* 7. DISPATCH */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('DISPATCH')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-teal-600" />
                        <span>DISPATCH</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'DISPATCH' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'DISPATCH' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Pending</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Loading</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Vehicles</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Drivers</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Adda</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Bilty</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ GRN</button>
                      </div>
                    )}
                  </div>

                  {/* 8. FIELD FORCE */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('FIELD_FORCE')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>FIELD FORCE</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'FIELD_FORCE' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'FIELD_FORCE' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('OPERATIONS', 'SALES_TEAM')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Visits</button>
                        <button onClick={() => navTo('REPORTS', 'SALES')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Orders</button>
                        <button onClick={() => navTo('REPORTS', 'RECOVERY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Recovery</button>
                        <button onClick={() => navTo('OPERATIONS', 'DEALERS_DISTRIBUTORS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Customers</button>
                        <button onClick={() => navTo('OPERATIONS', 'TARGET')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Performance</button>
                      </div>
                    )}
                  </div>

                  {/* 9. CLAIMS */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('CLAIMS')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-rose-600" />
                        <span>CLAIMS</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'CLAIMS' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'CLAIMS' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Returns</button>
                        <button onClick={() => navTo('REPORTS', 'STOCKS_WAREHOUSE')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Damage</button>
                        <button onClick={() => navTo('REPORTS', 'LEDGERS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Credit Notes</button>
                        <button onClick={() => navTo('REPORTS', 'LEDGERS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Debit Notes</button>
                      </div>
                    )}
                  </div>

                  {/* 10. REPORTS */}
                  <button
                    onClick={() => navTo('REPORTS', 'SALES')}
                    className="w-full text-left p-2 rounded-xl nm-btn text-slate-800 hover:text-teal-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-600" />
                      <span>REPORTS</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>

                  {/* 11. MASTERS */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('MASTERS')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-600" />
                        <span>MASTERS</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'MASTERS' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'MASTERS' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('OPERATIONS', 'BRANDS_PRODUCTS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Products</button>
                        <button onClick={() => navTo('OPERATIONS', 'BRANDS_PRODUCTS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ SKUs</button>
                        <button onClick={() => navTo('OPERATIONS', 'DEALERS_DISTRIBUTORS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Customers</button>
                        <button onClick={() => navTo('OPERATIONS', 'SALES_TEAM')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Users</button>
                        <button onClick={() => navTo('OPERATIONS', 'HIERARCHY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Territories</button>
                        <button onClick={() => navTo('OPERATIONS', 'BRANDS_PRODUCTS')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Pricing</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ Payment Methods</button>
                      </div>
                    )}
                  </div>

                  {/* 12. SETTINGS */}
                  <div className="nm-flat p-1 rounded-2xl border border-white space-y-1">
                    <button
                      onClick={() => toggleCategory('SETTINGS')}
                      className="w-full p-2 text-left flex items-center justify-between text-slate-800 hover:text-teal-700"
                    >
                      <div className="flex items-center gap-2">
                        <GitFork className="w-4 h-4 text-slate-600" />
                        <span>SETTINGS</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedCategory === 'SETTINGS' ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedCategory === 'SETTINGS' && (
                      <div className="pl-6 pr-2 pb-2 space-y-1 text-[11px] text-slate-600">
                        <button onClick={() => navTo('OPERATIONS', 'HIERARCHY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Roles</button>
                        <button onClick={() => navTo('OPERATIONS', 'HIERARCHY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Permissions</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Company</button>
                        <button onClick={() => { setIsDrawerOpen(false); onOpenAuditLogs(); }} className="w-full text-left py-1 hover:text-teal-800 font-semibold">├─ Audit</button>
                        <button onClick={() => navTo('OPERATIONS', 'COMPANY')} className="w-full text-left py-1 hover:text-teal-800 font-semibold">└─ System</button>
                      </div>
                    )}
                  </div>
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

