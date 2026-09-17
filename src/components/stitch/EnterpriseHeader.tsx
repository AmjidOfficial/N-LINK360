/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Header Component
 * Pixel-perfect implementation based on Stitch Design System
 */

import React, { useState } from 'react';
import { NLinkUser, TEAM_USERS } from '../../data/nlink-users-team';

export interface EnterpriseHeaderProps {
  activeTab: 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS';
  currentUser: NLinkUser;
  onSelectUser: (user: NLinkUser) => void;
  onOpenRateCard: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onTriggerLock?: () => void;
  isOnline?: boolean;
}

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  activeTab,
  currentUser,
  onSelectUser,
  onOpenRateCard,
  isDarkMode = false,
  onToggleDarkMode,
  onTriggerLock,
  isOnline = true,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b131e]/95 backdrop-blur-md border-b border-[#e0e3e5] dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs transition-colors">
      {/* Left: Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex items-center justify-center p-0.5 shrink-0">
          <img
            src="/national_light_logo.jpg"
            alt="National Light Pakistan"
            className="w-full h-full object-contain"
            onError={(e) => {
              // fallback if image fails
              (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div class="w-full h-full bg-[#001428] text-[#76f4e0] flex items-center justify-center font-black text-xs">NL</div>';
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm sm:text-base text-[#191c1e] dark:text-white tracking-tight leading-none">
            NATIONAL<span className="text-[#006b5f] dark:text-[#76f4e0]"> LIGHT</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-[#74777e] dark:text-slate-400 font-semibold tracking-wider uppercase">
              Pakistan • N-LINK 360
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          </div>
        </div>
      </div>

      {/* Center: Active View Title */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#f2f4f6] dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700">
        <span className="w-2 h-2 rounded-full bg-[#006b5f] dark:bg-[#76f4e0] animate-pulse" />
        <span className="text-xs font-black text-[#191c1e] dark:text-white tracking-wider uppercase font-mono">
          {activeTab}
        </span>
      </div>

      {/* Right: Actions, Dark Mode, Biometric Lock & User Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dark Mode Toggle */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Switch to Outdoor Light Mode' : 'Switch to Dark Mode (Battery Saver)'}
            className="p-2 rounded-xl bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-[#76f4e0] border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}

        {/* Biometric Security Lock Button */}
        {onTriggerLock && (
          <button
            onClick={onTriggerLock}
            title="Lock App with WebAuthn / Biometrics"
            className="p-2 rounded-xl bg-[#001428] text-[#76f4e0] border border-[#76f4e0]/30 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              fingerprint
            </span>
          </button>
        )}

        <button
          onClick={onOpenRateCard}
          className="hidden md:flex items-center gap-1 text-xs font-bold text-[#006b5f] dark:text-[#76f4e0] bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2.5 py-1.5 rounded-xl hover:bg-[#76f4e0]/35 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">price_change</span>
          <span>Rate Card</span>
        </button>

        {/* User Profile Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 bg-[#f2f4f6] dark:bg-slate-800 hover:bg-[#e0e3e5] dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-[#001428] text-white flex items-center justify-center text-xs font-bold font-mono">
              {currentUser.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#191c1e] dark:text-white leading-tight truncate max-w-[100px]">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-[#74777e] dark:text-slate-400 uppercase font-semibold">
                {currentUser.role}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-500">
              arrow_drop_down
            </span>
          </button>

          {/* User Switcher Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0b131e] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-slideDown">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Switch Active Role / User
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {TEAM_USERS.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      currentUser.id === user.id ? 'bg-[#76f4e0]/15' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#001428] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {user.fullName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.fullName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {user.role} • {user.territory || 'Peshawar'}
                      </div>
                    </div>
                    {currentUser.id === user.id && (
                      <span className="material-symbols-outlined text-[#006b5f] dark:text-[#76f4e0] text-[18px]">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
