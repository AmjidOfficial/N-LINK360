import React, { useState } from 'react';
import { LogIn, Mail, ShieldAlert, CheckCircle2, UserCheck, ChevronDown, Sparkles, Building2, ShieldCheck, Lock, Check } from 'lucide-react';
import { signInWithRegisteredEmail } from '../services/auth';
import { AVAILABLE_ROLES } from '../services/production-users';
import type { User, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AuthGateProps {
  children: React.ReactNode;
  currentUser: User | null;
  onSignIn: (user: User) => Promise<void>;
  onSignOut: () => Promise<void>;
  midnightCutoffNotice?: string | null;
}

const QUICK_SIGN_IN_ACCOUNTS = [
  { email: 'nationallights2026@gmail.com', label: 'Super Admin', role: 'SUPER_ADMIN' as UserRole, desc: 'Full System Access' },
  { email: 'shahzadullah@nationallights.com', label: 'Shahzad Ullah', role: 'SUPER_ADMIN' as UserRole, desc: 'Managing Director (Sole Approver)' },
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
    <main className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* 3D Animated Background Mesh & Lights */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-teal-500/15 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-slate-900/60 blur-[100px]" />
        
        {/* Futuristic Grid Layer */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, 
            backgroundSize: '24px 24px' 
          }} 
        />
      </div>

      <div className="w-full max-w-xl z-10 perspective-[1200px]">
        {/* Main Card with subtle 3D rotational hover */}
        <motion.div 
          initial={{ opacity: 0, y: 30, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ 
            rotateX: 1.5, 
            rotateY: -1.5, 
            translateY: -2,
            transition: { duration: 0.3 }
          }}
          className="w-full bg-white dark:bg-[#090f19] border border-slate-200/85 dark:border-slate-800/85 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] p-6 sm:p-10 relative overflow-hidden group transition-colors duration-350"
        >
          {/* Card Border Highlight Accent */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-[#006b5f] to-teal-500" />
          
          {/* Top Branding */}
          <div className="text-center space-y-4">
            {/* Holographic Logo Container */}
            <motion.div 
              whileHover={{ scale: 1.06, rotate: 5 }}
              className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100/50 dark:from-slate-900 dark:to-slate-800 border border-teal-200/60 dark:border-slate-700 shadow-[0_10px_20px_rgba(0,107,95,0.06)] flex items-center justify-center font-black text-2xl text-[#006b5f] dark:text-[#76f4e0] cursor-pointer"
            >
              NL
            </motion.div>

            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                N-LINK <span className="text-[#006b5f] dark:text-[#76f4e0] font-black">360</span>
              </h1>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                National Lights Pakistan
              </p>
            </div>

            {/* Shield / Whitelist Secure Label */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-[#76f4e0] text-[11px] font-extrabold shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
              <span>Only Email Authorized Logins</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {midnightCutoffNotice && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 rounded-2xl text-xs font-bold text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 shadow-xs"
              >
                {midnightCutoffNotice}
              </motion.div>
            )}

            {notice && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{notice}</span>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 leading-normal">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Selection Grid with Professional Keys */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#006b5f] dark:text-[#76f4e0]" />
                Select Authorized Corporate Identity:
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Fast Login</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_SIGN_IN_ACCOUNTS.map((acc) => {
                const isActive = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <motion.button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickSelect(acc)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between h-20 relative overflow-hidden select-none ${
                      isActive
                        ? 'bg-[#006b5f]/5 border-[#006b5f] dark:border-[#76f4e0] ring-1 ring-[#006b5f] shadow-[0_4px_12px_rgba(0,107,95,0.08)]'
                        : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-full">
                      <div className="text-[11px] font-black text-slate-850 dark:text-slate-200 truncate pr-4">{acc.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{acc.desc}</div>
                    </div>
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#006b5f] dark:bg-[#76f4e0] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white dark:text-[#090f19]" />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Secure Credential Input Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Authorized Personnel Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. nationallights2026@gmail.com"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-xs font-bold text-slate-850 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006b5f] dark:focus:ring-[#76f4e0] focus:border-transparent transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 pl-1 leading-normal">
                Credentials are systematically verified against the authorized master roster and local personnel registers.
              </p>
            </div>

            {/* Working Operational Role Select */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#006b5f] dark:text-[#76f4e0]" />
                  Authorized Working Role
                </span>
                <span className="text-[9px] font-black text-emerald-700 dark:text-[#76f4e0] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 uppercase tracking-widest">
                  Verified
                </span>
              </div>
              
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-850 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-[#006b5f] dark:focus:ring-[#76f4e0] pr-10 cursor-pointer"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      [{r.category}] {r.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute right-3 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                * Operational role determines active view permissions, ledger limits, and workflow approval authorities.
              </p>
            </div>

            {/* Sign-In Action Button */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-emerald-600 via-[#006b5f] to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-400 disabled:to-slate-400 disabled:text-slate-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_25px_-5px_rgba(0,107,95,0.25)] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Verifying Authorized Credentials…' : 'Enter ERP Workspace'}</span>
            </motion.button>
          </form>

          {/* Footer Copyright */}
          <div className="text-center pt-6 mt-6 border-t border-slate-100 dark:border-slate-850">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">
              National Lights (Pvt) Ltd Pakistan • Corporate Portal
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
};
