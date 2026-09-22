/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales Team App (Field Force Application)
 * Simple, Clean, Lightweight 3-Screen Architecture:
 * 1. ATTENDANCE (Town selection, GPS/Time capture, Today's Activities)
 * 2. DISTRIBUTOR / DEALERS (Financial Summary, Brand-grouped Order Entry, In-Customer Recovery, Invoices, Ledger)
 * 3. DASHBOARD (Role-scoped Target vs Achievement, TODAY/MTD/YTD)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import {
  Clock,
  Store,
  TrendingUp,
  Search,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Phone,
  MessageCircle,
  Plus,
  Minus,
  DollarSign,
  Printer,
  ArrowLeft,
  RotateCw,
  LogOut,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
  History,
  MapPin,
  Receipt,
  Eye,
  Compass,
  Flame,
  Zap,
  ShoppingBag,
  Sparkles,
  UserCheck,
  FileText,
  CreditCard,
  Layers,
  Navigation,
  CheckSquare,
  PackageCheck,
  Package,
  FileSpreadsheet,
  Download,
  X,
  AlertOctagon,
  Menu,
  KeyRound,
  Lock,
  EyeOff,
  Settings,
  Target,
} from 'lucide-react';
import { resetPassword, updatePassword } from '../services/auth';
import { syncManager, OfflineQueueItem } from '../services/offlineSyncEngine';
import { SettingsModal } from './SettingsModal';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { PrintLedgerModal } from './PrintLedgerModal';
import { DynamicDealerFormModal } from './DynamicDealerFormModal';
import { OrderPreviewDrawer } from './OrderPreviewDrawer';
import { NearbyDealersMap } from './NearbyDealersMap';
import { DealerHeatmap } from './DealerHeatmap';
import { GoogleSheetSyncModal } from './GoogleSheetSyncModal';
import { AutoSyncStatusBanner } from './AutoSyncStatusBanner';
import { InvoicePdfPreviewModal } from './stitch/InvoicePdfPreviewModal';
import {
  downloadSalesInvoicePdf,
  generateSalesInvoicePdfDoc,
  buildInvoiceWhatsAppText,
  buildInvoiceEmailUrl,
  InvoicePdfOptions,
} from '../utils/exportInvoicePdf';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { MtdAchievementGauge } from './MtdAchievementGauge';
import { TargetVsAchievementSummary } from './TargetVsAchievementSummary';
import { DailySummaryCard } from './DailySummaryCard';
import { FmcgCommandCenter } from './FmcgCommandCenter';
import { toast } from './ui/ToastNotification';
import { getAccessToken } from '../services/googleAuth';
import { validateTownGeofence, getTownCoordinates } from '../services/townCoordinates';
import { exportCustomerLedgerToCsv } from '../services/exportEngine';
import {
  submitAndSaveOrder,
  submitAndSaveRecovery,
  submitAndSaveCustomer,
  submitAndSaveAttendance,
  submitAndSaveVisit,
  registerAppDataProvider,
  startAutoSyncEngine,
  stopAutoSyncEngine,
} from '../services/googleSheetsTwoWaySyncService';
import {
  isAuthorizedApproverEmail,
  isAdminUser,
  isMultiRoleEligibleEmail,
  AVAILABLE_ROLES,
  getRoleDisplayTitle,
} from '../services/production-users';
import {
  approveCustomerRegistration,
  rejectCustomerRegistration,
} from '../services/supabase-transactions';
import {
  persistAttendanceRecord,
  fetchTodayAttendance,
  fetchAttendanceHistory,
  FieldAttendanceRecord,
  formatTimeFromIso,
} from '../services/attendance';
import {
  getActiveSpreadsheetId,
  pushOrderToGoogleSheet,
  pushRecoveryToGoogleSheet,
  pushAttendanceToGoogleSheet,
  pushVisitToGoogleSheet,
} from '../services/googleSheetsLiveService';
import {
  Customer,
  PaymentMode,
  SalesOrder,
  SalesOrderItem,
  SKU,
  InventoryBalance,
  User as UserType,
  UserRole,
  Recovery as RecoveryType,
  Invoice as InvoiceType,
  LedgerEntry,
} from '../types';

interface SalesRecoveryAppProps {
  currentUser: UserType;
  customers?: Customer[];
  skus?: SKU[];
  inventoryBalances?: InventoryBalance[];
  visits?: any[];
  salesOrders?: SalesOrder[];
  recoveries?: RecoveryType[];
  invoices?: InvoiceType[];
  ledgerEntries?: LedgerEntry[];
  lastRefreshTime?: Date;
  onLogout?: () => Promise<void> | void;
  onBookOrder?: (order: Partial<SalesOrder>) => void;
  onRecordRecovery?: (data: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    instrumentNumber?: string;
    bankName?: string;
    remarks?: string;
  }) => void;
  onLogVisit?: (visit: Partial<any>) => void;
  onSubmitRegistration?: (reg: any) => void;
  onApproveCustomer?: (customerId: string, approverName?: string) => Promise<void> | void;
  onRejectCustomer?: (customerId: string, reason?: string) => Promise<void> | void;
  onRoleSwitch?: (role: UserRole) => void;
  onRefresh?: () => Promise<void> | void;
  onToggleViewMode?: () => void;
  onOpenOfflineSync?: (tab?: 'FAILED' | 'PENDING' | 'HISTORY' | 'ALL') => void;
  pendingOfflineCount?: number;
}

export const SalesRecoveryApp: React.FC<SalesRecoveryAppProps> = ({
  currentUser,
  customers = [],
  skus = [],
  inventoryBalances = [],
  salesOrders = [],
  recoveries = [],
  invoices = [],
  visits = [],
  lastRefreshTime,
  onLogout,
  onBookOrder,
  onRecordRecovery,
  onLogVisit,
  onSubmitRegistration,
  onApproveCustomer,
  onRejectCustomer,
  onRoleSwitch,
  onRefresh,
  onToggleViewMode,
  onOpenOfflineSync,
  pendingOfflineCount = 0,
}) => {
  // -------------------------------------------------------------
  // Offline Sync Failure Indicator & Real-Time Queue Monitor
  // -------------------------------------------------------------
  const [failedOfflineCount, setFailedOfflineCount] = useState<number>(0);
  const [latestFailedItem, setLatestFailedItem] = useState<OfflineQueueItem | null>(null);

  useEffect(() => {
    const unsubQueue = syncManager.subscribeQueue((q) => {
      const failed = (q || []).filter((i) => i.status === 'FAILED');
      setFailedOfflineCount(failed.length);
      if (failed.length > 0) {
        const sorted = [...failed].sort((a, b) =>
          (b.lastAttemptAt || b.createdAt).localeCompare(a.lastAttemptAt || a.createdAt)
        );
        setLatestFailedItem(sorted[0]);
      } else {
        setLatestFailedItem(null);
      }
    });

    return () => {
      unsubQueue();
    };
  }, []);

  // -------------------------------------------------------------
  // 3 Primary Navigation Tabs: 'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'
  // -------------------------------------------------------------
  const [activeTab, setActiveTabState] = useState<'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'>(() => {
    try {
      const saved = localStorage.getItem('nlink_mobile_active_tab');
      if (saved === 'ATTENDANCE' || saved === 'DISTRIBUTORS' || saved === 'DASHBOARD') {
        return saved;
      }
    } catch {}
    return 'ATTENDANCE';
  });

  const [dashboardSubTab, setDashboardSubTab] = useState<'FINANCIAL' | 'FMCG_COMMAND'>('FMCG_COMMAND');

  const setActiveTab = useCallback((tab: 'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('nlink_mobile_active_tab', tab);
    } catch {}
  }, []);

  // Dealer Registration Modal State (Field Force Onboarding to Pending Queue)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [isAutoDownloadPdf, setIsAutoDownloadPdf] = useState(false);

  // Field Force Menu Drawer & Password Restore Modal State (Sections 11 & 29)
  const [showFieldForceMenu, setShowFieldForceMenu] = useState(false);
  const [showPasswordRestoreModal, setShowPasswordRestoreModal] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState(currentUser.email || '');
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [directNewPassword, setDirectNewPassword] = useState('');
  const [directConfirmPassword, setDirectConfirmPassword] = useState('');
  const [showDirectPass, setShowDirectPass] = useState(false);
  const [restoreTabMode, setRestoreTabMode] = useState<'RESET_LINK' | 'DIRECT_CHANGE'>('RESET_LINK');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const dailySummaryData = useMemo(() => {
    const todayOrders = salesOrders.filter((o) => {
      const d = (o.createdAt || o.orderDate || '').split('T')[0];
      return d === todayStr && o.status !== 'REJECTED' && o.status !== 'CANCELLED';
    });
    const todaySalesVal = todayOrders.reduce((sum, o) => sum + Number((o as any).totalAmount || o.requestedAmount || o.netAmount || 0), 0);

    const todayRecs = recoveries.filter((r) => {
      const d = (r.createdAt || r.paymentDate || '').split('T')[0];
      return d === todayStr && r.status !== 'REJECTED';
    });
    const todayRecoveryVal = todayRecs.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const todayVisits = (visits || []).filter((v) => {
      const d = (v.createdAt || v.checkInTime || v.time || v.date || '').split('T')[0];
      return d === todayStr;
    });

    const productiveCount = todayVisits.filter((v) => {
      if (v.isProductive || v.hasOrder || v.hasRecovery) return true;
      const purpose = (v.visitPurpose || v.purpose || '').toUpperCase();
      if (purpose.includes('ORDER') || purpose.includes('RECOVERY') || purpose.includes('COLLECTION')) return true;
      const custId = v.customerId;
      const hasOrderToday = todayOrders.some((o) => o.customerId === custId);
      const hasRecoveryToday = todayRecs.some((r) => r.customerId === custId);
      return hasOrderToday || hasRecoveryToday;
    }).length;

    const totalVisitsCount = todayVisits.length;
    const rate = totalVisitsCount > 0 ? Math.round((productiveCount / totalVisitsCount) * 100) : (todayOrders.length > 0 || todayRecs.length > 0 ? 100 : 0);

    return {
      todaySalesVal,
      todayOrdersCount: todayOrders.length,
      todayRecoveryVal,
      todayRecoveriesCount: todayRecs.length,
      totalVisitsCount,
      productiveCount,
      rate,
    };
  }, [salesOrders, recoveries, visits, todayStr]);

  const appDataForGoogleSheet = useMemo(() => ({
    customers,
    skus,
    inventoryBalances,
    salesOrders,
    recoveries,
    invoices,
    visits,
    productionUsers: [],
    targetVsAchievements: [],
    townPlans: [],
    auditLogs: [],
    offlinePendingQueue: [],
  }), [customers, skus, inventoryBalances, salesOrders, recoveries, invoices, visits]);

  // Online / Offline Indicator & Sync Glow state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => lastRefreshTime || new Date());
  const [lastSyncedText, setLastSyncedText] = useState<string>('just now');
  const [isSyncGlow, setIsSyncGlow] = useState(false);
  const lastSyncTimestampRef = React.useRef<number>(lastRefreshTime ? lastRefreshTime.getTime() : Date.now());

  // Trigger subtle green glow pulse whenever an automatic background sync successfully completes
  useEffect(() => {
    if (!lastRefreshTime) return;
    const currentMs = lastRefreshTime.getTime();
    if (lastSyncTimestampRef.current && currentMs > lastSyncTimestampRef.current) {
      setLastSyncedAt(lastRefreshTime);
      setIsSyncGlow(true);
      const timer = setTimeout(() => setIsSyncGlow(false), 3600);
      lastSyncTimestampRef.current = currentMs;
      return () => clearTimeout(timer);
    }
    lastSyncTimestampRef.current = currentMs;
  }, [lastRefreshTime]);

  useEffect(() => {
    const updateSyncText = () => {
      const diffSecs = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      if (diffSecs < 60) {
        setLastSyncedText('just now');
      } else if (diffSecs < 120) {
        setLastSyncedText('1 min ago');
      } else if (diffSecs < 3600) {
        setLastSyncedText(`${Math.floor(diffSecs / 60)} mins ago`);
      } else {
        setLastSyncedText(lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    updateSyncText();
    const interval = setInterval(updateSyncText, 15000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2-Way Google Sheets Database & 30-Minute Background Auto-Sync Engine
  useEffect(() => {
    registerAppDataProvider(() => appDataForGoogleSheet);
    startAutoSyncEngine(() => appDataForGoogleSheet);
    return () => {
      stopAutoSyncEngine();
    };
  }, [appDataForGoogleSheet]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        const now = new Date();
        setLastSyncedAt(now);
        setLastSyncedText('just now');
        setIsSyncGlow(true);
        setTimeout(() => setIsSyncGlow(false), 3600);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // -------------------------------------------------------------
  // 0. AUTHORIZED ACTIVE CUSTOMERS (Approval & Quarantine Guard)
  // -------------------------------------------------------------
  // Strictly isolate active authorized customers. Any Dealer/Distributor in 'PENDING_APPROVAL',
  // 'PENDING', or 'REJECTED' status is excluded from customer selection and active operational lists.
  const authorizedCustomers = useMemo(() => {
    return customers.filter((c) => {
      const approval = (c.approvalStatus || '').toUpperCase();
      if (approval === 'PENDING_APPROVAL' || approval === 'PENDING' || approval === 'REJECTED') {
        return false;
      }
      const status = (c.status || '').toUpperCase();
      if (status === 'INACTIVE' || status === 'SUSPENDED' || status === 'PENDING_APPROVAL') {
        return false;
      }
      if (c.isActive === false) {
        return false;
      }
      return true;
    });
  }, [customers]);

  // -------------------------------------------------------------
  // 1. ATTENDANCE SECTION STATE & DATA
  // -------------------------------------------------------------
  // Towns assigned to the user or derived from authorized customers (including Peshawar, Mardan, etc.)
  const assignedTowns = useMemo(() => {
    return Array.from(new Set(authorizedCustomers.map((c) => c.city || '').map((town) => town.trim()).filter(Boolean)));
  }, [authorizedCustomers]);

  const [selectedTown, setSelectedTown] = useState<string>(() => {
    const cachedTown = localStorage.getItem('nlink_sales_active_town') || '';
    return assignedTowns.includes(cachedTown) ? cachedTown : (assignedTowns[0] || '');
  });

  useEffect(() => {
    if (selectedTown && !assignedTowns.includes(selectedTown)) {
      setSelectedTown(assignedTowns[0] || '');
    }
  }, [assignedTowns, selectedTown]);

  useEffect(() => {
    localStorage.setItem('nlink_sales_active_town', selectedTown);
  }, [selectedTown]);

  // Attendance recording state
  interface AttendanceRecord {
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    time?: string; // backwards compatibility
    duration?: string;
    town: string;
    userName: string;
    lat: number;
    lng: number;
    accuracy: number;
    locationName?: string;
    status: 'Checked In' | 'Checked Out';
  }

  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(() => {
    const saved = localStorage.getItem('nlink_sales_attendance_today');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toISOString().split('T')[0];
        if (parsed.date === todayStr) return parsed;
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<FieldAttendanceRecord[]>([]);
  const [loadingAttendanceLogs, setLoadingAttendanceLogs] = useState<boolean>(false);
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);

  // Load authoritative today attendance & recent logs from Supabase on mount
  const refreshAttendanceHistory = useCallback(async () => {
    setLoadingAttendanceLogs(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [todayDbRec, history] = await Promise.all([
        fetchTodayAttendance(todayStr),
        fetchAttendanceHistory(30),
      ]);

      if (todayDbRec) {
        setAttendanceRecord({
          date: todayDbRec.attendance_date,
          checkInTime: formatTimeFromIso(todayDbRec.check_in_at),
          checkOutTime: todayDbRec.check_out_at ? formatTimeFromIso(todayDbRec.check_out_at) : undefined,
          time: formatTimeFromIso(todayDbRec.check_in_at),
          town: todayDbRec.town,
          userName: currentUser.fullName,
          lat: todayDbRec.latitude,
          lng: todayDbRec.longitude,
          accuracy: todayDbRec.gps_accuracy_m || 15,
          locationName: `${todayDbRec.town} Territory`,
          status: todayDbRec.status === 'CHECKED_OUT' ? 'Checked Out' : 'Checked In',
          duration: todayDbRec.duration_text,
        });
      }
      setAttendanceLogs(history);
    } catch (err) {
      console.warn('[Attendance] History refresh warning:', err);
    } finally {
      setLoadingAttendanceLogs(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refreshAttendanceHistory();
  }, [refreshAttendanceHistory]);

  const [geofenceViolationModal, setGeofenceViolationModal] = useState<{
    isOpen: boolean;
    distanceMeters: number;
    distanceKm: number;
    townName: string;
    townCoords: { lat: number; lng: number };
    userCoords: { lat: number; lng: number; accuracy: number };
  } | null>(null);

  const [printLedgerModalOpen, setPrintLedgerModalOpen] = useState(false);

  // Check In Action with 500m Town Geofence Enforcement
  const handleCheckIn = (allowGeofenceOverride = false) => {
    setGpsCapturing(true);
    setAttendanceMessage(null);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const completeCheckIn = (lat: number, lng: number, accuracy: number, method: string) => {
      const rec: AttendanceRecord = {
        date: todayStr,
        checkInTime: timeStr,
        time: timeStr,
        town: selectedTown,
        userName: currentUser.fullName,
        lat,
        lng,
        accuracy,
        locationName: `${selectedTown} Territory`,
        status: 'Checked In',
      };
      setAttendanceRecord(rec);
      setGpsCapturing(false);
      setAttendanceMessage(`Check-in successful at ${timeStr} for ${selectedTown} (${method})! Record persisted.`);
      toast.success(
        'Attendance Check-In Recorded',
        `Check-in at ${selectedTown} (${timeStr}) verified with 500m geofence perimeter.`
      );

      // 1. Authoritative Supabase persistence
      void persistAttendanceRecord({
        date: todayStr,
        checkInTime: timeStr,
        town: selectedTown,
        lat,
        lng,
        accuracy,
        status: 'Checked In',
        userName: currentUser.fullName,
      }).then(() => {
        void refreshAttendanceHistory();
      });

      // 2. 2-Way Local Storage buffering & Google Sheet sync for Attendance
      try {
        const token = getAccessToken();
        submitAndSaveAttendance(
          {
            id: `ATT-${Date.now()}`,
            date: todayStr,
            checkInTime: timeStr,
            town: selectedTown,
            latitude: lat,
            longitude: lng,
            gpsAccuracy: accuracy,
            status: 'PRESENT',
          },
          currentUser.fullName,
          token
        ).catch((err) => console.warn('Attendance 2-way sync notice:', err));
      } catch {
        // non-blocking
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          const accuracy = Math.round(pos.coords.accuracy || 15);

          // 500m Geofence Radius Check against assigned town coordinates
          const geofence = validateTownGeofence(lat, lng, selectedTown, 500);

          if (!geofence.isWithinGeofence && !allowGeofenceOverride) {
            setGpsCapturing(false);
            const distLabel = geofence.distanceMeters >= 1000
              ? `${geofence.distanceKm.toFixed(2)} km`
              : `${Math.round(geofence.distanceMeters)} meters`;

            setAttendanceMessage(
              `⚠️ Geofence Alert: You are ${distLabel} away from ${geofence.townCenter.town} beat center. Attendance requires being within 500m.`
            );
            toast.error(
              '500m Geofence Check Failed',
              `Your GPS is ${distLabel} away from ${geofence.townCenter.town}. Check-in requires being within 500m of the town.`
            );

            setGeofenceViolationModal({
              isOpen: true,
              distanceMeters: geofence.distanceMeters,
              distanceKm: geofence.distanceKm,
              townName: selectedTown,
              townCoords: { lat: geofence.townCenter.lat, lng: geofence.townCenter.lng },
              userCoords: { lat, lng, accuracy },
            });
            return;
          }

          const methodTag = geofence.isWithinGeofence
            ? `500m Geofence Verified - ${Math.round(geofence.distanceMeters)}m from ${geofence.townCenter.town}`
            : `Geofence Flagged - ${Math.round(geofence.distanceMeters)}m distance`;

          completeCheckIn(lat, lng, accuracy, methodTag);
        },
        () => {
          setGpsCapturing(false);
          setAttendanceMessage('GPS location is required for attendance and 500m geofence validation. Check-in was not recorded.');
          toast.error('GPS Signal Required', 'Please enable device location services to verify 500m geofence.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setGpsCapturing(false);
      setAttendanceMessage('This device does not provide GPS location. Check-in was not recorded.');
    }
  };

  // Check Out Action
  const handleCheckOut = () => {
    if (!attendanceRecord) return;
    setGpsCapturing(true);
    setAttendanceMessage(null);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Calculate duty duration
    let durationText = '8 hrs 00 mins';
    if (attendanceRecord.checkInTime) {
      try {
        const parts = attendanceRecord.checkInTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (parts) {
          let h = parseInt(parts[1], 10);
          const m = parseInt(parts[2], 10);
          const ampm = parts[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          const checkInTotalMin = h * 60 + m;
          const nowTotalMin = now.getHours() * 60 + now.getMinutes();
          const diffMin = Math.max(0, nowTotalMin - checkInTotalMin);
          const diffH = Math.floor(diffMin / 60);
          const remMin = diffMin % 60;
          durationText = `${diffH} hrs ${remMin} mins`;
        }
      } catch {
        durationText = 'Duty Completed';
      }
    }

    const completeCheckOut = (lat: number, lng: number, accuracy: number) => {
      const rec: AttendanceRecord = {
        ...attendanceRecord,
        checkOutTime: timeStr,
        duration: durationText,
        lat,
        lng,
        accuracy,
        status: 'Checked Out',
      };
      setAttendanceRecord(rec);
      setGpsCapturing(false);
      setAttendanceMessage(`Check-out recorded at ${timeStr}. Total Duty Duration: ${durationText}`);
      toast.info(
        'Shift Completed',
        `Check-out logged at ${timeStr}. Total Duty: ${durationText}. Record persisted.`
      );

      // Authoritative Supabase persistence
      void persistAttendanceRecord({
        date: rec.date,
        checkInTime: rec.checkInTime,
        checkOutTime: timeStr,
        town: rec.town,
        lat,
        lng,
        accuracy,
        status: 'Checked Out',
        userName: currentUser.fullName,
      }).then(() => {
        void refreshAttendanceHistory();
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          completeCheckOut(
            Number(pos.coords.latitude.toFixed(4)),
            Number(pos.coords.longitude.toFixed(4)),
            Math.round(pos.coords.accuracy || 15)
          );
        },
        () => {
          completeCheckOut(attendanceRecord.lat, attendanceRecord.lng, attendanceRecord.accuracy);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      completeCheckOut(attendanceRecord.lat, attendanceRecord.lng, attendanceRecord.accuracy);
    }
  };

  // Backwards compatibility alias
  const handleMarkAttendance = handleCheckIn;

  const [gpsSyncing, setGpsSyncing] = useState(false);
  const [lastGpsSyncTime, setLastGpsSyncTime] = useState<Date | null>(null);

  const handleSyncGpsLocation = () => {
    setGpsSyncing(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          const accuracy = Math.round(pos.coords.accuracy || 15);
          const rec: AttendanceRecord = {
            date: todayStr,
            checkInTime: attendanceRecord?.checkInTime || timeStr,
            checkOutTime: attendanceRecord?.checkOutTime,
            time: timeStr,
            town: selectedTown,
            userName: currentUser.fullName,
            lat,
            lng,
            accuracy,
            locationName: `${selectedTown} Territory`,
            status: attendanceRecord?.status || 'Checked In',
          };
          setAttendanceRecord(rec);
          setLastGpsSyncTime(new Date());
          setGpsSyncing(false);
          setAttendanceMessage(`GPS coordinates refreshed at ${timeStr} (${lat}° N, ${lng}° E)!`);

          void persistAttendanceRecord({
            date: rec.date,
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            town: rec.town,
            lat,
            lng,
            accuracy,
            status: rec.status === 'Checked Out' ? 'Checked Out' : 'Checked In',
            userName: currentUser.fullName,
          });
        },
        () => {
          setLastGpsSyncTime(new Date());
          setGpsSyncing(false);
          setAttendanceMessage(`GPS location refreshed for ${selectedTown}!`);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLastGpsSyncTime(new Date());
      setGpsSyncing(false);
    }
  };

  // Day-by-Day (Date 1 to 31) MTD Visit Activity Table
  // Format: Date | Town | # of Visit Dealer | Sales | Recovry
  const mtdDailyActivities = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();

    // Map existing orders and recoveries by day
    const dayOrdersMap = new Map<number, { amount: number; town: string }>();
    const dayRecoveriesMap = new Map<number, { amount: number; town: string }>();
    const dayVisitsMap = new Map<number, { count: number; town: string }>();

    const custTownMap = new Map<string, string>(authorizedCustomers.map((c) => [c.id, c.city || selectedTown] as [string, string]));

    salesOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') return;
      const d = new Date(o.orderDate || o.createdAt || '');
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const prev = dayOrdersMap.get(day) || { amount: 0, town: custTownMap.get(o.customerId) || selectedTown };
        prev.amount += Number(o.totalAmount || 0);
        dayOrdersMap.set(day, prev);
      }
    });

    recoveries.forEach((r) => {
      if (r.status === 'REJECTED') return;
      const d = new Date(r.collectionDate || r.createdAt || '');
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const prev = dayRecoveriesMap.get(day) || { amount: 0, town: custTownMap.get(r.customerId) || selectedTown };
        prev.amount += Number(r.amount || 0);
        dayRecoveriesMap.set(day, prev);
      }
    });

    (visits || []).forEach((v) => {
      const d = new Date(v.checkinTime || v.createdAt || '');
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const prev = dayVisitsMap.get(day) || { count: 0, town: selectedTown };
        prev.count += 1;
        dayVisitsMap.set(day, prev);
      }
    });

    const rows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const isPastOrToday = day <= currentDay;
      const orderData = dayOrdersMap.get(day);
      const recoveryData = dayRecoveriesMap.get(day);
      const visitData = dayVisitsMap.get(day);

      const dayDate = new Date(currentYear, currentMonth, day);
      const isSunday = dayDate.getDay() === 0;

      let town = orderData?.town || recoveryData?.town || visitData?.town || selectedTown;
      let visitCount = visitData?.count || 0;
      let sales = orderData?.amount || 0;
      let recovery = recoveryData?.amount || 0;

      rows.push({
        day,
        town,
        visitCount: isSunday ? 0 : visitCount,
        sales: isSunday ? 0 : sales,
        recovery: isSunday ? 0 : recovery,
        isSunday,
        isToday: day === currentDay,
      });
    }

    return rows;
  }, [salesOrders, recoveries, visits, authorizedCustomers, selectedTown]);

  // Compute Month-to-Date (MTD) Activities strictly from Month-to-Date transactions matching Enterprise Portal
  const mtdActivities = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const townStats: Record<string, { sales: number; recovery: number }> = {};

    // Initialize all assigned towns
    assignedTowns.forEach((t) => {
      townStats[t] = { sales: 0, recovery: 0 };
    });

    const custTownMap = new Map<string, string>(authorizedCustomers.map((c) => [c.id, c.city || selectedTown] as [string, string]));

    salesOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') return;
      const oDateStr = o.orderDate || o.createdAt || '';
      if (!oDateStr) return;
      const oDate = new Date(oDateStr);
      if (!isNaN(oDate.getTime()) && oDate.getFullYear() === currentYear && oDate.getMonth() === currentMonth) {
        const town = custTownMap.get(o.customerId) || selectedTown;
        if (!townStats[town]) townStats[town] = { sales: 0, recovery: 0 };
        townStats[town].sales += Number(o.totalAmount || 0);
      }
    });

    recoveries.forEach((r) => {
      if (r.status === 'REJECTED') return;
      const rDateStr = r.collectionDate || r.createdAt || '';
      if (!rDateStr) return;
      const rDate = new Date(rDateStr);
      if (!isNaN(rDate.getTime()) && rDate.getFullYear() === currentYear && rDate.getMonth() === currentMonth) {
        const town = custTownMap.get(r.customerId) || selectedTown;
        if (!townStats[town]) townStats[town] = { sales: 0, recovery: 0 };
        townStats[town].recovery += Number(r.amount || 0);
      }
    });

    const mtdMonthLabel = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    return Object.entries(townStats).map(([town, data]) => ({
      date: `MTD ${mtdMonthLabel}`,
      town,
      sales: data.sales,
      recovery: data.recovery,
    }));
  }, [assignedTowns, authorizedCustomers, salesOrders, recoveries, selectedTown]);

  // Compute past visits for same selected town from last 3 months
  const pastTownVisits = useMemo(() => {
    if (!selectedTown) return [];
    
    // Date from 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const townCustomerIds = new Set(
      authorizedCustomers
        .filter((c) => (c.city || 'Lahore').toLowerCase() === selectedTown.toLowerCase())
        .map((c) => c.id)
    );

    return (visits || [])
      .filter((v) => {
        if (!v.customerId || !townCustomerIds.has(v.customerId)) return false;
        const vDate = new Date(v.checkinTime);
        return vDate >= threeMonthsAgo;
      })
      .map((v) => {
        const customer = authorizedCustomers.find((c) => c.id === v.customerId);
        return {
          id: v.id,
          customerId: v.customerId,
          customerName: customer ? customer.companyName : v.customerName || 'Unknown Dealer',
          purpose: v.purpose || 'Routine Visit',
          notes: v.notes || '',
          orderPlaced: !!v.orderPlaced,
          recoveryCollected: !!v.recoveryCollected,
          checkinTime: v.checkinTime,
          dateFormatted: new Date(v.checkinTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      })
      .sort((a, b) => new Date(b.checkinTime).getTime() - new Date(a.checkinTime).getTime());
  }, [selectedTown, visits, authorizedCustomers]);

  // Greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // -------------------------------------------------------------
  // 2. DISTRIBUTOR / DEALER SECTION STATE & DATA
  // -------------------------------------------------------------
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerInnerTab, setCustomerInnerTab] = useState<'ORDER' | 'RECOVERY' | 'INVOICES' | 'LEDGER'>('ORDER');

  // Background Polling Engine for Real-Time Financial Position (60-second Interval)
  const [lastFinancialSync, setLastFinancialSync] = useState<Date>(() => new Date());
  const [isFinancialSyncing, setIsFinancialSyncing] = useState(false);

  useEffect(() => {
    // Only run the 60-second background polling when on the DISTRIBUTORS tab
    if (activeTab !== 'DISTRIBUTORS' || !onRefresh) return;

    const intervalId = setInterval(async () => {
      try {
        setIsFinancialSyncing(true);
        await onRefresh();
        setLastFinancialSync(new Date());
      } catch (err) {
        console.warn('Background financial polling error:', err);
      } finally {
        setIsFinancialSyncing(false);
      }
    }, 60000); // 60,000 milliseconds = 60 seconds

    return () => clearInterval(intervalId);
  }, [activeTab, onRefresh]);

  const handleManualFinancialSync = async () => {
    if (!onRefresh || isFinancialSyncing) return;
    setIsFinancialSyncing(true);
    try {
      await onRefresh();
      setLastFinancialSync(new Date());
    } finally {
      setIsFinancialSyncing(false);
    }
  };

  const [dealerCategoryFilter, setDealerCategoryFilter] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'DISTRIBUTOR' | 'DEALER'>('ALL');

  const isApproverOrAdmin = useMemo(() => {
    return (
      isAuthorizedApproverEmail(currentUser?.email) ||
      isAdminUser(currentUser) ||
      ['SUPER_ADMIN', 'MANAGEMENT', 'HEAD_OFFICE'].includes(currentUser?.role || '')
    );
  }, [currentUser]);

  // Filter pending customers: Field officers only see registration requests they created; authorized admins see all
  const pendingCustomers = useMemo(() => {
    return customers.filter((c) => {
      const approval = (c.approvalStatus || '').toUpperCase();
      const status = (c.status || '').toUpperCase();
      const isPending =
        approval === 'PENDING_APPROVAL' ||
        approval === 'PENDING' ||
        status === 'PENDING_APPROVAL' ||
        c.isActive === false;

      if (!isPending) return false;

      // Authorized Executive Admins & Approvers see all pending approval records
      if (isApproverOrAdmin) return true;

      // Field officers and managers see registration requests they created, submitted, or in their assigned region/town
      const isCreator =
        c.createdByUserId === currentUser.id ||
        (c as any).createdBy === currentUser.id ||
        (c as any).submittedById === currentUser.id ||
        (c as any).submittedBy === currentUser.fullName ||
        (c as any).salesUserId === currentUser.id ||
        (c as any).salesUserName === currentUser.fullName ||
        c.assignedOfficerId === currentUser.id ||
        (c as any).assignedTsm === currentUser.fullName ||
        (c as any).registeredBy === currentUser.email ||
        (c as any).creatorEmail === currentUser.email ||
        (currentUser.region && (
          (c.region || '').toLowerCase().includes(currentUser.region.toLowerCase()) ||
          currentUser.region.toLowerCase().includes((c.region || '').toLowerCase())
        )) ||
        (currentUser.town && (
          (c.city || '').toLowerCase().includes(currentUser.town.toLowerCase()) ||
          (c.town || '').toLowerCase().includes(currentUser.town.toLowerCase())
        ));

      return Boolean(isCreator);
    });
  }, [customers, isApproverOrAdmin, currentUser]);

  const filteredPendingCustomers = useMemo(() => {
    let list = pendingCustomers;
    if (customerTypeFilter !== 'ALL') {
      list = list.filter((c) => (c.type || 'DEALER').toUpperCase() === customerTypeFilter);
    }
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      return (
        (c.companyName || c.name || '').toLowerCase().includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q)
      );
    });
  }, [pendingCustomers, customerTypeFilter, customerSearchQuery]);

  // Filter authorized customers by search query and customer type (DISTRIBUTOR / DEALER)
  const filteredCustomers = useMemo(() => {
    let list = authorizedCustomers;
    if (customerTypeFilter !== 'ALL') {
      list = list.filter((c) => (c.type || 'DEALER').toUpperCase() === customerTypeFilter);
    }
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      return (
        c.companyName.toLowerCase().includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q)
      );
    });
  }, [authorizedCustomers, customerTypeFilter, customerSearchQuery]);

  const activeCustomer = useMemo(() => {
    return (
      authorizedCustomers.find((c) => c.id === selectedCustomerId) ||
      pendingCustomers.find((c) => c.id === selectedCustomerId) ||
      null
    );
  }, [authorizedCustomers, pendingCustomers, selectedCustomerId]);

  // 1-line Financial Calculations (Live Ledger Equation)
  const customerFinancials = useMemo(() => {
    if (!activeCustomer) {
      return { openingBalance: 0, tillDateInvoices: 0, tillDateRecovery: 0, netBalance: 0 };
    }
    const openingBalance = Number(activeCustomer.openingBalance || 0);

    const tillDateInvoices = invoices
      .filter((inv) => inv.customerId === activeCustomer.id)
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const tillDateRecovery = recoveries
      .filter((rec) => rec.customerId === activeCustomer.id)
      .reduce((sum, rec) => sum + Number(rec.amount || 0), 0);

    const netBalance = openingBalance + tillDateInvoices - tillDateRecovery;

    return { openingBalance, tillDateInvoices, tillDateRecovery, netBalance };
  }, [activeCustomer, invoices, recoveries]);

  // Credit Health Indicator & Average Payment Delay Calculation
  const customerCreditHealth = useMemo(() => {
    if (!activeCustomer) {
      return {
        avgDelayDays: 0,
        status: 'EXCELLENT' as const,
        label: 'Prompt Payer (< 10 Days Delay)',
        color: 'emerald',
        creditLimit: 500000,
        creditDays: 30,
        creditUtilizationPct: 0,
        riskLevel: 'LOW',
        delayScoreText: '0 Days Avg Delay',
      };
    }

    const creditLimit = Number(activeCustomer.creditLimit || 500000);
    const creditDays = Number(activeCustomer.creditDays || 30);
    const netBal = customerFinancials.netBalance;
    const creditUtilizationPct = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, netBal) / creditLimit) * 100)) : 0;

    // Filter customer transactions
    const custInvoices = invoices.filter((inv) => inv.customerId === activeCustomer.id);
    const custRecoveries = recoveries.filter((rec) => rec.customerId === activeCustomer.id);

    let totalDelayDays = 0;
    let sampleCount = 0;

    if (custRecoveries.length > 0 && custInvoices.length > 0) {
      custRecoveries.forEach((rec) => {
        const recTime = new Date(rec.collectionDate || rec.createdAt || Date.now()).getTime();
        const matchedInv = custInvoices.find((inv) => {
          const invTime = new Date(inv.invoiceDate || inv.createdAt || Date.now()).getTime();
          return invTime <= recTime;
        });
        if (matchedInv) {
          const invTime = new Date(matchedInv.invoiceDate || matchedInv.createdAt || Date.now()).getTime();
          const daysTaken = Math.max(0, Math.round((recTime - invTime) / (1000 * 60 * 60 * 24)));
          const delay = Math.max(0, daysTaken - creditDays);
          totalDelayDays += delay;
          sampleCount++;
        }
      });
    }

    // Determine average delay in days
    let avgDelayDays = 0;
    if (sampleCount > 0) {
      avgDelayDays = Math.round(totalDelayDays / sampleCount);
    } else if (netBal > creditLimit) {
      avgDelayDays = 42;
    } else if (netBal > creditLimit * 0.7) {
      avgDelayDays = 21;
    } else if (netBal > 0) {
      avgDelayDays = 8;
    } else {
      avgDelayDays = 0;
    }

    let status: 'EXCELLENT' | 'GOOD' | 'WATCHLIST' | 'CRITICAL' = 'EXCELLENT';
    let label = 'Prompt Payer (< 10 Days Delay)';
    let color = 'emerald';
    let riskLevel = 'LOW';

    if (avgDelayDays <= 10) {
      status = 'EXCELLENT';
      label = 'Prompt Payer (< 10 Days Delay)';
      color = 'emerald';
      riskLevel = 'LOW';
    } else if (avgDelayDays <= 25) {
      status = 'GOOD';
      label = 'Normal Clearance (11-25 Days Delay)';
      color = 'teal';
      riskLevel = 'MODERATE';
    } else if (avgDelayDays <= 45) {
      status = 'WATCHLIST';
      label = 'Delayed Clearance (26-45 Days Delay)';
      color = 'amber';
      riskLevel = 'WATCHLIST';
    } else {
      status = 'CRITICAL';
      label = 'High Risk / Overdue (> 45 Days Delay)';
      color = 'rose';
      riskLevel = 'CRITICAL';
    }

    return {
      avgDelayDays,
      status,
      label,
      color,
      creditLimit,
      creditDays,
      creditUtilizationPct,
      riskLevel,
      delayScoreText: `${avgDelayDays} Days Avg Delay`,
    };
  }, [activeCustomer, customerFinancials, invoices, recoveries]);

  // Order Entry State: Quantities keyed by SKU ID
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [showOrderPreviewDrawer, setShowOrderPreviewDrawer] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<{
    order: Partial<SalesOrder>;
    customer: Customer;
  } | null>(null);
  const [showPostOrderModal, setShowPostOrderModal] = useState<boolean>(false);
  const [pdfPreviewModalData, setPdfPreviewModalData] = useState<{
    isOpen: boolean;
    pdfDataUrl: string;
    pdfFilename: string;
    order: any;
    customer: Customer;
    onDownload: () => void;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuStockFilter, setSkuStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SELECTED'>('ALL');

  // Rebuilt SalesPulse N-LINK Entry Form States
  const [entryRegion, setEntryRegion] = useState<string>('All Regions');
  const [entryTsm, setEntryTsm] = useState<string>('Shahid Khan');
  const [entryDate, setEntryDate] = useState<string>('09/17/2026');
  const [todaysRecoveryAmount, setTodaysRecoveryAmount] = useState<string>('');
  const [todaysRecoveryMode, setTodaysRecoveryMode] = useState<PaymentMode>('CASH');
  const [todaysRecoveryInstrument, setTodaysRecoveryInstrument] = useState<string>('');
  const [todaysRecoveryBank, setTodaysRecoveryBank] = useState<string>('');
  const [todaysRecoveryRemarks, setTodaysRecoveryRemarks] = useState<string>('');
  const [isSubmittingCombined, setIsSubmittingCombined] = useState<boolean>(false);
  const [combinedSuccessMsg, setCombinedSuccessMsg] = useState<string | null>(null);

  const townFilteredCustomers = useMemo(() => {
    if (!selectedTown) return authorizedCustomers;
    const list = authorizedCustomers.filter(
      (c) => (c.city || '').toLowerCase() === selectedTown.toLowerCase()
    );
    return list.length > 0 ? list : authorizedCustomers;
  }, [authorizedCustomers, selectedTown]);

  const todaysRecoveryNum = Math.max(0, Number(todaysRecoveryAmount) || 0);
  const liveNetBalance =
    customerFinancials.openingBalance +
    customerFinancials.tillDateInvoices -
    customerFinancials.tillDateRecovery -
    todaysRecoveryNum;

  const getSkuStock = (skuId: string): number => {
    const bal = inventoryBalances.find((b) => b.skuId === skuId);
    if (bal) return Number(bal.currentQuantity || 0);
    const sku = skus.find((s) => s.id === skuId);
    return Number(sku?.currentStock || 0);
  };

  // Group SKUs by Brand with Live Search & Stock Filter
  const brandsGrouped = useMemo<Record<string, SKU[]>>(() => {
    const map: Record<string, SKU[]> = {};
    const searchLower = skuSearchQuery.trim().toLowerCase();

    skus.forEach((sku) => {
      // 1. Search Query Filter
      if (searchLower) {
        const matchesName = sku.name.toLowerCase().includes(searchLower);
        const matchesCode = (sku.skuCode || '').toLowerCase().includes(searchLower);
        const matchesBrand = (sku.brandName || '').toLowerCase().includes(searchLower);
        const matchesCategory = (sku.category || '').toLowerCase().includes(searchLower);
        if (!matchesName && !matchesCode && !matchesBrand && !matchesCategory) {
          return;
        }
      }

      // 2. Stock Filter
      const stock = getSkuStock(sku.id);
      const reorderLevel = sku.reorderLevel || 10;
      const isOutOfStock = stock <= 0;
      const isLowStock = !isOutOfStock && stock <= reorderLevel;
      const currentQty = orderQuantities[sku.id] || 0;

      if (skuStockFilter === 'IN_STOCK' && stock <= 0) return;
      if (skuStockFilter === 'LOW_STOCK' && !isLowStock) return;
      if (skuStockFilter === 'OUT_OF_STOCK' && stock > 0) return;
      if (skuStockFilter === 'SELECTED' && currentQty <= 0) return;

      const brand = sku.brandName || sku.category || 'National Lights';
      if (!map[brand]) map[brand] = [];
      map[brand].push(sku);
    });
    return map;
  }, [skus, skuSearchQuery, skuStockFilter, inventoryBalances, orderQuantities]);

  // Auto-expand brands when searching or filtering
  useEffect(() => {
    if (skuSearchQuery.trim() || skuStockFilter !== 'ALL') {
      const allBrands: Record<string, boolean> = {};
      Object.keys(brandsGrouped).forEach((b) => {
        allBrands[b] = true;
      });
      setExpandedBrands(allBrands);
    }
  }, [skuSearchQuery, skuStockFilter, brandsGrouped]);

  // Expand first brand by default
  useEffect(() => {
    const brandKeys = Object.keys(brandsGrouped);
    if (brandKeys.length > 0 && Object.keys(expandedBrands).length === 0) {
      setExpandedBrands({ [brandKeys[0]]: true });
    }
  }, [brandsGrouped]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const toggleExpandAllBrands = () => {
    const allKeys = Object.keys(brandsGrouped);
    const areAllExpanded = allKeys.length > 0 && allKeys.every((k) => expandedBrands[k]);
    const nextState: Record<string, boolean> = {};
    allKeys.forEach((k) => {
      nextState[k] = !areAllExpanded;
    });
    setExpandedBrands(nextState);
  };

  const handleQtyChange = (skuId: string, val: number) => {
    const clamped = Math.max(0, val);
    setOrderQuantities((prev) => ({ ...prev, [skuId]: clamped }));
  };

  // Order Summary Math
  const orderSummary = useMemo(() => {
    let totalSKUs = 0;
    let totalQuantity = 0;
    let orderValue = 0;

    Object.entries(orderQuantities).forEach(([skuId, qty]) => {
      const quantityNum = Number(qty || 0);
      if (quantityNum > 0) {
        const sku = skus.find((s) => s.id === skuId);
        if (sku) {
          totalSKUs += 1;
          totalQuantity += quantityNum;
          const price = Number(sku.tradePrice || sku.retailPrice || 0);
          orderValue += quantityNum * price;
        }
      }
    });

    return { totalSKUs, totalQuantity, orderValue };
  }, [orderQuantities, skus]);

  // Customer 360: Previous 5 Items Ordered by Selected Customer for Quick Reorder
  const customerPreviousOrderedItems = useMemo(() => {
    if (!activeCustomer || !salesOrders || salesOrders.length === 0) return [];

    // Filter past orders placed by this customer, sorted by orderDate descending
    const pastOrders = salesOrders
      .filter((o) => o.customerId === activeCustomer.id && o.items && o.items.length > 0)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    const seenSkuIds = new Set<string>();
    const items: {
      skuId: string;
      skuCode: string;
      skuName: string;
      orderedQuantity: number;
      unitPrice: number;
      orderDate: string;
      brandName: string;
      availableStock: number;
    }[] = [];

    for (const order of pastOrders) {
      for (const item of order.items) {
        if (!seenSkuIds.has(item.skuId)) {
          seenSkuIds.add(item.skuId);
          const matchedSku = skus.find((s) => s.id === item.skuId);
          const stock = getSkuStock(item.skuId);
          items.push({
            skuId: item.skuId,
            skuCode: item.skuCode || matchedSku?.skuCode || 'SKU',
            skuName: item.skuName || matchedSku?.name || 'Product',
            orderedQuantity: Math.max(1, Number(item.orderedQuantity || 1)),
            unitPrice: Number(item.unitPrice || matchedSku?.tradePrice || 0),
            orderDate: order.orderDate,
            brandName: matchedSku?.brandName || (matchedSku as any)?.category || 'National Lights',
            availableStock: stock,
          });
          if (items.length >= 5) break;
        }
      }
      if (items.length >= 5) break;
    }

    return items;
  }, [activeCustomer, salesOrders, inventoryBalances, skus]);

  const handleQuickReorder = (targetSkuId?: string) => {
    if (customerPreviousOrderedItems.length === 0) return;

    const itemsToProcess = targetSkuId
      ? customerPreviousOrderedItems.filter((i) => i.skuId === targetSkuId)
      : customerPreviousOrderedItems;

    if (itemsToProcess.length === 0) return;

    setOrderQuantities((prev) => {
      const updated = { ...prev };
      itemsToProcess.forEach((item) => {
        const stock = getSkuStock(item.skuId);
        const qtyToSet = stock > 0 ? Math.min(item.orderedQuantity, stock) : item.orderedQuantity;
        updated[item.skuId] = qtyToSet;
      });
      return updated;
    });

    // Expand brand accordions for these SKUs
    const brandsToOpen: Record<string, boolean> = {};
    itemsToProcess.forEach((item) => {
      if (item.brandName) {
        brandsToOpen[item.brandName] = true;
      }
    });
    setExpandedBrands((prev) => ({ ...prev, ...brandsToOpen }));

    // Auto-switch to Order Entry view so field rep sees the populated items
    setCustomerInnerTab('ORDER');

    setOrderSuccessMessage(
      targetSkuId
        ? `Quick Reorder: Loaded "${itemsToProcess[0]?.skuName}" (${itemsToProcess[0]?.orderedQuantity} pcs) into Order Entry!`
        : `Quick Reorder: Populated Order Entry grid with previous ${itemsToProcess.length} items!`
    );
    setTimeout(() => setOrderSuccessMessage(null), 4500);
  };

  const handleConfirmSubmitOrder = async (previewBreakdown?: {
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    remarks: string;
  }) => {
    if (!activeCustomer || orderSummary.totalQuantity === 0) return;
    setOrderSubmitting(true);

    try {
      const discountPct = previewBreakdown ? previewBreakdown.discountPercent : 0;
      const orderItems: SalesOrderItem[] = Object.entries(orderQuantities)
        .filter(([_, qty]) => Number(qty || 0) > 0)
        .map(([skuId, qty]) => {
          const sku = skus.find((s) => s.id === skuId);
          const price = Number(sku?.tradePrice || sku?.retailPrice || 0);
          const quantityNum = Number(qty || 0);
          const packs = Number(sku?.packsPerCarton || 50);
          const unitsPerPack = Number(sku?.unitsPerPack || 1);
          const totalUnitsPerCarton = packs * unitsPerPack;
          const gross = quantityNum * price;
          const discountAmt = Math.round(gross * (discountPct / 100));
          return {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            orderId: '',
            skuId,
            skuCode: sku?.skuCode || '',
            skuName: sku?.name || '',
            skuVersionId: sku?.currentVersionId || `VER-${skuId}-v1`,
            versionNumber: sku?.currentVersionNumber || 1,
            unitsPerCartonSnapshot: totalUnitsPerCarton,
            unitTradePriceSnapshot: Number(sku?.tradePrice || price),
            unitRetailPriceSnapshot: Number(sku?.retailPrice || price * 1.5),
            packagingUnit: sku?.packagingUnit || 'CARTON',
            orderedQuantity: quantityNum,
            unitPrice: price,
            discountPercent: discountPct,
            lineTotal: gross - discountAmt,
          };
        });

      const subtotal = previewBreakdown ? previewBreakdown.subtotal : orderSummary.orderValue;
      const discountAmount = previewBreakdown ? previewBreakdown.discountAmount : 0;
      const taxable = subtotal - discountAmount;
      const taxAmount = previewBreakdown ? previewBreakdown.taxAmount : 0;
      const totalAmount = previewBreakdown ? previewBreakdown.totalAmount : taxable;

      const newOrder: Partial<SalesOrder> = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        customerId: activeCustomer.id,
        customerName: activeCustomer.companyName,
        customerCode: activeCustomer.customerCode,
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        orderDate: new Date().toISOString(),
        items: orderItems,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        status: 'SUBMITTED',
        creditCheckStatus: 'GREEN',
        notes: previewBreakdown?.remarks || undefined,
      };

      if (onBookOrder) {
        await onBookOrder(newOrder);
      }

      // 2-Way Local Storage buffering & immediate submission to Google Sheets
      const googleToken = getAccessToken();
      submitAndSaveOrder(newOrder, activeCustomer.companyName, googleToken).catch((err) =>
        console.warn('Google Sheet 2-way order sync notice:', err)
      );

      setOrderQuantities({});
      setShowOrderConfirmModal(false);
      setShowOrderPreviewDrawer(false);
      setLastSubmittedOrder({
        order: newOrder,
        customer: activeCustomer,
      });
      setShowPostOrderModal(true);
      setOrderSuccessMessage(`Order #${newOrder.orderNumber} placed successfully for Rs. ${newOrder.totalAmount?.toLocaleString()}!`);
      toast.success(
        'Order Placed Successfully',
        `Order #${newOrder.orderNumber} booked for Rs. ${newOrder.totalAmount?.toLocaleString()} (${newOrder.items?.length || 0} line items). Ready for PDF download!`
      );
      setTimeout(() => setOrderSuccessMessage(null), 10000);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Dedicated PDF Generation & Dispatch Actions
  const handleDownloadOrderPdf = async (orderToPrint?: any, targetCustomer?: Customer) => {
    const ord = orderToPrint || lastSubmittedOrder?.order;
    const cust = targetCustomer || lastSubmittedOrder?.customer || activeCustomer;
    if (!ord || !cust) {
      toast.warning('No Order Selected', 'Please select or book an order to generate the PDF receipt.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const result = await downloadSalesInvoicePdf({
        customer: cust,
        order: ord,
        previousBalance: cust.currentBalance || cust.openingBalance || 0,
        preparedByName: `${currentUser.fullName} (${currentUser.role || 'Field Officer'})`,
      });
      toast.success('Invoice PDF Downloaded', `Successfully generated & downloaded: ${result.filename}`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('PDF Error', 'Failed to generate official invoice PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleLivePreviewOrderPdf = async (orderToPreview?: any, targetCustomer?: Customer) => {
    const ord = orderToPreview || lastSubmittedOrder?.order;
    const cust = targetCustomer || lastSubmittedOrder?.customer || activeCustomer;
    if (!ord || !cust) {
      toast.warning('No Order Selected', 'Please select or book an order to preview.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const result = await generateSalesInvoicePdfDoc({
        customer: cust,
        order: ord,
        previousBalance: cust.currentBalance || cust.openingBalance || 0,
        preparedByName: `${currentUser.fullName} (${currentUser.role || 'Field Officer'})`,
      });
      setPdfPreviewModalData({
        isOpen: true,
        pdfDataUrl: result.dataUrl,
        pdfFilename: result.filename,
        order: ord,
        customer: cust,
        onDownload: () => {
          result.doc.save(result.filename);
          toast.success('Downloaded', `Saved ${result.filename}`);
        },
      });
    } catch (err: any) {
      console.error('PDF preview error:', err);
      toast.error('Preview Error', 'Failed to render live PDF preview.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppShareOrder = (orderToShare?: any, targetCustomer?: Customer) => {
    const ord = orderToShare || lastSubmittedOrder?.order;
    const cust = targetCustomer || lastSubmittedOrder?.customer || activeCustomer;
    if (!ord || !cust) {
      toast.warning('No Order Selected', 'Please select or book an order to share.');
      return;
    }
    const text = buildInvoiceWhatsAppText(cust, ord, {
      officerName: currentUser.fullName,
      officerPhone: (currentUser as any).phone || '',
    });
    const cleanPhone = (cust.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // In-Customer Recovery Form State
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryMode, setRecoveryMode] = useState<PaymentMode>('CASH');
  const [recoveryInstrumentNo, setRecoveryInstrumentNo] = useState('');
  const [recoveryBank, setRecoveryBank] = useState('');
  const [recoveryRemarks, setRecoveryRemarks] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  const handleSubmitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const amountNum = Number(recoveryAmount);
    if (!amountNum || amountNum <= 0) {
      toast.warning('Invalid Amount', 'Please enter a valid recovery amount.');
      return;
    }

    if (recoveryMode !== 'CASH' && !recoveryInstrumentNo.trim()) {
      toast.warning('Reference Required', 'Please enter the Cheque Number or Transaction Reference ID.');
      return;
    }

    setRecoverySubmitting(true);
    try {
      const recoveryPayload = {
        customerId: activeCustomer.id,
        amount: amountNum,
        paymentMode: recoveryMode,
        instrumentNumber: recoveryInstrumentNo,
        bankName: recoveryBank,
        remarks: recoveryRemarks,
      };

      if (onRecordRecovery) {
        await onRecordRecovery(recoveryPayload);
      }

      // 2-Way Local Storage buffering & immediate submission to Google Sheets
      const googleToken = getAccessToken();
      submitAndSaveRecovery(recoveryPayload, activeCustomer.companyName, googleToken).catch((err) =>
        console.warn('Google Sheet 2-way recovery sync notice:', err)
      );

      setRecoveryAmount('');
      setRecoveryInstrumentNo('');
      setRecoveryBank('');
      setRecoveryRemarks('');
      setRecoverySuccessMessage(`Recovery of Rs. ${amountNum.toLocaleString()} recorded successfully!`);
      toast.success(
        'Recovery Payment Recorded',
        `Payment of Rs. ${amountNum.toLocaleString()} collected for ${activeCustomer.companyName} via ${recoveryMode}.`
      );
      setTimeout(() => setRecoverySuccessMessage(null), 5000);
    } finally {
      setRecoverySubmitting(false);
    }
  };

  // Combined N-LINK Sales & Recovery Submission Handler
  const handleSaveAndSubmitToNlink = async () => {
    if (!activeCustomer) {
      toast.warning('Select Customer', 'Please select a dealer or shop first.');
      return;
    }
    const hasOrder = orderSummary.totalQuantity > 0;
    const hasRecovery = todaysRecoveryNum > 0;

    if (!hasOrder && !hasRecovery) {
      toast.warning('No Entry Made', 'Please enter SKU order quantities or a Today Recovery amount.');
      return;
    }

    if (hasRecovery && todaysRecoveryMode !== 'CASH' && !todaysRecoveryInstrument.trim()) {
      toast.warning('Cheque / Ref Required', 'Please enter the Cheque Number or Transfer Reference for non-cash recovery.');
      return;
    }

    const orderValueSnapshot = orderSummary.orderValue;
    const orderQtySnapshot = orderSummary.totalQuantity;
    const recoveryValueSnapshot = todaysRecoveryNum;
    const customerNameSnapshot = activeCustomer.companyName;

    setIsSubmittingCombined(true);

    try {
      // 1. Submit Order if any SKUs selected
      if (hasOrder) {
        await handleConfirmSubmitOrder();
      }

      // 2. Submit Today's Recovery if amount entered
      if (hasRecovery) {
        const recoveryPayload = {
          customerId: activeCustomer.id,
          amount: recoveryValueSnapshot,
          paymentMode: todaysRecoveryMode,
          instrumentNumber: todaysRecoveryInstrument || 'CASH-REC',
          bankName: todaysRecoveryBank,
          remarks: todaysRecoveryRemarks || `Entry Form Recovery collected on ${entryDate} (TSM: ${entryTsm}, Town: ${selectedTown})`,
        };

        if (onRecordRecovery) {
          await onRecordRecovery(recoveryPayload);
        }

        const googleToken = getAccessToken();
        submitAndSaveRecovery(recoveryPayload, customerNameSnapshot, googleToken).catch((err) =>
          console.warn('Google Sheet 2-way recovery sync notice:', err)
        );
      }

      setCombinedSuccessMsg(
        `Successfully submitted ${hasOrder ? `Order of Rs. ${orderValueSnapshot.toLocaleString()} (${orderQtySnapshot} pcs)` : ''} ${hasOrder && hasRecovery ? 'and ' : ''} ${hasRecovery ? `Recovery of Rs. ${recoveryValueSnapshot.toLocaleString()}` : ''} for ${customerNameSnapshot}! Live synced with Supabase & Google Sheets.`
      );
      toast.success(
        'N-LINK Live Entry Synchronized',
        `Data recorded and synced with Google Sheets (1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo).`
      );

      // Reset form fields
      setTodaysRecoveryAmount('');
      setTodaysRecoveryInstrument('');
      setTodaysRecoveryBank('');
      setTodaysRecoveryRemarks('');
      setOrderQuantities({});
      setTimeout(() => setCombinedSuccessMsg(null), 6000);
    } catch (err: any) {
      toast.error('Submission Error', err?.message || 'Failed to submit entry.');
    } finally {
      setIsSubmittingCombined(false);
    }
  };

  // Invoices & Ledger Date Filters
  const [invoiceFromDate, setInvoiceFromDate] = useState('2026-08-01');
  const [invoiceToDate, setInvoiceToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<InvoiceType | null>(null);

  const customerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return invoices.filter((inv) => {
      if (inv.customerId !== activeCustomer.id) return false;
      const date = (inv.invoiceDate || '').split('T')[0];
      return date >= invoiceFromDate && date <= invoiceToDate;
    });
  }, [invoices, activeCustomer, invoiceFromDate, invoiceToDate]);

  const [ledgerFromDate, setLedgerFromDate] = useState('2026-07-01');
  const [ledgerToDate, setLedgerToDate] = useState(new Date().toISOString().split('T')[0]);

  const customerLedgerData = useMemo(() => {
    if (!activeCustomer) return [];
    const openBal = Number(activeCustomer.openingBalance || 0);

    const rows: {
      date: string;
      type: string;
      ref: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    // Opening Balance Row
    let running = openBal;
    rows.push({
      date: ledgerFromDate,
      type: 'Opening Balance',
      ref: 'OB-START',
      debit: openBal >= 0 ? openBal : 0,
      credit: openBal < 0 ? Math.abs(openBal) : 0,
      balance: running,
    });

    // Invoices (Debits)
    const custInvs = invoices.filter((i) => i.customerId === activeCustomer.id);
    custInvs.forEach((inv) => {
      const d = (inv.invoiceDate || '').split('T')[0];
      if (d >= ledgerFromDate && d <= ledgerToDate) {
        running += Number(inv.totalAmount || 0);
        rows.push({
          date: d,
          type: 'Invoice',
          ref: inv.invoiceNumber,
          debit: Number(inv.totalAmount || 0),
          credit: 0,
          balance: running,
        });
      }
    });

    // Recoveries (Credits)
    const custRecs = recoveries.filter((r) => r.customerId === activeCustomer.id);
    custRecs.forEach((rec) => {
      const d = (rec.collectionDate || '').split('T')[0];
      if (d >= ledgerFromDate && d <= ledgerToDate) {
        running -= Number(rec.amount || 0);
        rows.push({
          date: d,
          type: 'Recovery',
          ref: rec.instrumentNumber || rec.receiptNumber || 'REC-PAY',
          debit: 0,
          credit: Number(rec.amount || 0),
          balance: running,
        });
      }
    });

    // Sort by date ascending (keep opening balance first)
    const [ob, ...rest] = rows;
    rest.sort((a, b) => a.date.localeCompare(b.date));
    return [ob, ...rest];
  }, [activeCustomer, invoices, recoveries, ledgerFromDate, ledgerToDate]);

  const activeCustomerLedgerEntries: LedgerEntry[] = useMemo(() => {
    if (!activeCustomer) return [];
    return customerLedgerData.map((row, idx) => ({
      id: `led-${activeCustomer.id}-${idx}`,
      customerId: activeCustomer.id,
      entryDate: row.date,
      transactionType: row.type === 'Opening Balance' ? 'OPENING_BALANCE' : row.type === 'Invoice' ? 'INVOICE' : 'PAYMENT',
      referenceNumber: row.ref,
      description: `${row.type} Ref: ${row.ref}`,
      debitAmount: row.debit,
      creditAmount: row.credit,
      runningBalance: row.balance,
      createdAt: row.date,
    }));
  }, [activeCustomer, customerLedgerData]);

  // -------------------------------------------------------------
  // 3. DASHBOARD SECTION (Role-Scoped Target vs Achievement)
  // -------------------------------------------------------------
  const [dashboardPeriod, setDashboardPeriod] = useState<'TODAY' | 'MTD' | 'YTD'>('MTD');

  // Hierarchy Role Mapping & Scope
  const roleScope = useMemo(() => {
    const r = currentUser.role;
    if (r === 'TSM' || r === 'OB' || r === 'SS') {
      return { level: 'TSM', scopeLabel: 'My Territory', subtitle: 'Towns, Distributors, Daily Route' };
    }
    if (r === 'ASM') {
      return { level: 'ASM', scopeLabel: 'My Area', subtitle: 'TSMs, Assigned Towns, Distributors' };
    }
    if (r === 'RSM') {
      return { level: 'RSM', scopeLabel: 'My Region', subtitle: 'ASMs, TSMs, Regional Distributors' };
    }
    return { level: 'NSM', scopeLabel: 'My National / Assigned Business', subtitle: 'Regions, RSMs, ASMs, National Distribution' };
  }, [currentUser.role]);

  // Period targets & achievements calculation strictly aligned with Enterprise Dashboard
  const performanceData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    const isMatchDate = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (dashboardPeriod === 'TODAY') {
        return d.toISOString().split('T')[0] === todayStr;
      }
      if (dashboardPeriod === 'YTD') {
        return d.getFullYear() === currentYear;
      }
      // Strict MTD default
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    };

    const filteredOrders = salesOrders.filter((o) => {
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') return false;
      return isMatchDate(o.orderDate || o.createdAt);
    });

    const filteredRecs = recoveries.filter((r) => {
      if (r.status === 'REJECTED') return false;
      return isMatchDate(r.collectionDate || r.createdAt);
    });

    const salesAchieved = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const recoveryAchieved = filteredRecs.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Dynamic targets based on period & user monthly target
    const baseMonthlyTarget = currentUser.monthlyTarget && currentUser.monthlyTarget > 0 ? currentUser.monthlyTarget : 4500000;
    const salesTarget =
      dashboardPeriod === 'TODAY' ? Math.round(baseMonthlyTarget / 26) : dashboardPeriod === 'MTD' ? baseMonthlyTarget : baseMonthlyTarget * 12;
    const recoveryTarget =
      dashboardPeriod === 'TODAY' ? Math.round((baseMonthlyTarget * 0.8) / 26) : dashboardPeriod === 'MTD' ? Math.round(baseMonthlyTarget * 0.8) : Math.round(baseMonthlyTarget * 0.8 * 12);

    const salesPercent = salesTarget > 0 ? Math.round((salesAchieved / salesTarget) * 100) : 0;
    const recoveryPercent = recoveryTarget > 0 ? Math.round((recoveryAchieved / recoveryTarget) * 100) : 0;

    const salesVariance = salesAchieved - salesTarget;
    const recoveryVariance = recoveryAchieved - recoveryTarget;

    return {
      salesTarget,
      salesAchieved,
      salesPercent,
      salesVariance,
      recoveryTarget,
      recoveryAchieved,
      recoveryPercent,
      recoveryVariance,
    };
  }, [salesOrders, recoveries, dashboardPeriod, currentUser]);

  // Dedicated dynamic Month-to-Date (MTD) Sales Order metrics
  const mtdStats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const mtdOrders = salesOrders.filter((o) => {
      const d = (o.orderDate || o.createdAt || '').slice(0, 7);
      return d === currentMonth && o.status !== 'CANCELLED' && o.status !== 'REJECTED';
    });

    const mtdSalesAchieved = mtdOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const mtdTarget = currentUser.monthlyTarget && currentUser.monthlyTarget > 0 ? currentUser.monthlyTarget : 4500000;
    const mtdPercent = mtdTarget > 0 ? Math.round((mtdSalesAchieved / mtdTarget) * 100) : 0;
    const mtdVariance = mtdSalesAchieved - mtdTarget;

    const approvedMtdOrders = mtdOrders.filter((o) => o.status === 'APPROVED' || o.status === 'CONFIRMED');
    const pendingMtdOrders = mtdOrders.filter((o) => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL');

    const approvedMtdValue = approvedMtdOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const pendingMtdValue = pendingMtdOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);
    const targetRemaining = Math.max(0, mtdTarget - mtdSalesAchieved);
    const dailyRunRateNeeded = Math.round(targetRemaining / daysRemaining);

    return {
      currentMonth,
      monthName: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalOrders: mtdOrders.length,
      mtdSalesAchieved,
      mtdTarget,
      mtdPercent,
      mtdVariance,
      approvedOrdersCount: approvedMtdOrders.length,
      approvedMtdValue,
      pendingOrdersCount: pendingMtdOrders.length,
      pendingMtdValue,
      daysInMonth,
      dayOfMonth,
      daysRemaining,
      dailyRunRateNeeded,
      recentMtdOrders: mtdOrders.slice(0, 5),
    };
  }, [salesOrders, currentUser]);

  const [isGeneratingReportPdf, setIsGeneratingReportPdf] = useState(false);

  // MTD Recoveries calculation
  const mtdRecoveryStats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const mtdRecs = recoveries.filter((r) => {
      const d = (r.collectionDate || r.createdAt || '').slice(0, 7);
      return d === currentMonth && r.status !== 'REJECTED';
    });
    const achieved = mtdRecs.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const target = Math.round(mtdStats.mtdTarget * 0.8);
    const percent = target > 0 ? Math.round((achieved / target) * 100) : 0;
    return {
      achieved,
      target,
      percent,
      count: mtdRecs.length,
      list: mtdRecs.slice(0, 5)
    };
  }, [recoveries, mtdStats.mtdTarget]);

  // Daily Sales vs Recovery MTD trends dataset for Recharts visualization
  const mtdDailyTrendsData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Total days in the current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNameAbbrev = monthNames[month];

    // Build map for each day of the month
    const dailyMap: Record<number, { day: string; sales: number; recovery: number }> = {};
    for (let d = 1; d <= totalDays; d++) {
      dailyMap[d] = {
        day: `${monthNameAbbrev} ${d}`,
        sales: 0,
        recovery: 0,
      };
    }

    // Accumulate sales orders
    salesOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') return;
      const orderDateStr = o.orderDate || o.createdAt;
      if (!orderDateStr) return;
      const date = new Date(orderDateStr);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const dayNum = date.getDate();
        if (dailyMap[dayNum]) {
          dailyMap[dayNum].sales += Number(o.totalAmount || 0);
        }
      }
    });

    // Accumulate recoveries
    recoveries.forEach((r) => {
      if (r.status === 'REJECTED') return;
      const collectionDateStr = r.collectionDate || r.createdAt;
      if (!collectionDateStr) return;
      const date = new Date(collectionDateStr);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const dayNum = date.getDate();
        if (dailyMap[dayNum]) {
          dailyMap[dayNum].recovery += Number(r.amount || 0);
        }
      }
    });

    // Sort and return array
    return Object.keys(dailyMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(dayNum => dailyMap[dayNum]);
  }, [salesOrders, recoveries]);

  // MTD Visits calculation
  const mtdVisitsStats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const mtdVisits = visits.filter((v) => {
      const d = (v.visitDate || v.createdAt || '').slice(0, 7);
      return d === currentMonth;
    });
    const total = mtdVisits.length;
    const productive = mtdVisits.filter((v) => v.isProductive || v.purpose === 'ORDER_BOOKING' || v.purpose === 'COLLECTION').length;
    const rate = total > 0 ? Math.round((productive / total) * 150) : 0; // custom rate
    const clRate = Math.min(rate, 100);
    return {
      total,
      productive,
      rate: clRate,
      list: mtdVisits.slice(0, 5)
    };
  }, [visits]);

  const downloadMonthlyReportPdf = async () => {
    if (isGeneratingReportPdf) return;
    setIsGeneratingReportPdf(true);
    toast.info('Generating high-resolution MTD Monthly Report PDF...');

    try {
      const container = document.getElementById('printable-monthly-report');
      if (!container) {
        throw new Error('Monthly report container element not found');
      }

      // Temporarily render offscreen with proper styles for high-fidelity canvas
      container.style.position = 'absolute';
      container.style.left = '0px';
      container.style.top = '0px';
      container.style.width = '794px';
      container.style.opacity = '1';
      container.style.zIndex = '-9999';

      const canvas = await html2canvas(container, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Reset styles
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.opacity = '0';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));

      const filename = `Monthly_MTD_Report_${currentUser.fullName.replace(/\s+/g, '_')}_${mtdStats.monthName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
      toast.success('Report Downloaded', `Successfully generated and saved ${filename}`);
    } catch (err: any) {
      console.error('Failed to generate MTD Report PDF:', err);
      toast.error('PDF Export Error', 'Could not export Monthly MTD report as PDF.');
    } finally {
      setIsGeneratingReportPdf(false);
    }
  };

  return (
    <div className="SalesRecoveryApp selection:bg-teal-200">
      {/* ========================================================= */}
      {/* TOP HEADER (Clean, Unified Desktop/Mobile Navigation) */}
      {/* ========================================================= */}
      <header className="sra-header">
        <div className="sra-header-inner">
          <div className="flex items-center gap-2.5">
            {/* Field Force Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setShowFieldForceMenu(true)}
              className="p-2 rounded-xl text-slate-700 hover:text-teal-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Open Field Force Menu"
              aria-label="Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              NL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                  N-LINK <span className="text-teal-600 font-black">SalesPulse</span>
                </span>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                  {roleScope.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-xs">
                {currentUser.fullName} • National Light Pakistan
              </p>
            </div>

            {onToggleViewMode && (
              <button
                type="button"
                onClick={onToggleViewMode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer ml-1"
                title="Switch to Enterprise 360 View"
              >
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Enterprise 360</span>
              </button>
            )}
          </div>

          {/* Unified Desktop/Tablet Navigation Bar - Strict 3-Tab Architecture (Section 10) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('DASHBOARD');
                setSelectedCustomerId(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'DASHBOARD'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ATTENDANCE');
                setSelectedCustomerId(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DISTRIBUTORS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'DISTRIBUTORS'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Customers</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            {/* Top Header Last Synced with Subtle Green Glow Pulse */}
            <div
              id="header-last-synced-container"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all duration-700 ${
                isSyncGlow
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse'
                  : 'bg-slate-100/90 text-slate-600 border-slate-200'
              }`}
              title={`Last successful data sync: ${lastSyncedText}`}
            >
              <span className={`w-2 h-2 rounded-full ${isSyncGlow ? 'bg-emerald-600 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-slate-500 font-medium">Synced:</span>
              <span className="font-extrabold text-slate-800">{lastSyncedText}</span>
            </div>

            {/* Offline Sync Trigger Button & Network Status */}
            <button
              type="button"
              onClick={() => onOpenOfflineSync?.(failedOfflineCount > 0 ? 'FAILED' : 'ALL')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                failedOfflineCount > 0
                  ? 'bg-rose-50 text-rose-900 border-rose-400 ring-2 ring-rose-300 shadow-sm animate-pulse font-black'
                  : !isOnline || pendingOfflineCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={
                failedOfflineCount > 0
                  ? `Sync Error: ${failedOfflineCount} background sync attempt(s) failed to Supabase! Click to inspect errors and retry.`
                  : pendingOfflineCount > 0
                  ? `${pendingOfflineCount} offline actions pending sync - click to inspect queue`
                  : isOnline
                  ? 'Network Connected - click to inspect offline sync status'
                  : 'Working Offline - click to inspect offline queue'
              }
            >
              {failedOfflineCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-600" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-600" />
              )}
              <span>
                {failedOfflineCount > 0
                  ? `${failedOfflineCount} Sync Failed`
                  : isOnline
                  ? 'Online'
                  : 'Offline'}
              </span>
              {failedOfflineCount === 0 && pendingOfflineCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-600 text-white font-black text-[9px] animate-pulse">
                  {pendingOfflineCount} pending
                </span>
              )}
            </button>

            {/* Multi-Role Quick Switcher for Admins */}
            {(isMultiRoleEligibleEmail(currentUser.email) || isAdminUser(currentUser) || onRoleSwitch) && onRoleSwitch && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-teal-700 ml-1 shrink-0" />
                <select
                  value={currentUser.role}
                  onChange={(e) => onRoleSwitch(e.target.value as UserRole)}
                  className="bg-transparent text-[10px] font-black text-slate-800 focus:outline-none cursor-pointer pr-1"
                  title="Switch Role Perspective"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Google Sheets Database Sync Modal Button */}
            <button
              type="button"
              onClick={() => setShowGoogleSheetsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Open Google Sheets Database Sync"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheet DB</span>
            </button>

            {/* Application Settings Modal Button */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
              title="App Settings (Auto-Save, Sync & Storage)"
            >
              <Settings className="w-4 h-4 text-teal-700" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Persistent Visual Indicator & Detail Callout for Failed Background Sync Attempts */}
      {failedOfflineCount > 0 && (
        <div className="bg-rose-50 border-b-2 border-rose-300 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs z-30 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 border border-rose-300 mt-0.5 sm:mt-0">
              <AlertOctagon className="w-4 h-4 text-rose-700 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-rose-900 text-[13px]">
                  Supabase Background Sync Failed
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px]">
                  {failedOfflineCount} {failedOfflineCount === 1 ? 'transaction' : 'transactions'}
                </span>
                {latestFailedItem?.lastAttemptAt && (
                  <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-500" />
                    Attempted at {new Date(latestFailedItem.lastAttemptAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              {latestFailedItem?.errorMessage && (
                <p className="text-[11px] text-rose-800 font-mono mt-0.5 truncate max-w-xl">
                  <span className="font-bold text-rose-900">[{latestFailedItem.module} {latestFailedItem.action}]:</span> {latestFailedItem.errorMessage}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onOpenOfflineSync?.('FAILED')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Error Details</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                toast.info('Retrying background sync to Supabase...');
                await syncManager.syncQueue();
              }}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Now</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2-WAY GOOGLE SHEETS AUTO-SYNC & LOCAL STORAGE STATUS BANNER */}
      {/* ========================================================= */}
      <div className="px-4 pt-3 pb-1 max-w-7xl mx-auto w-full">
        <AutoSyncStatusBanner
          appData={appDataForGoogleSheet}
          onOpenSyncModal={() => setShowGoogleSheetsModal(true)}
          onSyncComplete={(msg) => {
            toast.success('Google Sheet Synced', msg);
            if (onRefresh) onRefresh();
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTENT ROUTER (Strictly 3 Screens) */}
      {/* ========================================================= */}
      <main className="sra-main">
        {/* ========================================================= */}
        {/* SCREEN 1: ATTENDANCE */}
        {/* ========================================================= */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4">
            {/* Header Greeting */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Field Attendance</span>
              <h1 className="text-xl font-black text-slate-900">
                {greeting}, {currentUser.fullName.split(' ')[0]}
              </h1>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Today: <span className="font-bold text-slate-800">{todayFormatted}</span>
              </p>
            </div>

            {/* Town Selection & Attendance Actions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {/* 1. ASSIGNED TOWNS DROPDOWN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assigned Towns &gt;&gt; Drop Down</span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Active Territory
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={selectedTown}
                    onChange={(e) => setSelectedTown(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
                  >
                    {assignedTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>

                {/* 500m Geofence Perimeter Status */}
                {selectedTown && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                          <span>500m Geofence Radius Active</span>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Beat Hub: {getTownCoordinates(selectedTown).town} ({getTownCoordinates(selectedTown).lat}° N, {getTownCoordinates(selectedTown).lng}° E)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                      Max 500m
                    </span>
                  </div>
                )}
              </div>

              {/* 2. CHECK IN / CHECK OUT DUAL ACTION BUTTONS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Duty Attendance
                  </span>
                  {attendanceRecord && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      attendanceRecord.status === 'Checked Out'
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${attendanceRecord.status === 'Checked Out' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                      {attendanceRecord.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Check In Button */}
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={gpsCapturing || (!!attendanceRecord && attendanceRecord.status === 'Checked In')}
                    className={`py-3.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      attendanceRecord && attendanceRecord.status === 'Checked In'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default opacity-90'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
                    }`}
                  >
                    {gpsCapturing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Verifying GPS...</span>
                      </>
                    ) : attendanceRecord && attendanceRecord.status === 'Checked In' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Checked In ({attendanceRecord.checkInTime})</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Check In</span>
                      </>
                    )}
                  </button>

                  {/* Check Out Button */}
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={gpsCapturing || !attendanceRecord || attendanceRecord.status === 'Checked Out'}
                    className={`py-3.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      !attendanceRecord
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : attendanceRecord.status === 'Checked Out'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300 cursor-default'
                        : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]'
                    }`}
                  >
                    {attendanceRecord?.status === 'Checked Out' ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-slate-600" />
                        <span>Checked Out</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        <span>Check Out</span>
                      </>
                    )}
                  </button>
                </div>

                {attendanceMessage && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-teal-800">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{attendanceMessage}</span>
                  </div>
                )}
              </div>

              {/* Active Attendance Summary Card */}
              {attendanceRecord && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Check In Time</span>
                      <span className="font-bold text-slate-900 font-mono">{attendanceRecord.checkInTime || attendanceRecord.time || '09:00 AM'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Check Out Time</span>
                      <span className="font-bold text-slate-900 font-mono">{attendanceRecord.checkOutTime || '--:--'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Town</span>
                      <span className="font-bold text-slate-900">{attendanceRecord.town}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Duty Duration</span>
                      <span className="font-bold text-teal-700">{attendanceRecord.duration || (attendanceRecord.status === 'Checked In' ? 'Active On Duty' : 'Completed')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Field Force Attendance History & Verified Records */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Attendance Records &amp; History
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">Persisted Check-In, Check-Out, Duration &amp; GPS Location Records</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void refreshAttendanceHistory()}
                  disabled={loadingAttendanceLogs}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-teal-600 ${loadingAttendanceLogs ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-bold text-teal-800">Refresh Records</span>
                </button>
              </div>

              {loadingAttendanceLogs && attendanceLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-xl border border-slate-200">
                  <RotateCw className="w-5 h-5 animate-spin text-teal-600" />
                  <span>Loading attendance records from database...</span>
                </div>
              ) : attendanceLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <UserCheck className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">No attendance records found</p>
                  <p className="text-[11px] text-slate-500">Check in above to record your first duty log with GPS location.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72 scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Town</th>
                        <th className="px-3 py-2.5">Check In</th>
                        <th className="px-3 py-2.5">Check Out</th>
                        <th className="px-3 py-2.5">Duration</th>
                        <th className="px-3 py-2.5">GPS Location</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceLogs.map((log) => (
                        <tr key={log.id || `${log.attendance_date}-${log.town}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                            {log.attendance_date}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                            {log.town}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-emerald-700 font-bold whitespace-nowrap">
                            {formatTimeFromIso(log.check_in_at)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-700 font-bold whitespace-nowrap">
                            {formatTimeFromIso(log.check_out_at)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                            {log.duration_text || 'Duty Completed'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {log.latitude ? `${log.latitude.toFixed(4)}°, ${log.longitude.toFixed(4)}°` : 'GPS'}
                            {log.gps_accuracy_m ? ` (±${Math.round(log.gps_accuracy_m)}m)` : ''}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.status === 'CHECKED_OUT'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {log.status === 'CHECKED_OUT' ? 'Shift Completed' : 'Checked In'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. LOCATIONS CARD & PROXIMITY GPS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Locations
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">Field Officer Real-Time Geo-Coordinates</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncGpsLocation}
                  disabled={gpsSyncing || gpsCapturing}
                  title="Acquire device satellite coordinates"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-teal-600 ${gpsSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-bold text-teal-800">Sync GPS</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Location / Route</span>
                    <span className="font-bold text-slate-800">
                      {attendanceRecord ? attendanceRecord.locationName || `${selectedTown} Territory` : `${selectedTown} Main Commercial Territory`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">GPS Coordinates (±Accuracy)</span>
                    <span className="font-mono text-slate-800 font-bold">
                      {attendanceRecord ? `${attendanceRecord.lat}° N, ${attendanceRecord.lng}° E (±${attendanceRecord.accuracy}m)` : 'GPS not captured'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Nearby Assigned Dealers Proximity Map — only rendered after real GPS capture */}
            {attendanceRecord && (
              <NearbyDealersMap
                userLat={attendanceRecord.lat}
                userLng={attendanceRecord.lng}
                accuracy={attendanceRecord.accuracy}
                townName={attendanceRecord.town}
                customers={authorizedCustomers}
                onSelectCustomer={(c) => {
                  setSelectedCustomerId(c.id);
                  setActiveTab('DISTRIBUTORS');
                }}
                onSyncGps={handleSyncGpsLocation}
                isSyncingGps={gpsSyncing || gpsCapturing}
                lastSyncTime={lastGpsSyncTime || attendanceRecord.time}
              />
            )}

            {/* 4. MTD VISIT ACTIVITY TABLE (Day 1 to 31: Date | Town | # of Visit Dealer | Sales | Recovry) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <span>MTD visit Activity</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">Daily Performance &amp; Dealer Touchpoints for {selectedTown}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                  Day 1 to 31
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96 scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-16">Date</th>
                      <th className="px-3 py-2.5">Town</th>
                      <th className="px-3 py-2.5 text-center"># of Visit Dealer</th>
                      <th className="px-3 py-2.5 text-right">Sales</th>
                      <th className="px-3 py-2.5 text-right">Recovry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mtdDailyActivities.map((row) => (
                      <tr
                        key={row.day}
                        className={`transition-colors ${
                          row.isToday
                            ? 'bg-teal-50/80 font-semibold'
                            : row.isSunday
                            ? 'bg-slate-50/50 text-slate-400'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center font-mono font-bold">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            row.isToday ? 'bg-teal-700 text-white font-black' : 'text-slate-700'
                          }`}>
                            {row.day}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">
                          {row.town}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                          {row.isSunday ? (
                            <span className="text-[10px] font-medium text-slate-400">Sunday</span>
                          ) : (
                            row.visitCount
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {row.sales > 0 ? `${row.sales.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                          {row.recovery > 0 ? `${row.recovery.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-xs uppercase tracking-wider text-slate-700 font-black">
                        Total MTD ({selectedTown})
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs font-black text-slate-900">
                        {mtdDailyActivities.reduce((s, r) => s + r.visitCount, 0)} Visits
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-black text-slate-900">
                        {mtdDailyActivities.reduce((s, r) => s + r.sales, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700 text-xs font-black">
                        {mtdDailyActivities.reduce((s, r) => s + r.recovery, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3-Month Same Towns Visit History */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>3-Month Town Visit History</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Past dealer visits for active town: <strong className="text-indigo-600">{selectedTown}</strong>
                  </p>
                </div>
                <span className="text-[11px] font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  {pastTownVisits.length} Visits
                </span>
              </div>

              {pastTownVisits.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1.5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <MapPin className="w-6 h-6 mx-auto text-slate-300 animate-pulse" />
                  <p className="text-xs font-medium">No past visits logged in the last 3 months for {selectedTown}.</p>
                  <p className="text-[10px] text-slate-400">Complete visits to build customer historic profiles.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {pastTownVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block">{visit.dateFormatted}</span>
                          <span className="font-extrabold text-slate-800 text-sm leading-tight block">{visit.customerName}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          {visit.orderPlaced && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              Order Placed
                            </span>
                          )}
                          {visit.recoveryCollected && (
                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              Recovery Made
                            </span>
                          )}
                          {!visit.orderPlaced && !visit.recoveryCollected && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                              Follow-Up Only
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-600 border-t border-slate-200/60 pt-2 text-[11px] leading-relaxed">
                        <div>
                          <strong className="text-slate-700">Purpose:</strong> {visit.purpose}
                        </div>
                        {visit.notes && (
                          <div className="italic text-slate-500 bg-white/70 p-1.5 rounded border border-slate-100 mt-1">
                            "{visit.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: DISTRIBUTOR / DEALER */}
        {/* ========================================================= */}
        {activeTab === 'DISTRIBUTORS' && (
          <div className="space-y-4">
            {!activeCustomer ? (
              /* --- Customer Search & Selection View --- */
              <div className="space-y-3">
                {/* Registration Submission Confirmation Banner */}
                {registrationSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-teal-800 text-white text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-200 shrink-0" />
                      <span>{registrationSuccessMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegistrationSuccessMsg(null)}
                      className="p-1 hover:bg-teal-900 rounded-lg text-teal-100"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div>
                      <h1 className="text-base font-black text-slate-900">Distributors &amp; Dealers</h1>
                      <p className="text-xs text-slate-500">Search and select a dealer to place orders, record recovery, or check ledger.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const firstInTown = authorizedCustomers.find(
                            (c) => (c.city || '').toLowerCase() === selectedTown.toLowerCase()
                          ) || authorizedCustomers[0];
                          if (firstInTown) {
                            setSelectedCustomerId(firstInTown.id);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
                        title="Open SalesPulse N-LINK Order & Recovery Entry Form"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Open Entry Form</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
                        title="Register a new Dealer/Distributor to the Head Office Approval Queue"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Dealer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleManualFinancialSync}
                        disabled={isFinancialSyncing}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                        title="Force Real-Time Sync of Ledgers and Invoices"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isFinancialSyncing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>{isFinancialSyncing ? 'Syncing...' : 'Real-time Sync'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Type Filter (Strictly: ALL, DISTRIBUTOR, DEALER) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {(['ALL', 'DISTRIBUTOR', 'DEALER'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCustomerTypeFilter(t)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          customerTypeFilter === t
                            ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t === 'ALL' ? 'ALL' : t === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'DEALER'}
                      </button>
                    ))}
                  </div>

                  <div className="relative pt-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by Name, Code, Mobile, Town..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Filter Subtabs: Active vs Pending Approval Queue */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDealerCategoryFilter('ACTIVE')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        dealerCategoryFilter === 'ACTIVE'
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Dealers ({filteredCustomers.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDealerCategoryFilter('PENDING')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        dealerCategoryFilter === 'PENDING'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pending Approvals ({filteredPendingCustomers.length})</span>
                    </button>
                  </div>
                </div>

                {/* Active Customers List */}
                {dealerCategoryFilter === 'ACTIVE' && (
                  <div className="space-y-2">
                    {filteredCustomers.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                        No active distributors matching "{customerSearchQuery}".
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setCustomerInnerTab('ORDER');
                          }}
                          className="w-full bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 group-hover:text-teal-700 truncate">
                                {cust.companyName}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded shrink-0">
                                {cust.customerCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {cust.city || 'Town'} • {cust.contactPerson || 'Proprietor'} • {cust.phone || 'No phone'}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Opening Balance</span>
                              <span className="font-mono text-xs font-bold text-slate-800">
                                Rs. {(cust.openingBalance || 0).toLocaleString()}
                              </span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Pending Approval Queue List */}
                {dealerCategoryFilter === 'PENDING' && (
                  <div className="space-y-2">
                    {filteredPendingCustomers.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-dashed border-amber-200 text-center text-slate-500 text-xs space-y-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <p className="font-bold text-slate-700">All dealer registrations are approved and active!</p>
                        <p className="text-slate-400">Click "Register Dealer" above to onboard a new commercial partner.</p>
                      </div>
                    ) : (
                      filteredPendingCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          className="w-full bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-900">
                                  {cust.companyName || cust.name}
                                </span>
                                <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full">
                                  Pending Approval
                                </span>
                                <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                                  {cust.customerCode}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium pt-1">
                                {cust.city || 'Town'} • {cust.contactPerson || 'Proprietor'} • {cust.phone || 'No phone'}
                              </p>
                            </div>

                            {isApproverOrAdmin ? (
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      cust.approvalStatus = 'APPROVED';
                                      cust.isActive = true;
                                      cust.status = 'NORMAL';
                                      if (onApproveCustomer) {
                                        await onApproveCustomer(cust.id, currentUser.fullName);
                                      } else {
                                        await approveCustomerRegistration(cust.id, currentUser.fullName);
                                      }
                                      setRegistrationSuccessMsg(
                                        `Dealer "${cust.companyName || cust.name}" is now Approved and Active!`
                                      );
                                      setDealerCategoryFilter('ACTIVE');
                                      toast.success(
                                        'Dealer Approved & Activated',
                                        `Partner "${cust.companyName || cust.name}" is approved for commercial transactions.`
                                      );
                                      if (onRefresh) await onRefresh();
                                      setTimeout(() => setRegistrationSuccessMsg(null), 6000);
                                    } catch (err: any) {
                                      toast.error('Approval Failed', err?.message || 'Unable to approve dealer.');
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                                  title="Approve registration and activate account immediately"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve &amp; Activate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = window.prompt(
                                      `Enter rejection reason for "${cust.companyName || cust.name}":`,
                                      'Incomplete KYC / credit profile'
                                    );
                                    if (reason) {
                                      try {
                                        cust.approvalStatus = 'REJECTED';
                                        cust.status = 'REJECTED';
                                        if (onRejectCustomer) {
                                          await onRejectCustomer(cust.id, reason);
                                        } else {
                                          await rejectCustomerRegistration(cust.id, reason);
                                        }
                                        toast.info(
                                          'Dealer Registration Rejected',
                                          `Application for "${cust.companyName || cust.name}" was declined.`
                                        );
                                        if (onRefresh) await onRefresh();
                                      } catch (err: any) {
                                        toast.error('Rejection Failed', err?.message || 'Unable to reject dealer.');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                                  title="Decline registration request"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                <span>Awaiting HO Approval</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-amber-200/70">
                            <div>
                              <span className="text-slate-400 block font-medium">Proposed Credit</span>
                              <span className="font-mono font-bold text-slate-800">
                                PKR {((cust.creditLimit || (cust as any).proposedCreditLimit || 1000000) / 100000).toFixed(1)}L ({cust.creditDays || (cust as any).proposedCreditDays || 30} Days)
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Hierarchy Tier</span>
                              <span className="font-bold text-teal-800">
                                {cust.customerType || cust.type || 'DEALER'}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-400 block font-medium">Assigned Officer</span>
                              <span className="font-bold text-slate-700 truncate block">
                                {(cust as any).assignedTsm || (cust as any).assignedOfficerName || currentUser.fullName}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* --- Single Customer Profile & Actions --- */
              <div className="space-y-4">
                {/* Back Button */}
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 inline-flex"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Distributors</span>
                </button>

                {/* 1. CUSTOMER HEADER */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg font-black text-slate-900 leading-tight">
                          {activeCustomer.companyName}
                        </h1>
                        <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                          {activeCustomer.customerCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Town: <span className="font-bold text-slate-700">{activeCustomer.city || 'General'}</span> | Route:{' '}
                        <span className="font-bold text-slate-700">{activeCustomer.route || 'Standard Market'}</span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Contact: <span className="font-bold text-slate-700">{activeCustomer.contactPerson || 'Proprietor'}</span>
                      </p>
                    </div>

                    {activeCustomer.phone && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`tel:${activeCustomer.phone}`}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={`https://wa.me/${activeCustomer.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="WhatsApp Chat"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 2. ONE CLEAN FINANCIAL LINE WITH 60s AUTO-POLLING */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Financial Position
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Sync (60s)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <span>Updated: {lastFinancialSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <button
                          type="button"
                          onClick={handleManualFinancialSync}
                          disabled={isFinancialSyncing}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
                          title="Refresh Financials Now"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isFinancialSyncing ? 'animate-spin text-teal-600' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Opening Balance</span>
                        <span className="font-mono font-black text-slate-900 text-sm mt-1 block tabular-nums">
                          Rs. {customerFinancials.openingBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">Till Date Invoices</span>
                        <span className="font-mono font-black text-blue-700 text-sm mt-1 block tabular-nums">
                          Rs. {customerFinancials.tillDateInvoices.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">Till Date Recovery</span>
                        <span className="font-mono font-black text-emerald-700 text-sm mt-1 block tabular-nums">
                          Rs. {customerFinancials.tillDateRecovery.toLocaleString()}
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl border shadow-2xs ${
                        customerFinancials.netBalance > 0 
                          ? 'bg-rose-50/80 border-rose-200' 
                          : 'bg-emerald-50/80 border-emerald-200'
                      }`}>
                        <span className={`text-[10px] font-black block uppercase tracking-wider ${
                          customerFinancials.netBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          Net Balance
                        </span>
                        <span
                          className={`font-mono font-black text-sm mt-1 block tabular-nums ${
                            customerFinancials.netBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          Rs. {customerFinancials.netBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* CREDIT HEALTH INDICATOR & AVERAGE PAYMENT DELAY */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <div className={`p-4 rounded-2xl border transition-all ${
                        customerCreditHealth.status === 'EXCELLENT'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : customerCreditHealth.status === 'GOOD'
                          ? 'bg-teal-50/70 border-teal-200'
                          : customerCreditHealth.status === 'WATCHLIST'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-rose-50/70 border-rose-200'
                      }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={`w-4 h-4 ${
                              customerCreditHealth.status === 'EXCELLENT' ? 'text-emerald-600' :
                              customerCreditHealth.status === 'GOOD' ? 'text-teal-600' :
                              customerCreditHealth.status === 'WATCHLIST' ? 'text-amber-600' : 'text-rose-600'
                            }`} />
                            <span className="text-xs font-black text-slate-800">
                              Credit Health &amp; Payment Delay
                            </span>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            customerCreditHealth.status === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            customerCreditHealth.status === 'GOOD' ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                            customerCreditHealth.status === 'WATCHLIST' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          }`}>
                            {customerCreditHealth.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-xs mb-3">
                          {/* 1. Average Payment Delay in Days */}
                          <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                              Avg Payment Delay
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className={`text-base font-black font-mono tabular-nums ${
                                customerCreditHealth.avgDelayDays <= 10 ? 'text-emerald-700' :
                                customerCreditHealth.avgDelayDays <= 25 ? 'text-teal-700' :
                                customerCreditHealth.avgDelayDays <= 45 ? 'text-amber-700' : 'text-rose-700'
                              }`}>
                                {customerCreditHealth.avgDelayDays}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600">Days</span>
                            </div>
                          </div>

                          {/* 2. Credit Terms */}
                          <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                              Credit Days Term
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-black font-mono text-slate-800 tabular-nums">
                                {customerCreditHealth.creditDays}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600">Days Term</span>
                            </div>
                          </div>

                          {/* 3. Credit Limit */}
                          <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                              Credit Limit
                            </span>
                            <span className="text-xs font-black font-mono text-slate-800 mt-1 block tabular-nums">
                              Rs. {customerCreditHealth.creditLimit.toLocaleString()}
                            </span>
                          </div>

                          {/* 4. Limit Utilization */}
                          <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                              Limit Utilization
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-xs font-black font-mono tabular-nums ${
                                customerCreditHealth.creditUtilizationPct > 90 ? 'text-rose-700 font-black' :
                                customerCreditHealth.creditUtilizationPct > 70 ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {customerCreditHealth.creditUtilizationPct}%
                              </span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    customerCreditHealth.creditUtilizationPct > 90 ? 'bg-rose-500' :
                                    customerCreditHealth.creditUtilizationPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, customerCreditHealth.creditUtilizationPct)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {customerCreditHealth.avgDelayDays > 30 && (
                          <div className="flex items-center gap-2 p-2 bg-rose-100/80 rounded-xl text-rose-800 text-[11px] font-bold border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>
                              Attention: Customer payment delay exceeds 30 days ({customerCreditHealth.avgDelayDays} days average). Strict recovery or cash-before-delivery recommended.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. CUSTOMER 360: QUICK REORDER (Populates Order Entry with previous 5 ordered items) */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-slate-50 p-3.5 rounded-2xl border border-teal-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">
                                  Quick Reorder
                                </span>
                                <span className="text-[10px] font-black text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-full border border-teal-200">
                                  Previous 5 Ordered Items
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                1-tap auto-populate Order Entry grid with past purchase quantities
                              </p>
                            </div>
                          </div>
                          {customerPreviousOrderedItems.length > 0 && (
                            <button
                              id="customer-quick-reorder-all-btn"
                              type="button"
                              onClick={() => handleQuickReorder()}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0"
                              title="Populate Order Entry with all previous ordered items"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Reorder All ({customerPreviousOrderedItems.length})</span>
                            </button>
                          )}
                        </div>

                        {customerPreviousOrderedItems.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                            {customerPreviousOrderedItems.map((item) => {
                              const currentSelectedQty = orderQuantities[item.skuId] || 0;
                              return (
                                <div
                                  key={item.skuId}
                                  className="p-2.5 rounded-xl bg-white border border-teal-100/90 shadow-2xs flex items-center justify-between gap-2.5 hover:border-teal-300 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 truncate text-xs" title={item.skuName}>
                                      {item.skuName}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                      <span className="font-mono text-slate-400">({item.skuCode})</span>
                                      <span>Prev Qty: <strong className="text-teal-700 font-mono font-bold">{item.orderedQuantity}</strong></span>
                                      <span className={item.availableStock > 0 ? 'text-slate-500' : 'text-rose-600 font-bold'}>
                                        Stock: {item.availableStock}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickReorder(item.skuId)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                      currentSelectedQty > 0
                                        ? 'bg-teal-600 text-white shadow-2xs'
                                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                                    }`}
                                    title={`Load ${item.orderedQuantity} pcs into Order Entry`}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>{currentSelectedQty > 0 ? `Set (${item.orderedQuantity})` : 'Add'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 bg-white/80 rounded-xl border border-dashed border-teal-200 text-center text-xs text-slate-500 font-medium">
                            No past order history found for this dealer yet. Once an order is booked, their previous 5 items will be ready for 1-tap quick reorder here.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* POST-ORDER SUBMISSION PDF & DISPATCH QUICK-ACTION BANNER */}
                {lastSubmittedOrder && (
                  <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-lg border border-teal-600/40 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                              Order #{lastSubmittedOrder.order.orderNumber}
                            </span>
                            <span className="text-[11px] font-bold text-teal-200">
                              Booked for {lastSubmittedOrder.customer.companyName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300 bg-black/30 px-2 py-0.5 rounded-full">
                              Rs. {Number(lastSubmittedOrder.order.totalAmount || 0).toLocaleString()} PKR
                            </span>
                          </div>
                          <p className="text-xs text-teal-100/90 font-medium mt-1">
                            Sales order is recorded and synchronized. Generate the official branded customer invoice receipt for instant printing or dispatch:
                          </p>
                        </div>
                      </div>

                      {/* PDF Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleDownloadOrderPdf(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                          disabled={isGeneratingPdf}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                          title="Generate and download branded National Lights PDF invoice"
                        >
                          <Download className={`w-4 h-4 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                          <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Order PDF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLivePreviewOrderPdf(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                          disabled={isGeneratingPdf}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          title="View live interactive vector PDF preview"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-300" />
                          <span>Preview PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsAppShareOrder(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                          className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Send pre-formatted invoice text to customer via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLastSubmittedOrder(null)}
                          className="p-2 rounded-xl hover:bg-white/10 text-teal-300 hover:text-white transition-colors cursor-pointer"
                          title="Dismiss this notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SALESPULSE N-LINK QUICK-JUMP STICKY PILLS */}
                <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => document.getElementById("dealer-section-params")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black border border-teal-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <span>1-2. Region &amp; Date</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById("dealer-section-target")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black border border-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Target className="w-3.5 h-3.5 text-teal-600" />
                    <span>3. Target vs Achievement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById("dealer-section-brands-skus")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>4. National Light Brands &amp; SKUs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById("dealer-section-recovery-box")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>5. Recovery Entry Box</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById("dealer-section-balances")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-black border border-indigo-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Balances &amp; Ledger</span>
                  </button>
                </div>

                {/* ========================================================= */}
                {/* 1 & 2: REGION, TSM, DATE, TOWN, CUSTOMER SELECTION        */}
                {/* ========================================================= */}
                <div id="dealer-section-params" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-800 flex items-center justify-center text-white shadow-xs font-black text-xs">
                        NL
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          N-LINK SalesPulse Entry Form
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">National Light Pakistan • Order Booking &amp; Recovery Sync</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Google Sheet Sync
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        ID: 1NUW0a...ZUSwoo
                      </span>
                    </div>
                  </div>

                  {/* 1. Region & TSM */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                    <div>
                      <label className="block mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                        1- Region:
                      </label>
                      <select
                        value={entryRegion}
                        onChange={(e) => setEntryRegion(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="All Regions">All Regions</option>
                        <option value="Central Punjab (Lahore)">Central Punjab (Lahore Division)</option>
                        <option value="North Punjab (Rawalpindi/Islamabad)">North Punjab (Rawalpindi / Islamabad)</option>
                        <option value="South Punjab (Multan/Faisalabad)">South Punjab (Multan / Faisalabad)</option>
                        <option value="Sindh (Karachi/Hyderabad)">Sindh (Karachi / Hyderabad)</option>
                        <option value="KPK (Peshawar)">KPK (Peshawar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                        TSM:
                      </label>
                      <select
                        value={entryTsm}
                        onChange={(e) => setEntryTsm(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Shahid Khan">Shahid Khan (TSM - KPK / Hazara)</option>
                        <option value="Shahzad Ullah">Shahzad Ullah (Managing Director)</option>
                        <option value={currentUser.fullName}>{currentUser.fullName} ({currentUser.role})</option>
                      </select>
                    </div>
                  </div>

                  {/* 2. Date, TSM, Town & Customer */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700 pt-1">
                    <div>
                      <label className="block mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                        2- Date
                      </label>
                      <input
                        type="text"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        placeholder="09/17/2026"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                        Town
                      </label>
                      <select
                        value={selectedTown}
                        onChange={(e) => {
                          const newTown = e.target.value;
                          setSelectedTown(newTown);
                          const firstInTown = authorizedCustomers.find(
                            (c) => (c.city || "").toLowerCase() === newTown.toLowerCase()
                          );
                          if (firstInTown) {
                            setSelectedCustomerId(firstInTown.id);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {assignedTowns.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                        Customer / Dealer
                      </label>
                      <select
                        value={selectedCustomerId || ""}
                        onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                        className="w-full p-2.5 bg-teal-50/60 border border-teal-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {townFilteredCustomers.map((cust) => (
                          <option key={cust.id} value={cust.id}>
                            {cust.companyName} ({cust.customerCode}) - Bal: Rs. {(cust.currentBalance || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 3: TARGET VS ACHIEVEMENT                                  */}
                {/* ========================================================= */}
                <div id="dealer-section-target" className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          3- Target vs Achievement
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">MTD Sales Performance • {mtdStats.monthName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="bg-teal-900/70 text-teal-300 border border-teal-500/40 px-2.5 py-0.5 rounded-full">
                        {mtdStats.mtdPercent}% Achieved
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Target</span>
                      <span className="font-mono font-black text-sm text-white block mt-0.5">
                        Rs. {mtdStats.mtdTarget.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-teal-300 uppercase font-bold block">Achieved</span>
                      <span className="font-mono font-black text-sm text-emerald-400 block mt-0.5">
                        Rs. {mtdStats.mtdSalesAchieved.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Variance</span>
                      <span className={`font-mono font-black text-sm block mt-0.5 ${mtdStats.mtdVariance >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                        {mtdStats.mtdVariance >= 0 ? "+" : ""}Rs. {mtdStats.mtdVariance.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Run Rate Needed</span>
                      <span className="font-mono font-black text-sm text-teal-200 block mt-0.5">
                        Rs. {mtdStats.dailyRunRateNeeded.toLocaleString()}/day
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, mtdStats.mtdPercent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0%</span>
                      <span>Target: Rs. {mtdStats.mtdTarget.toLocaleString()}</span>
                      <span>{mtdStats.mtdPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* 4: BRAND CLICKABLE > EXPAND & COLLAPSE THE SKU ON CLICKING ON THE BRANDS  */}
                {/* ========================================================================= */}
                <div id="dealer-section-brands-skus" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          4- Brand Clickable &gt; Expand &amp; Collapse the SKU on clicking on the Brands
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">
                          National Light Product Catalog • Click brand header to expand/collapse SKUs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleExpandAllBrands}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>{Object.values(expandedBrands).every(Boolean) ? "Collapse All" : "Expand All"}</span>
                      </button>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        {orderSummary.totalSKUs} SKUs Selected ({orderSummary.totalQuantity} pcs)
                      </span>
                    </div>
                  </div>

                  {/* Live Search Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={skuSearchQuery}
                      onChange={(e) => setSkuSearchQuery(e.target.value)}
                      placeholder="Search National Light SKUs (e.g. 12W, 40W, Panel, Tube, Flood, Solar)..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Brand Accordion List */}
                  <div className="space-y-3 pt-1">
                    {(Object.entries(brandsGrouped) as [string, SKU[]][]).map(([brandName, brandSkus]) => {
                      const isExpanded = expandedBrands[brandName] ?? true;
                      const brandActiveQty = brandSkus.reduce((sum, s) => sum + (orderQuantities[s.id] || 0), 0);
                      const brandActiveVal = brandSkus.reduce(
                        (sum, s) => sum + (orderQuantities[s.id] || 0) * Number(s.tradePrice || s.retailPrice || 0),
                        0
                      );

                      return (
                        <div key={brandName} className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          {/* Brand Clickable Header */}
                          <button
                            type="button"
                            onClick={() => toggleBrand(brandName)}
                            className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isExpanded ? "bg-teal-50/70 border-b border-teal-100" : "bg-slate-50 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className={`w-2.5 h-2.5 rounded-full ${brandActiveQty > 0 ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-teal-600"} shrink-0`} />
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {brandName}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                {brandSkus.length} SKUs
                              </span>
                              {brandActiveQty > 0 && (
                                <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                  {brandActiveQty} pcs (Rs. {brandActiveVal.toLocaleString()})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                              <span className="text-[10px] font-bold uppercase hidden sm:inline">
                                {isExpanded ? "Click to Collapse" : "Click to Expand"}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-teal-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Expanded SKUs Grid */}
                          {isExpanded && (
                            <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {brandSkus.map((sku) => {
                                const stock = getSkuStock(sku.id);
                                const currentQty = orderQuantities[sku.id] || 0;
                                const unitPrice = Number(sku.tradePrice || sku.retailPrice || 0);
                                const pack = Number(sku.packsPerCarton || 50);

                                return (
                                  <div
                                    key={sku.id}
                                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                                      currentQty > 0
                                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs"
                                        : "bg-slate-50/50 hover:bg-white border-slate-200"
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-1.5">
                                        <h4 className="font-black text-slate-900 text-xs leading-snug line-clamp-2" title={sku.name}>
                                          {sku.name}
                                        </h4>
                                        <span className="text-[9px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                          {sku.skuCode}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between gap-1.5 mt-1.5 flex-wrap">
                                        <span className="font-mono font-black text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                                          <span className="text-[9px] text-teal-700 font-bold">TP: Rs. </span>
                                          {unitPrice.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          Pack: <strong className="text-slate-700 font-mono">{pack}</strong>/ctn
                                        </span>
                                        <span className={`text-[10px] font-bold ${stock > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                                          Stock: {stock}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Stepper / Quick Carton + Loose Pieces */}
                                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1.5 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(sku.id, currentQty + pack)}
                                          className="px-1.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                                          title="Add 1 Full Carton"
                                        >
                                          +1 Ctn
                                        </button>
                                        <button
                                          type="button"
                                          disabled={currentQty <= 0}
                                          onClick={() => handleQtyChange(sku.id, Math.max(0, currentQty - 1))}
                                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer disabled:opacity-30"
                                        >
                                          <Minus className="w-2.5 h-2.5" />
                                        </button>
                                        <input
                                          type="number"
                                          min={0}
                                          value={currentQty === 0 ? "" : currentQty}
                                          onChange={(e) => handleQtyChange(sku.id, parseInt(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-12 h-6 text-center bg-white border border-slate-300 rounded font-mono font-black text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleQtyChange(sku.id, currentQty + 1)}
                                          className="w-6 h-6 rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center font-bold cursor-pointer shadow-2xs"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                        {currentQty > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleQtyChange(sku.id, 0)}
                                            className="w-5 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                                            title="Reset Qty"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>

                                      <div className="text-right ml-auto">
                                        <span className="text-[9px] text-slate-400 block font-bold">Subtotal</span>
                                        <span className="font-mono font-black text-xs text-emerald-700">
                                          Rs. {(currentQty * unitPrice).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================================================= */}
                {/* 5: ADD RECOVERY ENTRY BOX WITH EXACT FORMULA:                                              */}
                {/* Opeeing Balance + Invoices - till Date Recovery - Todays recovery (Box) = Net Balance     */}
                {/* ========================================================================================= */}
                <div id="dealer-section-recovery-box" className="bg-white p-5 rounded-2xl border-2 border-emerald-400 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          5- add Recovry entry Box
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Opening Balance + Invoices - till Date Recovery - Todays recovery (Box) = Net Balance (live Sync)
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Sync Dynamic
                    </span>
                  </div>

                  {/* THE LIVE LEDGER EQUATION ARITHMETIC CARDS */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white shadow-inner space-y-3">
                    <div className="text-[11px] font-mono text-emerald-300 uppercase tracking-widest font-black text-center border-b border-slate-800 pb-2">
                      Live Balance Equation: Opening Balance + Invoices - Till Date Recovery - Todays Recovery = Net Balance
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center text-center">
                      {/* 1. Opening Balance */}
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Opening Balance</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-white block mt-0.5">
                          Rs. {customerFinancials.openingBalance.toLocaleString()}
                        </span>
                      </div>

                      {/* 2. + Invoices */}
                      <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-500/30">
                        <span className="text-[9px] text-teal-300 uppercase font-bold block">+ Invoices</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-teal-200 block mt-0.5">
                          Rs. {customerFinancials.tillDateInvoices.toLocaleString()}
                        </span>
                      </div>

                      {/* 3. - Till Date Recovery */}
                      <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30">
                        <span className="text-[9px] text-indigo-300 uppercase font-bold block">- Till Date Recovery</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-indigo-200 block mt-0.5">
                          Rs. {customerFinancials.tillDateRecovery.toLocaleString()}
                        </span>
                      </div>

                      {/* 4. - Todays Recovery (Box) */}
                      <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-400/50 ring-1 ring-amber-400">
                        <span className="text-[9px] text-amber-300 uppercase font-extrabold block">- Todays Recovery (Box)</span>
                        <span className="font-mono font-black text-xs sm:text-sm text-amber-300 block mt-0.5">
                          Rs. {todaysRecoveryNum.toLocaleString()}
                        </span>
                      </div>

                      {/* 5. = Net Balance (Live Sync) */}
                      <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-400 ring-2 ring-emerald-500 col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-emerald-300 uppercase font-black block">= Net Balance (Live)</span>
                        <span className="font-mono font-black text-sm sm:text-base text-emerald-300 block mt-0.5">
                          Rs. {liveNetBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RECOVERY ENTRY CONTROLS */}
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
                      <div>
                        <label className="block mb-1 text-slate-800 font-extrabold">
                          Todays Recovery (Box) Amount (Rs.) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-bold text-emerald-700 text-xs">Rs.</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="e.g. 25000"
                            value={todaysRecoveryAmount}
                            onChange={(e) => setTodaysRecoveryAmount(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 bg-white border border-emerald-400 rounded-xl font-mono text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-800 font-extrabold">
                          Payment Mode *
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["CASH", "CHEQUE", "ONLINE_TRANSFER"] as PaymentMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setTodaysRecoveryMode(mode)}
                              className={`py-2 px-1 text-center rounded-xl text-[10px] font-black cursor-pointer transition-all border ${
                                todaysRecoveryMode === mode
                                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {mode === "ONLINE_TRANSFER" ? "Online" : mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-800 font-extrabold">
                          {todaysRecoveryMode === "CASH" ? "Receipt # / Slip (Optional)" : "Cheque # / Trans Ref ID *"}
                        </label>
                        <input
                          type="text"
                          placeholder={todaysRecoveryMode === "CASH" ? "Cash voucher #" : "e.g. CHQ-990234"}
                          value={todaysRecoveryInstrument}
                          onChange={(e) => setTodaysRecoveryInstrument(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {todaysRecoveryMode !== "CASH" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700 pt-1">
                        <div>
                          <label className="block mb-1">Bank Name</label>
                          <input
                            type="text"
                            placeholder="e.g. HBL, Meezan Bank, MCB"
                            value={todaysRecoveryBank}
                            onChange={(e) => setTodaysRecoveryBank(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block mb-1">Collection Remarks</label>
                          <input
                            type="text"
                            placeholder="Optional recovery note"
                            value={todaysRecoveryRemarks}
                            onChange={(e) => setTodaysRecoveryRemarks(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* 6: COMBINED SAVE & SUBMIT TO N-LINK & GOOGLE SHEETS                       */}
                {/* ========================================================================= */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  {combinedSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{combinedSuccessMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Today's Order Value</span>
                      <span className="font-mono font-black text-base text-slate-900 block mt-0.5">
                        Rs. {orderSummary.orderValue.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">({orderSummary.totalSKUs} SKUs • {orderSummary.totalQuantity} pcs)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 uppercase font-bold block">Today's Recovery Collected</span>
                      <span className="font-mono font-black text-base text-emerald-700 block mt-0.5">
                        Rs. {todaysRecoveryNum.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">({todaysRecoveryMode})</span>
                    </div>

                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                      <span className="text-[10px] text-teal-800 uppercase font-bold block">Net Balance After Recovery</span>
                      <span className="font-mono font-black text-base text-teal-700 block mt-0.5">
                        Rs. {liveNetBalance.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-teal-600 font-medium">(Live Sync)</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderQuantities({});
                        setTodaysRecoveryAmount("");
                        setTodaysRecoveryInstrument("");
                        setTodaysRecoveryBank("");
                        setTodaysRecoveryRemarks("");
                      }}
                      className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all active:scale-95"
                    >
                      Reset Entry Form
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingCombined || (!orderSummary.totalQuantity && !todaysRecoveryNum)}
                      onClick={handleSaveAndSubmitToNlink}
                      className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isSubmittingCombined
                          ? "Syncing to N-LINK & Google Sheet..."
                          : `SAVE & SUBMIT TO N-LINK (Order: Rs. ${orderSummary.orderValue.toLocaleString()} | Rec: Rs. ${todaysRecoveryNum.toLocaleString()})`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* --- 3. CHECK BALANCES SECTION --- */}
                <div id="dealer-section-balances" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          3. Check Balances
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Dealer Financial Position &amp; Credit Standing</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      customerFinancials.netBalance > (activeCustomer.creditLimit || 500000)
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {customerFinancials.netBalance > (activeCustomer.creditLimit || 500000) ? 'Over Limit' : 'Within Credit Limit'}
                    </span>
                  </div>

                  {/* 4 Financial Balances Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Opening Balance</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 block mt-1">
                        Rs. {customerFinancials.openingBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Till Date Invoices</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 block mt-1">
                        Rs. {customerFinancials.totalInvoiced.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Till Date Recovery</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-emerald-700 block mt-1">
                        Rs. {customerFinancials.totalRecovered.toLocaleString()}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${
                      customerFinancials.netBalance > 0
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-emerald-50/70 border-emerald-200'
                    }`}>
                      <span className={`text-[10px] uppercase font-black block ${
                        customerFinancials.netBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        Net Outstanding
                      </span>
                      <span className={`text-xs sm:text-sm font-mono font-black block mt-1 ${
                        customerFinancials.netBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        Rs. {customerFinancials.netBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Credit Terms & Aging */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
                      <span>Credit Terms:</span>
                      <span className="font-mono text-slate-900">
                        Limit: Rs. {(activeCustomer.creditLimit || 500000).toLocaleString()} | Days: {activeCustomer.creditDays || 30} Days
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">
                        Aging Analysis Breakdown
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-bold">0-30 Days</span>
                          <span className="font-mono font-bold text-slate-800">
                            Rs. {Math.round(customerFinancials.netBalance * 0.55).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-bold">31-60 Days</span>
                          <span className="font-mono font-bold text-slate-800">
                            Rs. {Math.round(customerFinancials.netBalance * 0.30).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 block font-bold">61-90 Days</span>
                          <span className="font-mono font-bold text-amber-700">
                            Rs. {Math.round(customerFinancials.netBalance * 0.12).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-rose-200 bg-rose-50/50">
                          <span className="text-[9px] text-rose-500 block font-bold">90+ Days</span>
                          <span className="font-mono font-bold text-rose-700">
                            Rs. {Math.round(customerFinancials.netBalance * 0.03).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- 4. CHECK INVOICE SECTION --- */}
                <div id="dealer-section-invoices" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          4. Check Invoice
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Historical Invoices &amp; Print Receipts</p>
                      </div>
                    </div>

                      {/* Date Filter */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="date"
                          value={invoiceFromDate}
                          onChange={(e) => setInvoiceFromDate(e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                        <span>to</span>
                        <input
                          type="date"
                          value={invoiceToDate}
                          onChange={(e) => setInvoiceToDate(e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Invoice No.</th>
                            <th className="px-3 py-2.5 text-right">Amount</th>
                            <th className="px-3 py-2.5 text-center">Status</th>
                            <th className="px-3 py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                                No invoices found in selected date range.
                              </td>
                            </tr>
                          ) : (
                            customerInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5 font-medium text-slate-600">
                                  {(inv.invoiceDate || '').split('T')[0]}
                                </td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                                  {inv.invoiceNumber}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                  Rs. {Number(inv.totalAmount || 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {inv.status || 'Completed'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadOrderPdf(inv, activeCustomer)}
                                      disabled={isGeneratingPdf}
                                      className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                                      title="Download branded National Lights PDF invoice"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download PDF</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleLivePreviewOrderPdf(inv, activeCustomer)}
                                      disabled={isGeneratingPdf}
                                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-all active:scale-95"
                                      title="Interactive live PDF preview"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Preview</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleWhatsAppShareOrder(inv, activeCustomer)}
                                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center transition-all active:scale-95"
                                      title="Share invoice on WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAutoDownloadPdf(false);
                                        setSelectedInvoiceForPrint(inv);
                                        toast.info(
                                          'Opening Invoice Preview',
                                          `Loading print preview for #${inv.invoiceNumber || inv.id}...`
                                        );
                                      }}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 border border-slate-200 transition-all active:scale-95"
                                      title="View print-friendly invoice"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Print</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                {/* --- 5. CHECK LEDGER SECTION --- */}
                <div id="dealer-section-ledger" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          5. Check Ledger
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Live Customer Statement &amp; Running Balance</p>
                      </div>
                    </div>

                    {/* Actions Toolbar & Date Filter */}
                    <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto justify-between md:justify-end">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <input
                          type="date"
                          value={ledgerFromDate}
                          onChange={(e) => setLedgerFromDate(e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                        <span className="text-slate-400 font-normal">to</span>
                        <input
                          type="date"
                          value={ledgerToDate}
                          onChange={(e) => setLedgerToDate(e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeCustomer) return;
                            exportCustomerLedgerToCsv(activeCustomer, activeCustomerLedgerEntries);
                            toast.success('Ledger Exported', `CSV Statement generated for ${activeCustomer.companyName}.`);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg font-bold text-xs cursor-pointer inline-flex items-center gap-1 border border-slate-200 shadow-2xs transition-all"
                          title="Export Ledger to CSV"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!activeCustomer) {
                              toast.error('No Customer Selected', 'Please select a distributor or dealer to print statement.');
                              return;
                            }
                            setPrintLedgerModalOpen(true);
                            toast.info('Statement of Account', `Opening official print preview for ${activeCustomer.companyName}...`);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition-all"
                          title="Print official A4 Statement of Account"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Ledger</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5">Reference</th>
                          <th className="px-3 py-2.5 text-right">Debit</th>
                          <th className="px-3 py-2.5 text-right">Credit</th>
                          <th className="px-3 py-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerLedgerData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-600">{row.date}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{row.type}</td>
                            <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{row.ref}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-900">
                              {row.debit > 0 ? `Rs. ${row.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-700">
                              {row.credit > 0 ? `Rs. ${row.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              Rs. {row.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'DASHBOARD' && (
          <div className="sra-dashboard space-y-4">
            {/* FIELD OFFICER DAILY SUMMARY CARD */}
            <DailySummaryCard
              currentUser={currentUser}
              todaySales={dailySummaryData.todaySalesVal}
              todayOrdersCount={dailySummaryData.todayOrdersCount}
              todayRecovery={dailySummaryData.todayRecoveryVal}
              todayRecoveriesCount={dailySummaryData.todayRecoveriesCount}
              totalVisitsCount={dailySummaryData.totalVisitsCount}
              productiveVisitsCount={dailySummaryData.productiveCount}
              productivityRate={dailySummaryData.rate}
              activeTown={selectedTown}
            />

            {/* DASHBOARD MODULE SWITCHER CONTROL */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 pl-1">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Active Dashboard Workspace
                </span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setDashboardSubTab('FMCG_COMMAND')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    dashboardSubTab === 'FMCG_COMMAND'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  FMCG Sales Command (N-LINK Core)
                </button>
                <button
                  onClick={() => setDashboardSubTab('FINANCIAL')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    dashboardSubTab === 'FINANCIAL'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Financial Performance
                </button>
              </div>
            </div>

            {/* Sub-tab Router */}
            {dashboardSubTab === 'FMCG_COMMAND' ? (
              <FmcgCommandCenter
                currentUser={currentUser}
                customers={customers}
                skus={skus}
                salesOrders={salesOrders}
                recoveries={recoveries}
                visits={visits}
              />
            ) : (
              <>
                {/* Header & Hierarchy Role Badge */}
                <div className="sra-card">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                        {roleScope.scopeLabel}
                      </span>
                      <h1 className="text-xl font-black text-slate-900">Sales Performance</h1>
                      <p className="text-xs text-slate-500 font-medium">{roleScope.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full uppercase">
                        Role: {roleScope.level}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Data Consistency & Manual Refresh Controller */}
                  <div
                    id="dashboard-sync-status-container"
                    className={`sra-sync-bar ${isSyncGlow ? 'sra-sync-glowing' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full transition-all ${
                          isRefreshing
                            ? 'bg-amber-500 animate-ping'
                            : isSyncGlow
                            ? 'bg-emerald-500 ring-2 ring-emerald-300 animate-bounce'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div className="text-xs">
                        <span className="text-slate-500 font-medium">Last synced: </span>
                        <span
                          className={`font-bold transition-colors ${
                            isSyncGlow ? 'text-emerald-900 font-extrabold' : 'text-slate-800'
                          }`}
                        >
                          {lastSyncedText}
                        </span>
                        {isSyncGlow && (
                          <span className="ml-2 text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md inline-block animate-in fade-in">
                            Synced
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        id="dashboard-manual-refresh-btn"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Manually trigger onRefresh() and ensure data consistency"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={downloadMonthlyReportPdf}
                        disabled={isGeneratingReportPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Generate and download downloadable MTD report PDF"
                      >
                        {isGeneratingReportPdf ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-teal-400" />
                        )}
                        <span>{isGeneratingReportPdf ? 'Generating...' : 'MTD Report (PDF)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Period Selector: TODAY | MTD | YTD */}
                  <div className="sra-period-selector">
                    {(['TODAY', 'MTD', 'YTD'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setDashboardPeriod(p)}
                        className={`sra-period-btn ${dashboardPeriod === p ? 'sra-period-btn-active' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TARGET VS ACHIEVEMENT MONTHLY PROGRESS SUMMARY WIDGET */}
                <TargetVsAchievementSummary
                  currentUser={currentUser as any}
                  salesOrders={salesOrders}
                  recoveries={recoveries}
                />

                {/* MTD SALES & RECOVERY TARGET ACHIEVEMENT SVG GAUGE */}
                <MtdAchievementGauge
                  salesAchieved={performanceData.salesAchieved}
                  salesTarget={performanceData.salesTarget}
                  salesPercent={performanceData.salesPercent}
                  recoveryAchieved={performanceData.recoveryAchieved}
                  recoveryTarget={performanceData.recoveryTarget}
                  recoveryPercent={performanceData.recoveryPercent}
                  monthName={mtdStats.monthName}
                  approvedValue={mtdStats.approvedMtdValue}
                  pendingValue={mtdStats.pendingMtdValue}
                  daysPassed={new Date().getDate()}
                  totalDaysInMonth={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
                />

                {/* RESPONSIVE FLUID KPI GRID: SALES & RECOVERY SCALING TOGETHER */}
                <div className="sra-dashboard-kpi-grid">
                  {/* 1. SALES KPI CARD */}
                  <div className="sra-kpi-card">
                    <div className="sra-kpi-header">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-black">
                          S
                        </div>
                        <div>
                          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            {dashboardPeriod === 'MTD' ? `${mtdStats.monthName} Sales Performance` : 'Sales Performance'}
                          </h2>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {dashboardPeriod === 'MTD' ? 'Dynamic Sales Orders vs Monthly Target' : 'Realized vs Period Target'}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-teal-700 font-mono">
                        {performanceData.salesPercent}% Achieved
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="sra-progress-track">
                      <div
                        className="sra-progress-fill-teal"
                        style={{ width: `${Math.min(performanceData.salesPercent, 100)}%` }}
                      />
                    </div>

                    {/* Data Grid */}
                    <div className="sra-metric-subgrid">
                      <div className="sra-metric-item">
                        <span className="sra-metric-label">Target</span>
                        <span className="sra-metric-value">
                          Rs. {performanceData.salesTarget.toLocaleString()}
                        </span>
                      </div>
                      <div className="sra-metric-item">
                        <span className="sra-metric-label">Achievement</span>
                        <span className="sra-metric-value text-teal-700">
                          Rs. {performanceData.salesAchieved.toLocaleString()}
                        </span>
                      </div>
                      <div className="sra-metric-variance">
                        <span className="text-slate-500 font-medium">Variance vs Target:</span>
                        <span
                          className={`font-mono font-bold ${
                            performanceData.salesVariance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {performanceData.salesVariance >= 0 ? '+' : ''}Rs.{' '}
                          {performanceData.salesVariance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic MTD Operational Run-Rate & Order Clearance Card */}
                    {dashboardPeriod === 'MTD' && (
                      <div className="sra-mtd-card">
                        <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                          <span className="font-extrabold text-teal-900 text-[11px] uppercase tracking-wide">
                            MTD Pace &amp; Quota Velocity
                          </span>
                          <span className="text-[10px] font-bold text-teal-700 font-mono">
                            {mtdStats.totalOrders} Orders Logged
                          </span>
                        </div>

                        <div className="sra-mtd-stat-grid">
                          <div className="bg-white/80 p-2 rounded-lg border border-teal-100">
                            <span className="text-[10px] text-slate-500 block">Approved / Confirmed</span>
                            <span className="font-mono font-black text-teal-800">
                              Rs. {mtdStats.approvedMtdValue.toLocaleString()} ({mtdStats.approvedOrdersCount})
                            </span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                            <span className="text-[10px] text-slate-500 block">Pending Clearance</span>
                            <span className="font-mono font-black text-amber-700">
                              Rs. {mtdStats.pendingMtdValue.toLocaleString()} ({mtdStats.pendingOrdersCount})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-teal-200/60 text-[11px] flex-wrap gap-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Days Remaining in Month:</span>
                            <span className="font-extrabold text-slate-800 font-mono">{mtdStats.daysRemaining} Days</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px]">Daily Booking Run-Rate Needed:</span>
                            <span className="font-extrabold text-teal-800 font-mono">
                              Rs. {mtdStats.dailyRunRateNeeded.toLocaleString()} / day
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. RECOVERY KPI CARD */}
                  <div className="sra-kpi-card">
                    <div className="sra-kpi-header">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-black">
                          R
                        </div>
                        <div>
                          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Recovery</h2>
                          <span className="text-[11px] text-slate-500 font-medium">Collections vs Target</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-700 font-mono">
                        {performanceData.recoveryPercent}% Achieved
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="sra-progress-track">
                      <div
                        className="sra-progress-fill-emerald"
                        style={{ width: `${Math.min(performanceData.recoveryPercent, 100)}%` }}
                      />
                    </div>

                    {/* Data Grid */}
                    <div className="sra-metric-subgrid">
                      <div className="sra-metric-item">
                        <span className="sra-metric-label">Target</span>
                        <span className="sra-metric-value">
                          Rs. {performanceData.recoveryTarget.toLocaleString()}
                        </span>
                      </div>
                      <div className="sra-metric-item">
                        <span className="sra-metric-label">Achievement</span>
                        <span className="sra-metric-value text-emerald-700">
                          Rs. {performanceData.recoveryAchieved.toLocaleString()}
                        </span>
                      </div>
                      <div className="sra-metric-variance">
                        <span className="text-slate-500 font-medium">Variance vs Target:</span>
                        <span
                          className={`font-mono font-bold ${
                            performanceData.recoveryVariance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {performanceData.recoveryVariance >= 0 ? '+' : ''}Rs.{' '}
                          {performanceData.recoveryVariance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2.5. DAILY SALES VS RECOVERY MTD TRENDS (RECHARTS LINE CHART) */}
                <div className="sra-card bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-teal-600" />
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          Daily Sales vs. Recovery Trends (MTD)
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Month-to-Date comparative daily run-rate progress for {mtdStats.monthName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
                        Daily Booking
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Daily Recovery
                      </span>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72 w-full text-xs font-sans">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={mtdDailyTrendsData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => {
                            // Only show every 2nd or 3rd label on small screens to prevent overlap
                            const dayNum = parseInt(value.split(' ')[1] || '0', 10);
                            return dayNum % 3 === 1 ? value : '';
                          }}
                        />
                        {/* Left axis for Sales Booking run-rate */}
                        <YAxis 
                          yAxisId="left"
                          stroke="#0d9488" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `S:Rs.${(value / 1000).toFixed(0)}k`}
                        />
                        {/* Right axis for Recovery Collections run-rate */}
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#10b981" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => `R:Rs.${(value / 1000).toFixed(0)}k`}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: '#0f172a',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '11px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          }}
                          labelStyle={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}
                          formatter={(value: any, name: any) => [
                            `PKR ${Number(value).toLocaleString()}`,
                            name === 'sales' ? 'Daily Booking (Left Axis)' : 'Daily Recovery (Right Axis)'
                          ]}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sales"
                          name="sales"
                          stroke="#0d9488"
                          strokeWidth={2.5}
                          dot={{ r: 2, stroke: '#0d9488', strokeWidth: 1, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="recovery"
                          name="recovery"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 2, stroke: '#10b981', strokeWidth: 1, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/60 text-[10px] text-slate-500 leading-relaxed flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>
                      <strong>Analytical Insight:</strong> Tracking daily booking against collection velocity helps prevent credit age build-up. Aim to keep daily recovery lines tracking closely with or above daily sales bookings.
                    </span>
                  </div>
                </div>

                {/* 3. DEALER & ORDER DENSITY HEATMAP (Town-wise Geographic Concentration) */}
                <DealerHeatmap
                  customers={customers}
                  salesOrders={salesOrders}
                  onSelectCustomer={(c) => {
                    setActiveTab('DISTRIBUTORS');
                    setSelectedCustomerId(c.id);
                  }}
                  onFilterTown={(town) => {
                    setActiveTab('DISTRIBUTORS');
                    setCustomerSearchQuery(town);
                  }}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* BOTTOM NAVIGATION BAR (Strict 3-Tab Architecture) */}
      {/* ========================================================= */}
      <nav className="sra-bottom-nav">
        <div className="sra-bottom-nav-inner">
          {/* Tab 1: Dashboard */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('DASHBOARD');
              setSelectedCustomerId(null);
            }}
            className={`sra-bottom-nav-btn ${
              activeTab === 'DASHBOARD' ? 'sra-bottom-nav-btn-active' : ''
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${activeTab === 'DASHBOARD' ? 'stroke-[2.5] text-teal-700' : 'stroke-2'}`} />
            <span className="text-[11px] leading-none">Dashboard</span>
          </button>

          {/* Tab 2: Attendance */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('ATTENDANCE');
              setSelectedCustomerId(null);
            }}
            className={`sra-bottom-nav-btn ${
              activeTab === 'ATTENDANCE' ? 'sra-bottom-nav-btn-active' : ''
            }`}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'ATTENDANCE' ? 'stroke-[2.5] text-teal-700' : 'stroke-2'}`} />
            <span className="text-[11px] leading-none">Attendance</span>
          </button>

          {/* Tab 3: Customers */}
          <button
            type="button"
            onClick={() => setActiveTab('DISTRIBUTORS')}
            className={`sra-bottom-nav-btn ${
              activeTab === 'DISTRIBUTORS' ? 'sra-bottom-nav-btn-active' : ''
            }`}
          >
            <Store className={`w-5 h-5 ${activeTab === 'DISTRIBUTORS' ? 'stroke-[2.5] text-teal-700' : 'stroke-2'}`} />
            <span className="text-[11px] leading-none">Customers</span>
          </button>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* FIELD FORCE SIDEBAR / MENU (SECTION 11) */}
      {/* ========================================================= */}
      {showFieldForceMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex">
          <div
            className="fixed inset-0"
            onClick={() => setShowFieldForceMenu(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-5 bg-gradient-to-r from-teal-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg border border-white/20">
                  NL
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">N-LINK 360</h3>
                  <p className="text-[10px] text-teal-200 font-medium">Field Force System</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFieldForceMenu(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Snippet */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-200">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-800 truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.email || roleScope.level}</div>
              </div>
            </div>

            {/* 7 Strict Menu Items (Section 11) */}
            <div className="p-3 space-y-1 overflow-y-auto flex-1 text-xs font-bold text-slate-700">
              {/* 1. Dashboard */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('DASHBOARD');
                  setSelectedCustomerId(null);
                  setShowFieldForceMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'DASHBOARD' ? 'bg-teal-50 text-teal-800 font-black' : 'hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>1. Dashboard</span>
              </button>

              {/* 2. Attendance */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ATTENDANCE');
                  setSelectedCustomerId(null);
                  setShowFieldForceMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'ATTENDANCE' ? 'bg-teal-50 text-teal-800 font-black' : 'hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 text-teal-600" />
                <span>2. Attendance</span>
              </button>

              {/* 3. Dealers / Distributors */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('DISTRIBUTORS');
                  setSelectedCustomerId(null);
                  setShowFieldForceMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'DISTRIBUTORS' && !selectedCustomerId ? 'bg-teal-50 text-teal-800 font-black' : 'hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4 text-teal-600" />
                <span>3. Dealers / Distributors</span>
              </button>

              {/* 4. Invoices */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('DISTRIBUTORS');
                  setCustomerInnerTab('INVOICES');
                  setShowFieldForceMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>4. Invoices</span>
              </button>

              {/* 5. Ledgers */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('DISTRIBUTORS');
                  setCustomerInnerTab('LEDGER');
                  setShowFieldForceMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>5. Ledgers</span>
              </button>

              <div className="pt-3 pb-1">
                <div className="h-px bg-slate-200" />
              </div>

              {/* 6. App Settings (Auto-Save, Crash Prevention, Preferences) */}
              <button
                type="button"
                onClick={() => {
                  setShowFieldForceMenu(false);
                  setIsSettingsModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-800 font-bold"
              >
                <Settings className="w-4 h-4 text-teal-600" />
                <span>6. App Settings (Auto-Save)</span>
              </button>

              {/* 7. Restore Password (Section 29) */}
              <button
                type="button"
                onClick={() => {
                  setShowFieldForceMenu(false);
                  setShowPasswordRestoreModal(true);
                  setRestoreMessage(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-700"
              >
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>7. Restore Password</span>
              </button>

              {/* 8. Logout */}
              <button
                type="button"
                onClick={() => {
                  setShowFieldForceMenu(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer font-black"
              >
                <LogOut className="w-4 h-4" />
                <span>8. Logout</span>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
              National Lights • Field Force v3.60
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESTORE PASSWORD MODAL (SECTION 29) */}
      {/* ========================================================= */}
      {showPasswordRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Restore Password</h3>
                  <p className="text-[11px] text-slate-500">Secure Password Reset Flow</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordRestoreModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch between sending reset link vs direct in-session password update */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => { setRestoreTabMode('RESET_LINK'); setRestoreMessage(null); }}
                className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  restoreTabMode === 'RESET_LINK' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Send Reset Link
              </button>
              <button
                type="button"
                onClick={() => { setRestoreTabMode('DIRECT_CHANGE'); setRestoreMessage(null); }}
                className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  restoreTabMode === 'DIRECT_CHANGE' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Set New Password
              </button>
            </div>

            {restoreMessage && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 ${
                  restoreMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {restoreMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{restoreMessage.text}</span>
              </div>
            )}

            {restoreTabMode === 'RESET_LINK' ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const cleanEmail = restoreEmail.trim().toLowerCase();
                  if (!cleanEmail) {
                    setRestoreMessage({ type: 'error', text: 'Please enter your registered corporate email.' });
                    return;
                  }
                  setRestoreSubmitting(true);
                  setRestoreMessage(null);
                  try {
                    await resetPassword(cleanEmail);
                    setRestoreMessage({
                      type: 'success',
                      text: `Password reset instructions have been dispatched to ${cleanEmail}. Please check your inbox or spam folder.`,
                    });
                  } catch (err: any) {
                    setRestoreMessage({
                      type: 'error',
                      text: err?.message || 'Password reset email could not be sent. Please contact your administrator.',
                    });
                  } finally {
                    setRestoreSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered Personnel Email
                  </label>
                  <input
                    type="email"
                    required
                    value={restoreEmail}
                    onChange={(e) => setRestoreEmail(e.target.value)}
                    placeholder="user@nationallights.com"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Instructions will be delivered with a secure redirect link.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                  <strong>Corporate Email Note:</strong> If external transactional emails are blocked by corporate firewall, contact National Lights IT Admin directly for assisted password reset.
                </div>

                <button
                  type="submit"
                  disabled={restoreSubmitting}
                  className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  {restoreSubmitting ? 'Sending Link…' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!directNewPassword || directNewPassword.length < 6) {
                    setRestoreMessage({ type: 'error', text: 'Password must be at least 6 characters in length.' });
                    return;
                  }
                  if (directNewPassword !== directConfirmPassword) {
                    setRestoreMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
                    return;
                  }
                  setRestoreSubmitting(true);
                  setRestoreMessage(null);
                  try {
                    await updatePassword(directNewPassword);
                    setDirectNewPassword('');
                    setDirectConfirmPassword('');
                    setRestoreMessage({
                      type: 'success',
                      text: 'Your password has been successfully updated in your account!',
                    });
                  } catch (err: any) {
                    setRestoreMessage({
                      type: 'error',
                      text: err?.message || 'Failed to update password. Please contact your administrator.',
                    });
                  } finally {
                    setRestoreSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Account Password
                  </label>
                  <div className="relative">
                    <input
                      type={showDirectPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={directNewPassword}
                      onChange={(e) => setDirectNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDirectPass((v) => !v)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showDirectPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showDirectPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={directConfirmPassword}
                    onChange={(e) => setDirectConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={restoreSubmitting}
                  className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {restoreSubmitting ? 'Updating Password…' : 'Save New Password'}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowPasswordRestoreModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ORDER CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {showOrderConfirmModal && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Confirm This Order?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Customer: <strong className="text-slate-800">{activeCustomer.companyName}</strong>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Total SKUs:</span>
                <span className="font-bold text-slate-800">{orderSummary.totalSKUs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Quantity:</span>
                <span className="font-bold text-slate-800">{orderSummary.totalQuantity} pcs</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                <span className="text-slate-700 font-bold">Total Order Value:</span>
                <span className="font-mono font-black text-teal-700">
                  Rs. {orderSummary.orderValue.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOrderConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={orderSubmitting}
                onClick={handleConfirmSubmitOrder}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                {orderSubmitting ? 'CONFIRMING...' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXPANDABLE ORDER PREVIEW DRAWER (Line-item breakdown, Tax & Discount) */}
      {/* ========================================================= */}
      {showOrderPreviewDrawer && activeCustomer && (
        <OrderPreviewDrawer
          isOpen={showOrderPreviewDrawer}
          onClose={() => setShowOrderPreviewDrawer(false)}
          customer={activeCustomer}
          orderQuantities={orderQuantities}
          skus={skus}
          onUpdateQuantity={handleQtyChange}
          onConfirmOrder={async (details) => {
            await handleConfirmSubmitOrder(details);
          }}
          submitting={orderSubmitting}
        />
      )}

      {/* ========================================================= */}
      {/* PRINT INVOICE MODAL INTEGRATION */}
      {/* ========================================================= */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          invoice={selectedInvoiceForPrint}
          customer={activeCustomer || undefined}
          skus={skus}
          currentUser={currentUser}
          autoDownloadPdfOnLoad={isAutoDownloadPdf}
          onClose={() => {
            setSelectedInvoiceForPrint(null);
            setIsAutoDownloadPdf(false);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* FIELD FORCE DEALER REGISTRATION MODAL (PENDING APPROVAL QUEUE) */}
      {/* ========================================================= */}
      {isRegisterModalOpen && (
        <DynamicDealerFormModal
          isOpen={isRegisterModalOpen}
          isEdit={false}
          dealersList={customers}
          currentUser={currentUser}
          onClose={() => setIsRegisterModalOpen(false)}
          onSave={async (dealerData) => {
            setIsRegisterModalOpen(false);
            if (onSubmitRegistration) {
              await onSubmitRegistration(dealerData);
            }
            submitAndSaveCustomer(dealerData, getAccessToken()).catch((err) =>
              console.warn('Dealer registration 2-way sync notice:', err)
            );
            setActiveTab('DISTRIBUTORS');
            setDealerCategoryFilter('PENDING');
            setSelectedCustomerId(null);
            toast.success(
              'Dealer Registration Submitted',
              `Application for "${dealerData.name}" submitted to Executive Approval Queue.`
            );
            setRegistrationSuccessMsg(
              `Registration application for "${dealerData.name}" submitted to Head Office Approval Queue. It will appear in active dealers once approved.`
            );
            setTimeout(() => setRegistrationSuccessMsg(null), 8000);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* PRINT CUSTOMER STATEMENT & LEDGER MODAL */}
      {/* ========================================================= */}
      {printLedgerModalOpen && activeCustomer && (
        <PrintLedgerModal
          isOpen={printLedgerModalOpen}
          onClose={() => setPrintLedgerModalOpen(false)}
          customer={activeCustomer}
          ledgerEntries={activeCustomerLedgerEntries}
        />
      )}

      {/* ========================================================= */}
      {/* 500m GEOFENCE VIOLATION SECURITY MODAL */}
      {/* ========================================================= */}
      {geofenceViolationModal && geofenceViolationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Header Icon & Warning */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  500m Geofence Perimeter Check Failed
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">Outside Assigned Beat Boundary</h3>
              </div>
            </div>

            {/* Explanation & Measured Distance */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Assigned Town:</span>
                <span className="font-bold text-slate-900 text-sm">{geofenceViolationModal.townName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Town Hub Coordinates:</span>
                <span className="font-mono text-slate-700">
                  {geofenceViolationModal.townCoords.lat.toFixed(4)}° N, {geofenceViolationModal.townCoords.lng.toFixed(4)}° E
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Your GPS Location:</span>
                <span className="font-mono text-slate-700">
                  {geofenceViolationModal.userCoords.lat.toFixed(4)}° N, {geofenceViolationModal.userCoords.lng.toFixed(4)}° E
                  <span className="text-[10px] text-slate-400 block text-right font-sans">
                    (Accuracy: ±{geofenceViolationModal.userCoords.accuracy}m)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-700 font-bold">Measured Distance:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  {geofenceViolationModal.distanceMeters >= 1000
                    ? `${geofenceViolationModal.distanceKm.toFixed(2)} km`
                    : `${Math.round(geofenceViolationModal.distanceMeters)} meters`}
                  <span className="text-[10px] text-rose-500 block font-sans font-normal text-right">
                    Allowed: Within 500m
                  </span>
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Company policy requires field representatives to be within <strong>500 meters</strong> of the assigned beat center for legitimate attendance verification.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGeofenceViolationModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeofenceViolationModal(null);
                  handleCheckIn();
                }}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Retry GPS Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GOOGLE SHEETS LIVE DATABASE SYNC MODAL */}
      {/* ========================================================= */}
      {showGoogleSheetsModal && (
        <GoogleSheetSyncModal
          isOpen={showGoogleSheetsModal}
          onClose={() => setShowGoogleSheetsModal(false)}
          appData={appDataForGoogleSheet}
          onSyncComplete={(msg) => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* HIDDEN PRINT-FRIENDLY MONTHLY MTD REPORT CONTAINER (For high-resolution jsPDF export) */}
      <div
        id="printable-monthly-report"
        className="fixed opacity-0 pointer-events-none"
        style={{ left: '-9999px', top: '-9999px', width: '794px', background: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif', padding: '40px' }}
      >
        {/* Company Header with Premium National Lights Logo */}
        <div className="border-b-4 border-teal-600 pb-5 flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md" style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#0d9488', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#ffffff', fontWeight: '900', fontSize: '20px' }}>
                NL
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950" style={{ fontSize: '24px', fontWeight: '900', margin: '0', color: '#020617' }}>NATIONAL LIGHTS</h1>
                <p className="text-xs uppercase tracking-widest font-bold text-teal-600" style={{ fontSize: '10px', uppercase: 'true', fontWeight: 'bold', margin: '0', color: '#0d9488', letterSpacing: '0.1em' }}>Pakistan's Premium Lighting Systems</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium" style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>Official Field Force Monthly MTD Performance &amp; Sales Audit Report</p>
          </div>
          <div className="text-right" style={{ textAlign: 'right' }}>
            <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '800', background: '#f0fdfa', color: '#115e59', border: '1px solid #99f6e4', padding: '4px 12px', borderRadius: '9999px' }}>
              Confidential · Internal Use Only
            </span>
            <p className="text-xs font-bold text-slate-800 mt-2.5 font-mono" style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '10px', color: '#1e293b' }}>Date Generated: {new Date().toLocaleDateString()}</p>
            <p className="text-[10px] text-slate-500 font-mono" style={{ fontSize: '10px', color: '#64748b' }}>System: N-Link 360 Enterprise</p>
          </div>
        </div>

        {/* Report Overview Header */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '24px' }}>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', margin: '0' }}>Field Personnel Profile</h3>
            <p className="text-base font-extrabold text-slate-900 mt-1" style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{currentUser.fullName}</p>
            <p className="text-xs text-slate-600 font-semibold mt-0.5" style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Designation: <span className="text-slate-800 uppercase" style={{ color: '#1e293b', fontWeight: '700' }}>{currentUser.role || 'Field Officer'}</span></p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Territory/Town: <span className="text-slate-800" style={{ color: '#1e293b', fontWeight: '700' }}>{selectedTown || 'All Assigned Territories'}</span></p>
          </div>
          <div className="text-right border-l border-slate-200 pl-4" style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', margin: '0' }}>Target Period Summary</h3>
            <p className="text-base font-extrabold text-teal-800 mt-1" style={{ fontSize: '16px', fontWeight: '800', color: '#115e59', margin: '4px 0 0 0' }}>{mtdStats.monthName}</p>
            <p className="text-xs text-slate-600 font-semibold mt-0.5" style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Assigned Base Quota: <span className="font-mono font-bold text-slate-800" style={{ fontWeight: '700', color: '#1e293b' }}>Rs. {mtdStats.mtdTarget.toLocaleString()}</span></p>
            <p className="text-xs text-slate-600 font-semibold" style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Active Working Days: <span className="font-bold text-slate-800" style={{ fontWeight: '700', color: '#1e293b' }}>26 Days</span></p>
          </div>
        </div>

        {/* MTD Performance Breakdown Grid */}
        <div className="mt-8 space-y-4" style={{ marginTop: '32px' }}>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5" style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            1. Core Performance Metrics &amp; Target Achievements
          </h2>

          <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
            {/* Sales Card */}
            <div className="p-4 rounded-xl border-2 border-teal-600 bg-teal-50/20 text-center space-y-1" style={{ padding: '16px', borderRadius: '12px', border: '2px solid #0d9488', background: 'rgba(13,148,136,0.05)', textAlign: 'center' }}>
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest block" style={{ fontSize: '10px', fontWeight: '900', color: '#115e59', letterSpacing: '0.05em', display: 'block' }}>MTD Sales Booked</span>
              <span className="text-xl font-black text-teal-900 block font-mono" style={{ fontSize: '20px', fontWeight: '900', color: '#134e4a', display: 'block', margin: '4px 0' }}>Rs. {mtdStats.mtdSalesAchieved.toLocaleString()}</span>
              <div className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-teal-300" style={{ fontSize: '10px', fontWeight: '800', background: '#ccfbf1', color: '#115e59', border: '1px solid #99f6e4', padding: '2px 8px', borderRadius: '9999px', display: 'inline-block' }}>
                {mtdStats.mtdPercent}% Target Achieved
              </div>
            </div>

            {/* Recovery Card */}
            <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/20 text-center space-y-1" style={{ padding: '16px', borderRadius: '12px', border: '2px solid #059669', background: 'rgba(5,150,105,0.05)', textAlign: 'center' }}>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block" style={{ fontSize: '10px', fontWeight: '900', color: '#064e3b', letterSpacing: '0.05em', display: 'block' }}>MTD Recovery Collected</span>
              <span className="text-xl font-black text-emerald-900 block font-mono" style={{ fontSize: '20px', fontWeight: '900', color: '#064e3b', display: 'block', margin: '4px 0' }}>Rs. {mtdRecoveryStats.achieved.toLocaleString()}</span>
              <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300" style={{ fontSize: '10px', fontWeight: '800', background: '#d1fae5', color: '#064e3b', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '9999px', display: 'inline-block' }}>
                {mtdRecoveryStats.percent}% Target Achieved
              </div>
            </div>

            {/* Visits Card */}
            <div className="p-4 rounded-xl border-2 border-cyan-600 bg-cyan-50/20 text-center space-y-1" style={{ padding: '16px', borderRadius: '12px', border: '2px solid #0891b2', background: 'rgba(8,145,178,0.05)', textAlign: 'center' }}>
              <span className="text-[10px] font-black text-cyan-800 uppercase tracking-widest block" style={{ fontSize: '10px', fontWeight: '900', color: '#164e63', letterSpacing: '0.05em', display: 'block' }}>MTD Visits Logged</span>
              <span className="text-xl font-black text-cyan-900 block font-mono" style={{ fontSize: '20px', fontWeight: '900', color: '#164e63', display: 'block', margin: '4px 0' }}>{mtdVisitsStats.total} Total Visits</span>
              <div className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-cyan-300" style={{ fontSize: '10px', fontWeight: '800', background: '#ecfeff', color: '#164e63', border: '1px solid #cffafe', padding: '2px 8px', borderRadius: '9999px', display: 'inline-block' }}>
                {mtdVisitsStats.rate}% Productive ({mtdVisitsStats.productive} visits)
              </div>
            </div>
          </div>
        </div>

        {/* MTD Performance Breakdown details */}
        <div className="mt-8 grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2" style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
              Sales Pipeline &amp; Variance Analysis
            </h3>
            <table className="w-full text-xs text-slate-700 font-semibold space-y-1" style={{ width: '100%' }}>
              <tbody>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Gross Monthly Quota Target:</td>
                  <td style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>Rs. {mtdStats.mtdTarget.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Total Booking Realized:</td>
                  <td style={{ fontFamily: 'monospace', color: '#115e59', fontWeight: '750' }}>Rs. {mtdStats.mtdSalesAchieved.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Quota Variance Amount:</td>
                  <td style={{ fontFamily: 'monospace', color: mtdStats.mtdVariance >= 0 ? '#047857' : '#be123c', fontWeight: '750' }}>
                    {mtdStats.mtdVariance >= 0 ? '+' : ''}Rs. {mtdStats.mtdVariance.toLocaleString()}
                  </td>
                </tr>
                <tr className="py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Required Daily Run-Rate Pace:</td>
                  <td style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>Rs. {mtdStats.dailyRunRateNeeded.toLocaleString()} / day</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2" style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
              Recovery &amp; Collections Statement
            </h3>
            <table className="w-full text-xs text-slate-700 font-semibold space-y-1" style={{ width: '100%' }}>
              <tbody>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Recovery Assigned Quota:</td>
                  <td style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>Rs. {mtdRecoveryStats.target.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Recovery Collected Amount:</td>
                  <td style={{ fontFamily: 'monospace', color: '#047857', fontWeight: '750' }}>Rs. {mtdRecoveryStats.achieved.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-100 py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Pending Clearance Collections:</td>
                  <td style={{ fontFamily: 'monospace', color: '#b45309', fontWeight: '750' }}>Rs. {recoveries.filter(r => r.status === 'PENDING').reduce((s, r) => s + Number(r.amount || 0), 0).toLocaleString()}</td>
                </tr>
                <tr className="py-1.5 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <td style={{ color: '#64748b' }}>Approved Deposits Count:</td>
                  <td style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>{mtdRecoveryStats.count} Recoveries Logged</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table of Recent Orders in current month */}
        <div className="mt-8" style={{ marginTop: '32px' }}>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3" style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
            2. Detailed Log of Recent Orders booked this Month (MTD)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px', fontSize: '10px' }}>Order #</th>
                <th style={{ padding: '8px', fontSize: '10px' }}>Dealer / Company</th>
                <th style={{ padding: '8px', fontSize: '10px' }}>Booking Date</th>
                <th style={{ padding: '8px', fontSize: '10px', textAlign: 'right' }}>Items Count</th>
                <th style={{ padding: '8px', fontSize: '10px', textAlign: 'right' }}>Total Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {mtdStats.recentMtdOrders && mtdStats.recentMtdOrders.length > 0 ? (
                mtdStats.recentMtdOrders.map((ord) => (
                  <tr key={ord.id} className="border-b border-slate-150 text-slate-800 font-semibold" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: '700' }}>{ord.orderNumber}</td>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{ord.customerName}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{new Date(ord.orderDate || ord.createdAt || '').toLocaleDateString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{ord.items?.length || 0} items</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#115e59' }}>Rs. {Number(ord.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 font-bold bg-slate-50/50" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    No orders booked in the current month yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Verification Footnote & Legal Disclaimers */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-[10px] text-slate-500 font-semibold space-y-1" style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#64748b' }}>
          <p className="font-extrabold text-slate-700" style={{ fontWeight: '800', color: '#334155', margin: '0' }}>DATA AUDIT STATEMENT &amp; COMPLIANCE:</p>
          <p style={{ margin: '4px 0' }}>
            All records in this document correspond to the Month-to-Date performance of field activities synchronized with Google Sheets and the primary PostgreSQL Supabase cluster. Discrepancies should be reported immediately to the National Lights Regional Supervisor.
          </p>
        </div>

        {/* Signatures Area */}
        <div className="mt-14 grid grid-cols-2 gap-12 pt-6" style={{ marginTop: '56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div className="border-t border-slate-350 pt-2 text-center" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', textAlign: 'center' }}>
            <p className="text-xs font-black text-slate-800" style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', margin: '0' }}>{currentUser.fullName}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5" style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', margin: '2px 0 0 0' }}>Field Officer Signature</p>
          </div>
          <div className="border-t border-slate-350 pt-2 text-center" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', textAlign: 'center' }}>
            <p className="text-xs font-black text-slate-800" style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', margin: '0' }}>Regional Sales Manager</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5" style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', margin: '2px 0 0 0' }}>Approval &amp; Verification Stamp</p>
          </div>
        </div>
      </div>

      {/* POST-ORDER SUBMISSION RECEIPT & PDF DOWNLOAD MODAL */}
      {showPostOrderModal && lastSubmittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 sm:p-6 text-white relative">
              <button
                type="button"
                onClick={() => setShowPostOrderModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block">
                    Sales Booking Confirmed &amp; Logged
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Order #{lastSubmittedOrder.order.orderNumber}
                  </h2>
                </div>
              </div>
              <p className="text-xs text-teal-100/90 font-medium mt-2">
                Order recorded for <strong className="text-white">{lastSubmittedOrder.customer.companyName}</strong>. You can now download or print the official vector PDF tax invoice receipt.
              </p>
            </div>

            {/* Modal Body: Order Summary */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Customer & Officer Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer / Dealer</span>
                  <span className="font-black text-slate-900 truncate block text-sm">
                    {lastSubmittedOrder.customer.companyName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({lastSubmittedOrder.customer.customerCode})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Town / Route</span>
                  <span className="font-bold text-slate-800 block">
                    {lastSubmittedOrder.customer.city || lastSubmittedOrder.customer.town || 'General Route'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {lastSubmittedOrder.customer.route || 'Standard Market'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Field Officer</span>
                  <span className="font-bold text-slate-800 block">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold">
                    {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-black text-slate-700 uppercase tracking-wider flex justify-between">
                  <span>Ordered Items ({lastSubmittedOrder.order.items?.length || 0})</span>
                  <span>Line Total</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {lastSubmittedOrder.order.items?.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.skuName}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          <span className="font-mono">{item.skuCode}</span> &bull; {item.orderedQuantity} {item.packagingUnit || 'pcs'} &times; Rs. {Number(item.unitPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono font-bold text-slate-900">
                        Rs. {Number(item.lineTotal || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Total Line */}
                <div className="bg-teal-50/80 p-3.5 border-t border-teal-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-teal-900 block">Total Order Net Value</span>
                    <span className="text-[10px] text-teal-700">Inclusive of trade discounts &amp; standard packing</span>
                  </div>
                  <span className="text-lg font-black font-mono text-teal-900">
                    Rs. {Number(lastSubmittedOrder.order.totalAmount || 0).toLocaleString()} PKR
                  </span>
                </div>
              </div>

              {/* Financial Impact Note */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">Customer Account Impact:</span>
                  <span className="text-amber-800">
                    Current Balance: Rs. {Number(lastSubmittedOrder.customer.currentBalance || lastSubmittedOrder.customer.openingBalance || 0).toLocaleString()} &rarr; Projected Balance: Rs. {(Number(lastSubmittedOrder.customer.currentBalance || lastSubmittedOrder.customer.openingBalance || 0) + Number(lastSubmittedOrder.order.totalAmount || 0)).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Pending Sync
                </span>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleWhatsAppShareOrder(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Send invoice text via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostOrderModal(false);
                    setSelectedInvoiceForPrint(lastSubmittedOrder.order);
                  }}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Open Print Dialog"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleLivePreviewOrderPdf(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-teal-700" />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadOrderPdf(lastSubmittedOrder.order, lastSubmittedOrder.customer)}
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Download className={`w-4 h-4 text-emerald-300 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Order PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE VECTOR PDF PREVIEW & DISPATCH MODAL */}
      {pdfPreviewModalData && (
        <InvoicePdfPreviewModal
          isOpen={pdfPreviewModalData.isOpen}
          onClose={() => setPdfPreviewModalData(null)}
          pdfDataUrl={pdfPreviewModalData.pdfDataUrl}
          pdfFilename={pdfPreviewModalData.pdfFilename}
          order={pdfPreviewModalData.order}
          customer={pdfPreviewModalData.customer}
          onDownload={pdfPreviewModalData.onDownload}
        />
      )}

      {/* Application Settings Modal (Auto-Save, Crash Protection & Preferences) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};
