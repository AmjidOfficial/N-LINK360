/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Order Auto-Save Service & Browser Crash Recovery
 * Periodically saves current order booking cart / draft progress to localStorage every Hour.
 */

export interface DraftOrderProgress {
  items: any[];
  customerId?: string;
  customerName?: string;
  lastSavedAt: string;
  itemCount: number;
  totalAmount?: number;
}

const AUTOSAVE_ENABLED_KEY = 'nlink_order_autosave_enabled';
const DRAFT_ORDER_KEY = 'nlink_draft_order_progress';

/**
 * Check if Auto-Save is enabled in Settings (defaults to true)
 */
export function isAutoSaveEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Set Auto-Save toggle state in Settings
 */
export function setAutoSaveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to set auto-save toggle:', e);
  }
}

/**
 * Get current draft order progress from localStorage
 */
export function getDraftOrderProgress(): DraftOrderProgress | null {
  try {
    const raw = localStorage.getItem(DRAFT_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed as DraftOrderProgress;
    }
    return null;
  } catch (e) {
    console.error('Failed to read draft order progress from localStorage:', e);
    return null;
  }
}

/**
 * Save active order progress to localStorage
 */
export function saveDraftOrderProgress(data: {
  items: any[];
  customerId?: string;
  customerName?: string;
  totalAmount?: number;
}): DraftOrderProgress | null {
  if (!isAutoSaveEnabled()) {
    return null;
  }
  if (!data.items || data.items.length === 0) {
    clearDraftOrderProgress();
    return null;
  }

  try {
    const draft: DraftOrderProgress = {
      items: data.items,
      customerId: data.customerId,
      customerName: data.customerName,
      lastSavedAt: new Date().toISOString(),
      itemCount: data.items.reduce((sum, item) => sum + (item.orderedQuantity || item.quantity || 1), 0),
      totalAmount: data.totalAmount,
    };
    localStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(draft));
    return draft;
  } catch (e) {
    console.error('Failed to save draft order progress to localStorage:', e);
    return null;
  }
}

/**
 * Clear draft order progress from localStorage (e.g. upon order submit or clear)
 */
export function clearDraftOrderProgress(): void {
  try {
    localStorage.removeItem(DRAFT_ORDER_KEY);
  } catch (e) {
    console.error('Failed to clear draft order progress:', e);
  }
}

/**
 * Get formatted last auto-save timestamp
 */
export function getFormattedLastAutoSave(): string | null {
  const draft = getDraftOrderProgress();
  if (!draft || !draft.lastSavedAt) return null;
  try {
    const d = new Date(draft.lastSavedAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return null;
  }
}
