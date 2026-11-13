/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Nature Tones Shimmer Skeleton Component
 * Loading fallback for React.lazy & Suspense components
 */

import React from 'react';

export interface NatureSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'full';
  count?: number;
  className?: string;
}

export const NatureSkeleton: React.FC<NatureSkeletonProps> = ({
  variant = 'card',
  count = 3,
  className = '',
}) => {
  if (variant === 'list') {
    return (
      <div className={`space-y-3 animate-pulse ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white rounded-2xl border border-[#C8E6C9] flex items-center justify-between"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#E8F5E9]" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-[#C8E6C9]/60 rounded-md w-3/5" />
                <div className="h-3 bg-[#E8F5E9] rounded-md w-2/5" />
              </div>
            </div>
            <div className="w-16 h-6 bg-[#C8E6C9]/40 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`bg-white rounded-2xl border border-[#C8E6C9] overflow-hidden animate-pulse ${className}`}>
        <div className="h-10 bg-[#1B5E3A]/10 w-full" />
        <div className="divide-y divide-[#E8F5E9] p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 px-4 flex justify-between items-center gap-4">
              <div className="h-4 bg-[#C8E6C9]/50 rounded w-1/4" />
              <div className="h-4 bg-[#E8F5E9] rounded w-1/3" />
              <div className="h-4 bg-[#C8E6C9]/50 rounded w-1/6" />
              <div className="h-4 bg-[#1B5E3A]/20 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-4 animate-pulse p-4 ${className}`}>
        <div className="h-24 bg-white rounded-2xl border border-[#C8E6C9] p-4 space-y-3">
          <div className="h-5 bg-[#1B5E3A]/20 rounded-md w-1/3" />
          <div className="h-4 bg-[#E8F5E9] rounded-md w-2/3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[#C8E6C9] p-4 space-y-3">
              <div className="h-4 bg-[#C8E6C9]/60 rounded w-1/2" />
              <div className="h-8 bg-[#1B5E3A]/10 rounded w-3/4" />
              <div className="h-3 bg-[#E8F5E9] rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Card Skeleton
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 border border-[#C8E6C9] space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-[#C8E6C9]/70 rounded-md w-1/3" />
            <div className="h-4 bg-[#1B5E3A]/15 rounded-full w-12" />
          </div>
          <div className="h-6 bg-[#1B5E3A]/20 rounded-md w-2/3" />
          <div className="h-3 bg-[#E8F5E9] rounded-md w-1/2" />
        </div>
      ))}
    </div>
  );
};
