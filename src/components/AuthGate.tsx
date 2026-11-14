/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Strict Section 4.1 Authentication Gate
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 *
 * Login screen contains ONLY:
 * 1. Email / N-LINK Employee ID
 * 2. Password
 * 3. Login button
 * 4. Forgot Password
 * (Change Password is available inside the portal & forced on initial/reset login)
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  Sun,
  Moon,
  Info,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authenticateWithCredentials, submitForgotPasswordRequest } from '../services/auth';
import type { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { NationalLightLogo } from './NationalLightLogo';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User & { mustChangePassword?: boolean }) => Promise<void>;
  onSignOut: () => Promise<void>;
  midnightCutoffNotice?: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  currentUser,
  onSignIn,
  midnightCutoffNotice,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('nlink_auth_theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nlink_auth_theme', theme);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (currentUser) return <>{children}</>;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid corporate email address.');
      return;
    }
    if (!cleanPass) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const user = await authenticateWithCredentials(cleanEmail, cleanPass);
      setNotice(`Authenticated as ${user.fullName}. Launching N-LINK 360...`);
      await onSignIn(user);
    } catch (err: any) {
      setError(
        err?.message ||
          'Authentication failed. Please check your email and password or contact Head Office administration.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = identifier.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter your registered corporate email address.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const res = await submitForgotPasswordRequest(cleanEmail);
      setResetSent(true);
      setNotice(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit password recovery request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <main
      id="nlink-auth-gate-container"
      className={`min-h-screen ${
        isDark ? 'bg-[#070D1F] text-slate-100' : 'bg-slate-100 text-slate-900'
      } flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans transition-colors duration-200`}
    >
      <div className="w-full max-w-[440px] z-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`w-full ${
            isDark
              ? 'bg-[#0F172A] border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          } border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative`}
        >
          {/* Theme Switcher */}
          <div className="absolute top-5 right-5">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-800" />}
            </button>
          </div>

          {/* Header Branding */}
          <div className="text-center space-y-3 pt-1">
            <div className="flex justify-center">
              <div
                className={`p-3 rounded-2xl ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                } border`}
              >
                <NationalLightLogo
                  size={60}
                  showGlow={isDark}
                  variant="image"
                  className="cursor-default"
                  alt="National Lights Pakistan Logo"
                />
              </div>
            </div>

            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Head Office &amp; Field Portal &middot; Peshawar
              </p>
              <h1 id="nlink-login-title" className={`text-2xl font-black tracking-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                NATIONAL LIGHT <span className="text-emerald-500">360</span>
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium mt-0.5`}>
                Enterprise Resource Planning &amp; Financial Accounting
              </p>
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {midnightCutoffNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl text-xs font-semibold text-blue-300 bg-blue-950/50 border border-blue-800 flex items-start gap-2"
              >
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{midnightCutoffNotice}</span>
              </motion.div>
            )}

            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-semibold ${
                  isDark ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                } border flex items-start gap-2`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{notice}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-semibold ${
                  isDark ? 'text-rose-300 bg-rose-950/60 border-rose-800' : 'text-rose-800 bg-rose-50 border-rose-200'
                } border flex items-start gap-2`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STRICT SECTION 4.1 LOGIN OR FORGOT PASSWORD FORM */}
          {!forgotPasswordMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@nationallight.pk"
                    className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    } text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setResetSent(false);
                      setError('');
                      setNotice('');
                    }}
                    className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-xl border ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    } text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-100" />
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4 text-emerald-100" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reset-email"
                    className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    Corporate Email Address
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(false);
                      setResetSent(false);
                      setError('');
                      setNotice('');
                    }}
                    className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@nationallight.pk"
                    className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    } text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                  />
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'} pt-1`}>
                  A verifiable password recovery request will be logged and sent to Head Office administration (<span className="font-mono text-emerald-500">nationallights2026@gmail.com</span>). Verified employees receive a one-time temporary credential requiring immediate update.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || resetSent}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                    Logging Recovery Request...
                  </span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-emerald-100" />
                    <span>{resetSent ? 'Recovery Request Submitted' : 'Submit Recovery Request'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Corporate Office Footer */}
          <div className={`pt-4 border-t ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-center space-y-1 text-[10px]`}>
            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} flex items-center justify-center gap-1`}>
              <Building2 className="w-3 h-3 text-emerald-500" />
              Office No GF 71, Sheikh Yaseen Tower, Peshawar
            </p>
            <p className="font-mono text-slate-500">
              Ph: 091-2212700 &middot; Cell: 0303-5262872 / 0312-7876620
            </p>
            <p className="text-[10px] text-slate-500 pt-0.5">
              Central Admin: <span className="font-mono text-emerald-500">nationallights2026@gmail.com</span>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
};
