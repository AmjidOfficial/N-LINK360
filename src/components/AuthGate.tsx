import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { signIn, getCurrentUser, resetPassword } from '../services/auth';
import type { User } from '../types';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
  midnightCutoffNotice?: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children, currentUser, onSignIn, midnightCutoffNotice }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [resetMode, setResetMode] = useState(false);

  if (currentUser) return <>{children}</>;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Enter your registered corporate email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResetNotice('');
    try {
      await signIn(cleanEmail, password);
      const user = await getCurrentUser();
      if (!user) throw new Error('Authentication succeeded but no active employee profile is linked to this account. Contact system administration.');
      await onSignIn(user);
    } catch (err: any) {
      const message = String(err?.message || 'Authentication failed.');
      if (/invalid login credentials|invalid credentials/i.test(message)) setError('Invalid email or password.');
      else if (/email not confirmed/i.test(message)) setError('Your email address has not been confirmed.');
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Enter your registered corporate email.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(cleanEmail);
      setResetNotice('If the account exists, password reset instructions have been sent to the registered email address.');
      setResetMode(false);
    } catch (err: any) {
      setError(err?.message || 'Unable to send password reset instructions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#E8ECF2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg nm-flat p-6 sm:p-8 rounded-3xl border border-white space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl nm-inset flex items-center justify-center text-teal-700 font-black text-2xl border border-white">NL</div>
          <h1 className="text-2xl font-black text-slate-800">N-LINK <span className="text-teal-600">360</span></h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">National Lights Business Management Platform</p>
        </div>

        {midnightCutoffNotice && <div className="p-3 rounded-2xl text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200">{midnightCutoffNotice}</div>}
        {resetNotice && <div className="p-3 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex gap-2"><CheckCircle2 className="w-4 h-4" />{resetNotice}</div>}
        {error && <div className="nm-inset p-3 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 border border-rose-200"><ShieldAlert className="w-4 h-4" />{error}</div>}

        {resetMode ? (
          <form onSubmit={handleReset} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Registered Personnel Email</label>
            <div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@nationallights.com" className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs font-bold" /></div>
            <button type="submit" disabled={submitting} className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" />{submitting ? 'Sending…' : 'Send Password Reset Link'}</button>
            <button type="button" onClick={() => { setResetMode(false); setError(''); }} className="w-full text-xs font-bold text-teal-700 underline">Back to Sign In</button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-xs font-bold text-slate-700 mb-1.5">Corporate Personnel Email</label><div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@nationallights.com" className="w-full pl-10 pr-4 py-3 rounded-2xl nm-inset text-xs font-bold" /></div></div>
            <div><div className="flex items-center justify-between mb-1.5"><label className="text-xs font-bold text-slate-700">Password</label><button type="button" onClick={() => { setResetMode(true); setError(''); }} className="text-[11px] font-bold text-teal-700">Forgot password?</button></div><div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" /><input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your account password" className="w-full pl-10 pr-10 py-3 rounded-2xl nm-inset text-xs font-bold" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-3.5 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <button type="submit" disabled={submitting} className="w-full nm-btn-primary py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />{submitting ? 'Authenticating…' : 'Sign In to N-LINK 360'}</button>
          </form>
        )}
      </div>
    </main>
  );
};
