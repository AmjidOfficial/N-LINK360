import React, { useState } from 'react';
import { LogIn, Mail, ShieldAlert, CheckCircle2, UserCheck, ChevronDown, Sparkles, Building2, ShieldCheck } from 'lucide-react';
import { signInWithRegisteredEmail, REGISTERED_CORPORATE_EMAILS } from '../services/auth';
import { AVAILABLE_ROLES, isMultiRoleEligibleEmail } from '../services/production-users';
import type { User, UserRole } from '../types';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
  midnightCutoffNotice?: string | null;
}

const QUICK_SIGN_IN_ACCOUNTS = [
  { email: 'nationallights2026@gmail.com', label: 'Super Admin', role: 'SUPER_ADMIN' as UserRole, desc: 'Full System Access' },
  { email: 'shahzadullah@nationallights.com', label: 'Shahzad Ullah', role: 'SUPER_ADMIN' as UserRole, desc: 'Executive Approver' },
  { email: 'syedzain@nationallights.com', label: 'Syed Zain', role: 'SUPER_ADMIN' as UserRole, desc: 'Executive Approver' },
  { email: 'accounts@nationallights.com', label: 'Accounts & Finance', role: 'ACCOUNTS' as UserRole, desc: 'Ledgers & Invoices' },
  { email: 'sales@nationallights.com', label: 'Sales & Recovery', role: 'SALES_RECOVERY' as UserRole, desc: 'Field Orders & Recovery' },
  { email: 'warehouse@nationallights.com', label: 'Warehouse & Dispatch', role: 'WAREHOUSE_MANAGER' as UserRole, desc: 'Stock & Dispatches' },
];

export const AuthGate: React.FC<AuthGateProps> = ({ children, currentUser, onSignIn, midnightCutoffNotice }) => {
  const [email, setEmail] = useState('nationallights2026@gmail.com');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPER_ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (currentUser) return <>{children}</>;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered corporate email address.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const user = await signInWithRegisteredEmail(cleanEmail, selectedRole);
      setNotice(`Authenticated successfully as ${user.fullName} (${user.role})`);
      await onSignIn(user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your registered email address.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSelect = (acc: typeof QUICK_SIGN_IN_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setSelectedRole(acc.role);
    setError('');
  };

  return (
    <main className="min-h-screen bg-[#E8ECF2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg nm-flat p-6 sm:p-8 rounded-3xl border border-white space-y-5 shadow-2xl">
        {/* Company Branding */}
        <div className="text-center space-y-1.5">
          <div className="w-16 h-16 mx-auto rounded-2xl nm-inset flex items-center justify-center text-teal-700 font-black text-2xl border border-white shadow-inner">
            NL
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            N-LINK <span className="text-teal-600">360</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            National Lights Business Management Platform
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Passwordless Sign-In • Registered Email Only</span>
          </div>
        </div>

        {midnightCutoffNotice && (
          <div className="p-3.5 rounded-2xl text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 shadow-sm">
            {midnightCutoffNotice}
          </div>
        )}

        {notice && (
          <div className="p-3.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="nm-inset p-3.5 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2 border border-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Quick Selection Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Quick-Select Registered Account:
            </span>
            <span className="text-[10px] text-slate-400">1-click fill</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {QUICK_SIGN_IN_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickSelect(acc)}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  email.toLowerCase() === acc.email.toLowerCase()
                    ? 'bg-teal-50 border-teal-500 shadow-xs'
                    : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-teal-300'
                }`}
              >
                <div className="text-[11px] font-black text-slate-800 truncate">{acc.label}</div>
                <div className="text-[9px] text-slate-500 truncate">{acc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Email Only Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Registered Corporate Personnel Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. nationallights2026@gmail.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs font-bold bg-transparent text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 pl-1">
              No password required. Instant login for verified corporate emails and staff synced from Google Sheets.
            </p>
          </div>

          {/* Target Role Selector */}
          <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Working Operational Role
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Active
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 pr-8"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    [{r.category}] {r.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">
              Executive and admin accounts can switch to any workspace role directly upon sign-in.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Verifying Registered Email…' : 'Login to N-LINK 360'}
          </button>
        </form>

        <div className="text-center pt-1 border-t border-slate-200/60">
          <p className="text-[10px] text-slate-500 font-medium">
            National Lights (Pvt) Ltd. • Corporate Sales, Recovery & ERP Portal
          </p>
        </div>
      </div>
    </main>
  );
};
