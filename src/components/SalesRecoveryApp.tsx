/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales & Recovery Mobile Application (Field Force App)
 * Responsive Universal Theme Design with Premium Neumorphic Styling & Live Supabase Synchronization
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  TrendingUp,
  MapPin,
  Users,
  Clock,
  Coins,
  FilePlus,
  FileText,
  Search,
  Check,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Wifi,
  WifiOff,
  RotateCw,
  LogOut,
  Send,
  Printer,
  ChevronDown,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { AttendanceGeofenceMap } from './AttendanceGeofenceMap';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import {
  Customer,
  PaymentMode,
  SalesOrder,
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
}

// -------------------------------------------------------------
// Central coords for standard Pakistan towns for Geofencing calculations
// -------------------------------------------------------------
const TOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Lahore': { lat: 31.5204, lng: 74.3587 },
  'Gujranwala': { lat: 32.1617, lng: 74.1883 },
  'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Karachi South': { lat: 24.8607, lng: 67.0011 },
  'Peshawar': { lat: 34.0151, lng: 71.5249 },
  'Multan': { lat: 30.1575, lng: 71.5249 },
  'Faisalabad': { lat: 31.4504, lng: 73.1350 },
  'Islamabad': { lat: 33.6844, lng: 73.0479 },
  'Rawalpindi': { lat: 33.5984, lng: 73.0441 },
  'Sialkot': { lat: 32.4972, lng: 74.5361 },
  'Quetta': { lat: 30.1798, lng: 66.9750 }
};

const getTownCoordinates = (townName: string) => {
  const normalized = townName.trim();
  const matched = Object.keys(TOWN_COORDINATES).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );
  if (matched) return TOWN_COORDINATES[matched];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 31.0 + (Math.abs(hash % 100) / 50);
  const lng = 72.0 + (Math.abs((hash >> 8) % 100) / 30);
  return { lat, lng };
};

const getDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const SalesRecoveryApp = ({
  currentUser,
  customers = [],
  skus = [],
  inventoryBalances = [],
  salesOrders = [],
  recoveries = [],
  invoices = [],
  ledgerEntries = [],
  onLogout,
  onBookOrder,
  onRecordRecovery,
  onLogVisit,
  onRefresh,
}: SalesRecoveryAppProps) => {
  // Mobile Navigation: 'DASHBOARD' | 'ATTENDANCE' | 'CUSTOMERS'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ATTENDANCE' | 'CUSTOMERS'>('DASHBOARD');

  // Dealer directory states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSubTab, setCustomerSubTab] = useState<'DETAILS' | 'ORDER_FORM' | 'INVOICES_LIST' | 'LEDGER_SHEET'>('DETAILS');

  // Extract towns
  const assignedTowns = Array.from(new Set(customers.map(c => c.city || 'Lahore'))).filter(Boolean);
  const defaultTown = assignedTowns[0] || 'Lahore';

  // Attendance states (This is the Single Source of Truth for selected town)
  const [attendanceTown, setAttendanceTown] = useState<string>(() => {
    return localStorage.getItem('nlink_active_town') || defaultTown;
  });

  const [checkInTime, setCheckInTime] = useState<string | null>(localStorage.getItem('nlink_checkin_time'));
  const [checkOutTime, setCheckOutTime] = useState<string | null>(localStorage.getItem('nlink_checkout_time'));
  const [checkInLoc, setCheckInLoc] = useState<string | null>(localStorage.getItem('nlink_checkin_loc'));
  const [checkOutLoc, setCheckOutLoc] = useState<string | null>(localStorage.getItem('nlink_checkout_loc'));

  // Save selected town in local storage
  useEffect(() => {
    localStorage.setItem('nlink_active_town', attendanceTown);
  }, [attendanceTown]);

  // GPS checking states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [bypassGeofence, setBypassGeofence] = useState<boolean>(false);

  // Online Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineLogs, setOfflineLogs] = useState<any[]>(() => {
    const cached = localStorage.getItem('nlink_offline_attendance');
    return cached ? JSON.parse(cached) : [];
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [activePrintInvoice, setActivePrintInvoice] = useState<InvoiceType | null>(null);

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

  // Automatic background synchronization when transition back online occurs
  useEffect(() => {
    if (isOnline && offlineLogs.length > 0) {
      syncOfflineLogs(true);
    }
  }, [isOnline]);

  // Fetch coordinates on town change
  useEffect(() => {
    acquireLocation();
  }, [attendanceTown]);

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation sensor unavailable:', err.message);
        setGpsError('Sensor offline. Fallback simulation active.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const townCenter = getTownCoordinates(attendanceTown);
  const userLat = userCoords?.lat ?? 31.5204;
  const userLng = userCoords?.lng ?? 74.3587;
  const distanceToCenter = getDistanceKM(userLat, userLng, townCenter.lat, townCenter.lng);
  const maxRadiusKM = 15;
  const isWithinGeofence = distanceToCenter <= maxRadiusKM || bypassGeofence;

  // Session logs list
  const [sessionLogs, setSessionLogs] = useState<any[]>([
    { date: '2026-08-28', town: 'Gujranwala', checkIn: '09:15 AM', checkOut: '05:30 PM', status: 'SYNCHRONIZED', coords: '32.1617° N, 74.1883° E' },
    { date: '2026-08-27', town: 'Lahore', checkIn: '09:02 AM', checkOut: '06:05 PM', status: 'SYNCHRONIZED', coords: '31.5204° N, 74.3587° E' },
  ]);

  // Today's transaction/orders data aggregation
  const customerMap = new Map(customers.map(c => [c.id, c.city || 'Lahore']));
  const aggregatedActivitiesMap: Record<string, Record<string, { sales: number; recovery: number }>> = {};

  (salesOrders || []).forEach(order => {
    const dateStr = (order.orderDate || '').split('T')[0];
    if (!dateStr) return;
    const town = customerMap.get(order.customerId) || 'Lahore';
    if (!aggregatedActivitiesMap[dateStr]) aggregatedActivitiesMap[dateStr] = {};
    if (!aggregatedActivitiesMap[dateStr][town]) aggregatedActivitiesMap[dateStr][town] = { sales: 0, recovery: 0 };
    aggregatedActivitiesMap[dateStr][town].sales += Number(order.totalAmount || 0);
  });

  (recoveries || []).forEach(rec => {
    const dateStr = (rec.collectionDate || '').split('T')[0];
    if (!dateStr) return;
    const town = customerMap.get(rec.customerId) || 'Lahore';
    if (!aggregatedActivitiesMap[dateStr]) aggregatedActivitiesMap[dateStr] = {};
    if (!aggregatedActivitiesMap[dateStr][town]) aggregatedActivitiesMap[dateStr][town] = { sales: 0, recovery: 0 };
    aggregatedActivitiesMap[dateStr][town].recovery += Number(rec.amount || 0);
  });

  const dailyActivities: any[] = [];
  Object.entries(aggregatedActivitiesMap).forEach(([date, townsObj]) => {
    Object.entries(townsObj).forEach(([town, data]) => {
      dailyActivities.push({ date, town, sales: data.sales, recovery: data.recovery });
    });
  });
  dailyActivities.sort((a, b) => b.date.localeCompare(a.date) || a.town.localeCompare(b.town));

  const todayDateStr = new Date().toISOString().split('T')[0];
  if (dailyActivities.length === 0) {
    dailyActivities.push({ date: todayDateStr, town: defaultTown, sales: 0, recovery: 0 });
  }

  // Monthly Achievement KPIs (Speedometers or clean visual bars)
  const SALES_TARGET = 4500000; // PKR 4.5M Target
  const RECOVERY_TARGET = 3500000; // PKR 3.5M Target

  const totalAchievedSales = (salesOrders || []).reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const totalAchievedRecovery = (recoveries || []).reduce((sum, rec) => sum + Number(rec.amount || 0), 0);

  const salesAchievementPercent = Math.min(Math.round((totalAchievedSales / SALES_TARGET) * 100), 100);
  const recoveryAchievementPercent = Math.min(Math.round((totalAchievedRecovery / RECOVERY_TARGET) * 100), 100);

  // Filter dealers EXACTLY by town selection in attendance
  const filteredCustomers = customers.filter(
    c => (c.city || 'Lahore').toLowerCase() === attendanceTown.toLowerCase()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const searchedCustomers = filteredCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.companyName.toLowerCase().includes(q) || c.customerCode.toLowerCase().includes(q);
  });

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // -------------------------------------------------------------
  // Dynamic Ledger, Invoices & Balance Equations for active customer
  // -------------------------------------------------------------
  // 1. Opening Balance
  const clientOpeningBalance = activeCustomer?.openingBalance || 0;

  // 2. Invoicing Amount (booked orders or matching invoices)
  const clientInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId);
  const clientInvoicingAmount = clientInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  // 3. Recovery Amount
  const clientRecoveriesList = recoveries.filter(rec => rec.customerId === selectedCustomerId);
  const clientRecoveryAmount = clientRecoveriesList.reduce((sum, rec) => sum + Number(rec.amount || 0), 0);

  // 4. Net Balance
  const clientNetBalance = clientOpeningBalance + clientInvoicingAmount - clientRecoveryAmount;

  // Visit remarks
  const [visitRemarks, setVisitRemarks] = useState('');

  // Recovery Form states
  const [todayRecoveryAmount, setTodayRecoveryAmount] = useState<string>('');
  const [todayRecoveryMode, setTodayRecoveryMode] = useState<PaymentMode>('CASH');
  const [instrumentNo, setInstrumentNo] = useState('');
  const [bankName, setBankName] = useState('');

  // -------------------------------------------------------------
  // Group products by Brand
  // -------------------------------------------------------------
  const brandsGrouped: Record<string, SKU[]> = {};
  skus.forEach(sku => {
    const bName = sku.brandName || 'Brand 1';
    if (!brandsGrouped[bName]) {
      brandsGrouped[bName] = [];
    }
    brandsGrouped[bName].push(sku);
  });

  // Dynamic order states
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  // Generated Invoice Overlay State after successful submission
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null);

  // Invoices Subtab Date Filters
  const [invoiceFromDate, setInvoiceFromDate] = useState('2026-08-01');
  const [invoiceToDate, setInvoiceToDate] = useState('2026-08-31');
  
  const [liveInvoices, setLiveInvoices] = useState<InvoiceType[]>([]);
  const [liveInvoicesLoading, setLiveInvoicesLoading] = useState(false);
  const [liveInvoicesError, setLiveInvoicesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedCustomerId) {
      setLiveInvoices([]);
      return;
    }

    const fetchLiveInvoices = async () => {
      // Local client filtering fallback
      const clientInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId);
      const filteredLocal = clientInvoices.filter(inv => {
        const date = inv.invoiceDate || '';
        return date >= invoiceFromDate && date <= invoiceToDate;
      });

      if (!isSupabaseConfigured || !supabase || !isOnline) {
        setLiveInvoices(filteredLocal);
        return;
      }

      setLiveInvoicesLoading(true);
      setLiveInvoicesError(null);

      try {
        const { data: dbData, error } = await supabase
          .from('invoices')
          .select('*,customers(customer_code,name),invoice_items(*,skus(sku_code,sku_name))')
          .eq('customer_id', selectedCustomerId)
          .gte('invoice_date', invoiceFromDate)
          .lte('invoice_date', invoiceToDate)
          .order('invoice_date', { ascending: false });

        if (error) throw error;

        if (active) {
          const mapped: InvoiceType[] = (dbData || []).map((r: any) => ({
            id: r.id,
            invoiceNumber: r.invoice_code,
            orderId: r.order_id || undefined,
            customerId: r.customer_id,
            customerName: r.customers?.name || '',
            customerCode: r.customers?.customer_code || '',
            invoiceDate: r.invoice_date,
            dueDate: r.invoice_date,
            status: r.status,
            items: (r.invoice_items || []).map((i: any) => ({
              id: i.id,
              invoiceId: r.id,
              skuId: i.sku_id,
              skuCode: i.skus?.sku_code || '',
              skuName: i.skus?.sku_name || '',
              quantity: Number(i.qty || 0),
              unitPrice: Number(i.unit_price || 0),
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: Number(i.line_amount || 0),
            })),
            subtotal: Number(r.invoice_amount || 0),
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: Number(r.invoice_amount || 0),
            previousBalance: Number(r.previous_balance || 0),
            newBalance: Number(r.new_balance || 0),
            paymentStatus: r.status === 'POSTED' ? 'UNPAID' : r.status,
            createdBy: r.posted_by || undefined,
            createdAt: r.created_at,
          }));

          setLiveInvoices(mapped);
        }
      } catch (err: any) {
        console.error('Error fetching live invoices:', err);
        if (active) {
          setLiveInvoicesError(err.message || 'Error querying Supabase invoices.');
          setLiveInvoices(filteredLocal);
        }
      } finally {
        if (active) {
          setLiveInvoicesLoading(false);
        }
      }
    };

    void fetchLiveInvoices();

    return () => {
      active = false;
    };
  }, [selectedCustomerId, invoiceFromDate, invoiceToDate, isOnline, invoices]);

  // Maintain filteredInvoices name for backward compatibility with JSX
  const filteredInvoices = liveInvoices;

  // Ledger Subtab Date Filters
  const [ledgerFromDate, setLedgerFromDate] = useState('2026-08-01');
  const [ledgerToDate, setLedgerToDate] = useState('2026-08-31');
  const clientLedgerEntries = ledgerEntries.filter(entry => {
    const matchesClient = entry.customerId === selectedCustomerId;
    const date = entry.entryDate || '';
    return matchesClient && date >= ledgerFromDate && date <= ledgerToDate;
  });

  // Attendance Action Handlers
  const handleCheckIn = () => {
    if (!isWithinGeofence) {
      alert(`Access Blocked! Geofence Violation: You are located ${distanceToCenter.toFixed(1)} km away from the center of ${attendanceTown}. Checking in is permitted only within a ${maxRadiusKM} km perimeter.`);
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const coordStr = `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E`;

    setCheckInTime(timeStr);
    setCheckInLoc(coordStr);
    setCheckOutTime(null);
    setCheckOutLoc(null);

    localStorage.setItem('nlink_checkin_time', timeStr);
    localStorage.setItem('nlink_checkin_loc', coordStr);
    localStorage.removeItem('nlink_checkout_time');
    localStorage.removeItem('nlink_checkout_loc');

    const newLog = {
      action: 'CHECK_IN',
      town: attendanceTown,
      time: timeStr,
      coords: coordStr,
      date: todayDateStr,
      synced: isOnline
    };

    if (isOnline) {
      onLogVisit({
        customerId: 'attendance-check-in',
        purpose: 'Market Check-In Geofence Passed',
        notes: `Checked in at Town: ${attendanceTown} | Distance: ${distanceToCenter.toFixed(2)} km`,
        latitude: userLat,
        longitude: userLng,
        status: 'CHECKED_IN'
      });
    } else {
      const updatedQueue = [...offlineLogs, newLog];
      setOfflineLogs(updatedQueue);
      localStorage.setItem('nlink_offline_attendance', JSON.stringify(updatedQueue));
    }

    alert(`Successfully Checked In at ${attendanceTown}! Logged coordinates: ${coordStr}`);
  };

  const handleCheckOut = () => {
    if (!checkInTime) {
      alert('Action Denied: You must check-in to active beat first.');
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const coordStr = `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E`;

    setCheckOutTime(timeStr);
    setCheckOutLoc(coordStr);

    localStorage.setItem('nlink_checkout_time', timeStr);
    localStorage.setItem('nlink_checkout_loc', coordStr);

    const newLog = {
      action: 'CHECK_OUT',
      town: attendanceTown,
      time: timeStr,
      coords: coordStr,
      date: todayDateStr,
      synced: isOnline
    };

    if (isOnline) {
      onLogVisit({
        customerId: 'attendance-check-out',
        purpose: 'Market Check-Out Geofence Passed',
        notes: `Checked out from Town: ${attendanceTown}`,
        latitude: userLat,
        longitude: userLng,
        status: 'CHECKED_OUT'
      });
    } else {
      const updatedQueue = [...offlineLogs, newLog];
      setOfflineLogs(updatedQueue);
      localStorage.setItem('nlink_offline_attendance', JSON.stringify(updatedQueue));
    }

    const newSession = {
      date: todayDateStr,
      town: attendanceTown,
      checkIn: checkInTime,
      checkOut: timeStr,
      status: isOnline ? 'SYNCHRONIZED' : 'OFFLINE_CACHED',
      coords: coordStr
    };
    setSessionLogs(prev => [newSession, ...prev]);
    alert(`Successfully Checked Out from ${attendanceTown}! Shift session recorded.`);
  };

  const syncOfflineLogs = (silent = false) => {
    if (!isOnline) {
      if (!silent) alert('Device is offline. Please check connection before syncing.');
      return;
    }
    if (offlineLogs.length === 0) {
      if (!silent) alert('All attendance records synchronized.');
      return;
    }

    offlineLogs.forEach(log => {
      onLogVisit?.({
        customerId: log.action === 'CHECK_IN' ? 'attendance-check-in' : 'attendance-check-out',
        purpose: `Offline-Synced ${log.action}`,
        notes: `Recorded offline at ${log.time} on ${log.date} for Town: ${log.town}`,
        latitude: parseFloat(log.coords.split('°')[0]) || 31.5204,
        longitude: parseFloat(log.coords.split(',')[1]) || 74.3587,
        status: log.action === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT'
      });
    });

    const count = offlineLogs.length;
    setOfflineLogs([]);
    localStorage.removeItem('nlink_offline_attendance');
    setSessionLogs(prev => prev.map(s => ({ ...s, status: 'SYNCHRONIZED' })));
    
    if (silent) {
      setSyncStatusMsg(`Successfully auto-synced ${count} offline location logs!`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } else {
      alert(`Synchronization complete! ${count} offline logs uploaded.`);
    }
  };

  // -------------------------------------------------------------
  // Main Proposal Submit Engine
  // -------------------------------------------------------------
  const handleProposalSubmit = () => {
    if (!activeCustomer) return;

    const items = Object.entries(quantities)
      .filter(([_, q]) => Number(q) > 0)
      .map(([skuId, q]) => {
        const sku = skus.find(s => s.id === skuId);
        const qty = Number(q);
        const price = sku?.tradePrice || 0;
        const total = qty * price;
        return {
          skuId,
          skuCode: sku?.skuCode || '',
          skuName: sku?.name || '',
          orderedQuantity: qty,
          unitPrice: price,
          discountPercent: 0,
          lineTotal: total
        };
      });

    const parsedRecovery = Number(todayRecoveryAmount) || 0;

    if (items.length === 0 && parsedRecovery === 0 && !visitRemarks.trim()) {
      alert('Please fill out either an order quantity, recovery amount, or visit remarks before submitting.');
      return;
    }

    // Book order
    if (items.length > 0) {
      const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
      const taxAmount = subtotal * 0.17;
      const totalAmount = subtotal + taxAmount;

      const orderProposal = {
        customerId: activeCustomer.id,
        customerName: activeCustomer.companyName,
        customerCode: activeCustomer.customerCode,
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        orderDate: todayDateStr,
        status: 'SUBMITTED' as const,
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
        items
      };

      onBookOrder(orderProposal as any);

      // Create a gorgeous preview of the generated commercial invoice
      setGeneratedInvoice({
        id: `INV-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: activeCustomer.companyName,
        customerCode: activeCustomer.customerCode,
        invoiceDate: todayDateStr,
        status: 'PENDING',
        items,
        subtotal,
        taxAmount,
        totalAmount
      });
    }

    // Record recovery
    if (parsedRecovery > 0) {
      onRecordRecovery({
        customerId: activeCustomer.id,
        amount: parsedRecovery,
        paymentMode: todayRecoveryMode,
        instrumentNumber: instrumentNo.trim() || undefined,
        bankName: bankName.trim() || undefined,
        remarks: `Recorded via Field Mobile Workspace. Notes: ${visitRemarks}`
      });
    }

    // Record customer visit remarks
    if (visitRemarks.trim()) {
      onLogVisit({
        customerId: activeCustomer.id,
        purpose: 'Market Visit Log',
        notes: visitRemarks.trim(),
        latitude: userLat,
        longitude: userLng,
        status: 'COMPLETED'
      });
    }

    alert('Operations submitted successfully to Supabase!');
    
    // Clear forms (but keep generatedInvoice modal active to share)
    setQuantities({});
    setTodayRecoveryAmount('');
    setVisitRemarks('');
    setInstrumentNo('');
    setBankName('');
  };

  // -------------------------------------------------------------
  // WhatsApp Share Utilities
  // -------------------------------------------------------------
  const shareInvoiceWhatsApp = (inv: any) => {
    if (!activeCustomer) return;
    let phone = activeCustomer.phone || '';
    if (!phone) {
      const entered = prompt("Customer's contact number is missing. Please enter WhatsApp phone number (e.g. 923001234567):", "923");
      if (!entered) return;
      phone = entered;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const itemsStr = (inv.items || []).map((it: any) => 
      `• *${it.skuName || it.skuCode}*\n  Qty: ${it.orderedQuantity || it.quantity || it.qty} | Price: PKR ${(it.unitPrice || 0).toLocaleString()}\n  Subtotal: PKR ${(it.lineTotal || 0).toLocaleString()}`
    ).join('\n\n');

    const messageText = 
      `*N-LINK 360 - COMMERCIAL INVOICE*\n` +
      `===============================\n` +
      `*Invoice #:* ${inv.invoiceNumber || inv.id}\n` +
      `*Date:* ${inv.invoiceDate}\n` +
      `*Customer:* ${inv.customerName} (${inv.customerCode})\n` +
      `*Status:* ${inv.status || 'PENDING'}\n` +
      `===============================\n\n` +
      `*Items Ordered:*\n` +
      `${itemsStr}\n\n` +
      `===============================\n` +
      `*Gross Amount:* PKR ${(inv.subtotal || 0).toLocaleString()}\n` +
      `*Sales Tax (17%):* PKR ${(inv.taxAmount || 0).toLocaleString()}\n` +
      `*Net Payable:* PKR ${(inv.totalAmount || 0).toLocaleString()}\n` +
      `===============================\n\n` +
      `Thank you for your valuable business!\n` +
      `N-LINK 360 Field Automation`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const shareLedgerWhatsApp = () => {
    if (!activeCustomer) return;
    let phone = activeCustomer.phone || '';
    if (!phone) {
      const entered = prompt("Customer's contact number is missing. Please enter WhatsApp phone number (e.g. 923001234567):", "923");
      if (!entered) return;
      phone = entered;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const entriesStr = clientLedgerEntries.map(entry => {
      const date = entry.entryDate || '';
      const type = entry.transactionType || 'TRANSACTION';
      const drStr = entry.debitAmount ? `Dr: PKR ${entry.debitAmount.toLocaleString()}` : '';
      const crStr = entry.creditAmount ? `Cr: PKR ${entry.creditAmount.toLocaleString()}` : '';
      const amountStr = drStr || crStr;
      return `• [${date}] *${type}*\n  ${amountStr} | Bal: PKR ${entry.runningBalance.toLocaleString()}`;
    }).join('\n\n');

    const messageText = 
      `*N-LINK 360 - LEDGER STATEMENT*\n` +
      `===============================\n` +
      `*Customer:* ${activeCustomer.companyName}\n` +
      `*Customer Code:* ${activeCustomer.customerCode || ''}\n` +
      `*Statement Period:* ${ledgerFromDate} to ${ledgerToDate}\n` +
      `===============================\n\n` +
      `*Transaction Logs:*\n\n` +
      `${entriesStr || 'No ledger records found for specified dates.'}\n\n` +
      `===============================\n` +
      `*Current Net Outstanding:* PKR ${(clientNetBalance).toLocaleString()}\n` +
      `===============================\n\n` +
      `Generated by N-LINK Accounts Department.`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#E8ECF2] text-slate-800 rounded-3xl border border-white p-4 sm:p-5 space-y-5 shadow-2xl font-sans min-h-screen flex flex-col relative">
      
      {/* Top Header Panel */}
      <div className="nm-flat p-4 rounded-2xl flex items-center justify-between border border-white">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md">
            NL
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 tracking-tight">N-LINK 360</h1>
            <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">Field Force Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-800 block leading-tight">{currentUser.fullName}</span>
            <span className="text-[9px] text-slate-500 font-semibold block">{currentUser.role}</span>
          </div>
          {onLogout && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to logout of N-LINK 360 mobile?')) {
                  onLogout();
                }
              }}
              title="Logout"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-700 bg-[#E8ECF2] shadow-md hover:shadow-inner transition-all border border-white/60"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Online / Offline Sync bar */}
      <div className="px-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping inline-block" />
              <Wifi className="w-3.5 h-3.5" /> LIVE CLOUD
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-pulse" />
              <WifiOff className="w-3.5 h-3.5" /> OFFLINE MODE
            </span>
          )}
        </div>
        <span className="text-slate-500">Active Town: <b className="text-slate-800">{attendanceTown}</b></span>
      </div>

      {/* Primary Mobile Navigation Switcher (EXACTLY 3 TABS) */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#DFE4EC] p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab('DASHBOARD'); setSelectedCustomerId(null); }}
          className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
            activeTab === 'DASHBOARD'
              ? 'bg-[#E8ECF2] text-teal-800 font-black shadow-inner border border-white/60'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-teal-600" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => { setActiveTab('ATTENDANCE'); setSelectedCustomerId(null); }}
          className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'bg-[#E8ECF2] text-teal-800 font-black shadow-inner border border-white/60'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => { setActiveTab('CUSTOMERS'); setSelectedCustomerId(null); }}
          className={`py-3 px-1 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'bg-[#E8ECF2] text-teal-800 font-black shadow-inner border border-white/60'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Distributors</span>
        </button>
      </div>

      {/* main view */}
      <div className="flex-1 space-y-4">
        
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-4">
            
            {/* Sales analytics Header */}
            <div className="nm-flat p-4 rounded-2xl border border-white space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Live Sales Analytics
                </h3>
                {onRefresh && (
                  <button 
                    onClick={async () => {
                      try {
                        const btn = document.getElementById('dash-refresh-btn');
                        if (btn) btn.classList.add('animate-spin');
                        await onRefresh();
                      } catch (e) {
                        console.error(e);
                      } finally {
                        const btn = document.getElementById('dash-refresh-btn');
                        if (btn) btn.classList.remove('dash-refresh-spin');
                      }
                    }} 
                    className="text-slate-500 hover:text-teal-600 transition-colors p-1"
                    title="Refresh Live Data"
                  >
                    <RotateCw id="dash-refresh-btn" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="nm-inset p-3 bg-white rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Achieved Sales</span>
                  <span className="text-sm font-black text-teal-800 font-mono">PKR {totalAchievedSales.toLocaleString()}</span>
                </div>
                <div className="nm-inset p-3 bg-white rounded-xl text-center space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Achieved Recovery</span>
                  <span className="text-sm font-black text-indigo-800 font-mono">PKR {totalAchievedRecovery.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Target vs Achievement Gauges */}
            <div className="nm-flat p-4 rounded-2xl border border-white space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Monthly Target vs Achievement
              </h3>

              {/* Sales Target vs Achievement */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Sales Revenue</span>
                  <span className="font-mono text-slate-800">{salesAchievementPercent}% Achieved</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-white shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                    style={{ width: `${salesAchievementPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>Target: PKR {SALES_TARGET.toLocaleString()}</span>
                  <span>Achieved: PKR {totalAchievedSales.toLocaleString()}</span>
                </div>
              </div>

              {/* Recovery Target vs Achievement */}
              <div className="space-y-1.5 border-t pt-3">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Financial Recovery</span>
                  <span className="font-mono text-slate-800">{recoveryAchievementPercent}% Achieved</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-white shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${recoveryAchievementPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>Target: PKR {RECOVERY_TARGET.toLocaleString()}</span>
                  <span>Achieved: PKR {totalAchievedRecovery.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Shift coverage information */}
            <div className="nm-inset p-4 rounded-2xl bg-white space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold">Total Assigned Dealers:</span>
                <span className="font-mono font-black text-slate-800">{customers.length}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold">Active Geofenced Beat Town:</span>
                <span className="font-mono font-black text-teal-800">{attendanceTown}</span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ATTENDANCE WITH GEOMAPPING GEOFENCE & ACTIVITIES LOG */}
        {/* ========================================================= */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4">
            
            {/* Offline Sync & Location Queue Manager Indicator */}
            <div className="nm-flat p-4 rounded-2xl border border-white space-y-3 bg-[#f0f4fa]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Location Queue Status
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isOnline ? 'Network Online' : 'Network Offline'}
                </span>
              </div>

              {syncStatusMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-[10px] rounded-xl border border-emerald-200 font-bold animate-fade-in flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {syncStatusMsg}
                </div>
              )}

              <div className="nm-inset p-3 bg-white rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Queued Location Logs:</span>
                  <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${offlineLogs.length > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    {offlineLogs.length} Pending Logs
                  </span>
                </div>
                {offlineLogs.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <p className="text-[9px] text-slate-500 mb-2 font-semibold">
                      Your location entries are safely cached in browser storage. When internet connectivity is detected, these upload automatically to Supabase.
                    </p>
                    <button
                      onClick={() => syncOfflineLogs(false)}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 text-[10px] font-black rounded-lg shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <RotateCw className="w-3 h-3" /> Upload Queued Logs Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Geofence Widget & Attendance Check-In Console */}
            <div className="attendance-check-in-console nm-flat p-4 rounded-2xl border border-white space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                  <MapPin className="w-4 h-4 text-rose-600 animate-bounce" />
                  Town Geofenced Attendance Console
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Assigned towns directory drop-down selection below determines the active market.</p>
              </div>

              {/* Selected Town Center Dropdown - ASSIGNED ONLY */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block uppercase">Select Assigned Beat Town*</label>
                <select
                  value={attendanceTown}
                  onChange={(e) => setAttendanceTown(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-800 text-xs focus:outline-none"
                >
                  {assignedTowns.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Interactive Geofence Map */}
              <AttendanceGeofenceMap
                userLat={userLat}
                userLng={userLng}
                townCenter={townCenter}
                attendanceTown={attendanceTown}
                maxRadiusKM={maxRadiusKM}
                isWithinGeofence={isWithinGeofence}
                distanceToCenter={distanceToCenter}
                onRefreshGps={acquireLocation}
              />

              {/* GPS Tracker Console */}
              <div className="nm-inset p-3.5 rounded-2xl bg-white space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>SATELLITE GPS LOCK</span>
                  <button onClick={acquireLocation} className="text-teal-700 hover:underline flex items-center gap-0.5 font-bold">
                    <RotateCw className="w-3 h-3" /> Refresh GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Target Town Center</span>
                    <span className="font-mono font-bold block text-slate-700">
                      {townCenter.lat.toFixed(4)}° N, {townCenter.lng.toFixed(4)}° E
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Current Location</span>
                    {gpsLoading ? (
                      <span className="font-medium text-slate-400 block animate-pulse">Scanning GPS...</span>
                    ) : (
                      <span className="font-mono font-bold block text-slate-700">
                        {userLat.toFixed(4)}° N, {userLng.toFixed(4)}° E
                      </span>
                    )}
                  </div>
                </div>

                {gpsError && (
                  <p className="text-[9px] text-amber-700 bg-amber-50 p-1.5 rounded flex items-center gap-1">
                    <Info className="w-3 h-3" /> {gpsError}
                  </p>
                )}

                <div className="border-t border-dashed pt-2 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Calculated Proximity</span>
                    <span className="font-mono font-black text-slate-800 text-xs">
                      {distanceToCenter.toFixed(2)} km to center
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded font-black text-[10px] ${
                    isWithinGeofence ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isWithinGeofence ? '✓ INSIDE GEOFENCE' : '✗ OUTSIDE BOUNDS'}
                  </span>
                </div>

                {/* Simulation toggle */}
                <div className="flex items-center justify-between border-t pt-2 mt-1">
                  <span className="text-[10px] text-slate-500 font-bold">
                    Bypass Geofence Guard (Simulation Mode)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassGeofence}
                      onChange={(e) => setBypassGeofence(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>

              {/* Clock Ins */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="nm-inset p-3 rounded-xl bg-white space-y-1">
                  <span className="text-slate-400 font-bold block text-[9px]">Check-In Time</span>
                  {checkInTime ? (
                    <div>
                      <span className="text-emerald-700 font-black block text-sm">{checkInTime}</span>
                      <span className="text-[9px] text-slate-400 block font-mono truncate">{checkInLoc}</span>
                    </div>
                  ) : (
                    <span className="text-rose-500 font-bold block mt-1">Not Checked-In</span>
                  )}
                </div>

                <div className="nm-inset p-3 rounded-xl bg-white space-y-1">
                  <span className="text-slate-400 font-bold block text-[9px]">Check-Out Time</span>
                  {checkOutTime ? (
                    <div>
                      <span className="text-indigo-700 font-black block text-sm">{checkOutTime}</span>
                      <span className="text-[9px] text-slate-400 block font-mono truncate">{checkOutLoc}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 block mt-1">Active Beat Shift</span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleCheckIn}
                  className={`py-3 px-3 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-2 ${
                    isWithinGeofence
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 animate-geofence-pulse ring-2 ring-emerald-400/40'
                      : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 opacity-90'
                  }`}
                >
                  {isWithinGeofence ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                      <span>📌 Check In Beat (Geofence Verified)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-rose-200" />
                      <span>⚠️ Check In Blocked (Outside Geofence)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCheckOut}
                  className="py-3 px-3 rounded-xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>🚪 Check Out Beat</span>
                </button>
              </div>
            </div>

            {/* DAILY ACTIVITIES LOG (DATE-WISE) - MOVED HERE */}
            <div className="nm-flat p-4 rounded-2xl border border-white space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Daily Activities Log (Date-Wise)
                </h4>
                {offlineLogs.length > 0 && (
                  <button
                    onClick={syncOfflineLogs}
                    className="flex items-center gap-1 text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded animate-pulse"
                  >
                    Sync {offlineLogs.length} Records
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {dailyActivities.map((act, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-black text-slate-700 font-mono">📅 {act.date}</span>
                      <span className="font-bold text-teal-800">🏡 {act.town}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px]">SALES INVOICED</span>
                        <span className="font-bold text-emerald-700">PKR {act.sales.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">RECOVERY RECEIVED</span>
                        <span className="font-bold text-indigo-700">PKR {act.recovery.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Shift logs history */}
            <div className="nm-flat p-4 rounded-2xl border border-white space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Shift Sessions</h4>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {sessionLogs.map((log, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold text-slate-800 block">{log.town} Beat</span>
                      <span className="text-[9px] text-slate-400 block font-mono truncate max-w-[200px]">{log.coords}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">{log.date}</span>
                      <span className="text-slate-500 font-mono block mt-0.5">{log.checkIn} - {log.checkOut || 'Shift Active'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DISTRIBUTORS / DEALERS DIRECTORY & OPERATIONS */}
        {/* ========================================================= */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-4">
            
            {!selectedCustomerId ? (
              // Distributors/Dealers directory filtered strictly by attendance town selection
              <div className="space-y-4">
                
                {/* Information header */}
                <div className="p-3.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs space-y-1">
                  <span className="font-black block text-[10px] uppercase">Active Market Beat Context</span>
                  <p className="text-[11px]">
                    Showing distributors and dealers located in your selected attendance town beat: <b className="underline uppercase">{attendanceTown}</b>.
                  </p>
                </div>

                {/* Client Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search dealers in ${attendanceTown}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none"
                  />
                </div>

                {/* Dealer grid list */}
                <div className="space-y-3">
                  {searchedCustomers.length === 0 ? (
                    <div className="nm-flat p-6 rounded-2xl text-center text-slate-400 font-bold text-xs">
                      No dealers found in "{attendanceTown}". Please change your town in the Attendance tab.
                    </div>
                  ) : (
                    searchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => { setSelectedCustomerId(cust.id); setCustomerSubTab('DETAILS'); }}
                        className="nm-flat p-4 rounded-2xl border border-white hover:bg-slate-50 cursor-pointer transition-all space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-bold">
                                {cust.customerCode}
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-800">{cust.companyName}</h4>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Proprietor: {cust.contactPerson} • {cust.phone}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                            cust.type === 'DISTRIBUTOR' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {cust.type}
                          </span>
                        </div>

                        {/* Financial summary overview */}
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5">
                          <div className="nm-inset p-2 rounded-xl bg-white">
                            <span className="text-[9px] text-slate-400 block font-bold">Opening Balance</span>
                            <span className="font-mono font-bold text-slate-700 block mt-0.5">
                              PKR {(cust.openingBalance || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="nm-inset p-2 rounded-xl bg-white">
                            <span className="text-[9px] text-slate-400 block font-bold">Outstanding Net</span>
                            <span className="font-mono font-bold text-indigo-700 block mt-0.5">
                              PKR {(cust.currentBalance || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-1 text-[10px] text-teal-800 font-extrabold items-center">
                          <span>Enter Operations Directory</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            ) : (
              
              // Distributor / Dealer Directory Workspace (With 4 requested sections)
              <div className="space-y-4">
                
                {/* Back button */}
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:text-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to {attendanceTown} directory
                </button>

                {/* Selected Customer Header Banner */}
                <div className="nm-flat p-4 rounded-2xl border border-white space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {activeCustomer?.customerCode} • {activeCustomer?.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{activeCustomer?.city}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-sm">{activeCustomer?.companyName}</h3>
                  <p className="text-[11px] text-slate-600 font-medium">Proprietor: {activeCustomer?.contactPerson} • {activeCustomer?.phone}</p>
                </div>

                {/* Dynamic directory selector subtabs */}
                <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                  <button
                    onClick={() => setCustomerSubTab('DETAILS')}
                    className={`py-2 px-1.5 rounded-lg font-black transition-all ${
                      customerSubTab === 'DETAILS' ? 'nm-inset text-teal-800' : 'nm-flat text-slate-600'
                    }`}
                  >
                    Directory
                  </button>
                  <button
                    onClick={() => setCustomerSubTab('ORDER_FORM')}
                    className={`py-2 px-1.5 rounded-lg font-black transition-all ${
                      customerSubTab === 'ORDER_FORM' ? 'nm-inset text-emerald-800' : 'nm-flat text-slate-600'
                    }`}
                  >
                    Order Form
                  </button>
                  <button
                    onClick={() => setCustomerSubTab('INVOICES_LIST')}
                    className={`py-2 px-1.5 rounded-lg font-black transition-all ${
                      customerSubTab === 'INVOICES_LIST' ? 'nm-inset text-amber-800' : 'nm-flat text-slate-600'
                    }`}
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => setCustomerSubTab('LEDGER_SHEET')}
                    className={`py-2 px-1.5 rounded-lg font-black transition-all ${
                      customerSubTab === 'LEDGER_SHEET' ? 'nm-inset text-violet-800' : 'nm-flat text-slate-600'
                    }`}
                  >
                    Ledger
                  </button>
                </div>

                {/* SUBTAB 1: PRIMARY OPERATIONS DIRECTORY (Financial Cards, Today's Recovery Box, Visit Remarks, Submit) */}
                {customerSubTab === 'DETAILS' && (
                  <div className="space-y-4">
                    
                    {/* Real-time calculated balances */}
                    <div className="nm-flat p-4 rounded-2xl border border-white space-y-3">
                      <span className="text-xs font-black text-slate-800 block uppercase">Commercial Financial Ledger</span>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="nm-inset p-2.5 bg-white rounded-xl">
                          <span className="text-slate-400 text-[9px] font-bold block uppercase">Opening Balance</span>
                          <span className="font-mono font-black text-slate-800 mt-0.5 block">PKR {clientOpeningBalance.toLocaleString()}</span>
                        </div>
                        <div className="nm-inset p-2.5 bg-white rounded-xl">
                          <span className="text-slate-400 text-[9px] font-bold block uppercase">Invoicing Amount</span>
                          <span className="font-mono font-black text-emerald-700 mt-0.5 block">PKR {clientInvoicingAmount.toLocaleString()}</span>
                        </div>
                        <div className="nm-inset p-2.5 bg-white rounded-xl">
                          <span className="text-slate-400 text-[9px] font-bold block uppercase">Recovery Amount</span>
                          <span className="font-mono font-black text-indigo-700 mt-0.5 block">PKR {clientRecoveryAmount.toLocaleString()}</span>
                        </div>
                        <div className="nm-inset p-2.5 bg-white rounded-xl">
                          <span className="text-slate-400 text-[9px] font-bold block uppercase">Net Balance</span>
                          <span className="font-mono font-black text-rose-700 mt-0.5 block">PKR {clientNetBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Today's Recovery Entry box */}
                    <div className="nm-flat p-4 rounded-2xl border border-white space-y-3">
                      <span className="text-xs font-black text-slate-800 block uppercase flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-teal-600" />
                        Today's Recovery Entry Box
                      </span>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (PKR)*</label>
                          <input
                            type="number"
                            placeholder="Amount in PKR"
                            value={todayRecoveryAmount}
                            onChange={(e) => setTodayRecoveryAmount(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Mode*</label>
                          <select
                            value={todayRecoveryMode}
                            onChange={(e) => setTodayRecoveryMode(e.target.value as PaymentMode)}
                            className="w-full p-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-800"
                          >
                            <option value="CASH">CASH</option>
                            <option value="CHEQUE">CHEQUE</option>
                            <option value="ONLINE_TRANSFER">ONLINE TRANSFER</option>
                            <option value="PAY_ORDER">PAY ORDER</option>
                          </select>
                        </div>
                      </div>

                      {todayRecoveryMode !== 'CASH' && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Instrument/Slip No</label>
                            <input
                              type="text"
                              placeholder="Cheque/Ref number"
                              value={instrumentNo}
                              onChange={(e) => setInstrumentNo(e.target.value)}
                              className="w-full p-2 rounded-xl bg-white border border-slate-300"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Name</label>
                            <input
                              type="text"
                              placeholder="e.g. HBL, MCB"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full p-2 rounded-xl bg-white border border-slate-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Today's visit remarks box */}
                    <div className="nm-flat p-4 rounded-2xl border border-white space-y-2">
                      <span className="text-xs font-black text-slate-800 block uppercase">Today's Visit Remarks / Logs</span>
                      <textarea
                        rows={2}
                        placeholder="Log any visit comments or follow up details..."
                        value={visitRemarks}
                        onChange={(e) => setVisitRemarks(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-slate-300 text-xs focus:outline-none"
                      />
                    </div>

                    {/* Master Submit Button */}
                    <button
                      onClick={handleProposalSubmit}
                      className="w-full py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-lg active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      Submit Operations Proposal
                    </button>

                  </div>
                )}

                {/* SUBTAB 2: BRAND & SKU WISE ORDERING FORM */}
                {customerSubTab === 'ORDER_FORM' && (
                  <div className="nm-flat p-4 rounded-2xl border border-white space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FilePlus className="w-4 h-4 text-emerald-600" />
                        Today's Ordering Form
                      </h4>
                      <p className="text-[10px] text-slate-500">Add order quantities grouped by brand models.</p>
                    </div>

                    {/* Brands Group Container */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                      {Object.entries(brandsGrouped).map(([brandName, brandSkus]) => (
                        <div key={brandName} className="space-y-2">
                          <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                            <h5 className="font-extrabold text-xs text-slate-800 uppercase">{brandName}</h5>
                          </div>

                          <div className="space-y-2">
                            {brandSkus.map(sku => {
                              const balanceObj = inventoryBalances.find(b => b.skuId === sku.id);
                              const availableStock = balanceObj?.availableQuantity || balanceObj?.quantityOnHand || 0;
                              const currentQty = quantities[sku.id] || '';

                              return (
                                <div key={sku.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono font-black text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      {sku.skuCode}
                                    </span>
                                    <h6 className="font-extrabold text-slate-800 text-[11px] truncate mt-1">{sku.name}</h6>
                                    <span className="text-[10px] text-slate-500 font-semibold font-mono block mt-0.5">
                                      Price: PKR {sku.tradePrice.toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2.5">
                                    <div className="text-right">
                                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Avail Qty</span>
                                      <span className="font-mono font-extrabold text-slate-700 block text-[11px]">
                                        {availableStock}
                                      </span>
                                    </div>
                                    <div className="w-16">
                                      <span className="text-[9px] text-slate-400 font-bold block uppercase text-center">Order</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={currentQty}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuantities(prev => ({ ...prev, [sku.id]: val }));
                                        }}
                                        className="w-full text-center py-1 bg-slate-50 border border-slate-300 rounded font-bold font-mono text-xs focus:bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order action */}
                    <button
                      onClick={handleProposalSubmit}
                      className="w-full py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Submit Selected Quantities
                    </button>
                  </div>
                )}

                {/* SUBTAB 3: ALL INVOICES HISTORICAL LIST WITH DATE FILTERS */}
                {customerSubTab === 'INVOICES_LIST' && (
                  <div className="nm-flat p-4 rounded-2xl border border-white space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600" />
                        Dealer Commercial Invoices
                      </h4>
                      <p className="text-[10px] text-slate-500">Filter previous invoice receipts by dates.</p>
                    </div>

                    {/* Date picker filters */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">From Date</label>
                        <input
                          type="date"
                          value={invoiceFromDate}
                          onChange={(e) => setInvoiceFromDate(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">To Date</label>
                        <input
                          type="date"
                          value={invoiceToDate}
                          onChange={(e) => setInvoiceToDate(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {filteredInvoices.length === 0 ? (
                        <div className="bg-white p-6 rounded-xl border text-center text-slate-400 font-bold text-xs">
                          No invoices found in specified date range.
                        </div>
                      ) : (
                        filteredInvoices.map(inv => (
                          <div key={inv.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-mono font-black text-slate-800">{inv.invoiceNumber}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{inv.invoiceDate}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {inv.status || 'PENDING'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-[11px] border-t pt-2">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Net Invoiced</span>
                                <span className="font-mono font-black text-slate-800">PKR {Number(inv.totalAmount).toLocaleString()}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => shareInvoiceWhatsApp(inv)}
                                  className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1 text-[10px] font-bold"
                                >
                                  <Send className="w-3.5 h-3.5" /> Share
                                </button>
                                <button
                                  onClick={() => setActivePrintInvoice(inv)}
                                  className="p-2 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 flex items-center justify-center gap-1 text-[10px] font-bold"
                                  title="Print Invoice (A5 Thermal & PDF)"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}

                {/* SUBTAB 4: LEDGER SHEET STATEMENT & WHATSAPP SHARING */}
                {customerSubTab === 'LEDGER_SHEET' && (
                  <div className="nm-flat p-4 rounded-2xl border border-white space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-violet-600" />
                        Atomic Ledger Sheet
                      </h4>
                      <p className="text-[10px] text-slate-500">Filter and share Statement of Accounts with your dealer.</p>
                    </div>

                    {/* Date Filters */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">From Date</label>
                        <input
                          type="date"
                          value={ledgerFromDate}
                          onChange={(e) => setLedgerFromDate(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">To Date</label>
                        <input
                          type="date"
                          value={ledgerToDate}
                          onChange={(e) => setLedgerToDate(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Share action */}
                    <button
                      onClick={shareLedgerWhatsApp}
                      className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      Share Ledger on Dealer WhatsApp
                    </button>

                    {/* Ledger transactions list table */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {clientLedgerEntries.length === 0 ? (
                        <div className="bg-white p-6 rounded-xl border text-center text-slate-400 font-bold text-xs">
                          No ledger records matching date range.
                        </div>
                      ) : (
                        clientLedgerEntries.map(entry => (
                          <div key={entry.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                              <span>📅 {entry.entryDate}</span>
                              <span className="font-mono uppercase">{entry.transactionType}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-700">{entry.description}</p>
                            
                            <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-dashed font-mono text-[10px]">
                              <div>
                                <span className="text-slate-400 block text-[8px] font-bold">DEBIT</span>
                                <span className="text-rose-600 font-bold">
                                  {entry.debitAmount ? `PKR ${entry.debitAmount.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[8px] font-bold">CREDIT</span>
                                <span className="text-emerald-700 font-bold">
                                  {entry.creditAmount ? `PKR ${entry.creditAmount.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 block text-[8px] font-bold">RUNNING</span>
                                <span className="text-slate-800 font-black">
                                  PKR {entry.runningBalance.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

      {/* SUCCESS GENERATED INVOICE OVERLAY DIALOG */}
      {generatedInvoice && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#E8ECF2] p-5 rounded-3xl border border-white space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold mb-1.5">
                ✓
              </div>
              <h3 className="font-black text-slate-800 text-sm">Commercial Invoice Generated</h3>
              <p className="text-[10px] text-slate-400">Proposal recorded successfully.</p>
            </div>

            {/* Invoice details */}
            <div className="nm-inset p-3 bg-white rounded-xl text-xs space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-700">{generatedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono font-bold text-slate-700">{generatedInvoice.invoiceDate}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400">Gross Total:</span>
                <span className="font-mono font-bold text-slate-700">PKR {generatedInvoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Payable:</span>
                <span className="font-mono font-black text-emerald-700">PKR {generatedInvoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Action panel */}
            <div className="grid grid-cols-3 gap-1.5 text-xs pt-1">
              <button
                onClick={() => shareInvoiceWhatsApp(generatedInvoice)}
                className="py-2.5 px-1 rounded-xl bg-emerald-600 text-white font-black text-center flex items-center justify-center gap-1 shadow-md hover:bg-emerald-700 active:scale-95 transition-all text-[11px]"
              >
                <Send className="w-3.5 h-3.5" /> Share
              </button>
              <button
                onClick={() => setActivePrintInvoice(generatedInvoice)}
                className="py-2.5 px-1 rounded-xl bg-teal-600 text-white font-black text-center flex items-center justify-center gap-1 shadow-md hover:bg-teal-700 active:scale-95 transition-all text-[11px]"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
              <button
                onClick={() => setGeneratedInvoice(null)}
                className="py-2.5 px-1 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 text-center hover:bg-slate-50 active:scale-95 transition-all text-[11px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PRINT INVOICE MODAL (A5 Thermal & A4 Tax Invoice) */}
      {activePrintInvoice && (
        <PrintInvoiceModal
          isOpen={!!activePrintInvoice}
          onClose={() => setActivePrintInvoice(null)}
          invoice={activePrintInvoice}
          customer={customers.find(c => c.id === activePrintInvoice.customerId) || customers.find(c => c.id === selectedCustomerId) || customers[0] || ({ id: 'cust-0', companyName: 'National Lights Dealer', address: 'Brandreth Rd, Lahore', phone: '+92 300 1234567' } as any)}
          skus={skus}
          currentUser={currentUser}
        />
      )}

    </div>
  );
};
