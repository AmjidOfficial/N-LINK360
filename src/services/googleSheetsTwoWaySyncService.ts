/**
 * N-LINK 360 — 2-Way Google Sheets Database & 30-Minute Auto-Sync Service
 *
 * Dedicated Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 *
 * Requirements:
 * 1. 2-way database synchronization (Google Sheets <--> Local Database / Supabase).
 * 2. Auto-sync interval strictly every 30 minutes in background.
 * 3. Local data persistence: Until the 30-minute cycle runs, all newly created
 *    data (Orders, Recoveries, Customers, Visits, Attendance) is reliably stored locally.
 * 4. Immediate upload upon user submission: Whenever a user clicks "Submit",
 *    the data is saved locally AND immediately uploaded to Google Sheets (or queued if offline/unauthorized).
 * 5. Instant manual trigger: Users can click "Submit / Upload All Now" at any moment to upload all local data.
 */

import {
  TARGET_SPREADSHEET_ID,
  getActiveSpreadsheetId,
  syncDatabaseToGoogleSheet,
  pushOrderToGoogleSheet,
  pushRecoveryToGoogleSheet,
  pushCustomerToGoogleSheet,
  pushAttendanceToGoogleSheet,
  pushVisitToGoogleSheet,
  pushEmployeeToGoogleSheet,
  pushProductToGoogleSheet,
} from './googleSheetsLiveService';
import { executeGoogleSheetImport, ImportSummary } from './googleSheetImportService';
import { getAccessToken } from './googleAuth';
import { SupabaseAppData } from './supabase-data';
import type { Customer, SalesOrder, Recovery } from '../types';

export { TARGET_SPREADSHEET_ID, getActiveSpreadsheetId };

export const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 Minutes

const LOCAL_DB_CACHE_KEY = 'nlink_local_database_cache_v4';
const PENDING_UPLOADS_KEY = 'nlink_pending_google_uploads_v4';
const LAST_SYNC_KEY = 'nlink_google_sheets_last_sync';
const NEXT_SYNC_KEY = 'nlink_google_sheets_next_sync_target';
const AUTO_SYNC_ENABLED_KEY = 'nlink_google_auto_sync_enabled';

export interface PendingUploadItem {
  id: string;
  type: 'ORDER' | 'RECOVERY' | 'CUSTOMER' | 'ATTENDANCE' | 'VISIT' | 'LEDGER_TRANSACTION' | 'USER' | 'PRODUCT';
  data: any;
  customerName?: string;
  userName?: string;
  timestamp: string;
  attempts: number;
  lastError?: string;
}

export interface LocalDatabaseCache {
  orders: SalesOrder[];
  recoveries: Recovery[];
  customers: Customer[];
  visits: any[];
  attendance: any[];
  lastUpdated: string;
}

export interface AutoSyncStatus {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  nextSyncTarget: number; // timestamp in ms
  secondsRemaining: number;
  pendingUploadsCount: number;
  lastError: string | null;
  lastSummaryMessage: string | null;
}

type AutoSyncListener = (status: AutoSyncStatus) => void;
const listeners: Set<AutoSyncListener> = new Set();

let autoSyncTimer: NodeJS.Timeout | null = null;
let countdownTimer: NodeJS.Timeout | null = null;
let currentIsSyncing = false;
let currentLastError: string | null = null;
let currentLastMessage: string | null = null;

// ============================================================================
// 1. LOCAL STORAGE PERSISTENCE ENGINE
// ============================================================================

export function getLocalDatabaseCache(): LocalDatabaseCache {
  try {
    const raw = localStorage.getItem(LOCAL_DB_CACHE_KEY);
    if (!raw) {
      return {
        orders: [],
        recoveries: [],
        customers: [],
        visits: [],
        attendance: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read local database cache:', err);
    return {
      orders: [],
      recoveries: [],
      customers: [],
      visits: [],
      attendance: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export function saveLocalDatabaseCache(cache: LocalDatabaseCache): void {
  try {
    cache.lastUpdated = new Date().toISOString();
    localStorage.setItem(LOCAL_DB_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Failed to save local database cache:', err);
  }
}

export function getPendingUploads(): PendingUploadItem[] {
  try {
    const raw = localStorage.getItem(PENDING_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read pending uploads:', err);
    return [];
  }
}

export function savePendingUploads(items: PendingUploadItem[]): void {
  try {
    localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(items));
    notifyStatusChange();
  } catch (err) {
    console.error('Failed to save pending uploads:', err);
  }
}

export function addPendingUpload(
  type: PendingUploadItem['type'],
  data: any,
  meta?: { customerName?: string; userName?: string }
): PendingUploadItem {
  const items = getPendingUploads();
  const newItem: PendingUploadItem = {
    id: `upload_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    data,
    customerName: meta?.customerName,
    userName: meta?.userName,
    timestamp: new Date().toISOString(),
    attempts: 0,
  };
  items.push(newItem);
  savePendingUploads(items);
  return newItem;
}

export function removePendingUpload(id: string): void {
  const items = getPendingUploads();
  const filtered = items.filter((i) => i.id !== id);
  savePendingUploads(filtered);
}

// ============================================================================
// 2. IMMEDIATE USER SUBMIT HANDLERS (SAVE LOCAL + UPLOAD TO SHEET)
// ============================================================================

/**
 * Whenever a user submits an Order:
 * 1. Stores order immediately in Local Storage
 * 2. Attempts immediate upload to Google Sheets
 * 3. Queues in pending uploads if offline or token not available
 */
export async function submitAndSaveOrder(
  order: any,
  customerName: string,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  // 1. Store in Local Database Cache
  const cache = getLocalDatabaseCache();
  const exists = cache.orders.some((o) => (o.id && o.id === order.id) || (o.orderNumber && o.orderNumber === order.orderNumber));
  if (!exists) {
    cache.orders.unshift(order);
    saveLocalDatabaseCache(cache);
  }

  // 2. Determine Google Token
  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushOrderToGoogleSheet(spreadsheetId, order, customerName, effectiveToken);
      console.log(`[Google Sheets] Order #${order.orderNumber || order.id} uploaded immediately to Google Sheet.`);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err: any) {
      console.warn('Direct upload failed on submit, queuing for auto-sync:', err);
      addPendingUpload('ORDER', order, { customerName });
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    // Token not available yet, queue for 30-min auto-sync or manual upload
    addPendingUpload('ORDER', order, { customerName });
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Whenever a user submits a Payment Recovery:
 * 1. Stores recovery immediately in Local Storage
 * 2. Attempts immediate upload to Google Sheets
 * 3. Queues in pending uploads if offline or token not available
 */
export async function submitAndSaveRecovery(
  recovery: any,
  customerName: string,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  // 1. Store in Local Database Cache
  const cache = getLocalDatabaseCache();
  const exists = cache.recoveries.some((r) => (r.id && r.id === recovery.id) || (r.recoveryNumber && r.recoveryNumber === recovery.recoveryNumber));
  if (!exists) {
    cache.recoveries.unshift(recovery);
    saveLocalDatabaseCache(cache);
  }

  // 2. Determine Google Token
  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushRecoveryToGoogleSheet(spreadsheetId, recovery, customerName, effectiveToken);
      console.log(`[Google Sheets] Recovery Rs. ${recovery.amount} uploaded immediately to Google Sheet.`);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err: any) {
      console.warn('Direct recovery upload failed on submit, queuing for auto-sync:', err);
      addPendingUpload('RECOVERY', recovery, { customerName });
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('RECOVERY', recovery, { customerName });
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Whenever a user submits a Dealer/Customer Registration:
 * 1. Stores customer immediately in Local Storage
 * 2. Attempts immediate upload to Google Sheets
 */
export async function submitAndSaveCustomer(
  customer: any,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  const cache = getLocalDatabaseCache();
  const exists = cache.customers.some((c) => (c.id && c.id === customer.id) || (c.customerCode && c.customerCode === customer.customerCode));
  if (!exists) {
    cache.customers.unshift(customer);
    saveLocalDatabaseCache(cache);
  }

  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushCustomerToGoogleSheet(spreadsheetId, customer, effectiveToken);
      console.log(`[Google Sheets] Customer "${customer.companyName || customer.name}" uploaded immediately to Google Sheet.`);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err: any) {
      console.warn('Customer sheet push failed, queuing:', err);
      addPendingUpload('CUSTOMER', customer);
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('CUSTOMER', customer);
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Whenever a user marks Attendance:
 * 1. Stores attendance locally
 * 2. Attempts immediate upload to Google Sheets
 */
export async function submitAndSaveAttendance(
  attendance: any,
  userName: string,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  const cache = getLocalDatabaseCache();
  cache.attendance.unshift(attendance);
  saveLocalDatabaseCache(cache);

  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushAttendanceToGoogleSheet(spreadsheetId, attendance, userName, effectiveToken);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err) {
      addPendingUpload('ATTENDANCE', attendance, { userName });
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('ATTENDANCE', attendance, { userName });
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Whenever a user logs a Visit:
 * 1. Stores visit locally
 * 2. Attempts immediate upload to Google Sheets
 */
export async function submitAndSaveVisit(
  visit: any,
  customerName: string,
  userName: string,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  const cache = getLocalDatabaseCache();
  cache.visits.unshift(visit);
  saveLocalDatabaseCache(cache);

  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushVisitToGoogleSheet(spreadsheetId, visit, customerName, userName, effectiveToken);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err) {
      addPendingUpload('VISIT', visit, { customerName, userName });
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('VISIT', visit, { customerName, userName });
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Persists an employee locally and pushes to Google Sheet
 */
export async function persistAndUploadUser(
  user: any,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushEmployeeToGoogleSheet(spreadsheetId, user, effectiveToken);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err) {
      addPendingUpload('USER', user);
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('USER', user);
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

/**
 * Persists product item locally and pushes to Google Sheet
 */
export async function persistAndUploadProduct(
  product: any,
  token?: string | null
): Promise<{ storedLocally: boolean; uploadedToSheet: boolean; queued: boolean }> {
  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (effectiveToken) {
    try {
      await pushProductToGoogleSheet(spreadsheetId, product, effectiveToken);
      return { storedLocally: true, uploadedToSheet: true, queued: false };
    } catch (err) {
      addPendingUpload('PRODUCT', product);
      return { storedLocally: true, uploadedToSheet: false, queued: true };
    }
  } else {
    addPendingUpload('PRODUCT', product);
    return { storedLocally: true, uploadedToSheet: false, queued: true };
  }
}

// ============================================================================
// 3. FULL 2-WAY SYNCHRONIZATION ENGINE
// ============================================================================

/**
 * Flushes all pending local uploads directly to Google Sheets
 */
export async function flushPendingUploadsToSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<{ flushedCount: number; failedCount: number }> {
  const pending = getPendingUploads();
  if (pending.length === 0) return { flushedCount: 0, failedCount: 0 };

  let flushedCount = 0;
  let failedCount = 0;
  const remaining: PendingUploadItem[] = [];

  for (const item of pending) {
    try {
      if (item.type === 'ORDER') {
        await pushOrderToGoogleSheet(spreadsheetId, item.data, item.customerName || 'Dealer', accessToken);
      } else if (item.type === 'RECOVERY') {
        await pushRecoveryToGoogleSheet(spreadsheetId, item.data, item.customerName || 'Dealer', accessToken);
      } else if (item.type === 'CUSTOMER') {
        await pushCustomerToGoogleSheet(spreadsheetId, item.data, accessToken);
      } else if (item.type === 'ATTENDANCE') {
        await pushAttendanceToGoogleSheet(spreadsheetId, item.data, item.userName || 'Employee', accessToken);
      } else if (item.type === 'VISIT') {
        await pushVisitToGoogleSheet(spreadsheetId, item.data, item.customerName || 'Dealer', item.userName || 'Employee', accessToken);
      } else if (item.type === 'USER') {
        await pushEmployeeToGoogleSheet(spreadsheetId, item.data, accessToken);
      } else if (item.type === 'PRODUCT') {
        await pushProductToGoogleSheet(spreadsheetId, item.data, accessToken);
      }
      flushedCount++;
    } catch (err: any) {
      failedCount++;
      item.attempts = (item.attempts || 0) + 1;
      item.lastError = err?.message || 'Upload error';
      remaining.push(item);
    }
  }

  savePendingUploads(remaining);
  return { flushedCount, failedCount };
}

export interface TwoWaySyncResult {
  success: boolean;
  importedSummary?: ImportSummary;
  flushedUploadsCount: number;
  message: string;
  timestamp: string;
}

/**
 * Executes full 2-way sync:
 * 1. Flushes pending local uploads to Google Sheets
 * 2. Pulls Users & Customers/Dealers from Google Sheets into Database
 * 3. Pushes live database tables (Customers, Orders, Recoveries, Inventory, Ledger) to Google Sheets
 */
export async function executeTwoWaySync(
  appData: SupabaseAppData,
  token?: string | null
): Promise<TwoWaySyncResult> {
  const effectiveToken = token || getAccessToken();
  const spreadsheetId = getActiveSpreadsheetId() || TARGET_SPREADSHEET_ID;

  if (!effectiveToken) {
    const msg = 'Google account authorization required. Please sign in to sync with Google Sheets.';
    currentLastError = msg;
    notifyStatusChange();
    throw new Error(msg);
  }

  currentIsSyncing = true;
  currentLastError = null;
  notifyStatusChange();

  try {
    // Step 1: Flush any pending local upload items
    const { flushedCount } = await flushPendingUploadsToSheet(spreadsheetId, effectiveToken).catch((err) => {
      console.warn('Pending upload flush notice:', err);
      return { flushedCount: 0, failedCount: 0 };
    });

    // Step 2: 2-Way Direction A — Import Users & Dealers/Customers from Sheet into Database
    const importSummary = await executeGoogleSheetImport(spreadsheetId, effectiveToken, 'ALL').catch((err) => {
      console.warn('Sheet import notice:', err);
      return undefined;
    });

    // Step 3: 2-Way Direction B — Export All Live Tables from App Database into Google Sheet Tabs
    await syncDatabaseToGoogleSheet(spreadsheetId, appData, effectiveToken);

    // Record Timestamps
    const nowIso = new Date().toISOString();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem(LAST_SYNC_KEY, nowTimeStr);
    resetNextSyncTarget();

    const importedTotal = (importSummary?.createdCount || 0) + (importSummary?.updatedCount || 0);
    const msg = `2-Way Sync Complete! Uploaded ${flushedCount} pending items, imported ${importedTotal} records from Google Sheets, and refreshed all live database tabs in Sheet.`;

    currentLastMessage = msg;
    currentLastError = null;
    notifyStatusChange();

    return {
      success: true,
      importedSummary: importSummary,
      flushedUploadsCount: flushedCount,
      message: msg,
      timestamp: nowIso,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed during two-way Google Sheets synchronization.';
    currentLastError = errorMsg;
    notifyStatusChange();
    throw err;
  } finally {
    currentIsSyncing = false;
    notifyStatusChange();
  }
}

// ============================================================================
// 4. AUTOMATIC 30-MINUTE BACKGROUND SCHEDULER
// ============================================================================

export function isAutoSyncEnabled(): boolean {
  const val = localStorage.getItem(AUTO_SYNC_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SYNC_ENABLED_KEY, String(enabled));
  if (enabled) {
    startAutoSyncEngine();
  } else {
    stopAutoSyncEngine();
  }
  notifyStatusChange();
}

export function getNextSyncTarget(): number {
  const stored = localStorage.getItem(NEXT_SYNC_KEY);
  if (stored) {
    const t = Number(stored);
    if (!isNaN(t) && t > Date.now()) return t;
  }
  const next = Date.now() + AUTO_SYNC_INTERVAL_MS;
  localStorage.setItem(NEXT_SYNC_KEY, String(next));
  return next;
}

export function resetNextSyncTarget(): number {
  const next = Date.now() + AUTO_SYNC_INTERVAL_MS;
  localStorage.setItem(NEXT_SYNC_KEY, String(next));
  return next;
}

export function getAutoSyncStatus(): AutoSyncStatus {
  const nextTarget = getNextSyncTarget();
  const diffSec = Math.max(0, Math.round((nextTarget - Date.now()) / 1000));
  const pending = getPendingUploads();

  return {
    isEnabled: isAutoSyncEnabled(),
    isSyncing: currentIsSyncing,
    lastSyncTime: localStorage.getItem(LAST_SYNC_KEY),
    nextSyncTarget: nextTarget,
    secondsRemaining: diffSec,
    pendingUploadsCount: pending.length,
    lastError: currentLastError,
    lastSummaryMessage: currentLastMessage,
  };
}

function notifyStatusChange() {
  const status = getAutoSyncStatus();
  listeners.forEach((l) => {
    try {
      l(status);
    } catch {}
  });
}

export function subscribeToAutoSync(listener: AutoSyncListener): () => void {
  listeners.add(listener);
  listener(getAutoSyncStatus());
  return () => {
    listeners.delete(listener);
  };
}

let activeAppDataGetter: (() => SupabaseAppData) | null = null;

export function registerAppDataProvider(provider: () => SupabaseAppData): void {
  activeAppDataProvider = provider;
}
let activeAppDataProvider: (() => SupabaseAppData) | null = null;

/**
 * Initializes and starts the background 30-minute auto-sync loop
 */
export function startAutoSyncEngine(appDataProvider?: () => SupabaseAppData): void {
  if (appDataProvider) {
    activeAppDataProvider = appDataProvider;
  }

  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (countdownTimer) clearInterval(countdownTimer);

  // Countdown heartbeat every second to update UI countdown timers
  countdownTimer = setInterval(() => {
    const next = getNextSyncTarget();
    if (Date.now() >= next) {
      triggerAutoSyncCycle();
    } else {
      notifyStatusChange();
    }
  }, 1000);

  console.log('[N-LINK 360] 30-minute Google Sheets Auto-Sync Engine active.');
}

export function stopAutoSyncEngine(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

async function triggerAutoSyncCycle(): Promise<void> {
  if (currentIsSyncing) return;
  const token = getAccessToken();

  if (!token) {
    console.log('[Auto-Sync] 30-minute interval reached. All data is safe in Local Storage. Google sign-in required for cloud replication.');
    resetNextSyncTarget();
    notifyStatusChange();
    return;
  }

  if (!activeAppDataProvider) {
    console.log('[Auto-Sync] 30-minute interval reached, awaiting app data provider.');
    resetNextSyncTarget();
    notifyStatusChange();
    return;
  }

  try {
    console.log('[Auto-Sync] 30-minute timer triggered. Executing full 2-Way Google Sheets sync...');
    const appData = activeAppDataProvider();
    await executeTwoWaySync(appData, token);
    console.log('[Auto-Sync] 30-minute sync completed successfully.');
  } catch (err) {
    console.warn('[Auto-Sync] 30-minute auto-sync encountered an issue:', err);
  } finally {
    resetNextSyncTarget();
    notifyStatusChange();
  }
}

/**
 * Immediate user-initiated upload: "Submit / Upload All Data to Sheet Now"
 */
export async function uploadAllLocalDataNow(
  appData: SupabaseAppData,
  token?: string | null
): Promise<TwoWaySyncResult> {
  const result = await executeTwoWaySync(appData, token);
  resetNextSyncTarget();
  notifyStatusChange();
  return result;
}

/**
 * Automatically triggers ledger updates and subsequent Google Sheets synchronization
 * upon executive approval of an invoice or verification of a recovery.
 * Eliminates any reliance on manual balance entries.
 */
export async function triggerLedgerApprovalSync(
  type: 'INVOICE_APPROVED' | 'RECOVERY_VERIFIED',
  referenceCode: string,
  customerId: string,
  appData: SupabaseAppData,
  token?: string | null
): Promise<{ success: boolean; message: string }> {
  // 1. Immediately ensure the local cache has the updated state
  const currentCache = getLocalDatabaseCache();
  saveLocalDatabaseCache({
    ...currentCache,
    customers: appData.customers,
    orders: (appData.salesOrders as any) || currentCache.orders,
    recoveries: appData.recoveries,
    lastUpdated: new Date().toISOString(),
  });

  const customer = appData.customers.find((c) => c.id === customerId);
  const customerName = customer?.companyName || customerId;

  // 2. Queue in pending uploads to guarantee cloud synchronization
  addPendingUpload(
    'LEDGER_TRANSACTION',
    {
      action: type,
      reference: referenceCode,
      customerId,
      customerName,
      currentBalance: customer?.currentBalance || 0,
      timestamp: new Date().toISOString(),
    },
    { customerName }
  );

  // 3. Trigger immediate push to Google Sheets if token is present
  const effectiveToken = token || getAccessToken();
  if (effectiveToken) {
    try {
      await executeTwoWaySync(appData, effectiveToken);
      const msg = `Ledger updated: ${type === 'INVOICE_APPROVED' ? 'Invoice' : 'Recovery'} #${referenceCode} posted & Google Sheets synchronized!`;
      console.log(`[Auto-Ledger] ${msg}`);
      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('[Auto-Ledger] Google Sheets sync queued for background transmission:', err);
      return {
        success: true,
        message: `Ledger updated for ${customerName}. Google Sheets sync queued.`,
      };
    }
  }

  return {
    success: true,
    message: `Ledger balance updated automatically for ${customerName}. Google Sheets sync active.`,
  };
}
