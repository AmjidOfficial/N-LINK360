/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Edit User Profile Modal with Admin Approval Workflow
 */

import React, { useState } from 'react';
import { NLinkUser } from '../../data/nlink-users-team';
import { UserProfileUpdateRequest, TownNode } from '../../types';
import { ALL_PAKISTAN_TOWNS, CITY_ROUTES_AND_BEATS } from '../../data/pakistan-geography';
import { getStoredTownNodes, getActiveTownNames, getRoutesForTown } from '../../services/townManagement';
import {
  X,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Send,
  Building2,
  Car,
  AlertCircle,
  FileCheck,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NLinkUser;
  onSubmitRequest: (request: UserProfileUpdateRequest) => void;
  pendingRequest?: UserProfileUpdateRequest | null;
  townNodes?: TownNode[];
}

export const EditUserProfileModal: React.FC<EditUserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmitRequest,
  pendingRequest,
  townNodes,
}) => {
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const activeTownsList = getActiveTownNames(effectiveTownNodes);
  const safeTowns = activeTownsList.length > 0 ? activeTownsList : ALL_PAKISTAN_TOWNS;

  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [cnic, setCnic] = useState(currentUser.cnic || '');
  const [selectedTown, setSelectedTown] = useState(
    (currentUser.assignedTowns?.[0] && safeTowns.includes(currentUser.assignedTowns[0]))
      ? currentUser.assignedTowns[0]
      : (safeTowns[0] || 'Peshawar')
  );
  const [routeBeat, setRouteBeat] = useState(
    currentUser.assignedTowns?.includes('Peshawar') ? 'Duran Pur Route / GT Road Beat' : 'Main Commercial Beat'
  );
  const [vehicleNo, setVehicleNo] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const beatsForSelectedTown = getRoutesForTown(selectedTown, effectiveTownNodes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setIsSubmitting(true);

    const updateRequest: UserProfileUpdateRequest = {
      id: `REQ-${Date.now()}`,
      userId: currentUser.id || currentUser.email,
      userEmail: currentUser.email,
      currentFullName: currentUser.fullName,
      currentRole: currentUser.roleTitle || currentUser.role,
      requestedFullName: fullName.trim(),
      requestedPhone: phone.trim(),
      requestedEmail: email.trim(),
      requestedCnic: cnic.trim(),
      requestedTowns: [selectedTown],
      requestedRouteBeat: routeBeat,
      requestedVehicleNo: vehicleNo.trim(),
      requestedEmergencyContact: emergencyContact.trim(),
      requestedAddress: address.trim(),
      reason: reason.trim() || 'Field officer profile update',
      status: 'PENDING_APPROVAL',
      requestedAt: new Date().toISOString(),
    };

    onSubmitRequest(updateRequest);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage('Your profile update request has been submitted for Admin / Shahzad Ullah’s approval.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3.5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Edit User Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requires Executive Approval before activation
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

        {/* Existing Pending Request Banner if any */}
        {pendingRequest && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pending Approval Request Under Review</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Submitted on {new Date(pendingRequest.requestedAt).toLocaleDateString()}. Changes will apply automatically once approved by Shahzad Ullah.
              </p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-4 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Official Role Notice */}
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span className="font-bold text-teal-900 dark:text-teal-200">
                {currentUser.roleTitle || currentUser.role}
              </span>
            </div>
            <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400 font-bold">
              {currentUser.email}
            </span>
          </div>

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 block">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600"
                  placeholder="e.g. Asad Khan"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 block">
                Mobile / WhatsApp *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-teal-600"
                  placeholder="0300-1234567"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* CNIC & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 block">
                CNIC Number
              </label>
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-teal-600"
                placeholder="17301-xxxxxxx-x"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 block">
                Official Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600"
                  placeholder="officer@nationallights.com"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Territory & Route / Beat Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Assigned Town</span>
              </label>
              <select
                value={selectedTown}
                onChange={(e) => {
                  const newTown = e.target.value;
                  setSelectedTown(newTown);
                  const beats = getRoutesForTown(newTown, effectiveTownNodes);
                  if (beats && beats.length > 0) {
                    setRouteBeat(beats[0]);
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
              >
                {safeTowns.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Trade Route / Beat</span>
              </label>
              <select
                value={routeBeat}
                onChange={(e) => setRouteBeat(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600 cursor-pointer"
              >
                {beatsForSelectedTown.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vehicle No & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Motorcycle / Vehicle No.</span>
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600"
                placeholder="e.g. PR-8942 / CD-70"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-700 dark:text-slate-300 block">
                Emergency Mobile
              </label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-teal-600"
                placeholder="03xx-xxxxxxx"
              />
            </div>
          </div>

          {/* Address & Reason for Update */}
          <div className="space-y-1">
            <label className="font-black text-slate-700 dark:text-slate-300 block">
              Residential / Dispatch Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-teal-600"
              placeholder="e.g. House #14, Street 2, Hayatabad, Peshawar"
            />
          </div>

          <div className="space-y-1">
            <label className="font-black text-slate-700 dark:text-slate-300 block">
              Reason for Information Change
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600"
              placeholder="e.g. Updated SIM card, vehicle registration, and assigned beat to Duran Pur Route..."
            />
          </div>

          {/* Submission CTA */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit for Admin Approval'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
