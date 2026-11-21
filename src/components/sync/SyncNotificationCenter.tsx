/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Persistent Per-User Notification Center
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  CloudOff,
  Info,
  X,
} from 'lucide-react';
import { UserNotificationItem } from '../../types';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeNotifications,
} from '../../services/syncNotificationService';
import { formatKarachiDateTime } from '../../utils/dateTime';

export interface SyncNotificationCenterProps {
  userEmail?: string;
  className?: string;
}

export const SyncNotificationCenter: React.FC<SyncNotificationCenterProps> = ({
  userEmail,
  className = '',
}) => {
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ALERTS'>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeNotifications((list, unread) => {
      setItems(list);
      setUnreadCount(unread);
    });
    return unsub;
  }, [userEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (filter === 'UNREAD') return items.filter((i) => !i.isRead);
    if (filter === 'ALERTS') {
      return items.filter(
        (i) => i.severity === 'WARNING' || i.severity === 'ERROR' || i.category === 'CONFLICT'
      );
    }
    return items;
  }, [items, filter]);

  const renderSeverityIcon = (item: UserNotificationItem) => {
    if (item.category === 'OFFLINE') return <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    if (item.severity === 'SUCCESS') return <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 shrink-0" />;
    if (item.severity === 'WARNING' || item.severity === 'ERROR') {
      return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    return <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className="relative min-w-[44px] min-h-[40px] px-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[#F97316] text-white font-mono tabular-nums text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 max-h-[75vh] flex flex-col bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs text-[#0F172A] dark:text-slate-100">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
            <div>
              <div className="font-bold text-sm">Activity &amp; Sync Alerts</div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {unreadCount} unread · {items.length} total
              </div>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsAsRead(userEmail)}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#16A34A] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="min-w-[36px] min-h-[36px] rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Filter */}
          <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center gap-1.5 shrink-0">
            {(['ALL', 'UNREAD', 'ALERTS'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  filter === tab
                    ? 'bg-[#0F172A] dark:bg-[#16A34A] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'UNREAD' ? `Unread (${unreadCount})` : 'Alerts'}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-slate-700/80 flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No synchronization or workflow alerts in this filter.
              </div>
            ) : (
              filteredItems.slice(0, 60).map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors ${
                    item.isRead
                      ? 'bg-white dark:bg-[#1E293B]'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{renderSeverityIcon(item)}</div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[#0F172A] dark:text-white leading-snug">
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => void markNotificationAsRead(item.id)}
                            aria-label="Mark notification read"
                            title="Mark read"
                            className="min-w-[28px] min-h-[28px] rounded-md text-[#16A34A] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 inline-flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                        {item.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono tabular-nums text-slate-400">
                        <span>{formatKarachiDateTime(item.createdAt)}</span>
                        {item.transactionId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.transactionId}</span>
                          </>
                        )}
                        {item.syncStatus && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.syncStatus}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
