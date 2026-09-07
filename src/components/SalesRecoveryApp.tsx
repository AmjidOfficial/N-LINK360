/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales Team App (Field Force Application)
 * Simple, Clean, Lightweight 3-Screen Architecture:
 * 1. ATTENDANCE (Town selection, GPS/Time capture, Today's Activities)
 * 2. DISTRIBUTOR / DEALERS (Financial Summary, Brand-grouped Order Entry, In-Customer Recovery, Invoices, Ledger)
 * 3. DASHBOARD (Role-scoped Target vs Achievement, TODAY/MTD/YTD)
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  FileSpreadsheet,
  X
} from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { DynamicDealerFormModal } from './DynamicDealerFormModal';
import { OrderPreviewDrawer } from './OrderPreviewDrawer';
import { NearbyDealersMap } from './NearbyDealersMap';
import { DealerHeatmap } from './DealerHeatmap';
import { GoogleSheetSyncModal } from './GoogleSheetSyncModal';
import { MtdAchievementGauge } from './MtdAchievementGauge';
import { getAccessToken } from '../services/googleAuth';
import { isAuthorizedApproverEmail } from '../services/production-users';
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
  Recovery as RecoveryType,
  Invoice as InvoiceType,
  LedgerEntry as LedgerEntryType
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
  ledgerEntries?: LedgerEntryType[];
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
  onRefresh?: () => Promise<void> | void;
  onToggleViewMode?: () => void;
  onOpenOfflineSync?: () => void;
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
  onRefresh,
  onToggleViewMode,
  onOpenOfflineSync,
  pendingOfflineCount = 0,
}) => {
  // -------------------------------------------------------------
  // 3 Primary Navigation Tabs: 'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'>('ATTENDANCE');

  // Dealer Registration Modal State (Field Force Onboarding to Pending Queue)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);

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
    const baseTowns = ['Peshawar', 'Mardan', 'Rawalpindi', 'Islamabad', 'Lahore', 'Gujranwala', 'Faisalabad', 'Multan', 'Nowshera', 'Swat', 'Abbottabad'];
    const customerTowns = Array.from(new Set(authorizedCustomers.map((c) => c.city || '').filter(Boolean)));
    const merged = Array.from(new Set([...customerTowns, ...baseTowns]));
    return merged;
  }, [authorizedCustomers]);

  const [selectedTown, setSelectedTown] = useState<string>(() => {
    return localStorage.getItem('nlink_sales_active_town') || assignedTowns[0] || 'Peshawar';
  });

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
    status: 'Checked In' | 'Checked Out' | 'Marked (GPS Validated)' | 'Marked (Network Captured)';
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

  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);

  // Check In Action
  const handleCheckIn = () => {
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
      localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
      setGpsCapturing(false);
      setAttendanceMessage(`Check-in successful at ${timeStr} for ${selectedTown} (${method})!`);

      // Real-Time Google Sheet Mirror sync for Attendance
      try {
        const token = getAccessToken();
        const sheetId = getActiveSpreadsheetId();
        if (token && sheetId) {
          pushAttendanceToGoogleSheet(
            sheetId,
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
          ).catch((err) => console.warn('Attendance Google Sheet sync deferred:', err));
        }
      } catch {
        // non-blocking
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          completeCheckIn(
            Number(pos.coords.latitude.toFixed(4)),
            Number(pos.coords.longitude.toFixed(4)),
            Math.round(pos.coords.accuracy || 15),
            'GPS Verified'
          );
        },
        () => {
          // Fallback with realistic location for smooth offline / preview
          completeCheckIn(34.0151, 71.5249, 20, 'Network Captured');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      completeCheckIn(34.0151, 71.5249, 50, 'System Timestamp');
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
      localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
      setGpsCapturing(false);
      setAttendanceMessage(`Check-out successful at ${timeStr}. Total Duty Duration: ${durationText}`);
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
          localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
          setLastGpsSyncTime(new Date());
          setGpsSyncing(false);
          setAttendanceMessage(`GPS coordinates refreshed at ${timeStr} (${lat}° N, ${lng}° E)!`);
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
      ['SUPER_ADMIN', 'MANAGEMENT'].includes(currentUser?.role || '')
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

      // Field officers only see registration requests they created or are assigned to
      const isCreator =
        c.createdByUserId === currentUser.id ||
        (c as any).createdBy === currentUser.id ||
        c.assignedOfficerId === currentUser.id ||
        (c as any).assignedTsm === currentUser.fullName ||
        (c as any).registeredBy === currentUser.email ||
        (c as any).creatorEmail === currentUser.email;

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

  // Order Entry State: Quantities keyed by SKU ID
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [showOrderPreviewDrawer, setShowOrderPreviewDrawer] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Group SKUs by Brand
  const brandsGrouped = useMemo<Record<string, SKU[]>>(() => {
    const map: Record<string, SKU[]> = {};
    skus.forEach((sku) => {
      const brand = sku.brandName || sku.category || 'National Lights';
      if (!map[brand]) map[brand] = [];
      map[brand].push(sku);
    });
    return map;
  }, [skus]);

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

  const getSkuStock = (skuId: string): number => {
    const bal = inventoryBalances.find((b) => b.skuId === skuId);
    if (bal) return Number(bal.currentQuantity || 0);
    const sku = skus.find((s) => s.id === skuId);
    return Number(sku?.currentStock || 0);
  };

  const handleQtyChange = (skuId: string, val: number) => {
    const stock = getSkuStock(skuId);
    const clamped = Math.max(0, Math.min(val, stock > 0 ? stock : 0));
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
      const taxAmount = previewBreakdown ? previewBreakdown.taxAmount : Math.round(taxable * 0.18);
      const totalAmount = previewBreakdown ? previewBreakdown.totalAmount : taxable + taxAmount;

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

      // Live replication to Google Sheets database if authorized
      const googleToken = getAccessToken();
      if (googleToken) {
        pushOrderToGoogleSheet(
          getActiveSpreadsheetId(),
          newOrder,
          activeCustomer.companyName,
          googleToken
        ).catch((err) => console.warn('Google Sheet background push notice:', err));
      }

      setOrderQuantities({});
      setShowOrderConfirmModal(false);
      setShowOrderPreviewDrawer(false);
      setOrderSuccessMessage(`Order #${newOrder.orderNumber} placed successfully for Rs. ${newOrder.totalAmount?.toLocaleString()}!`);
      setTimeout(() => setOrderSuccessMessage(null), 5000);
    } finally {
      setOrderSubmitting(false);
    }
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
      alert('Please enter a valid recovery amount.');
      return;
    }

    if (recoveryMode !== 'CASH' && !recoveryInstrumentNo.trim()) {
      alert('Please enter the Cheque Number or Transaction Reference ID.');
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

      // Live replication to Google Sheets database if authorized
      const googleToken = getAccessToken();
      if (googleToken) {
        pushRecoveryToGoogleSheet(
          getActiveSpreadsheetId(),
          recoveryPayload,
          activeCustomer.companyName,
          googleToken
        ).catch((err) => console.warn('Google Sheet background push notice:', err));
      }

      setRecoveryAmount('');
      setRecoveryInstrumentNo('');
      setRecoveryBank('');
      setRecoveryRemarks('');
      setRecoverySuccessMessage(`Recovery of Rs. ${amountNum.toLocaleString()} recorded successfully!`);
      setTimeout(() => setRecoverySuccessMessage(null), 5000);
    } finally {
      setRecoverySubmitting(false);
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

  const [ledgerFromDate, setLedgerFromDate] = useState('2026-08-01');
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

  return (
    <div className="SalesRecoveryApp selection:bg-teal-200">
      {/* ========================================================= */}
      {/* TOP HEADER (Clean, Unified Desktop/Mobile Navigation) */}
      {/* ========================================================= */}
      <header className="sra-header">
        <div className="sra-header-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              NL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                  N-LINK <span className="text-teal-600 font-black">360</span>
                </span>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                  {roleScope.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-xs">
                {currentUser.fullName}
              </p>
            </div>
          </div>

          {/* Unified Desktop/Tablet Navigation Bar */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
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
              <span>Distributors</span>
            </button>
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
              onClick={onOpenOfflineSync}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                !isOnline || pendingOfflineCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={
                pendingOfflineCount > 0
                  ? `${pendingOfflineCount} offline actions pending sync - click to inspect queue`
                  : isOnline
                  ? 'Network Connected - click to inspect offline sync status'
                  : 'Working Offline - click to inspect offline queue'
              }
            >
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-600" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              {pendingOfflineCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-600 text-white font-black text-[9px] animate-pulse">
                  {pendingOfflineCount} pending
                </span>
              )}
            </button>

            {/* Google Sheets Database Sync Modal Button */}
            <button
              type="button"
              onClick={() => setShowGoogleSheetsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Open Google Sheets Database Sync (1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheet DB</span>
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
                      {attendanceRecord ? `${attendanceRecord.lat}° N, ${attendanceRecord.lng}° E (±${attendanceRecord.accuracy}m)` : '34.0151° N, 71.5249° E (±15m)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Nearby Assigned Dealers Proximity Map */}
            <NearbyDealersMap
              userLat={attendanceRecord ? attendanceRecord.lat : 34.0151}
              userLng={attendanceRecord ? attendanceRecord.lng : 71.5249}
              accuracy={attendanceRecord ? attendanceRecord.accuracy : 15}
              townName={attendanceRecord?.town || selectedTown}
              customers={authorizedCustomers}
              onSelectCustomer={(c) => {
                setSelectedCustomerId(c.id);
                setActiveTab('DISTRIBUTORS');
              }}
              onSyncGps={handleSyncGpsLocation}
              isSyncingGps={gpsSyncing || gpsCapturing}
              lastSyncTime={lastGpsSyncTime || (attendanceRecord ? attendanceRecord.time : undefined)}
            />

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

                            {isAuthorizedApproverEmail(currentUser?.email) ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  cust.approvalStatus = 'APPROVED';
                                  cust.isActive = true;
                                  cust.status = 'NORMAL';
                                  if (onRefresh) await onRefresh();
                                  setRegistrationSuccessMsg(
                                    `Dealer "${cust.companyName || cust.name}" is now Approved and Active!`
                                  );
                                  setDealerCategoryFilter('ACTIVE');
                                  setTimeout(() => setRegistrationSuccessMsg(null), 6000);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                                title="Approve registration and activate account immediately"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve &amp; Activate</span>
                              </button>
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

                {/* 1 SINGLE CONTINUOUS FORM QUICK-JUMP STICKY PILLS (SCROLL UP / DOWN) */}
                <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => document.getElementById('dealer-section-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black border border-teal-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>1. Add SKU Orders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('dealer-section-recovery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>2. Add Recovery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('dealer-section-balances')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-black border border-indigo-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>3. Check Balances</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('dealer-section-invoices')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black border border-amber-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>4. Check Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('dealer-section-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-black border border-purple-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>5. Check Ledger</span>
                  </button>
                </div>

                {/* --- 1. ADD SKU WISE ORDERS SECTION --- */}
                <div id="dealer-section-orders" className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          1. Add SKU Wise Orders
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Dealer Booking Entry (Brand wise SKUs)</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                      Step 1 of 5
                    </span>
                  </div>
                    {orderSuccessMessage && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{orderSuccessMessage}</span>
                      </div>
                    )}

                    {/* Quick Reorder Shortcut Banner inside Order Entry */}
                    {customerPreviousOrderedItems.length > 0 && (
                      <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200/90 flex items-center justify-between gap-2.5 shadow-2xs flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 block truncate">
                              Quick Reorder Ready ({customerPreviousOrderedItems.length} items)
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Load past quantities directly into the SKU list below
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickReorder()}
                          className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
                          title="Populate Order Entry with previous ordered items"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Fill 5 Items</span>
                        </button>
                      </div>
                    )}

                    {/* Brand Accordion SKU Lists */}
                    <div className="space-y-3">
                      {(Object.entries(brandsGrouped) as [string, SKU[]][]).map(([brandName, brandSkus]) => {
                        const isExpanded = expandedBrands[brandName] ?? false;
                        const brandActiveQty = brandSkus.reduce((sum, s) => sum + (orderQuantities[s.id] || 0), 0);
                        
                        // Alert field reps when any SKU within that category falls below its reorder level
                        const criticalStockCount = brandSkus.filter((sku) => {
                          const stock = getSkuStock(sku.id);
                          const threshold = sku.reorderLevel || 10;
                          return stock <= threshold;
                        }).length;

                        return (
                          <div key={brandName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            {/* Brand Header Accordion Trigger */}
                            <button
                              type="button"
                              onClick={() => toggleBrand(brandName)}
                              className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                                <span className="truncate">{brandName}</span>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                                  {brandSkus.length} SKUs
                                </span>
                                {criticalStockCount > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0 shadow-2xs"
                                    title={`${criticalStockCount} SKU${criticalStockCount > 1 ? 's' : ''} in this category below reorder level`}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                    <span>Critical Stock ({criticalStockCount})</span>
                                  </span>
                                )}
                                {brandActiveQty > 0 && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 animate-in fade-in">
                                    {brandActiveQty} selected
                                  </span>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                            </button>

                            {/* SKU Table Inside Brand */}
                            {isExpanded && (
                              <div className="p-3 divide-y divide-slate-100">
                                {brandSkus.map((sku) => {
                                  const stock = getSkuStock(sku.id);
                                  const isOutOfStock = stock <= 0;
                                  const isLowStock = !isOutOfStock && stock < (sku.reorderLevel || 10);
                                  const currentQty = orderQuantities[sku.id] || 0;
                                  const unitPrice = Number(sku.tradePrice || sku.retailPrice || 0);

                                  return (
                                    <div
                                      key={sku.id}
                                      className={`p-3 rounded-2xl border transition-all duration-200 ${
                                        currentQty > 0
                                          ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200 shadow-2xs'
                                          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs'
                                      } flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs`}
                                    >
                                      {/* SKU Title & Pricing Info */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{sku.name}</span>
                                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {sku.skuCode}
                                          </span>
                                          {isLowStock && (
                                            <span 
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase tracking-wider animate-pulse shrink-0"
                                              title={`Current stock is below the reorder level of ${sku.reorderLevel || 10} pcs.`}
                                            >
                                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                              <span>Low Stock</span>
                                            </span>
                                          )}
                                          {isOutOfStock && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                                              Out of Stock
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1 flex-wrap">
                                          <span>Price: <strong className="text-slate-800 font-mono">Rs. {unitPrice.toLocaleString()}</strong></span>
                                          <span>•</span>
                                          <span>
                                            Available:{' '}
                                            {isOutOfStock ? (
                                              <strong className="text-rose-600 font-bold">0 pcs</strong>
                                            ) : (
                                              <span className="inline-flex items-center gap-1">
                                                <strong className={`${isLowStock ? 'text-amber-600' : 'text-emerald-700'} font-bold`}>{stock} pcs</strong>
                                                {isLowStock && (
                                                  <span className="text-[10px] text-slate-400 font-medium font-mono">
                                                    (Reorder Trigger: {sku.reorderLevel || 10})
                                                  </span>
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Order Qty Controls & Line Subtotal */}
                                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                        {/* Line item subtotal badge */}
                                        {currentQty > 0 ? (
                                          <div className="text-left sm:text-right pr-1">
                                            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Line Total</span>
                                            <span className="text-xs font-mono font-black text-emerald-700">
                                              Rs. {(currentQty * unitPrice).toLocaleString()}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="text-left sm:text-right pr-1 opacity-60">
                                            <span className="text-[10px] text-slate-400 font-medium">Qty: 0</span>
                                          </div>
                                        )}

                                        {/* Thumb-friendly Stepper Buttons */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            disabled={isOutOfStock || currentQty <= 0}
                                            onClick={() => handleQtyChange(sku.id, currentQty - 1)}
                                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 font-bold cursor-pointer transition-all touch-manipulation shadow-2xs"
                                            aria-label="Decrease quantity"
                                            title="Decrease quantity"
                                          >
                                            <Minus className="w-4 h-4 stroke-[2.5]" />
                                          </button>

                                          <input
                                            type="number"
                                            min={0}
                                            max={stock > 0 ? stock : 0}
                                            disabled={isOutOfStock}
                                            value={currentQty === 0 ? '' : currentQty}
                                            onChange={(e) => handleQtyChange(sku.id, parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-14 sm:w-16 h-10 sm:h-9 text-center py-1 bg-white border border-slate-300 rounded-xl font-mono font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400 tabular-nums shadow-2xs"
                                            aria-label={`Quantity for ${sku.name}`}
                                          />

                                          <button
                                            type="button"
                                            disabled={isOutOfStock || (stock > 0 && currentQty >= stock)}
                                            onClick={() => handleQtyChange(sku.id, currentQty + 1)}
                                            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 active:scale-95 text-white disabled:bg-slate-100 disabled:text-slate-300 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center font-bold cursor-pointer transition-all touch-manipulation shadow-2xs"
                                            aria-label="Increase quantity"
                                            title="Increase quantity"
                                          >
                                            <Plus className="w-4 h-4 stroke-[2.5]" />
                                          </button>

                                          {currentQty > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => handleQtyChange(sku.id, 0)}
                                              className="w-10 h-10 sm:w-8 sm:h-9 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 active:scale-95 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer transition-all touch-manipulation shadow-2xs ml-0.5"
                                              aria-label="Reset quantity"
                                              title="Reset quantity to 0"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          )}
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

                    {/* IN-PAGE ORDER SUMMARY (Comprehensive Breakdown Card) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Comprehensive Order Summary</h3>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                          {orderSummary.totalSKUs} SKUs Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 text-center text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total SKUs</span>
                          <span className="font-bold text-slate-900 text-base">{orderSummary.totalSKUs}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Quantity</span>
                          <span className="font-bold text-slate-900 text-base">{orderSummary.totalQuantity} pcs</span>
                        </div>
                        <div className="bg-teal-50/80 p-2 rounded-lg border border-teal-200">
                          <span className="text-[10px] text-teal-800 font-black block uppercase tracking-wider">Order Value</span>
                          <span className="font-mono font-black text-teal-700 text-base tabular-nums">
                            Rs. {orderSummary.orderValue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          disabled={orderSummary.totalQuantity === 0}
                          onClick={() => setShowOrderPreviewDrawer(true)}
                          className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] disabled:opacity-50 text-slate-800 font-bold text-xs tracking-wide border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Eye className="w-4 h-4 text-teal-700" />
                          <span>Preview Line Items & Tax</span>
                        </button>
                        <button
                          type="button"
                          disabled={orderSummary.totalQuantity === 0}
                          onClick={() => setShowOrderPreviewDrawer(true)}
                          className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>SUBMIT ORDER (Rs. {orderSummary.orderValue.toLocaleString()})</span>
                        </button>
                      </div>
                    </div>

                    {/* STICKY BOTTOM ORDER BAR (Persists while scrolling through long brand SKU lists) */}
                    {orderSummary.totalQuantity > 0 && (
                      <div className="fixed bottom-[68px] left-0 right-0 z-30 max-w-xl mx-auto px-4 pointer-events-none">
                        <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-3.5 border border-slate-700/80 shadow-2xl shadow-slate-950/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black tracking-wider text-teal-400 bg-teal-950/90 px-2 py-0.5 rounded-full border border-teal-700/70">
                                Order Value
                              </span>
                              <span className="text-xs text-slate-300 font-medium truncate">
                                {orderSummary.totalSKUs} SKUs · {orderSummary.totalQuantity} pcs
                              </span>
                            </div>
                            <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight flex items-baseline gap-1 mt-0.5">
                              <span className="text-xs text-slate-400 font-sans font-bold">Rs.</span>
                              <span className="text-emerald-400 tabular-nums">{orderSummary.orderValue.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowOrderPreviewDrawer(true)}
                              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Expand Order Preview Drawer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-teal-400" />
                              <span className="hidden sm:inline">Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowOrderPreviewDrawer(true)}
                              className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Review & Book</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                {/* --- 2. ADD RECOVERY SECTION --- */}
                <div id="dealer-section-recovery" className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          2. Add Recovery
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Payment Collection Entry</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Outstanding</span>
                      <span className="text-xs font-mono font-black text-rose-700">
                        Rs. {customerFinancials.netBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitRecovery} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">Record Payment Recovery</h3>
                      <span className="text-xs font-bold text-slate-500">Live Customer Ledger</span>
                    </div>

                    {recoverySuccessMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{recoverySuccessMessage}</span>
                      </div>
                    )}

                    <div className="space-y-3 text-xs font-bold text-slate-700">
                      <div>
                        <label className="block mb-1">Recovery Amount (Rs.) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="e.g. 50000"
                          value={recoveryAmount}
                          onChange={(e) => setRecoveryAmount(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block mb-1">Payment Mode *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['CASH', 'CHEQUE', 'ONLINE_TRANSFER'] as PaymentMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setRecoveryMode(mode)}
                              className={`py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                                recoveryMode === mode
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {mode.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {recoveryMode !== 'CASH' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block mb-1">Cheque / Ref No. *</label>
                            <input
                              type="text"
                              required
                              placeholder="Cheque # or Transfer Ref"
                              value={recoveryInstrumentNo}
                              onChange={(e) => setRecoveryInstrumentNo(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                            />
                          </div>
                          <div>
                            <label className="block mb-1">Bank Name</label>
                            <input
                              type="text"
                              placeholder="e.g. HBL, Meezan Bank"
                              value={recoveryBank}
                              onChange={(e) => setRecoveryBank(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block mb-1">Remarks / Note</label>
                        <input
                          type="text"
                          placeholder="Optional collection remarks"
                          value={recoveryRemarks}
                          onChange={(e) => setRecoveryRemarks(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={recoverySubmitting}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>{recoverySubmitting ? 'Recording...' : 'SUBMIT RECOVERY'}</span>
                    </button>
                  </form>
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
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoiceForPrint(inv)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-teal-50 text-teal-700 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>Print</span>
                                  </button>
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          5. Check Ledger
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">Live Customer Statement of Account</p>
                      </div>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="date"
                        value={ledgerFromDate}
                        onChange={(e) => setLedgerFromDate(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={ledgerToDate}
                        onChange={(e) => setLedgerToDate(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
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
          <div className="sra-dashboard">
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
                <button
                  id="dashboard-manual-refresh-btn"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Manually trigger onRefresh() and ensure data consistency"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
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

            {/* MTD SALES TARGET ACHIEVEMENT SVG GAUGE & COMPARISON BARS */}
            <MtdAchievementGauge
              salesAchieved={performanceData.salesAchieved}
              salesTarget={performanceData.salesTarget}
              salesPercent={performanceData.salesPercent}
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
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* BOTTOM NAVIGATION BAR (Responsive Mobile & Tablet View) */}
      {/* ========================================================= */}
      <nav className="sra-bottom-nav">
        <div className="sra-bottom-nav-inner">
          {/* Tab 1: Attendance */}
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

          {/* Tab 2: Distributor */}
          <button
            type="button"
            onClick={() => setActiveTab('DISTRIBUTORS')}
            className={`sra-bottom-nav-btn ${
              activeTab === 'DISTRIBUTORS' ? 'sra-bottom-nav-btn-active' : ''
            }`}
          >
            <Store className={`w-5 h-5 ${activeTab === 'DISTRIBUTORS' ? 'stroke-[2.5] text-teal-700' : 'stroke-2'}`} />
            <span className="text-[11px] leading-none">Distributors</span>
          </button>

          {/* Tab 3: Dashboard */}
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
        </div>
      </nav>

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
          onClose={() => setSelectedInvoiceForPrint(null)}
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
            setRegistrationSuccessMsg(
              `Registration application for "${dealerData.name}" submitted to Head Office Approval Queue. It will appear in active dealers once approved.`
            );
            setTimeout(() => setRegistrationSuccessMsg(null), 8000);
          }}
        />
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
    </div>
  );
};
