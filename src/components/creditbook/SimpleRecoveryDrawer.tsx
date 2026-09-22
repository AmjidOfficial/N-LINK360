/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Simple Recovery Entry Drawer
 * Streamlined payment collection interface matching CreditBook UX:
 * - Payment Mode (Cash, Cheque, Online Transfer, Pay Order)
 * - Amount in PKR with remaining balance auto-calculation
 * - Camera/slip image upload support
 * - Immediate offline queue & Google Sheets sync
 */

import React, { useState } from 'react';
import { Customer, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  X,
  CreditCard,
  CheckCircle2,
  Upload,
  Camera,
  Receipt,
  Wallet,
  Building2,
  TrendingDown,
} from 'lucide-react';

export interface SimpleRecoveryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentUser: NLinkUser;
  onRecordRecovery: (recovery: Recovery) => void;
}

export const SimpleRecoveryDrawer: React.FC<SimpleRecoveryDrawerProps> = ({
  isOpen,
  onClose,
  customer,
  currentUser,
  onRecordRecovery,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'PAY_ORDER'>('CASH');
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [submittedRecovery, setSubmittedRecovery] = useState<Recovery | null>(null);

  const previousBalance = customer.currentBalance ?? customer.openingBalance ?? 0;
  const paymentAmount = Math.max(0, parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0);
  const projectedBalance = Math.max(0, previousBalance - paymentAmount);

  const handleSubmitRecovery = () => {
    if (paymentAmount <= 0) {
      alert('Please enter a valid recovery amount.');
      return;
    }

    const recoveryId = `REC-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const newRec: Recovery = {
      id: recoveryId,
      recoveryNumber: recoveryId,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode || 'NL-DLR',
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      collectionDate: nowIso.slice(0, 10),
      amount: paymentAmount,
      paymentMode,
      instrumentNumber: instrumentNumber || undefined,
      bankName: bankName || undefined,
      createdAt: nowIso,
      status: 'PENDING_VERIFICATION',
      remarks: notes || undefined,
      receiptUrl: slipImage || undefined,
      shahzadApproval: 'PENDING',
      dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
    };

    onRecordRecovery(newRec);
    setSubmittedRecovery(newRec);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAndClose = () => {
    setAmountStr('');
    setPaymentMode('CASH');
    setInstrumentNumber('');
    setBankName('');
    setNotes('');
    setSlipImage(null);
    setSubmittedRecovery(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
              Record Customer Payment / Wasooli
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {customer.companyName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Town: <strong>{customer.town || customer.city}</strong> &bull; Total Balance: Rs. {previousBalance.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {submittedRecovery ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="space-y-4 py-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Recorded Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recovery <strong>#{submittedRecovery.id}</strong> of{' '}
                  <strong>Rs. {submittedRecovery.amount.toLocaleString()} PKR</strong> recorded.
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full text-amber-900 dark:text-amber-200 text-xs font-bold">
                  ⏳ Awaiting Shahzad Ullah&apos;s Verification
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Amount:</span>
                  <span className="font-mono font-black text-emerald-800 dark:text-emerald-300">
                    Rs. {submittedRecovery.amount.toLocaleString()} PKR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {submittedRecovery.paymentMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Collected By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {currentUser.fullName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Done / Back to Customer 360
              </button>
            </div>
          ) : (
            /* ACTIVE FORM */
            <div className="space-y-4 text-xs">
              {/* Payment Amount Input */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  Enter Received Amount (PKR)
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-3 font-mono font-black text-sm text-emerald-900 dark:text-emerald-300">
                    Rs.
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-lg font-mono font-black text-emerald-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Quick Amount Suggestion Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAmountStr(previousBalance.toString())}
                    className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-[11px] cursor-pointer hover:bg-emerald-200"
                  >
                    Full Balance (Rs. {previousBalance.toLocaleString()})
                  </button>

                  {previousBalance > 50000 && (
                    <button
                      type="button"
                      onClick={() => setAmountStr(Math.round(previousBalance / 2).toString())}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer hover:bg-slate-200"
                    >
                      50% (Rs. {Math.round(previousBalance / 2).toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  Select Payment Mode
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['CASH', 'CHEQUE', 'ONLINE_TRANSFER', 'PAY_ORDER'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Bank / Cheque Details */}
              {paymentMode !== 'CASH' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank, HBL"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Cheque / Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-981240"
                      value={instrumentNumber}
                      onChange={(e) => setInstrumentNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Slip / Receipt Photo Upload */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  Deposit Slip or Cheque Photo (Optional)
                </label>

                {slipImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-40">
                    <img src={slipImage} alt="Payment slip" className="w-full h-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setSlipImage(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/70 text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                      Upload Deposit Slip / Camera Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  Recovery Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposited by dealer at shop"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Balance Calculation */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Balance:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Rs. {previousBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">This Recovery:</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                    - Rs. {paymentAmount.toLocaleString()}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                  <span className="text-slate-800 dark:text-white">Remaining Balance:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    Rs. {projectedBalance.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleSubmitRecovery}
                disabled={paymentAmount <= 0}
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  paymentAmount <= 0
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98 shadow-emerald-950/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM &amp; LOG RECOVERY (Rs. {paymentAmount.toLocaleString()})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
