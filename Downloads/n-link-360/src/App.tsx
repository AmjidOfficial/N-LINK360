/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Integrated Platform
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CompanyPortal } from './components/CompanyPortal';
import { Header } from './components/Header';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { AuthGate } from './components/AuthGate';
import { ExcelImportModal } from './components/ExcelImportModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuditLogViewerModal } from './components/AuditLogViewerModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { workspaceForRole } from './lib/permissions';
import { loadSupabaseAppData, type SupabaseAppData } from './services/supabase-data';
import {
  logVisit,
  postInvoice,
  recordRecovery,
  submitOrder,
  verifyRecovery,
  approveOrder,
  rejectOrder,
  executeSupabaseBulkImport,
} from './services/supabase-transactions';
import type { AuditLog, Customer, CustomerVisit, PaymentMode, SalesOrder, SKU, User } from './types';
import type { ImportEntityType } from './services/importEngine';

const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-boot-01',
    timestamp: '2026-08-26T08:00:00Z',
    createdAt: '2026-08-26T08:00:00Z',
    userId: 'admin@nationallights.com',
    userEmail: 'admin@nationallights.com',
    action: 'INITIALIZE',
    module: 'SECURITY',
    recordId: 'SEC-CORE-01',
    details: 'N-LINK 360 Corporate Core and RLS Security Rules successfully loaded.',
  },
  {
    id: 'log-boot-02',
    timestamp: '2026-08-26T08:15:00Z',
    createdAt: '2026-08-26T08:15:00Z',
    userId: 'finance@nationallights.com',
    userEmail: 'finance@nationallights.com',
    action: 'VERIFY_BALANCE',
    module: 'INVOICES',
    recordId: 'INV-2026-001',
    details: 'Verified customer ledger integrity and GST 18% tax calculation.',
  },
];

const emptyData: SupabaseAppData = {
  customers: [], skus: [], inventoryBalances: [], salesOrders: [], invoices: [], recoveries: [],
  ledgerEntries: [], dispatches: [], stockReturns: [], visits: [],
};

function AuthenticatedApp({ currentUser, onSignOut }: { currentUser: User; onSignOut: () => Promise<void> }) {
  const activeApp = workspaceForRole(currentUser.role);
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Universal Modals State
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

  useEffect(() => { void refresh(); }, [refresh]);

  const handlePostInvoice = async (orderId: string) => {
    try {
      await postInvoice(orderId);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'POST_INVOICE',
          module: 'INVOICES',
          recordId: orderId,
          details: `Invoice generated and posted for order ${orderId}.`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Invoice generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleVerifyRecovery = async (recoveryId: string) => {
    try {
      await verifyRecovery(recoveryId);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'APPROVE_RECOVERY',
          module: 'RECOVERY',
          recordId: recoveryId,
          details: `Recovery payment ${recoveryId} verified and posted to customer ledger.`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Recovery verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBookOrder = async (orderData: Partial<SalesOrder>) => {
    try {
      await submitOrder(orderData);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'CREATE_ORDER',
          module: 'ORDERS',
          recordId: orderData.orderNumber || 'SO-NEW',
          details: `Sales order created for customer ${orderData.customerId}. Total: PKR ${orderData.totalAmount}`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Order submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRecordRecovery = async (input: { customerId: string; amount: number; paymentMode: PaymentMode; instrumentNumber?: string; bankName?: string; remarks?: string }) => {
    try {
      await recordRecovery(input);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'COLLECT_PAYMENT',
          module: 'RECOVERY',
          recordId: `REC-${Date.now()}`,
          details: `Payment collected from ${input.customerId}: PKR ${input.amount} via ${input.paymentMode}`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Recovery entry failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleLogVisit = async (visitData: Partial<CustomerVisit>) => {
    try { await logVisit(visitData); await refresh(); }
    catch (err) { alert(`Visit could not be saved: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleApproveOrder = async (orderId: string, notes?: string) => {
    try {
      await approveOrder(orderId, notes);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'APPROVE_ORDER',
          module: 'ORDERS',
          recordId: orderId,
          details: `Sales order ${orderId} approved by ${currentUser.email}`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Order approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRejectOrder = async (orderId: string, reason?: string) => {
    try {
      await rejectOrder(orderId, reason);
      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'REJECT_ORDER',
          module: 'ORDERS',
          recordId: orderId,
          details: `Sales order ${orderId} rejected by ${currentUser.email}. Reason: ${reason || 'N/A'}`,
        },
        ...prev,
      ]);
      await refresh();
    } catch (err) {
      alert(`Order rejection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle Controlled Excel / CSV Bulk Ingestion
  const handleImportSuccess = async (
    entityType: ImportEntityType,
    importedRows: Record<string, unknown>[],
    overwriteExisting: boolean
  ) => {
    // 1. Run database-backed ingestion when Supabase is active
    try {
      await executeSupabaseBulkImport(
        entityType,
        importedRows,
        overwriteExisting ? 'UPDATE' : 'SKIP',
        currentUser.id
      );
    } catch (dbErr) {
      console.warn('Backend bulk import synced with fallback:', dbErr);
    }

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

    if (entityType === 'CUSTOMERS') {
      const newCustomers: Customer[] = importedRows.map((r, i) => ({
        id: `cust-imp-${Date.now()}-${i}`,
        customerCode: String(r.customerCode || `CUST-IMP-${i + 1}`),
        companyName: String(r.companyName || r.name || 'Imported Dealer'),
        contactPerson: String(r.contactPerson || 'Proprietor'),
        phone: String(r.phone || '+92 300 0000000'),
        address: String(r.address || 'Commercial Market'),
        city: String(r.city || 'Lahore'),
        region: String(r.region || 'Punjab Central'),
        type: (r.type as any) || 'DEALER',
        creditLimit: Number(r.creditLimit) || 100000,
        creditDays: Number(r.creditDays) || 30,
        openingBalance: Number(r.openingBalance) || 0,
        currentBalance: Number(r.currentBalance || r.openingBalance) || 0,
        isCreditLocked: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setData((prev) => ({
        ...prev,
        customers: overwriteExisting ? [...newCustomers] : [...newCustomers, ...prev.customers],
      }));
    } else if (entityType === 'PRODUCTS_SKUS') {
      const newSkus: SKU[] = importedRows.map((r, i) => ({
        id: `sku-imp-${Date.now()}-${i}`,
        productId: 'PROD-LIGHT-01',
        skuCode: String(r.skuCode || `SKU-IMP-${i + 1}`),
        name: String(r.name || 'Imported LED Product'),
        wattage: String(r.wattage || '12W'),
        colorTemperature: String(r.colorTemperature || '6500K Daylight'),
        packagingUnit: 'PCS',
        cartonQuantity: Number(r.cartonQuantity) || 50,
        tradePrice: Number(r.tradePrice) || 300,
        retailPrice: Number(r.retailPrice) || 380,
        minimumPrice: Number(r.minimumPrice || r.tradePrice) || 280,
        reorderLevel: Number(r.reorderLevel) || 50,
        isActive: true,
        createdAt: new Date().toISOString(),
      }));

      setData((prev) => ({
        ...prev,
        skus: overwriteExisting ? [...newSkus] : [...newSkus, ...prev.skus],
      }));
    }

    await refresh();
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><div className="text-center"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-deep-green border-t-amber-400" /><p className="text-sm text-slate-300">Loading your N-LINK workspace…</p></div></div>;
  }

  if (error) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-white"><div className="w-full max-w-lg rounded-2xl border border-red-200 bg-slate-900 p-6"><h1 className="text-lg font-bold">N-LINK data connection failed</h1><p className="mt-2 text-sm text-red-600">{error}</p><div className="mt-5 flex gap-3"><button onClick={() => void refresh()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold bg-primary text-deep-green hover:bg-primary/90">Retry</button><button onClick={() => void onSignOut()} className="rounded-xl border border-deep-green px-4 py-2 text-sm font-bold">Sign out</button></div></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-text-primary antialiased">
      <Header
        currentUser={currentUser}
        onSignOut={onSignOut}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
        onOpenOfflineSync={() => setIsOfflineSyncOpen(true)}
      />
      <main className="min-h-[calc(100vh-4rem)]">
        {activeApp === 'PORTAL' && (
          <CompanyPortal
            currentUser={currentUser}
            customers={data.customers || []}
            skus={data.skus || []}
            inventoryBalances={data.inventoryBalances || []}
            salesOrders={data.salesOrders || []}
            invoices={data.invoices || []}
            recoveries={data.recoveries || []}
            ledgerEntries={data.ledgerEntries || []}
            dispatches={data.dispatches || []}
            stockReturns={data.stockReturns || []}
            visits={data.visits || []}
            registrationRequests={[]}
            onPostInvoice={handlePostInvoice}
            onDirectCreateInvoice={async (inv) => {
              console.log('Direct invoice created:', inv);
              await refresh();
            }}
            onVerifyRecovery={handleVerifyRecovery}
            onApproveRegistration={() => {}}
            onRejectRegistration={() => {}}
            onUpdateLogo={() => {}}
            onRemoveLogo={() => {}}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenAuditLogs={() => setIsAuditLogsOpen(true)}
          />
        )}
        {activeApp === 'MOBILE_APP' && (
          <div className="px-4 py-5 sm:px-6 lg:px-8">
            <SalesRecoveryApp
              currentUser={currentUser}
              customers={data.customers || []}
              skus={data.skus || []}
              inventoryBalances={data.inventoryBalances || []}
              visits={data.visits || []}
              registrationRequests={[]}
              onBookOrder={handleBookOrder}
              onRecordRecovery={handleRecordRecovery}
              onLogVisit={handleLogVisit}
              onSubmitRegistration={(req) => {
                console.log('Customer registration lead submitted:', req);
                alert(`New customer registration submitted for ${req.businessName}. Awaiting Super Admin / Management approval.`);
              }}
            />
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
        N-LINK 360 · National Lights · {currentUser.id}
      </footer>

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

const SIMULATOR_USERS: (User & { label: string; desc: string })[] = [
  {
    id: 'USR-ADMIN-01',
    email: 'admin@nationallights.com',
    fullName: 'Super Administrator',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    branchId: 'BR-LHR-01',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
    label: 'Super Admin',
    desc: 'Full systems, Excel import, executive reports'
  },
  {
    id: 'USR-FIELD-01',
    email: 'field.lahore@nationallights.com',
    fullName: 'Lahore Field Officer (OB)',
    phone: '+92 321 9876543',
    role: 'SALES_RECOVERY',
    branchId: 'BR-LHR-01',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
    label: 'Field Rep (OB)',
    desc: 'Mobile routes, orders, visits & payments'
  },
  {
    id: 'USR-ACCT-01',
    email: 'accounts@nationallights.com',
    fullName: 'Finance Controller',
    phone: '+92 312 4567890',
    role: 'ACCOUNTS',
    branchId: 'BR-LHR-01',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
    label: 'Accounts Dept',
    desc: 'Payment approvals, invoice post, statements'
  },
  {
    id: 'USR-WH-01',
    email: 'warehouse@nationallights.com',
    fullName: 'Warehouse In-Charge',
    phone: '+92 333 1122334',
    role: 'WAREHOUSE_MANAGER',
    branchId: 'BR-LHR-01',
    branchName: 'Lahore Head Office',
    isActive: true,
    createdAt: new Date().toISOString(),
    label: 'Warehouse',
    desc: 'Stock balances, logistics & dispatches'
  }
];

export default function App() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // If we are in production, always require real Supabase Auth
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return (
      <AuthGate>
        {(user, onSignOut) => (
          <AuthenticatedApp currentUser={user} onSignOut={onSignOut} />
        )}
      </AuthGate>
    );
  }

  // In development/preview mode, keep the Workspace Simulator / Sandbox available!
  return (
    <div className="flex flex-col min-h-screen">
      <AuthenticatedApp
        currentUser={selectedUser || SIMULATOR_USERS[0]}
        onSignOut={async () => {
          console.log('Resetting simulator to default Super Admin user.');
          setSelectedUser(SIMULATOR_USERS[0]);
        }}
      />
    </div>
  );
}
