/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Bottom Navigation Bar
 * Pixel-perfect implementation based on Stitch Design System
 */

import React from 'react';

export type EnterpriseTabType = 'ORDERS' | 'DASHBOARD' | 'ATTENDANCE' | 'DEALERS';

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
  const navItems: { id: EnterpriseTabType; label: string; icon: string }[] = [
    { id: 'ATTENDANCE', label: 'Attendance', icon: 'event_available' },
    { id: 'ORDERS', label: 'Entry Form', icon: 'edit_note' },
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard' },
    { id: 'DEALERS', label: 'Dealers / ERP', icon: 'storefront' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#e0e3e5] px-2 py-2 z-40 shadow-lg" id="enterprise-bottom-navigation">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#006b5f] font-bold'
                  : 'text-[#74777e] hover:text-[#191c1e]'
              }`}
            >
              <div className="relative">
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform ${
                    isActive ? 'scale-110' : ''
                  }`}
                >
                  {item.icon}
                </span>

                {item.id === 'ORDERS' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#006b5f] text-white text-[9px] font-extrabold px-1 rounded-full animate-bounce">
                    {cartCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap font-medium">
                {item.label}
              </span>

              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#006b5f] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
