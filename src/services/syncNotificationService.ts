/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Persistent User-Scoped Synchronization Notification Service
 * Backed by IndexedDB + Backend API (/api/notifications) + Supabase (user_notifications)
 */

import { SubmissionLifecycleState, UserNotificationItem } from '../types';
import { idbDelete, idbGetAll, idbPut, idbReplaceAll, getSyncFallbackSnapshot } from '../lib/offlineIndexedDb';
import { safeApiFetch } from '../lib/safeFetch';
import { supabase, isSupabaseConfigured } from './supabase';

type NotificationListener = (items: UserNotificationItem[], unreadCount: number) => void;

const listeners = new Set<NotificationListener>();
let memoryCache: UserNotificationItem[] = [];
let activeUserEmail = '';

function normalizeEmail(email?: string | null): string {
  return String(email || '').trim().toLowerCase();
}

function sortNotifications(items: UserNotificationItem[]): UserNotificationItem[] {
  return [...items]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 250);
}

function getScopedItems(email?: string): UserNotificationItem[] {
  const target = normalizeEmail(email || activeUserEmail);
  const all = memoryCache.length > 0 ? memoryCache : getSyncFallbackSnapshot<UserNotificationItem>('sync_notifications');
  const scoped = target
    ? all.filter((n) => normalizeEmail(n.userEmail) === target || n.userEmail === '*')
    : all;
  return sortNotifications(scoped);
}

function notifySubscribers(): void {
  const scoped = getScopedItems();
  const unreadCount = scoped.filter((n) => !n.isRead).length;
  listeners.forEach((cb) => {
    try {
      cb(scoped, unreadCount);
    } catch {
      // Isolate listener error
    }
  });
}

export function setNotificationUserContext(userEmail?: string | null): void {
  activeUserEmail = normalizeEmail(userEmail);
  notifySubscribers();
}

export function getNotificationUserContext(): string {
  return activeUserEmail;
}

export async function hydrateNotificationsForUser(userEmail?: string | null): Promise<UserNotificationItem[]> {
  if (userEmail !== undefined) {
    activeUserEmail = normalizeEmail(userEmail);
  }
  const localItems = await idbGetAll<UserNotificationItem>('sync_notifications');
  const merged = new Map<string, UserNotificationItem>(localItems.map((i) => [i.id, i]));

  // Pull from Supabase user_notifications when available
  if (supabase && isSupabaseConfigured && activeUserEmail) {
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_email', activeUserEmail)
        .order('created_at', { ascending: false })
        .limit(100);
      if (Array.isArray(data)) {
        for (const row of data) {
          const item: UserNotificationItem = {
            id: row.id,
            userId: row.user_id || undefined,
            userEmail: normalizeEmail(row.user_email),
            dedupeKey: row.dedupe_key || undefined,
            category: row.category || 'SYNC',
            severity: row.severity || 'INFO',
            title: row.title,
            message: row.message,
            entityType: row.entity_type || undefined,
            entityId: row.entity_id || undefined,
            transactionId: row.transaction_id || undefined,
            syncStatus: row.sync_status || undefined,
            isRead: Boolean(row.is_read),
            readAt: row.read_at || undefined,
            createdAt: row.created_at,
          };
          merged.set(item.id, item);
        }
      }
    } catch {
      // Table may not be migrated yet in legacy environments
    }
  }

  // Pull from API Gateway if running
  if (typeof window !== 'undefined' && activeUserEmail) {
    try {
      const res = await safeApiFetch<{ success?: boolean; notifications?: UserNotificationItem[] }>('/api/notifications');
      if (res.ok && Array.isArray(res.data?.notifications)) {
        for (const item of res.data.notifications) {
          merged.set(item.id, item);
        }
      }
    } catch {
      // Static mode fallback
    }
  }

  memoryCache = sortNotifications(Array.from(merged.values()));
  await idbReplaceAll('sync_notifications', memoryCache);
  notifySubscribers();
  return getScopedItems();
}

export interface PublishNotificationInput {
  userId?: string;
  userEmail?: string;
  dedupeKey?: string;
  category?: UserNotificationItem['category'];
  severity?: UserNotificationItem['severity'];
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  transactionId?: string;
  syncStatus?: SubmissionLifecycleState | string;
}

export async function publishUserNotification(input: PublishNotificationInput): Promise<UserNotificationItem> {
  const targetEmail = normalizeEmail(input.userEmail || activeUserEmail) || 'system@nationallights.com';
  const nowIso = new Date().toISOString();

  if (memoryCache.length === 0) {
    memoryCache = await idbGetAll<UserNotificationItem>('sync_notifications');
  }

  let record: UserNotificationItem | undefined;
  if (input.dedupeKey) {
    record = memoryCache.find(
      (n) => normalizeEmail(n.userEmail) === targetEmail && n.dedupeKey === input.dedupeKey
    );
  }

  if (record) {
    record = {
      ...record,
      title: input.title,
      message: input.message,
      severity: input.severity || record.severity,
      category: input.category || record.category,
      syncStatus: input.syncStatus || record.syncStatus,
      isRead: false,
      readAt: undefined,
      createdAt: nowIso,
    };
    memoryCache = sortNotifications(memoryCache.map((n) => (n.id === record!.id ? record! : n)));
  } else {
    record = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: input.userId,
      userEmail: targetEmail,
      dedupeKey: input.dedupeKey,
      category: input.category || 'SYNC',
      severity: input.severity || 'INFO',
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      transactionId: input.transactionId,
      syncStatus: input.syncStatus,
      isRead: false,
      createdAt: nowIso,
    };
    memoryCache = sortNotifications([record, ...memoryCache]);
  }

  await idbPut('sync_notifications', record);
  notifySubscribers();

  // Persist in background to server gateway + Supabase if online
  if (typeof window !== 'undefined' && (typeof navigator === 'undefined' || navigator.onLine)) {
    void safeApiFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});

    if (supabase && isSupabaseConfigured) {
      void Promise.resolve(
        supabase.from('user_notifications').upsert(
          {
            user_email: targetEmail,
            dedupe_key: record.dedupeKey || null,
            category: record.category,
            severity: record.severity,
            title: record.title,
            message: record.message,
            entity_type: record.entityType || null,
            entity_id: record.entityId || null,
            transaction_id: record.transactionId || null,
            sync_status: record.syncStatus || null,
            is_read: false,
          },
          { onConflict: 'user_email,dedupe_key', ignoreDuplicates: false }
        )
      ).catch(() => {});
    }
  }

  return record;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  let updatedItem: UserNotificationItem | null = null;
  memoryCache = memoryCache.map((n) => {
    if (n.id === notificationId) {
      updatedItem = { ...n, isRead: true, readAt: nowIso };
      return updatedItem;
    }
    return n;
  });
  if (updatedItem) {
    await idbPut('sync_notifications', updatedItem);
  }
  notifySubscribers();

  if (typeof window !== 'undefined') {
    void safeApiFetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
    }).catch(() => {});
    if (supabase && isSupabaseConfigured) {
      void Promise.resolve(
        supabase.from('user_notifications').update({ is_read: true, read_at: nowIso }).eq('id', notificationId)
      ).catch(() => {});
    }
  }
}

export async function markAllNotificationsAsRead(userEmail?: string): Promise<void> {
  const target = normalizeEmail(userEmail || activeUserEmail);
  const nowIso = new Date().toISOString();
  memoryCache = memoryCache.map((n) => {
    if ((!target || normalizeEmail(n.userEmail) === target || n.userEmail === '*') && !n.isRead) {
      return { ...n, isRead: true, readAt: nowIso };
    }
    return n;
  });
  await idbReplaceAll('sync_notifications', memoryCache);
  notifySubscribers();

  if (typeof window !== 'undefined') {
    void safeApiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    if (supabase && isSupabaseConfigured && target) {
      void Promise.resolve(
        supabase
          .from('user_notifications')
          .update({ is_read: true, read_at: nowIso })
          .eq('user_email', target)
          .eq('is_read', false)
      ).catch(() => {});
    }
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  memoryCache = memoryCache.filter((n) => n.id !== notificationId);
  await idbDelete('sync_notifications', notificationId);
  notifySubscribers();
}

export function getNotificationsSnapshot(userEmail?: string): {
  items: UserNotificationItem[];
  unreadCount: number;
} {
  const items = getScopedItems(userEmail);
  return {
    items,
    unreadCount: items.filter((i) => !i.isRead).length,
  };
}

export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  const snap = getNotificationsSnapshot();
  listener(snap.items, snap.unreadCount);
  return () => {
    listeners.delete(listener);
  };
}

export function resetNotificationsForTests(): void {
  memoryCache = [];
  activeUserEmail = '';
  notifySubscribers();
}
