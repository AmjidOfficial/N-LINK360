/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Top-Level BrandHeader Component
 * Single-row Deep Slate / Crisp Daylight corporate header lockup.
 */

import React from 'react';
import { NationalLightLogo } from './NationalLightLogo';
import { NLinkUser } from '../data/nlink-users-team';

export interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  currentUser?: NLinkUser | null;
  experienceMode?: 'FIELD_MOBILE' | 'HEAD_OFFICE';
  onToggleExperience?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  subtitle = 'National Light Enterprise Field Intelligence',
  currentUser,
  experienceMode = 'FIELD_MOBILE',
  onToggleExperience,
  children,
  className = '',
}) => {
  return (
    <div
      className={`w-full bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-50 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 ${className}`}
      id="brand-header-top-bar"
    >
      {/* Zone 1: Logo + Brand Wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        <NationalLightLogo size="md" showGlow={false} variant="image" />
        <div className="min-w-0 flex flex-col justify-center">
          <span className="font-extrabold tracking-tight uppercase text-slate-900 dark:text-white text-sm sm:text-base font-sans truncate">
            NATIONAL LIGHT
          </span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate font-medium">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Zone 3: User Persona & Context Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {children}

        {currentUser && (
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] dark:bg-[#3B82F6] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.avatarInitials ||
                (currentUser.fullName || 'NL')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {currentUser.roleTitle || 'Personnel'}
              </div>
            </div>
          </div>
        )}

        {onToggleExperience && (
          <button
            type="button"
            onClick={onToggleExperience}
            className="btn-outline min-h-[40px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            title="Switch Experience Mode"
          >
            {experienceMode === 'FIELD_MOBILE' ? 'Command Portal' : 'Mobile PWA'}
          </button>
        )}
      </div>
    </div>
  );
};
