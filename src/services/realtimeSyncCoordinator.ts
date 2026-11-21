/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Centralized Supabase Realtime Sync Coordinator
 *
 * Subscribes once per authenticated session across authoritative operational tables
 * (sales_orders, recoveries, customers, invoices, inventory_balances, customer_visits,
 *  field_attendance, sync_outbox, sync_conflicts, user_notifications),
 * deduplicates events, tracks connection state cleanly, and triggers live UI delta updates
 * and reconnect catch-up without full page reloads.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { publishUserNotification } from './syncNotificationService';

export type RealtimeConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'DEGRADED' | 'LOCAL_ONLY';

export interface RealtimeDomainEvent {
  id: string;
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  newRecord: Record<string, unknown> | null;
  oldRecord: Record<string, unknown> | null;
  timestamp: string;
}

export interface RealtimeCoordinatorStatus {
  connectionState: RealtimeConnectionStatus;
  activeChannelCount: number;
  lastEventAt: string | null;
  lastReconnectAt: string | null;
  eventsReceived: number;
}

const WATCHED_TABLES = [
  'sales_orders',
  'recoveries',
  'customers',
  'invoices',
  'inventory_balances',
  'customer_visits',
  'field_attendance',
  'sync_outbox',
  'sync_conflicts',
  'user_notifications',
] as const;

class RealtimeSyncCoordinator {
  private channel: RealtimeChannel | null = null;
  private status: RealtimeCoordinatorStatus = {
    connectionState: 'LOCAL_ONLY',
    activeChannelCount: 0,
    lastEventAt: null,
    lastReconnectAt: null,
    eventsReceived: 0,
  };
  private statusListeners = new Set<(status: RealtimeCoordinatorStatus) => void>();
  private eventListeners = new Set<(event: RealtimeDomainEvent) => void>();
  private reconnectCatchupCallbacks = new Set<() => void | Promise<void>>();
  private seenEventKeys = new Map<string, number>();
  private reconnectAttemptCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeUserEmail = '';

  public getStatus(): RealtimeCoordinatorStatus {
    return { ...this.status };
  }

  public subscribeStatus(listener: (status: RealtimeCoordinatorStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public subscribeEvents(listener: (event: RealtimeDomainEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  public onReconnectCatchup(callback: () => void | Promise<void>): () => void {
    this.reconnectCatchupCallbacks.add(callback);
    return () => {
      this.reconnectCatchupCallbacks.delete(callback);
    };
  }

  private emitStatus(patch: Partial<RealtimeCoordinatorStatus>): void {
    this.status = { ...this.status, ...patch };
    const snap = this.getStatus();
    this.statusListeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {
        // Isolate subscriber failures
      }
    });
  }

  private cleanupSeenEvents(): void {
    if (this.seenEventKeys.size <= 500) return;
    const cutoff = Date.now() - 120_000;
    for (const [k, ts] of this.seenEventKeys.entries()) {
      if (ts < cutoff) this.seenEventKeys.delete(k);
    }
  }

  public handleIncomingChange(rawPayload: {
    table: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
    commit_timestamp?: string;
  }): RealtimeDomainEvent | null {
    const recordId = String(
      rawPayload.new?.id ||
      rawPayload.old?.id ||
      rawPayload.new?.order_number ||
      rawPayload.new?.recovery_number ||
      ''
    ).trim();
    const ts = rawPayload.commit_timestamp || new Date().toISOString();
    const dedupeKey = `${rawPayload.table}:${rawPayload.eventType}:${recordId}:${rawPayload.new?.updated_at || ts}`;

    if (this.seenEventKeys.has(dedupeKey)) {
      return null;
    }
    this.seenEventKeys.set(dedupeKey, Date.now());
    this.cleanupSeenEvents();

    const domainEvent: RealtimeDomainEvent = {
      id: dedupeKey,
      table: rawPayload.table,
      eventType: rawPayload.eventType,
      recordId: recordId || `rt-${Date.now()}`,
      newRecord: rawPayload.new ?? null,
      oldRecord: rawPayload.old ?? null,
      timestamp: ts,
    };

    this.emitStatus({
      lastEventAt: ts,
      eventsReceived: this.status.eventsReceived + 1,
    });

    this.eventListeners.forEach((cb) => {
      try {
        cb(domainEvent);
      } catch {
        // Isolate UI handler failures
      }
    });

    // Notify on high-value real-time approvals or conflicts
    if (rawPayload.table === 'sync_conflicts' && rawPayload.eventType === 'INSERT') {
      void publishUserNotification({
        userEmail: this.activeUserEmail || '*',
        dedupeKey: `rt-conflict:${domainEvent.recordId}`,
        category: 'CONFLICT',
        severity: 'WARNING',
        title: 'Live Conflict Alert',
        message: String(rawPayload.new?.reason || 'External Google Sheet edit quarantined for Admin review.'),
        entityType: String(rawPayload.new?.entity_type || 'CONFLICT'),
        entityId: domainEvent.recordId,
      });
    }

    return domainEvent;
  }

  public start(userEmail?: string | null): void {
    this.activeUserEmail = String(userEmail || '').trim().toLowerCase();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.emitStatus({ connectionState: 'OFFLINE', activeChannelCount: 0 });
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      this.emitStatus({ connectionState: 'LOCAL_ONLY', activeChannelCount: 0 });
      return;
    }

    this.stop();
    this.emitStatus({ connectionState: 'RECONNECTING' });

    const channel = supabase.channel(`nlink360-live-sync-${this.activeUserEmail || 'session'}`);
    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: any) => {
          this.handleIncomingChange({
            table,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            commit_timestamp: payload.commit_timestamp,
          });
        }
      );
    }

    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        const wasReconnecting = this.reconnectAttemptCount > 0;
        this.reconnectAttemptCount = 0;
        this.emitStatus({
          connectionState: 'CONNECTED',
          activeChannelCount: 1,
          lastReconnectAt: wasReconnecting ? new Date().toISOString() : this.status.lastReconnectAt,
        });
        if (wasReconnecting) {
          this.reconnectCatchupCallbacks.forEach((cb) => {
            void Promise.resolve(cb()).catch(() => {});
          });
        }
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
        this.emitStatus({ connectionState: 'DEGRADED', activeChannelCount: 0 });
        this.scheduleReconnect();
      } else if (state === 'CLOSED') {
        this.emitStatus({
          connectionState: typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'RECONNECTING',
          activeChannelCount: 0,
        });
      }
    });

    this.channel = channel;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.emitStatus({ connectionState: 'OFFLINE' });
      return;
    }
    this.reconnectAttemptCount += 1;
    const delayMs = Math.min(30_000, Math.pow(2, this.reconnectAttemptCount) * 1000);
    this.reconnectTimer = setTimeout(() => {
      this.start(this.activeUserEmail);
    }, delayMs);
  }

  public stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel && supabase) {
      try {
        void supabase.removeChannel(this.channel);
      } catch {
        // Ignore cleanup errors
      }
      this.channel = null;
    }
    this.emitStatus({ activeChannelCount: 0 });
  }

  public resetForTests(): void {
    this.stop();
    this.seenEventKeys.clear();
    this.reconnectAttemptCount = 0;
    this.status = {
      connectionState: 'LOCAL_ONLY',
      activeChannelCount: 0,
      lastEventAt: null,
      lastReconnectAt: null,
      eventsReceived: 0,
    };
  }
}

export const realtimeSyncCoordinator = new RealtimeSyncCoordinator();
