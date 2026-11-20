/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Dual-Theme Slate & Daylight Skeleton Loader
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
      <div className={`space-y-3 animate-pulse ${className}`} aria-busy="true" aria-label="Loading records">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/5" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-2/5" />
              </div>
            </div>
            <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={`bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse ${className}`}
        aria-busy="true"
        aria-label="Loading table"
      >
        <div className="h-10 bg-slate-100 dark:bg-[#1E293B] w-full border-b border-slate-200 dark:border-slate-800" />
        <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 px-4 flex justify-between items-center gap-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-4 animate-pulse p-4 ${className}`} aria-busy="true" aria-label="Loading dashboard view">
        <div className="h-24 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-2/3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Card Skeleton
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse ${className}`} aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-12" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2" />
        </div>
      ))}
    </div>
  );
};
