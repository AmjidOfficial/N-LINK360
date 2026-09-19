/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Executive Dual Approval Center
 * Dedicated workflow for Syed Zain & Shahzad Ullah to review, approve & reject
 * pending orders and payment recoveries before permanent posting to the ledger.
 */

import React, { useState } from 'react';
import { SalesOrder, Recovery, Customer } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';

export interface DualApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NLinkUser;
  orders: SalesOrder[];
  recoveries: Recovery[];
  customers: Customer[];
  onApproveOrder: (orderId: string, approver: 'ZAIN' | 'SHAHZAD') => void;
  onRejectOrder: (orderId: string, approver: 'ZAIN' | 'SHAHZAD', reason: string) => void;
  onApproveRecovery: (recoveryId: string, approver: 'ZAIN' | 'SHAHZAD') => void;
  onRejectRecovery: (recoveryId: string, approver: 'ZAIN' | 'SHAHZAD', reason: string) => void;
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
  const [rejectingItem, setRejectingItem] = useState<{ id: string; type: 'ORDER' | 'RECOVERY' } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  if (!isOpen) return null;

  // Filter pending orders needing Zain or Shahzad approval
  // Executive Policy: Either Syed Zain OR Shahzad Ullah approval gives immediate go-ahead to proceed!
  const pendingOrders = orders.filter((o) => {
    const isApproved = o.status === 'APPROVED' || o.zainApproval === 'APPROVED' || o.shahzadApproval === 'APPROVED';
    const isRejected = o.status === 'REJECTED' || o.zainApproval === 'REJECTED' || o.shahzadApproval === 'REJECTED';
    return !isApproved && !isRejected;
  });

  // Filter pending recoveries needing Zain or Shahzad approval
  // Executive Policy: Either Syed Zain OR Shahzad Ullah approval gives immediate go-ahead to proceed!
  const pendingRecoveries = recoveries.filter((r) => {
    const isApproved = r.status === 'VERIFIED' || r.zainApproval === 'APPROVED' || r.shahzadApproval === 'APPROVED';
    const isRejected = r.status === 'REJECTED' || r.zainApproval === 'REJECTED' || r.shahzadApproval === 'REJECTED';
    return !isApproved && !isRejected;
  });

  // Filter processed items for audit history
  const processedOrders = orders.filter((o) => {
    return o.status === 'APPROVED' || o.status === 'REJECTED' || o.zainApproval === 'APPROVED' || o.shahzadApproval === 'APPROVED';
  });

  const processedRecoveries = recoveries.filter((r) => {
    return r.status === 'VERIFIED' || r.status === 'REJECTED' || r.zainApproval === 'APPROVED' || r.shahzadApproval === 'APPROVED';
  });

  // Determine current approver identity
  const userEmailClean = (currentUser.email || '').toLowerCase().trim();
  const isZain = userEmailClean.includes('syedzain') || userEmailClean.includes('zain');
  const isShahzad = userEmailClean.includes('shahzad');
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MANAGEMENT';

  const handleConfirmRejection = () => {
    if (!rejectingItem) return;
    if (!rejectionReasonInput.trim()) {
      alert('Mandatory Rule: You must enter a clear rejection reason before denying approval.');
      return;
    }

    const targetApprover: 'ZAIN' | 'SHAHZAD' = isShahzad ? 'SHAHZAD' : 'ZAIN';

    if (rejectingItem.type === 'ORDER') {
      onRejectOrder(rejectingItem.id, targetApprover, rejectionReasonInput.trim());
    } else {
      onRejectRecovery(rejectingItem.id, targetApprover, rejectionReasonInput.trim());
    }

    setRejectingItem(null);
    setRejectionReasonInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#09111e] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#001428] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#102a45]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006b5f] text-[#76f4e0] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2">
                Executive Approval Center
              </h3>
              <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Executive Rule:</span>
                <span className="font-bold text-[#76f4e0]">Syed Zain OR Shahzad Ullah approval authorizes immediate execution (No need for both)</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current Approver Identity Bar */}
        <div className="px-5 py-2.5 bg-[#f0f9f8] dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Active Session Persona:</span>
            <span className="font-bold text-[#001428] dark:text-[#76f4e0] bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
              {currentUser.fullName} ({currentUser.email})
            </span>
          </div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
            {isZain ? 'Signed in as Syed Zain' : isShahzad ? 'Signed in as Shahzad Ullah' : 'Executive Admin Mode'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-[#006b5f] dark:text-[#76f4e0] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Pending Orders ({pendingOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recoveries')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'recoveries'
                ? 'bg-white dark:bg-slate-800 text-[#006b5f] dark:text-[#76f4e0] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Pending Recoveries ({pendingRecoveries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-[#006b5f] dark:text-[#76f4e0] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Approval History</span>
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">

          {/* TAB 1: PENDING ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">check_circle</span>
                  <p className="text-sm font-bold">All field orders have been reviewed!</p>
                  <p className="text-xs text-slate-500 mt-1">No pending order requests awaiting Syed Zain or Shahzad Ullah dual approval.</p>
                </div>
              ) : (
                pendingOrders.map((ord) => {
                  const cust = customers.find((c) => c.id === ord.customerId);
                  const zainStatus = ord.zainApproval || 'PENDING';
                  const shahzadStatus = ord.shahzadApproval || 'PENDING';

                  return (
                    <div
                      key={ord.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-[#001428] dark:text-[#76f4e0] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {ord.orderNumber}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {ord.customerName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Booked by: <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.salesUserName}</span> • Date: {ord.orderDate}
                          </p>
                          {cust && (
                            <p className="text-[11px] text-[#006b5f] dark:text-[#76f4e0] font-semibold mt-0.5">
                              Town Beat: {cust.town || cust.city || 'Peshawar'} | Code: {cust.customerCode}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-mono block">
                            Rs. {ord.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-teal-700 dark:text-[#76f4e0] font-bold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-900/50">
                            ⚡ Single Sign-off: Zain OR Shahzad
                          </span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Items Catalog ({ord.items.length}):</p>
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                              <span>{item.skuName} × {item.orderedQuantity} pcs</span>
                              <span className="font-mono">Rs. {item.lineTotal.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Executive Status Badges */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {/* Syed Zain Badge */}
                        <div className={`p-2 rounded-xl flex items-center justify-between border ${
                          zainStatus === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : zainStatus === 'REJECTED'
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          <div>
                            <span className="font-bold block text-[11px]">Syed Zain:</span>
                            <span className="text-[10px] font-semibold">{zainStatus}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">
                            {zainStatus === 'APPROVED' ? 'check_circle' : zainStatus === 'REJECTED' ? 'cancel' : 'radio_button_unchecked'}
                          </span>
                        </div>

                        {/* Shahzad Ullah Badge */}
                        <div className={`p-2 rounded-xl flex items-center justify-between border ${
                          shahzadStatus === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : shahzadStatus === 'REJECTED'
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          <div>
                            <span className="font-bold block text-[11px]">Shahzad Ullah:</span>
                            <span className="text-[10px] font-semibold">{shahzadStatus}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">
                            {shahzadStatus === 'APPROVED' ? 'check_circle' : shahzadStatus === 'REJECTED' ? 'cancel' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>

                      {/* Approver Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const approver = isShahzad ? 'SHAHZAD' : 'ZAIN';
                            onApproveOrder(ord.id, approver);
                          }}
                          className="flex-1 py-2.5 px-3 bg-[#006b5f] hover:bg-[#005249] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Approve &amp; Proceed as {isShahzad ? 'Shahzad Ullah' : 'Syed Zain'}</span>
                        </button>

                        <button
                          onClick={() => setRejectingItem({ id: ord.id, type: 'ORDER' })}
                          className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PENDING RECOVERIES */}
          {activeTab === 'recoveries' && (
            <div className="space-y-3">
              {pendingRecoveries.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">payments</span>
                  <p className="text-sm font-bold">All payment recoveries have been verified!</p>
                  <p className="text-xs text-slate-500 mt-1">No pending collections awaiting Syed Zain or Shahzad Ullah dual approval.</p>
                </div>
              ) : (
                pendingRecoveries.map((rec) => {
                  const cust = customers.find((c) => c.id === rec.customerId);
                  const zainStatus = rec.zainApproval || 'PENDING';
                  const shahzadStatus = rec.shahzadApproval || 'PENDING';

                  return (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-[#001428] dark:text-[#76f4e0] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {rec.recoveryNumber}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {rec.customerName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Collected by: <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.salesUserName}</span> • Date: {rec.collectionDate}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                            Mode: <span className="text-blue-600 dark:text-blue-400 font-bold">{rec.paymentMode}</span> | Ref #: {rec.instrumentNumber} {rec.bankName ? `(${rec.bankName})` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                            Rs. {rec.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-teal-700 dark:text-[#76f4e0] font-bold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-900/50">
                            ⚡ Single Sign-off: Zain OR Shahzad
                          </span>
                        </div>
                      </div>

                      {/* Executive Status Badges */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className={`p-2 rounded-xl flex items-center justify-between border ${
                          zainStatus === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : zainStatus === 'REJECTED'
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          <div>
                            <span className="font-bold block text-[11px]">Syed Zain:</span>
                            <span className="text-[10px] font-semibold">{zainStatus}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">
                            {zainStatus === 'APPROVED' ? 'check_circle' : zainStatus === 'REJECTED' ? 'cancel' : 'radio_button_unchecked'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl flex items-center justify-between border ${
                          shahzadStatus === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : shahzadStatus === 'REJECTED'
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          <div>
                            <span className="font-bold block text-[11px]">Shahzad Ullah:</span>
                            <span className="text-[10px] font-semibold">{shahzadStatus}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">
                            {shahzadStatus === 'APPROVED' ? 'check_circle' : shahzadStatus === 'REJECTED' ? 'cancel' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>

                      {/* Approver Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const approver = isShahzad ? 'SHAHZAD' : 'ZAIN';
                            onApproveRecovery(rec.id, approver);
                          }}
                          className="flex-1 py-2.5 px-3 bg-[#006b5f] hover:bg-[#005249] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Verify &amp; Proceed as {isShahzad ? 'Shahzad Ullah' : 'Syed Zain'}</span>
                        </button>

                        <button
                          onClick={() => setRejectingItem({ id: rec.id, type: 'RECOVERY' })}
                          className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processed Orders &amp; Recoveries Log</h4>
              
              {processedOrders.length === 0 && processedRecoveries.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No processed approval history yet.</p>
              ) : (
                <div className="space-y-2">
                  {processedOrders.map((ord) => {
                    const approverText = ord.approvedBy || (
                      ord.zainApproval === 'APPROVED' && ord.shahzadApproval === 'APPROVED'
                        ? 'Syed Zain & Shahzad Ullah'
                        : ord.zainApproval === 'APPROVED'
                        ? 'Syed Zain'
                        : ord.shahzadApproval === 'APPROVED'
                        ? 'Shahzad Ullah'
                        : 'Executive'
                    );

                    return (
                      <div key={ord.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{ord.orderNumber}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">Sales Order</span>
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">{ord.customerName}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Rs. {ord.totalAmount.toLocaleString()} • Authorized by: <strong className="text-slate-700 dark:text-slate-200">{approverText}</strong>
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                          ord.status === 'REJECTED'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {ord.status === 'REJECTED' ? '✕ Rejected' : '✓ Authorized & Posted'}
                        </span>
                      </div>
                    );
                  })}

                  {processedRecoveries.map((rec) => {
                    const approverText = rec.verifiedBy || (
                      rec.zainApproval === 'APPROVED' && rec.shahzadApproval === 'APPROVED'
                        ? 'Syed Zain & Shahzad Ullah'
                        : rec.zainApproval === 'APPROVED'
                        ? 'Syed Zain'
                        : rec.shahzadApproval === 'APPROVED'
                        ? 'Shahzad Ullah'
                        : 'Executive'
                    );

                    return (
                      <div key={rec.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{rec.recoveryNumber}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Recovery</span>
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">{rec.customerName}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Rs. {rec.amount.toLocaleString()} ({rec.paymentMode}) • Verified by: <strong className="text-slate-700 dark:text-slate-200">{approverText}</strong>
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                          rec.status === 'REJECTED'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {rec.status === 'REJECTED' ? '✕ Rejected' : '✓ Verified & Credited'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            ⚡ Approval Rule: Either <strong className="text-slate-900 dark:text-white">Syed Zain</strong> or <strong className="text-slate-900 dark:text-white">Shahzad Ullah</strong> sign-off grants immediate authorization to proceed.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>

      {/* Rejection Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <span className="material-symbols-outlined text-xl">warning</span>
              <span>Mandatory Rejection Reason</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please enter an explicit reason why this {rejectingItem.type.toLowerCase()} request is being rejected by {isShahzad ? 'Shahzad Ullah' : 'Syed Zain'}.
            </p>
            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="e.g. Credit limit exceeded without special approval / Incorrect cheque reference..."
              className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 outline-none font-medium h-24"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
