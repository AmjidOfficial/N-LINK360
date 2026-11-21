/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Durable IndexedDB Sync Storage Layer
 * Zero-dependency wrapper with seamless fallback to localStorage / in-memory map in SSR or Node tests.
 */

export type IndexedDbStoreName =
  | 'offline_queue'
  | 'sync_outbox'
  | 'sync_notifications'
  | 'sync_conflicts'
  | 'sync_meta';

const DB_NAME = 'nlink360_sync_db';
const DB_VERSION = 1;
const STORE_NAMES: IndexedDbStoreName[] = [
  'offline_queue',
  'sync_outbox',
  'sync_notifications',
  'sync_conflicts',
  'sync_meta',
];

const FALLBACK_PREFIX = 'nlink360_idb_fallback_';
const memoryFallback = new Map<string, string>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let migrationCompleted = false;

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function readFallbackRaw(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // Ignore storage access errors
  }
  return memoryFallback.get(key) ?? null;
}

function writeFallbackRaw(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore quota errors cleanly
  }
}

function removeFallbackRaw(key: string): void {
  memoryFallback.delete(key);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore
  }
}

async function openSyncDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return null;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of STORE_NAMES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function getFallbackMap<T extends { id: string }>(storeName: IndexedDbStoreName): T[] {
  const raw = readFallbackRaw(`${FALLBACK_PREFIX}${storeName}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFallbackList<T extends { id: string }>(storeName: IndexedDbStoreName, items: T[]): void {
  writeFallbackRaw(`${FALLBACK_PREFIX}${storeName}`, JSON.stringify(items));
}

export async function idbGetAll<T extends { id: string }>(storeName: IndexedDbStoreName): Promise<T[]> {
  const db = await openSyncDatabase();
  if (!db) {
    return getFallbackMap<T>(storeName);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const result = Array.isArray(req.result) ? (req.result as T[]) : [];
        if (result.length > 0) {
          saveFallbackList(storeName, result);
          resolve(result);
          return;
        }
        resolve(getFallbackMap<T>(storeName));
      };
      req.onerror = () => resolve(getFallbackMap<T>(storeName));
    } catch {
      resolve(getFallbackMap<T>(storeName));
    }
  });
}

export async function idbPut<T extends { id: string }>(storeName: IndexedDbStoreName, record: T): Promise<void> {
  const existing = getFallbackMap<T>(storeName);
  const idx = existing.findIndex((item) => item.id === record.id);
  if (idx >= 0) existing[idx] = record;
  else existing.unshift(record);
  saveFallbackList(storeName, existing);

  const db = await openSyncDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbPutMany<T extends { id: string }>(storeName: IndexedDbStoreName, records: T[]): Promise<void> {
  if (!records.length) return;
  const existing = getFallbackMap<T>(storeName);
  const map = new Map<string, T>(existing.map((r) => [r.id, r]));
  for (const r of records) {
    map.set(r.id, r);
  }
  saveFallbackList(storeName, Array.from(map.values()));

  const db = await openSyncDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const r of records) {
        store.put(r);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbDelete(storeName: IndexedDbStoreName, id: string): Promise<void> {
  const existing = getFallbackMap<{ id: string }>(storeName).filter((item) => item.id !== id);
  saveFallbackList(storeName, existing);

  const db = await openSyncDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbReplaceAll<T extends { id: string }>(
  storeName: IndexedDbStoreName,
  records: T[]
): Promise<void> {
  saveFallbackList(storeName, records);

  const db = await openSyncDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const r of records) {
        store.put(r);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbClear(storeName: IndexedDbStoreName): Promise<void> {
  removeFallbackRaw(`${FALLBACK_PREFIX}${storeName}`);
  const db = await openSyncDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getSyncFallbackSnapshot<T extends { id: string }>(storeName: IndexedDbStoreName): T[] {
  return getFallbackMap<T>(storeName);
}

/**
 * One-time safe migration from legacy localStorage queues into IndexedDB.
 */
export async function migrateLegacySyncQueuesToIndexedDb(): Promise<void> {
  if (migrationCompleted) return;
  migrationCompleted = true;

  try {
    if (typeof localStorage === 'undefined') return;

    const legacyOfflineRaw = localStorage.getItem('nlink360_offline_sync_queue');
    if (legacyOfflineRaw) {
      const parsed = JSON.parse(legacyOfflineRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await idbPutMany('offline_queue', parsed);
      }
    }

    const legacySheetRaw = localStorage.getItem('nlink_pending_google_uploads_v4');
    if (legacySheetRaw) {
      const parsed = JSON.parse(legacySheetRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedOutbox = parsed.map((item: any) => ({
          id: item.id || `OBX-MIG-${Date.now()}`,
          idempotencyKey: item.data?.idempotencyKey || item.id,
          transactionId: item.data?.transactionId || item.data?.orderNumber || item.data?.recoveryNumber || item.id,
          direction: 'OUTBOUND',
          entityType: item.type || 'ORDER',
          entityId: item.data?.id || item.id,
          sheetTab: item.type === 'RECOVERY' ? 'Recoveries' : item.type === 'CUSTOMER' ? 'Customers' : 'Sales_Orders',
          operation: 'UPSERT',
          payload: item.data || {},
          status: item.lastError ? 'FAILED' : 'PENDING',
          retryCount: Number(item.attempts || 0),
          maxRetries: 6,
          nextRetryAt: new Date().toISOString(),
          lastError: item.lastError,
          createdAt: item.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        await idbPutMany('sync_outbox', mappedOutbox);
      }
    }
  } catch {
    // Non-fatal migration error
  }
}

export function resetIndexedDbFallbackForTests(): void {
  for (const storeName of STORE_NAMES) {
    removeFallbackRaw(`${FALLBACK_PREFIX}${storeName}`);
  }
  migrationCompleted = false;
}
