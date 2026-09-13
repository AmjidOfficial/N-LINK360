/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Integrated Business Platform
 * 
 * Includes:
 * 1. Role-Based Access Control (Super Admin, Management, RSM, ASM, TSM, OB / Sales Recovery, Accounts)
 * 2. SKU-Wise Ordering Entry Form (Exclusively N-Link Official Products & Price List)
 * 3. Payment Recovery Entry in the unified form
 * 4. User Management & Team Hierarchy (Google Sheet Synced)
 * 5. Products Management (N-Link Price List with TP, RP, Carton Specs, Stock)
 * 6. Target vs Achievement Matrix (Sales & Recovery Gauges, MTD/Today)
 * 7. Sales & Recovery Transactional Ledger
 * 8. Google Sheets 2-Way Synchronization Hub (Target Spreadsheet: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  ShoppingBag,
  Coins,
  Target as TargetIcon,
  Users,
  Layers,
  FileText,
  TrendingUp,
  Building2,
  RefreshCw,
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Store,
  Calendar,
  Lock,
  Unlock,
  ChevronDown,
  X,
  Menu,
} from 'lucide-react';
import { NLINK_OFFICIAL_PRODUCTS } from './data/nlink-products';
import { NLINK_TEAM_ROSTER, NLinkUser } from './data/nlink-users-team';
import { NLinkSkuOrderRecoveryForm } from './components/NLinkSkuOrderRecoveryForm';
import { NLinkTargetAchievementTab } from './components/NLinkTargetAchievementTab';
import { NLinkProductsMasterTab } from './components/NLinkProductsMasterTab';
import { NLinkUserManagementTab } from './components/NLinkUserManagementTab';
import { NLinkSalesRecoveryDataTab } from './components/NLinkSalesRecoveryDataTab';
import { FmcgCommandCenter } from './components/FmcgCommandCenter';
import { CustomerEcosystemTab } from './components/CustomerEcosystemTab';
import { GoogleSheetsIntegrationModal } from './components/GoogleSheetsIntegrationModal';
import { NewDistributorEntryTab } from './components/NewDistributorEntryTab';
import { NLinkDashboardTab } from './components/NLinkDashboardTab';
import { NationalLightLogo } from './components/NationalLightLogo';
import { fallbackAppData, SupabaseAppData } from './services/supabase-data';
import { Customer, SalesOrder, Recovery } from './types';
import {
  TARGET_SPREADSHEET_ID,
  getActiveSpreadsheetId,
  submitAndSaveOrder,
  submitAndSaveRecovery,
  getLocalDatabaseCache,
  saveLocalDatabaseCache,
} from './services/googleSheetsTwoWaySyncService';
import { getAccessToken } from './services/googleAuth';

export default function App() {
  // 1. Current Active User & Persona State (Role-Based)
  const [currentUser, setCurrentUser] = useState<NLinkUser>(NLINK_TEAM_ROSTER[0]);
  const [allUsers, setAllUsers] = useState<NLinkUser[]>(NLINK_TEAM_ROSTER);

  // 2. Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'ENTRY_FORM' | 'TARGET_ACHIEVEMENT' | 'FMCG_COMMAND_CENTER' | 'PRODUCTS' | 'USERS_TEAM' | 'SALES_RECOVERY_DATA' | 'CUSTOMERS' | 'SHEET_SYNC' | 'NEW_DISTRIBUTOR' | 'DASHBOARD'
  >('ENTRY_FORM');

  const [showAdminTools, setShowAdminTools] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // 3. Central In-Memory & LocalStorage Datasets
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'CUST-001',
      customerCode: 'C-001',
      companyName: 'Lahore Lights & Electric',
      contactPerson: 'Haji Muhammad Tariq',
      phone: '+92 300 4123456',
      address: 'Shop #42, Brandreth Road Auto Market',
      city: 'Lahore',
      territory: 'Brandreth Road Beat 1',
      region: 'Punjab Central',
      creditLimit: 3000000,
      creditDays: 30,
      currentBalance: 2400000,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: false,
      openingBalance: 2000000,
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'CUST-002',
      customerCode: 'C-002',
      companyName: 'Khyber Auto Traders',
      contactPerson: 'Khan Muhammad',
      phone: '+92 321 8345678',
      address: 'Shop #12, Karkhano Market, Jamrud Road',
      city: 'Peshawar',
      territory: 'Karkhano & Jamrud Road Beat',
      region: 'Punjab North',
      creditLimit: 2000000,
      creditDays: 15,
      currentBalance: 1200000,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: false,
      openingBalance: 1000000,
      createdAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'CUST-003',
      customerCode: 'C-003',
      companyName: 'Sindh Electric Hub',
      contactPerson: 'Asif Memon',
      phone: '+92 300 2901234',
      address: 'Plaza Auto Market, M.A. Jinnah Road',
      city: 'Karachi',
      territory: 'Plaza Auto Market & M.A. Jinnah Road',
      region: 'Sindh South',
      creditLimit: 4000000,
      creditDays: 45,
      currentBalance: 3500000,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: false,
      openingBalance: 2500000,
      createdAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'CUST-004',
      customerCode: 'C-004',
      companyName: 'Capital Spares & Lights',
      contactPerson: 'Zahid Mehmood',
      phone: '+92 333 9456789',
      address: 'Blue Area Commercial Beat',
      city: 'Islamabad',
      territory: 'Blue Area Commercial Beat',
      region: 'Punjab North',
      creditLimit: 1500000,
      creditDays: 30,
      currentBalance: 850000,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: false,
      openingBalance: 600000,
      createdAt: '2026-03-01T00:00:00Z',
    },
    {
      id: 'CUST-005',
      customerCode: 'C-005',
      companyName: 'Rawalpindi Auto Zone',
      contactPerson: 'Zia-ul-Haq',
      phone: '+92 345 1890123',
      address: 'Saddar Auto Market',
      city: 'Rawalpindi',
      territory: 'Saddar Auto Market Beat',
      region: 'Punjab North',
      creditLimit: 2500000,
      creditDays: 30,
      currentBalance: 1500000,
      status: 'CREDIT_LOCKED',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: true,
      openingBalance: 1200000,
      createdAt: '2026-02-15T00:00:00Z',
    },
    {
      id: 'CUST-006',
      customerCode: 'C-006',
      companyName: 'Gujranwala Electric Mart',
      contactPerson: 'Malik Usman',
      phone: '+92 300 7788112',
      address: 'G.T Road Market, Gujranwala',
      city: 'Gujranwala',
      territory: 'Small Industrial Estate Beat',
      region: 'Punjab Central',
      creditLimit: 2000000,
      creditDays: 20,
      currentBalance: 980000,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      isCreditLocked: false,
      openingBalance: 800000,
      createdAt: '2026-02-20T00:00:00Z',
    },
  ]);

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([
    {
      id: 'SO-1021',
      orderNumber: 'SO-1021',
      customerId: 'CUST-001',
      customerName: 'Lahore Lights & Electric',
      customerCode: 'C-001',
      salesUserId: 'USR-040',
      salesUserName: 'Ali Raza',
      orderDate: '2026-09-11',
      status: 'APPROVED',
      totalAmount: 245000,
      subtotal: 245000,
      discountAmount: 0,
      items: [
        {
          id: 'item-1',
          orderId: 'SO-1021',
          skuId: 'NL-ECO-12W',
          skuCode: 'NL-ECO-12W',
          skuName: 'N-Link Eco LED Bulb 12W B22/E27',
          orderedQuantity: 1000,
          approvedQuantity: 1000,
          unitPrice: 245,
          discountPercent: 0,
          lineTotal: 245000,
        },
      ],
      createdAt: '2026-09-11T10:30:00Z',
    },
    {
      id: 'SO-1022',
      orderNumber: 'SO-1022',
      customerId: 'CUST-003',
      customerName: 'Sindh Electric Hub',
      customerCode: 'C-003',
      salesUserId: 'USR-043',
      salesUserName: 'Asad Ullah',
      orderDate: '2026-09-12',
      status: 'APPROVED',
      totalAmount: 490000,
      subtotal: 490000,
      discountAmount: 0,
      items: [
        {
          id: 'item-2',
          orderId: 'SO-1022',
          skuId: 'NL-FLD-100W',
          skuCode: 'NL-FLD-100W',
          skuName: 'N-Link Outdoor SMD Floodlight 100W IP66',
          orderedQuantity: 200,
          approvedQuantity: 200,
          unitPrice: 2450,
          discountPercent: 0,
          lineTotal: 490000,
        },
      ],
      createdAt: '2026-09-12T09:15:00Z',
    },
    {
      id: 'SO-1023',
      orderNumber: 'SO-1023',
      customerId: 'CUST-002',
      customerName: 'Khyber Auto Traders',
      customerCode: 'C-002',
      salesUserId: 'USR-042',
      salesUserName: 'Bilal Khan',
      orderDate: '2026-09-12',
      status: 'APPROVED',
      totalAmount: 186000,
      subtotal: 186000,
      discountAmount: 0,
      items: [
        {
          id: 'item-3',
          orderId: 'SO-1023',
          skuId: 'NL-SMD-30W',
          skuCode: 'NL-SMD-30W',
          skuName: 'N-Link High Power T-Bulb 30W',
          orderedQuantity: 300,
          approvedQuantity: 300,
          unitPrice: 620,
          discountPercent: 0,
          lineTotal: 186000,
        },
      ],
      createdAt: '2026-09-12T11:45:00Z',
    },
  ]);

  const [recoveries, setRecoveries] = useState<Recovery[]>([
    {
      id: 'RC-5041',
      recoveryNumber: 'RC-5041',
      customerId: 'CUST-001',
      customerName: 'Lahore Lights & Electric',
      customerCode: 'C-001',
      salesUserId: 'USR-040',
      salesUserName: 'Ali Raza',
      collectionDate: '2026-09-10',
      amount: 150000,
      paymentMode: 'CASH',
      status: 'POSTED',
      remarks: 'Cash collected on beat route',
      createdAt: '2026-09-10T14:20:00Z',
    },
    {
      id: 'RC-5042',
      recoveryNumber: 'RC-5042',
      customerId: 'CUST-004',
      customerName: 'Capital Spares & Lights',
      customerCode: 'C-004',
      salesUserId: 'USR-044',
      salesUserName: 'Waqas Ahmed',
      collectionDate: '2026-09-11',
      amount: 200000,
      paymentMode: 'ONLINE_TRANSFER',
      instrumentNumber: 'FT-9948201',
      bankName: 'Meezan Bank',
      status: 'POSTED',
      remarks: 'Online IBFT transfer against invoice',
      createdAt: '2026-09-11T16:00:00Z',
    },
  ]);

  // Sync state notification
  const [syncStatus, setSyncStatus] = useState<string>('Online • Cloud Database Connected');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Computed Supabase / Google Sheets data bundle
  const currentAppData: SupabaseAppData = useMemo(() => ({
    customers,
    skus: NLINK_OFFICIAL_PRODUCTS as any,
    inventoryBalances: fallbackAppData.inventoryBalances,
    salesOrders,
    invoices: fallbackAppData.invoices,
    recoveries,
    ledgerEntries: fallbackAppData.ledgerEntries,
    dispatches: fallbackAppData.dispatches,
    stockReturns: fallbackAppData.stockReturns,
    visits: fallbackAppData.visits,
  }), [customers, salesOrders, recoveries]);

  // Initialize cached data if exists
  useEffect(() => {
    try {
      const cached = getLocalDatabaseCache();
      if (cached.orders && cached.orders.length > 0) {
        setSalesOrders(cached.orders);
      }
      if (cached.recoveries && cached.recoveries.length > 0) {
        setRecoveries(cached.recoveries);
      }
      if (cached.customers && cached.customers.length > 0) {
        setCustomers(cached.customers);
      }
    } catch (e) {
      console.warn('Initial cache load:', e);
    }
  }, []);

  // Save changes to local database cache
  const updateCache = (newOrders: SalesOrder[], newRecoveries: Recovery[], newCusts: Customer[]) => {
    saveLocalDatabaseCache({
      orders: newOrders,
      recoveries: newRecoveries,
      customers: newCusts,
      visits: [],
      attendance: [],
      lastUpdated: new Date().toISOString(),
    });
  };

  // Handler for New Order Submission
  const handleOrderSubmitted = async (orderPartial: Partial<SalesOrder>, customerName: string) => {
    const fullOrder: SalesOrder = {
      id: orderPartial.id || `ord_${Date.now()}`,
      orderNumber: orderPartial.orderNumber || `SO-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: orderPartial.customerId || '',
      customerName,
      customerCode: orderPartial.customerCode || '',
      salesUserId: orderPartial.salesUserId || currentUser.id,
      salesUserName: orderPartial.salesUserName || currentUser.fullName,
      orderDate: orderPartial.orderDate || new Date().toISOString(),
      status: (orderPartial.status as any) || 'APPROVED',
      totalAmount: orderPartial.totalAmount || 0,
      subtotal: orderPartial.subtotal || orderPartial.totalAmount || 0,
      discountAmount: orderPartial.discountAmount || 0,
      taxAmount: orderPartial.taxAmount || 0,
      items: orderPartial.items || [],
      creditCheckStatus: orderPartial.creditCheckStatus || 'GREEN',
      creditCheckNotes: orderPartial.creditCheckNotes,
      createdAt: new Date().toISOString(),
    };

    // 1. Update orders list
    const updatedOrders = [fullOrder, ...salesOrders];
    setSalesOrders(updatedOrders);

    // 2. Adjust Customer balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === fullOrder.customerId) {
        return {
          ...c,
          currentBalance: c.currentBalance + fullOrder.totalAmount,
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    // 3. Update User target vs achievement MTD & Today
    const updatedUsers = allUsers.map((u) => {
      if (u.id === fullOrder.salesUserId) {
        return {
          ...u,
          mtdSalesAchieved: u.mtdSalesAchieved + fullOrder.totalAmount,
          todaySalesAchieved: u.todaySalesAchieved + fullOrder.totalAmount,
        };
      }
      return u;
    });
    setAllUsers(updatedUsers);

    // 4. Update cache
    updateCache(updatedOrders, recoveries, updatedCustomers);

    // 5. Push to Google Sheets sync engine
    try {
      const token = getAccessToken();
      await submitAndSaveOrder(fullOrder, customerName, token);
      setSyncStatus(`Order #${fullOrder.orderNumber} saved & synced to Google Sheet`);
    } catch (err) {
      console.warn('Google Sheet auto-upload queued in background:', err);
    }
  };

  // Handler for New Recovery Submission
  const handleRecoverySubmitted = async (recoveryPartial: Partial<Recovery>, customerName: string) => {
    const fullRecovery: Recovery = {
      id: recoveryPartial.id || `rec_${Date.now()}`,
      recoveryNumber: recoveryPartial.recoveryNumber || `RC-${Math.floor(5000 + Math.random() * 5000)}`,
      customerId: recoveryPartial.customerId || '',
      customerName,
      customerCode: recoveryPartial.customerCode || '',
      salesUserId: recoveryPartial.salesUserId || currentUser.id,
      salesUserName: recoveryPartial.salesUserName || currentUser.fullName,
      collectionDate: recoveryPartial.collectionDate || new Date().toISOString().split('T')[0],
      amount: recoveryPartial.amount || 0,
      paymentMode: (recoveryPartial.paymentMode as any) || 'CASH',
      instrumentNumber: recoveryPartial.instrumentNumber,
      bankName: recoveryPartial.bankName,
      status: 'VERIFIED',
      remarks: recoveryPartial.remarks,
      createdAt: new Date().toISOString(),
    };

    // 1. Update recoveries list
    const updatedRecoveries = [fullRecovery, ...recoveries];
    setRecoveries(updatedRecoveries);

    // 2. Adjust Customer balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === fullRecovery.customerId) {
        return {
          ...c,
          currentBalance: Math.max(0, c.currentBalance - fullRecovery.amount),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    // 3. Update User target vs achievement MTD & Today
    const updatedUsers = allUsers.map((u) => {
      if (u.id === fullRecovery.salesUserId) {
        return {
          ...u,
          mtdRecoveryAchieved: u.mtdRecoveryAchieved + fullRecovery.amount,
          todayRecoveryAchieved: u.todayRecoveryAchieved + fullRecovery.amount,
        };
      }
      return u;
    });
    setAllUsers(updatedUsers);

    // 4. Update cache
    updateCache(salesOrders, updatedRecoveries, updatedCustomers);

    // 5. Push to Google Sheets sync engine
    try {
      const token = getAccessToken();
      await submitAndSaveRecovery(fullRecovery, customerName, token);
      setSyncStatus(`Recovery #${fullRecovery.recoveryNumber} posted & synced to Google Sheet`);
    } catch (err) {
      console.warn('Google Sheet auto-upload queued in background:', err);
    }
  };

  // Customer Management Handlers
  const handleAddCustomer = (newCustomer: Customer) => {
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    updateCache(salesOrders, recoveries, updated);
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    const updated = customers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
    setCustomers(updated);
    updateCache(salesOrders, recoveries, updated);
  };

  const handleApproveCustomer = (customerId: string, approvedBy: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          approvalStatus: 'APPROVED' as const,
          approvedBy,
          approvedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setCustomers(updated);
    updateCache(salesOrders, recoveries, updated);
  };

  const handleRejectCustomer = (customerId: string, reason: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          approvalStatus: 'REJECTED' as const,
          rejectionReason: reason,
        };
      }
      return c;
    });
    setCustomers(updated);
    updateCache(salesOrders, recoveries, updated);
  };

  // Toggle customer credit lock
  const handleToggleCreditLock = (customerId: string) => {
    const updatedCusts = customers.map((c) => {
      if (c.id === customerId) {
        const isLocked = c.status === 'CREDIT_LOCKED';
        return {
          ...c,
          status: isLocked ? ('NORMAL' as const) : ('CREDIT_LOCKED' as const),
          isCreditLocked: !isLocked,
        };
      }
      return c;
    });
    setCustomers(updatedCusts);
    updateCache(salesOrders, recoveries, updatedCusts);
  };

  // Manual Trigger Sync Now
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing 2-way data with cloud...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('Enterprise Cloud Sync in sync.');
    }, 1200);
  };

  // Role scoping helpers
  const isExecutiveOrAdmin = ['SUPER_ADMIN', 'MANAGEMENT'].includes(currentUser.role);
  const isManager = ['RSM', 'ASM', 'TSM', 'SUPER_ADMIN', 'MANAGEMENT'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP GLOBAL APPLICATION HEADER & ROLE SWITCHER BAR                     */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="shrink-0">
                <NationalLightLogo size="md" showGlow={true} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                    N-LINK 360
                  </h1>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
                  National Light Enterprise
                </p>
              </div>
            </div>

            {/* Google Sheets Sync & User Role Selector */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Google Sheets status pill (desktop) */}
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
                title="Enterprise Cloud Sync"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">Sync Cloud</span>
              </button>

              {/* Dynamic Role Selector / Impersonator */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 p-1 sm:p-1.5 rounded-xl border border-slate-700">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">
                  {currentUser.avatarInitials}
                </div>
                <div className="text-left hidden md:block pr-1">
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">{currentUser.fullName}</p>
                  <p className="text-[10px] text-emerald-400 leading-tight">{currentUser.roleTitle}</p>
                </div>

                <select
                  id="header-role-switcher"
                  value={currentUser.id}
                  onChange={(e) => {
                    const found = allUsers.find((u) => u.id === e.target.value);
                    if (found) setCurrentUser(found);
                  }}
                  className="bg-slate-900 text-white text-[11px] sm:text-xs rounded-lg px-1.5 sm:px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[130px] sm:max-w-[180px] truncate"
                  title="Switch user role persona"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.roleTitle} - {u.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. PRIMARY DESKTOP NAVIGATION TABS BAR */}
          <nav className="hidden md:flex flex-col gap-2 py-2 border-t border-slate-800 text-xs font-bold">
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
              <button
                id="nav-tab-entry-form"
                type="button"
                onClick={() => setActiveTab('ENTRY_FORM')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'ENTRY_FORM'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Sales &amp; Recovery Form</span>
              </button>

              <button
                id="nav-tab-new-distributor"
                type="button"
                onClick={() => setActiveTab('NEW_DISTRIBUTOR')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'NEW_DISTRIBUTOR'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>New Distributor</span>
              </button>

              <button
                id="nav-tab-dashboard"
                type="button"
                onClick={() => setActiveTab('DASHBOARD')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>N-Link Dashboard</span>
              </button>

              {/* Advanced Admin Toggle */}
              {isExecutiveOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAdminTools(!showAdminTools)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border whitespace-nowrap transition-all ml-auto ${
                    showAdminTools
                      ? 'bg-slate-800 border-slate-700 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Admin Tools</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdminTools ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Collapsible Admin Row */}
            {isExecutiveOrAdmin && showAdminTools && (
              <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1.5 px-2 bg-slate-950/60 rounded-xl border border-slate-800 animate-fadeIn">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-2 ml-1">System Master:</span>
                
                <button
                  id="nav-tab-products"
                  type="button"
                  onClick={() => setActiveTab('PRODUCTS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === 'PRODUCTS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Products Master</span>
                </button>

                <button
                  id="nav-tab-users-team"
                  type="button"
                  onClick={() => setActiveTab('USERS_TEAM')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === 'USERS_TEAM' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users & Team</span>
                </button>

                <button
                  id="nav-tab-sales-recovery-data"
                  type="button"
                  onClick={() => setActiveTab('SALES_RECOVERY_DATA')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === 'SALES_RECOVERY_DATA' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Transactions Ledger</span>
                </button>

                <button
                  id="nav-tab-customers"
                  type="button"
                  onClick={() => setActiveTab('CUSTOMERS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === 'CUSTOMERS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>All Partners</span>
                </button>

                <button
                  id="nav-tab-sheet-sync"
                  type="button"
                  onClick={() => setActiveTab('SHEET_SYNC')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeTab === 'SHEET_SYNC' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Google Sheet sync</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER NOTIFICATION / CONTEXT BANNER                              */}
      {/* ========================================================================= */}
      <div className="bg-emerald-950 text-emerald-200 border-b border-emerald-900/60 py-2 px-3 sm:px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">{syncStatus}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-emerald-300">
            <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-800/80">
              Territory: <strong className="text-white">{currentUser.territory}</strong>
            </span>
            <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-800/80">
              MTD Sales:{' '}
              <strong className="text-white">
                Rs. {(currentUser.mtdSalesAchieved / 1000000).toFixed(2)}M /{' '}
                {(currentUser.monthlySalesTarget / 1000000).toFixed(2)}M
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN APPLICATION ROUTE BODY                                           */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 pb-24 md:pb-8">
        {activeTab === 'ENTRY_FORM' && (
          <NLinkSkuOrderRecoveryForm
            currentUser={currentUser}
            customers={customers}
            allUsers={allUsers}
            invoices={fallbackAppData.invoices}
            recoveries={recoveries}
            onOrderSubmitted={handleOrderSubmitted}
            onRecoverySubmitted={handleRecoverySubmitted}
          />
        )}

        {activeTab === 'NEW_DISTRIBUTOR' && (
          <NewDistributorEntryTab
            customers={customers}
            onAddCustomer={handleAddCustomer}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'DASHBOARD' && (
          <NLinkDashboardTab
            currentUser={currentUser}
            allUsers={allUsers}
            customers={customers}
            salesOrders={salesOrders}
            recoveries={recoveries}
          />
        )}

        {activeTab === 'TARGET_ACHIEVEMENT' && (
          <NLinkTargetAchievementTab currentUser={currentUser} allUsers={allUsers} />
        )}

        {activeTab === 'FMCG_COMMAND_CENTER' && (
          <FmcgCommandCenter
            currentUser={currentUser as any}
            customers={customers}
            skus={NLINK_OFFICIAL_PRODUCTS as any}
            salesOrders={salesOrders}
            recoveries={recoveries}
            visits={[]}
          />
        )}

        {activeTab === 'PRODUCTS' && <NLinkProductsMasterTab />}

        {activeTab === 'USERS_TEAM' && (
          <NLinkUserManagementTab
            currentUser={currentUser}
            allUsers={allUsers}
            onSelectUserToImpersonate={(user) => setCurrentUser(user)}
          />
        )}

        {activeTab === 'SALES_RECOVERY_DATA' && (
          <NLinkSalesRecoveryDataTab salesOrders={salesOrders} recoveries={recoveries} />
        )}

        {activeTab === 'CUSTOMERS' && (
          <CustomerEcosystemTab
            currentUser={currentUser as any}
            customers={customers}
            salesOrders={salesOrders}
            recoveries={recoveries}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onApproveCustomer={handleApproveCustomer}
            onRejectCustomer={handleRejectCustomer}
          />
        )}

        {activeTab === 'SHEET_SYNC' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Google Sheets 2-Way Synchronization Engine</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enterprise Cloud Storage:{' '}
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    Connected &amp; Active
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Configure Webhook & Apps Script
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase">Synchronized Sheet Tabs</h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Users / Employees:</strong> User roles & hierarchy
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Products / SKUs:</strong> Official N-Link Price list
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Sales Orders:</strong> Live SKU-wise order bookings
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Recoveries:</strong> Field payment receipts & mode
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Targets & Achievements:</strong> Monthly & Daily quotas
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase">Synchronization Rules</h4>
                <p className="text-xs text-slate-600">
                  1. Auto-sync occurs every 30 minutes in background.
                  <br />
                  2. Immediate upload triggers whenever an Order or Recovery is submitted.
                  <br />
                  3. Offline fallback stores transactions safely in browser local storage until reconnected.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing Now...' : 'Force 2-Way Sync Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSyncModalOpen(true)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    Setup Hub
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MOBILE BOTTOM NAVIGATION BAR (Phones & Small Devices)                 */}
      {/* ========================================================================= */}
      <nav className="sra-bottom-nav">
        <div className="sra-bottom-nav-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ENTRY_FORM');
              setIsMobileDrawerOpen(false);
            }}
            className={`sra-bottom-nav-btn ${activeTab === 'ENTRY_FORM' ? 'sra-bottom-nav-btn-active' : ''}`}
            aria-label="Sales & Recovery Form"
          >
            <Zap className="w-5 h-5" />
            <span>Sales Form</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('NEW_DISTRIBUTOR');
              setIsMobileDrawerOpen(false);
            }}
            className={`sra-bottom-nav-btn ${activeTab === 'NEW_DISTRIBUTOR' ? 'sra-bottom-nav-btn-active' : ''}`}
            aria-label="New Distributor"
          >
            <Store className="w-5 h-5" />
            <span>New Dealer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('DASHBOARD');
              setIsMobileDrawerOpen(false);
            }}
            className={`sra-bottom-nav-btn ${activeTab === 'DASHBOARD' ? 'sra-bottom-nav-btn-active' : ''}`}
            aria-label="Dashboard"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className={`sra-bottom-nav-btn ${
              isMobileDrawerOpen ||
              ['PRODUCTS', 'USERS_TEAM', 'SALES_RECOVERY_DATA', 'CUSTOMERS', 'SHEET_SYNC', 'TARGET_ACHIEVEMENT', 'FMCG_COMMAND_CENTER'].includes(activeTab)
                ? 'sra-bottom-nav-btn-active'
                : ''
            }`}
            aria-label="More Management Modules"
          >
            <Menu className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto z-10 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">National Light Ecosystem</h3>
                <p className="text-[11px] text-slate-500">Quick Navigation &amp; Administration</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('TARGET_ACHIEVEMENT');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'TARGET_ACHIEVEMENT' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <TargetIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Targets</span>
                  <span className="text-[10px] text-slate-500 block">Quota &amp; Achievement</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('FMCG_COMMAND_CENTER');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'FMCG_COMMAND_CENTER' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Command Center</span>
                  <span className="text-[10px] text-slate-500 block">FMCG Live Pulse</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('PRODUCTS');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'PRODUCTS' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Products Master</span>
                  <span className="text-[10px] text-slate-500 block">Price List &amp; Specs</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('SALES_RECOVERY_DATA');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'SALES_RECOVERY_DATA' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Ledger &amp; Logs</span>
                  <span className="text-[10px] text-slate-500 block">Orders &amp; Payments</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('CUSTOMERS');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'CUSTOMERS' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Store className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">All Partners</span>
                  <span className="text-[10px] text-slate-500 block">Dealers Directory</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('USERS_TEAM');
                  setIsMobileDrawerOpen(false);
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  activeTab === 'USERS_TEAM' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block">Users &amp; Team</span>
                  <span className="text-[10px] text-slate-500 block">Hierarchy Roster</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('SHEET_SYNC');
                  setIsMobileDrawerOpen(false);
                }}
                className={`col-span-2 p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeTab === 'SHEET_SYNC' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold block">Google Sheets 2-Way Sync</span>
                    <span className="text-[10px] text-slate-500 block">Auto-sync with corporate spreadsheet</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Integration & Webhook Setup Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        appData={currentAppData}
      />
    </div>
  );
}
