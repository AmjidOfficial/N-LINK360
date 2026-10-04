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
import { DealerCreditHealthMap } from '../d3/DealerCreditHealthMap';
import { NationalLightLogo } from '../NationalLightLogo';
import { findNearestTown } from '../../utils/geoUtils';
import { triggerHaptic } from '../../utils/haptics';
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
  Share2,
  ShoppingBag,
  Wallet,
  BookOpen,
  Sparkles,
  X,
  MoreHorizontal,
  Navigation,
  Eye,
  MessageSquare,
} from 'lucide-react';

export interface FieldMobileExperienceProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  attendanceRecords?: EmployeeAttendance[];
  isCheckedIn: boolean;
  onCheckIn: (town: string) => void;
  onCheckOut: (town: string) => void;
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
  ledgerEntries?: any[];
  onOpenShareModal?: () => void;
}

export type MobileTab = 'ATTENDANCE' | 'CUSTOMERS' | 'DASHBOARD' | 'ORDERING' | 'RECOVERY' | 'INVOICES' | 'LEDGER' | 'MORE';

export const FieldMobileExperience: React.FC<FieldMobileExperienceProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  attendanceRecords = [],
  isCheckedIn,
  onCheckIn,
  onCheckOut,
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
  ledgerEntries = [],
  onOpenShareModal,
}) => {
  // Mobile Tab State: 'CUSTOMERS' | 'ORDERING' | 'RECOVERY' | 'INVOICES' | 'LEDGER' | 'MORE'
  const [activeTab, setActiveTab] = useState<MobileTab>('CUSTOMERS');

  // Resolved dynamic active town nodes
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const activeTownNames = useMemo(() => getActiveTownNames(effectiveTownNodes), [effectiveTownNodes]);

  // Active Selected Customer for Customer 360 Screen
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Sub-view on active customer: '360' | 'INVOICES' | 'LEDGER'
  const [customerSubView, setCustomerSubView] = useState<'360' | 'INVOICES' | 'LEDGER'>('360');

  // Customer for Etc Actions Sheet
  const [etcCustomer, setEtcCustomer] = useState<Customer | null>(null);

  // Drawers & Modals
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRecoveryDrawerOpen, setIsRecoveryDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState(false);

  // Customer List Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR' | 'OUTSTANDING'>('ALL');
  const [customerViewMode, setCustomerViewMode] = useState<'LIST' | 'MAP' | 'SPLIT'>('SPLIT');

  // Selected Route state for active town
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [showGeofenceMap, setShowGeofenceMap] = useState<boolean>(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);

  // Auto-detect nearest town on mount if not checked in yet
  React.useEffect(() => {
    if (!isCheckedIn && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearest = findNearestTown(latitude, longitude);
          if (nearest && availableTowns.includes(nearest)) {
            onSelectTown(nearest);
          }
        },
        null,
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const handleAutoDetectTown = () => {
    if (!navigator.geolocation) {
      setGpsToast('GPS Geolocation is not supported by your device.');
      setTimeout(() => setGpsToast(null), 4000);
      return;
    }
    setIsDetectingLocation(true);
    triggerHaptic('light');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestTown(latitude, longitude);
        if (nearest) {
          onSelectTown(nearest);
          triggerHaptic('success');
          setGpsToast(`📍 Auto-detected nearest town: ${nearest}`);
          setTimeout(() => setGpsToast(null), 4000);
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        console.warn('GPS detection failed:', error);
        triggerHaptic('warning');
        setGpsToast('Could not acquire high-accuracy GPS. Please select town from dropdown.');
        setTimeout(() => setGpsToast(null), 4000);
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
    return (
      customers.find(
        (c) =>
          c.id === activeCustomerId ||
          c.customerCode === activeCustomerId ||
          (c.companyName && c.companyName.toLowerCase() === activeCustomerId.toLowerCase())
      ) || null
    );
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

  // Quick Action Picker State ('ORDER' | 'RECOVERY' | 'INVOICES' | 'LEDGER')
  const [quickActionPicker, setQuickActionPicker] = useState<'ORDER' | 'RECOVERY' | 'INVOICES' | 'LEDGER' | null>(null);
  const [quickPickerSearch, setQuickPickerSearch] = useState('');

  // Top Market Balance & Collection Metrics
  const totalMarketOutstanding = useMemo(() => {
    return displayedCustomers.reduce((sum, c) => sum + (c.currentBalance ?? c.openingBalance ?? 0), 0);
  }, [displayedCustomers]);

  const totalTodayRecoveryInTown = useMemo(() => {
    const custIds = new Set(displayedCustomers.map((c) => c.id));
    return recoveries
      .filter((r) => custIds.has(r.customerId))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [displayedCustomers, recoveries]);

  const withBalanceCount = useMemo(() => {
    return displayedCustomers.filter((c) => (c.currentBalance ?? c.openingBalance ?? 0) > 0).length;
  }, [displayedCustomers]);

  // Navigation handlers
  const handleOpenCustomer = (customer: Customer) => {
    triggerHaptic('medium');
    setActiveCustomerId(customer.id || customer.customerCode);
    setCustomerSubView('360');
    setActiveTab('CUSTOMERS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenOrderForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    setActiveCustomerId(cust.id || cust.customerCode);
    setIsOrderDrawerOpen(true);
  };

  const handleOpenRecoveryForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    setActiveCustomerId(cust.id || cust.customerCode);
    setIsRecoveryDrawerOpen(true);
  };

  const handleOpenInvoicesForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection');
    setActiveCustomerId(cust.id || cust.customerCode);
    setCustomerSubView('INVOICES');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLedgerForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection');
    setActiveCustomerId(cust.id || cust.customerCode);
    setCustomerSubView('LEDGER');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEtcForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    setEtcCustomer(cust);
  };

  const handleBackToCustomerList = () => {
    triggerHaptic('light');
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
            <span className="text-[10px] text-teal-800 dark:text-teal-400 font-bold block truncate max-w-[170px] sm:max-w-[220px]">
              {currentUser.fullName} &bull; {selectedTown === 'Peshawar' ? 'Peshawar (Duran Pur Route)' : selectedTown}
            </span>
          </div>
        </div>

        {/* Header Quick Actions (Share Link & Switch to Desktop) */}
        <div className="flex items-center gap-1.5">
          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="Share team working link on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline text-[11px]">Share</span>
            </button>
          )}

          {onSwitchToHeadOffice && (
            <button
              type="button"
              onClick={onSwitchToHeadOffice}
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
              title="Switch to Head Office Command Center"
            >
              <span>Desktop Web</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </header>

      {/* GPS Status Toast */}
      {gpsToast && (
        <div className="sticky top-14 z-30 mx-4 my-2 p-2.5 bg-teal-900 text-white rounded-xl shadow-lg border border-teal-500/40 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <span>{gpsToast}</span>
          <button
            type="button"
            onClick={() => setGpsToast(null)}
            className="text-white/80 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

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

              {/* Town & Route Selection (Flexible, Not Fixed - User can adjust anytime) */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                      Active Town / Territory:
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectTown}
                      disabled={isDetectingLocation}
                      className="px-2.5 py-1 rounded-lg bg-teal-900/80 hover:bg-teal-800 text-[10px] font-black uppercase tracking-wide border border-teal-600/40 hover:border-teal-500 text-teal-300 flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Auto-detect town using device live GPS"
                    >
                      <Radio className={`w-3 h-3 ${isDetectingLocation ? 'animate-pulse text-emerald-400' : 'text-teal-400'}`} />
                      <span>{isDetectingLocation ? 'GPS Syncing...' : 'Auto-Get via GPS'}</span>
                    </button>
                  </div>
                  <select
                    value={selectedTown}
                    onChange={(e) => onSelectTown(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 border border-teal-500/40 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner cursor-pointer"
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
                      className="w-full p-3 bg-slate-900/90 border border-teal-500/40 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner cursor-pointer"
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
                    Allowed check-in perimeter active ({selectedTown})
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

              {/* CHECK-IN ACTION (Separated distinct container) */}
              {!isCheckedIn && (
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      onCheckIn(selectedTown);
                    }}
                    className="w-full min-h-[52px] py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer shadow-emerald-950/20"
                  >
                    <LogIn className="w-5 h-5 text-slate-950 stroke-[3]" />
                    <span>CHECK IN &amp; START SHIFT ({selectedTown})</span>
                  </button>
                </div>
              )}

              {/* ACTIVE SHIFT NAVIGATION */}
              {isCheckedIn && (
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab('CUSTOMERS');
                    }}
                    className="w-full min-h-[52px] py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-teal-950/30"
                  >
                    <span>GO TO DEALERS &amp; COMMENCE VISITS</span>
                    <ArrowRight className="w-4 h-4 text-slate-950 font-bold" />
                  </button>
                </div>
              )}
            </div>

            {/* SEPARATE CHECK-OUT CARD (Completely separated card for signing out) */}
            {isCheckedIn && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-rose-200 dark:border-rose-950 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
                    <LogOut className="w-4 h-4" />
                    <span>End Shift Terminal (Check-Out)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Checked in at: {checkedInTime || '09:00 AM'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready to conclude today&apos;s field rounds? Concluding your shift will log your final check-out timestamp and calculate total active hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('heavy');
                    onCheckOut(selectedTown);
                  }}
                  className="w-full min-h-[50px] py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>CHECK OUT &amp; CONCLUDE TODAY&apos;S SHIFT</span>
                </button>
              </div>
            )}

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
              orders={orders}
              recoveries={recoveries}
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
                    orders={orders}
                    recoveries={recoveries}
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
                    currentUser={currentUser}
                    orders={orders}
                    invoices={orders}
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
                    currentUser={currentUser}
                    orders={orders}
                    invoices={orders}
                    recoveries={recoveries}
                    ledgerEntries={ledgerEntries}
                    onBack={() => setCustomerSubView('360')}
                    onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                    onOpenRecoveryDrawer={() => setIsRecoveryDrawerOpen(true)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* 1. STREAMLINED TOP COMMAND BAR (Clean, Uncluttered, Fast) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  {/* Top Line: Territory Town Selector & New Dealer Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                            {selectedTown} Beat
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            ({displayedCustomers.length} Shops)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick Town Switch Dropdown */}
                      <select
                        value={selectedTown}
                        onChange={(e) => {
                          triggerHaptic('selection');
                          onSelectTown(e.target.value);
                        }}
                        className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                        title="Switch territory town"
                      >
                        {availableTowns.filter((t) => t !== 'All Towns').map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Dealer</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Prominent Clickable Quick Action Buttons for the Active Town */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('RECOVERY');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Collect daily cash recovery"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/90 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Daily Recovery</span>
                        <span className="block text-[9px] text-emerald-200 font-medium mt-0.5 truncate">Collect Wasooli</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('ORDER');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Book daily sales order"
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-700/90 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Daily Ordering</span>
                        <span className="block text-[9px] text-teal-200 font-medium mt-0.5 truncate">Book SKUs</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('INVOICES');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-2xl bg-sky-800 hover:bg-sky-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="View invoices and bills"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-700/90 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Invoices</span>
                        <span className="block text-[9px] text-sky-200 font-medium mt-0.5 truncate">Bills &amp; PDF</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('LEDGER');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="View Khata ledger statement"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-700/90 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Khata Ledgers</span>
                        <span className="block text-[9px] text-slate-300 font-medium mt-0.5 truncate">Passbook</span>
                      </div>
                    </button>
                  </div>

                  {/* Compact Financial Status Ribbon */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">
                      Market Balance: <strong className="font-mono text-teal-900 dark:text-teal-200 font-black">Rs. {totalMarketOutstanding.toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Today&apos;s Wasooli: <strong className="font-mono font-black">Rs. {totalTodayRecoveryInTown.toLocaleString()}</strong>
                    </span>
                  </div>

                  {/* Search Bar + Quick Filter Chips + Map/List View Toggle */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search shop, dealer code, mobile..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-600 transition-colors"
                        />
                        {customerSearch && (
                          <button
                            type="button"
                            onClick={() => setCustomerSearch('')}
                            className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setCustomerViewMode('LIST')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
                            customerViewMode === 'LIST'
                              ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500'
                          }`}
                        >
                          List
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerViewMode('MAP')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
                            customerViewMode === 'MAP'
                              ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500'
                          }`}
                        >
                          🗺️ Map
                        </button>
                      </div>
                    </div>

                    {/* Filter Category Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                      {(['ALL', 'OUTSTANDING', 'DEALER', 'DISTRIBUTOR'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setCustomerTypeFilter(filter)}
                          className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                            customerTypeFilter === filter
                              ? 'bg-teal-800 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {filter === 'ALL'
                            ? `All (${displayedCustomers.length})`
                            : filter === 'OUTSTANDING'
                            ? `With Balance (${withBalanceCount})`
                            : filter === 'DEALER'
                            ? 'Retailers'
                            : 'Distributors'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. D3 MAP OR CUSTOMER CARDS LIST */}
                {customerViewMode === 'MAP' ? (
                  <DealerCreditHealthMap
                    customers={displayedCustomers}
                    invoices={orders as any}
                    recoveries={recoveries}
                    onSelectDealer={(dealer) => handleOpenCustomer(dealer)}
                    selectedDealerId={activeCustomerId}
                    height={440}
                  />
                ) : (
                  <div className="space-y-3">
                    {displayedCustomers.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 space-y-2">
                        <Users className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">No customers found</p>
                        <p className="text-[11px]">Try searching a different shop or switch territory town above.</p>
                      </div>
                    ) : (
                      displayedCustomers.map((cust) => {
                        const netBal = cust.currentBalance ?? cust.openingBalance ?? 0;
                        const creditLimit = cust.creditLimit || 350000;
                        const limitUtil = creditLimit > 0 ? Math.min(100, Math.round((netBal / creditLimit) * 100)) : 0;
                        const hasPhone = Boolean(cust.phone && cust.phone.trim().length > 5);

                        return (
                          <div
                            key={cust.id}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all space-y-3"
                          >
                            {/* Card Header (Tap to open full 360 profile) */}
                            <div
                              onClick={() => handleOpenCustomer(cust)}
                              className="flex items-start justify-between cursor-pointer group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                                    {cust.companyName}
                                  </h3>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {cust.customerCode || 'DL-CUST'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                                    {cust.type || 'DEALER'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                                  <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                    <Building2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                                    {cust.contactPerson || 'Proprietor'}
                                  </span>
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {cust.town || cust.city}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                {hasPhone && (
                                  <a
                                    href={`tel:${cust.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-600 hover:text-teal-700 dark:hover:text-teal-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 transition-colors active:scale-95"
                                    title="Call Dealer"
                                  >
                                    <Phone className="w-4 h-4" />
                                  </a>
                                )}
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-teal-600 transition-colors">
                                  <ChevronRight className="w-5 h-5" />
                                </div>
                              </div>
                            </div>

                            {/* Financial Exposure Balance Bar */}
                            <div
                              onClick={() => handleOpenCustomer(cust)}
                              className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                  Net Ledger Balance
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                  <span
                                    className={`text-base font-black font-mono ${
                                      netBal > 0
                                        ? 'text-teal-900 dark:text-teal-200'
                                        : 'text-emerald-700 dark:text-emerald-400'
                                    }`}
                                  >
                                    Rs. {netBal.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">PKR</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                  Sanctioned Limit
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 block mt-0.5">
                                  Rs. {creditLimit.toLocaleString()} ({limitUtil}%)
                                </span>
                              </div>
                            </div>

                            {/* 5 CLICKABLE ACTION BUTTONS (Daily Recovery, Daily Ordering, Invoices, Ledgers & Etc) */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                              {/* 1. Daily Recovery Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenRecoveryForCustomer(cust, e)}
                                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
                                title="Collect cash or cheque recovery"
                              >
                                <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Daily Recovery</span>
                              </button>

                              {/* 2. Daily Ordering Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenOrderForCustomer(cust, e)}
                                className="min-h-[44px] px-2.5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
                                title="Book sales order for this shop"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Daily Ordering</span>
                              </button>

                              {/* 3. Invoices Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenInvoicesForCustomer(cust, e)}
                                className="min-h-[44px] px-2 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-200 dark:border-sky-800 transition-all active:scale-95 cursor-pointer touch-manipulation"
                                title="View invoices and PDF bills"
                              >
                                <Receipt className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                                <span>Invoices</span>
                              </button>

                              {/* 4. Khata Ledger Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenLedgerForCustomer(cust, e)}
                                className="min-h-[44px] px-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-95 cursor-pointer touch-manipulation"
                                title="View full running ledger statement"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                                <span>Ledgers</span>
                              </button>

                              {/* 5. Etc & More Actions Button */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenEtcForCustomer(cust, e)}
                                className="col-span-2 sm:col-span-1 min-h-[44px] px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200/70 dark:border-slate-700 transition-all active:scale-95 cursor-pointer touch-manipulation"
                                title="All actions: WhatsApp, Call, Map, Invoices, Ledger, Dossier"
                              >
                                <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span>Etc Actions</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Action Dealer Picker Sheet Modal */}
        {quickActionPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    quickActionPicker === 'ORDER'
                      ? 'bg-teal-800'
                      : quickActionPicker === 'RECOVERY'
                      ? 'bg-emerald-700'
                      : quickActionPicker === 'INVOICES'
                      ? 'bg-sky-800'
                      : 'bg-slate-800'
                  }`}>
                    {quickActionPicker === 'ORDER' ? (
                      <ShoppingBag className="w-4 h-4" />
                    ) : quickActionPicker === 'RECOVERY' ? (
                      <Wallet className="w-4 h-4" />
                    ) : quickActionPicker === 'INVOICES' ? (
                      <Receipt className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-800 dark:text-teal-400">
                      {quickActionPicker === 'ORDER'
                        ? 'Daily Ordering'
                        : quickActionPicker === 'RECOVERY'
                        ? 'Daily Recovery'
                        : quickActionPicker === 'INVOICES'
                        ? 'Invoices & Bills'
                        : 'Khata & Ledgers'}
                    </span>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">
                      Select Dealer / Shop to Proceed
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuickActionPicker(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={quickPickerSearch}
                    onChange={(e) => setQuickPickerSearch(e.target.value)}
                    placeholder="Search shop name, dealer code..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-teal-600 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Filtered Dealers List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {displayedCustomers
                  .filter((c) =>
                    !quickPickerSearch ||
                    c.companyName.toLowerCase().includes(quickPickerSearch.toLowerCase()) ||
                    c.customerCode.toLowerCase().includes(quickPickerSearch.toLowerCase()) ||
                    (c.contactPerson || '').toLowerCase().includes(quickPickerSearch.toLowerCase())
                  )
                  .map((cust) => {
                    const netBal = cust.currentBalance ?? cust.openingBalance ?? 0;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                          const action = quickActionPicker;
                          setQuickActionPicker(null);
                          if (action === 'ORDER') handleOpenOrderForCustomer(cust);
                          else if (action === 'RECOVERY') handleOpenRecoveryForCustomer(cust);
                          else if (action === 'INVOICES') handleOpenInvoicesForCustomer(cust);
                          else if (action === 'LEDGER') handleOpenLedgerForCustomer(cust);
                        }}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-teal-50/50 dark:bg-slate-800/40 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
                            {cust.companyName}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {cust.customerCode} &bull; {cust.contactPerson || 'Proprietor'} &bull; {cust.town || cust.city}
                          </p>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <span className="font-mono font-black text-xs text-teal-800 dark:text-teal-300 block">
                            Rs. {netBal.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">
                            Balance
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
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
            onOpenNewOrder={() => setQuickActionPicker('ORDER')}
            onOpenRecordRecovery={() => setQuickActionPicker('RECOVERY')}
            onOpenInvoices={() => setQuickActionPicker('INVOICES')}
            onOpenLedger={() => setQuickActionPicker('LEDGER')}
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

              {/* Share Team Working Link */}
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 dark:text-white block">Share Team Working Link</span>
                      <span className="text-[11px] text-slate-500">Send WhatsApp invite link &amp; scan QR code</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 max-w-lg sm:max-w-2xl mx-auto py-1 px-4 flex items-center justify-around shadow-lg pb-safe">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setActiveTab('ATTENDANCE');
            setIsAttendanceLedgerOpen(false);
            setActiveCustomerId(null);
          }}
          className={`min-h-[52px] min-w-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
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
            triggerHaptic('selection');
            setActiveTab('CUSTOMERS');
          }}
          className={`min-h-[52px] min-w-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
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
            triggerHaptic('selection');
            setActiveTab('DASHBOARD');
            setActiveCustomerId(null);
          }}
          className={`min-h-[52px] min-w-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
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
            triggerHaptic('selection');
            setActiveTab('MORE');
            setActiveCustomerId(null);
          }}
          className={`min-h-[52px] min-w-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
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

      {/* Etc Customer Quick Action Bottom Sheet */}
      {etcCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 max-h-[90vh]">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {etcCustomer.companyName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {etcCustomer.customerCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {etcCustomer.contactPerson || 'Proprietor'} &bull; {etcCustomer.town || etcCustomer.city} &bull; {etcCustomer.phone || 'No phone'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEtcCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Ledger Snapshot Bar */}
            <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  Net Ledger Balance
                </span>
                <span className="text-base font-black font-mono text-teal-900 dark:text-teal-200">
                  Rs. {(etcCustomer.currentBalance ?? etcCustomer.openingBalance ?? 0).toLocaleString()} PKR
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  Sanctioned Limit
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  Rs. {(etcCustomer.creditLimit || 350000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Items List */}
            <div className="p-4 space-y-2 overflow-y-auto text-xs">
              {/* 1. WhatsApp Statement */}
              <button
                type="button"
                onClick={() => {
                  const net = etcCustomer.currentBalance ?? etcCustomer.openingBalance ?? 0;
                  const limit = etcCustomer.creditLimit || 350000;
                  const text = `Assalam-o-Alaikum ${etcCustomer.contactPerson || etcCustomer.companyName},\n\nThis is ${currentUser.fullName} from National Lights.\n\n*Khata Statement for ${etcCustomer.companyName}:*\n- Customer Code: ${etcCustomer.customerCode}\n- Net Ledger Balance: Rs. ${net.toLocaleString()} PKR\n- Sanctioned Credit Limit: Rs. ${limit.toLocaleString()} PKR\n\nPlease let us know if you have any order booking requirements or payment updates. Thank you!`;
                  const raw = (etcCustomer.phone || '').replace(/[^0-9]/g, '');
                  const waNumber = raw.startsWith('0') ? '92' + raw.slice(1) : raw;
                  const url = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                  setEtcCustomer(null);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-900 dark:text-emerald-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">WhatsApp Khata Statement</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Send 1-tap balance summary on WhatsApp</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </button>

              {/* 2. Direct Call */}
              {etcCustomer.phone && (
                <a
                  href={`tel:${etcCustomer.phone}`}
                  onClick={() => setEtcCustomer(null)}
                  className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xs block">Call Shop Proprietor</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{etcCustomer.phone}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              )}

              {/* 3. Google Maps / Route Navigation */}
              <button
                type="button"
                onClick={() => {
                  const query = etcCustomer.latitude && etcCustomer.longitude
                    ? `${etcCustomer.latitude},${etcCustomer.longitude}`
                    : encodeURIComponent(`${etcCustomer.companyName} ${etcCustomer.town || etcCustomer.city || ''}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                  setEtcCustomer(null);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">Shop Location &amp; Directions</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Open GPS pin on Google Maps</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* 4. Invoices & Bills */}
              <button
                type="button"
                onClick={() => {
                  const target = etcCustomer;
                  setEtcCustomer(null);
                  handleOpenInvoicesForCustomer(target);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-sky-900 dark:text-sky-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">View Invoices &amp; Bills</span>
                    <span className="text-[10px] text-sky-700 dark:text-sky-300">Commercial bills and downloadable PDFs</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-500" />
              </button>

              {/* 5. Khata Ledger Statement */}
              <button
                type="button"
                onClick={() => {
                  const target = etcCustomer;
                  setEtcCustomer(null);
                  handleOpenLedgerForCustomer(target);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">Khata Ledger Statement</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Chronological running balance Khata</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* 6. Full Customer 360 Dossier */}
              <button
                type="button"
                onClick={() => {
                  const target = etcCustomer;
                  setEtcCustomer(null);
                  handleOpenCustomer(target);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">View Full 360 Dossier</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Complete transaction history, credit health &amp; profile</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
