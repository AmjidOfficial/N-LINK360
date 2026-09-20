/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Executive Approval Center
 * Sole Signing Authority: Shahzad Ullah (Managing Director)
 * Review, approve, and confirm orders and payment recoveries with Credit Book clarity.
 */

import React, { useState } from 'react';
import { SalesOrder, Recovery, Customer } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { isAuthorizedApproverEmail } from '../../services/production-users';

export interface DualApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NLinkUser;
  orders: SalesOrder[];
  recoveries: Recovery[];
  customers: Customer[];
  onApproveOrder: (orderId: string, approver?: any) => void;
  onRejectOrder: (orderId: string, approver: any, reason?: string) => void;
  onApproveRecovery: (recoveryId: string, approver?: any) => void;
  onRejectRecovery: (recoveryId: string, approver: any, reason?: string) => void;
}

export const DualApprovalModal: React.FC<DualApprovalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  orders,
  recoveries,
  customers,
  onApproveOrder,
  onRejectOrder,
  onApproveRecovery,
  onRejectRecovery,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'recoveries' | 'history'>('orders');
  const [rejectingItem, setRejectingItem] = useState<{ id: string; type: 'ORDER' | 'RECOVERY'; number: string } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [viewingRecovery, setViewingRecovery] = useState<Recovery | null>(null);

  if (!isOpen) return null;

  // Authoritative Sole Approver Verification (Shahzad Ullah)
  const isShahzad = isAuthorizedApproverEmail(currentUser?.email);

  // Filter pending orders awaiting Shahzad Ullah's review
  const pendingOrders = orders.filter((o) => {
    return o.status === 'SUBMITTED' || o.status === 'PENDING_APPROVAL';
  });

  // Filter pending recoveries awaiting Shahzad Ullah's confirmation
  const pendingRecoveries = recoveries.filter((r) => {
    return r.status === 'PENDING_VERIFICATION';
  });

  // Processed items for audit history
  const processedOrders = orders.filter((o) => o.status === 'APPROVED' || o.status === 'REJECTED');
  const processedRecoveries = recoveries.filter((r) => r.status === 'VERIFIED' || r.status === 'REJECTED');

  const handleConfirmRejection = () => {
    if (!rejectingItem) return;
    if (!rejectionReasonInput.trim()) {
      alert('Mandatory Rule: You must enter a clear rejection reason before declining.');
      return;
    }

    if (rejectingItem.type === 'ORDER') {
      onRejectOrder(rejectingItem.id, 'SHAHZAD', rejectionReasonInput.trim());
    } else {
      onRejectRecovery(rejectingItem.id, 'SHAHZAD', rejectionReasonInput.trim());
    }

    setRejectingItem(null);
    setRejectionReasonInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1626] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header - Simple & Focused */}
        <div className="bg-[#002447] text-white px-5 py-4 flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-teal-100 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">shield_person</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                Executive Approval Center
              </h3>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                Sole Signing Authority: <strong className="text-white font-bold">Shahzad Ullah</strong> (Managing Director)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* View-Only Notice if not Shahzad Ullah */}
        {!isShahzad && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
              <span><strong>View-Only Mode:</strong> Only Shahzad Ullah is authorized to approve orders or confirm payment recoveries.</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded font-bold uppercase">
              Auditor
            </span>
          </div>
        )}

        {/* Navigation Tabs - Credit Book Style */}
        <div className="flex bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">shopping_bag</span>
            <span>Orders Awaiting Approval</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              pendingOrders.length > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recoveries')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'recoveries'
                ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">payments</span>
            <span>Payments Awaiting Confirmation</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              pendingRecoveries.length > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {pendingRecoveries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">history</span>
            <span>History &amp; Audit Log</span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/20">

          {/* TAB 1: ORDERS AWAITING APPROVAL */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-4xl text-teal-500 mb-2 block">task_alt</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Orders Awaiting Approval</p>
                  <p className="text-xs text-slate-500 mt-1">All submitted field sales orders have been reviewed by Shahzad Ullah.</p>
                </div>
              ) : (
                pendingOrders.map((ord) => {
                  const cust = customers.find((c) => c.id === ord.customerId);
                  const oldBalance = cust?.currentBalance || 0;
                  const creditLimit = cust?.creditLimit || 250000;
                  const projectedBalance = oldBalance + ord.totalAmount;
                  const isOverLimit = projectedBalance > creditLimit;

                  return (
                    <div
                      key={ord.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-all"
                    >
                      {/* Top Row: Order #, Customer, Amount */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900">
                              {ord.orderNumber}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {ord.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({cust?.customerCode || ord.customerCode || 'DL-ACT'})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Sales Officer: <strong className="text-slate-700 dark:text-slate-300">{ord.salesUserName}</strong> • Town: <strong className="text-slate-700 dark:text-slate-300">{cust?.town || cust?.city || 'Peshawar'}</strong> • Date: {ord.orderDate}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-mono font-black text-slate-900 dark:text-white block">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isOverLimit
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {isOverLimit ? 'Over Credit Limit Warning' : 'Normal Credit Check'}
                          </span>
                        </div>
                      </div>

                      {/* Financial Metrics Strip - Credit Book Style */}
                      <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center text-xs border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Old Balance</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">Rs. {oldBalance.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Order Amount</span>
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-400">+ Rs. {ord.totalAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Projected Balance</span>
                          <span className={`font-mono font-bold ${isOverLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            Rs. {projectedBalance.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Credit Limit</span>
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-400">Rs. {creditLimit.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Items Breakdown Accordion/Preview */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Order Items ({ord.items.length} items):
                          </p>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                                <span>{item.skuName} × {item.orderedQuantity} pcs</span>
                                <span className="font-mono font-medium">Rs. {item.lineTotal.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions: View, Reject, Approve */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(ord)}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          disabled={!isShahzad}
                          onClick={() => setRejectingItem({ id: ord.id, type: 'ORDER', number: ord.orderNumber })}
                          className={`py-2 px-3 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors ${
                            !isShahzad ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={!isShahzad ? 'Approval authority restricted to Shahzad Ullah' : 'Reject Order'}
                        >
                          <span className="material-symbols-outlined text-[15px]">cancel</span>
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          disabled={!isShahzad}
                          onClick={() => onApproveOrder(ord.id, 'SHAHZAD')}
                          className={`flex-1 py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                            !isShahzad ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={!isShahzad ? 'Approval authority restricted to Shahzad Ullah' : 'Approve & Post to Ledger'}
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Approve Order (Shahzad Ullah)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS AWAITING CONFIRMATION */}
          {activeTab === 'recoveries' && (
            <div className="space-y-3">
              {pendingRecoveries.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-4xl text-teal-500 mb-2 block">verified</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Payments Awaiting Confirmation</p>
                  <p className="text-xs text-slate-500 mt-1">All collected payments have been verified and confirmed by Shahzad Ullah.</p>
                </div>
              ) : (
                pendingRecoveries.map((rec) => {
                  const cust = customers.find((c) => c.id === rec.customerId);
                  const oldBalance = cust?.currentBalance || 0;
                  const newBalance = Math.max(0, oldBalance - rec.amount);

                  return (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-all"
                    >
                      {/* Top Row: Recovery #, Customer, Amount */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              {rec.recoveryNumber}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {rec.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({cust?.customerCode || 'DL-ACT'})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Collected by: <strong className="text-slate-700 dark:text-slate-300">{rec.salesUserName}</strong> • Date: {rec.collectionDate}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                            Method: <strong className="text-blue-700 dark:text-blue-400">{rec.paymentMode}</strong>
                            {rec.instrumentNumber ? ` • Ref / Cheque #: ${rec.instrumentNumber}` : ''}
                            {rec.bankName ? ` • Bank: ${rec.bankName}` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                            Rs. {rec.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            Pending Ledger Credit
                          </span>
                        </div>
                      </div>

                      {/* Balance Before & After Strip */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg text-center text-xs border border-emerald-100 dark:border-emerald-900/40">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Balance Before</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">Rs. {oldBalance.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Recovery Paid</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">- Rs. {rec.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Balance After Payment</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            Rs. {newBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {rec.remarks && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                          "{rec.remarks}"
                        </p>
                      )}

                      {/* Actions: View, Reject, Confirm */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setViewingRecovery(rec)}
                          className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          disabled={!isShahzad}
                          onClick={() => setRejectingItem({ id: rec.id, type: 'RECOVERY', number: rec.recoveryNumber })}
                          className={`py-2 px-3 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors ${
                            !isShahzad ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={!isShahzad ? 'Confirmation authority restricted to Shahzad Ullah' : 'Reject Payment'}
                        >
                          <span className="material-symbols-outlined text-[15px]">cancel</span>
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          disabled={!isShahzad}
                          onClick={() => onApproveRecovery(rec.id, 'SHAHZAD')}
                          className={`flex-1 py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                            !isShahzad ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={!isShahzad ? 'Confirmation authority restricted to Shahzad Ullah' : 'Confirm Payment & Credit Ledger'}
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Confirm Payment (Shahzad Ullah)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: AUDIT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Processed Decisions Log
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {processedOrders.length + processedRecoveries.length} entries
                </span>
              </div>

              {processedOrders.length === 0 && processedRecoveries.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  No approval history recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {processedOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{ord.orderNumber}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            Sales Order
                          </span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">{ord.customerName}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Rs. {ord.totalAmount.toLocaleString()} • Decision: <strong className="text-slate-700 dark:text-slate-200">{ord.approvedBy || 'Shahzad Ullah'}</strong>
                          {ord.rejectionReason ? ` (Reason: ${ord.rejectionReason})` : ''}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 font-bold rounded-lg text-[10px] ${
                        ord.status === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                  ))}

                  {processedRecoveries.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{rec.recoveryNumber}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            Payment Recovery
                          </span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">{rec.customerName}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Rs. {rec.amount.toLocaleString()} • Confirmed by: <strong className="text-slate-700 dark:text-slate-200">{rec.verifiedBy || 'Shahzad Ullah'}</strong>
                          {rec.rejectionReason ? ` (Reason: ${rec.rejectionReason})` : ''}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 font-bold rounded-lg text-[10px] ${
                        rec.status === 'VERIFIED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}>
                        {rec.status === 'VERIFIED' ? 'CONFIRMED' : rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rejection Modal Dialog */}
        {rejectingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <span className="material-symbols-outlined text-[24px]">warning</span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Reject {rejectingItem.type === 'ORDER' ? 'Sales Order' : 'Recovery'} ({rejectingItem.number})
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Please provide an official business reason for rejecting this entry. The submitting officer will be informed.
              </p>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="E.g., Credit ceiling exceeded, invalid payment instrument ref, duplicate order..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingItem(null);
                    setRejectionReasonInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Order Modal */}
        {viewingOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Order Details - {viewingOrder.orderNumber}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="text-xs space-y-2 border-t border-b border-slate-100 dark:border-slate-800 py-3">
                <div className="flex justify-between"><span className="text-slate-500">Customer:</span><strong className="text-slate-800 dark:text-slate-200">{viewingOrder.customerName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Booked By:</span><strong className="text-slate-800 dark:text-slate-200">{viewingOrder.salesUserName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><strong className="text-slate-800 dark:text-slate-200">{viewingOrder.orderDate}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Amount:</span><strong className="text-slate-800 dark:text-slate-200 font-mono">Rs. {viewingOrder.totalAmount.toLocaleString()}</strong></div>
                {viewingOrder.notes && <div className="text-slate-500 pt-1">Notes: <span className="italic text-slate-700 dark:text-slate-300">{viewingOrder.notes}</span></div>}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Recovery Modal */}
        {viewingRecovery && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Payment Recovery - {viewingRecovery.recoveryNumber}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewingRecovery(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="text-xs space-y-2 border-t border-b border-slate-100 dark:border-slate-800 py-3">
                <div className="flex justify-between"><span className="text-slate-500">Customer:</span><strong className="text-slate-800 dark:text-slate-200">{viewingRecovery.customerName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Collected By:</span><strong className="text-slate-800 dark:text-slate-200">{viewingRecovery.salesUserName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Collection Date:</span><strong className="text-slate-800 dark:text-slate-200">{viewingRecovery.collectionDate}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Amount:</span><strong className="text-emerald-700 dark:text-emerald-400 font-mono">Rs. {viewingRecovery.amount.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Payment Mode:</span><strong className="text-slate-800 dark:text-slate-200">{viewingRecovery.paymentMode}</strong></div>
                {viewingRecovery.instrumentNumber && <div className="flex justify-between"><span className="text-slate-500">Ref / Cheque #:</span><strong className="text-slate-800 dark:text-slate-200 font-mono">{viewingRecovery.instrumentNumber}</strong></div>}
                {viewingRecovery.bankName && <div className="flex justify-between"><span className="text-slate-500">Bank:</span><strong className="text-slate-800 dark:text-slate-200">{viewingRecovery.bankName}</strong></div>}
                {viewingRecovery.remarks && <div className="text-slate-500 pt-1">Remarks: <span className="italic text-slate-700 dark:text-slate-300">{viewingRecovery.remarks}</span></div>}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingRecovery(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
