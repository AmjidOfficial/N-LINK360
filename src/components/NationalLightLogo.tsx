/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * National Light Official Brand Logo Component
 * Matches the official circular National Light brand identity with green crescent,
 * solar/lamp filament, lightning-bolt typography, circular frame, and optional neon glow.
 */

import React from 'react';
import logoAsset from '../assets/images/national_light_logo_1789302224221.jpg';

export interface NationalLightLogoProps {
  /** Size preset or pixel dimension */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  /** Whether to render the neon green luminous glow frame (as in the brand picture) */
  showGlow?: boolean;
  /** Optional custom CSS classes for the container frame */
  className?: string;
  /** Accessibility text */
  alt?: string;
  /** Rendering mode: 'image' loads the high-res master asset, 'vector' renders crisp scalable SVG */
  variant?: 'image' | 'vector';
}

const sizeMap: Record<string, { container: string; px: number }> = {
  xs: { container: 'w-7 h-7', px: 28 },
  sm: { container: 'w-9 h-9', px: 36 },
  md: { container: 'w-11 h-11', px: 44 },
  lg: { container: 'w-14 h-14', px: 56 },
  xl: { container: 'w-20 h-20', px: 80 },
  '2xl': { container: 'w-28 h-28', px: 112 },
};

export const NationalLightLogo: React.FC<NationalLightLogoProps> = ({
  size = 'md',
  showGlow = true,
  className = '',
  alt = 'National Light Official Brand Logo',
  variant = 'image',
}) => {
  const isPreset = typeof size === 'string' && size in sizeMap;
  const sizeClasses = isPreset ? sizeMap[size].container : '';

  const glowEffect = showGlow
    ? 'shadow-[0_0_12px_rgba(34,197,94,0.65),0_0_24px_rgba(34,197,94,0.25)]'
    : 'shadow-sm';

  const styleObj = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      style={styleObj}
      title="National Light - Enlightening The Nation"
      id="national-light-logo-container"
    >
      {/* Outer frame matching the attached picture: Circular badge with green glow and orange border */}
      <div
        className={`w-full h-full rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-emerald-500 via-green-400 to-emerald-600 ${glowEffect} ring-2 ring-emerald-500/40 flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-[0.5px]">
          {variant === 'image' ? (
            <img
              src={logoAsset || '/national_light_logo.jpg'}
              alt={alt}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If asset fails to load, switch to vector rendering
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          ) : (
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full rounded-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 3D Sun Sphere Gradient */}
                <radialGradient id="nlSunGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="25%" stopColor="#F97316" />
                  <stop offset="85%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#991B1B" />
                </radialGradient>

                {/* Lightning Bolt Gradient */}
                <linearGradient id="nlBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FACC15" />
                  <stop offset="50%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#B91C1C" />
                </linearGradient>
              </defs>

              {/* White Circular Card Background */}
              <circle cx="200" cy="200" r="198" fill="#FFFFFF" />

              {/* Orange Inner Accent Ring as seen in the official logo frame */}
              <circle cx="200" cy="200" r="186" fill="none" stroke="#F37021" strokeWidth="9" />

              {/* Top Green Crescent Arch */}
              <path
                d="M 142 165 C 130 90 270 90 258 165 C 248 110 152 110 142 165 Z"
                fill="#00873D"
              />

              {/* Sun Ray Spikes (Green triangular blades surrounding sun) */}
              <g fill="#00873D">
                <polygon points="200,68 194,86 206,86" />
                <polygon points="200,162 194,144 206,144" />
                <polygon points="153,115 171,109 171,121" />
                <polygon points="247,115 229,109 229,121" />
                <polygon points="167,82 181,94 172,103" />
                <polygon points="233,82 219,94 228,103" />
                <polygon points="167,148 181,136 172,127" />
                <polygon points="233,148 219,136 228,127" />
              </g>

              {/* 3D Glowing Red/Orange Sun Sphere */}
              <circle cx="200" cy="115" r="28" fill="url(#nlSunGrad)" />

              {/* Filament Rings (3 Green Ellipses) */}
              <g fill="none" stroke="#00873D" strokeWidth="5.5">
                <ellipse cx="200" cy="160" rx="22" ry="7" />
                <ellipse cx="200" cy="178" rx="23" ry="7" />
                <ellipse cx="200" cy="196" rx="24" ry="7" />
              </g>

              {/* Lamp Base Steps & Plug Contacts */}
              <g fill="#00873D">
                <rect x="168" y="210" width="64" height="12" rx="6" />
                <rect x="172" y="226" width="56" height="10" rx="5" />
                <rect x="186" y="240" width="10" height="14" rx="2" />
                <rect x="204" y="240" width="10" height="14" rx="2" />
              </g>

              {/* Typography: NATIONAL */}
              <g
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                fontWeight="900"
                fontSize="50"
                letterSpacing="-0.5"
                fill="#000000"
              >
                <text x="56" y="306">NATI</text>

                {/* Letter O with Lightning Bolt Cutout & Overlay */}
                <g>
                  {/* Outer O ellipse */}
                  <circle cx="200" cy="290" r="20" fill="none" stroke="#000000" strokeWidth="11" />
                  {/* Dynamic Lightning Bolt striking through the O */}
                  <polygon
                    points="208,266 193,291 202,291 190,314 212,286 200,286"
                    fill="url(#nlBoltGrad)"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>

                <text x="232" y="306">NAL</text>
              </g>

              {/* Typography: LIGHT */}
              <text
                x="200"
                y="354"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                fontWeight="900"
                fontSize="52"
                letterSpacing="1"
                fill="#000000"
              >
                LIGHT
              </text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
