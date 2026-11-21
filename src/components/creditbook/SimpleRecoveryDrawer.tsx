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

import React, { useEffect, useRef, useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { generateUniqueRecoveryId, generateIdempotencyUuid } from '../../utils/idGenerator';
import { getKarachiDateString, formatKarachiDateTime } from '../../utils/dateTime';
import { buildTransactionFingerprint, generateDeterministicTransactionId } from '../../utils/transactionSignature';

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftIdempotencyKey, setDraftIdempotencyKey] = useState<string>(() => generateIdempotencyUuid());
  const submitLockRef = useRef(false);

  const previousBalance = customer.currentBalance ?? customer.openingBalance ?? 0;
  const paymentAmount = Math.max(0, parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0);
  const projectedBalance = Math.max(0, previousBalance - paymentAmount);

  const handleResetAndClose = () => {
    triggerHaptic('light');
    setAmountStr('');
    setPaymentMode('CASH');
    setInstrumentNumber('');
    setBankName('');
    setNotes('');
    setSlipImage(null);
    setSubmittedRecovery(null);
    setValidationError(null);
    setIsSubmitting(false);
    submitLockRef.current = false;
    setDraftIdempotencyKey(generateIdempotencyUuid());
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setDraftIdempotencyKey(generateIdempotencyUuid());
    setValidationError(null);
    setIsSubmitting(false);
    submitLockRef.current = false;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleResetAndClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleSubmitRecovery = () => {
    if (submitLockRef.current || isSubmitting) return;
    if (paymentAmount <= 0) {
      setValidationError('Please enter a valid recovery amount greater than 0 PKR.');
      return;
    }

    setValidationError(null);
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const recoveryId = generateUniqueRecoveryId();
      const nowIso = new Date().toISOString();
      const businessDatePkt = getKarachiDateString(nowIso);
      const txnId = generateDeterministicTransactionId('PAY', businessDatePkt);
      const fpHash = buildTransactionFingerprint({
        module: 'PAYMENT',
        customerId: customer.id,
        amount: paymentAmount,
        businessDate: businessDatePkt,
        paymentMode,
        instrumentNumber: instrumentNumber || undefined,
        idempotencyKey: draftIdempotencyKey,
      });

      const newRec: Recovery = {
        id: recoveryId,
        idempotencyKey: draftIdempotencyKey,
        transactionId: txnId,
        fingerprintHash: fpHash,
        databaseId: recoveryId,
        sourceSystem: 'NLINK_WEB',
        syncStatus: 'SAVED_IN_DB',
        recoveryNumber: recoveryId,
        customerId: customer.id,
        customerName: customer.companyName,
        customerCode: customer.customerCode || 'NL-DLR',
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        createdBy: currentUser.email || currentUser.fullName,
        collectionDate: businessDatePkt,
        paymentDate: businessDatePkt,
        amount: paymentAmount,
        paymentMode,
        instrumentNumber: instrumentNumber || undefined,
        bankName: bankName || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        status: 'PENDING_VERIFICATION',
        remarks: notes || undefined,
        receiptUrl: slipImage || undefined,
        shahzadApproval: 'PENDING',
        dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
      };

      triggerHaptic('success');
      onRecordRecovery(newRec);
      setSubmittedRecovery(newRec);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#1E293B] w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-700/80 flex items-center justify-between gap-3 bg-white dark:bg-[#0F172A] shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#16A34A] dark:text-emerald-400">
              Record Customer Payment / Wasooli
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white truncate">
              {customer.companyName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Town: <strong>{customer.town || customer.city}</strong> &bull; Dealer Code: {customer.customerCode || 'NL-DLR'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close payment drawer"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Stat Financial Breakdown Card */}
        <div className="px-4 pt-3 shrink-0">
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700/80 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Outstanding</span>
              <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white text-xs block mt-0.5 truncate">
                PKR {previousBalance.toLocaleString()}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Credit Limit</span>
              <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-xs block mt-0.5 truncate">
                PKR {(customer.creditLimit || 1500000).toLocaleString()}
              </span>
            </div>
            <div className="text-right min-w-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Projected Bal</span>
              <span className="font-mono tabular-nums font-bold text-[#F97316] dark:text-orange-400 text-xs block mt-0.5 truncate">
                PKR {projectedBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {submittedRecovery ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="space-y-4 py-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Payment Recorded Successfully
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  Recovery <strong>#{submittedRecovery.id}</strong> of{' '}
                  <strong>PKR {submittedRecovery.amount.toLocaleString()}</strong> recorded.
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-md text-amber-900 dark:text-amber-200 text-xs font-semibold">
                  Awaiting Shahzad Ullah&apos;s Verification
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 text-left text-xs space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Transaction Signature</span>
                  <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-200">
                    {submittedRecovery.transactionId || submittedRecovery.id}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Payment Amount</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                    PKR {submittedRecovery.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Payment Mode</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {submittedRecovery.paymentMode}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Recorded (PKT)</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    {formatKarachiDateTime(submittedRecovery.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Collected By</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {currentUser.fullName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="btn-primary w-full min-h-[44px] text-xs"
              >
                Done / Back to Customer 360
              </button>
            </div>
          ) : (
            /* ACTIVE FORM */
            <div className="space-y-4 text-xs">
              {/* Payment Amount Input */}
              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                  Enter Received Amount (PKR)
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-500 dark:text-slate-400 pointer-events-none select-none">
                    PKR
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full min-h-[48px] pl-14 pr-4 py-3 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-lg font-mono tabular-nums font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Quick Amount Suggestion Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setAmountStr(previousBalance.toString());
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 font-semibold text-xs cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all border border-emerald-200 dark:border-emerald-800/70 tabular-nums"
                  >
                    Full Balance (PKR {previousBalance.toLocaleString()})
                  </button>

                  {previousBalance > 50000 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setAmountStr(Math.round(previousBalance / 2).toString());
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all border border-[#E2E8F0] dark:border-slate-700 tabular-nums"
                    >
                      50% (PKR {Math.round(previousBalance / 2).toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Select Payment Mode
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['CASH', 'CHEQUE', 'ONLINE_TRANSFER', 'PAY_ORDER'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setPaymentMode(mode);
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl font-semibold text-xs border text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                        paymentMode === mode
                          ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs font-bold'
                          : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Bank / Cheque Details */}
              {paymentMode !== 'CASH' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank, HBL"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Cheque / Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-981240"
                      value={instrumentNumber}
                      onChange={(e) => setInstrumentNumber(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#16A34A]"
                    />
                  </div>
                </div>
              )}

              {/* Slip / Receipt Photo Upload */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Deposit Slip or Cheque Photo (Optional)
                </label>

                {slipImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-slate-700 max-h-40">
                    <img src={slipImage} alt="Payment slip" className="w-full h-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setSlipImage(null)}
                      aria-label="Remove payment slip photo"
                      className="absolute top-2 right-2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-950/75 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 min-h-[52px] p-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
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
                <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Recovery Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposited by dealer at shop"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#16A34A]"
                />
              </div>

              {/* Balance Calculation */}
              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Current Balance</span>
                  <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-200">
                    PKR {previousBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">This Recovery</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    -PKR {paymentAmount.toLocaleString()} CR
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-700 flex justify-between gap-2 font-bold">
                  <span className="text-[#0F172A] dark:text-white">Remaining Balance</span>
                  <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                    PKR {projectedBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {validationError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Actions (Cancel left, Confirm right) */}
        {!submittedRecovery && (
          <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#0F172A] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="btn-outline min-h-[44px] text-xs px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitRecovery}
              disabled={paymentAmount <= 0 || isSubmitting}
              className="btn-primary flex-1 min-h-[44px] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="tabular-nums truncate">
                {isSubmitting ? 'Submitting...' : `Confirm & Log (PKR ${paymentAmount.toLocaleString()})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
