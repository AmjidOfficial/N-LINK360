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

<<<<<<< HEAD
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
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
=======
} from 'lucide-react';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
=======
  onSwitchToHeadOffice?: () => void;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
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
=======
  onOpenShareModal?: () => void;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
=======
  onSwitchToHeadOffice,
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
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
=======
  onOpenShareModal,
}) => {
  // Mobile Tab State: 'CUSTOMERS' | 'ORDERING' | 'RECOVERY' | 'INVOICES' | 'LEDGER' | 'MORE'
  const [activeTab, setActiveTab] = useState<MobileTab>('CUSTOMERS');
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Resolved dynamic active town nodes
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const activeTownNames = useMemo(() => getActiveTownNames(effectiveTownNodes), [effectiveTownNodes]);

  // Active Selected Customer for Customer 360 Screen
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

<<<<<<< HEAD
  // Sub-view on active customer: '360' | 'INVOICES' | 'ORDER_HISTORY' | 'LEDGER'
  const [customerSubView, setCustomerSubView] = useState<'360' | 'INVOICES' | 'ORDER_HISTORY' | 'LEDGER'>('360');
=======
  // Sub-view on active customer: '360' | 'INVOICES' | 'LEDGER'
  const [customerSubView, setCustomerSubView] = useState<'360' | 'INVOICES' | 'LEDGER'>('360');
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Customer for Etc Actions Sheet
  const [etcCustomer, setEtcCustomer] = useState<Customer | null>(null);

  // Drawers & Modals
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRecoveryDrawerOpen, setIsRecoveryDrawerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAttendanceLedgerOpen, setIsAttendanceLedgerOpen] = useState(false);
<<<<<<< HEAD
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifLogOpen, setIsNotifLogOpen] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('Auto · Ready');
  const [visitFilterTab, setVisitFilterTab] = useState<'ALL' | 'PRODUCTIVE' | 'NON_PRODUCTIVE'>('ALL');
  const [notificationLog, setNotificationLog] = useState<{ id: string; message: string; time: string; type: 'info' | 'success' | 'warning' }[]>([]);
  const toastTimerRef = useRef<number | null>(null);
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Customer List Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR' | 'OUTSTANDING'>('ALL');
  const [customerViewMode, setCustomerViewMode] = useState<'LIST' | 'MAP' | 'SPLIT'>('SPLIT');

  // Selected Route state for active town
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [showGeofenceMap, setShowGeofenceMap] = useState<boolean>(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
<<<<<<< HEAD
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
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
      pushNotification('GPS Geolocation is not supported by your device.', 'warning');
=======
      setGpsToast('GPS Geolocation is not supported by your device.');
      setTimeout(() => setGpsToast(null), 4000);
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      return;
    }
    setIsDetectingLocation(true);
    triggerHaptic('light');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestTown(latitude, longitude);
        if (nearest) {
<<<<<<< HEAD
          onSelectTown(normalizeTownName(nearest));
          triggerHaptic('success');
          pushNotification(`Auto-detected nearest town: ${normalizeTownName(nearest)}`, 'success');
=======
          onSelectTown(nearest);
          triggerHaptic('success');
          setGpsToast(`📍 Auto-detected nearest town: ${nearest}`);
          setTimeout(() => setGpsToast(null), 4000);
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        console.warn('GPS detection failed:', error);
        triggerHaptic('warning');
<<<<<<< HEAD
        pushNotification('Could not acquire high-accuracy GPS. Please select town from dropdown.', 'warning');
=======
        setGpsToast('Could not acquire high-accuracy GPS. Please select town from dropdown.');
        setTimeout(() => setGpsToast(null), 4000);
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

<<<<<<< HEAD
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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

<<<<<<< HEAD
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

=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      const matchSearch =
        !customerSearch ||
        c.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch) ||
<<<<<<< HEAD
        custLower.includes(customerSearch.toLowerCase());

=======
        custTown.toLowerCase().includes(customerSearch.toLowerCase());

      // Type / Status filter
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      let matchType = true;
      if (customerTypeFilter === 'DEALER') matchType = c.type === 'DEALER';
      if (customerTypeFilter === 'DISTRIBUTOR') matchType = c.type === 'DISTRIBUTOR';
      if (customerTypeFilter === 'OUTSTANDING') {
        const bal = c.currentBalance ?? c.openingBalance ?? 0;
        matchType = bal > 0;
      }

      return matchTown && matchSearch && matchType;
    });
<<<<<<< HEAD
  }, [customers, selectedTown, customerSearch, customerTypeFilter, canSwitchTown, isCheckedIn]);
=======
  }, [customers, selectedTown, customerSearch, customerTypeFilter]);
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
    <div className="min-h-screen bg-[#F1F8E9] dark:bg-[#070E0B] text-[#1B5E3A] dark:text-emerald-50 flex antialiased overflow-x-clip">
      {/* Persistent Collapsible Left Side Menu (Desktop / Large Screens lg+) */}
      <aside
        className={`hidden lg:flex flex-col justify-between sticky top-0 h-screen bg-white dark:bg-[#0B1610] border-r border-[#C8E6C9] dark:border-emerald-900/50 shrink-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div>
          {/* Brand + Collapse Toggle */}
          <div className="p-4 bg-[#1B5E3A] dark:bg-[#0E1A14] border-b border-[#2E6B46] dark:border-emerald-900/60 text-white flex items-center justify-between gap-2 min-h-[60px]">
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight truncate text-[#F1F8E9]">N-LINK 360</div>
                <div className="text-[10px] font-mono text-[#D9F99D] truncate">{currentUser.fullName}</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={isSidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-[#D9F99D] flex items-center justify-center shrink-0 cursor-pointer mx-auto"
              title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
            >
              <ArrowRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          <nav className="p-2.5 space-y-1">
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
                  }}
                  title={item.label}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#1B5E3A] dark:bg-emerald-700 text-white shadow-sm'
                      : 'text-[#1B5E3A] dark:text-emerald-100 hover:bg-[#F1F8E9] dark:hover:bg-emerald-950/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#D9F99D]' : 'text-[#4CAF50] dark:text-emerald-400'}`} />
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
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-xl bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F172A] dark:text-white cursor-pointer transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 text-[#0D9488] shrink-0 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                {!isSidebarCollapsed && (
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold">{isSyncingSheet ? 'Syncing...' : 'Sync'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{lastSyncAt}</div>
                  </div>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('MORE');
                setActiveCustomerId(null);
              }}
              title="Settings & Profile"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'MORE'
                  ? 'bg-[#1B5E3A] text-white'
                  : 'text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Settings &amp; Profile</span>}
            </button>
          </nav>
        </div>

        <div className="p-2.5 border-t border-[#E2E8F0] dark:border-slate-800">
          <button
            type="button"
            onClick={onSignOut}
            title="Log out"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0E1A14]/95 backdrop-blur-md border-b border-[#C8E6C9] dark:border-emerald-900/50 px-4 py-2.5 flex items-center justify-between text-[#1B5E3A] dark:text-emerald-50">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsNavDrawerOpen(true);
            }}
            aria-label="Open navigation menu"
            className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center text-[#1B5E3A] dark:text-emerald-100 hover:bg-[#F1F8E9] dark:hover:bg-emerald-950/60 cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <NationalLightLogo size="sm" showGlow />
          <div className="min-w-0">
            <span className="text-base font-bold tracking-tight text-[#1B5E3A] dark:text-emerald-50 block truncate">
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
            </span>
          </div>
        </div>

<<<<<<< HEAD
        {/* Header Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Industrial Dark Mode'}
            title={isDarkMode ? 'Light Mode' : 'Industrial Dark Mode'}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#1B5E3A] dark:text-emerald-200 hover:bg-[#F1F8E9] dark:hover:bg-emerald-950/60 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
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
              <RefreshCw className={`w-3.5 h-3.5 text-[#0D9488] dark:text-emerald-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingSheet ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNotifLogOpen(true)}
            aria-label="Open notification log"
            className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#0F172A] dark:text-emerald-100 hover:bg-slate-100 dark:hover:bg-emerald-950/60 cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {(notificationLog.length > 0 || orders.some((o) => o.status === 'PENDING_APPROVAL')) && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#F59E0B]" />
            )}
          </button>

        </div>
      </header>

      {/* Slide-Out Side Menu Drawer (All Tabs & Merged 2-Way Sync) */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsNavDrawerOpen(false)}
          />
          <aside className="relative z-10 w-76 max-w-[84vw] bg-white dark:bg-[#111C33] h-full flex flex-col justify-between border-r border-[#E2E8F0] dark:border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div>
              {/* Drawer Officer Profile Header */}
              <div className="p-5 bg-[#1B5E3A] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-bold shrink-0">
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
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
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
                      }}
                      className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1B5E3A] text-white'
                          : 'text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#F59E0B]' : 'text-[#0D9488]'}`} />
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
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0F172A] dark:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-4 h-4 text-[#0D9488] shrink-0 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                      <div>
                        <div className="text-sm font-bold">
                          {isSyncingSheet ? 'Syncing...' : 'Sync'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                    activeTab === 'MORE'
                      ? 'bg-[#1B5E3A] text-white'
                      : 'text-[#0F172A] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                  <span>Settings &amp; Profile</span>
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsNavDrawerOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#EF4444] hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
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
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-40 p-3 bg-[#1B5E3A] text-white rounded-xl shadow-lg border border-[#0D9488] text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <span className="pr-2">{gpsToast}</span>
          <button
            type="button"
            onClick={() => setGpsToast(null)}
            className="text-slate-300 hover:text-white px-1.5 py-0.5 cursor-pointer"
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
          >
            ✕
          </button>
        </div>
      )}

<<<<<<< HEAD
      {/* Main Content Area (Full-Screen Height — Maximum Width Utilization) */}
      <main className="flex-1 w-full max-w-full lg:max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-2.5 sm:py-4 pb-24 lg:pb-8">
        {/* ==================================================== */}
        {/* 1. ATTENDANCE & RECORD TAB (Unified Segmented View) */}
        {/* ==================================================== */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#111C33] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-800 grid grid-cols-2 gap-1 max-w-md">
              <button
                type="button"
                onClick={() => setIsAttendanceLedgerOpen(false)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  !isAttendanceLedgerOpen
                    ? 'bg-[#1B5E3A] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Daily Check-In / Out
              </button>
              <button
                type="button"
                onClick={() => setIsAttendanceLedgerOpen(true)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isAttendanceLedgerOpen
                    ? 'bg-[#1B5E3A] text-white'
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
          </div>
        )}

        {/* ==================================================== */}
<<<<<<< HEAD
        {/* 2. CUSTOMERS & ORDER BOOKING TAB */}
        {/* ==================================================== */}
        {(activeTab === 'CUSTOMERS' || activeTab === 'ORDERING') && (
=======
        {/* 2. CUSTOMERS TAB */}
        {/* ==================================================== */}
        {activeTab === 'CUSTOMERS' && (
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
          <div>
            {activeCustomer ? (
              <div>
                {/* 360 Overview Sub-view */}
                {customerSubView === '360' && (
<<<<<<< HEAD
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                )}

                {/* Invoices Sub-view */}
                {customerSubView === 'INVOICES' && (
<<<<<<< HEAD
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                )}

                {/* Ledger Sub-view */}
                {customerSubView === 'LEDGER' && (
<<<<<<< HEAD
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLedgerViewMode('ENTERPRISE_BENTO')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            ledgerViewMode === 'ENTERPRISE_BENTO'
                              ? 'bg-white dark:bg-slate-700 text-teal-900 dark:text-teal-200 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Recovery &amp; Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => setLedgerViewMode('DETAILED_JOURNAL')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            ledgerViewMode === 'DETAILED_JOURNAL'
                              ? 'bg-white dark:bg-slate-700 text-teal-900 dark:text-teal-200 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
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
              <div className="bg-white dark:bg-[#111C33] rounded-2xl p-6 border border-[#E2E8F0] dark:border-slate-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center mx-auto">
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
                    <Navigation className="w-4 h-4 text-[#0D9488]" />
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
                <div className="bg-white dark:bg-[#111C33] rounded-2xl p-3 border border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('ORDER_FORM')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        orderingSubTab === 'ORDER_FORM'
                          ? 'bg-[#1B5E3A] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Order Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('ORDER_LIST')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        orderingSubTab === 'ORDER_LIST'
                          ? 'bg-[#1B5E3A] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Order List ({orders.filter((o) => canSwitchTown || displayedCustomers.some((c) => c.id === o.customerId || c.companyName === o.customerName)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderingSubTab('RECENT_ORDERS')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        orderingSubTab === 'RECENT_ORDERS'
                          ? 'bg-[#1B5E3A] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Recent Orders (10)
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
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
                          <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-3.5 space-y-3">
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
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                            <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                C. Recovery Amount (PKR) — {activeOrderDealer?.companyName || 'Select Dealer'}
                              </label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  value={quickRecoveryAmount}
                                  onChange={(e) => setQuickRecoveryAmount(e.target.value)}
                                  placeholder="Enter Recovery Amount (Rs.)"
                                  className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-sm font-mono tabular-nums font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={quickRecoveryMode}
                                    onChange={(e) => setQuickRecoveryMode(e.target.value as any)}
                                    aria-label="Recovery Payment Mode"
                                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none"
                                  >
                                    <option value="CASH">Cash</option>
                                    <option value="ONLINE_TRANSFER">Online</option>
                                    <option value="CHEQUE">Cheque</option>
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!activeOrderDealer || !quickRecoveryAmount || Number(quickRecoveryAmount) <= 0}
                                    onClick={handleQuickRecoverySubmit}
                                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
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
                              stickyTopOffsetClass="top-[68px] lg:top-[56px]"
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
                            <div key={o.id || o.orderNumber} className="bg-white dark:bg-[#111C33] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-sm space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                  <div className="font-bold text-[#0D9488] font-mono">#{o.orderNumber || o.id?.slice(-6)}</div>
                                  <div className="font-bold text-[#0F172A] dark:text-white truncate">{o.customerName}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{o.orderDate || o.createdAt?.slice(0, 10)}</div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                                  o.status === 'APPROVED' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                                }`}>
                                  {o.status || 'SUBMITTED'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="text-xs">
                                  <span className="text-slate-500">Items: </span>
                                  <span className="font-bold text-[#0F172A] dark:text-white">{o.items?.length || 1}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold">Amount</div>
                                  <div className="font-mono font-black text-[#0F172A] dark:text-white">Rs. {Number(o.totalAmount || 0).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                {cust && onPreviewInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewInvoicePdf(o, cust)}
                                    className="flex-1 btn-outline min-h-[38px] text-[11px]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>
                                )}
                                {cust && onDownloadInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onDownloadInvoicePdf(o, cust)}
                                    className="flex-1 btn-primary min-h-[38px] text-[11px]"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                )}
                                {(canUserEditEntry(o, currentUser).allowed || canUserDeleteEntry(o, currentUser).allowed) && (
                                  <button
                                    type="button"
                                    onClick={() => setEditDeleteTarget({ type: 'ORDER', data: o })}
                                    className="btn-outline min-h-[38px] text-[11px] px-3 text-slate-700 dark:text-slate-200"
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
                    <div className="hidden md:block bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#1B5E3A] text-white text-[11px] font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">Order #</th>
                              <th className="py-2.5 px-3">Dealer / Distributor</th>
                              <th className="py-2.5 px-3 text-center">SKUs</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                            {orders
                              .filter((o) => canSwitchTown || displayedCustomers.some((c) => c.id === o.customerId || c.companyName === o.customerName))
                              .map((o) => {
                                const cust = customers.find((c) => c.id === o.customerId || c.companyName === o.customerName);
                                return (
                                  <tr key={o.id || o.orderNumber} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40">
                                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-[#0D9488]">
                                      #{o.orderNumber || o.id?.slice(-6)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-semibold text-[#0F172A] dark:text-white">{o.customerName}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{o.orderDate || o.createdAt?.slice(0, 10)}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                      {o.items?.length || 1}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                                      Rs. {Number(o.totalAmount || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`text-[10px] font-bold uppercase ${
                                        o.status === 'APPROVED' ? 'text-[#10B981]' : 'text-[#F59E0B]'
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
                                            className="btn-outline px-2 py-1 min-h-[32px] text-[11px]"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {cust && onDownloadInvoicePdf && (
                                          <button
                                            type="button"
                                            onClick={() => onDownloadInvoicePdf(o, cust)}
                                            className="btn-primary px-2 py-1 min-h-[32px] text-[11px]"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(canUserEditEntry(o, currentUser).allowed || canUserDeleteEntry(o, currentUser).allowed) && (
                                          <button
                                            type="button"
                                            onClick={() => setEditDeleteTarget({ type: 'ORDER', data: o })}
                                            className="btn-outline px-2 py-1 min-h-[32px] text-[11px] text-slate-600 dark:text-slate-300"
                                            title="Edit or Cancel / Reverse"
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
                    <div className="bg-white dark:bg-[#111C33] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#1B5E3A]" />
                          <span>Last 10 Orders Submitted</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Showing recent orders booked by {currentUser.fullName} with approval status.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#1B5E3A]/10 text-[#1B5E3A] dark:text-emerald-400 font-mono text-xs font-bold">
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
                          const isPending = !isApproved && !isRejected;

                          return (
                            <div
                              key={o.id || o.orderNumber}
                              className="bg-white dark:bg-[#111C33] rounded-2xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs space-y-3 transition-all hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono tabular-nums font-bold text-xs text-[#0D9488] dark:text-teal-400">
                                      #{o.orderNumber || o.id}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      &middot; {o.orderDate || o.createdAt?.slice(0, 10)}
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate mt-0.5">
                                    {o.customerName}
                                  </h4>
                                </div>

                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                  isApproved
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : isRejected
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                                }`}>
                                  {isApproved ? 'Approved / Verified' : isRejected ? 'Rejected' : 'Pending Approval'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">SKU Items</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {o.items?.length || 1} SKUs
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Total Qty</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {o.items?.reduce((sum, i) => sum + (i.orderedQuantity || i.quantity || 0), 0) || 0} pcs
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Order Amount</span>
                                  <span className="font-mono font-black text-[#1B5E3A] dark:text-emerald-400">
                                    Rs. {Number(o.totalAmount || 0).toLocaleString()}
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
                                    className="btn-outline text-xs px-3 py-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview Invoice</span>
                                  </button>
                                )}
                                {cust && onDownloadInvoicePdf && (
                                  <button
                                    type="button"
                                    onClick={() => onDownloadInvoicePdf(o, cust)}
                                    className="btn-primary text-xs px-3 py-1.5"
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                )}
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-200">
<<<<<<< HEAD
                {/* 1. STREAMLINED TOP COMMAND BAR */}
                <div className="bg-white dark:bg-[#111C33] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs space-y-3">
                  {/* Top Line: Territory Town Selector & New Dealer Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0" />
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] dark:text-teal-400 truncate">
                          {selectedTown} Beat
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium font-mono whitespace-nowrap">
                          ({displayedCustomers.length} Dealers)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      {/* Town Selector (Locked to Check-In Town for Field Officers; Unlocked for NSM/ZSM/Admin) */}
                      <select
                        value={selectedTown}
                        disabled={!canSwitchTown && isCheckedIn}
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                        onChange={(e) => {
                          triggerHaptic('selection');
                          onSelectTown(e.target.value);
                        }}
<<<<<<< HEAD
                        className="flex-1 sm:flex-none min-w-0 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-2 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer focus:border-[#0D9488] disabled:opacity-75 disabled:cursor-not-allowed"
                        title={canSwitchTown ? 'Switch territory town' : 'Locked to Check-In GPS town'}
                      >
                        {availableTowns.filter((t) => canSwitchTown || t !== 'All Towns').map((t) => (
=======
                        className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                        title="Switch territory town"
                      >
                        {availableTowns.filter((t) => t !== 'All Towns').map((t) => (
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setIsAddCustomerOpen(true)}
<<<<<<< HEAD
                        className="btn-primary px-3 py-2 min-h-[36px] text-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Dealer</span>
=======
                        className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Dealer</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                      className="min-h-[46px] p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Collect daily cash recovery"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 stroke-[2.25]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Daily Recovery</span>
                        <span className="block text-[10px] text-emerald-100 font-medium mt-0.5 truncate">Collect Wasooli</span>
=======
                      className="min-h-[46px] p-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Collect daily cash recovery"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/90 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Daily Recovery</span>
                        <span className="block text-[9px] text-emerald-200 font-medium mt-0.5 truncate">Collect Wasooli</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('ORDER');
                        setQuickPickerSearch('');
                      }}
<<<<<<< HEAD
                      className="min-h-[46px] p-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Book daily sales order"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 stroke-[2.25]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Daily Ordering</span>
                        <span className="block text-[10px] text-teal-100 font-medium mt-0.5 truncate">Book SKUs</span>
=======
                      className="min-h-[46px] p-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="Book daily sales order"
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-700/90 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Daily Ordering</span>
                        <span className="block text-[9px] text-teal-200 font-medium mt-0.5 truncate">Book SKUs</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('INVOICES');
                        setQuickPickerSearch('');
                      }}
<<<<<<< HEAD
                      className="min-h-[46px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer transition-all touch-manipulation"
                      title="View invoices and bills"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-[#0D9488] dark:text-teal-400 stroke-[2]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Invoices</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Bills &amp; PDF</span>
=======
                      className="min-h-[46px] p-2.5 rounded-2xl bg-sky-800 hover:bg-sky-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="View invoices and bills"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-700/90 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Invoices</span>
                        <span className="block text-[9px] text-sky-200 font-medium mt-0.5 truncate">Bills &amp; PDF</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setQuickActionPicker('LEDGER');
                        setQuickPickerSearch('');
                      }}
<<<<<<< HEAD
                      className="min-h-[46px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 cursor-pointer transition-all touch-manipulation"
                      title="View Khata ledger statement"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[#0D9488] dark:text-teal-400 stroke-[2]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-none">Khata Ledgers</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Passbook</span>
=======
                      className="min-h-[46px] p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white flex items-center gap-2.5 shadow-xs cursor-pointer transition-all touch-manipulation"
                      title="View Khata ledger statement"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-700/90 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight leading-none">Khata Ledgers</span>
                        <span className="block text-[9px] text-slate-300 font-medium mt-0.5 truncate">Passbook</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                      </div>
                    </button>
                  </div>

                  {/* Compact Financial Status Ribbon */}
<<<<<<< HEAD
                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Market Balance: <strong className="font-mono text-slate-900 dark:text-white font-bold">Rs. {totalMarketOutstanding.toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Today&apos;s Wasooli: <strong className="font-mono font-bold">Rs. {totalTodayRecoveryInTown.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* 1B. FMCG Book Order Summary Banner & Productive Tabs (Matches image_576ae861.png) */}
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
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search Dealer / Distributor, code, or town..."
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-[#111C33] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
                          />
                          {customerSearch && (
                            <button
                              type="button"
                              onClick={() => setCustomerSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCustomerViewMode(customerViewMode === 'LIST' ? 'MAP' : 'LIST')}
                          className="btn-outline px-3"
                          title="Toggle Map / List"
                        >
                          <MapPin className="w-4 h-4 text-[#0D9488]" />
                          <span className="hidden sm:inline">{customerViewMode === 'LIST' ? 'Map' : 'List'}</span>
                        </button>

                        {onAddCustomer && (
                          <button
                            type="button"
                            onClick={() => setIsAddCustomerOpen(true)}
                            className="btn-primary px-3.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                          </button>
                        )}
                      </div>

<<<<<<< HEAD
                      {/* Deep Navy #0B132B Summary Banner */}
                      <div className="bg-[#1B5E3A] text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-800">
                        <div>
                          <span className="text-slate-300 block text-[11px]">Booking Value</span>
                          <span className="font-mono tabular-nums font-bold text-sm text-[#F59E0B]">
                            Rs. {bookingValToday.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block text-[11px]">Productive Calls</span>
                          <span className="font-mono tabular-nums font-bold text-sm text-[#10B981]">
                            {productiveList.length} / {displayedCustomers.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block text-[11px]">Cartons Today</span>
                          <span className="font-mono tabular-nums font-bold text-sm">
                            {totalCartonsToday}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-300 block text-[11px]">Market Balance</span>
                          <span className="font-mono tabular-nums font-bold text-sm">
                            Rs. {totalMarketOutstanding.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 3-Tab Filter Strip */}
                      <div className="bg-white dark:bg-[#111C33] rounded-xl border border-[#E2E8F0] dark:border-slate-800 grid grid-cols-3 text-xs font-semibold overflow-hidden">
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
                              className={`py-3 px-2 text-center border-b-2 transition-colors cursor-pointer truncate ${
                                active
                                  ? 'border-[#0D9488] text-[#0D9488] dark:text-teal-400'
                                  : 'border-transparent text-slate-500 hover:text-[#0F172A] dark:hover:text-white'
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
                        <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 divide-y divide-[#E2E8F0] dark:divide-slate-800 overflow-hidden">
                          {visibleList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-2">
                              <Users className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                              <p className="font-semibold text-[#0F172A] dark:text-slate-300">No Dealers / Distributors found</p>
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
                                  className="relative p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  {isProductive && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981]" aria-hidden="true" />
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
                                    <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1 whitespace-nowrap truncate">
                                      Bal: <strong className="text-[#0F172A] dark:text-white">Rs. {netBal.toLocaleString()}</strong>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenOrderForCustomer(cust, e)}
                                      className="btn-primary px-2.5 min-h-[36px] text-[11px]"
                                      title="Book Order"
                                    >
                                      Order
                                    </button>

                                    {hasPhone && (
                                      <a
                                        href={`tel:${cust.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-[#0D9488]"
                                        title="Call Dealer"
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
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${
                    quickActionPicker === 'ORDER'
                      ? 'bg-[#0052FF]'
                      : quickActionPicker === 'RECOVERY'
                      ? 'bg-emerald-600'
                      : quickActionPicker === 'INVOICES'
                      ? 'bg-[#0052FF]'
=======
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    quickActionPicker === 'ORDER'
                      ? 'bg-teal-800'
                      : quickActionPicker === 'RECOVERY'
                      ? 'bg-emerald-700'
                      : quickActionPicker === 'INVOICES'
                      ? 'bg-sky-800'
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0052FF] dark:text-blue-400">
=======
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-800 dark:text-teal-400">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
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
              <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                <div className="bg-white dark:bg-[#111C33] rounded-2xl p-8 text-center border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
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
              <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
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
                <div className="bg-white dark:bg-[#111C33] rounded-2xl p-8 text-center border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
                  No dealers found in {selectedTown}. Select another town above.
                </div>
              )}
            </div>
          );
        })()}
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

        {/* ==================================================== */}
        {/* 4. MORE TAB */}
        {/* ==================================================== */}
        {activeTab === 'MORE' && (
          <div className="space-y-4 animate-in fade-in duration-200 text-xs">
            {/* User Profile Card with Edit Button */}
<<<<<<< HEAD
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0052FF] text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                    {currentUser.avatarInitials || 'NL'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.fullName}
                    </h2>
                    <p className="text-[11px] text-[#0052FF] dark:text-blue-400 font-semibold">
                      {currentUser.roleTitle || currentUser.role || 'Field Officer'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {currentUser.phone || '+92 300 1234567'} &middot; {selectedTown}
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
<<<<<<< HEAD
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052FF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
=======
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>
              </div>

              {pendingProfileRequest && (
<<<<<<< HEAD
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
=======
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Profile update request pending authorization by Admin / Shahzad Ullah.</span>
                </div>
              )}
            </div>

<<<<<<< HEAD
            {/* Seamless Auto-Sync Status */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block text-xs">
                    Cloud Database &amp; Google Sheets Auto-Sync
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Live Background Connectivity &middot; Encrypted
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                Connected
              </span>
            </div>

            {/* Operational Navigation List */}
<<<<<<< HEAD
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
=======
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
              <button
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
<<<<<<< HEAD
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052FF] dark:text-blue-400 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Performance Dashboard</span>
=======
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Performance Dashboard</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Employee Attendance Ledger</span>
=======
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Employee Attendance Ledger</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052FF] dark:text-blue-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">Official Rate List</span>
=======
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">Official Rate List</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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

<<<<<<< HEAD
              {/* Google Sheets runs automatically in background; config restricted to Admin */}
              {currentUser.email === 'amjid.bisconni@gmail.com' && (
=======
              {/* Show Google Sheets manual sync settings only if Admin */}
              {isAdminUser && (
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
                      <span className="text-[11px] text-slate-500">Auto-sync status &amp; admin controls</span>
=======
                      <span className="text-[11px] text-slate-500">Spreadsheet link &amp; schema manager</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

<<<<<<< HEAD
            </div>

            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="w-full py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change Password</span>
              </button>
            )}

=======
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

>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
      </div>

      {/* Notification Log Modal (Auto-dismissed toasts remain inspectable here) */}
      {isNotifLogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C33] w-full max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-[#1B5E3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F59E0B]" />
                <h2 className="text-sm font-bold">Notification Log</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifLogOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
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
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <span className="text-[#0F172A] dark:text-slate-200 font-medium">{n.message}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{n.time}</span>
                  </div>
                ))
              )}
            </div>

            {notificationLog.length > 0 && (
              <div className="p-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-end">
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
=======

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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
                  <div className="w-9 h-9 rounded-xl bg-[#003ECC] text-white flex items-center justify-center shrink-0">
=======
                  <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD

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
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-[#0E1A14]/95 backdrop-blur-md border-t border-[#C8E6C9] dark:border-emerald-900/50 pb-safe"
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
                }}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                  active
                    ? 'text-[#1B5E3A] dark:text-emerald-300 bg-[#D9F99D]/70 dark:bg-emerald-950/80 font-bold'
                    : 'text-[#5F8564] dark:text-emerald-400/70 hover:text-[#1B5E3A] dark:hover:text-emerald-200 font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    </div>
  );
};
