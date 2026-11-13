/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
<<<<<<< HEAD
 * N-LINK 360 - Meniscus Floating Enterprise White Dock
 * Modeled after SalesPulse clean floating white pill dock:
 * 4 Destinations: Home, Dashboard, Order, and Profile (with User avatar badge)
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Home,
  LayoutDashboard,
  ShoppingBag,
  User,
  LucideIcon,
} from 'lucide-react';

export type EnterpriseTabType =
  | 'HOME'
  | 'DASHBOARD'
  | 'ORDER'
  | 'PROFILE'
  | 'ATTENDANCE'
  | 'ORDERS'
  | 'DEALERS'
  | 'MORE';
=======
 * N-LINK 360 - Enterprise Bottom Navigation Bar
 * 5-Tab mobile-first layout strictly matching baseline specification:
 * Home (Dashboard) | Attendance | Entry (Ordering/Recovery) | Ledger (Invoices/Ledgers) | Dealers
 */

import React from 'react';

export type EnterpriseTabType = 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

export interface EnterpriseBottomNavProps {
  activeTab: EnterpriseTabType;
  onTabChange: (tab: EnterpriseTabType) => void;
  cartCount?: number;
<<<<<<< HEAD
  className?: string;
  userAvatarInitials?: string;
}

interface NavItemDef {
  id: EnterpriseTabType;
  label: string;
  icon: LucideIcon;
  badge?: number;
  isProfile?: boolean;
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
}

export const EnterpriseBottomNav: React.FC<EnterpriseBottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
<<<<<<< HEAD
  className = '',
  userAvatarInitials = 'NL',
}) => {
  const navItems: NavItemDef[] = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ORDER', label: 'Order', icon: ShoppingBag, badge: cartCount },
    { id: 'PROFILE', label: 'Profile', icon: User, isProfile: true },
  ];

  // Map normalized active tab to one of the 4 items
  const normalizedActiveId = React.useMemo(() => {
    if (activeTab === 'ATTENDANCE' || activeTab === 'HOME') return 'HOME';
    if (activeTab === 'DASHBOARD') return 'DASHBOARD';
    if (activeTab === 'ORDER' || activeTab === 'ORDERS' || activeTab === 'DEALERS') return 'ORDER';
    if (activeTab === 'PROFILE' || activeTab === 'MORE') return 'PROFILE';
    return 'ORDER';
  }, [activeTab]);

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe ${className}`}
      id="salespulse-floating-dock-container"
    >
      <nav
        aria-label="Mobile Navigation"
        className="max-w-lg mx-auto flex items-stretch justify-around px-2"
      >
        {navItems.map((item) => {
          const isActive = normalizedActiveId === item.id;
          const Icon = item.icon;
=======
}) => {
  const navItems: { id: EnterpriseTabType; label: string; icon: string; isPrimary?: boolean }[] = [
    { id: 'DASHBOARD', label: 'Home', icon: 'dashboard' },
    { id: 'ATTENDANCE', label: 'Attendance', icon: 'event_available' },
    { id: 'ORDERS', label: 'Order', icon: 'add_circle', isPrimary: true },
    { id: 'LEDGERS', label: 'Khata', icon: 'menu_book' },
    { id: 'DEALERS', label: 'Dealers', icon: 'storefront' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#0b131e]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 shadow-lg transition-colors"
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

          return (
            <button
              key={item.id}
<<<<<<< HEAD
              type="button"
              onClick={() => onTabChange(item.id)}
              className="relative flex-1 flex flex-col items-center justify-center min-h-[52px] py-1.5 group cursor-pointer focus:outline-none transition-colors active:bg-slate-50 dark:active:bg-slate-800/60"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Top Active Indicator Line */}
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#0052FF] dark:bg-blue-400"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              {/* Icon / Avatar Badge */}
              <div className="relative flex items-center justify-center mb-0.5">
                {item.isProfile ? (
                  <div
                    className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#0052FF] text-white ring-2 ring-blue-200 dark:ring-blue-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-slate-300'
                    }`}
                  >
                    {userAvatarInitials}
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? 'text-[#0052FF] dark:text-blue-400 stroke-[2.25]'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 stroke-[1.75]'
                    }`}
                  />
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#0052FF] text-white font-mono text-[9px] font-bold flex items-center justify-center border border-white dark:border-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label Text */}
              <span
                className={`text-[11px] tracking-tight font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'text-[#0052FF] dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  );
};
