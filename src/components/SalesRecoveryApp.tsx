/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales & Recovery Mobile Application (Field Officer App)
 * Critical Rule: Unified Sales + Recovery Single Role
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  FilePlus,
  FileText,
  History,
  Info,
  MapPin,
  Navigation,
  Package,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import {
  calculateOrderTotals,
  evaluateCreditPolicy,
  validateRecoverySubmission,
} from '../lib/business-rules';
import {
  Customer,
  CustomerVisit,
  InventoryBalance,
  PaymentMode,
  SalesOrder,
  SKU,
  User as UserType,
} from '../types';

interface SalesRecoveryAppProps {
  currentUser: UserType;
  customers: Customer[];
  skus: SKU[];
  inventoryBalances: InventoryBalance[];
  visits: CustomerVisit[];
  onBookOrder: (order: Partial<SalesOrder>) => void;
  onRecordRecovery: (data: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    instrumentNumber?: string;
    bankName?: string;
    remarks?: string;
  }) => void;
  onLogVisit: (visit: Partial<CustomerVisit>) => void;
}

export const SalesRecoveryApp: React.FC<SalesRecoveryAppProps> = ({
  currentUser,
  customers,
  skus,
  inventoryBalances,
  visits,
  onBookOrder,
  onRecordRecovery,
  onLogVisit,
}) => {
  const [activeScreen, setActiveScreen] = useState<
    'DASHBOARD' | 'CUSTOMERS' | 'CUSTOMER_PROFILE' | 'ORDER_BOOKING' | 'RECOVERY_FORM' | 'VISIT_LOG' | 'PERFORMANCE'
  >('DASHBOARD');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Order Booking State
  const [orderItems, setOrderItems] = useState<
    Array<{ skuId: string; quantity: number; discountPercent: number }>
  >([{ skuId: skus[0]?.id || '', quantity: 50, discountPercent: 0 }]);

  // Recovery Form State
  const [recoveryAmount, setRecoveryAmount] = useState<number>(50000);
  const [recoveryPaymentMode, setRecoveryPaymentMode] = useState<PaymentMode>('CASH');
  const [instrumentNumber, setInstrumentNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [recoveryRemarks, setRecoveryRemarks] = useState<string>('');

  // Visit Log State
  const [visitPurpose, setVisitPurpose] = useState('Routine Sales & Recovery Follow-up');
  const [visitNotes, setVisitNotes] = useState('');
  const [orderTakenInVisit, setOrderTakenInVisit] = useState(false);
  const [recoveryTakenInVisit, setRecoveryTakenInVisit] = useState(false);

  // Computed Order Totals & Live Credit Evaluation
  const computedItems = orderItems.map((item) => {
    const sku = skus.find((s) => s.id === item.skuId);
    return {
      orderedQuantity: item.quantity,
      unitPrice: sku?.tradePrice || 0,
      discountPercent: item.discountPercent,
    };
  });
  const orderTotals = calculateOrderTotals(computedItems);
  const creditCheck = evaluateCreditPolicy(selectedCustomer, orderTotals.totalAmount);

  // Submit Handlers
  const handleOrderSubmit = () => {
    const newItems = orderItems.map((item) => {
      const sku = skus.find((s) => s.id === item.skuId)!;
      const gross = item.quantity * sku.tradePrice;
      const discount = gross * (item.discountPercent / 100);
      return {
        id: `soi-${Date.now()}-${Math.random()}`,
        orderId: '',
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        orderedQuantity: item.quantity,
        unitPrice: sku.tradePrice,
        discountPercent: item.discountPercent,
        lineTotal: gross - discount,
      };
    });

    onBookOrder({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      customerCode: selectedCustomer.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      items: newItems,
      subtotal: orderTotals.subtotal,
      discountAmount: orderTotals.discountAmount,
      taxAmount: orderTotals.taxAmount,
      totalAmount: orderTotals.totalAmount,
      creditCheckStatus: creditCheck.status,
      creditCheckNotes: creditCheck.message,
    });

    alert('Sales order submitted successfully!');
    setActiveScreen('DASHBOARD');
  };

  const handleRecoverySubmit = () => {
    const validation = validateRecoverySubmission(
      recoveryAmount,
      recoveryPaymentMode,
      instrumentNumber,
      bankName
    );
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    onRecordRecovery({
      customerId: selectedCustomer.id,
      amount: recoveryAmount,
      paymentMode: recoveryPaymentMode,
      instrumentNumber: instrumentNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      remarks: recoveryRemarks,
    });

    alert(`Recovery of PKR ${recoveryAmount.toLocaleString()} recorded and submitted for verification!`);
    setActiveScreen('DASHBOARD');
  };

  const handleVisitSubmit = () => {
    onLogVisit({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      checkinTime: new Date().toISOString(),
      checkoutTime: new Date().toISOString(),
      latitude: 31.5798,
      longitude: 74.3168,
      purpose: visitPurpose,
      notes: visitNotes,
      orderPlaced: orderTakenInVisit,
      recoveryCollected: recoveryTakenInVisit,
    });

    alert('Customer visit recorded with GPS location snapshot!');
    setActiveScreen('DASHBOARD');
  };

  return (
    <div className="max-w-md mx-auto my-4 bg-slate-900 text-white rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden min-h-[750px] flex flex-col font-sans">
      
      {/* Mobile Top App Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        {activeScreen !== 'DASHBOARD' ? (
          <button
            onClick={() => setActiveScreen('DASHBOARD')}
            className="flex items-center gap-1 text-xs text-amber-400 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">
              NL
            </div>
            <div>
              <span className="font-bold text-xs tracking-tight block">N-LINK Field App</span>
              <span className="text-[10px] text-emerald-400 font-mono">Sales & Recovery Lead</span>
            </div>
          </div>
        )}

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-200 block truncate max-w-[140px]">
            {currentUser.fullName}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Lahore Central</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-900">
        
        {/* ========================================================================= */}
        {/* 1. FIELD DASHBOARD SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'DASHBOARD' && (
          <div className="space-y-4">
            
            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">Today's Recovery</span>
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  PKR 60,000
                </div>
                <span className="text-[10px] text-slate-500">Target: PKR 100k/day</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">Today's Orders</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base font-bold font-mono text-amber-400 mt-1">
                  PKR 76,914
                </div>
                <span className="text-[10px] text-slate-500">1 Order Placed</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveScreen('ORDER_BOOKING')}
                className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <FilePlus className="w-5 h-5" />
                <span className="text-[11px]">Book Order</span>
              </button>

              <button
                onClick={() => setActiveScreen('RECOVERY_FORM')}
                className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Coins className="w-5 h-5" />
                <span className="text-[11px]">Collect Cash</span>
              </button>

              <button
                onClick={() => setActiveScreen('VISIT_LOG')}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 border border-slate-700 shadow-md active:scale-95 transition-all"
              >
                <MapPin className="w-5 h-5 text-rose-400" />
                <span className="text-[11px]">GPS Visit</span>
              </button>
            </div>

            {/* Assigned Customers Quick List */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">My Assigned Portfolio ({customers.length})</span>
                <button
                  onClick={() => setActiveScreen('CUSTOMERS')}
                  className="text-amber-400 text-[11px] font-semibold"
                >
                  View All &rarr;
                </button>
              </div>

              {customers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    setActiveScreen('CUSTOMER_PROFILE');
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {cust.customerCode}
                      </span>
                      <span className="font-bold text-white text-xs">{cust.companyName}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cust.contactPerson} • {cust.city}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Outstanding:</span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      PKR {cust.currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Visits Feed */}
            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-300 block">Today's Visits & Progress</span>
              {visits.map((v) => (
                <div key={v.id} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{v.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Checked In</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{v.notes}</p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono">
                    <span className={v.orderPlaced ? 'text-emerald-400' : 'text-slate-500'}>
                      Order: {v.orderPlaced ? 'YES' : 'NO'}
                    </span>
                    <span className={v.recoveryCollected ? 'text-emerald-400' : 'text-slate-500'}>
                      Recovery: {v.recoveryCollected ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CUSTOMER 360 PROFILE SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'CUSTOMER_PROFILE' && (
          <div className="space-y-4">
            
            {/* Header Badge */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                {selectedCustomer.customerCode} • {selectedCustomer.type}
              </span>
              <h2 className="text-base font-bold text-white">{selectedCustomer.companyName}</h2>
              <p className="text-slate-400 text-[11px]">
                {selectedCustomer.contactPerson} • {selectedCustomer.phone}
              </p>
              <p className="text-slate-500 text-[11px]">{selectedCustomer.address}</p>
            </div>

            {/* Financial Status Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Credit Limit</span>
                <span className="font-mono font-bold text-white text-sm">
                  PKR {selectedCustomer.creditLimit.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {selectedCustomer.creditDays} Credit Days
                </span>
              </div>

              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Current Balance</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  PKR {selectedCustomer.currentBalance.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  Avail: PKR {(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Customer Direct Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setActiveScreen('ORDER_BOOKING')}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <FilePlus className="w-4 h-4" /> Book New Order
              </button>
              <button
                onClick={() => setActiveScreen('RECOVERY_FORM')}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Coins className="w-4 h-4" /> Record Recovery
              </button>
            </div>

            <button
              onClick={() => setActiveScreen('VISIT_LOG')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-rose-400" /> Log In-Person Visit
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ORDER BOOKING SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'ORDER_BOOKING' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">New Order Booking</span>
              <span className="text-amber-400 font-mono text-xs">{selectedCustomer.companyName}</span>
            </div>

            {/* Customer Selector if not selected */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName} (Outstanding: PKR {c.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Order Items List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Order Lines ({orderItems.length})</span>
                <button
                  onClick={() =>
                    setOrderItems([
                      ...orderItems,
                      { skuId: skus[0]?.id || '', quantity: 20, discountPercent: 0 },
                    ])
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add SKU
                </button>
              </div>

              {orderItems.map((item, idx) => {
                const sku = skus.find((s) => s.id === item.skuId) || skus[0];
                const stock = inventoryBalances.find((b) => b.skuId === sku.id);
                const lineTotal = item.quantity * sku.tradePrice * (1 - item.discountPercent / 100);

                return (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <select
                        value={item.skuId}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].skuId = e.target.value;
                          setOrderItems(updated);
                        }}
                        className="bg-slate-900 text-amber-300 font-semibold border border-slate-700 rounded p-1.5 text-xs max-w-[240px]"
                      >
                        {skus.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.skuCode} - {s.name} (PKR {s.tradePrice})
                          </option>
                        ))}
                      </select>

                      {orderItems.length > 1 && (
                        <button
                          onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          Quantity (Stock: {stock?.quantityOnHand || 0}):
                        </span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].quantity = Math.max(1, Number(e.target.value));
                            setOrderItems(updated);
                          }}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-white font-bold"
                        />
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">Discount %:</span>
                        <input
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].discountPercent = Number(e.target.value);
                            setOrderItems(updated);
                          }}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                      <span className="text-slate-400">Line Subtotal:</span>
                      <span className="font-bold text-white">PKR {lineTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Credit Policy Warning */}
            <div className={`p-3 rounded-xl border ${
              creditCheck.status === 'GREEN'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : creditCheck.status === 'AMBER'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
            }`}>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[11px]">Credit Check: {creditCheck.status} TIER</span>
                  <p className="text-[10px] opacity-90 mt-0.5">{creditCheck.message}</p>
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
              <span className="text-slate-400">Total Order Amount:</span>
              <span className="text-base font-bold text-amber-400">
                PKR {orderTotals.totalAmount.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleOrderSubmit}
              disabled={creditCheck.isBlocked}
              className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all ${
                creditCheck.isBlocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              Submit Order ({orderItems.length} SKUs)
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. RECOVERY COLLECTION SCREEN */}
        {/* ========================================================================= */}
        {activeScreen === 'RECOVERY_FORM' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">Log Debt Recovery Collection</span>
              <p className="text-[10px] text-slate-400">
                Field collection directly credited to customer ledger upon Accounts verification.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName} (Due: PKR {c.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Amount Collected (PKR):</label>
              <input
                type="number"
                value={recoveryAmount}
                onChange={(e) => setRecoveryAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-emerald-400 font-bold text-base"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Payment Mode:</label>
              <select
                value={recoveryPaymentMode}
                onChange={(e) => setRecoveryPaymentMode(e.target.value as PaymentMode)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-semibold"
              >
                <option value="CASH">CASH (Physical Receipt)</option>
                <option value="CHEQUE">CHEQUE / CHEQUE DEPOSIT</option>
                <option value="ONLINE_TRANSFER">ONLINE BANK TRANSFER / IBFT</option>
                <option value="PAY_ORDER">PAY ORDER</option>
              </select>
            </div>

            {(recoveryPaymentMode === 'CHEQUE' || recoveryPaymentMode === 'PAY_ORDER') && (
              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Cheque / Instrument Number:</label>
                  <input
                    type="text"
                    value={instrumentNumber}
                    onChange={(e) => setInstrumentNumber(e.target.value)}
                    placeholder="e.g. HBL-0099412"
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">Drawee Bank Name:</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Habib Bank Ltd / MCB"
                    className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Remarks / Deposit Notes:</label>
              <textarea
                value={recoveryRemarks}
                onChange={(e) => setRecoveryRemarks(e.target.value)}
                placeholder="Details of collection..."
                rows={2}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <button
              onClick={handleRecoverySubmit}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md text-sm transition-all"
            >
              Submit Recovery (PKR {recoveryAmount.toLocaleString()})
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. VISIT LOG & GPS CHECK-IN */}
        {/* ========================================================================= */}
        {activeScreen === 'VISIT_LOG' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm">Record In-Person Visit</span>
              <p className="text-[10px] text-slate-400">
                GPS check-in timestamp and client discussion record.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span className="font-mono text-[11px]">GPS: 31.5798° N, 74.3168° E</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-mono">
                Lahore Market
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Purpose of Visit:</label>
              <input
                type="text"
                value={visitPurpose}
                onChange={(e) => setVisitPurpose(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px]">Discussion Notes & Feedback:</label>
              <textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Market feedback, competitor pricing, delivery issues..."
                rows={3}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-order-visit"
                  checked={orderTakenInVisit}
                  onChange={(e) => setOrderTakenInVisit(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <label htmlFor="chk-order-visit" className="text-slate-300 font-medium">
                  Sales order booked during this visit
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-rec-visit"
                  checked={recoveryTakenInVisit}
                  onChange={(e) => setRecoveryTakenInVisit(e.target.checked)}
                  className="rounded text-emerald-500"
                />
                <label htmlFor="chk-rec-visit" className="text-slate-300 font-medium">
                  Recovery payment collected during this visit
                </label>
              </div>
            </div>

            <button
              onClick={handleVisitSubmit}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md text-sm transition-all"
            >
              Complete Check-Out & Save Visit
            </button>

          </div>
        )}

      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-slate-950 border-t border-slate-800 p-2 grid grid-cols-4 gap-1 text-[10px] text-center sticky bottom-0 z-20">
        <button
          onClick={() => setActiveScreen('DASHBOARD')}
          className={`py-1.5 flex flex-col items-center gap-0.5 rounded-lg ${
            activeScreen === 'DASHBOARD' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveScreen('CUSTOMERS')}
          className={`py-1.5 flex flex-col items-center gap-0.5 rounded-lg ${
            activeScreen === 'CUSTOMERS' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clients</span>
        </button>

        <button
          onClick={() => setActiveScreen('ORDER_BOOKING')}
          className={`py-1.5 flex flex-col items-center gap-0.5 rounded-lg ${
            activeScreen === 'ORDER_BOOKING' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FilePlus className="w-4 h-4" />
          <span>Order</span>
        </button>

        <button
          onClick={() => setActiveScreen('RECOVERY_FORM')}
          className={`py-1.5 flex flex-col items-center gap-0.5 rounded-lg ${
            activeScreen === 'RECOVERY_FORM' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Recovery</span>
        </button>
      </div>

    </div>
  );
};
