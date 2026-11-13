/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Password Change & Forced Initial Credential Update Modal (Sections 4.1, 4.4, 4.5)
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 */

import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { changeUserPassword } from '../services/auth';
import { generateCryptographicInitialPassword } from '../data/nlink-users-team';

interface ChangePasswordModalProps {
  isOpen: boolean;
  email: string;
  fullName: string;
  forced?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  onSignOut?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  email,
  fullName,
  forced = false,
  onClose,
  onSuccess,
  onSignOut,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  if (!isOpen) return null;

  const hasMinLen = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const matchesConfirm = newPassword.length > 0 && newPassword === confirmPassword;
  const policyValid = hasMinLen && hasUpper && hasLower && hasDigit && hasSymbol && matchesConfirm;

  const handleGenerateStrong = () => {
    const generated = generateCryptographicInitialPassword(14);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNew(true);
    setError('');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(generated);
        setCopiedGenerated(true);
        setTimeout(() => setCopiedGenerated(false), 3000);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forced && !currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }
    if (!hasMinLen || !hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      setError('Password must be at least 12 characters with uppercase, lowercase, numbers, and special characters.');
      return;
    }
    if (!matchesConfirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changeUserPassword(email, currentPassword, newPassword, forced);
      setSuccessMsg('✓ Password updated successfully. One-time setup completed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Unable to update password. Please check requirements.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {forced ? 'One-Time Password Setup' : 'Change Password'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fullName} &middot; <span className="font-mono text-emerald-600 dark:text-emerald-400">{email}</span>
              </p>
            </div>
          </div>
          {!forced && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Close change password dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {forced && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
              <span className="font-bold">First-Time Login Security:</span> Your account was issued with a temporary access key. Please set your permanent personal password below to unlock the N-LINK 360 portal.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password - Only required for self-service updates inside portal */}
          {!forced && (
            <div className="space-y-1.5">
              <label htmlFor="cp-current" className="block font-semibold text-slate-700 dark:text-slate-300">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="cp-current"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full min-h-[44px] pl-9 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password with Quick Generate button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="cp-new" className="block font-semibold text-slate-700 dark:text-slate-300">
                {forced ? 'New Permanent Password' : 'New Password'}
              </label>
              <button
                type="button"
                onClick={handleGenerateStrong}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                title="Generate and copy a compliant 14-character secure password"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate</span>
                {copiedGenerated && (
                  <span className="ml-1 text-[10px] text-emerald-500 font-bold inline-flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Copied
                  </span>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minimum 12 characters with symbol"
                className="w-full min-h-[44px] pl-9 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="cp-confirm" className="block font-semibold text-slate-700 dark:text-slate-300">
              Confirm {forced ? 'Permanent Password' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="cp-confirm"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter password to confirm"
                className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Security Policy Requirements Real-Time Checklist */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Password Security Policy:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasMinLen ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 text-center">•</span>}
                <span>12+ characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasUpper && hasLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 text-center">•</span>}
                <span>Upper &amp; lowercase</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasDigit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 text-center">•</span>}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasSymbol ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 text-center">•</span>}
                <span>Special (!@#$%*)</span>
              </div>
              <div className={`col-span-2 flex items-center gap-1.5 ${matchesConfirm ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {matchesConfirm ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 text-center">•</span>}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {forced && onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2.5 min-h-[44px] rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              )
            )}
            <button
              type="submit"
              disabled={submitting || !policyValid}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{forced ? 'Set Permanent Password & Enter' : 'Update Password'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
