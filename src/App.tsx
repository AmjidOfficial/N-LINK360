import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SupabaseAppData,
  emptyData,
  loadSupabaseAppData,
} from './services/supabase-data';
import {
  User,
  Customer,
  AuditLog,
} from './types';
import { ImportEntityType } from './services/importEngine';
import { initialAuditLogs } from './services/store';
import { AuthGate } from './components/AuthGate';
import {
  NeumorphicHeader,
  MainDomain,
  OperationSubTab,
  ReportSubTab,
} from './components/NeumorphicHeader';
import { NeumorphicExecutiveDashboard } from './components/NeumorphicExecutiveDashboard';
import { NeumorphicOperationDomain } from './components/NeumorphicOperationDomain';
import { NeumorphicReportsDomain } from './components/NeumorphicReportsDomain';
import { NeumorphicSidebar } from './components/NeumorphicSidebar';
import { ExcelImportModal } from './components/ExcelImportModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuditLogViewerModal } from './components/AuditLogViewerModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { syncManager } from './services/offlineSyncEngine';
import { getCurrentUser, signOut } from './services/auth';
import { isSupabaseConfigured } from './lib/supabase';
import { isAdminUser, isFieldForceUser, isMultiRoleEligibleEmail } from './services/production-users';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { registerCustomerPending, approveCustomerRegistration, rejectCustomerRegistration } from './services/supabase-transactions';
import { GoogleSheetsIntegrationModal } from './components/GoogleSheetsIntegrationModal';
import { FinancialSyncToast } from './components/FinancialSyncToast';
import { ToastContainer, toast } from './components/ui/ToastNotification';
import {
  recordSessionStart,
  checkMidnightCutoff,
  prepareDataForNextDay,
} from './services/daily-cutoff';

function AuthenticatedApp({ currentUser, onSignOut }: { currentUser: User; onSignOut: () => Promise<void> }) {
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View Mode: Sales Team is strictly locked to MOBILE view, Enterprise portal only for executive admins/accounts
  const isSalesForce = isFieldForceUser(currentUser);
  const [viewMode, setViewMode] = useState<'MOBILE' | 'ENTERPRISE'>(
    isSalesForce ? 'MOBILE' : 'ENTERPRISE'
  );
  const effectiveViewMode = isSalesForce ? 'MOBILE' : viewMode;

  // 3 Primary Domains & Sub-Tab Navigation
  const [activeDomain, setActiveDomain] = useState<MainDomain>('DASHBOARDS');
  const [activeOpTab, setActiveOpTab] = useState<OperationSubTab>('COMPANY');
  const [activeRepTab, setActiveRepTab] = useState<ReportSubTab>('SALES');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const canAccessOperations = isAdminUser(currentUser) || currentUser.role === 'ACCOUNTS' || currentUser.role === 'WAREHOUSE_MANAGER';

  // Security guard: redirect non-admins away from Operations Domain
  useEffect(() => {
    if (activeDomain === 'OPERATIONS' && !canAccessOperations) {
      setActiveDomain('DASHBOARDS');
    }
  }, [activeDomain, canAccessOperations]);

  // Global Modals State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  const [toastInfo, setToastInfo] = useState<{
    isVisible: boolean;
    elapsedSeconds: number;
    title: string;
    recordCount: number;
  }>({
    isVisible: false,
    elapsedSeconds: 0,
    title: 'Financial Data Synchronized',
    recordCount: 0,
  });
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const lastSyncTimestampRef = useRef<number>(Date.now());
  const hasInitiallyLoadedRef = useRef<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(() => new Date());
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [failedOfflineCount, setFailedOfflineCount] = useState(0);
  const [syncModalInitialTab, setSyncModalInitialTab] = useState<'FAILED' | 'PENDING' | 'HISTORY' | 'ALL'>('FAILED');

  const handleOpenOfflineSync = useCallback((tab: 'FAILED' | 'PENDING' | 'HISTORY' | 'ALL' = 'FAILED') => {
    setSyncModalInitialTab(tab);
    setIsOfflineSyncOpen(true);
  }, []);

  const refresh = useCallback(async (isBackground = false) => {
    // Only show full-screen blocking loader on initial cold start before any data has loaded
    const shouldBlock = !hasInitiallyLoadedRef.current && !isBackground;
    if (shouldBlock) {
      setLoading(true);
    } else {
      setIsBackgroundSyncing(true);
    }
    setError('');
    try {
      const freshData = await loadSupabaseAppData(currentUser);
      setData((prev) => {
        // Merge & preserve any locally submitted pending customers that might not yet be returned by Supabase
        const pendingLocal = prev.customers.filter(
          (c) =>
            (c.approvalStatus === 'PENDING_APPROVAL' || c.status === 'PENDING_APPROVAL' || !c.isActive) &&
            !freshData.customers.some((fc) => fc.id === c.id || (fc.customerCode && fc.customerCode === c.customerCode))
        );
        return {
          ...freshData,
          customers: [...pendingLocal, ...freshData.customers],
        };
      });
      hasInitiallyLoadedRef.current = true;

      const now = Date.now();
      const elapsed = Math.max(1, Math.round((now - lastSyncTimestampRef.current) / 1000));
      lastSyncTimestampRef.current = now;
      setLastRefreshTime(new Date());

      if (isBackground || hasInitiallyLoadedRef.current) {
        const totalEntities =
          freshData.customers.length +
          freshData.invoices.length +
          freshData.ledgerEntries.length +
          freshData.salesOrders.length;

        setToastInfo({
          isVisible: true,
          elapsedSeconds: elapsed,
          title: 'Financial Sync Complete',
          recordCount: totalEntities,
        });
      }
    } catch (err) {
      if (shouldBlock) {
        setError(err instanceof Error ? err.message : 'Unable to load N-LINK data.');
      } else {
        console.warn('Background sync note:', err);
      }
    } finally {
      if (shouldBlock) {
        setLoading(false);
      } else {
        setIsBackgroundSyncing(false);
      }
    }
  }, [currentUser]);

  // Sync Manager Queue Status & Automatic Push on Connectivity Restoration
  useEffect(() => {
    let isMounted = true;

    const checkPending = () => {
      try {
        const count = syncManager.getPendingCount();
        if (isMounted) {
          setPendingOfflineCount(count);
        }
      } catch (err) {
        console.warn('Failed to query offline transactions:', err);
      }
    };

    checkPending();

    // Listen for queue updates
    const unsubscribeQueue = syncManager.subscribeQueue((queue) => {
      if (isMounted) {
        const pending = (queue || []).filter((item) => item.status === 'PENDING_SYNC').length;
        const failed = (queue || []).filter((item) => item.status === 'FAILED').length;
        setPendingOfflineCount(pending);
        setFailedOfflineCount(failed);
      }
    });

    // Listen for sync completion events from syncManager
    const unsubscribeCompletion = syncManager.onSyncComplete((result) => {
      checkPending();
      if (result.syncedCount > 0 || result.failedCount > 0) {
        // Automatically refresh app data so newly synced records reflect in tables and metrics
        void refresh(true);
        if (result.failedCount > 0) {
          toast.error(
            'Background Sync Failure',
            `${result.failedCount} transaction(s) failed to sync to Supabase. Click Offline Sync to view error details.`
          );
        }
        setToastInfo({
          isVisible: true,
          elapsedSeconds: 1,
          title:
            result.failedCount === 0
              ? `Offline Sync Complete (${result.syncedCount} pushed to Supabase)`
              : `Offline Sync: ${result.syncedCount} pushed, ${result.failedCount} failed`,
          recordCount: result.syncedCount + result.failedCount,
        });
      }
    });

    // Connectivity Restoration Watchdog: automatically sync queued field officer data when online returns
    const handleOnline = async () => {
      console.log('[SyncEngine] Connectivity restored: Inspecting pending offline queue...');
      try {
        const count = syncManager.getPendingCount();
        if (isMounted) setPendingOfflineCount(count);
        if (count > 0) {
          console.log(`[SyncEngine] Automatically pushing ${count} offline records to Supabase...`);
          setToastInfo({
            isVisible: true,
            elapsedSeconds: 1,
            title: `Network Restored: Syncing ${count} offline items...`,
            recordCount: count,
          });
          await syncManager.syncQueue();
        }
      } catch (err) {
        console.error('[SyncEngine] Auto-sync error upon connectivity restoration:', err);
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      unsubscribeQueue();
      unsubscribeCompletion();
      window.removeEventListener('online', handleOnline);
    };
  }, [refresh]);

  // Auto-dismiss the financial sync toast after 4.5 seconds
  useEffect(() => {
    if (!toastInfo.isVisible) return;
    const timer = setTimeout(() => {
      setToastInfo((prev) => ({ ...prev, isVisible: false }));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastInfo.isVisible, toastInfo.elapsedSeconds]);

  // Periodic background financial sync every 60s & on tab focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    }, 60000);

    const handleWindowFocus = () => {
      if (Date.now() - lastSyncTimestampRef.current > 30000) {
        void refresh(true);
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleImportSuccess = async (entityType: ImportEntityType, importedRows: any[], overwriteExisting: boolean) => {
    setAuditLogs((prev) => [
      {
        id: `audit-import-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'IMPORT',
        module: entityType === 'CUSTOMERS' ? 'CUSTOMERS' : entityType === 'PRODUCTS_SKUS' ? 'INVENTORY' : 'MASTER_DATA',
        recordId: `BATCH-${entityType}-${Date.now()}`,
        details: `Imported ${importedRows.length} ${entityType} records with overwrite=${overwriteExisting}.`,
      },
      ...prev,
    ]);

    await refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#E8ECF2] text-slate-800">
        <div className="text-center nm-flat p-8 rounded-3xl border border-white">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-teal-600" />
          <p className="text-sm font-bold text-slate-700">Loading N-LINK 360 Workspace…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#E8ECF2] px-4 text-slate-800">
        <div className="w-full max-w-lg rounded-3xl nm-flat p-6 border border-white">
          <h1 className="text-lg font-black text-rose-700">N-LINK data connection failed</h1>
          <p className="mt-2 text-xs text-slate-600">{error}</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => void refresh()}
              className="nm-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
            >
              Retry
            </button>
            <button
              onClick={() => void onSignOut()}
              className="nm-btn px-4 py-2 text-xs font-bold rounded-xl text-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveViewMode === 'MOBILE') {
    return (
      <div className="min-h-screen bg-[#E8ECF2] text-slate-800 py-4 px-2 sm:px-4">
        <SalesRecoveryApp
          currentUser={currentUser as any}
          customers={data.customers}
          skus={data.skus}
          inventoryBalances={data.inventoryBalances}
          visits={data.visits}
          salesOrders={data.salesOrders}
          recoveries={data.recoveries}
          invoices={data.invoices}
          ledgerEntries={data.ledgerEntries}
          lastRefreshTime={lastRefreshTime}
          onLogout={onSignOut}
          onRefresh={refresh}
          onOpenOfflineSync={handleOpenOfflineSync}
          pendingOfflineCount={pendingOfflineCount}
          onBookOrder={async (order) => {
            if (!navigator.onLine) {
              syncManager.enqueue('ORDERS', 'CREATE', {
                order,
                customerId: order.customerId,
                recoveryAmount: 0,
              });
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.info(
                'Order Saved Offline',
                `Order #${order.orderNumber || order.id} queued for background sync.`
              );
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Order Queued Offline',
                recordCount: count,
              });
              return;
            }
            try {
              const { submitOrder } = await import('./services/supabase-transactions');
              await submitOrder(order as any);
              await refresh(true);
              toast.success(
                'Order Placed Successfully',
                `Sales Order #${order.orderNumber || order.id} saved to database.`
              );
            } catch (err: any) {
              console.warn('Online submit failed, queueing offline transaction:', err);
              syncManager.enqueue('ORDERS', 'CREATE', {
                order,
                customerId: order.customerId,
                recoveryAmount: 0,
              });
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.warning(
                'Order Queued Offline',
                'Network deferred: order stored locally for automated sync.'
              );
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Order Queued for Sync',
                recordCount: count,
              });
            }
          }}
          onRecordRecovery={async (rec) => {
            if (!navigator.onLine) {
              syncManager.enqueue('RECOVERY', 'CREATE', rec as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.info(
                'Payment Saved Offline',
                `Payment of Rs. ${Number(rec.amount || 0).toLocaleString()} queued for background sync.`
              );
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Payment Queued Offline',
                recordCount: count,
              });
              return;
            }
            try {
              const { recordRecovery } = await import('./services/supabase-transactions');
              await recordRecovery(rec);
              await refresh(true);
              toast.success(
                'Recovery Recorded Successfully',
                `Payment of Rs. ${Number(rec.amount || 0).toLocaleString()} recorded and verified.`
              );
            } catch (err: any) {
              console.warn('Online recovery failed, queueing offline transaction:', err);
              syncManager.enqueue('RECOVERY', 'CREATE', rec as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.warning(
                'Payment Queued Offline',
                'Network deferred: recovery payment stored locally for sync.'
              );
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Recovery Queued for Sync',
                recordCount: count,
              });
            }
          }}
          onLogVisit={async (visit) => {
            if (!navigator.onLine) {
              syncManager.enqueue('VISITS', 'CREATE', visit as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.info('Visit Queued Offline', 'Visit report queued for sync.');
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Visit Queued Offline',
                recordCount: count,
              });
              return;
            }
            try {
              const { logVisit } = await import('./services/supabase-transactions');
              await logVisit(visit);
              await refresh(true);
              toast.success('Customer Visit Logged', `Field visit report saved.`);
            } catch (err: any) {
              console.warn('Online visit failed, queueing offline transaction:', err);
              syncManager.enqueue('VISITS', 'CREATE', visit as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              toast.warning('Visit Queued Offline', 'Visit stored locally for sync.');
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Visit Queued for Sync',
                recordCount: count,
              });
            }
          }}
          onSubmitRegistration={async (reg) => {
            const isAutoApproved =
              reg.approvalStatus === 'APPROVED' ||
              reg.isActive === true ||
              isAdminUser(currentUser) ||
              (currentUser.role as string) === 'SUPER_ADMIN' ||
              (currentUser.role as string) === 'HEAD_OFFICE';

            const custCode = reg.customerCode || `CUST-REG-${Math.floor(100000 + Math.random() * 900000)}`;
            const newCustObj: any = {
              id: reg.id || `cust-reg-${Date.now()}`,
              customerCode: custCode,
              companyName: reg.businessName || reg.name || reg.companyName || 'New Commercial Partner',
              name: reg.businessName || reg.name || reg.companyName || 'New Commercial Partner',
              customerType: reg.customerType || reg.type || 'DEALER',
              type: reg.customerType || reg.type || 'DEALER',
              region: reg.region || (currentUser as any).region || 'Punjab Central',
              area: reg.area || '',
              town: reg.town || reg.city || '',
              city: reg.town || reg.city || '',
              territory: reg.territory || reg.region || '',
              address: reg.address || '',
              contactPerson: reg.contactPerson || reg.ownerName || reg.name || '',
              ownerName: reg.ownerName || reg.contactPerson || reg.name || '',
              phone: reg.contactNumber || reg.phone || reg.mobile || '',
              mobile: reg.contactNumber || reg.phone || reg.mobile || '',
              creditLimit: Number(reg.proposedCreditLimit ?? reg.creditLimit) || 1000000,
              creditDays: Number(reg.proposedCreditDays ?? reg.creditDays) || 30,
              currentBalance: Number(reg.proposedOpeningBalance ?? reg.openingBalance) || 0,
              openingBalance: Number(reg.proposedOpeningBalance ?? reg.openingBalance) || 0,
              isActive: isAutoApproved ? true : (reg.isActive ?? false),
              approvalStatus: isAutoApproved ? 'APPROVED' : (reg.approvalStatus || 'PENDING_APPROVAL'),
              status: isAutoApproved ? 'NORMAL' : (reg.status || 'PENDING_APPROVAL'),
              createdByUserId: currentUser.id,
              createdBy: currentUser.id,
              creatorEmail: currentUser.email,
              registeredBy: currentUser.email,
              submittedById: currentUser.id,
              submittedBy: currentUser.fullName,
              salesUserId: currentUser.id,
              salesUserName: currentUser.fullName,
              assignedOfficerId: reg.assignedOfficerId || currentUser.id,
              assignedOfficerName: reg.assignedOfficerName || currentUser.fullName,
              assignedTsm: reg.assignedTsm || currentUser.fullName,
              tags: reg.tags || [],
              cnic: reg.cnic || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Update in-memory state immediately so UI provides instant feedback
            setData((prev) => ({
              ...prev,
              customers: [newCustObj, ...prev.customers.filter((c) => c.id !== newCustObj.id)],
            }));

            // Sync with Google Sheets live database if connected
            try {
              const sheetToken = localStorage.getItem('nlink_live_sheets_token');
              if (sheetToken) {
                const sheetId = localStorage.getItem('nlink_active_google_sheet_id') || '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo';
                const { pushCustomerToGoogleSheet } = await import('./services/googleSheetsLiveService');
                await pushCustomerToGoogleSheet(sheetId, newCustObj, sheetToken);
              }
            } catch (sheetErr) {
              console.warn('Google Sheets dealer push note:', sheetErr);
            }

            if (!navigator.onLine) {
              syncManager.enqueue('CUSTOMERS', 'CREATE', reg as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Customer Onboarding Queued Offline',
                recordCount: count,
              });
              return;
            }
            try {
              if (isAutoApproved) {
                await approveCustomerRegistration(newCustObj.id, currentUser.fullName);
              } else {
                await registerCustomerPending(reg);
              }
              await refresh(true);
            } catch (err) {
              console.warn('Online registration note, queueing offline transaction:', err);
              syncManager.enqueue('CUSTOMERS', 'CREATE', reg as any);
              const count = syncManager.getPendingCount();
              setPendingOfflineCount(count);
              setToastInfo({
                isVisible: true,
                elapsedSeconds: 1,
                title: 'Customer Queued for Sync',
                recordCount: count,
              });
            }
          }}
          onToggleViewMode={
            !isSalesForce && isAdminUser(currentUser)
              ? () => setViewMode('ENTERPRISE')
              : undefined
          }
        />

        {/* Global Offline Sync Queue Inspector Modal */}
        <OfflineSyncModal
          isOpen={isOfflineSyncOpen}
          onClose={() => setIsOfflineSyncOpen(false)}
          initialTab={syncModalInitialTab}
        />

        {/* Universal Action Feedback Toast Container */}
        <ToastContainer />

        {/* Operational / Financial Toast for Field Force */}
        <FinancialSyncToast
          isVisible={toastInfo.isVisible}
          onClose={() => setToastInfo((prev) => ({ ...prev, isVisible: false }))}
          lastRefreshTime={lastRefreshTime}
          elapsedSeconds={toastInfo.elapsedSeconds}
          syncTitle={toastInfo.title}
          recordCount={toastInfo.recordCount}
          onManualSync={() => void refresh(true)}
          isSyncing={isBackgroundSyncing}
        />
      </div>
    );
  }

  const handleCustomerAdd = async (newCust: any) => {
    const isAutoApproved =
      newCust.approvalStatus === 'APPROVED' ||
      newCust.isActive === true ||
      isAdminUser(currentUser) ||
      (currentUser.role as string) === 'SUPER_ADMIN' ||
      (currentUser.role as string) === 'HEAD_OFFICE';

    const formatted: Customer = {
      id: newCust.id || `cust-${Date.now()}`,
      customerCode: newCust.customerCode || `CUST-${Math.floor(100000 + Math.random() * 900000)}`,
      companyName: newCust.businessName || newCust.companyName || newCust.name || 'New Commercial Partner',
      contactPerson: newCust.contactPerson || newCust.ownerName || '',
      phone: newCust.phone || newCust.mobile || newCust.contactNumber || '',
      email: newCust.email || `${(newCust.customerCode || 'cust').toLowerCase()}@nationallights.com`,
      type: (newCust.customerType || newCust.type || 'DEALER') as any,
      address: newCust.address || '',
      city: newCust.town || newCust.city || 'Lahore',
      town: newCust.town || newCust.city || 'Lahore',
      region: newCust.region || 'Punjab Central',
      area: newCust.area || '',
      territory: newCust.territory || newCust.beat || '',
      priceTier: newCust.priceTier || 'TIER_1',
      creditLimit: Number(newCust.proposedCreditLimit ?? newCust.creditLimit) || 1000000,
      creditDays: Number(newCust.proposedCreditDays ?? newCust.creditDays) || 30,
      openingBalance: Number(newCust.proposedOpeningBalance ?? newCust.openingBalance) || 0,
      currentBalance: Number(newCust.currentBalance) || 0,
      isCreditLocked: false,
      isActive: isAutoApproved ? true : (newCust.isActive ?? false),
      approvalStatus: isAutoApproved ? 'APPROVED' : (newCust.approvalStatus || 'PENDING_APPROVAL'),
      cnic: newCust.cnic || '',
      status: isAutoApproved ? 'ACTIVE' : 'INACTIVE',
      createdAt: newCust.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      customers: [formatted, ...prev.customers.filter((c) => c.id !== formatted.id)],
    }));

    try {
      const sheetToken = localStorage.getItem('nlink_live_sheets_token');
      if (sheetToken) {
        const sheetId = localStorage.getItem('nlink_active_google_sheet_id') || '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo';
        const { pushCustomerToGoogleSheet } = await import('./services/googleSheetsLiveService');
        await pushCustomerToGoogleSheet(sheetId, formatted, sheetToken);
      }
    } catch (sheetErr) {
      console.warn('Google Sheets dealer push note:', sheetErr);
    }

    if (!navigator.onLine) {
      syncManager.enqueue('CUSTOMERS', 'CREATE', formatted as any);
      setPendingOfflineCount(syncManager.getPendingCount());
      return;
    }

    try {
      if (isAutoApproved) {
        await approveCustomerRegistration(formatted.id, currentUser.fullName);
      } else {
        await registerCustomerPending(formatted as any);
      }
      await refresh(true);
    } catch (err) {
      console.warn('Online dealer creation note:', err);
      syncManager.enqueue('CUSTOMERS', 'CREATE', formatted as any);
      setPendingOfflineCount(syncManager.getPendingCount());
    }
  };

  const handleCustomerUpdate = async (updatedCust: any) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === updatedCust.id ? { ...c, ...updatedCust } : c)),
    }));
    try {
      await registerCustomerPending(updatedCust as any);
      await refresh(true);
    } catch (err) {
      console.warn('Customer update note:', err);
    }
  };

  const handleCustomerApprove = async (id: string, approverName?: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === id ? { ...c, isActive: true, approvalStatus: 'APPROVED', status: 'NORMAL' } : c
      ),
    }));
    try {
      await approveCustomerRegistration(id, approverName || currentUser.fullName);
      await refresh(true);
    } catch (err) {
      console.warn('Customer approval note:', err);
    }
  };

  const handleCustomerReject = async (id: string, reason?: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === id ? { ...c, isActive: false, approvalStatus: 'REJECTED', status: 'REJECTED' } : c
      ),
    }));
    try {
      await rejectCustomerRegistration(id, reason || 'Registration request declined');
      await refresh(true);
    } catch (err) {
      console.warn('Customer rejection note:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8ECF2] text-slate-800 font-sans antialiased selection:bg-teal-200 selection:text-teal-900 flex">
      {/* Persistent Collapsible Left Navigation Sidebar */}
      <NeumorphicSidebar
        activeDomain={activeDomain}
        setActiveDomain={setActiveDomain}
        activeOpTab={activeOpTab}
        setActiveOpTab={setActiveOpTab}
        activeRepTab={activeRepTab}
        setActiveRepTab={setActiveRepTab}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Right Area: Top Header + Main Content + Footer */}
      <div className="flex-1 flex flex-col min-w-0">
        <NeumorphicHeader
          activeDomain={activeDomain}
          setActiveDomain={setActiveDomain}
          activeOpTab={activeOpTab}
          setActiveOpTab={setActiveOpTab}
          activeRepTab={activeRepTab}
          setActiveRepTab={setActiveRepTab}
          currentUser={currentUser}
          onSignOut={onSignOut}
          onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
          onRefreshData={refresh}
          onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          onOpenOfflineSync={handleOpenOfflineSync}
          pendingOfflineCount={pendingOfflineCount}
          failedOfflineCount={failedOfflineCount}
          onToggleViewMode={
            isMultiRoleEligibleEmail(currentUser.email)
              ? () => setViewMode('MOBILE')
              : undefined
          }
        />

        {/* Main Content Area */}
        <main className="flex-1 nm-container py-6">
          {activeDomain === 'DASHBOARDS' && (
            <NeumorphicExecutiveDashboard
              currentUser={currentUser}
              onRefresh={refresh}
              onNavigateToDomain={(dom, sub) => {
                setActiveDomain(dom);
                if (dom === 'OPERATIONS' && sub) setActiveOpTab(sub as OperationSubTab);
                if (dom === 'REPORTS' && sub) setActiveRepTab(sub as ReportSubTab);
              }}
            />
          )}

          {activeDomain === 'OPERATIONS' && (
            <NeumorphicOperationDomain
              activeSubTab={activeOpTab}
              setActiveSubTab={setActiveOpTab}
              currentUser={currentUser}
              searchQuery={searchQuery}
              customers={data.customers}
              onAddCustomer={handleCustomerAdd}
              onUpdateCustomer={handleCustomerUpdate}
              onApproveCustomer={handleCustomerApprove}
              onRejectCustomer={handleCustomerReject}
            />
          )}

          {activeDomain === 'REPORTS' && (
            <NeumorphicReportsDomain
              activeSubTab={activeRepTab}
              setActiveSubTab={setActiveRepTab}
              currentUser={currentUser}
              searchQuery={searchQuery}
            />
          )}
        </main>

        {/* Neumorphic Footer */}
        <footer className="border-t border-white/60 bg-[#E8ECF2] py-4 text-center text-xs text-slate-500 font-medium">
          <div className="nm-container flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>N-LINK 360 · National Lights Multi-Tenant Operations Platform</span>
            <span className="font-mono text-[11px] text-slate-400">Production Mode · User: {currentUser.email}</span>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingCustomers={data.customers}
        existingSkus={data.skus}
        existingUsers={[currentUser]}
        onImportSuccess={handleImportSuccess}
      />

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        customers={data.customers}
        skus={data.skus}
        invoices={data.invoices}
        salesOrders={data.salesOrders}
        dispatches={data.dispatches}
        users={[currentUser]}
      />

      <AuditLogViewerModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        auditLogs={auditLogs}
        currentUser={currentUser}
      />

      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
        initialTab={syncModalInitialTab}
      />

      <GoogleSheetsIntegrationModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        appData={data}
      />

      {/* Universal Action Feedback Toast Container */}
      <ToastContainer />

      {/* Background Financial Sync Notification Toast */}
      <FinancialSyncToast
        isVisible={toastInfo.isVisible}
        onClose={() => setToastInfo((prev) => ({ ...prev, isVisible: false }))}
        lastRefreshTime={lastRefreshTime}
        elapsedSeconds={toastInfo.elapsedSeconds}
        syncTitle={toastInfo.title}
        recordCount={toastInfo.recordCount}
        onManualSync={() => void refresh(true)}
        isSyncing={isBackgroundSyncing}
      />
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [midnightCutoffNotice, setMidnightCutoffNotice] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        let user: User | null = null;
        if (isSupabaseConfigured) {
          try {
            user = await getCurrentUser();
          } catch (err) {
            console.warn('Supabase session check note:', err);
          }
        }
        if (!user) {
          try {
            const saved = localStorage.getItem('nlink_active_user');
            if (saved) {
              user = JSON.parse(saved);
            }
          } catch {
            // ignore
          }
        }
        if (user) {
          // Verify if existing session is already past midnight cutoff
          const status = checkMidnightCutoff();
          if (status.isExpired) {
            prepareDataForNextDay();
            setMidnightCutoffNotice(
              'Daily 11:59 PM Midnight Cutoff: Daily accounts and registers have rolled over. Please sign in to begin your new operating day.'
            );
            try {
              await signOut();
            } catch {}
            setCurrentUser(null);
          } else {
            recordSessionStart();
            setCurrentUser(user);
          }
        }
      } catch (err) {
        console.warn('Initial session check:', err);
      } finally {
        setInitializing(false);
      }
    };
    void initAuth();
  }, []);

  // 11:59 PM Midnight Cutoff Watchdog — checks every 15s and on app focus
  useEffect(() => {
    if (!currentUser) return;

    const evaluateCutoff = () => {
      const status = checkMidnightCutoff();
      if (status.isExpired) {
        prepareDataForNextDay();
        try {
          void signOut();
        } catch {}
        setCurrentUser(null);
        setMidnightCutoffNotice(
          'Daily 11:59 PM Midnight Cutoff Enforced: All user sessions have been closed automatically to secure day-end closing. Registers, attendance sheets, and daily route plans have been refreshed and prepared for tomorrow\'s business date.'
        );
      }
    };

    // Run check immediately
    evaluateCutoff();

    // Check periodically every 15 seconds
    const interval = setInterval(evaluateCutoff, 15000);

    // Also check on tab focus / wake from sleep
    const handleFocus = () => evaluateCutoff();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser]);

  const handleSignIn = async (user: User) => {
    recordSessionStart();
    setMidnightCutoffNotice(null);
    try {
      localStorage.setItem('nlink_active_user', JSON.stringify(user));
    } catch {}
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
    prepareDataForNextDay();
    try {
      await signOut();
    } catch {}
    setCurrentUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#E8ECF2] text-slate-800">
        <div className="text-center nm-flat p-8 rounded-3xl border border-white">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-teal-600" />
          <p className="text-xs font-bold text-slate-700">Verifying Security Session…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGate
      currentUser={currentUser}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
      midnightCutoffNotice={midnightCutoffNotice}
    >
      {currentUser && (
        <AuthenticatedApp
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      )}
    </AuthGate>
  );
}
