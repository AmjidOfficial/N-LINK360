/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Admin / Head Office Profile Update Approvals Modal
 * Allows Executive Sign-Off (Shahzad Ullah / Admin) to approve or reject employee profile changes
 */

import React, { useState } from 'react';
import { UserProfileUpdateRequest } from '../../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  AlertCircle,
} from 'lucide-react';

export interface ProfileApprovalRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: UserProfileUpdateRequest[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
}

export const ProfileApprovalRequestsModal: React.FC<ProfileApprovalRequestsModalProps> = ({
  isOpen,
  onClose,
  requests = [],
  onApproveRequest,
  onRejectRequest,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'PENDING_APPROVAL');

  const handleConfirmReject = (id: string) => {
    onRejectRequest(id, rejectReason.trim() || 'Declined by Administrator / Shahzad Ullah');
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Employee Profile Update Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendingRequests.length} pending change requests awaiting authorization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Request List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
              <p className="font-bold text-slate-700 dark:text-slate-300">All Profile Updates Cleared</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No pending employee profile modifications require authorization at this time.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3"
              >
                {/* Officer & Request Timestamp */}
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2.5">
                  <div>
                    <span className="font-black text-slate-900 dark:text-white text-sm block">
                      {req.currentFullName} &rarr; <span className="text-teal-700 dark:text-teal-300">{req.requestedFullName}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {req.userEmail} &bull; {req.currentRole}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Pending Sign-Off
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Changed Fields Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Phone: <strong>{req.requestedPhone}</strong></span>
                  </div>
                  {req.requestedCnic && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>CNIC: <strong>{req.requestedCnic}</strong></span>
                    </div>
                  )}
                  {req.requestedTowns && req.requestedTowns.length > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Town: <strong>{req.requestedTowns.join(', ')}</strong></span>
                    </div>
                  )}
                  {req.requestedRouteBeat && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Beat: <strong>{req.requestedRouteBeat}</strong></span>
                    </div>
                  )}
                  {req.requestedVehicleNo && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Car className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Vehicle: <strong>{req.requestedVehicleNo}</strong></span>
                    </div>
                  )}
                  {req.requestedEmergencyContact && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Emergency: <strong>{req.requestedEmergencyContact}</strong></span>
                    </div>
                  )}
                </div>

                {req.reason && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <strong>Reason for Change:</strong> {req.reason}
                  </p>
                )}

                {/* Reject Input Box if active */}
                {rejectingId === req.id && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2">
                    <label className="text-[11px] font-bold text-rose-900 dark:text-rose-200 block">
                      Rejection Remarks:
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Please provide valid CNIC copy / Contact HR..."
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs text-slate-900 dark:text-white outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-1 text-slate-600 text-[11px] font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmReject(req.id)}
                        className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
                      >
                        Confirm Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {rejectingId !== req.id && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(req.id);
                        setRejectReason('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onApproveRequest(req.id)}
                      className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Update User</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
