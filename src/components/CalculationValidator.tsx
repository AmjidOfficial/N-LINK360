/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Business Rules & Transaction Math Sandbox
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Package,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  calculateGRNDiscrepancy,
  calculateLedgerRunningBalance,
  calculateNewInventoryBalance,
  calculateOrderItemLineTotal,
  calculateOrderTotals,
  evaluateCreditPolicy,
  roundTo2,
  validateRecoverySubmission,
} from '../lib/business-rules';
import { InventoryTransactionType, PaymentMode } from '../types';

export const CalculationValidator: React.FC = () => {
  // 1. Credit Check State
  const [creditLimit, setCreditLimit] = useState(1000000);
  const [currentOutstanding, setCurrentOutstanding] = useState(650000);
  const [pendingOrders, setPendingOrders] = useState(100000);
  const [newOrderAmount, setNewOrderAmount] = useState(350000);
  const [isCreditLocked, setIsCreditLocked] = useState(false);

  const creditResult = evaluateCreditPolicy(
    {
      creditLimit,
      currentBalance: currentOutstanding,
      isCreditLocked,
      creditDays: 30,
    },
    newOrderAmount,
    pendingOrders
  );

  // 2. Inventory Transaction State
  const [currentStock, setCurrentStock] = useState(1200);
  const [txType, setTxType] = useState<InventoryTransactionType>('SALES_OUT');
  const [txQuantity, setTxQuantity] = useState(300);
  let newStockResult: number | string = 0;
  let stockError: string | null = null;
  try {
    newStockResult = calculateNewInventoryBalance(currentStock, txType, txQuantity);
  } catch (err: unknown) {
    stockError = (err as Error).message;
  }

  // 3. Customer Ledger State
  const [ledgerOpening, setLedgerOpening] = useState(500000);
  const [ledgerDebit, setLedgerDebit] = useState(250000);
  const [ledgerCredit, setLedgerCredit] = useState(150000);
  const ledgerClosing = calculateLedgerRunningBalance(ledgerOpening, ledgerDebit, ledgerCredit);

  // 4. Recovery Validation State
  const [recoveryAmount, setRecoveryAmount] = useState(75000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CHEQUE');
  const [chequeNumber, setChequeNumber] = useState('HBL-889922');
  const [bankName, setBankName] = useState('Habib Bank Ltd');
  const recoveryValidation = validateRecoverySubmission(
    recoveryAmount,
    paymentMode,
    chequeNumber,
    bankName
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Introduction */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Interactive Transaction & Policy Math Sandbox
            </h1>
            <p className="text-sm text-slate-500">
              Live deterministic verification of the core calculation engines enforcing zero-corruption business logic.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Credit Policy Tier Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900">1. Credit Check Engine (Green / Amber / Red)</h2>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
              creditResult.status === 'GREEN'
                ? 'bg-emerald-100 text-emerald-800'
                : creditResult.status === 'AMBER'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {creditResult.status} TIER
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Customer Credit Limit (PKR)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Current Outstanding (PKR)</label>
              <input
                type="number"
                value={currentOutstanding}
                onChange={(e) => setCurrentOutstanding(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Pending Orders In Pipeline (PKR)</label>
              <input
                type="number"
                value={pendingOrders}
                onChange={(e) => setPendingOrders(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">New Order Total (PKR)</label>
              <input
                type="number"
                value={newOrderAmount}
                onChange={(e) => setNewOrderAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="chk-locked"
              checked={isCreditLocked}
              onChange={(e) => setIsCreditLocked(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="chk-locked" className="text-xs text-rose-700 font-medium cursor-pointer">
              Manually Lock Account (Management Credit Freeze)
            </label>
          </div>

          {/* Result Card */}
          <div className={`p-4 rounded-lg border ${
            creditResult.status === 'GREEN'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : creditResult.status === 'AMBER'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-start gap-2.5">
              {creditResult.status === 'GREEN' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : creditResult.status === 'AMBER' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <p className="font-semibold">{creditResult.message}</p>
                <div className="font-mono text-[11px] opacity-90">
                  Projected Balance: PKR {creditResult.projectedOutstanding.toLocaleString()} / Limit: PKR {creditLimit.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Inventory Transaction Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-slate-900">2. Inventory Transaction Engine</h2>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              Opening + In - Out = Current
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Current Stock</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Transaction Type</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as InventoryTransactionType)}
                className="w-full px-2 py-1.5 border rounded-md text-xs font-mono bg-slate-50 text-slate-900"
              >
                <option value="PRODUCTION_IN">PRODUCTION_IN (+)</option>
                <option value="SALES_OUT">SALES_OUT (-)</option>
                <option value="RETURN_IN">RETURN_IN (+)</option>
                <option value="DAMAGE_OUT">DAMAGE_OUT (-)</option>
                <option value="TRANSFER_IN">TRANSFER_IN (+)</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT (-)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Quantity</label>
              <input
                type="number"
                value={txQuantity}
                onChange={(e) => setTxQuantity(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
          </div>

          {/* Stock Calculation Result */}
          <div className={`p-4 rounded-lg border ${
            stockError
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            {stockError ? (
              <div className="flex items-center gap-2 text-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-semibold">{stockError}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Calculated New Stock Balance:</span>
                  <span className="text-lg font-mono font-bold text-amber-400">
                    {newStockResult.toLocaleString()} Units
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  {currentStock} {txType.includes('_IN') ? '+' : '-'} {txQuantity} = {newStockResult}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Customer Ledger Calculation Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">3. Customer Ledger Formula</h2>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              Opening + Debits - Credits = Closing
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Opening Balance</label>
              <input
                type="number"
                value={ledgerOpening}
                onChange={(e) => setLedgerOpening(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Debit (Invoice/Note)</label>
              <input
                type="number"
                value={ledgerDebit}
                onChange={(e) => setLedgerDebit(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-emerald-700 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Credit (Recovery/Return)</label>
              <input
                type="number"
                value={ledgerCredit}
                onChange={(e) => setLedgerCredit(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-sky-700 font-semibold"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs block">Customer Closing Balance:</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                PKR {ledgerClosing.toLocaleString()}
              </span>
            </div>
            <div className="text-right text-xs font-mono text-slate-400">
              PKR {ledgerOpening.toLocaleString()} + {ledgerDebit.toLocaleString()} - {ledgerCredit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 4. Recovery Validation Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <h2 className="font-bold text-slate-900">4. Recovery Collection Validation</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
              recoveryValidation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {recoveryValidation.isValid ? 'VALID' : 'INVALID'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-medium block mb-1">Collected Amount (PKR)</label>
              <input
                type="number"
                value={recoveryAmount}
                onChange={(e) => setRecoveryAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-1.5 border rounded-md text-xs bg-slate-50 text-slate-900"
              >
                <option value="CASH">CASH</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="PAY_ORDER">PAY ORDER</option>
                <option value="ONLINE_TRANSFER">ONLINE TRANSFER</option>
              </select>
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Cheque / Instrument Number</label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="Required for cheque/pay order"
                className="w-full px-3 py-1.5 border rounded-md font-mono bg-slate-50 text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-600 font-medium block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Habib Bank Ltd"
                className="w-full px-3 py-1.5 border rounded-md bg-slate-50 text-slate-900"
              />
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs ${
            recoveryValidation.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {recoveryValidation.isValid ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instrument information passes accounting validation rules. Ready for verification.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{recoveryValidation.error}</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
