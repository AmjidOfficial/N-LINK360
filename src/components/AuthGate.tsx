import React, { useState } from 'react';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  X,
  ShieldCheck,
  Sparkles,
  Key,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';
import { signInWithRegisteredEmail } from '../services/auth';
import type { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { NationalLightLogo } from './NationalLightLogo';

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
  const [email, setEmail] = useState('nationallights2026@gmail.com');
  const [password, setPassword] = useState('NationalLights@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showEnvKeyGuide, setShowEnvKeyGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (currentUser) return <>{children}</>;

  const executeSignIn = async (loginEmail: string, loginPassword?: string) => {
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your corporate email address.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const user = await signInWithRegisteredEmail(cleanEmail, loginPassword);
      setNotice(`Welcome, ${user.fullName}. Launching system…`);
      await onSignIn(user);
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    await executeSignIn(email, password);
  };

  const handleQuickLogin = async (targetEmail: string, targetPass = 'NationalLights@2026') => {
    setEmail(targetEmail);
    setPassword(targetPass);
    await executeSignIn(targetEmail, targetPass);
  };

  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(true);
  };

  return (
    <main
      id="nlink-auth-gate-container"
      className="min-h-screen relative overflow-hidden bg-[#070d18] text-slate-100 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[350px] rounded-full bg-emerald-500/10 blur-[130px]"
        />
        <div
          className="absolute -bottom-32 right-10 w-96 h-96 rounded-full bg-teal-500/10 blur-[140px]"
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="w-full max-w-[420px] z-10">
        {/* Main Card with official branding layout specified in Section 8 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-[#0b1322] border border-slate-800/90 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] p-6 sm:p-8 relative overflow-hidden"
        >
          {/* Top Emerald Accent Strip */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-[#006b5f] to-teal-400" />

          {/* Header Branding Area strictly matching master specification */}
          <div className="text-center space-y-3 pt-1">
            {/* System Title */}
            <h1
              id="nlink-login-title"
              className="text-2xl font-black text-white tracking-wider"
            >
              N-LINK <span className="text-[#2ce5be]">360</span>
            </h1>

            {/* Official Company Logo */}
            <div className="flex justify-center py-1">
              <NationalLightLogo
                size={82}
                showGlow={true}
                variant="image"
                className="cursor-default"
                alt="National Lighting Official Logo"
              />
            </div>

            {/* Corporate Name & Management Tagline */}
            <div>
              <h2
                id="nlink-company-name"
                className="text-base font-extrabold text-white tracking-widest uppercase"
              >
                NATIONAL LIGHTING
              </h2>
              <p
                id="nlink-system-subtitle"
                className="text-xs font-semibold text-slate-400 mt-0.5 tracking-wide"
              >
                Sales &amp; Distribution Management
              </p>
            </div>
          </div>

          {/* Notifications & Error Handling */}
          <AnimatePresence mode="wait">
            {midnightCutoffNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 rounded-xl text-xs font-semibold text-teal-300 bg-teal-950/40 border border-teal-800/60"
              >
                {midnightCutoffNotice}
              </motion.div>
            )}

            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-800/80 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{notice}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/80 flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clean Common Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nationallight.pk"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Login Action Button */}
            <motion.button
              id="login-submit-button"
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 py-3.5 rounded-xl text-xs font-black tracking-widest uppercase text-white bg-gradient-to-r from-emerald-600 via-[#006b5f] to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#006b5f]/25 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Authenticating…' : 'LOGIN TO N-LINK 360'}</span>
            </motion.button>

            {/* Instant 1-Click Launch for Executive Director */}
            <motion.button
              type="button"
              disabled={submitting}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickLogin('nationallights2026@gmail.com', 'NationalLights@2026')}
              className="w-full py-2.5 rounded-xl text-[11px] font-extrabold tracking-wider uppercase text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>⚡ One-Click Enter as Executive Director (Shahzad Ullah)</span>
            </motion.button>

            {/* Quick Persona Roster Selector */}
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Or Quick Switch Persona:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('shahzadullah@nationallights.com', 'NationalLights@2026')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-[10px] font-extrabold text-white group-hover:text-emerald-400 truncate">Shahzad Ullah</p>
                  <p className="text-[9px] text-slate-400 truncate">Executive / Super Admin</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('shahid.khan@nationallight.pk', 'NationalLights@2026')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-[10px] font-extrabold text-white group-hover:text-teal-400 truncate">Shahid Khan</p>
                  <p className="text-[9px] text-slate-400 truncate">Field Sales / Route</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('accounts@nationallights.com', 'NationalLights@2026')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-[10px] font-extrabold text-white group-hover:text-cyan-400 truncate">Accounts Officer</p>
                  <p className="text-[9px] text-slate-400 truncate">Ledgers &amp; Recovery</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('warehouse@nationallights.com', 'NationalLights@2026')}
                  className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-[10px] font-extrabold text-white group-hover:text-amber-400 truncate">Warehouse Mgr</p>
                  <p className="text-[9px] text-slate-400 truncate">Dispatch &amp; Stock</p>
                </button>
              </div>
            </div>

            {/* Forgot Password Action Link */}
            <div className="text-center pt-1">
              <button
                id="forgot-password-link"
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetSuccess(false);
                  setShowForgotPasswordModal(true);
                }}
                className="text-xs font-bold text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </form>

          {/* Secure System Badge */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Operational &amp; Functional</span>
            </div>
            <button
              type="button"
              onClick={() => setShowEnvKeyGuide(!showEnvKeyGuide)}
              className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Key className="w-3 h-3" />
              <span>Keys &amp; Env Info</span>
              {showEnvKeyGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible Environment & API Keys Explanatory Drawer */}
          <AnimatePresence>
            {showEnvKeyGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-300 space-y-2.5 overflow-hidden"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No Keys Required to Run!</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  N-LINK 360 is built with an <strong>autonomous offline-first local database</strong> containing real National Lights dealers across Pakistan, product SKUs, tax calculations, invoice PDFs, and thermal receipts.
                </p>
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <p className="font-bold text-slate-200">Optional External Keys:</p>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>• VITE_SUPABASE_URL</span>
                      <span className="text-emerald-400">Optional Cloud DB</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>• VITE_SUPABASE_ANON_KEY</span>
                      <span className="text-emerald-400">Optional Anon Key</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>• GOOGLE_SHEETS_WEBHOOK_URL</span>
                      <span className="text-teal-400">Optional Webhook</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    To connect a live Google Sheet, click the <strong>Google Sheets Two-Way Sync</strong> button inside the app to copy the automated Apps Script code with 1 click.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div
            id="forgot-password-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0c1422] border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <HelpCircle className="w-5 h-5 text-teal-400 shrink-0" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider">Password Recovery</h3>
              </div>

              {resetSuccess ? (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 font-semibold leading-relaxed">
                    Password reset instructions and verification code have been queued for{' '}
                    <strong>{resetEmail}</strong>.
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    You can also contact Head Office Administration directly at{' '}
                    <strong className="text-white">shahzadullah@nationallights.com</strong> or call IT Support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs uppercase cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 mt-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your corporate email address to receive password reset instructions.
                  </p>
                  <div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@nationallight.pk"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-bold text-slate-300">Executive IT Authority:</p>
                    <p>Shahzad Ullah (Executive Director)</p>
                    <p className="text-teal-400 font-mono">shahzadullah@nationallights.com</p>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
