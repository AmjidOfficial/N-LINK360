import React, { useState, useEffect, useCallback } from 'react';
import {
  SupabaseAppData,
  emptyData,
  loadSupabaseAppData,
} from './services/supabase-data';
import {
  User,
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
import { getCurrentUser } from './services/auth';
import { isSupabaseConfigured } from './lib/supabase';
import { isAdminUser, isFieldForceUser, isMultiRoleEligibleEmail } from './services/production-users';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { registerCustomerPending } from './services/supabase-transactions';

function AuthenticatedApp({ currentUser, onSignOut }: { currentUser: User; onSignOut: () => Promise<void> }) {
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View Mode: Mobile app for Field Force, Enterprise portal for others
  const [viewMode, setViewMode] = useState<'MOBILE' | 'ENTERPRISE'>(
    isFieldForceUser(currentUser) ? 'MOBILE' : 'ENTERPRISE'
  );

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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadSupabaseAppData(currentUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load N-LINK data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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

  if (viewMode === 'MOBILE') {
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
          onLogout={onSignOut}
          onRefresh={refresh}
          onBookOrder={async (order) => {
            try {
              const { submitOrder } = await import('./services/supabase-transactions');
              await submitOrder(order as any);
              await refresh();
            } catch (err) {
              console.error('Failed to submit order:', err);
              alert('Failed to submit order: ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          onRecordRecovery={async (rec) => {
            try {
              const { recordRecovery } = await import('./services/supabase-transactions');
              await recordRecovery(rec);
              await refresh();
            } catch (err) {
              console.error('Failed to record recovery:', err);
              alert('Failed to record recovery: ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          onLogVisit={async (visit) => {
            try {
              const { logVisit } = await import('./services/supabase-transactions');
              await logVisit(visit);
              await refresh();
            } catch (err) {
              console.error('Failed to log visit:', err);
              alert('Failed to log visit: ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          onSubmitRegistration={async (reg) => {
            try {
              await registerCustomerPending(reg);
              await refresh();
            } catch (err) {
              console.error('Failed to register customer:', err);
              alert('Failed to register customer: ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          onToggleViewMode={
            isMultiRoleEligibleEmail(currentUser.email)
              ? () => setViewMode('ENTERPRISE')
              : undefined
          }
        />
      </div>
    );
  }

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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
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
      />
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const user = await getCurrentUser();
          if (user) {
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

  const handleSignIn = async (user: User) => {
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
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
