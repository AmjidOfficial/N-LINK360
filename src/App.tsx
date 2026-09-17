/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Light Enterprise Field Intelligence
 * Built to 100% precision matching Stitch Specs & Mobile Screenshots
 */

import React, { useState, useEffect } from 'react';
import { NLinkUser, TEAM_USERS } from './data/nlink-users-team';
import { Customer, SalesOrder, Recovery } from './types';
import { EnterpriseHeader } from './components/stitch/EnterpriseHeader';
import { EnterpriseBottomNav, EnterpriseTabType } from './components/stitch/EnterpriseBottomNav';
import { EnterpriseDashboardTab } from './components/stitch/EnterpriseDashboardTab';
import { EnterpriseAttendanceTab } from './components/stitch/EnterpriseAttendanceTab';
import { EnterpriseOrdersTab } from './components/stitch/EnterpriseOrdersTab';
import { EnterpriseDealersTab } from './components/stitch/EnterpriseDealersTab';
import { NationalLightRateListModal } from './components/stitch/NationalLightRateListModal';
import { GoogleSheetsIntegrationModal } from './components/GoogleSheetsIntegrationModal';
import { BiometricLockModal } from './components/stitch/BiometricLockModal';
import { DailyPerformancePDFModal } from './components/stitch/DailyPerformancePDFModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { fallbackAppData, SupabaseAppData } from './services/supabase-data';
import { NLINK_OFFICIAL_PRODUCTS } from './data/nlink-products';
import {
  getLocalDatabaseCache,
  saveLocalDatabaseCache,
} from './services/googleSheetsTwoWaySyncService';

export default function App() {
  // 1. Navigation State
  const [activeTab, setActiveTab] = useState<EnterpriseTabType>('ATTENDANCE');

  // 2. Active User Persona
  const [currentUser, setCurrentUser] = useState<NLinkUser>(TEAM_USERS[0]);

  // Unified Selected Attendance Town State
  const [selectedAttendanceTown, setSelectedAttendanceTown] = useState<string>(() => {
    return TEAM_USERS[0].assignedTowns?.[0] || 'Peshawar';
  });
  
  // Unified Check-In Time State
  const [checkedInTime, setCheckedInTime] = useState<string | null>('09:12 AM');

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

  // 4. Rate Card & PDF Modals State
  const [isRateCardOpen, setIsRateCardOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isPDFReportOpen, setIsPDFReportOpen] = useState<boolean>(false);

  // 5. Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nlink_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // 6. Security & Biometric Lock State
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // 7. Network Connectivity & Offline Hook
  const { isOnline, offlineQueue, addToOfflineQueue, clearOfflineQueue } = useOnlineStatus();

  // 8. Selected Dealer for Cross-Navigation
  const [targetedCustomerId, setTargetedCustomerId] = useState<string>('CUST-001');

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

  // 6. Central State Datasets (Pre-populated with verified enterprise data)
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'CUST-001',
      customerCode: 'DL-8839',
      companyName: 'Apex Industrial Supply',
      contactPerson: 'Marcus Vance',
      phone: '+92 300 4123456',
      address: 'Shop #42, North District Commercial Beat',
      city: 'Peshawar',
      territory: 'North District',
      region: 'Khyber Pakhtunkhwa',
      type: 'DISTRIBUTOR',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: 25000,
      creditDays: 30,
      currentBalance: 18450,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'CUST-002',
      customerCode: 'DL-1042',
      companyName: 'Metro Hardware Hub',
      contactPerson: 'Sarah Jenkins',
      phone: '+92 321 8345678',
      address: 'Shop #12, Central Metro Beat',
      city: 'Peshawar',
      territory: 'Central Metro',
      region: 'Khyber Pakhtunkhwa',
      type: 'DEALER',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: 10000,
      creditDays: 15,
      currentBalance: 0,
      status: 'PENDING_APPROVAL',
      isActive: false,
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'CUST-003',
      customerCode: 'DL-9921',
      companyName: 'Summit Builders Supply',
      contactPerson: 'David Ross',
      phone: '+92 300 2901234',
      address: 'West Hills Industrial Trade Beat',
      city: 'Peshawar',
      territory: 'West Hills',
      region: 'Khyber Pakhtunkhwa',
      type: 'DISTRIBUTOR',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: 50000,
      creditDays: 45,
      currentBalance: 32100,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'CUST-004',
      customerCode: 'DL-3011',
      companyName: 'GreenTech Hub Peshawar',
      contactPerson: 'Zia-ul-Haq',
      phone: '+92 333 9456789',
      address: 'Shop #09, University Road Beat',
      city: 'Peshawar',
      territory: 'University Road',
      region: 'Khyber Pakhtunkhwa',
      type: 'DEALER',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: 15000,
      creditDays: 30,
      currentBalance: 4200,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    },
  ]);

  const [orders, setOrders] = useState<SalesOrder[]>([
    {
      id: 'ORD-9021',
      orderNumber: 'INV-2023-9021',
      customerId: 'CUST-001',
      customerName: 'Apex Industrial Supply',
      customerCode: 'DL-8839',
      salesUserId: 'USR-040',
      salesUserName: 'Alex Mercer',
      orderDate: '2023-10-24',
      subtotal: 1240.0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 1240.0,
      status: 'APPROVED',
      creditCheckStatus: 'GREEN',
      items: [],
      createdAt: '2023-10-24T10:45:00Z',
    },
    {
      id: 'ORD-9018',
      orderNumber: 'INV-2023-9018',
      customerId: 'CUST-002',
      customerName: 'Metro Hardware Hub',
      customerCode: 'DL-1042',
      salesUserId: 'USR-040',
      salesUserName: 'Alex Mercer',
      orderDate: '2023-10-22',
      subtotal: 3450.0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 3450.0,
      status: 'SUBMITTED',
      creditCheckStatus: 'GREEN',
      items: [],
      createdAt: '2023-10-22T09:30:00Z',
    },
    {
      id: 'ORD-8994',
      orderNumber: 'INV-2023-8994',
      customerId: 'CUST-003',
      customerName: 'Summit Builders Supply',
      customerCode: 'DL-9921',
      salesUserId: 'USR-040',
      salesUserName: 'Alex Mercer',
      orderDate: '2023-10-19',
      subtotal: 7750.0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 7750.0,
      status: 'APPROVED',
      creditCheckStatus: 'GREEN',
      items: [],
      createdAt: '2023-10-19T08:15:00Z',
    },
  ]);

  const [recoveries, setRecoveries] = useState<Recovery[]>([
    {
      id: 'REC-8821',
      recoveryNumber: 'RC-8821',
      customerId: 'CUST-001',
      customerName: 'Apex Industrial Supply',
      customerCode: 'DL-8839',
      salesUserId: 'USR-040',
      salesUserName: 'Alex Mercer',
      amount: 2000.0,
      collectionDate: '2023-10-08',
      paymentMode: 'ONLINE_TRANSFER',
      instrumentNumber: 'TXN99482',
      bankName: 'Meezan Bank',
      status: 'VERIFIED',
      remarks: 'Bank Transfer against invoice #INV-93112',
      createdAt: '2023-10-08T14:20:00Z',
    },
    {
      id: 'REC-8501',
      recoveryNumber: 'RC-8501',
      customerId: 'CUST-001',
      customerName: 'Apex Industrial Supply',
      customerCode: 'DL-8839',
      salesUserId: 'USR-040',
      salesUserName: 'Alex Mercer',
      amount: 3000.0,
      collectionDate: '2023-09-15',
      paymentMode: 'CASH',
      instrumentNumber: 'Receipt #44',
      status: 'VERIFIED',
      remarks: 'Cash Collection on beat visit',
      createdAt: '2023-09-15T10:00:00Z',
    },
  ]);

  // Load cached database on mount
  useEffect(() => {
    try {
      const cached = getLocalDatabaseCache();
      if (cached?.customers && cached.customers.length > 0) {
        setCustomers(cached.customers);
      }
      if (cached?.orders && cached.orders.length > 0) {
        setOrders(cached.orders);
      }
      if (cached?.recoveries && cached.recoveries.length > 0) {
        setRecoveries(cached.recoveries);
      }
    } catch (err) {
      console.warn('Database initialization:', err);
    }
  }, []);

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

  // 7. Core Handlers
  const handlePlaceOrder = (newOrder: SalesOrder) => {
    if (!isOnline) {
      addToOfflineQueue({ type: 'ORDER', payload: newOrder });
    }
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);

    // Update customer balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === newOrder.customerId) {
        return {
          ...c,
          currentBalance: (c.currentBalance || 0) + newOrder.totalAmount,
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);
  };

  const handleRecordRecovery = (newRecovery: Recovery) => {
    if (!isOnline) {
      addToOfflineQueue({ type: 'RECOVERY', payload: newRecovery });
    }
    const updatedRecoveries = [newRecovery, ...recoveries];
    setRecoveries(updatedRecoveries);

    // Reduce customer balance
    const updatedCustomers = customers.map((c) => {
      if (c.id === newRecovery.customerId) {
        return {
          ...c,
          currentBalance: Math.max(0, (c.currentBalance || 0) - newRecovery.amount),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, orders, updatedRecoveries);
  };

  const handleAddDealer = (newDealerData: Partial<Customer>) => {
    const newCustomer: Customer = {
      id: newDealerData.id || `CUST-${Date.now().toString().slice(-6)}`,
      customerCode: newDealerData.customerCode || `DL-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: newDealerData.companyName || 'New Dealer Shop',
      contactPerson: newDealerData.contactPerson || 'Proprietor',
      phone: newDealerData.phone || '+92 300 0000000',
      address: newDealerData.address || 'Peshawar Trade Zone',
      territory: newDealerData.territory || 'North District',
      region: 'Khyber Pakhtunkhwa',
      city: newDealerData.city || 'Peshawar',
      type: (newDealerData.type as any) || 'DEALER',
      openingBalance: 0,
      isCreditLocked: false,
      creditLimit: newDealerData.creditLimit || 25000,
      currentBalance: 0,
      creditDays: 30,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newCustomer, ...customers];
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

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#070c14] text-[#191c1e] dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-[#76f4e0] selection:text-[#006f63] transition-colors">
      {/* 1. Universal Enterprise Header */}
      <EnterpriseHeader
        activeTab={activeTab}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onOpenRateCard={() => setIsRateCardOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onTriggerLock={() => setIsAppLocked(true)}
        isOnline={isOnline}
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
            isCheckedIn={isCheckedIn}
            onToggleCheckIn={() => setIsCheckedIn(!isCheckedIn)}
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
          />
        )}

        {activeTab === 'DEALERS' && (
          <EnterpriseDealersTab
            currentUser={currentUser}
            customers={customers}
            onAddDealer={handleAddDealer}
            onApproveDealer={handleApproveDealer}
            onSelectDealerForLedger={handleSelectDealerForLedger}
            onSelectDealerForOrder={handleSelectDealerForOrder}
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
      <GoogleSheetsIntegrationModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        appData={currentAppData}
      />

      {/* 6. Biometric Lock Modal */}
      <BiometricLockModal
        currentUser={currentUser}
        isOpen={isAppLocked}
        onUnlockSuccess={() => setIsAppLocked(false)}
        onCancelLock={() => setIsAppLocked(false)}
      />

      {/* 7. Daily Performance PDF Report Modal */}
      <DailyPerformancePDFModal
        currentUser={currentUser}
        customers={customers}
        orders={orders}
        isOpen={isPDFReportOpen}
        onClose={() => setIsPDFReportOpen(false)}
      />
    </div>
  );
}
