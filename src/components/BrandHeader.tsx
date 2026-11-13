/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Top-Level BrandHeader Component
 * Injects National Light official branding, logo, and active title lockup
 * into top-level layouts for both Head Office Command Portal and Mobile Experience.
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
  title = 'N-LINK 360',
  subtitle = 'National Light Enterprise Field Intelligence',
  currentUser,
  experienceMode = 'FIELD_MOBILE',
  onToggleExperience,
  children,
  className = '',
}) => {
  return (
    <div
      className={`w-full bg-[#1B5E3A] text-white px-4 py-3 sm:px-6 flex items-center justify-between gap-4 border-b border-[#2E6B46] shadow-sm ${className}`}
      id="brand-header-top-bar"
    >
      {/* Left Slot: Logo + Lockup */}
      <div className="flex items-center gap-3 min-w-0">
        <NationalLightLogo size="md" showGlow variant="image" />
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight uppercase text-white text-base sm:text-lg font-sans truncate">
              NATIONAL LIGHT
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#D9F99D]/20 text-[#D9F99D] text-[10px] font-mono font-bold uppercase tracking-wider hidden xs:inline-block">
              OFFICIAL
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#D9F99D] truncate font-medium">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Right Slot: User Persona & Context Children */}
      <div className="flex items-center gap-3 shrink-0">
        {children}

        {currentUser && (
          <div className="hidden md:flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
            <div className="w-8 h-8 rounded-full bg-[#4CAF50] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser.avatarInitials ||
                (currentUser.fullName || 'NL')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-white truncate max-w-[140px]">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-[#D9F99D] font-mono truncate">
                {currentUser.roleTitle || 'Personnel'}
              </div>
            </div>
          </div>
        )}

        {onToggleExperience && (
          <button
            type="button"
            onClick={onToggleExperience}
            className="btn-secondary px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
            title="Switch Experience Mode"
          >
            {experienceMode === 'FIELD_MOBILE' ? 'Command Portal' : 'Mobile PWA'}
          </button>
        )}
      </div>
    </div>
  );
};
