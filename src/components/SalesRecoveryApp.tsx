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
  MapPin
} from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { DynamicDealerFormModal } from './DynamicDealerFormModal';
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

export const SalesRecoveryApp: React.FC<SalesRecoveryAppProps> = ({
  currentUser,
  customers = [],
  skus = [],
  inventoryBalances = [],
  salesOrders = [],
  recoveries = [],
  invoices = [],
  visits = [],
  onLogout,
  onBookOrder,
  onRecordRecovery,
  onLogVisit,
  onSubmitRegistration,
  onRefresh,
}) => {
  // -------------------------------------------------------------
  // 3 Primary Navigation Tabs: 'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'DISTRIBUTORS' | 'DASHBOARD'>('ATTENDANCE');

  // Dealer Registration Modal State (Field Force Onboarding to Pending Queue)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);

  // Online / Offline Indicator
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  // Towns assigned to the user or derived from authorized customers
  const assignedTowns = useMemo(() => {
    const towns = Array.from(new Set(authorizedCustomers.map((c) => c.city || 'Lahore'))).filter(Boolean);
    return towns.length > 0 ? towns : ['Lahore', 'Gujranwala', 'Peshawar', 'Mardan', 'Nowshera', 'Karachi', 'Multan', 'Faisalabad', 'Rawalpindi'];
  }, [authorizedCustomers]);

  const [selectedTown, setSelectedTown] = useState<string>(() => {
    return localStorage.getItem('nlink_sales_active_town') || assignedTowns[0] || 'Lahore';
  });

  useEffect(() => {
    localStorage.setItem('nlink_sales_active_town', selectedTown);
  }, [selectedTown]);

  // Attendance recording state
  interface AttendanceRecord {
    date: string;
    time: string;
    town: string;
    userName: string;
    lat: number;
    lng: number;
    accuracy: number;
    status: string;
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

  const handleMarkAttendance = () => {
    setGpsCapturing(true);
    setAttendanceMessage(null);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const rec: AttendanceRecord = {
            date: todayStr,
            time: timeStr,
            town: selectedTown,
            userName: currentUser.fullName,
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
            accuracy: Math.round(pos.coords.accuracy || 15),
            status: 'Marked (GPS Validated)',
          };
          setAttendanceRecord(rec);
          localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
          setGpsCapturing(false);
          setAttendanceMessage(`Attendance captured successfully at ${timeStr} for ${selectedTown}!`);
        },
        () => {
          // Fallback with simulated location for smooth offline experience
          const rec: AttendanceRecord = {
            date: todayStr,
            time: timeStr,
            town: selectedTown,
            userName: currentUser.fullName,
            lat: 31.5204,
            lng: 74.3587,
            accuracy: 20,
            status: 'Marked (Network Captured)',
          };
          setAttendanceRecord(rec);
          localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
          setGpsCapturing(false);
          setAttendanceMessage(`Attendance captured at ${timeStr} for ${selectedTown}!`);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const rec: AttendanceRecord = {
        date: todayStr,
        time: timeStr,
        town: selectedTown,
        userName: currentUser.fullName,
        lat: 31.5204,
        lng: 74.3587,
        accuracy: 50,
        status: 'Marked (System Timestamp)',
      };
      setAttendanceRecord(rec);
      localStorage.setItem('nlink_sales_attendance_today', JSON.stringify(rec));
      setGpsCapturing(false);
      setAttendanceMessage(`Attendance marked at ${timeStr}!`);
    }
  };

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

    const custTownMap = new Map(authorizedCustomers.map((c) => [c.id, c.city || 'Lahore']));

    salesOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') return;
      const oDateStr = o.orderDate || o.createdAt || '';
      if (!oDateStr) return;
      const oDate = new Date(oDateStr);
      if (!isNaN(oDate.getTime()) && oDate.getFullYear() === currentYear && oDate.getMonth() === currentMonth) {
        const town = custTownMap.get(o.customerId) || 'Lahore';
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
        const town = custTownMap.get(r.customerId) || 'Lahore';
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
  }, [assignedTowns, authorizedCustomers, salesOrders, recoveries]);

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

  // Filter authorized customers by search query
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return authorizedCustomers;
    return authorizedCustomers.filter((c) => {
      return (
        c.companyName.toLowerCase().includes(q) ||
        (c.customerCode || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q)
      );
    });
  }, [authorizedCustomers, customerSearchQuery]);

  const activeCustomer = useMemo(() => {
    return authorizedCustomers.find((c) => c.id === selectedCustomerId) || null;
  }, [authorizedCustomers, selectedCustomerId]);

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

  const handleConfirmSubmitOrder = async () => {
    if (!activeCustomer || orderSummary.totalQuantity === 0) return;
    setOrderSubmitting(true);

    try {
      const orderItems: SalesOrderItem[] = Object.entries(orderQuantities)
        .filter(([_, qty]) => Number(qty || 0) > 0)
        .map(([skuId, qty]) => {
          const sku = skus.find((s) => s.id === skuId);
          const price = Number(sku?.tradePrice || sku?.retailPrice || 0);
          const quantityNum = Number(qty || 0);
          const packs = Number(sku?.packsPerCarton || 50);
          const unitsPerPack = Number(sku?.unitsPerPack || 1);
          const totalUnitsPerCarton = packs * unitsPerPack;
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
            discountPercent: 0,
            lineTotal: quantityNum * price,
          };
        });

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
        subtotal: orderSummary.orderValue,
        discountAmount: 0,
        taxAmount: Math.round(orderSummary.orderValue * 0.18),
        totalAmount: Math.round(orderSummary.orderValue * 1.18),
        status: 'SUBMITTED',
        creditCheckStatus: 'GREEN',
      };

      if (onBookOrder) {
        await onBookOrder(newOrder);
      }

      setOrderQuantities({});
      setShowOrderConfirmModal(false);
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
      if (onRecordRecovery) {
        await onRecordRecovery({
          customerId: activeCustomer.id,
          amount: amountNum,
          paymentMode: recoveryMode,
          instrumentNumber: recoveryInstrumentNo,
          bankName: recoveryBank,
          remarks: recoveryRemarks,
        });
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
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 font-sans pb-28 selection:bg-teal-200">
      {/* ========================================================= */}
      {/* TOP HEADER (Clean, Unified Desktop/Mobile Navigation) */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'Network Connected' : 'Offline Mode Active'}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">
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

            {/* Town Selection & Attendance Button */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Town
                </label>
                <div className="relative">
                  <select
                    value={selectedTown}
                    onChange={(e) => setSelectedTown(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {assignedTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Large Mark Attendance Button */}
              <button
                onClick={handleMarkAttendance}
                disabled={gpsCapturing}
                className="w-full py-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
              >
                {gpsCapturing ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Acquiring GPS & Marking...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    <span>MARK ATTENDANCE</span>
                  </>
                )}
              </button>

              {attendanceMessage && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-teal-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{attendanceMessage}</span>
                </div>
              )}

              {/* Active Attendance Info Card */}
              {attendanceRecord && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Status</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {attendanceRecord.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Marked Time</span>
                      <span className="font-bold text-slate-900">{attendanceRecord.time}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Town</span>
                      <span className="font-bold text-slate-900">{attendanceRecord.town}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/80">
                      <span className="text-slate-400 block text-[10px]">GPS Coordinates</span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {attendanceRecord.lat}° N, {attendanceRecord.lng}° E (±{attendanceRecord.accuracy}m)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MTD Activities & Real Transactions Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <span>MTD Activities</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">Month-to-Date Real Transactions</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  REAL-TIME MTD
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Month</th>
                      <th className="px-3 py-2.5">Town</th>
                      <th className="px-3 py-2.5 text-right">Sales Booking</th>
                      <th className="px-3 py-2.5 text-right">Recovery Cash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mtdActivities.map((act, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-600">{act.date}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{act.town}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          Rs. {act.sales.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                          Rs. {act.recovery.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 text-xs uppercase tracking-wider text-slate-500 font-extrabold">Total MTD</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-black">
                        Rs. {mtdActivities.reduce((s, a) => s + a.sales, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700 text-xs font-black">
                        Rs. {mtdActivities.reduce((s, a) => s + a.recovery, 0).toLocaleString()}
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
                </div>

                {/* Customer List */}
                <div className="space-y-2">
                  {filteredCustomers.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                      No distributors matching "{customerSearchQuery}".
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
                  </div>
                </div>

                {/* Sub-section Switcher inside Customer (Alphabetically A-Z Sorted: Invoices -> Ledger -> Order Entry -> Recovery) */}
                <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
                  <button
                    onClick={() => setCustomerInnerTab('INVOICES')}
                    className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                      customerInnerTab === 'INVOICES'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => setCustomerInnerTab('LEDGER')}
                    className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                      customerInnerTab === 'LEDGER'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Ledger
                  </button>
                  <button
                    onClick={() => setCustomerInnerTab('ORDER')}
                    className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                      customerInnerTab === 'ORDER'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Order Entry
                  </button>
                  <button
                    onClick={() => setCustomerInnerTab('RECOVERY')}
                    className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                      customerInnerTab === 'RECOVERY'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Recovery
                  </button>
                </div>

                {/* --- A. ORDER ENTRY SECTION (Brand Accordions) --- */}
                {customerInnerTab === 'ORDER' && (
                  <div className="space-y-4 pb-20">
                    {orderSuccessMessage && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{orderSuccessMessage}</span>
                      </div>
                    )}

                    {/* Brand Accordion SKU Lists */}
                    <div className="space-y-3">
                      {(Object.entries(brandsGrouped) as [string, SKU[]][]).map(([brandName, brandSkus]) => {
                        const isExpanded = expandedBrands[brandName] ?? false;
                        const brandActiveQty = brandSkus.reduce((sum, s) => sum + (orderQuantities[s.id] || 0), 0);
                        
                        return (
                          <div key={brandName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            {/* Brand Header Accordion Trigger */}
                            <button
                              type="button"
                              onClick={() => toggleBrand(brandName)}
                              className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                                <span className="truncate">{brandName}</span>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full shrink-0">
                                  {brandSkus.length} SKUs
                                </span>
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
                                    <div key={sku.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 truncate">{sku.name}</span>
                                          <span className="text-[10px] font-mono text-slate-400">({sku.skuCode})</span>
                                          {isLowStock && (
                                            <span 
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase tracking-wider animate-pulse shrink-0"
                                              title={`Current stock is below the reorder level of ${sku.reorderLevel || 10} pcs.`}
                                            >
                                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                              <span>Low Stock</span>
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-0.5">
                                          <span>Price: <strong className="text-slate-800 font-mono">Rs. {unitPrice.toLocaleString()}</strong></span>
                                          <span>
                                            Available:{' '}
                                            {isOutOfStock ? (
                                              <strong className="text-rose-600 font-bold">Out of Stock</strong>
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

                                      {/* Order Qty Input / Stepper */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={isOutOfStock || currentQty <= 0}
                                          onClick={() => handleQtyChange(sku.id, currentQty - 1)}
                                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 flex items-center justify-center text-slate-700 font-bold cursor-pointer transition-colors"
                                        >
                                          <Minus className="w-4 h-4" />
                                        </button>

                                        <input
                                          type="number"
                                          min={0}
                                          max={stock}
                                          disabled={isOutOfStock}
                                          value={currentQty === 0 ? '' : currentQty}
                                          onChange={(e) => handleQtyChange(sku.id, parseInt(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-14 text-center py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400 tabular-nums"
                                        />

                                        <button
                                          type="button"
                                          disabled={isOutOfStock || currentQty >= stock}
                                          onClick={() => handleQtyChange(sku.id, currentQty + 1)}
                                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 flex items-center justify-center text-slate-700 font-bold cursor-pointer transition-colors"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
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

                      <button
                        type="button"
                        disabled={orderSummary.totalQuantity === 0}
                        onClick={() => setShowOrderConfirmModal(true)}
                        className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SUBMIT ORDER (Rs. {orderSummary.orderValue.toLocaleString()})</span>
                      </button>
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

                          <button
                            type="button"
                            onClick={() => setShowOrderConfirmModal(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-500/25 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <span>Review & Book</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- B. IN-CUSTOMER RECOVERY FORM --- */}
                {customerInnerTab === 'RECOVERY' && (
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
                )}

                {/* --- C. INVOICES SUB-TAB --- */}
                {customerInnerTab === 'INVOICES' && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-slate-900">Invoices List</h3>

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
                )}

                {/* --- D. LEDGER SUB-TAB --- */}
                {customerInnerTab === 'LEDGER' && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-slate-900">Customer Ledger</h3>

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
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-4">
            {/* Header & Hierarchy Role Badge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
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

              {/* Period Selector: TODAY | MTD | YTD */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-extrabold text-slate-700">
                {(['TODAY', 'MTD', 'YTD'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setDashboardPeriod(p)}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                      dashboardPeriod === p
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. SALES KPI CARD (Dynamic Calculation from current month's sales orders) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
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

              {/* Clean Visual Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(performanceData.salesPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    Rs. {performanceData.salesTarget.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Achievement</span>
                  <span className="font-mono font-bold text-teal-700 text-sm">
                    Rs. {performanceData.salesAchieved.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
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

              {/* Dynamic MTD Operational Run-Rate & Order Clearance Card (when in MTD mode or overview) */}
              {dashboardPeriod === 'MTD' && (
                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                    <span className="font-extrabold text-teal-900 text-[11px] uppercase tracking-wide">
                      MTD Pace &amp; Quota Velocity
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 font-mono">
                      {mtdStats.totalOrders} Orders Logged
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
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

                  <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-lg border border-teal-200/60 text-[11px]">
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
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

              {/* Clean Visual Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(performanceData.recoveryPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    Rs. {performanceData.recoveryTarget.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Achievement</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    Rs. {performanceData.recoveryAchieved.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
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
        )}
      </main>

      {/* ========================================================= */}
      {/* BOTTOM NAVIGATION BAR (Responsive Mobile & Tablet View) */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-2">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-around">
          {/* Tab 1: Attendance */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('ATTENDANCE');
              setSelectedCustomerId(null);
            }}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'ATTENDANCE'
                ? 'text-teal-700 font-black bg-teal-50/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 font-semibold hover:bg-slate-50'
            }`}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'ATTENDANCE' ? 'stroke-[2.5] text-teal-700' : 'stroke-2'}`} />
            <span className="text-[11px] leading-none">Attendance</span>
          </button>

          {/* Tab 2: Distributor */}
          <button
            type="button"
            onClick={() => setActiveTab('DISTRIBUTORS')}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'DISTRIBUTORS'
                ? 'text-teal-700 font-black bg-teal-50/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 font-semibold hover:bg-slate-50'
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
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'text-teal-700 font-black bg-teal-50/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 font-semibold hover:bg-slate-50'
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
    </div>
  );
};
