import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  UserCheck,
  ChevronDown,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  authenticateProductionEmail,
  isMultiRoleEligibleEmail,
  AVAILABLE_ROLES,
} from '../services/production-users';
import { signIn, getCurrentUser, resetPassword } from '../services/auth';
import type { User, UserRole } from '../types';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
  midnightCutoffNotice?: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  currentUser,
  onSignIn,
  midnightCutoffNotice,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPER_ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetSentNotice, setResetSentNotice] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  if (currentUser) {
    return <>{children}</>;
  }

  const isEligibleForMultiRole = isMultiRoleEligibleEmail(email);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered corporate email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResetSentNotice('');

    try {
      // 1. Authenticate with Supabase Auth or resilient corporate personnel fallback
      await signIn(cleanEmail, password);

      // 2. Resolve the authenticated user profile
      let user = await getCurrentUser();
      
      // Fallback: If not resolved via Supabase getUser, resolve via verified personnel registry
      if (!user) {
        const overrideRole = isEligibleForMultiRole ? selectedRole : undefined;
        user = authenticateProductionEmail(cleanEmail, overrideRole);
      }

      if (!user) {
        throw new Error('Authentication succeeded, but unable to load employee session profile.');
      }

      // If user is an authorized executive/admin, allow assuming selected operational role
      if (isEligibleForMultiRole && selectedRole) {
        user.role = selectedRole;
      }

      try {
        localStorage.setItem('nlink_active_user', JSON.stringify(user));
      } catch {
        // ignore storage error
      }

      await onSignIn(user);
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (rawMsg.toLowerCase().includes('failed to fetch')) {
        setError('Network connectivity notice: Unable to reach authentication server. Please check your internet connection.');
      } else if (rawMsg.toLowerCase().includes('invalid login credentials') || rawMsg.toLowerCase().includes('invalid credentials')) {
        setError('Invalid email or password. Please verify your credentials or contact system administration.');
      } else if (rawMsg.toLowerCase().includes('email not confirmed')) {
        setError('Email address has not been confirmed. Please check your inbox.');
      } else {
        setError(rawMsg || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email to receive a password reset link.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResetSentNotice('');

    try {
      await resetPassword(cleanEmail);
      setResetSentNotice(`Password reset instructions have been dispatched to ${cleanEmail}.`);
      setIsResetMode(false);
    } catch (err: any) {
      setError(err?.message || 'Unable to send password reset email. Please verify the email address.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#E8ECF2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg nm-flat p-5 sm:p-8 rounded-3xl border border-white space-y-6 shadow-2xl">
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

        {midnightCutoffNotice && (
          <div className="p-3.5 rounded-2xl text-xs font-bold text-teal-900 bg-teal-50/90 border border-teal-200 flex items-start gap-2.5 shadow-sm">
            <span className="text-base leading-none">🌙</span>
            <div>
              <span className="block font-black text-teal-950 mb-0.5">Daily 11:59 PM Midnight Cutoff Enforced</span>
              <span className="text-[11px] text-teal-800 leading-relaxed block">{midnightCutoffNotice}</span>
            </div>
          </div>
        )}

        {resetSentNotice && (
          <div className="p-3.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-start gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{resetSentNotice}</span>
          </div>
        )}

        {error && (
          <div className="nm-inset p-3.5 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 border border-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isResetMode ? (
          /* Password Reset Form */
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Personnel Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nationallights.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition-all mt-3"
            >
              <KeyRound className="w-4 h-4" />
              <span>{submitting ? 'Dispatching Reset Link…' : 'Send Password Reset Link'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsResetMode(false); setError(''); }}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Real Credentials Login Form */
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
                  placeholder="name@nationallights.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(true); setError(''); }}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl nm-inset text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Dynamic Multi-Role Selector (Only for Admin Accounts) */}
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
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition-all mt-3"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Authenticating…'
                  : isEligibleForMultiRole
                  ? `Login as ${selectedRole}`
                  : 'Sign In to N-LINK 360'}
              </span>
            </button>

            {/* Quick Personnel Access for easy testing & employee selection */}
            <div className="pt-3 border-t border-slate-300/70 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Quick Access Personnel Accounts
                </span>
                <span className="text-[10px] text-teal-700 font-extrabold">Tap to auto-fill</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { label: 'Admin (Director)', em: 'nationallights2026@gmail.com', role: 'SUPER_ADMIN' as UserRole },
                  { label: 'IT Head / Admin', em: 'admin@nationallights.com', role: 'SUPER_ADMIN' as UserRole },
                  { label: 'Executive Director', em: 'shahzadullah@nationallights.com', role: 'SUPER_ADMIN' as UserRole },
                  { label: 'Managing Partner', em: 'syedzain@nationallights.com', role: 'SUPER_ADMIN' as UserRole },
                  { label: 'Accounts Office', em: 'accounts@nationallights.com', role: 'ACCOUNTS' as UserRole },
                  { label: 'Central Warehouse', em: 'warehouse@nationallights.com', role: 'WAREHOUSE_MANAGER' as UserRole },
                  { label: 'Plant Factory', em: 'factory@nationallights.com', role: 'FACTORY_MANAGER' as UserRole },
                  { label: 'RSM Regional Sales', em: 'tariq@nationallights.com', role: 'RSM' as UserRole },
                  { label: 'Order Booker (PWA)', em: 'haris@nationallights.com', role: 'OB' as UserRole },
                ].map((acc) => (
                  <button
                    key={acc.em}
                    type="button"
                    onClick={() => {
                      setEmail(acc.em);
                      setPassword('NL2026!');
                      setSelectedRole(acc.role);
                      setError('');
                    }}
                    className="p-1.5 rounded-xl nm-flat text-left hover:text-teal-700 transition-all border border-white/60 active:nm-inset"
                  >
                    <div className="text-[10px] font-black text-slate-700 truncate">{acc.label}</div>
                    <div className="text-[9px] text-slate-400 truncate">{acc.em.split('@')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};
