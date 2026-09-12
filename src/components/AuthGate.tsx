import React, { useState } from 'react';
import { LogIn, Mail, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { getCurrentUser, sendLoginCode, verifyLoginCode } from '../services/auth';
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
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (currentUser) return <>{children}</>;

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Enter your registered corporate email.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await sendLoginCode(cleanEmail);
      setCodeSent(true);
      setNotice('A verification code has been sent to your registered email.');
    } catch (err: any) {
      setError(err?.message || 'Unable to send the verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) {
      setError('Enter the 6-digit verification code sent to your email.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await verifyLoginCode(cleanEmail, cleanCode);
      const user = await getCurrentUser();
      if (!user) throw new Error('Your email was verified, but no active N-LINK employee profile is linked to this account. Contact system administration.');
      await onSignIn(user);
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-2xl">NL</div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">N-LINK <span className="text-emerald-600">360</span></h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">National Lights Management Platform</p>
        </div>

        {midnightCutoffNotice && <div className="p-3 rounded-2xl text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200">{midnightCutoffNotice}</div>}
        {notice && <div className="p-3 rounded-2xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{notice}</div>}
        {error && <div className="p-3 rounded-2xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</div>}

        {!codeSent ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@nationallights.com" className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <Mail className="w-4 h-4" />{submitting ? 'Sending Code…' : 'Send Login Code'}
            </button>
            <p className="text-center text-[11px] text-slate-500">No password is required. Use your registered N-LINK email.</p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">6-Digit Verification Code</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full py-4 rounded-2xl border border-slate-200 bg-slate-50 text-center text-2xl tracking-[0.45em] font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <LogIn className="w-4 h-4" />{submitting ? 'Verifying…' : 'Verify & Enter N-LINK'}
            </button>
            <div className="flex gap-2">
              <button type="button" disabled={submitting} onClick={() => { setCodeSent(false); setCode(''); setError(''); setNotice(''); }} className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">Change Email</button>
              <button type="button" disabled={submitting} onClick={handleSendCode as any} className="flex-1 py-3 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center justify-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Resend Code</button>
            </div>
            <p className="text-center text-[11px] text-slate-500">Code delivery requires the production email/SMTP configuration in Supabase.</p>
          </form>
        )}
      </div>
    </main>
  );
};
