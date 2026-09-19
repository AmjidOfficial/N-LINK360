/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Light Enterprise Field Intelligence
 * Built to 100% precision matching Stitch Specs & Mobile Screenshots
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NLinkUser, TEAM_USERS } from './data/nlink-users-team';
import { Customer, SalesOrder, Recovery, User } from './types';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { EnterpriseHeader } from './components/stitch/EnterpriseHeader';
import { EnterpriseBottomNav, EnterpriseTabType } from './components/stitch/EnterpriseBottomNav';
import { EnterpriseDashboardTab } from './components/stitch/EnterpriseDashboardTab';
import { EnterpriseAttendanceTab } from './components/stitch/EnterpriseAttendanceTab';
import { EnterpriseOrdersTab } from './components/stitch/EnterpriseOrdersTab';
import { EnterpriseDealersTab } from './components/stitch/EnterpriseDealersTab';
import { NationalLightRateListModal } from './components/stitch/NationalLightRateListModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { DailyPerformancePDFModal } from './components/stitch/DailyPerformancePDFModal';
import { SettingsModal } from './components/SettingsModal';
import { DualApprovalModal } from './components/stitch/DualApprovalModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { fallbackAppData, SupabaseAppData } from './services/supabase-data';
import { NLINK_OFFICIAL_PRODUCTS } from './data/nlink-products';
import {
  getLocalDatabaseCache,
  saveLocalDatabaseCache,
  triggerLedgerApprovalSync,
  executeTwoWaySync,
  registerAppDataProvider,
  startAutoSyncEngine,
  stopAutoSyncEngine,
} from './services/googleSheetsTwoWaySyncService';
import { purgeMockDataFromState, isProductionUser } from './utils/purgeMockData';

export default function App() {
  // 1. Navigation State
  const [activeTab, setActiveTab] = useState<EnterpriseTabType>('ATTENDANCE');

  // Ledger Live Toast Message
  const [ledgerToastMessage, setLedgerToastMessage] = useState<string | null>(null);

  // 2. Active User Persona
  const [currentUser, setCurrentUser] = useState<NLinkUser>(TEAM_USERS[0]);

  // Unified Selected Attendance Town State
  const [selectedAttendanceTown, setSelectedAttendanceTown] = useState<string>(() => {
    return TEAM_USERS[0].assignedTowns?.[0] || 'Peshawar';
  });
  
  // Unified Check-In Time State
  const [checkedInTime, setCheckedInTime] = useState<string | null>('09:12 AM');
  const [checkedOutTime, setCheckedOutTime] = useState<string | null>(null);

  // 3. Attendance Status
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);

  // Synchronize default town when user persona changes
  useEffect(() => {
    if (currentUser && currentUser.assignedTowns && currentUser.assignedTowns.length > 0) {
      // If user has "All Pakistan", set Peshawar or first listed town
      if (currentUser.assignedTowns.includes('All Pakistan')) {
        setSelectedAttendanceTown('Peshawar');
      } else {
        setSelectedAttendanceTown(currentUser.assignedTowns[0]);
      }
    }
  }, [currentUser]);

  // 4. Rate Card, Settings & PDF Modals State
  const [isRateCardOpen, setIsRateCardOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isPDFReportOpen, setIsPDFReportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDualApprovalOpen, setIsDualApprovalOpen] = useState<boolean>(false);

  // 5. Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nlink_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // 6. Network Connectivity & Offline Hook
  const { isOnline, offlineQueue, addToOfflineQueue, clearOfflineQueue } = useOnlineStatus();

  // 8. Selected Dealer for Cross-Navigation
  const [targetedCustomerId, setTargetedCustomerId] = useState<string>('');

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nlink_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nlink_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // 6. Central State Datasets (Clean Initialized - Production State)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);

  // Load cached database on mount & purge all mock/dummy dealers, distributors and users
  useEffect(() => {
    try {
      // Purge all mock/dummy data immediately on startup, strictly keeping Syed Zain & Shahzadullah
      const purgeRes = purgeMockDataFromState();
      setCustomers(purgeRes.remainingCustomers);
      setOrders(purgeRes.remainingOrders);
      setRecoveries(purgeRes.remainingRecoveries);

      if (!isProductionUser(currentUser)) {
        setCurrentUser(purgeRes.remainingUsers[0]);
      }
    } catch (err) {
      console.warn('Database initialization & purge:', err);
      const cached = getLocalDatabaseCache();
      if (cached?.customers) setCustomers(cached.customers);
      if (cached?.orders) setOrders(cached.orders);
      if (cached?.recoveries) setRecoveries(cached.recoveries);
    }
  }, []);

  // Handler to manually trigger full mock/dummy data purge
  const handlePurgeMockData = () => {
    try {
      const purgeRes = purgeMockDataFromState({ customers, orders, recoveries });
      setCustomers(purgeRes.remainingCustomers);
      setOrders(purgeRes.remainingOrders);
      setRecoveries(purgeRes.remainingRecoveries);
      if (!isProductionUser(currentUser)) {
        setCurrentUser(purgeRes.remainingUsers[0]);
      }
      setLedgerToastMessage(`✓ ${purgeRes.message}`);
    } catch (err) {
      console.error('Manual purge error:', err);
    }
  };

  // Synchronize state changes to cache
  const syncToCache = (newCusts: Customer[], newOrds: SalesOrder[], newRecs: Recovery[]) => {
    saveLocalDatabaseCache({
      customers: newCusts,
      orders: newOrds,
      recoveries: newRecs,
      visits: [],
      attendance: [],
      lastUpdated: new Date().toISOString(),
    });
  };

  // Register live app data provider & start Google Sheets auto-sync engine
  useEffect(() => {
    registerAppDataProvider(() => ({
      customers,
      salesOrders: orders,
      invoices: [],
      recoveries,
      skus: NLINK_OFFICIAL_PRODUCTS as any,
      ledgerEntries: [],
      inventoryBalances: [],
      dispatches: [],
      stockReturns: [],
      visits: [],
    }));
    startAutoSyncEngine();
    return () => {
      stopAutoSyncEngine();
    };
  }, [customers, orders, recoveries]);

  // Auto-dismiss ledger notification toast after 4.5 seconds
  useEffect(() => {
    if (ledgerToastMessage) {
      const timer = setTimeout(() => {
        setLedgerToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [ledgerToastMessage]);

  // 7. Core Handlers: Dual Approval & Ledger Posting Architecture
  const handlePlaceOrder = (newOrder: SalesOrder) => {
    // Orders start in PENDING_APPROVAL state awaiting Syed Zain & Shahzad Ullah
    const orderPayload: SalesOrder = {
      ...newOrder,
      status: 'SUBMITTED',
      zainApproval: 'PENDING',
      shahzadApproval: 'PENDING',
    };

    if (!isOnline) {
      addToOfflineQueue({ type: 'ORDER', payload: orderPayload });
    }
    const updatedOrders = [orderPayload, ...orders];
    setOrders(updatedOrders);
    // Ledger balance remains unchanged until fully approved by both Zain & Shahzad
    syncToCache(customers, updatedOrders, recoveries);
  };

  const handleRecordRecovery = (newRecovery: Recovery) => {
    // Recoveries start in PENDING_VERIFICATION state awaiting Syed Zain & Shahzad Ullah
    const recoveryPayload: Recovery = {
      ...newRecovery,
      status: 'PENDING_VERIFICATION',
      zainApproval: 'PENDING',
      shahzadApproval: 'PENDING',
    };

    if (!isOnline) {
      addToOfflineQueue({ type: 'RECOVERY', payload: recoveryPayload });
    }
    const updatedRecoveries = [recoveryPayload, ...recoveries];
    setRecoveries(updatedRecoveries);
    // Ledger balance remains unchanged until fully approved by both Zain & Shahzad
    syncToCache(customers, orders, updatedRecoveries);
  };

  // Executive Approval Handlers: Either Syed Zain OR Shahzad Ullah approval authorizes immediate posting & execution
  const handleApproveOrder = (orderId: string, approver: 'ZAIN' | 'SHAHZAD') => {
    let newlyApprovedOrder: SalesOrder | null = null;

    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        const nextZain = approver === 'ZAIN' ? 'APPROVED' as const : (o.zainApproval || 'PENDING');
        const nextZainDate = approver === 'ZAIN' ? new Date().toISOString() : o.zainApprovedAt;
        const nextShahzad = approver === 'SHAHZAD' ? 'APPROVED' as const : (o.shahzadApproval || 'PENDING');
        const nextShahzadDate = approver === 'SHAHZAD' ? new Date().toISOString() : o.shahzadApprovedAt;

        // Executive Rule: Either Syed Zain OR Shahzad Ullah approved -> go ahead to proceed!
        const isApproved = nextZain === 'APPROVED' || nextShahzad === 'APPROVED';
        const approverName = approver === 'ZAIN' ? 'Syed Zain' : 'Shahzad Ullah';

        const updated: SalesOrder = {
          ...o,
          zainApproval: nextZain,
          zainApprovedAt: nextZainDate,
          shahzadApproval: nextShahzad,
          shahzadApprovedAt: nextShahzadDate,
          status: isApproved ? 'APPROVED' : o.status,
          dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : 'PENDING_DUAL_APPROVAL',
          approvedBy: isApproved
            ? nextZain === 'APPROVED' && nextShahzad === 'APPROVED'
              ? 'Syed Zain & Shahzad Ullah'
              : (o.approvedBy ? `${o.approvedBy} & ${approverName}` : approverName)
            : o.approvedBy,
          approvedAt: isApproved ? (o.approvedAt || new Date().toISOString()) : o.approvedAt,
        };

        if (isApproved && o.status !== 'APPROVED') {
          newlyApprovedOrder = updated;
        }
        return updated;
      }
      return o;
    });

    setOrders(updatedOrders);

    // If approved by either Syed Zain or Shahzad Ullah, trigger immediate ledger posting & balance update
    let updatedCusts = customers;
    if (newlyApprovedOrder) {
      const ord: SalesOrder = newlyApprovedOrder;
      updatedCusts = customers.map((c) => {
        if (c.id === ord.customerId) {
          return {
            ...c,
            currentBalance: (c.currentBalance || 0) + ord.totalAmount,
          };
        }
        return c;
      });
      setCustomers(updatedCusts);

      // Automated Ledger update and Google Sheets synchronization
      triggerLedgerApprovalSync(
        'INVOICE_APPROVED',
        ord.orderNumber,
        ord.customerId,
        {
          customers: updatedCusts,
          salesOrders: updatedOrders,
          invoices: [],
          recoveries,
          skus: NLINK_OFFICIAL_PRODUCTS as any,
          ledgerEntries: [],
          inventoryBalances: [],
          dispatches: [],
          stockReturns: [],
          visits: [],
        }
      );
      setLedgerToastMessage(
        `✓ Invoice ${ord.orderNumber} Approved & Posted to Ledger! Balance updated and Google Sheets synchronized.`
      );
    }

    syncToCache(updatedCusts, updatedOrders, recoveries);
  };

  const handleRejectOrder = (orderId: string, approver: 'ZAIN' | 'SHAHZAD', reason: string) => {
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          zainApproval: approver === 'ZAIN' ? 'REJECTED' as const : o.zainApproval,
          zainRejectionReason: approver === 'ZAIN' ? reason : o.zainRejectionReason,
          shahzadApproval: approver === 'SHAHZAD' ? 'REJECTED' as const : o.shahzadApproval,
          shahzadRejectionReason: approver === 'SHAHZAD' ? reason : o.shahzadRejectionReason,
          status: 'REJECTED' as const,
          dualApprovalStatus: 'REJECTED',
          rejectionReason: reason,
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);
  };

  const handleApproveRecovery = (recoveryId: string, approver: 'ZAIN' | 'SHAHZAD') => {
    let newlyVerifiedRecovery: Recovery | null = null;

    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        const nextZain = approver === 'ZAIN' ? 'APPROVED' as const : (r.zainApproval || 'PENDING');
        const nextZainDate = approver === 'ZAIN' ? new Date().toISOString() : r.zainApprovedAt;
        const nextShahzad = approver === 'SHAHZAD' ? 'APPROVED' as const : (r.shahzadApproval || 'PENDING');
        const nextShahzadDate = approver === 'SHAHZAD' ? new Date().toISOString() : r.shahzadApprovedAt;

        // Executive Rule: Either Syed Zain OR Shahzad Ullah approved -> go ahead to proceed!
        const isVerified = nextZain === 'APPROVED' || nextShahzad === 'APPROVED';
        const approverName = approver === 'ZAIN' ? 'Syed Zain' : 'Shahzad Ullah';

        const updated: Recovery = {
          ...r,
          zainApproval: nextZain,
          zainApprovedAt: nextZainDate,
          shahzadApproval: nextShahzad,
          shahzadApprovedAt: nextShahzadDate,
          status: isVerified ? 'VERIFIED' : r.status,
          dualApprovalStatus: isVerified ? 'DUAL_APPROVED' : 'PENDING_DUAL_APPROVAL',
          verifiedBy: isVerified
            ? nextZain === 'APPROVED' && nextShahzad === 'APPROVED'
              ? 'Syed Zain & Shahzad Ullah'
              : (r.verifiedBy ? `${r.verifiedBy} & ${approverName}` : approverName)
            : r.verifiedBy,
          verifiedAt: isVerified ? (r.verifiedAt || new Date().toISOString()) : r.verifiedAt,
        };

        if (isVerified && r.status !== 'VERIFIED') {
          newlyVerifiedRecovery = updated;
        }
        return updated;
      }
      return r;
    });

    setRecoveries(updatedRecoveries);

    // If verified by either Syed Zain or Shahzad Ullah, credit the customer's ledger balance immediately
    let updatedCusts = customers;
    if (newlyVerifiedRecovery) {
      const rec: Recovery = newlyVerifiedRecovery;
      updatedCusts = customers.map((c) => {
        if (c.id === rec.customerId) {
          return {
            ...c,
            currentBalance: Math.max(0, (c.currentBalance || 0) - rec.amount),
          };
        }
        return c;
      });
      setCustomers(updatedCusts);

      // Automated Ledger update and Google Sheets synchronization
      triggerLedgerApprovalSync(
        'RECOVERY_VERIFIED',
        rec.recoveryNumber,
        rec.customerId,
        {
          customers: updatedCusts,
          salesOrders: orders,
          invoices: [],
          recoveries: updatedRecoveries,
          skus: NLINK_OFFICIAL_PRODUCTS as any,
          ledgerEntries: [],
          inventoryBalances: [],
          dispatches: [],
          stockReturns: [],
          visits: [],
        }
      );
      setLedgerToastMessage(
        `✓ Recovery ${rec.recoveryNumber} Verified & Credited to Ledger! Balance updated and Google Sheets synchronized.`
      );
    }

    syncToCache(updatedCusts, orders, updatedRecoveries);
  };

  const handleRejectRecovery = (recoveryId: string, approver: 'ZAIN' | 'SHAHZAD', reason: string) => {
    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        return {
          ...r,
          zainApproval: approver === 'ZAIN' ? 'REJECTED' as const : r.zainApproval,
          zainRejectionReason: approver === 'ZAIN' ? reason : r.zainRejectionReason,
          shahzadApproval: approver === 'SHAHZAD' ? 'REJECTED' as const : r.shahzadApproval,
          shahzadRejectionReason: approver === 'SHAHZAD' ? reason : r.shahzadRejectionReason,
          status: 'REJECTED' as const,
          rejectionReason: reason,
        };
      }
      return r;
    });

    setRecoveries(updatedRecoveries);
    syncToCache(customers, orders, updatedRecoveries);
  };

  const handleAddDealer = (newDealerData: Partial<Customer>) => {
    const isExecutive =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'MANAGEMENT' ||
      currentUser.email === 'syedzain@nationallights.com' ||
      currentUser.email === 'shahzadullah@nationallights.com';

    const newCustomer: Customer = {
      id: newDealerData.id || `CUST-${Date.now().toString().slice(-6)}`,
      customerCode: newDealerData.customerCode || `DL-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: newDealerData.companyName || 'New Dealer Shop',
      contactPerson: newDealerData.contactPerson || 'Proprietor',
      phone: newDealerData.phone || '+92 300 0000000',
      address: newDealerData.address || 'Trade Zone Commercial Beat',
      territory: newDealerData.territory || 'Commercial Beat',
      region: newDealerData.region || 'Khyber Pakhtunkhwa',
      city: newDealerData.city || 'Peshawar',
      town: newDealerData.town || newDealerData.city || 'Peshawar',
      type: (newDealerData.type as any) || 'DEALER',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: newDealerData.creditLimit || 250000,
      currentBalance: 0,
      creditDays: 30,
      status: isExecutive ? 'NORMAL' : 'PENDING_APPROVAL',
      isActive: isExecutive,
      approvalStatus: isExecutive ? 'APPROVED' : 'PENDING_APPROVAL',
      salesUserId: newDealerData.salesUserId || currentUser.id,
      salesUserName: newDealerData.salesUserName || currentUser.fullName,
      assignedOfficerId: newDealerData.assignedOfficerId || newDealerData.salesUserId || currentUser.id,
      assignedOfficerName: newDealerData.assignedOfficerName || newDealerData.salesUserName || currentUser.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  const handleUpdateDealerAssignment = (customerId: string, salesUserId: string, salesUserName: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          salesUserId,
          salesUserName,
          assignedOfficerId: salesUserId,
          assignedOfficerName: salesUserName,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  const handleApproveDealer = (customerId: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          approvalStatus: 'APPROVED' as const,
          isActive: true,
          status: 'NORMAL' as const,
        };
      }
      return c;
    });
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  // Seamless cross-tab actions
  const handleSelectDealerForLedger = (customerId: string) => {
    setTargetedCustomerId(customerId);
    setActiveTab('LEDGERS');
  };

  const handleSelectDealerForOrder = (customerId: string) => {
    setTargetedCustomerId(customerId);
    setActiveTab('ORDERS');
  };

  const handleEditDealer = (updatedDealer: Customer) => {
    const updated = customers.map((c) => (c.id === updatedDealer.id ? updatedDealer : c));
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  const handleDeleteDealer = (customerId: string) => {
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  // Google Sheets app data
  const currentAppData: SupabaseAppData = {
    customers,
    skus: NLINK_OFFICIAL_PRODUCTS as any,
    inventoryBalances: fallbackAppData.inventoryBalances,
    salesOrders: orders,
    invoices: fallbackAppData.invoices,
    recoveries,
    ledgerEntries: fallbackAppData.ledgerEntries,
    dispatches: fallbackAppData.dispatches,
    stockReturns: fallbackAppData.stockReturns,
    visits: fallbackAppData.visits,
  };

  // Pending Executive Approval Count: Items where neither Syed Zain nor Shahzad Ullah has approved yet
  const pendingApprovalsCount = useMemo(() => {
    const pendingOrds = orders.filter(
      (o) => o.zainApproval !== 'APPROVED' && o.shahzadApproval !== 'APPROVED' && o.status !== 'APPROVED' && o.status !== 'REJECTED'
    ).length;
    const pendingRecs = recoveries.filter(
      (r) => r.zainApproval !== 'APPROVED' && r.shahzadApproval !== 'APPROVED' && r.status !== 'VERIFIED' && r.status !== 'REJECTED'
    ).length;
    return pendingOrds + pendingRecs;
  }, [orders, recoveries]);

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#070c14] text-[#191c1e] dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-[#76f4e0] selection:text-[#006f63] transition-colors">
      {/* 1. Universal Enterprise Header */}
      <EnterpriseHeader
        activeTab={activeTab}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onOpenRateCard={() => setIsRateCardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDualApprovals={() => setIsDualApprovalOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isOnline={isOnline}
        onTriggerManualSync={async () => {
          try {
            setLedgerToastMessage('🔄 Sync started. Contacting Google Sheets...');
            const result = await executeTwoWaySync(currentAppData);
            if (result.success) {
              setLedgerToastMessage(`✓ ${result.message || 'Sync completed successfully!'}`);
            } else {
              setLedgerToastMessage(`⚠ Sync notice: ${result.message || 'Check connection details'}`);
            }
          } catch (err: any) {
            setLedgerToastMessage(`❌ Sync failed: ${err.message || 'Error occurred'}`);
          }
        }}
      />

      {/* Offline Connectivity Notification Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm z-30 animate-slideDown">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">wifi_off</span>
            <span>Offline Mode Active — Orders &amp; Recoveries will be saved locally &amp; synced when back online.</span>
          </div>
          {offlineQueue.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-950 text-amber-300 rounded font-mono text-[10px]">
              {offlineQueue.length} Pending Sync
            </span>
          )}
        </div>
      )}

      {/* Real-time Automated Ledger Sync Toast */}
      {ledgerToastMessage && (
        <div
          id="ledger-live-sync-toast"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#006b5f] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-fadeIn border border-emerald-300/30 max-w-lg mx-auto"
        >
          <span className="material-symbols-outlined text-emerald-200 text-[20px]">sync_saved_locally</span>
          <span className="flex-1">{ledgerToastMessage}</span>
          <button
            type="button"
            onClick={() => setLedgerToastMessage(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Viewport Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-20">
        {activeTab === 'DASHBOARD' && (
          <EnterpriseDashboardTab
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            onNavigateTab={setActiveTab}
            onOpenAddDealer={() => setActiveTab('DEALERS')}
            onOpenRateCard={() => setIsRateCardOpen(true)}
            onOpenPDFReport={() => setIsPDFReportOpen(true)}
            onOpenDualApprovals={() => setIsDualApprovalOpen(true)}
            isCheckedIn={isCheckedIn}
            onToggleCheckIn={() => setIsCheckedIn(!isCheckedIn)}
            checkedInTime={checkedInTime}
            checkedOutTime={checkedOutTime}
            selectedAttendanceTown={selectedAttendanceTown}
            onPurgeMockData={handlePurgeMockData}
          />
        )}

        {activeTab === 'ATTENDANCE' && (
          <EnterpriseAttendanceTab
            currentUser={currentUser}
            isCheckedIn={isCheckedIn}
            onToggleCheckIn={() => setIsCheckedIn(!isCheckedIn)}
            selectedTown={selectedAttendanceTown}
            onSelectTown={setSelectedAttendanceTown}
            checkedInTime={checkedInTime}
            setCheckedInTime={setCheckedInTime}
            orders={orders}
            recoveries={recoveries}
            customers={customers}
          />
        )}

        {activeTab === 'ORDERS' && (
          <EnterpriseOrdersTab
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            onPlaceOrder={handlePlaceOrder}
            onRecordRecovery={handleRecordRecovery}
            onOpenRateCard={() => setIsRateCardOpen(true)}
            initialSelectedCustomerId={targetedCustomerId}
            selectedAttendanceTown={selectedAttendanceTown}
            isCheckedIn={isCheckedIn}
            onNavigateToAttendance={() => setActiveTab('ATTENDANCE')}
            lockModeTo="ENTRY"
            onOpenRegisterDealer={() => setActiveTab('DEALERS')}
          />
        )}

        {activeTab === 'LEDGERS' && (
          <EnterpriseOrdersTab
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            onPlaceOrder={handlePlaceOrder}
            onRecordRecovery={handleRecordRecovery}
            onOpenRateCard={() => setIsRateCardOpen(true)}
            initialSelectedCustomerId={targetedCustomerId}
            selectedAttendanceTown={selectedAttendanceTown}
            isCheckedIn={isCheckedIn}
            onNavigateToAttendance={() => setActiveTab('ATTENDANCE')}
            lockModeTo="LEDGERS"
            initialMode="invoices"
            onOpenRegisterDealer={() => setActiveTab('DEALERS')}
          />
        )}

        {activeTab === 'DEALERS' && (
          <EnterpriseDealersTab
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            onAddDealer={handleAddDealer}
            onEditDealer={handleEditDealer}
            onDeleteDealer={handleDeleteDealer}
            onApproveDealer={handleApproveDealer}
            onSelectDealerForLedger={handleSelectDealerForLedger}
            onSelectDealerForOrder={handleSelectDealerForOrder}
            onUpdateDealerAssignment={handleUpdateDealerAssignment}
          />
        )}
      </main>

      {/* 3. Universal Enterprise Bottom Navigation */}
      <EnterpriseBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 4. National Light Official Rate List Modal */}
      <NationalLightRateListModal
        isOpen={isRateCardOpen}
        onClose={() => setIsRateCardOpen(false)}
      />

      {/* 5. Google Sheets Sync Modal (Accessible via Dashboard) */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        appData={currentAppData}
        onSyncComplete={(msg) => setLedgerToastMessage(msg)}
      />

      {/* 6. Daily Performance PDF Report Modal */}
      <DailyPerformancePDFModal
        currentUser={currentUser}
        customers={customers}
        orders={orders}
        isOpen={isPDFReportOpen}
        onClose={() => setIsPDFReportOpen(false)}
      />

      {/* 8. Application Settings Modal (Auto-Save, Sync, System Preferences) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* 9. Executive Dual Approval Modal (Syed Zain & Shahzad Ullah) */}
      <DualApprovalModal
        isOpen={isDualApprovalOpen}
        onClose={() => setIsDualApprovalOpen(false)}
        currentUser={currentUser}
        orders={orders}
        recoveries={recoveries}
        customers={customers}
        onApproveOrder={handleApproveOrder}
        onRejectOrder={handleRejectOrder}
        onApproveRecovery={handleApproveRecovery}
        onRejectRecovery={handleRejectRecovery}
      />
    </div>
  );
}
