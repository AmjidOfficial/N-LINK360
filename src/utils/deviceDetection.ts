/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Smart Device Auto-Detection Engine
 * Automatically detects whether the user is accessing via Mobile Phone, Tablet, or Laptop/Desktop.
 * 
 * Rules:
 * 1. URL Query overrides (?mode=mobile, ?view=mobile, ?app=field vs ?mode=desktop, ?view=desktop)
 * 2. Mobile User Agent string (Android, iPhone, iPod, etc.)
 * 3. Screen width (< 1024px -> Mobile Touch View, >= 1024px -> Laptop/Desktop Web Portal)
 * 4. Touch capability & pointer type
 */

export type ExperienceMode = 'FIELD_MOBILE' | 'HEAD_OFFICE';

export function detectDeviceExperience(): ExperienceMode {
  if (typeof window === 'undefined') return 'HEAD_OFFICE';

  // 1. URL Query Override (Explicit team links or forced modes)
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || params.get('view') || params.get('app') || '').toLowerCase().trim();
    if (['mobile', 'field', 'phone', 'touch'].includes(mode)) {
      return 'FIELD_MOBILE';
    }
    if (['desktop', 'headoffice', 'web', 'portal', 'laptop', 'admin'].includes(mode)) {
      return 'HEAD_OFFICE';
    }
  } catch {}

  // 2. Mobile User Agent Check
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // 3. Screen Dimensions
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;

  // 4. Primary Decision:
  // If Mobile User Agent OR Viewport < 1024px -> Mobile Phone Version
  // If Laptop or Desktop (>= 1024px and not small mobile UA) -> Overall App / Desktop Web Version
  if (isMobileUA || width < 1024) {
    return 'FIELD_MOBILE';
  }

  return 'HEAD_OFFICE';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const width = window.innerWidth || screen.width;
  return isMobileUA || width < 1024;
}

export function getCleanShareableUrl(mode?: 'auto' | 'mobile' | 'desktop'): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-oldw3wxjmjadv5i35l4ldn-887640083895.asia-southeast1.run.app';
  }

  const base = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  if (mode === 'mobile') {
    return `${base}?mode=mobile`;
  }
  if (mode === 'desktop') {
    return `${base}?mode=desktop`;
  }
  return base;
}
