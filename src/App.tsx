/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Light Enterprise Field Intelligence
 * Built to 100% precision matching Stitch Specs & Mobile Screenshots
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NLinkUser, TEAM_USERS, getStoredUsers } from './data/nlink-users-team';
import { Customer, SalesOrder, Recovery, User } from './types';
import { getAccessToken } from './services/googleAuth';
import { AuthGate } from './components/AuthGate';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { EnterpriseHeader } from './components/stitch/EnterpriseHeader';
import { EnterpriseBottomNav, EnterpriseTabType } from './components/stitch/EnterpriseBottomNav';
import { EnterpriseDashboardTab } from './components/stitch/EnterpriseDashboardTab';
import { EnterpriseAttendanceTab } from './components/stitch/EnterpriseAttendanceTab';
import { EnterpriseOrdersTab } from './components/stitch/EnterpriseOrdersTab';
import { EnterpriseDealersTab } from './components/stitch/EnterpriseDealersTab';
import { NLinkKhataView } from './components/stitch/NLinkKhataView';
import { NationalLightRateListModal } from './components/stitch/NationalLightRateListModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { DailyPerformancePDFModal } from './components/stitch/DailyPerformancePDFModal';
import { SettingsModal } from './components/SettingsModal';
import { DualApprovalModal } from './components/stitch/DualApprovalModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { fallbackAppData, SupabaseAppData, loadSupabaseAppData } from './services/supabase-data';
import {
  syncOrderToSupabase,
  syncRecoveryToSupabase,
  syncCustomerToSupabase,
} from './services/dbSync';
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

  // 2. Active User Persona (Null initially to show Login Window, or restored from active session)
  const [currentUser, setCurrentUser] = useState<NLinkUser | null>(() => {
    try {
      const saved = localStorage.getItem('nlink_active_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login handler
  const handleSignIn = async (signedInUser: User) => {
    const storedUsers = getStoredUsers();
    const allAvailable = storedUsers && storedUsers.length > 0 ? storedUsers : TEAM_USERS;
    
    const matched = allAvailable.find(
      (u) => u.email?.toLowerCase() === signedInUser.email?.toLowerCase() || u.id === signedInUser.id
    );

    const userPersona: NLinkUser = matched || {
      id: signedInUser.id || `USR-${Date.now()}`,
      employeeCode: 'EMP-001',
      fullName: signedInUser.fullName || signedInUser.email?.split('@')[0] || 'National Lights Personnel',
      email: signedInUser.email,
      phone: signedInUser.phone || '+92 300 1234567',
      role: signedInUser.role || 'SALES_RECOVERY',
      roleTitle: signedInUser.role || 'Field Officer',
      department: 'SALES_FIELD',
      region: 'National',
      area: 'National',
      territory: 'National',
      assignedTowns: ['Peshawar', 'Rawalpindi', 'Lahore'],
      assignedBeats: ['All Beats'],
      monthlySalesTarget: 5000000,
      monthlyRecoveryTarget: 4000000,
      mtdSalesAchieved: 0,
      mtdRecoveryAchieved: 0,
      todaySalesAchieved: 0,
      todayRecoveryAchieved: 0,
      status: 'ACTIVE',
      avatarInitials: signedInUser.fullName?.slice(0, 2).toUpperCase() || 'NL',
    };

    setCurrentUser(userPersona);
    try {
      localStorage.setItem('nlink_active_logged_user', JSON.stringify(userPersona));
    } catch (e) {}
  };

  const handleSignOut = async () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nlink_active_logged_user');
    } catch (e) {}
  };

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

  // Load cached database on mount & sync with Supabase and purge all mock/dummy dealers, distributors and users
  useEffect(() => {
    const initData = async () => {
      let localCusts: Customer[] = [];
      let localOrders: SalesOrder[] = [];
      let localRecs: Recovery[] = [];

      try {
        // Purge all mock/dummy data immediately on startup, strictly keeping production roster & Shahzadullah
        const purgeRes = purgeMockDataFromState();
        localCusts = purgeRes.remainingCustomers;
        localOrders = purgeRes.remainingOrders;
        localRecs = purgeRes.remainingRecoveries;

        if (!isProductionUser(currentUser)) {
          setCurrentUser(purgeRes.remainingUsers[0]);
        }
      } catch (err) {
        console.warn('Database initialization & purge:', err);
        const cached = getLocalDatabaseCache();
        if (cached?.customers) localCusts = cached.customers;
        if (cached?.orders) localOrders = cached.orders;
        if (cached?.recoveries) localRecs = cached.recoveries;
      }

      setCustomers(localCusts);
      setOrders(localOrders);
      setRecoveries(localRecs);

      // Fetch and merge live Supabase database content
      try {
        console.log('🔄 ERP Startup: Connecting to Supabase database...');
        const liveData = await loadSupabaseAppData(currentUser);
        if (liveData && (liveData.customers.length > 0 || liveData.salesOrders.length > 0 || liveData.recoveries.length > 0)) {
          console.log('✓ Successfully retrieved live Supabase data:', liveData);
          setCustomers(liveData.customers);
          setOrders(liveData.salesOrders);
          setRecoveries(liveData.recoveries);
          syncToCache(liveData.customers, liveData.salesOrders, liveData.recoveries);
        }
      } catch (err: any) {
        console.warn('Supabase remote load bypassed/failed, operating on local sync:', err.message || err);
      }
    };

    initData();
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

  // Automated live real-time synchronization with Google Sheets upon data modifications (Debounced)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    // Acknowledge live changes and auto-sync to Google Sheet in background
    const timer = setTimeout(async () => {
      try {
        console.log('🔄 Live Auto-Sync: Local modifications detected. Syncing to Google Sheets...');
        const result = await executeTwoWaySync(currentAppData, token);
        if (result.success) {
          console.log('✓ Live Auto-Sync Success:', result.message);
        } else {
          console.warn('⚠ Live Auto-Sync Notice:', result.message);
        }
      } catch (err: any) {
        console.error('❌ Live Auto-Sync Failed:', err.message || err);
      }
    }, 2500); // 2.5 seconds debounce to aggregate rapid edits

    return () => clearTimeout(timer);
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
    // Orders start in SUBMITTED state awaiting Shahzad Ullah approval
    const orderPayload: SalesOrder = {
      ...newOrder,
      status: 'SUBMITTED',
      shahzadApproval: 'PENDING',
    };

    if (!isOnline) {
      addToOfflineQueue({ type: 'ORDER', payload: orderPayload });
    } else {
      // Direct live synchronization to Supabase database
      syncOrderToSupabase(orderPayload).catch(err => {
        console.warn('Supabase order upload failed:', err);
      });
    }
    const updatedOrders = [orderPayload, ...orders];
    setOrders(updatedOrders);
    // Ledger balance remains unchanged until officially approved by Shahzad Ullah
    syncToCache(customers, updatedOrders, recoveries);
  };

  const handleRecordRecovery = (newRecovery: Recovery) => {
    // Recoveries start in PENDING_VERIFICATION state awaiting Shahzad Ullah confirmation
    const recoveryPayload: Recovery = {
      ...newRecovery,
      status: 'PENDING_VERIFICATION',
      shahzadApproval: 'PENDING',
    };

    if (!isOnline) {
      addToOfflineQueue({ type: 'RECOVERY', payload: recoveryPayload });
    } else {
      // Direct live synchronization to Supabase database
      syncRecoveryToSupabase(recoveryPayload).catch(err => {
        console.warn('Supabase recovery upload failed:', err);
      });
    }
    const updatedRecoveries = [recoveryPayload, ...recoveries];
    setRecoveries(updatedRecoveries);
    // Ledger balance remains unchanged until officially confirmed by Shahzad Ullah
    syncToCache(customers, orders, updatedRecoveries);
  };

  // Executive Approval Handlers: Shahzad Ullah sole executive signing authority
  const handleApproveOrder = (orderId: string, _approver?: string) => {
    let newlyApprovedOrder: SalesOrder | null = null;

    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        const updated: SalesOrder = {
          ...o,
          shahzadApproval: 'APPROVED',
          shahzadApprovedAt: new Date().toISOString(),
          status: 'APPROVED',
          dualApprovalStatus: 'DUAL_APPROVED',
          approvedBy: 'Shahzad Ullah',
          approvedAt: new Date().toISOString(),
        };

        if (o.status !== 'APPROVED') {
          newlyApprovedOrder = updated;
        }
        return updated;
      }
      return o;
    });

    setOrders(updatedOrders);

    // Immediate ledger posting & balance update upon Shahzad Ullah's approval
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

  const handleRejectOrder = (orderId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          shahzadApproval: 'REJECTED' as const,
          shahzadRejectionReason: finalReason,
          status: 'REJECTED' as const,
          dualApprovalStatus: 'REJECTED' as const,
          rejectionReason: finalReason,
          approvedBy: 'Shahzad Ullah',
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);
  };

  const handleApproveRecovery = (recoveryId: string, _approver?: string) => {
    let newlyVerifiedRecovery: Recovery | null = null;

    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        const updated: Recovery = {
          ...r,
          shahzadApproval: 'APPROVED',
          shahzadApprovedAt: new Date().toISOString(),
          status: 'VERIFIED',
          dualApprovalStatus: 'DUAL_APPROVED',
          verifiedBy: 'Shahzad Ullah',
          verifiedAt: new Date().toISOString(),
        };

        if (r.status !== 'VERIFIED') {
          newlyVerifiedRecovery = updated;
        }
        return updated;
      }
      return r;
    });

    setRecoveries(updatedRecoveries);

    // Credit the customer's ledger balance immediately upon Shahzad Ullah's confirmation
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

  const handleRejectRecovery = (recoveryId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        return {
          ...r,
          shahzadApproval: 'REJECTED' as const,
          shahzadRejectionReason: finalReason,
          status: 'REJECTED' as const,
          rejectionReason: finalReason,
          verifiedBy: 'Shahzad Ullah',
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
      currentUser.email === 'shahzadullah@nationallights.com' ||
      currentUser.email === 'nationallights2026@gmail.com';

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

    if (isOnline) {
      syncCustomerToSupabase(newCustomer).catch((err) => {
        console.warn('Supabase customer upload failed:', err);
      });
    }

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  const handleUpdateDealerAssignment = (customerId: string, salesUserId: string, salesUserName: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const up = {
          ...c,
          salesUserId,
          salesUserName,
          assignedOfficerId: salesUserId,
          assignedOfficerName: salesUserName,
          updatedAt: new Date().toISOString(),
        };
        if (isOnline) {
          syncCustomerToSupabase(up).catch((err) => {
            console.warn('Supabase customer assignment failed:', err);
          });
        }
        return up;
      }
      return c;
    });
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
  };

  const handleApproveDealer = (customerId: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const up = {
          ...c,
          approvalStatus: 'APPROVED' as const,
          isActive: true,
          status: 'NORMAL' as const,
        };
        if (isOnline) {
          syncCustomerToSupabase(up).catch((err) => {
            console.warn('Supabase customer approval failed:', err);
          });
        }
        return up;
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
    if (isOnline) {
      syncCustomerToSupabase(updatedDealer).catch((err) => {
        console.warn('Supabase customer edit failed:', err);
      });
    }
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

  // Pending Executive Approval Count: Items awaiting Shahzad Ullah review
  const pendingApprovalsCount = useMemo(() => {
    const pendingOrds = orders.filter(
      (o) => o.status === 'SUBMITTED' || o.status === 'PENDING_APPROVAL'
    ).length;
    const pendingRecs = recoveries.filter(
      (r) => r.status === 'PENDING_VERIFICATION'
    ).length;
    return pendingOrds + pendingRecs;
  }, [orders, recoveries]);

  if (!currentUser) {
    return (
      <AuthGate
        currentUser={null}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      >
        <div />
      </AuthGate>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#070c14] text-[#191c1e] dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-[#76f4e0] selection:text-[#006f63] transition-colors">
      {/* 1. Universal Enterprise Header */}
      <EnterpriseHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onOpenRateCard={() => setIsRateCardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDualApprovals={() => setIsDualApprovalOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isOnline={isOnline}
        onSignOut={handleSignOut}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onTriggerManualSync={async () => {
          try {
            setLedgerToastMessage('🔄 Sync started. Synchronizing database state...');
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
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
          <NLinkKhataView
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            onPlaceOrder={handlePlaceOrder}
            onRecordRecovery={handleRecordRecovery}
            onAddDealer={handleAddDealer}
            onOpenRateCard={() => setIsRateCardOpen(true)}
            initialSelectedCustomerId={targetedCustomerId}
            selectedAttendanceTown={selectedAttendanceTown}
            isCheckedIn={isCheckedIn}
            onNavigateToAttendance={() => setActiveTab('ATTENDANCE')}
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

      {/* 9. Executive Approval Center Modal (Shahzad Ullah Sole Signing Authority) */}
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
