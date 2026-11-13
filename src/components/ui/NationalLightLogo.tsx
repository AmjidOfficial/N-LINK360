/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Light Enterprise Logo & Watermark Components
 */

import React from 'react';

export interface NationalLightLogoProps {
  variant?: 'full' | 'compact' | 'white' | 'dark' | 'watermark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Official National Light Crest Icon
 */
export const NationalLightCrestIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="National Light Official Emblem"
  >
    {/* Outer Shield / Shield Frame */}
    <path
      d="M50 5 L88 22 V50 C88 72 71 90 50 96 C29 90 12 72 12 50 V22 L50 5 Z"
      fill="#1B5E3A"
      stroke="#A7C957"
      strokeWidth="3.5"
    />
    {/* Inner Sunburst Rays / Light Beams */}
    <path d="M50 20 L50 48" stroke="#D9F99D" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 48 L32 30" stroke="#D9F99D" strokeWidth="3" strokeLinecap="round" />
    <path d="M50 48 L68 30" stroke="#D9F99D" strokeWidth="3" strokeLinecap="round" />
    <path d="M50 48 L25 45" stroke="#D9F99D" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M50 48 L75 45" stroke="#D9F99D" strokeWidth="2.5" strokeLinecap="round" />
    {/* Center Luminous Core Ring */}
    <circle cx="50" cy="50" r="10" fill="#4CAF50" stroke="#FFFFFF" strokeWidth="2" />
    {/* N-LINK Dynamic Banner Wave */}
    <path
      d="M22 68 C35 60, 65 60, 78 68 C78 76, 65 84, 50 86 C35 84, 22 76, 22 68 Z"
      fill="#4CAF50"
      stroke="#D9F99D"
      strokeWidth="1.5"
    />
    {/* N Lettermark inside Banner */}
    <path d="M42 74 V62 L58 74 V62" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * National Light Header Brand Logo (Crest + Typographic Wordmark)
 */
export const NationalLightLogo: React.FC<NationalLightLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-7 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-11 text-base',
    xl: 'h-14 text-lg',
  }[size];

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  if (variant === 'watermark') {
    return (
      <div className={`pointer-events-none select-none flex flex-col items-center justify-center opacity-6 ${className}`}>
        <NationalLightCrestIcon className="w-56 h-56 text-[#1B5E3A]" />
        <span className="font-extrabold tracking-widest text-3xl font-sans uppercase text-[#1B5E3A] mt-2">
          NATIONAL LIGHT
        </span>
        <span className="font-mono text-sm tracking-widest text-[#3E6B48] font-bold">
          EST. PAKISTAN &middot; OFFICIAL ENTERPRISE
        </span>
      </div>
    );
  }

  const textColor = variant === 'white' ? 'text-white' : variant === 'dark' ? 'text-slate-900 dark:text-white' : 'text-[#1B5E3A]';
  const subtitleColor = variant === 'white' ? 'text-emerald-100' : 'text-[#5F8564] dark:text-slate-400';

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${sizeClasses} ${className}`}>
      <NationalLightCrestIcon className={`${iconSizes} shrink-0`} />
      <div className="min-w-0 flex flex-col justify-center leading-none">
        <div className={`font-black tracking-tight uppercase truncate ${textColor} text-[13px] sm:text-[15px]`}>
          NATIONAL LIGHT
        </div>
        <div className={`font-mono font-bold tracking-widest text-[9px] sm:text-[10px] uppercase truncate ${subtitleColor} mt-0.5`}>
          N-LINK 360 ENTERPRISE
        </div>
      </div>
    </div>
  );
};

/**
 * Centered Document Background Watermark Overlay for Invoices & Ledgers
 */
export const DocumentCenterWatermark: React.FC<{ title?: string; className?: string }> = ({
  title = 'NATIONAL LIGHT',
  className = '',
}) => (
  <div
    className={`absolute inset-0 pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden z-0 ${className}`}
    aria-hidden="true"
  >
    <div className="opacity-[0.05] dark:opacity-[0.07] flex flex-col items-center justify-center transform -rotate-12 scale-110 sm:scale-125">
      <NationalLightCrestIcon className="w-64 h-64 sm:w-80 sm:h-80 text-[#1B5E3A]" />
      <div className="font-black text-3xl sm:text-4xl uppercase tracking-[0.2em] text-[#1B5E3A] mt-2 font-sans">
        {title}
      </div>
      <div className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] font-bold text-[#1B5E3A] mt-1">
        OFFICIAL REGISTERED LEDGER & INVOICE
      </div>
    </div>
  </div>
);
