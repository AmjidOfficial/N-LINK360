/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

export interface EnterpriseBottomNavProps {
  activeTab: EnterpriseTabType;
  onTabChange: (tab: EnterpriseTabType) => void;
  cartCount?: number;
  className?: string;
  userAvatarInitials?: string;
}

interface NavItemDef {
  id: EnterpriseTabType;
  label: string;
  icon: LucideIcon;
  badge?: number;
  isProfile?: boolean;
}

export const EnterpriseBottomNav: React.FC<EnterpriseBottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
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

          return (
            <button
              key={item.id}
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
  );
};
