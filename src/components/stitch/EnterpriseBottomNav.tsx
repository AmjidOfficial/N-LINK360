/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Bottom Navigation Bar
 * 5-Tab mobile-first layout strictly matching baseline specification:
 * Home (Dashboard) | Attendance | Entry (Ordering/Recovery) | Ledger (Invoices/Ledgers) | Dealers
 */

import React from 'react';

export type EnterpriseTabType = 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS';

export interface EnterpriseBottomNavProps {
  activeTab: EnterpriseTabType;
  onTabChange: (tab: EnterpriseTabType) => void;
  cartCount?: number;
}

export const EnterpriseBottomNav: React.FC<EnterpriseBottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
}) => {
  const navItems: { id: EnterpriseTabType; label: string; icon: string; isPrimary?: boolean }[] = [
    { id: 'DASHBOARD', label: 'Home', icon: 'dashboard' },
    { id: 'ATTENDANCE', label: 'Attendance', icon: 'event_available' },
    { id: 'ORDERS', label: 'Entry', icon: 'add_circle', isPrimary: true },
    { id: 'LEDGERS', label: 'Ledger', icon: 'receipt_long' },
    { id: 'DEALERS', label: 'Dealers', icon: 'storefront' },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#0b131e]/95 backdrop-blur-md border-t border-[#e0e3e5] dark:border-slate-800 z-40 shadow-lg transition-colors"
      id="enterprise-bottom-navigation"
    >
      <div className="max-w-[420px] mx-auto h-[64px] flex items-center justify-between px-1 relative">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          // Prominent center "Entry" action button matching exact 52px button / 72px clearance zone guideline
          if (item.isPrimary) {
            return (
              <div
                key={item.id}
                className="w-[74px] h-full flex flex-col items-center justify-end pb-1.5 relative shrink-0"
              >
                {/* 72px optical clearance zone container */}
                <div className="absolute -top-[20px] w-[72px] h-[72px] flex items-center justify-center pointer-events-none">
                  <div className="w-[66px] h-[66px] rounded-full bg-white dark:bg-[#0b131e] p-1.5 shadow-md flex items-center justify-center border border-[#e0e3e5] dark:border-slate-800">
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 pointer-events-auto cursor-pointer ${
                        isActive
                          ? 'bg-[#006b5f] text-[#76f4e0] ring-4 ring-[#76f4e0]/30 shadow-[#006b5f]/40'
                          : 'bg-[#001428] text-white hover:bg-[#002850] shadow-slate-900/30'
                      }`}
                      title="Quick Entry (+)"
                      aria-label="New Entry"
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {item.icon}
                      </span>
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <span
                  className={`text-[12px] tracking-tight font-bold whitespace-nowrap mt-auto ${
                    isActive
                      ? 'text-[#006b5f] dark:text-[#76f4e0]'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-[74px] h-full flex flex-col items-center justify-center pt-1 pb-1 transition-all relative shrink-0 cursor-pointer ${
                isActive
                  ? 'text-[#006b5f] dark:text-[#76f4e0] font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[24px] transition-transform ${
                    isActive ? 'scale-105' : ''
                  }`}
                >
                  {item.icon}
                </span>
              </div>

              {/* 2px gap between icon and label, 12px font size */}
              <span className="text-[12px] tracking-tight mt-[2px] whitespace-nowrap font-medium">
                {item.label}
              </span>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#006b5f] dark:bg-[#76f4e0] mt-[2px]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
