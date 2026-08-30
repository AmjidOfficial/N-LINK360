import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  ShieldAlert,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import {
  authenticateProductionEmail,
  isMultiRoleEligibleEmail,
  AVAILABLE_ROLES,
} from '../services/production-users';
import type { User, UserRole } from '../types';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  currentUser,
  onSignIn,
}) => {
  const [email, setEmail] = useState('admin@nationallights.com');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPER_ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (currentUser) {
    return <>{children}</>;
  }

  const isEligibleForMultiRole = isMultiRoleEligibleEmail(email);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your authorized employee email.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Direct Email Verification against production organization accounts
      const overrideRole = isEligibleForMultiRole ? selectedRole : undefined;
      const authenticatedUser = authenticateProductionEmail(cleanEmail, overrideRole);
      if (!authenticatedUser) {
        throw new Error(`Email "${cleanEmail}" is not recognized in the National Lights personnel registry.`);
      }

      await onSignIn(authenticatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please enter a valid registered email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#E8ECF2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg nm-flat p-8 rounded-3xl border border-white space-y-6 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl nm-inset flex items-center justify-center text-teal-700 font-black text-2xl border border-white shadow-inner">
            NL
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              N-LINK <span className="text-teal-600">360</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              National Lights Business Management Platform
            </p>
          </div>
        </div>

        {error && (
          <div className="nm-inset p-3.5 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 border border-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Corporate Personnel Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@nationallights.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Dynamic Multi-Role Selector (Only for Admin Emails) */}
          {isEligibleForMultiRole ? (
            <div className="space-y-2 border-t border-slate-300 pt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-teal-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  Select Login Role (Multi-Role Enabled)
                </label>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md">
                  Authorized Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Select which operational role you wish to assume for this active session:
              </p>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full pl-4 pr-10 py-3.5 rounded-2xl nm-inset text-xs text-slate-800 font-extrabold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-4 pointer-events-none" />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              * Standard employees will log in using their assigned single system role.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition-all mt-3"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {submitting
                ? 'Verifying Security Session…'
                : isEligibleForMultiRole
                ? `Login as ${selectedRole}`
                : 'Enter Enterprise Portal'}
            </span>
          </button>
        </form>
      </div>
    </main>
  );
};
