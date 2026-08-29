import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  ShieldCheck,
  Users,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  PRODUCTION_ACCOUNTS,
  authenticateProductionEmail,
  ProductionAccount,
} from '../services/production-users';
import type { User } from '../types';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAccountsModal, setShowAccountsModal] = useState(false);

  if (currentUser) {
    return <>{children}</>;
  }

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
      const authenticatedUser = authenticateProductionEmail(cleanEmail);
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

  const handleSelectAccount = (account: ProductionAccount) => {
    setEmail(account.email);
    setShowAccountsModal(false);
    setError('');
  };

  return (
    <main className="min-h-screen bg-[#E8ECF2] flex items-center justify-center p-4">
      <div className="w-full max-w-md nm-flat p-8 rounded-3xl border border-white space-y-6">
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
              National Lights Auto & Industrial Distribution
            </p>
          </div>
        </div>

        {/* Welcome Note */}
        <div className="nm-inset p-4 rounded-2xl text-center space-y-1">
          <p className="text-xs font-black text-slate-800">Welcome to National Lights Enterprise!</p>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Please enter your corporate email address to access your role-based dashboard and operational tools.
          </p>
        </div>

        {error && (
          <div className="nm-inset p-3.5 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 border border-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email-Only Verification Form (No Password) */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Corporate Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@nationallights.com"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl nm-inset text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition-all mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Verifying Account Role…' : 'Enter Enterprise Portal'}</span>
          </button>
        </form>

        {/* Subtle Registered Directory Button */}
        <div className="text-center pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowAccountsModal(true)}
            className="text-[11px] font-bold text-slate-500 hover:text-teal-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Registered Emails Directory</span>
          </button>
        </div>
      </div>

      {/* Authorized Users & Roles Directory Modal */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nm-flat bg-[#E8ECF2] p-6 rounded-3xl border border-white max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-teal-700 font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Registered Employee Emails & Assigned Roles
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Click any email to select and load its scoped permissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="nm-btn w-8 h-8 rounded-full text-slate-600 font-bold hover:text-slate-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Accounts Table */}
            <div className="space-y-2.5">
              {PRODUCTION_ACCOUNTS.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc)}
                  className="nm-btn p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:border-teal-400 group transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800 group-hover:text-teal-700">
                        {acc.fullName}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          acc.accessScope === 'GLOBAL_ADMIN'
                            ? 'bg-teal-100 text-teal-800'
                            : acc.accessScope === 'FIELD_FORCE_SCOPED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {acc.roleTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono font-bold text-teal-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{acc.email}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 italic">{acc.description}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <span className="nm-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold">
                      Select Email ➔
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAccountsModal(false)}
                className="nm-btn px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
