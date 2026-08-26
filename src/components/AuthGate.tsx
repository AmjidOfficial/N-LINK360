import React, { useEffect, useState } from 'react';
import { Building2, Loader2, LockKeyhole, LogIn, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { getCurrentUser, signIn, signOut, resetPassword, updatePassword } from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import type { User } from '../types';

interface AuthGateProps {
  children: (user: User, onSignOut: () => Promise<void>) => React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((next) => mounted && setUser(next))
      .catch((err) => mounted && setError(err instanceof Error ? err.message : 'Unable to load your account.'))
      .finally(() => mounted && setBusy(false));

    // Detect if we landed from a Supabase recovery redirect
    const hash = window.location.hash || '';
    const params = new URLSearchParams(window.location.search);
    if (hash.includes('type=recovery') || params.get('type') === 'recovery') {
      setIsRecoveryMode(true);
    }

    return () => { mounted = false; };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await signIn(email.trim(), password);
      const next = await getCurrentUser();
      if (!next) throw new Error('Login succeeded but your N-LINK employee profile was not found.');
      setUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Please provide your email address first.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await resetPassword(email.trim());
      setSuccess('A recovery email has been successfully sent. Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger password recovery request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await updatePassword(newPassword);
      setSuccess('Your password has been successfully updated. You can now sign in.');
      setIsRecoveryMode(false);
      setIsResetMode(false);
      setPassword('');
      // Clean url hash
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save new password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (busy) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>;

  if (user) return <>{children(user, async () => { await signOut(); setUser(null); })}</>;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl place-items-center">
        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-lg font-black text-slate-950"><Building2 /></div>
            <div><h1 className="text-xl font-black tracking-tight text-slate-950">N-LINK 360</h1><p className="text-xs text-slate-500">National Lights</p></div>
          </div>

          {isRecoveryMode ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-950">New Password</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
              </div>
              {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {success && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  New Password
                  <input
                    required
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    autoComplete="new-password"
                  />
                </label>
                <button
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {submitting ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          ) : isResetMode ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-950">Reset Password</h2>
                <p className="mt-1 text-sm text-slate-500">We will send you a password restoration link.</p>
              </div>
              {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {success && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input
                    required
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    autoComplete="email"
                  />
                </label>
                <button
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {submitting ? 'Sending Link…' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(''); setSuccess(''); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6"><h2 className="text-2xl font-bold text-slate-950">Sign in</h2><p className="mt-1 text-sm text-slate-500">Use your National Lights account.</p></div>
              {!isSupabaseConfigured && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/75 p-4 text-xs text-amber-900">
                  <p className="font-bold mb-2">💡 Offline Sandbox Active</p>
                  <p className="mb-3 leading-relaxed">Supabase is not connected. You can sign in using any of the sandbox accounts below (click an account to autofill):</p>
                  <div className="space-y-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => { setEmail('nationallights2026@gmail.com'); setPassword('admin123'); }}
                      className="w-full text-left p-1.5 rounded bg-amber-100 border border-amber-300 hover:bg-amber-200 transition flex justify-between text-[10px]"
                    >
                      <span className="font-bold">nationallights2026@gmail.com</span>
                      <span className="font-sans font-bold text-amber-900">Your Account (Admin) ★</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmail('admin@nationallights.com'); setPassword('admin123'); }}
                      className="w-full text-left p-1.5 rounded bg-amber-100/50 hover:bg-amber-100 transition flex justify-between text-[10px]"
                    >
                      <span>admin@nationallights.com</span>
                      <span className="font-sans font-bold text-slate-600">Super Admin →</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmail('field.lahore@nationallights.com'); setPassword('field123'); }}
                      className="w-full text-left p-1.5 rounded bg-amber-100/50 hover:bg-amber-100 transition flex justify-between text-[10px]"
                    >
                      <span>field.lahore@nationallights.com</span>
                      <span className="font-sans font-bold text-slate-600">Sales/Recovery →</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmail('accounts@nationallights.com'); setPassword('accounts123'); }}
                      className="w-full text-left p-1.5 rounded bg-amber-100/50 hover:bg-amber-100 transition flex justify-between text-[10px]"
                    >
                      <span>accounts@nationallights.com</span>
                      <span className="font-sans font-bold text-slate-600">Accounts →</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmail('warehouse@nationallights.com'); setPassword('warehouse123'); }}
                      className="w-full text-left p-1.5 rounded bg-amber-100/50 hover:bg-amber-100 transition flex justify-between text-[10px]"
                    >
                      <span>warehouse@nationallights.com</span>
                      <span className="font-sans font-bold text-slate-600">Warehouse →</span>
                    </button>
                  </div>
                </div>
              )}
              {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {success && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" autoComplete="email" /></label>
                <div className="block text-sm font-semibold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setError(''); setSuccess(''); }}
                      className="text-xs font-bold text-amber-500 hover:text-amber-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" autoComplete="current-password" />
                </div>
                <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><LogIn className="h-4 w-4" />{submitting ? 'Signing in…' : 'Sign in'}</button>
              </form>
            </>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400"><LockKeyhole className="h-3.5 w-3.5" /> Access is controlled by your N-LINK role and permissions.</p>
        </section>
      </div>
    </main>
  );
};

