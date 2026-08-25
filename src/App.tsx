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
import { workspaceForRole } from './lib/permissions';
import { loadSupabaseAppData, type SupabaseAppData } from './services/supabase-data';
import { logVisit, postInvoice, recordRecovery, submitOrder, verifyRecovery } from './services/supabase-transactions';
import type { CustomerVisit, PaymentMode, SalesOrder, User } from './types';

const emptyData: SupabaseAppData = {
  customers: [], skus: [], inventoryBalances: [], salesOrders: [], invoices: [], recoveries: [],
  ledgerEntries: [], dispatches: [], stockReturns: [], visits: [],
};

function AuthenticatedApp({ currentUser, onSignOut }: { currentUser: User; onSignOut: () => Promise<void> }) {
  const activeApp = workspaceForRole(currentUser.role);
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    try { await postInvoice(orderId); await refresh(); }
    catch (err) { alert(`Invoice generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleVerifyRecovery = async (recoveryId: string) => {
    try { await verifyRecovery(recoveryId); await refresh(); }
    catch (err) { alert(`Recovery verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleBookOrder = async (orderData: Partial<SalesOrder>) => {
    try { await submitOrder(orderData); await refresh(); }
    catch (err) { alert(`Order submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleRecordRecovery = async (input: { customerId: string; amount: number; paymentMode: PaymentMode; instrumentNumber?: string; bankName?: string; remarks?: string }) => {
    try { await recordRecovery(input); await refresh(); }
    catch (err) { alert(`Recovery entry failed: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  const handleLogVisit = async (visitData: Partial<CustomerVisit>) => {
    try { await logVisit(visitData); await refresh(); }
    catch (err) { alert(`Visit could not be saved: ${err instanceof Error ? err.message : 'Unknown error'}`); }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><div className="text-center"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" /><p className="text-sm text-slate-300">Loading your N-LINK workspace…</p></div></div>;
  }

  if (error) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-white"><div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-slate-900 p-6"><h1 className="text-lg font-bold">N-LINK data connection failed</h1><p className="mt-2 text-sm text-red-200">{error}</p><div className="mt-5 flex gap-3"><button onClick={() => void refresh()} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Retry</button><button onClick={() => void onSignOut()} className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold">Sign out</button></div></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Header currentUser={currentUser} onSignOut={onSignOut} />
      <main className="min-h-[calc(100vh-4rem)]">
        {activeApp === 'PORTAL' && <CompanyPortal currentUser={currentUser} customers={data.customers} skus={data.skus} inventoryBalances={data.inventoryBalances} salesOrders={data.salesOrders} invoices={data.invoices} recoveries={data.recoveries} ledgerEntries={data.ledgerEntries} dispatches={data.dispatches} stockReturns={data.stockReturns} onPostInvoice={handlePostInvoice} onVerifyRecovery={handleVerifyRecovery} />}
        {activeApp === 'MOBILE_APP' && <div className="px-4 py-5 sm:px-6 lg:px-8"><SalesRecoveryApp currentUser={currentUser} customers={data.customers} skus={data.skus} inventoryBalances={data.inventoryBalances} visits={data.visits} onBookOrder={handleBookOrder} onRecordRecovery={handleRecordRecovery} onLogVisit={handleLogVisit} /></div>}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">N-LINK 360 · National Lights · {currentUser.id}</footer>
    </div>
  );
}

export default function App() {
  return <AuthGate>{(user, onSignOut) => <AuthenticatedApp currentUser={user} onSignOut={onSignOut} />}</AuthGate>;
}
