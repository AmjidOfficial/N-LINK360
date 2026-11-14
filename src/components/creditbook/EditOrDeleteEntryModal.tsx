/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Edit or Delete / Reverse Entry Modal
 * 
 * Provides interactive editing and safe accounting cancellation/reversal
 * for today's orders, recoveries, and attendance records.
 */

import React, { useState, useEffect } from 'react';
import { Customer, SalesOrder, Recovery, EmployeeAttendance } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  canUserEditEntry,
  canUserDeleteEntry,
  getBusinessTodayDate,
} from '../../utils/entryManagement';
import { triggerHaptic } from '../../utils/haptics';
import {
  X,
  AlertTriangle,
  Trash2,
  Edit3,
  CheckCircle2,
  RotateCcw,
  Receipt,
  ShoppingBag,
  Clock,
} from 'lucide-react';

export interface EditOrDeleteEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryType: 'ORDER' | 'RECOVERY' | 'ATTENDANCE';
  entryData: any;
  currentUser: NLinkUser;
  customer?: Customer | null;
  onSave: (type: 'ORDER' | 'RECOVERY' | 'ATTENDANCE', id: string, updates: any) => void;
  onDeleteOrReverse: (type: 'ORDER' | 'RECOVERY' | 'ATTENDANCE', id: string, reason: string) => void;
}

export const EditOrDeleteEntryModal: React.FC<EditOrDeleteEntryModalProps> = ({
  isOpen,
  onClose,
  entryType,
  entryData,
  currentUser,
  onSave,
  onDeleteOrReverse,
}) => {
  const [activeMode, setActiveMode] = useState<'EDIT' | 'DELETE'>('EDIT');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Order Edit
  const [orderNotes, setOrderNotes] = useState('');

  // Form state for Recovery Edit
  const [recoveryAmount, setRecoveryAmount] = useState<number>(0);
  const [recoveryMode, setRecoveryMode] = useState<string>('CASH');
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [recoveryRemarks, setRecoveryRemarks] = useState('');

  // Form state for Attendance Edit
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [attendanceRemarks, setAttendanceRemarks] = useState('');

  // Populate form fields when entry opens
  useEffect(() => {
    if (!entryData) return;
    setReason('');
    setValidationError(null);
    setIsSubmitting(false);

    if (entryType === 'ORDER') {
      setOrderNotes(entryData.notes || '');
    } else if (entryType === 'RECOVERY') {
      setRecoveryAmount(entryData.amount || 0);
      setRecoveryMode(entryData.paymentMode || 'CASH');
      setInstrumentNumber(entryData.instrumentNumber || '');
      setBankName(entryData.bankName || '');
      setRecoveryRemarks(entryData.remarks || '');
    } else if (entryType === 'ATTENDANCE') {
      setCheckInTime(entryData.checkInTime || '');
      setCheckOutTime(entryData.checkOutTime || '');
      setAttendanceRemarks(entryData.remarks || '');
    }
  }, [entryType, entryData, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !entryData) return null;

  const permissions =
    activeMode === 'EDIT'
      ? canUserEditEntry(entryData, currentUser)
      : canUserDeleteEntry(entryData, currentUser);

  const handleSaveEdit = async () => {
    if (!permissions.allowed) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const id = entryData.id || entryData.orderNumber || entryData.recoveryNumber;
      let updates: any = {};

      if (entryType === 'ORDER') {
        updates = { notes: orderNotes.trim() };
      } else if (entryType === 'RECOVERY') {
        updates = {
          amount: Number(recoveryAmount) || entryData.amount,
          paymentMode: recoveryMode as any,
          instrumentNumber: instrumentNumber.trim() || undefined,
          bankName: bankName.trim() || undefined,
          remarks: recoveryRemarks.trim() || undefined,
        };
      } else if (entryType === 'ATTENDANCE') {
        updates = {
          checkInTime: checkInTime.trim() || entryData.checkInTime,
          checkOutTime: checkOutTime.trim() || undefined,
          remarks: attendanceRemarks.trim() || undefined,
        };
      }
      onSave(entryType, id, updates);
      onClose();
    } catch (err) {
      console.error('Error saving entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteOrReverse = async () => {
    if (!permissions.allowed) return;
    if (permissions.requiresReversal && !reason.trim()) {
      setValidationError('A formal audit reason is required to cancel or reverse this posted entry.');
      return;
    }
    setValidationError(null);

    setIsSubmitting(true);
    triggerHaptic('warning');

    try {
      const finalReason = reason.trim() || 'Entry deleted by user';
      const id = entryData.id || entryData.orderNumber || entryData.recoveryNumber;
      onDeleteOrReverse(entryType, id, finalReason);
      onClose();
    } catch (err) {
      console.error('Error deleting or reversing entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEntryTitle = () => {
    if (entryType === 'ORDER') return `Sales Order #${entryData.orderNumber || entryData.id}`;
    if (entryType === 'RECOVERY') return `Payment Voucher #${entryData.recoveryNumber || entryData.id}`;
    return `Attendance: ${entryData.date} (${entryData.employeeName})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#1B5E3A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {entryType === 'ORDER' ? (
              <ShoppingBag className="w-5 h-5 text-[#F59E0B] shrink-0" />
            ) : entryType === 'RECOVERY' ? (
              <Receipt className="w-5 h-5 text-[#10B981] shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-[#0D9488] shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{getEntryTitle()}</h3>
              <p className="text-[11px] font-mono text-slate-300">
                Created: {entryData.orderDate || entryData.collectionDate || entryData.date || entryData.createdAt?.slice(0, 10)} &middot; Status: {entryData.status}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Mode Toggle (Edit vs Cancel/Reverse) */}
        <div className="p-3 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('EDIT');
              setValidationError(null);
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              activeMode === 'EDIT'
                ? 'bg-[#1B5E3A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4 text-[#0D9488]" />
            <span>Edit Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('DELETE');
              setValidationError(null);
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              activeMode === 'DELETE'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            {permissions.requiresReversal ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Accounting Reversal</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Cancel / Delete</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Permission Alert if not allowed */}
          {!permissions.allowed && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Action Restricted</strong>
                <p className="text-[11px] mt-0.5">{permissions.reason}</p>
              </div>
            </div>
          )}

          {/* EDIT FORM */}
          {activeMode === 'EDIT' && (
            <div className="space-y-3.5">
              {entryType === 'ORDER' && (
                <div>
                  <div className="mb-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Order Total</span>
                    <span className="text-base font-bold font-mono text-[#0F172A] dark:text-white">
                      Rs. {Number(entryData.totalAmount || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {entryData.items?.length || 0} SKUs booked for {entryData.customerName}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Order Notes / Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Add dispatch instructions or delivery notes..."
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </div>
              )}

              {entryType === 'RECOVERY' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Recovery Amount (PKR)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={recoveryAmount}
                      onChange={(e) => setRecoveryAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={recoveryMode}
                      onChange={(e) => setRecoveryMode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#0F172A] dark:text-white outline-none focus:border-[#0D9488]"
                    >
                      <option value="CASH">Cash in Hand</option>
                      <option value="ONLINE_TRANSFER">Online Bank Transfer</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="PAY_ORDER">Pay Order</option>
                    </select>
                  </div>

                  {recoveryMode !== 'CASH' && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. Meezan, HBL"
                          className="w-full p-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Instrument / Txn #
                        </label>
                        <input
                          type="text"
                          value={instrumentNumber}
                          onChange={(e) => setInstrumentNumber(e.target.value)}
                          placeholder="e.g. 1092837"
                          className="w-full p-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Remarks / Receipt Reference
                    </label>
                    <input
                      type="text"
                      value={recoveryRemarks}
                      onChange={(e) => setRecoveryRemarks(e.target.value)}
                      placeholder="e.g. Booked at Shop Counter"
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              )}

              {entryType === 'ATTENDANCE' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Check-In Time
                      </label>
                      <input
                        type="text"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        placeholder="09:00 AM"
                        className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Check-Out Time
                      </label>
                      <input
                        type="text"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        placeholder="05:30 PM"
                        className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Attendance Remarks
                    </label>
                    <input
                      type="text"
                      value={attendanceRemarks}
                      onChange={(e) => setAttendanceRemarks(e.target.value)}
                      placeholder="e.g. Commercial Beat Covered"
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DELETE / REVERSE FORM */}
          {activeMode === 'DELETE' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {permissions.requiresReversal
                      ? 'Formal Accounting Reversal Required'
                      : 'Confirm Cancellation of Today Entry'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {permissions.requiresReversal
                    ? 'Because this entry has already been posted to the official financial ledger, deleting it directly is prohibited. An official reversal note (Credit Note / Debit Note) will be created to balance the customer khata with full audit history.'
                    : 'This unapproved entry will be safely cancelled. You can create a new entry anytime.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Reason for Cancellation / Reversal *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Explain why this entry is being cancelled (required for audit)..."
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#0F172A] dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#F8FAFC] dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline min-h-[40px] text-xs"
          >
            Cancel
          </button>

          {activeMode === 'EDIT' ? (
            <button
              type="button"
              disabled={!permissions.allowed || isSubmitting}
              onClick={handleSaveEdit}
              className="btn-primary min-h-[40px] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!permissions.allowed || (permissions.requiresReversal && !reason.trim()) || isSubmitting}
              onClick={handleConfirmDeleteOrReverse}
              className="btn-danger min-h-[40px] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : permissions.requiresReversal ? 'Authorize Reversal' : 'Confirm Cancel'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
