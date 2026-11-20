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

import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import {
  CreditNote,
  Customer,
  CustomerVisit,
  SalesOrder,
  Recovery,
  EmployeeAttendance,
  StockReturn,
  Target,
  UserProfileUpdateRequest,
  TownNode,
} from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { ALL_PAKISTAN_TOWNS, CITY_ROUTES_AND_BEATS } from '../../data/pakistan-geography';
import { getStoredTownNodes, getActiveTownNames, getRoutesForTown, updateTownGeofenceRadius, normalizeTownName } from '../../services/townManagement';
import { generateUniqueRecoveryId } from '../../utils/idGenerator';
import { SimpleOrderEntryDrawer } from './SimpleOrderEntryDrawer';
import { SimpleRecoveryDrawer } from './SimpleRecoveryDrawer';
import { AddNewCustomerModal } from './AddNewCustomerModal';
import { MobileHomeDashboardView } from './MobileHomeDashboardView';
import { EditUserProfileModal } from './EditUserProfileModal';
import { NationalLightHeaderBrand } from '../NationalLightLogo';
import { EditOrDeleteEntryModal } from './EditOrDeleteEntryModal';
import { canUserEditEntry, canUserDeleteEntry } from '../../utils/entryManagement';
import { NationalLightLogo } from '../NationalLightLogo';
import { findNearestTown } from '../../utils/geoUtils';
import { triggerHaptic } from '../../utils/haptics';
import { NatureSkeleton } from '../ui/NatureSkeleton';
import { BrandHeader } from '../BrandHeader';
import { getCanonicalDashboardRole } from '../../lib/permissions';
import { RoleBasedDashboardShell } from '../dashboard/engine';
import { exportSalesSummaryCsv } from '../../utils/reportExport';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Customer360Screen = React.lazy(() => import('./Customer360Screen').then((m) => ({ default: m.Customer360Screen })));
const BulkSkuOrderForm = React.lazy(() => import('./BulkSkuOrderForm').then((m) => ({ default: m.BulkSkuOrderForm })));
const CustomerInvoicesView = React.lazy(() => import('./CustomerInvoicesView').then((m) => ({ default: m.CustomerInvoicesView })));
const OrderHistoryView = React.lazy(() => import('./OrderHistoryView').then((m) => ({ default: m.OrderHistoryView })));
const CustomerLedgerView = React.lazy(() => import('./CustomerLedgerView').then((m) => ({ default: m.CustomerLedgerView })));
const MobileRecoveryCustomerLedgerView = React.lazy(() => import('./MobileRecoveryCustomerLedgerView').then((m) => ({ default: m.MobileRecoveryCustomerLedgerView })));
const GeofencePerimeterMap = React.lazy(() => import('./GeofencePerimeterMap').then((m) => ({ default: m.GeofencePerimeterMap })));
const EmployeeAttendanceLedgerView = React.lazy(() => import('./EmployeeAttendanceLedgerView').then((m) => ({ default: m.EmployeeAttendanceLedgerView })));
const MobileAttendanceGpsScreen = React.lazy(() => import('./MobileAttendanceGpsScreen').then((m) => ({ default: m.MobileAttendanceGpsScreen })));
const DealerCreditHealthMap = React.lazy(() => import('../d3/DealerCreditHealthMap').then((m) => ({ default: m.DealerCreditHealthMap })));
import {
  Download,
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
  Bell,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  ArrowUpDown,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react';
import { MoreActionsMenu } from '../ui/MoreActionsMenu';

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
  visits?: CustomerVisit[];
  creditNotes?: CreditNote[];
  stockReturns?: StockReturn[];
  targets?: Target[];
  onOpenShareModal?: () => void;
  onApproveOrder?: (orderId: string, approver?: any) => void;
  onApproveRecovery?: (recoveryId: string, approver?: any) => void;
  onCancelOrReverseOrder?: (orderId: string, reason: string) => void;
  onSaveOrderEdit?: (orderId: string, updates: Partial<SalesOrder>) => void;
  onCancelOrReverseRecovery?: (recoveryId: string, reason: string) => void;
  onSaveRecoveryEdit?: (recoveryId: string, updates: Partial<Recovery>) => void;
  onSaveAttendanceEdit?: (recordId: string, updates: Partial<EmployeeAttendance>) => void;
  onDeleteAttendance?: (recordId: string, reason?: string) => void;
  onOpenSalesAuditModal?: () => void;
  onOpenChangePassword?: () => void;
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
  visits = [],
  creditNotes = [],
  stockReturns = [],
  targets = [],
  onOpenShareModal,
  onApproveOrder,
  onApproveRecovery,
  onCancelOrReverseOrder,
  onSaveOrderEdit,
  onCancelOrReverseRecovery,
  onSaveRecoveryEdit,
  onSaveAttendanceEdit,
  onDeleteAttendance,
  onOpenSalesAuditModal,
  onOpenChangePassword,
}) => {
  // Mobile Tab State: 'DASHBOARD' | 'ATTENDANCE' | 'ORDERING' | 'INVOICES' | 'LEDGER' | 'CUSTOMERS' | 'RECOVERY' | 'MORE'
  const [activeTab, setActiveTab] = useState<MobileTab>('DASHBOARD');
  const [orderingSubTab, setOrderingSubTab] = useState<'ORDER_FORM' | 'ORDER_LIST' | 'RECENT_ORDERS'>('ORDER_FORM');
  const [ledgerViewMode, setLedgerViewMode] = useState<'ENTERPRISE_BENTO' | 'DETAILED_JOURNAL'>('ENTERPRISE_BENTO');
  const [editDeleteTarget, setEditDeleteTarget] = useState<{ type: 'ORDER' | 'RECOVERY' | 'ATTENDANCE'; data: any } | null>(null);
  const [selectedOrderDealerId, setSelectedOrderDealerId] = useState<string>('');
  const [quickRecoveryAmount, setQuickRecoveryAmount] = useState<string>('');
  const [quickRecoveryMode, setQuickRecoveryMode] = useState<'CASH' | 'ONLINE_TRANSFER' | 'CHEQUE'>('CASH');
  const [selectedInvoiceDealerId, setSelectedInvoiceDealerId] = useState<string>('');
  const [selectedLedgerDealerId, setSelectedLedgerDealerId] = useState<string>('');

  // Resolved dynamic active town nodes
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const activeTownNames = useMemo(() => getActiveTownNames(effectiveTownNodes), [effectiveTownNodes]);

  // Active Selected Customer for Customer 360 Screen
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Sub-view on active customer: '360' | 'INVOICES' | 'ORDER_HISTORY' | 'LEDGER'
  const [customerSubView, setCustomerSubView] = useState<'360' | 'INVOICES' | 'ORDER_HISTORY' | 'LEDGER'>('360');

  // Customer for Etc Actions Sheet
  const [etcCustomer, setEtcCustomer] = useState<Customer | null>(null);

  // Drawers & Modals
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRecoveryDrawerOpen, setIsRecoveryDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifLogOpen, setIsNotifLogOpen] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('Auto · Ready');
  const [visitFilterTab, setVisitFilterTab] = useState<'ALL' | 'PRODUCTIVE' | 'NON_PRODUCTIVE'>('ALL');
  const [notificationLog, setNotificationLog] = useState<{ id: string; message: string; time: string; type: 'info' | 'success' | 'warning' }[]>([]);
  const toastTimerRef = useRef<number | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const { canInstall: canInstallPwa, promptInstall } = usePWAInstall();
  const isNetlifyHosted =
    typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase().endsWith('.netlify.app');

  const scrollMainToTop = (behavior: ScrollBehavior = 'auto') => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior });
    }
  };

  useEffect(() => {
    scrollMainToTop('auto');
  }, [activeTab, orderingSubTab, activeCustomerId, customerSubView]);

  useEffect(() => {
    if (!isNavDrawerOpen || typeof window === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNavDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isNavDrawerOpen]);

  // Customer List Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR' | 'OUTSTANDING'>('ALL');
  const [customerViewMode, setCustomerViewMode] = useState<'LIST' | 'MAP' | 'SPLIT'>('SPLIT');

  // Selected Route state for active town
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [showGeofenceMap, setShowGeofenceMap] = useState<boolean>(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('nlink_theme_mode');
        if (stored === 'light') return false;
        if (stored === 'dark') return true;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      localStorage.setItem('nlink_theme_mode', next ? 'dark' : 'light');
    } catch {}
  };

  const pushNotification = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setGpsToast(message);
    setNotificationLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, time, type }, ...prev].slice(0, 40));
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setGpsToast(null), 5000);
  };

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
      pushNotification('GPS Geolocation is not supported by your device.', 'warning');
      return;
    }
    setIsDetectingLocation(true);
    triggerHaptic('light');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestTown(latitude, longitude);
        if (nearest) {
          onSelectTown(normalizeTownName(nearest));
          triggerHaptic('success');
          pushNotification(`Auto-detected nearest town: ${normalizeTownName(nearest)}`, 'success');
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        console.warn('GPS detection failed:', error);
        triggerHaptic('warning');
        pushNotification('Could not acquire high-accuracy GPS. Please select town from dropdown.', 'warning');
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Authoritative Deduplicated Dynamic Towns List
  const availableTowns = useMemo(() => {
    const seen = new Map<string, string>();
    seen.set('all towns', 'All Towns');
    const source = activeTownNames.length > 0 ? activeTownNames : ALL_PAKISTAN_TOWNS;
    source.forEach((t) => {
      const normalized = normalizeTownName(t);
      const key = normalized.toLowerCase();
      if (normalized && !seen.has(key)) {
        seen.set(key, normalized);
      }
    });
    return Array.from(seen.values());
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

  // Executive / Manager town-switch permission (Field officers lock to Check-In town)
  const canSwitchTown = useMemo(() => {
    const email = (currentUser.email || '').toLowerCase();
    const role = (currentUser.role || '').toUpperCase();
    return (
      ['SUPER_ADMIN', 'MANAGEMENT', 'ZSM', 'MANAGING_DIRECTOR', 'EXECUTIVE_DIRECTOR'].includes(role) ||
      ['shahzadullah@nationallight.pk', 'syedzain@nationallight.pk', 'amjid.bisconni@gmail.com'].includes(email)
    );
  }, [currentUser]);

  const handleCheckInWithAutoTown = (townArg: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const detected = findNearestTown(pos.coords.latitude, pos.coords.longitude);
          const finalTown = normalizeTownName(detected || townArg || selectedTown);
          onSelectTown(finalTown);
          onCheckIn(finalTown);
          pushNotification(`Checked in at ${finalTown}`, 'success');
        },
        () => {
          const finalTown = normalizeTownName(townArg || selectedTown);
          onSelectTown(finalTown);
          onCheckIn(finalTown);
          pushNotification(`Checked in at ${finalTown}`, 'success');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const finalTown = normalizeTownName(townArg || selectedTown);
      onSelectTown(finalTown);
      onCheckIn(finalTown);
      pushNotification(`Checked in at ${finalTown}`, 'success');
    }
  };

  // Filtered customer list strictly scoped to active Check-In town
  const displayedCustomers = useMemo(() => {
    if (!canSwitchTown && (!isCheckedIn || !selectedTown || selectedTown === 'All Towns' || selectedTown === 'All Pakistan')) {
      return [];
    }

    const normSelected = normalizeTownName(selectedTown || '').toLowerCase();

    return customers.filter((c) => {
      const custTown = normalizeTownName(c.town || c.city || '');
      const custLower = custTown.toLowerCase();
      const matchTown =
        (canSwitchTown && (!normSelected || normSelected === 'all towns' || normSelected === 'all pakistan')) ||
        custLower === normSelected ||
        custLower.includes(normSelected) ||
        normSelected.includes(custLower);

      const matchSearch =
        !customerSearch ||
        c.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch) ||
        custLower.includes(customerSearch.toLowerCase());

      let matchType = true;
      if (customerTypeFilter === 'DEALER') matchType = c.type === 'DEALER';
      if (customerTypeFilter === 'DISTRIBUTOR') matchType = c.type === 'DISTRIBUTOR';
      if (customerTypeFilter === 'OUTSTANDING') {
        const bal = c.currentBalance ?? c.openingBalance ?? 0;
        matchType = bal > 0;
      }

      return matchTown && matchSearch && matchType;
    });
  }, [customers, selectedTown, customerSearch, customerTypeFilter, canSwitchTown, isCheckedIn]);

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
    scrollMainToTop('smooth');
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
    scrollMainToTop('smooth');
  };

  const handleOpenLedgerForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection');
    setActiveCustomerId(cust.id || cust.customerCode);
    setCustomerSubView('LEDGER');
    scrollMainToTop('smooth');
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
    <div className="flex-1 min-h-0 h-full bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex overflow-hidden antialiased">
      {/* Persistent Frozen Left Side Menu (Desktop / Large Screens lg+) */}
      <aside
        className={`hidden lg:flex flex-col h-full bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-slate-800 shrink-0 overflow-hidden transition-all duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Brand + Collapse Toggle */}
          <div className="p-4 bg-[#0F172A] dark:bg-[#0B1120] border-b border-slate-800 text-white flex items-center justify-between gap-2 min-h-[60px] shrink-0">
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight truncate text-[#F8FAFC]">N-LINK 360</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">{currentUser.fullName}</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={isSidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
              title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
            >
              <ArrowRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
            {(
              [
                { id: 'DASHBOARD', label: 'Home Dashboard', icon: LayoutDashboard },
                { id: 'ORDERING', label: 'Entry', icon: ShoppingBag },
                { id: 'INVOICES', label: 'Invoices', icon: Receipt },
                { id: 'LEDGER', label: 'Ledgers', icon: BookOpen },
                { id: 'CUSTOMERS', label: 'Dealers / Distributors', icon: Users },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setActiveCustomerId(null);
                    scrollMainToTop('smooth');
                  }}
                  title={item.label}
                  className={`w-full min-h-[44px] flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#3B82F6] text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}

            {/* Unified 1-Click Sync CTA (Sync Up + Sync Down merged; Google Sheets auto in background) */}
            <div className="pt-2 mt-2 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                disabled={isSyncingSheet}
                onClick={async () => {
                  triggerHaptic('medium');
                  if (onSyncGoogleSheet) {
                    await onSyncGoogleSheet();
                  }
                  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setLastSyncAt(ts);
                  pushNotification(`Sync completed at ${ts}`, 'success');
                }}
                title="Sync Up & Sync Down"
                className={`w-full min-h-[44px] flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[#0F172A] dark:text-white cursor-pointer transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 text-[#3B82F6] shrink-0 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                {!isSidebarCollapsed && (
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold">{isSyncingSheet ? 'Syncing...' : 'Sync'}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">{lastSyncAt}</div>
                  </div>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('MORE');
                setActiveCustomerId(null);
                scrollMainToTop('smooth');
              }}
              title="Settings & Profile"
              className={`w-full min-h-[44px] flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'MORE'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 shrink-0 ${activeTab === 'MORE' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              {!isSidebarCollapsed && <span className="truncate">Settings &amp; Profile</span>}
            </button>
          </nav>
        </div>

        <div className="p-2.5 border-t border-[#E2E8F0] dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onSignOut}
            title="Log out"
            className={`w-full min-h-[44px] flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      {/* Frozen Top App Bar */}
      <header className="shrink-0 z-30 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between text-[#0F172A] dark:text-[#F8FAFC]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsNavDrawerOpen(true);
            }}
            aria-label="Open navigation menu"
            className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <NationalLightLogo size="sm" showGlow />
          <div className="min-w-0">
            <span className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] block truncate">
              {activeTab === 'DASHBOARD'
                ? 'Home Dashboard'
                : activeTab === 'ORDERING'
                ? 'Entry'
                : activeTab === 'INVOICES'
                ? 'Invoices'
                : activeTab === 'LEDGER'
                ? 'Ledgers'
                : activeTab === 'CUSTOMERS'
                ? 'Dealers / Distributors'
                : activeTab === 'ATTENDANCE'
                ? 'Attendance'
                : 'Menu'}
            </span>
          </div>
        </div>

        {/* Header Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#F97316]" /> : <Moon className="w-4 h-4" />}
          </button>

          {onSyncGoogleSheet && (
            <button
              type="button"
              disabled={isSyncingSheet}
              onClick={async () => {
                triggerHaptic('medium');
                await onSyncGoogleSheet();
                const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setLastSyncAt(ts);
                pushNotification(`Sync completed at ${ts}`, 'success');
              }}
              className="btn-outline px-2.5 py-1.5 min-h-[44px] text-xs whitespace-nowrap"
              title="Bidirectional Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] dark:text-blue-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingSheet ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNotifLogOpen(true)}
            aria-label="Open notification log"
            className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {(notificationLog.length > 0 || orders.some((o) => o.status === 'PENDING_APPROVAL')) && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#F97316]" />
            )}
          </button>

        </div>
      </header>

      {/* Slide-Out Side Menu Drawer (All Tabs & Merged 2-Way Sync) */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsNavDrawerOpen(false)}
          />
          <aside className="relative z-10 w-76 max-w-[84vw] bg-white dark:bg-[#0F172A] h-full flex flex-col justify-between border-r border-[#E2E8F0] dark:border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div>
              {/* Drawer Officer Profile Header */}
              <div className="p-4 bg-[#0F172A] dark:bg-[#0B1120] border-b border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center font-bold shrink-0">
                      {(currentUser.fullName || 'NL')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 truncate">
                        {currentUser.roleTitle || 'Field Sales Officer'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNavDrawerOpen(false)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Menu Items */}
              <nav className="p-3 space-y-1">
                {(
                  [
                    { id: 'DASHBOARD', label: 'Home Dashboard', icon: LayoutDashboard },
                    { id: 'ORDERING', label: 'Entry', icon: ShoppingBag },
                    { id: 'INVOICES', label: 'Invoices', icon: Receipt },
                    { id: 'LEDGER', label: 'Ledgers', icon: BookOpen },
                    { id: 'CUSTOMERS', label: 'Dealers / Distributors', icon: Users },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setActiveCustomerId(null);
                        setIsNavDrawerOpen(false);
                        scrollMainToTop('smooth');
                      }}
                      className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#3B82F6] text-white'
                          : 'text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Merged 1-Click 2-Way Sync CTA (Auto-Syncs with Google Sheets in background) */}
                <div className="pt-2 mt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSyncingSheet}
                    onClick={async () => {
                      triggerHaptic('medium');
                      if (onSyncGoogleSheet) {
                        await onSyncGoogleSheet();
                      }
                      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      setLastSyncAt(ts);
                      pushNotification(`Sync completed at ${ts}`, 'success');
                      setIsNavDrawerOpen(false);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left bg-blue-500/10 hover:bg-blue-500/20 text-[#0F172A] dark:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-4 h-4 text-[#3B82F6] shrink-0 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                      <div>
                        <div className="text-sm font-bold">
                          {isSyncingSheet ? 'Syncing...' : 'Sync'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          Last Sync: {lastSyncAt}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MORE');
                    setActiveCustomerId(null);
                    setIsNavDrawerOpen(false);
                    scrollMainToTop('smooth');
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                    activeTab === 'MORE'
                      ? 'bg-[#3B82F6] text-white'
                      : 'text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className={`w-4 h-4 ${activeTab === 'MORE' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>Settings &amp; Profile</span>
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
              {canInstallPwa && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await promptInstall();
                    if (ok) {
                      setIsNavDrawerOpen(false);
                      pushNotification('N-LINK 360 App installed on your device.', 'success');
                    }
                  }}
                  className="btn-primary w-full justify-start"
                >
                  <Download className="w-4 h-4" />
                  <span>Install N-LINK 360 App</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsNavDrawerOpen(false);
                  onSignOut();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Auto-Hiding Notification Toast */}
      {gpsToast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-40 px-3 py-2 bg-[#0F172A] dark:bg-[#1E293B] text-white rounded-xl shadow-lg border border-[#3B82F6]/60 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <span className="pr-2">{gpsToast}</span>
          <button
            type="button"
            onClick={() => setGpsToast(null)}
            aria-label="Dismiss notification"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scrollable Content Area (Independent of Frozen Drawer & App Bar) */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain w-full"
      >
        <div
          className={`w-full max-w-full lg:max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-2.5 sm:py-4 lg:pb-8 ${
            isNetlifyHosted ? 'pb-36' : 'pb-24'
          }`}
        >
        {/* ==================================================== */}
        {/* 1. ATTENDANCE & RECORD TAB (Unified Segmented View) */}
        {/* ==================================================== */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 grid grid-cols-2 gap-1 max-w-md">
              <button
                type="button"
                onClick={() => setIsAttendanceLedgerOpen(false)}
                className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  !isAttendanceLedgerOpen
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Daily Check-In / Out
              </button>
              <button
                type="button"
                onClick={() => setIsAttendanceLedgerOpen(true)}
                className={`min-h-[44px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isAttendanceLedgerOpen
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Attendance Record
              </button>
            </div>

            {!isAttendanceLedgerOpen ? (
              <MobileAttendanceGpsScreen
                currentUser={currentUser}
                isCheckedIn={isCheckedIn}
                checkedInTime={checkedInTime}
                checkedOutTime={checkedOutTime}
                selectedTown={selectedTown}
                onSelectTown={onSelectTown}
                availableTowns={availableTowns}
                currentTownRoutes={currentTownRoutes}
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
                onCheckIn={handleCheckInWithAutoTown}
                onCheckOut={onCheckOut}
                attendanceRecords={attendanceRecords}
                townNodes={effectiveTownNodes}
                onUpdateGeofenceRadius={handleUpdateGeofenceRadius}
              />
            ) : (
              <EmployeeAttendanceLedgerView
                attendanceRecords={attendanceRecords}
                currentUser={currentUser}
                orders={orders}
                recoveries={recoveries}
                onSaveAttendanceEdit={onSaveAttendanceEdit}
                onDeleteAttendance={onDeleteAttendance}
              />
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. CUSTOMERS & ORDER BOOKING TAB */}
        {/* ==================================================== */}
        {(activeTab === 'CUSTOMERS' || activeTab === 'ORDERING') && (
          <div>
            {activeCustomer ? (
              <div>
                {/* 360 Overview Sub-view */}
                {customerSubView === '360' && (
                  <Suspense fallback={<NatureSkeleton variant="card" count={3} />}>
                    <Customer360Screen
                      customer={activeCustomer}
                      currentUser={currentUser}
                      orders={orders}
                      recoveries={recoveries}
                      onBack={handleBackToCustomerList}
                      onOpenOrderDrawer={() => setIsOrderDrawerOpen(true)}
                      onOpenRecoveryDrawer={() => setIsRecoveryDrawerOpen(true)}
                      onViewInvoices={() => setCustomerSubView('INVOICES')}
                      onViewOrderHistory={() => setCustomerSubView('ORDER_HISTORY')}
                      onViewLedger={() => setCustomerSubView('LEDGER')}
                      onUpdateCustomerCoordinates={onUpdateCustomerCoordinates}
                    />
                  </Suspense>
                )}

                {/* Invoices Sub-view */}
                {customerSubView === 'INVOICES' && (
                  <Suspense fallback={<NatureSkeleton variant="list" count={4} />}>
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
                  </Suspense>
                )}

                {/* Order History Sub-view */}
                {customerSubView === 'ORDER_HISTORY' && (
                  <Suspense fallback={<NatureSkeleton variant="list" count={4} />}>
                    <OrderHistoryView
                      customer={activeCustomer}
                      currentUser={currentUser}
                      orders={orders}
                      onBack={() => setCustomerSubView('360')}
                      onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                      onPreviewInvoicePdf={onPreviewInvoicePdf}
                      onWhatsAppShareInvoice={onWhatsAppShareInvoice}
                    />
                  </Suspense>
                )}

                {/* Ledger Sub-view */}
                {customerSubView === 'LEDGER' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLedgerViewMode('ENTERPRISE_BENTO')}
                          className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            ledgerViewMode === 'ENTERPRISE_BENTO'
                              ? 'bg-[#3B82F6] text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Recovery &amp; Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => setLedgerViewMode('DETAILED_JOURNAL')}
                          className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            ledgerViewMode === 'DETAILED_JOURNAL'
                              ? 'bg-[#3B82F6] text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Detailed Journal
                        </button>
                      </div>
                    </div>

                    {ledgerViewMode === 'ENTERPRISE_BENTO' ? (
                      <Suspense fallback={<NatureSkeleton variant="card" count={2} />}>
                        <MobileRecoveryCustomerLedgerView
                          customer={activeCustomer}
                          currentUser={currentUser}
                          orders={orders}
                          recoveries={recoveries}
                          onBack={() => setCustomerSubView('360')}
                          onRecordRecovery={onRecordRecovery}
                          onPreviewInvoicePdf={onPreviewInvoicePdf}
                        />
                      </Suspense>
                    ) : (
                      <Suspense fallback={<NatureSkeleton variant="table" />}>
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
                          onApproveOrder={onApproveOrder}
                          onApproveRecovery={onApproveRecovery}
                          onCancelOrReverseOrder={onCancelOrReverseOrder}
                          onSaveOrderEdit={onSaveOrderEdit}
                          onCancelOrReverseRecovery={onCancelOrReverseRecovery}
                          onSaveRecoveryEdit={onSaveRecoveryEdit}
                          onOpenSalesAuditModal={onOpenSalesAuditModal}
                        />
                      </Suspense>
                    )}
                  </div>
                )}
              </div>
            ) : !isCheckedIn && !canSwitchTown ? (
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-[#E2E8F0] dark:border-slate-700/80 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-[#3B82F6] flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                    GPS Check-In Required
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Check in at your current GPS location to automatically load Dealers / Distributors for that town only.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAutoDetectTown}
                    disabled={isDetectingLocation}
                    className="btn-outline"
                  >
                    <Navigation className="w-4 h-4 text-[#3B82F6]" />
                    <span>{isDetectingLocation ? 'Detecting GPS...' : 'Detect GPS Town'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCheckInWithAutoTown(selectedTown);
                    }}
                    className="btn-primary"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Check In Now</span>
                  </button>
                </div>
              </div>
            ) : activeTab === 'ORDERING' ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* Ordering Sub-Tabs: Order Form | Order List */}
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-[#E2E8F0] dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0F172A] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('ORDER_FORM')}
                      className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        orderingSubTab === 'ORDER_FORM'
                          ? 'bg-[#3B82F6] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Order Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('ORDER_LIST')}
                      className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                        orderingSubTab === 'ORDER_LIST'
                          ? 'bg-[#3B82F6] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Order List ({orders.filter((o) => canSwitchTown || displayedCustomers.some((c) => c.id === o.customerId || c.companyName === o.customerName)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('RECENT_ORDERS')}
                      className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        orderingSubTab === 'RECENT_ORDERS'
                          ? 'bg-[#3B82F6] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Recent Orders (10)
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="font-semibold text-[#0F172A] dark:text-white">{selectedTown}</span>
                  </div>
                </div>

                {orderingSubTab === 'ORDER_FORM' ? (
                  <div className="space-y-3.5">
                    {/* A. Town Selection + B. Dealer / Distributor Selection + C. Simple 1-Box Recovery */}
                    {(() => {
                      const activeOrderDealer =
                        displayedCustomers.find((c) => c.id === selectedOrderDealerId) ||
                        displayedCustomers[0] ||
                        null;

                      const handleQuickRecoverySubmit = () => {
                        const amt = Number(quickRecoveryAmount);
                        if (!activeOrderDealer || !Number.isFinite(amt) || amt <= 0) {
                          pushNotification('Select a dealer and enter a valid Recovery Amount.', 'warning');
                          return;
                        }
                        const nowIso = new Date().toISOString();
                        const recId = generateUniqueRecoveryId();
                        onRecordRecovery({
                          id: recId,
                          recoveryNumber: recId,
                          customerId: activeOrderDealer.id,
                          customerName: activeOrderDealer.companyName,
                          customerCode: activeOrderDealer.customerCode || 'NL-DLR',
                          salesUserId: currentUser.id,
                          salesUserName: currentUser.fullName,
                          amount: amt,
                          paymentMode: quickRecoveryMode,
                          collectionDate: nowIso.slice(0, 10),
                          recordedAt: nowIso,
                          createdAt: nowIso,
                          status: 'PENDING',
                          shahzadApproval: 'PENDING',
                          bankName: quickRecoveryMode === 'CASH' ? 'Direct Cash Collection' : 'Bank / Digital',
                        } as Recovery);
                        triggerHaptic('success');
                        setQuickRecoveryAmount('');
                        pushNotification(
                          `Recovery Rs. ${amt.toLocaleString()} logged for ${activeOrderDealer.companyName}`,
                          'success'
                        );
                      };

                      return (
                        <>
                          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* A. Town Selection */}
                              <div className="min-w-0">
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                  A. Town Selection
                                </label>
                                <select
                                  value={selectedTown}
                                  onChange={(e) => {
                                    onSelectTown(e.target.value);
                                    setSelectedOrderDealerId('');
                                  }}
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                                >
                                  {availableTowns.map((town) => (
                                    <option key={town} value={town}>
                                      {town}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* B. Dealer / Distributor Selection */}
                              <div className="min-w-0">
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                  B. Dealer / Distributor ({displayedCustomers.length})
                                </label>
                                <select
                                  value={activeOrderDealer?.id || ''}
                                  onChange={(e) => setSelectedOrderDealerId(e.target.value)}
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                                >
                                  {displayedCustomers.length === 0 ? (
                                    <option value="">No Dealers in {selectedTown}</option>
                                  ) : (
                                    displayedCustomers.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.companyName} ({c.town || c.city})
                                      </option>
                                    ))
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* C. Simple 1-Box Recovery Amount Entry */}
                            <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-700/80">
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                C. Recovery Amount (PKR) — {activeOrderDealer?.companyName || 'Select Dealer'}
                              </label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1 min-w-0 flex items-center">
                                  <span className="absolute left-3 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 pointer-events-none select-none">
                                    PKR
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={quickRecoveryAmount}
                                    onChange={(e) => setQuickRecoveryAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full min-h-[44px] pl-12 pr-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-sm font-mono tabular-nums font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={quickRecoveryMode}
                                    onChange={(e) => setQuickRecoveryMode(e.target.value as any)}
                                    aria-label="Recovery Payment Mode"
                                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                                  >
                                    <option value="CASH">Cash</option>
                                    <option value="ONLINE_TRANSFER">Online</option>
                                    <option value="CHEQUE">Cheque</option>
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!activeOrderDealer || !quickRecoveryAmount || Number(quickRecoveryAmount) <= 0}
                                    onClick={handleQuickRecoverySubmit}
                                    className="btn-secondary min-h-[44px] px-4 py-2 text-xs whitespace-nowrap"
                                  >
                                    Save Recovery
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SKU-Wise Order Sheet (Ctn + Packs) */}
                          <Suspense fallback={<NatureSkeleton variant="full" />}>
                            <BulkSkuOrderForm
                              currentUser={currentUser}
                              availableCustomers={displayedCustomers}
                              preselectedCustomer={activeOrderDealer}
                              onPlaceOrder={onPlaceOrder}
                              onDownloadPdf={(o, c) => onDownloadInvoicePdf?.(o, c)}
                              onPreviewPdf={onPreviewInvoicePdf}
                              onWhatsAppShare={onWhatsAppShareInvoice}
                              stickyTopOffsetClass="top-0"
                            />
                          </Suspense>
                        </>
                      );
                    })()}
                  </div>
                ) : orderingSubTab === 'ORDER_LIST' ? (
                  <div className="space-y-3">
                    {/* Mobile Card View (< md) */}
                    <div className="md:hidden space-y-3">
                      {orders
                        .filter((o) => canSwitchTown || displayedCustomers.some((c) => c.id === o.customerId || c.companyName === o.customerName))
                        .map((o) => {
                          const cust = customers.find((c) => c.id === o.customerId || c.companyName === o.customerName);
                          return (
                            <div key={o.id || o.orderNumber} className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 shadow-sm space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="font-bold text-[#3B82F6] dark:text-blue-400 font-mono tabular-nums">#{o.orderNumber || o.id?.slice(-6)}</div>
                                  <div className="font-bold text-[#0F172A] dark:text-white truncate">{o.customerName}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{o.orderDate || o.createdAt?.slice(0, 10)}</div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                                  o.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : o.status === 'REJECTED'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : 'bg-orange-500/10 text-[#EA580C] dark:text-[#F97316] border-orange-500/20'
                                }`}>
                                  {o.status || 'SUBMITTED'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                <div className="text-xs">
                                  <span className="text-slate-500 dark:text-slate-400">Items: </span>
                                  <span className="font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">{o.items?.length || 1}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Amount</div>
                                  <div className="font-mono tabular-nums font-black text-[#0F172A] dark:text-white">PKR {Number(o.totalAmount || 0).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                {cust && onPreviewInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewInvoicePdf(o, cust)}
                                    className="flex-1 btn-outline min-h-[44px] text-[11px]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>
                                )}
                                {cust && onDownloadInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onDownloadInvoicePdf(o, cust)}
                                    className="flex-1 btn-primary min-h-[44px] text-[11px]"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                )}
                                {(canUserEditEntry(o, currentUser).allowed || canUserDeleteEntry(o, currentUser).allowed) && (
                                  <button
                                    type="button"
                                    onClick={() => setEditDeleteTarget({ type: 'ORDER', data: o })}
                                    className="btn-outline min-h-[44px] text-[11px] px-3 text-slate-700 dark:text-slate-200"
                                    title="Edit or Cancel / Reverse today's order"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Manage</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#0F172A] text-white text-[11px] font-semibold">
                            <tr>
                              <th className="frozen-first-col bg-[#0F172A] py-2.5 px-3">Order #</th>
                              <th className="py-2.5 px-3">Dealer / Distributor</th>
                              <th className="py-2.5 px-3 text-right">SKUs</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-700/80">
                            {orders
                              .filter((o) => canSwitchTown || displayedCustomers.some((c) => c.id === o.customerId || c.companyName === o.customerName))
                              .map((o) => {
                                const cust = customers.find((c) => c.id === o.customerId || c.companyName === o.customerName);
                                return (
                                  <tr key={o.id || o.orderNumber} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60">
                                    <td className="frozen-first-col bg-white dark:bg-[#1E293B] py-2.5 px-3 font-mono tabular-nums font-bold text-[#3B82F6] dark:text-blue-400">
                                      #{o.orderNumber || o.id?.slice(-6)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-semibold text-[#0F172A] dark:text-white">{o.customerName}</div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{o.orderDate || o.createdAt?.slice(0, 10)}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                      {o.items?.length || 1}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                                      PKR {Number(o.totalAmount || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                        o.status === 'APPROVED'
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                          : o.status === 'REJECTED'
                                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                          : 'bg-orange-500/10 text-[#EA580C] dark:text-[#F97316] border-orange-500/20'
                                      }`}>
                                        {o.status || 'SUBMITTED'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {cust && onPreviewInvoicePdf && (
                                          <button
                                            type="button"
                                            onClick={() => onPreviewInvoicePdf(o, cust)}
                                            className="btn-outline px-2.5 py-1 min-h-[36px] text-[11px]"
                                            aria-label="Preview invoice"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {cust && onDownloadInvoicePdf && (
                                          <button
                                            type="button"
                                            onClick={() => onDownloadInvoicePdf(o, cust)}
                                            className="btn-primary px-2.5 py-1 min-h-[36px] text-[11px]"
                                            aria-label="Download invoice PDF"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(canUserEditEntry(o, currentUser).allowed || canUserDeleteEntry(o, currentUser).allowed) && (
                                          <button
                                            type="button"
                                            onClick={() => setEditDeleteTarget({ type: 'ORDER', data: o })}
                                            className="btn-outline px-2.5 py-1 min-h-[36px] text-[11px] text-slate-600 dark:text-slate-300"
                                            title="Edit or Cancel / Reverse"
                                            aria-label="Manage order"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#3B82F6]" />
                          <span>Last 10 Orders Submitted</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Showing recent orders booked by {currentUser.fullName} with approval status.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-[#3B82F6] dark:text-blue-400 border border-blue-500/20 font-mono tabular-nums text-xs font-bold shrink-0">
                        {orders.filter((o) => o.salesUserId === currentUser.id || canSwitchTown).slice(0, 10).length} Orders
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {orders
                        .filter((o) => o.salesUserId === currentUser.id || canSwitchTown)
                        .slice(0, 10)
                        .map((o) => {
                          const cust = customers.find((c) => c.id === o.customerId || c.companyName === o.customerName);
                          const isApproved = o.status === 'APPROVED' || (o.status as string) === 'VERIFIED' || (o as any).accountsApproval === 'APPROVED';
                          const isRejected = o.status === 'REJECTED' || o.shahzadApproval === 'REJECTED' || (o as any).accountsApproval === 'REJECTED';

                          return (
                            <div
                              key={o.id || o.orderNumber}
                              className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-3 transition-all hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono tabular-nums font-bold text-xs text-[#3B82F6] dark:text-blue-400">
                                      #{o.orderNumber || o.id}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                                      &middot; {o.orderDate || o.createdAt?.slice(0, 10)}
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate mt-0.5">
                                    {o.customerName}
                                  </h4>
                                </div>

                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                                  isApproved
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : isRejected
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : 'bg-orange-500/10 text-[#EA580C] dark:text-[#F97316] border-orange-500/20'
                                }`}>
                                  {isApproved ? 'Approved / Verified' : isRejected ? 'Rejected' : 'Pending Approval'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">SKU Items</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                                    {o.items?.length || 1} SKUs
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Total Qty</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                                    {o.items?.reduce((sum, i) => sum + (i.orderedQuantity || i.quantity || 0), 0) || 0} pcs
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Order Amount</span>
                                  <span className="font-mono tabular-nums font-black text-[#0F172A] dark:text-white">
                                    PKR {Number(o.totalAmount || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Sales Officer</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                    {o.salesUserName || currentUser.fullName}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                {cust && onPreviewInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewInvoicePdf(o, cust)}
                                    className="btn-outline text-xs px-3 py-1.5 min-h-[40px]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview Invoice</span>
                                  </button>
                                )}
                                {cust && onDownloadInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onDownloadInvoicePdf(o, cust)}
                                    className="btn-primary text-xs px-3 py-1.5 min-h-[40px]"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download PDF</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* 1. STREAMLINED TOP COMMAND BAR */}
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-3">
                  {/* Top Line: Territory Town Selector & New Dealer Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-[#3B82F6] dark:text-blue-400 shrink-0" />
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] dark:text-blue-400 truncate">
                          {selectedTown} Beat
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium font-mono tabular-nums whitespace-nowrap">
                          ({displayedCustomers.length} Dealers)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      {/* Town Selector (Locked to Check-In Town for Field Officers; Unlocked for NSM/ZSM/Admin) */}
                      <select
                        value={selectedTown}
                        disabled={!canSwitchTown && isCheckedIn}
                        onChange={(e) => {
                          triggerHaptic('selection');
                          onSelectTown(e.target.value);
                        }}
                        className="flex-1 sm:flex-none min-w-0 min-h-[44px] text-xs font-semibold bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-2 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer focus:border-[#3B82F6] disabled:opacity-75 disabled:cursor-not-allowed"
                        title={canSwitchTown ? 'Switch territory town' : 'Locked to Check-In GPS town'}
                      >
                        {availableTowns.filter((t) => canSwitchTown || t !== 'All Towns').map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="btn-outline px-3 py-2 min-h-[44px] text-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Dealer</span>
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
                      className="min-h-[46px] p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-800 dark:border-slate-700 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Collect daily cash recovery"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 stroke-[2.25]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Daily Recovery</span>
                        <span className="block text-[10px] text-slate-300 font-medium mt-0.5 truncate">Collect Wasooli</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('ORDER');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Book daily sales order"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 stroke-[2.25]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Daily Ordering</span>
                        <span className="block text-[10px] text-blue-100 font-medium mt-0.5 truncate">Book SKUs</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('INVOICES');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 active:scale-[0.98] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer transition-all touch-manipulation"
                      title="View invoices and bills"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-[#3B82F6] dark:text-blue-400 stroke-[2]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Invoices</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Bills &amp; PDF</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('LEDGER');
                        setQuickPickerSearch('');
                      }}
                      className="min-h-[46px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 active:scale-[0.98] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer transition-all touch-manipulation"
                      title="View Khata ledger statement"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[#3B82F6] dark:text-blue-400 stroke-[2]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Khata Ledgers</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Passbook</span>
                      </div>
                    </button>
                  </div>

                  {/* Compact Financial Status Ribbon */}
                  <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-[#0F172A] px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                      Market Balance: <strong className="font-mono tabular-nums text-slate-900 dark:text-white font-bold">PKR {totalMarketOutstanding.toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                      Today&apos;s Wasooli: <strong className="font-mono tabular-nums font-bold">PKR {totalTodayRecoveryInTown.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* 1B. FMCG Book Order Summary Banner & Productive Tabs */}
                {(() => {
                  const todayIso = new Date().toISOString().slice(0, 10);
                  const todayStoreOrders = orders.filter(
                    (o) => (o.orderDate || o.createdAt || '').slice(0, 10) === todayIso && o.status !== 'REJECTED'
                  );
                  const productiveCustomerIds = new Set(todayStoreOrders.map((o) => o.customerId));
                  const bookingValToday = todayStoreOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
                  const totalCartonsToday = todayStoreOrders.reduce(
                    (s, o) => s + (o.items?.reduce((is, it) => is + (it.cartons || 0), 0) || 0),
                    0
                  );
                  const productiveList = displayedCustomers.filter((c) => productiveCustomerIds.has(c.id));
                  const nonProductiveList = displayedCustomers.filter((c) => !productiveCustomerIds.has(c.id));
                  const visibleList =
                    visitFilterTab === 'PRODUCTIVE'
                      ? productiveList
                      : visitFilterTab === 'NON_PRODUCTIVE'
                      ? nonProductiveList
                      : displayedCustomers;

                  return (
                    <div className="space-y-3">
                      {/* Search + Add Dealer / Distributor Toolbar */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search Dealer / Distributor, code, or town..."
                            className="w-full min-h-[44px] pl-9 pr-11 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                          />
                          {customerSearch && (
                            <button
                              type="button"
                              onClick={() => setCustomerSearch('')}
                              aria-label="Clear dealer search"
                              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCustomerViewMode(customerViewMode === 'LIST' ? 'MAP' : 'LIST')}
                          className="btn-outline px-3 min-h-[44px]"
                          title="Toggle Map / List"
                        >
                          <MapPin className="w-4 h-4 text-[#3B82F6]" />
                          <span className="hidden sm:inline">{customerViewMode === 'LIST' ? 'Map' : 'List'}</span>
                        </button>

                        {onAddCustomer && (
                          <button
                            type="button"
                            onClick={() => setIsAddCustomerOpen(true)}
                            className="btn-primary px-3.5 min-h-[44px]"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>

                      {/* Deep Navy #0F172A Summary Banner */}
                      <div className="bg-[#0F172A] dark:bg-[#1E293B] text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-800 dark:border-slate-700/80">
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px]">Booking Value</span>
                          <span className="font-mono tabular-nums font-bold text-sm text-[#F97316] truncate block">
                            PKR {bookingValToday.toLocaleString()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px]">Productive Calls</span>
                          <span className="font-mono tabular-nums font-bold text-sm text-emerald-400 truncate block">
                            {productiveList.length} / {displayedCustomers.length}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px]">Cartons Today</span>
                          <span className="font-mono tabular-nums font-bold text-sm truncate block">
                            {totalCartonsToday}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px]">Market Balance</span>
                          <span className="font-mono tabular-nums font-bold text-sm truncate block">
                            PKR {totalMarketOutstanding.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 3-Tab Filter Strip */}
                      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 grid grid-cols-3 text-xs font-semibold overflow-hidden">
                        {(
                          [
                            { id: 'ALL', label: `All Dealers (${displayedCustomers.length})` },
                            { id: 'PRODUCTIVE', label: `Productive (${productiveList.length})` },
                            { id: 'NON_PRODUCTIVE', label: `Pending (${nonProductiveList.length})` },
                          ] as const
                        ).map((t) => {
                          const active = visitFilterTab === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setVisitFilterTab(t.id)}
                              className={`min-h-[44px] py-2.5 px-2 text-center border-b-2 transition-colors cursor-pointer truncate tabular-nums ${
                                active
                                  ? 'border-[#3B82F6] text-[#3B82F6] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30'
                                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Map or Dealer / Distributor Rows */}
                      {customerViewMode === 'MAP' ? (
                        <Suspense fallback={<NatureSkeleton variant="full" />}>
                          <DealerCreditHealthMap
                            customers={visibleList}
                            invoices={orders as any}
                            recoveries={recoveries}
                            onSelectDealer={(dealer) => handleOpenCustomer(dealer)}
                            selectedDealerId={activeCustomerId}
                            height={440}
                          />
                        </Suspense>
                      ) : (
                        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 divide-y divide-[#E2E8F0] dark:divide-slate-700/80 overflow-hidden">
                          {visibleList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-2">
                              <Users className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                              <p className="font-semibold text-[#0F172A] dark:text-slate-200">No Dealers / Distributors found</p>
                              <p className="text-xs">Adjust your search or filter tab above.</p>
                            </div>
                          ) : (
                            visibleList.map((cust) => {
                              const netBal = cust.currentBalance ?? cust.openingBalance ?? 0;
                              const isProductive = productiveCustomerIds.has(cust.id);
                              const hasPhone = Boolean(cust.phone && cust.phone.trim().length > 5);

                              return (
                                <div
                                  key={cust.id}
                                  className="relative p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  {isProductive && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" aria-hidden="true" />
                                  )}

                                  <div
                                    onClick={() => handleOpenCustomer(cust)}
                                    className="min-w-0 flex-1 cursor-pointer pl-1"
                                  >
                                    <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                                      {cust.companyName}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {cust.address || cust.town || cust.city || 'Registered Dealer / Distributor'}
                                    </div>
                                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap truncate">
                                      Bal: <strong className={netBal < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0F172A] dark:text-white'}>
                                        {netBal < 0 ? `-PKR ${Math.abs(netBal).toLocaleString()} CR` : `PKR ${netBal.toLocaleString()}`}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenOrderForCustomer(cust, e)}
                                      className="btn-primary px-3 min-h-[44px] sm:min-h-[38px] text-[11px]"
                                      title="Book Order"
                                    >
                                      Order
                                    </button>

                                    {hasPhone && (
                                      <a
                                        href={`tel:${cust.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-[#3B82F6] hover:text-[#3B82F6]"
                                        title="Call Dealer"
                                        aria-label={`Call ${cust.companyName}`}
                                      >
                                        <Phone className="w-4 h-4" />
                                      </a>
                                    )}

                                    <MoreActionsMenu
                                      items={[
                                        {
                                          label: 'Record Recovery',
                                          onClick: () => {
                                            setActiveCustomerId(cust.id);
                                            setIsRecoveryDrawerOpen(true);
                                          },
                                        },
                                        {
                                          label: 'View Invoices',
                                          onClick: () => {
                                            setActiveCustomerId(cust.id);
                                            setCustomerSubView('INVOICES');
                                          },
                                        },
                                        {
                                          label: 'Khata Ledger',
                                          onClick: () => {
                                            setActiveCustomerId(cust.id);
                                            setCustomerSubView('LEDGER');
                                          },
                                        },
                                        {
                                          label: 'Dealer Details',
                                          onClick: () => handleOpenCustomer(cust),
                                        },
                                      ]}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Quick Action Dealer Picker Sheet Modal */}
        {quickActionPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#1E293B] w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/90 dark:bg-[#0F172A]">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    quickActionPicker === 'ORDER'
                      ? 'bg-[#F97316]'
                      : quickActionPicker === 'RECOVERY'
                      ? 'bg-emerald-600'
                      : quickActionPicker === 'INVOICES'
                      ? 'bg-[#3B82F6]'
                      : 'bg-slate-700'
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] dark:text-blue-400">
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
                  aria-label="Close dealer picker"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-700/80 bg-white dark:bg-[#1E293B]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={quickPickerSearch}
                    onChange={(e) => setQuickPickerSearch(e.target.value)}
                    placeholder="Search shop name, dealer code..."
                    className="w-full min-h-[44px] pl-9 pr-11 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#3B82F6] font-medium"
                    autoFocus
                  />
                  {quickPickerSearch && (
                    <button
                      type="button"
                      onClick={() => setQuickPickerSearch('')}
                      aria-label="Clear quick picker search"
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 hover:bg-blue-50/50 dark:bg-[#0F172A]/70 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
                            {cust.companyName}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                            {cust.customerCode} &bull; {cust.contactPerson || 'Proprietor'} &bull; {cust.town || cust.city}
                          </p>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <span className="font-mono tabular-nums font-black text-xs text-[#3B82F6] dark:text-blue-400 block">
                            PKR {netBal.toLocaleString()}
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
        {activeTab === 'DASHBOARD' && (() => {
          const canonicalRole = getCanonicalDashboardRole(currentUser.role);
          const usesUnifiedRoleEngine =
            canonicalRole === 'NATIONAL_MANAGER' ||
            canonicalRole === 'RSM' ||
            canonicalRole === 'ZSM' ||
            canonicalRole === 'FIELD_SALES_USER';

          if (usesUnifiedRoleEngine) {
            return (
              <div className="space-y-3.5 pb-20">
                <RoleBasedDashboardShell
                  currentUser={currentUser}
                  dataset={{
                    customers,
                    orders,
                    recoveries,
                    ledgerEntries,
                    attendanceRecords,
                    visits,
                    creditNotes,
                    stockReturns,
                    targets,
                  }}
                  isDarkMode={isDarkMode}
                  onToggleTheme={handleToggleTheme}
                  fieldLiveContext={{
                    isCheckedIn,
                    checkedInTime,
                    checkedOutTime: checkedOutTime || null,
                    selectedTown,
                    onToggleCheckIn: () => {
                      if (isCheckedIn) {
                        onCheckOut(selectedTown);
                      } else {
                        handleCheckInWithAutoTown(selectedTown);
                      }
                    },
                  }}
                  onQuickAction={(actionId) => {
                    if (actionId === 'NEW_ORDER') {
                      setActiveTab('ORDERING');
                    } else if (actionId === 'RECORD_RECOVERY') {
                      setQuickActionPicker('RECOVERY');
                      setQuickPickerSearch('');
                    } else if (actionId === 'VIEW_LEDGER') {
                      setActiveTab('LEDGER');
                    } else if (actionId === 'VIEW_ATTENDANCE') {
                      setIsAttendanceLedgerOpen(false);
                      setActiveTab('ATTENDANCE');
                    } else if (actionId === 'EXPORT_REPORT') {
                      exportSalesSummaryCsv(orders);
                    } else if (actionId === 'OPEN_APPROVALS') {
                      setActiveTab('MORE');
                    }
                  }}
                  onSelectCustomer={(customerId) => {
                    const matched = customers.find(
                      (c) => c.id === customerId || c.customerCode === customerId
                    );
                    if (matched) handleOpenCustomer(matched);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="space-y-3.5 pb-20">
              <MobileHomeDashboardView
                currentUser={currentUser}
                customers={customers}
                orders={orders}
                recoveries={recoveries}
                isCheckedIn={isCheckedIn}
                checkedInTime={checkedInTime}
                onOpenOrderBooking={() => setActiveTab('ORDERING')}
                onOpenRecordRecovery={() => {
                  setQuickActionPicker('RECOVERY');
                  setQuickPickerSearch('');
                }}
                onOpenCustomerCheckin={() => {
                  if (isCheckedIn) {
                    onCheckOut(selectedTown);
                  } else {
                    handleCheckInWithAutoTown(selectedTown);
                  }
                }}
                onSelectCustomer={(c) => {
                  handleOpenCustomer(c);
                }}
              />
            </div>
          );
        })()}

        {/* ==================================================== */}
        {/* 4. INVOICES TAB (Town -> Dealer -> Date-wise Invoices) */}
        {/* ==================================================== */}
        {activeTab === 'INVOICES' && (() => {
          const activeInvoiceDealer =
            displayedCustomers.find((c) => c.id === selectedInvoiceDealerId) ||
            displayedCustomers[0] ||
            null;
          return (
            <div className="space-y-3.5 pb-20 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Town Selection
                  </label>
                  <select
                    value={selectedTown}
                    onChange={(e) => {
                      onSelectTown(e.target.value);
                      setSelectedInvoiceDealerId('');
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                  >
                    {availableTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Dealer Selection ({displayedCustomers.length})
                  </label>
                  <select
                    value={activeInvoiceDealer?.id || ''}
                    onChange={(e) => setSelectedInvoiceDealerId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                  >
                    {displayedCustomers.length === 0 ? (
                      <option value="">No Dealers in {selectedTown}</option>
                    ) : (
                      displayedCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} ({c.town || c.city})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {activeInvoiceDealer ? (
                <CustomerInvoicesView
                  customer={activeInvoiceDealer}
                  currentUser={currentUser}
                  orders={orders}
                  onBack={() => setActiveTab('DASHBOARD')}
                  onPreviewPdf={onPreviewInvoicePdf}
                  onDownloadInvoicePdf={onDownloadInvoicePdf}
                  onWhatsAppShareInvoice={onWhatsAppShareInvoice}
                />
              ) : (
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 text-center border border-[#E2E8F0] dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400">
                  No dealers found in {selectedTown}. Select another town above.
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================================================== */}
        {/* 5. LEDGERS TAB (Town -> Dealer -> Date Range Ledger) */}
        {/* ==================================================== */}
        {activeTab === 'LEDGER' && (() => {
          const activeLedgerDealer =
            displayedCustomers.find((c) => c.id === selectedLedgerDealerId) ||
            displayedCustomers[0] ||
            null;
          return (
            <div className="space-y-3.5 pb-20 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Town Selection
                  </label>
                  <select
                    value={selectedTown}
                    onChange={(e) => {
                      onSelectTown(e.target.value);
                      setSelectedLedgerDealerId('');
                    }}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                  >
                    {availableTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Dealer Selection ({displayedCustomers.length})
                  </label>
                  <select
                    value={activeLedgerDealer?.id || ''}
                    onChange={(e) => setSelectedLedgerDealerId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
                  >
                    {displayedCustomers.length === 0 ? (
                      <option value="">No Dealers in {selectedTown}</option>
                    ) : (
                      displayedCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} ({c.town || c.city})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {activeLedgerDealer ? (
                <CustomerLedgerView
                  customer={activeLedgerDealer}
                  currentUser={currentUser}
                  orders={orders}
                  recoveries={recoveries}
                  ledgerEntries={ledgerEntries}
                  onBack={() => setActiveTab('DASHBOARD')}
                  onApproveOrder={onApproveOrder}
                  onApproveRecovery={onApproveRecovery}
                  onCancelOrReverseOrder={onCancelOrReverseOrder}
                  onSaveOrderEdit={onSaveOrderEdit}
                  onCancelOrReverseRecovery={onCancelOrReverseRecovery}
                  onSaveRecoveryEdit={onSaveRecoveryEdit}
                  onOpenSalesAuditModal={onOpenSalesAuditModal}
                />
              ) : (
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 text-center border border-[#E2E8F0] dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400">
                  No dealers found in {selectedTown}. Select another town above.
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================================================== */}
        {/* 4. MORE TAB */}
        {/* ==================================================== */}
        {activeTab === 'MORE' && (
          <div className="space-y-4 animate-in fade-in duration-200 text-xs">
            {/* User Profile Card with Edit Button */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#3B82F6] text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                    {currentUser.avatarInitials || 'NL'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.fullName}
                    </h2>
                    <p className="text-[11px] text-[#3B82F6] dark:text-blue-400 font-semibold">
                      {currentUser.roleTitle || currentUser.role || 'Field Officer'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      {currentUser.phone || '+92 300 1234567'} &middot; {selectedTown}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="btn-outline min-h-[44px] px-3 py-1.5 text-xs shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>
              </div>

              {pendingProfileRequest && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Profile update request pending authorization by Admin / Shahzad Ullah.</span>
                </div>
              )}
            </div>

            {/* Seamless Auto-Sync Status */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block text-xs">
                    Cloud Database &amp; Google Sheets Auto-Sync
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Live Background Connectivity &middot; Encrypted
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Connected
              </span>
            </div>

            {/* Operational Navigation List */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs divide-y divide-[#E2E8F0] dark:divide-slate-700/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className="w-full min-h-[52px] p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-[#3B82F6] dark:text-blue-400 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Performance Dashboard</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Daily, Monthly &amp; YTD sales and recovery analytics</span>
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
                className="w-full min-h-[52px] p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Employee Attendance Ledger</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Full logs with check-in/out timestamps and GPS</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenRateCard}
                className="w-full min-h-[52px] p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-[#3B82F6] dark:text-blue-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Official Rate List</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">View SKU trade prices &amp; carton sizes</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Share Team Working Link */}
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="w-full min-h-[52px] p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Share Team Working Link</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Send WhatsApp invite link &amp; scan QR code</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Google Sheets runs automatically in background; config restricted to Admin */}
              {currentUser.email === 'amjid.bisconni@gmail.com' && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="w-full min-h-[52px] p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Google Sheets Console (Admin)</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Auto-sync status &amp; admin controls</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

            </div>

            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="btn-outline w-full min-h-[44px]"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Password</span>
              </button>
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={onSignOut}
              className="w-full min-h-[44px] py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
        </div>
      </main>
      </div>

      {/* Notification Log Modal (Auto-dismissed toasts remain inspectable here) */}
      {isNotifLogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-2xl border border-[#E2E8F0] dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-[#0F172A] dark:bg-[#0B1120] border-b border-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F97316]" />
                <h2 className="text-sm font-bold">Notification Log</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifLogOpen(false)}
                aria-label="Close notification log"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              {notificationLog.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No notifications logged in this session yet.
                </div>
              ) : (
                notificationLog.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <span className="text-[#0F172A] dark:text-slate-200 font-medium">{n.message}</span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">{n.time}</span>
                  </div>
                ))
              )}
            </div>

            {notificationLog.length > 0 && (
              <div className="p-3 border-t border-[#E2E8F0] dark:border-slate-700/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNotificationLog([])}
                  className="btn-ghost text-xs"
                >
                  Clear Log
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 max-h-[90vh]">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex items-start justify-between bg-slate-50/90 dark:bg-[#0F172A]">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {etcCustomer.companyName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
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
                aria-label="Close action sheet"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Ledger Snapshot Bar */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-[#0B1120] border-b border-blue-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                  Net Ledger Balance
                </span>
                <span className="text-base font-black font-mono tabular-nums text-[#0F172A] dark:text-white">
                  PKR {(etcCustomer.currentBalance ?? etcCustomer.openingBalance ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                  Sanctioned Limit
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-600 dark:text-slate-300">
                  PKR {(etcCustomer.creditLimit || 350000).toLocaleString()}
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
                  className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xs block">Call Shop Proprietor</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{etcCustomer.phone}</span>
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
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0">
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
                className="w-full min-h-[48px] p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-blue-900 dark:text-blue-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">View Invoices &amp; Bills</span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300">Commercial bills and downloadable PDFs</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-500" />
              </button>

              {/* 5. Khata Ledger Statement */}
              <button
                type="button"
                onClick={() => {
                  const target = etcCustomer;
                  setEtcCustomer(null);
                  handleOpenLedgerForCustomer(target);
                }}
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
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
                className="w-full min-h-[48px] p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0">
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

      {/* Edit or Delete / Reverse Daily Entry Modal */}
      {editDeleteTarget && (
        <EditOrDeleteEntryModal
          isOpen={Boolean(editDeleteTarget)}
          onClose={() => setEditDeleteTarget(null)}
          entryType={editDeleteTarget.type}
          entryData={editDeleteTarget.data}
          currentUser={currentUser}
          onSave={(type, id, updates) => {
            if (type === 'ORDER' && onSaveOrderEdit) {
              onSaveOrderEdit(id, updates);
            } else if (type === 'RECOVERY' && onSaveRecoveryEdit) {
              onSaveRecoveryEdit(id, updates);
            } else if (type === 'ATTENDANCE' && onSaveAttendanceEdit) {
              onSaveAttendanceEdit(id, updates);
            }
          }}
          onDeleteOrReverse={(type, id, reason) => {
            if (type === 'ORDER' && onCancelOrReverseOrder) {
              onCancelOrReverseOrder(id, reason);
            } else if (type === 'RECOVERY' && onCancelOrReverseRecovery) {
              onCancelOrReverseRecovery(id, reason);
            } else if (type === 'ATTENDANCE' && onDeleteAttendance) {
              onDeleteAttendance(id, reason);
            }
          }}
        />
      )}

      {/* Fixed 5-Tab Mobile Bottom Navigation Bar (<= 15% viewport height, 44px+ touch targets) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className={`lg:hidden fixed z-40 h-16 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-[#E2E8F0] dark:border-slate-800 ${
          isNetlifyHosted
            ? 'bottom-[58px] inset-x-2 rounded-2xl border shadow-xl'
            : 'bottom-0 inset-x-0 border-t pb-safe'
        }`}
      >
        <div className="max-w-lg mx-auto h-full grid grid-cols-5 items-center px-1">
          {(
            [
              { id: 'DASHBOARD', label: 'Home', icon: LayoutDashboard },
              { id: 'ORDERING', label: 'Entry', icon: ShoppingBag },
              { id: 'INVOICES', label: 'Invoices', icon: Receipt },
              { id: 'LEDGER', label: 'Ledgers', icon: BookOpen },
              { id: 'CUSTOMERS', label: 'Dealers', icon: Users },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(item.id);
                  setActiveCustomerId(null);
                  setIsNavDrawerOpen(false);
                  scrollMainToTop('smooth');
                }}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                  active
                    ? 'text-[#3B82F6] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
