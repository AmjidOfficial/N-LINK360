/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Tactile Mobile Haptics Engine
 * Provides subtle, satisfying haptic feedback patterns matching Easypaisa & CreditBook UX.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers subtle device vibration haptic pattern
 * Gracefully no-ops if not supported or disabled on device.
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'light':
        case 'selection':
          navigator.vibrate(10); // 10ms micro-tick for buttons and tabs
          break;
        case 'medium':
          navigator.vibrate(22); // 22ms distinct tap for primary action selections
          break;
        case 'heavy':
          navigator.vibrate(35); // 35ms firm press
          break;
        case 'success':
          navigator.vibrate([14, 45, 20]); // Double gentle confirmation pulse for order booking / recovery
          break;
        case 'warning':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'error':
          navigator.vibrate([40, 50, 40, 50, 40]);
          break;
        default:
          navigator.vibrate(12);
      }
    }
  } catch {
    // Silently continue if vibration permission is restricted in browser context
  }
}
