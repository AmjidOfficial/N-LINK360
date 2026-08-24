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
  UserRole,
} from './types';

export default function App() {
  const [activeApp, setActiveApp] = useState<'PORTAL' | 'MOBILE_APP' | 'DOCS' | 'VALIDATOR'>('PORTAL');
  
  // Store reactive state snapshots
  const [users, setUsers] = useState<User[]>(inMemoryStore.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(
    users.find((u) => u.role === 'SUPER_ADMIN') || users[0]
  );

  const [customers, setCustomers] = useState<Customer[]>(inMemoryStore.getCustomers());
  const [skus, setSkus] = useState<SKU[]>(inMemoryStore.getSKUs());
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>(
    inMemoryStore.getInventoryBalances()
  );
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(inMemoryStore.getSalesOrders());
  const [invoices, setInvoices] = useState<Invoice[]>(inMemoryStore.getInvoices());
  const [recoveries, setRecoveries] = useState<Recovery[]>(inMemoryStore.getRecoveries());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(inMemoryStore.getLedgerEntries());
  const [dispatches, setDispatches] = useState<Dispatch[]>(inMemoryStore.getDispatches());
  const [stockReturns, setStockReturns] = useState<StockReturn[]>(inMemoryStore.getStockReturns());
  const [visits, setVisits] = useState<CustomerVisit[]>(inMemoryStore.getVisits());

  // Role Switcher Handler
  const handleRoleChange = (role: UserRole) => {
    const matchingUser = users.find((u) => u.role === role);
    if (matchingUser) {
      setCurrentUser(matchingUser);
      // If switching to field role, smoothly activate the mobile app view
      if (role === 'SALES_RECOVERY') {
        setActiveApp('MOBILE_APP');
      }
    }
  };

  // Synchronize state from store
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

  // Actions
  const handlePostInvoice = (orderId: string) => {
    const result = inMemoryStore.postInvoice(orderId, currentUser.id);
    if (result.success) {
      syncStore();
    } else {
      alert(`Invoice generation failed: ${result.error}`);
    }
  };

  const handleVerifyRecovery = (recoveryId: string) => {
    const result = inMemoryStore.verifyRecovery(recoveryId, currentUser.id);
    if (result.success) {
      syncStore();
    } else {
      alert(`Recovery verification failed: ${result.error}`);
    }
  };

  const handleBookOrder = (orderData: Partial<SalesOrder>) => {
    const created = inMemoryStore.createSalesOrder(orderData);
    syncStore();
  };

  const handleRecordRecovery = (data: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    instrumentNumber?: string;
    bankName?: string;
    remarks?: string;
  }) => {
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Global Header */}
      <Header
        activeApp={activeApp}
        setActiveApp={setActiveApp}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        users={users}
      />

      {/* Main View Router */}
      <main className="flex-1">
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
          <div className="py-6 px-4">
            <div className="text-center mb-4">
              <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20 px-3 py-1 rounded-full">
                Unified Sales & Recovery Field Terminal Simulator
              </span>
            </div>
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

        {activeApp === 'DOCS' && <DocsViewer />}

        {activeApp === 'VALIDATOR' && <CalculationValidator />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-xs text-slate-500 text-center font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>N-LINK 360 &copy; 2026 National Lights. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Branch: Lahore Central (BR-LHR)</span>
            <span>Currency: PKR (₨)</span>
            <span>Security: Zero Floating-Point Precision</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
