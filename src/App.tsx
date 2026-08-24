/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Integrated Platform
 */

import React, { useState } from 'react';
import { CalculationValidator } from './components/CalculationValidator';
import { CompanyPortal } from './components/CompanyPortal';
import { DocsViewer } from './components/DocsViewer';
import { Header } from './components/Header';
import { SalesRecoveryApp } from './components/SalesRecoveryApp';
import { inMemoryStore } from './services/store';
import { workspaceForRole } from './lib/permissions';
import {
  Customer,
  CustomerVisit,
  Dispatch,
  InventoryBalance,
  Invoice,
  LedgerEntry,
  PaymentMode,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  User,
} from './types';

export default function App() {
  // Temporary development identity. This is deliberately isolated here so the
  // next milestone can replace it with Supabase Auth without changing the
  // workspace components. Production must never expose a role switcher.
  const [users] = useState<User[]>(inMemoryStore.getUsers());
  const [currentUser] = useState<User>(users.find((u) => u.role === 'SUPER_ADMIN') || users[0]);
  const activeApp = workspaceForRole(currentUser.role);

  const [customers, setCustomers] = useState<Customer[]>(inMemoryStore.getCustomers());
  const [skus, setSkus] = useState<SKU[]>(inMemoryStore.getSKUs());
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>(inMemoryStore.getInventoryBalances());
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(inMemoryStore.getSalesOrders());
  const [invoices, setInvoices] = useState<Invoice[]>(inMemoryStore.getInvoices());
  const [recoveries, setRecoveries] = useState<Recovery[]>(inMemoryStore.getRecoveries());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(inMemoryStore.getLedgerEntries());
  const [dispatches] = useState<Dispatch[]>(inMemoryStore.getDispatches());
  const [stockReturns] = useState<StockReturn[]>(inMemoryStore.getStockReturns());
  const [visits, setVisits] = useState<CustomerVisit[]>(inMemoryStore.getVisits());

  const syncStore = () => {
    setCustomers([...inMemoryStore.getCustomers()]);
    setSkus([...inMemoryStore.getSKUs()]);
    setInventoryBalances([...inMemoryStore.getInventoryBalances()]);
    setSalesOrders([...inMemoryStore.getSalesOrders()]);
    setInvoices([...inMemoryStore.getInvoices()]);
    setRecoveries([...inMemoryStore.getRecoveries()]);
    setLedgerEntries([...inMemoryStore.getLedgerEntries()]);
    setVisits([...inMemoryStore.getVisits()]);
  };

  const handlePostInvoice = (orderId: string) => {
    const result = inMemoryStore.postInvoice(orderId, currentUser.id);
    if (result.success) syncStore();
    else alert(`Invoice generation failed: ${result.error}`);
  };

  const handleVerifyRecovery = (recoveryId: string) => {
    const result = inMemoryStore.verifyRecovery(recoveryId, currentUser.id);
    if (result.success) syncStore();
    else alert(`Recovery verification failed: ${result.error}`);
  };

  const handleBookOrder = (orderData: Partial<SalesOrder>) => {
    inMemoryStore.createSalesOrder(orderData);
    syncStore();
  };

  const handleRecordRecovery = (data: { customerId: string; amount: number; paymentMode: PaymentMode; instrumentNumber?: string; bankName?: string; remarks?: string }) => {
    const cust = customers.find((c) => c.id === data.customerId);
    const recNumber = `REC-2026-${String(recoveries.length + 1).padStart(3, '0')}`;
    inMemoryStore.recordRecovery({
      recoveryNumber: recNumber,
      customerId: data.customerId,
      customerName: cust?.companyName || 'Customer',
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      collectionDate: new Date().toISOString().split('T')[0],
      amount: data.amount,
      paymentMode: data.paymentMode,
      instrumentNumber: data.instrumentNumber,
      bankName: data.bankName,
      status: 'PENDING_VERIFICATION',
      remarks: data.remarks,
    });
    syncStore();
  };

  const handleLogVisit = (visitData: Partial<CustomerVisit>) => {
    inMemoryStore.logCustomerVisit(visitData);
    syncStore();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Header currentUser={currentUser} />
      <main className="min-h-[calc(100vh-4rem)]">
        {activeApp === 'PORTAL' && (
          <CompanyPortal
            currentUser={currentUser}
            customers={customers}
            skus={skus}
            inventoryBalances={inventoryBalances}
            salesOrders={salesOrders}
            invoices={invoices}
            recoveries={recoveries}
            ledgerEntries={ledgerEntries}
            dispatches={dispatches}
            stockReturns={stockReturns}
            onPostInvoice={handlePostInvoice}
            onVerifyRecovery={handleVerifyRecovery}
          />
        )}
        {activeApp === 'MOBILE_APP' && (
          <div className="px-4 py-5 sm:px-6 lg:px-8">
            <SalesRecoveryApp
              currentUser={currentUser}
              customers={customers}
              skus={skus}
              inventoryBalances={inventoryBalances}
              visits={visits}
              onBookOrder={handleBookOrder}
              onRecordRecovery={handleRecordRecovery}
              onLogVisit={handleLogVisit}
            />
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
        N-LINK 360 · National Lights · {currentUser.id}
      </footer>
    </div>
  );
}
