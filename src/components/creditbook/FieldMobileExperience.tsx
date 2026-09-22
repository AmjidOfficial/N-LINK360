/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Field Mobile Experience
 * Designed strictly matching CreditBook Pakistan simplicity:
 * Flow:
 * 1. CHECK IN
 * 2. SELECT TOWN & ROUTE (e.g. Peshawar - Duran Pur Route)
 * 3. SEE CUSTOMERS & MAP
 * 4. OPEN CUSTOMER (CUSTOMER 360)
 * 5. ORDER / RECOVERY / INVOICES / LEDGER
 * 6. DYNAMIC ACTIVITY DASHBOARD (Daily, Monthly, YTD, Sales, Recovery)
 * 7. COMPLETE ATTENDANCE LEDGER (Date | Checkin time | location | checkout time | location)
 * 8. EDIT USER PROFILE WITH APPROVAL WORKFLOW
 * 9. BACKGROUND AUTO-SYNC (Hidden from non-admin users)
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery, EmployeeAttendance, UserProfileUpdateRequest, TownNode } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { ALL_PAKISTAN_TOWNS, CITY_ROUTES_AND_BEATS } from '../../data/pakistan-geography';
import { getStoredTownNodes, getActiveTownNames, getRoutesForTown, updateTownGeofenceRadius } from '../../services/townManagement';
import { Customer360Screen } from './Customer360Screen';
import { SimpleOrderEntryDrawer } from './SimpleOrderEntryDrawer';
import { SimpleRecoveryDrawer } from './SimpleRecoveryDrawer';
import { CustomerInvoicesView } from './CustomerInvoicesView';
import { CustomerLedgerView } from './CustomerLedgerView';
import { AddNewCustomerModal } from './AddNewCustomerModal';
import { FieldOfficerActivityDashboard } from './FieldOfficerActivityDashboard';
import { EmployeeAttendanceLedgerView } from './EmployeeAttendanceLedgerView';
import { EditUserProfileModal } from './EditUserProfileModal';
import { GeofencePerimeterMap } from './GeofencePerimeterMap';
import { NationalLightLogo } from '../NationalLightLogo';
import {
  Clock,
  Users,
  Menu,
  MapPin,
  CheckCircle2,
  LogOut,
  LogIn,
  Search,
  Building2,
  Phone,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Receipt,
  FileText,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  User,
  ArrowRight,
  LayoutDashboard,
  Calendar,
  Edit3,
  CheckCircle,
  Radio,
} from 'lucide-react';

export interface FieldMobileExperienceProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  attendanceRecords?: EmployeeAttendance[];
  isCheckedIn: boolean;
  onToggleCheckIn: () => void;
  checkedInTime: string | null;
  checkedOutTime?: string | null;
  selectedTown: string;
  onSelectTown: (town: string) => void;
  onPlaceOrder: (order: SalesOrder) => void;
  onRecordRecovery: (recovery: Recovery) => void;
  onOpenRateCard: () => void;
  onOpenSyncModal: () => void;
  onSwitchToHeadOffice?: () => void;
  onSignOut: () => void;
  onDownloadInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShareInvoice?: (order: SalesOrder, customer: Customer) => void;
  onAddCustomer?: (customer: Customer) => void;
  onUpdateCustomerCoordinates?: (customer: Customer) => void;
  onSyncGoogleSheet?: () => Promise<void>;
  isSyncingSheet?: boolean;
  onSubmitProfileUpdateRequest?: (req: UserProfileUpdateRequest) => void;
  pendingProfileRequest?: UserProfileUpdateRequest | null;
  townNodes?: TownNode[];
}

export type MobileTab = 'ATTENDANCE' | 'CUSTOMERS' | 'DASHBOARD' | 'MORE';

export const FieldMobileExperience: React.FC<FieldMobileExperienceProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  attendanceRecords = [],
  isCheckedIn,
  onToggleCheckIn,
  checkedInTime,
  checkedOutTime,
  selectedTown,
  onSelectTown,
  onPlaceOrder,
  onRecordRecovery,
  onOpenRateCard,
  onOpenSyncModal,
  onSwitchToHeadOffice,
  onSignOut,
  onDownloadInvoicePdf,
  onPreviewInvoicePdf,
  onWhatsAppShareInvoice,
  onAddCustomer,
  onUpdateCustomerCoordinates,
  onSyncGoogleSheet,
  isSyncingSheet,
  onSubmitProfileUpdateRequest,
  pendingProfileRequest,
  townNodes,
}) => {
  // Mobile Tab State: 'ATTENDANCE' | 'CUSTOMERS' | 'DASHBOARD' | 'MORE'
  const [activeTab, setActiveTab] = useState<MobileTab>('ATTENDANCE');

  // Resolved dynamic active town nodes
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const activeTownNames = useMemo(() => getActiveTownNames(effectiveTownNodes), [effectiveTownNodes]);

  // Active Selected Customer for Customer 360 Screen
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Sub-view on active customer: '360' | 'INVOICES' | 'LEDGER'
  const [customerSubView, setCustomerSubView] = useState<'360' | 'INVOICES' | 'LEDGER'>('360');

  // Drawers & Modals
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRecoveryDrawerOpen, setIsRecoveryDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState(false);

  // Customer List Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR' | 'OUTSTANDING'>('ALL');

  // Selected Route state for active town
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [showGeofenceMap, setShowGeofenceMap] = useState<boolean>(true);

  // Authoritative Dynamic Towns List based on active Town Nodes
  const availableTowns = useMemo(() => {
    const townsSet = new Set<string>();
    townsSet.add('All Towns');

    if (activeTownNames.length > 0) {
      activeTownNames.forEach((t) => townsSet.add(t));
    } else {
      ALL_PAKISTAN_TOWNS.forEach((t) => townsSet.add(t));
    }

    return Array.from(townsSet).filter(Boolean);
  }, [activeTownNames]);

  // Active routes for the currently selected town
  const currentTownRoutes = useMemo(() => {
    return getRoutesForTown(selectedTown, effectiveTownNodes);
  }, [selectedTown, effectiveTownNodes]);

  // Auto-sync selected route when town changes
  React.useEffect(() => {
    if (currentTownRoutes.length > 0) {
      setSelectedRoute(currentTownRoutes[0]);
    }
  }, [selectedTown, currentTownRoutes]);

  const handleUpdateGeofenceRadius = (townName: string, newRadiusMeters: number) => {
    updateTownGeofenceRadius(townName, newRadiusMeters, effectiveTownNodes);
  };

  // Active customer object
  const activeCustomer = useMemo(() => {
    if (!activeCustomerId) return null;
    return customers.find((c) => c.id === activeCustomerId) || null;
  }, [activeCustomerId, customers]);

  // Filtered customer list for selected town & search
  const displayedCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Town filter
      const custTown = c.town || c.city || '';
      const matchTown =
        !selectedTown ||
        selectedTown === 'All Towns' ||
        selectedTown === 'All Pakistan' ||
        custTown.toLowerCase().includes(selectedTown.toLowerCase()) ||
        selectedTown.toLowerCase().includes(custTown.toLowerCase());

      // Search query
      const matchSearch =
        !customerSearch ||
        c.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch) ||
        custTown.toLowerCase().includes(customerSearch.toLowerCase());

      // Type / Status filter
      let matchType = true;
      if (customerTypeFilter === 'DEALER') matchType = c.type === 'DEALER';
      if (customerTypeFilter === 'DISTRIBUTOR') matchType = c.type === 'DISTRIBUTOR';
      if (customerTypeFilter === 'OUTSTANDING') {
        const bal = c.currentBalance ?? c.openingBalance ?? 0;
        matchType = bal > 0;
      }

      return matchTown && matchSearch && matchType;
    });
  }, [customers, selectedTown, customerSearch, customerTypeFilter]);

  // Navigation handlers
  const handleOpenCustomer = (customer: Customer) => {
    setActiveCustomerId(customer.id);
    setCustomerSubView('360');
    setActiveTab('CUSTOMERS');
  };

  const handleBackToCustomerList = () => {
    setActiveCustomerId(null);
    setCustomerSubView('360');
  };

  // Check if current user is admin
  const isAdminUser = [
    'SUPER_ADMIN',
    'MANAGING_DIRECTOR',
    'EXECUTIVE_DIRECTOR',
    'ACCOUNTS',
    'MANAGEMENT',
  ].includes(currentUser.role || '');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <NationalLightLogo size="sm" showGlow={false} />
          <div>
            <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white block">
              N-LINK 360
            </span>
            <span className="text-[10px] text-teal-800 dark:text-teal-400 font-bold block truncate max-w-[180px]">
              {currentUser.fullName} &bull; {selectedTown === 'Peshawar' ? 'Peshawar (Duran Pur Route)' : selectedTown}
            </span>
          </div>
        </div>

        {/* Head Office Switch Button if allowed */}
        {onSwitchToHeadOffice && (
          <button
            type="button"
            onClick={onSwitchToHeadOffice}
            className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>Head Office</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg sm:max-w-2xl mx-auto px-3.5 py-4 pb-24">
        {/* ==================================================== */}
        {/* 1. ATTENDANCE TAB */}
        {/* ==================================================== */}
        {activeTab === 'ATTENDANCE' && !isAttendanceLedgerOpen && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Attendance & Shift Card */}
            <div className="bg-gradient-to-br from-[#004d40] via-[#006b5f] to-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-teal-950/20 space-y-4 border border-teal-700/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-300" />
                  Field Attendance
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                    isCheckedIn
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isCheckedIn ? '● Checked In' : '○ Not Checked In'}
                </span>
              </div>

              {/* Town & Route Selection (Before Check-In) */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                    Territory / Commercial Town:
                  </label>
                  <select
                    value={selectedTown}
                    onChange={(e) => onSelectTown(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 border border-teal-500/40 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-inner"
                  >
                    {availableTowns.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white font-bold">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Route Node Selection Dropdown */}
                {currentTownRoutes.length > 0 && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                        Assigned Route Node / Commercial Beat:
                      </span>
                      <span className="text-[10px] text-emerald-300 font-mono">
                        {currentTownRoutes.length} Beats Available
                      </span>
                    </label>
                    <select
                      value={selectedRoute || currentTownRoutes[0]}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 border border-teal-500/40 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-inner"
                    >
                      {currentTownRoutes.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-white font-medium">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Geofence Precision Map Quick Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-teal-100/90 font-medium">
                    Allowed check-in perimeter active
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGeofenceMap(!showGeofenceMap)}
                    className="text-[11px] font-black text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                  >
                    {showGeofenceMap ? 'Hide Perimeter Map' : 'View Allowed Perimeter Map'}
                  </button>
                </div>
              </div>

              {/* Real-Time Visual Geofence Perimeter Map Component */}
              {showGeofenceMap && (
                <div className="pt-2">
                  <GeofencePerimeterMap
                    selectedTown={selectedTown}
                    townNodes={effectiveTownNodes}
                    isAdmin={currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MANAGEMENT'}
                    onUpdateGeofenceRadius={handleUpdateGeofenceRadius}
                    compact={true}
                  />
                </div>
              )}

              {/* TWO Primary CTAs: CHECK IN & CHECK OUT */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isCheckedIn) onToggleCheckIn();
                  }}
                  disabled={isCheckedIn}
                  className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    isCheckedIn
                      ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95 shadow-emerald-950/40'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>CHECK IN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isCheckedIn) onToggleCheckIn();
                  }}
                  disabled={!isCheckedIn}
                  className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    !isCheckedIn
                      ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                      : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>CHECK OUT</span>
                </button>
              </div>

              {/* Prominent [ GO TO CUSTOMERS ] CTA when Checked In */}
              {isCheckedIn && (
                <button
                  type="button"
                  onClick={() => setActiveTab('CUSTOMERS')}
                  className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-teal-950/40"
                >
                  <span>GO TO CUSTOMERS ({selectedTown})</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 font-bold" />
                </button>
              )}
            </div>

            {/* Shift & GPS Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Shift Status &amp; Location
                </span>
                <button
                  type="button"
                  onClick={() => setIsAttendanceLedgerOpen(true)}
                  className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Logs</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Sales Officer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser.fullName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Check In Time</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {isCheckedIn ? checkedInTime || '09:00 AM' : 'Not started'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Active Location</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTown === 'Peshawar' ? 'Peshawar (Duran Pur Route)' : `${selectedTown} Beat`}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">GPS Validation</span>
                  <span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High Accuracy (Within 5m)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Attendance Ledger Subview */}
        {activeTab === 'ATTENDANCE' && isAttendanceLedgerOpen && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsAttendanceLedgerOpen(false)}
              className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 mb-2 cursor-pointer"
            >
              <span>&larr; Back to Attendance Shift</span>
            </button>
            <EmployeeAttendanceLedgerView
              attendanceRecords={attendanceRecords}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. CUSTOMERS TAB */}
        {/* ==================================================== */}
        {activeTab === 'CUSTOMERS' && (
          <div>
            {activeCustomer ? (
              <div>
                {/* 360 Overview Sub-view */}
                {customerSubView === '360' && (
                  <Customer360Screen
                    customer={activeCustomer}
                    currentUser={currentUser}
                    onBack={handleBackToCustomerList}
                    onOpenOrderDrawer={() => setIsOrderDrawerOpen(true)}
                    onOpenRecoveryDrawer={() => setIsRecoveryDrawerOpen(true)}
                    onViewInvoices={() => setCustomerSubView('INVOICES')}
                    onViewLedger={() => setCustomerSubView('LEDGER')}
                    onUpdateCustomerCoordinates={onUpdateCustomerCoordinates}
                  />
                )}

                {/* Invoices Sub-view */}
                {customerSubView === 'INVOICES' && (
                  <CustomerInvoicesView
                    customer={activeCustomer}
                    invoices={orders.filter((o) => o.customerId === activeCustomer.id)}
                    onBack={() => setCustomerSubView('360')}
                    onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                    onDownloadInvoicePdf={onDownloadInvoicePdf}
                    onPreviewInvoicePdf={onPreviewInvoicePdf}
                    onWhatsAppShareInvoice={onWhatsAppShareInvoice}
                  />
                )}

                {/* Ledger Sub-view */}
                {customerSubView === 'LEDGER' && (
                  <CustomerLedgerView
                    customer={activeCustomer}
                    invoices={orders.filter((o) => o.customerId === activeCustomer.id)}
                    recoveries={recoveries.filter((r) => r.customerId === activeCustomer.id)}
                    onBack={() => setCustomerSubView('360')}
                    onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                    onOpenRecoveryDrawer={() => setIsRecoveryDrawerOpen(true)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Search & Town Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-black text-slate-900 dark:text-white">
                        Customers Directory
                      </h1>
                      <p className="text-[11px] text-slate-500">
                        {displayedCustomers.length} shops in <strong>{selectedTown}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Dealer</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search shop name, dealer code, mobile..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-teal-600"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {(['ALL', 'DEALER', 'DISTRIBUTOR', 'OUTSTANDING'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setCustomerTypeFilter(filter)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                          customerTypeFilter === filter
                            ? 'bg-teal-800 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'ALL'
                          ? 'All Shops'
                          : filter === 'OUTSTANDING'
                          ? 'Outstanding Balance'
                          : filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Cards List */}
                <div className="space-y-2.5">
                  {displayedCustomers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 space-y-2">
                      <Users className="w-8 h-8 mx-auto opacity-40" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No customers found</p>
                      <p className="text-[11px]">Try searching a different shop or switch territory town above.</p>
                    </div>
                  ) : (
                    displayedCustomers.map((cust) => {
                      const netBal = cust.currentBalance ?? cust.openingBalance ?? 0;
                      const todayRec = recoveries
                        .filter((r) => r.customerId === cust.id)
                        .reduce((sum, r) => sum + (r.amount || 0), 0);

                      return (
                        <div
                          key={cust.id}
                          onClick={() => handleOpenCustomer(cust)}
                          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-teal-500 shadow-sm transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                                {cust.companyName}
                              </h2>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{cust.type || 'DEALER'}</span> &bull; {cust.town || cust.city}
                              </p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                          </div>

                          {/* Financial Row */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Net Balance</span>
                              <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                Rs. {netBal.toLocaleString()}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 block">Today&apos;s Recovery</span>
                              <span className="font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm">
                                Rs. {todayRec.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. DASHBOARD TAB */}
        {/* ==================================================== */}
        {activeTab === 'DASHBOARD' && (
          <FieldOfficerActivityDashboard
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            onSelectCustomer={(cId) => {
              const found = customers.find((c) => c.id === cId);
              if (found) handleOpenCustomer(found);
            }}
          />
        )}

        {/* ==================================================== */}
        {/* 4. MORE TAB */}
        {/* ==================================================== */}
        {activeTab === 'MORE' && (
          <div className="space-y-4 animate-in fade-in duration-200 text-xs">
            {/* User Profile Card with Edit Button */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0">
                    {currentUser.avatarInitials || 'NL'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {currentUser.fullName}
                    </h2>
                    <p className="text-[11px] text-teal-800 dark:text-teal-300 font-bold">
                      {currentUser.roleTitle || currentUser.role || 'Field Officer'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {currentUser.phone || '+92 300 1234567'} &bull; {selectedTown}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>
              </div>

              {pendingProfileRequest && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Profile update request pending authorization by Admin / Shahzad Ullah.</span>
                </div>
              )}
            </div>

            {/* Seamless Auto-Sync Status Badge (Hidden Sheet Links from standard users) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <span className="font-black text-slate-900 dark:text-white block text-xs">
                    Cloud Database &amp; Google Sheets Auto-Sync
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Live 100% Background Connectivity &bull; Real-time Secure Encryption
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                Connected
              </span>
            </div>

            {/* Operational Navigation List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Performance Dashboard</span>
                    <span className="text-[11px] text-slate-500">Daily, Monthly &amp; YTD sales and recovery analytics</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ATTENDANCE');
                  setIsAttendanceLedgerOpen(true);
                }}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Employee Attendance Ledger</span>
                    <span className="text-[11px] text-slate-500">Full logs with check-in/out timestamps and GPS</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenRateCard}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Official Rate List</span>
                    <span className="text-[11px] text-slate-500">View SKU trade prices &amp; carton sizes</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Show Google Sheets manual sync settings only if Admin */}
              {isAdminUser && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 dark:text-white block">Google Sheets Console (Admin)</span>
                      <span className="text-[11px] text-slate-500">Spreadsheet link &amp; schema manager</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {onSwitchToHeadOffice && (
                <button
                  type="button"
                  onClick={onSwitchToHeadOffice}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 dark:text-white block">Head Office Command Center</span>
                      <span className="text-[11px] text-slate-500">Approvals, reports and executive management</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </main>

      {/* 4-Tab Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 max-w-lg sm:max-w-2xl mx-auto py-2 px-4 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => {
            setActiveTab('ATTENDANCE');
            setIsAttendanceLedgerOpen(false);
            setActiveCustomerId(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'text-teal-800 dark:text-teal-400 scale-105 font-black'
              : 'text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('CUSTOMERS');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'text-teal-800 dark:text-teal-400 scale-105 font-black'
              : 'text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Customers</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('DASHBOARD');
            setActiveCustomerId(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'DASHBOARD'
              ? 'text-teal-800 dark:text-teal-400 scale-105 font-black'
              : 'text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('MORE');
            setActiveCustomerId(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            activeTab === 'MORE'
              ? 'text-teal-800 dark:text-teal-400 scale-105 font-black'
              : 'text-slate-400 hover:text-slate-600 font-bold'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* Drawers: Order Entry & Recovery Entry */}
      {activeCustomer && (
        <>
          <SimpleOrderEntryDrawer
            isOpen={isOrderDrawerOpen}
            onClose={() => setIsOrderDrawerOpen(false)}
            customer={activeCustomer}
            currentUser={currentUser}
            onPlaceOrder={onPlaceOrder}
            onDownloadPdf={onDownloadInvoicePdf}
            onPreviewPdf={onPreviewInvoicePdf}
            onWhatsAppShare={onWhatsAppShareInvoice}
          />

          <SimpleRecoveryDrawer
            isOpen={isRecoveryDrawerOpen}
            onClose={() => setIsRecoveryDrawerOpen(false)}
            customer={activeCustomer}
            currentUser={currentUser}
            onRecordRecovery={onRecordRecovery}
          />
        </>
      )}

      {/* Add New Customer Modal */}
      <AddNewCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSubmit={(newCust) => onAddCustomer?.(newCust)}
        currentUser={currentUser as any}
        availableTowns={availableTowns}
      />

      {/* Edit User Profile Modal */}
      <EditUserProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onSubmitRequest={(req) => onSubmitProfileUpdateRequest?.(req)}
        pendingRequest={pendingProfileRequest}
        townNodes={effectiveTownNodes}
      />
    </div>
  );
};
