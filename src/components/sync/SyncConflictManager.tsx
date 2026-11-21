/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Conflict Quarantine & Authoritative Boundary Console
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { SyncConflictRecord, UserRole } from '../../types';
import {
  getConflictsSnapshot,
  hydrateSyncConflicts,
  isFinancialAuthorityEntity,
  resolveSyncConflict,
  subscribeSyncConflicts,
} from '../../services/syncConflictManager';
import { formatKarachiDateTime } from '../../utils/dateTime';

export interface SyncConflictManagerProps {
  actorEmail: string;
  actorRole: UserRole | string;
}

export const SyncConflictManager: React.FC<SyncConflictManagerProps> = ({
  actorEmail,
  actorRole,
}) => {
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>(() => getConflictsSnapshot());
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void hydrateSyncConflicts();
    return subscribeSyncConflicts((list) => setConflicts(list));
  }, []);

  const normalizedRole = String(actorRole || '').toUpperCase();
  const canResolveMaster = ['SUPER_ADMIN', 'MANAGEMENT', 'ACCOUNTS'].includes(normalizedRole);
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN';

  const filtered = useMemo(() => {
    if (statusFilter === 'OPEN') return conflicts.filter((c) => c.status === 'OPEN');
    if (statusFilter === 'RESOLVED') return conflicts.filter((c) => c.status !== 'OPEN');
    return conflicts;
  }, [conflicts, statusFilter]);

  const openCount = conflicts.filter((c) => c.status === 'OPEN').length;

  const handleResolve = async (
    conflict: SyncConflictRecord,
    resolution: 'RESOLVED_KEEP_DB' | 'RESOLVED_ACCEPT_SHEET' | 'DISMISSED'
  ) => {
    setBusyId(conflict.id);
    setNotice(null);
    try {
      await resolveSyncConflict(
        conflict.id,
        resolution,
        actorEmail,
        normalizedRole,
        resolution === 'RESOLVED_KEEP_DB'
          ? 'Database kept authoritative; Sheet mutation blocked.'
          : 'Explicit executive override authorized.'
      );
      setNotice({
        tone: 'success',
        text: `Conflict ${conflict.entityId} resolved cleanly (${resolution}).`,
      });
    } catch (err: any) {
      setNotice({
        tone: 'error',
        text: err?.message || 'Unable to resolve sync conflict.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 overflow-hidden text-xs">
      <div className="p-4 border-b border-[#E2E8F0] dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-bold text-sm text-[#0F172A] dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#F97316]" />
            <span>Quarantined Sync Conflicts ({openCount} Open)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Direct Google Sheet edits on Invoices, Recoveries, Ledger, Inventory, or dealer balances are quarantined automatically to preserve database authority.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(['OPEN', 'RESOLVED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[36px] px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-[#0F172A] dark:bg-[#16A34A] text-white'
                  : 'bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700'
              }`}
            >
              {st === 'OPEN' ? `Open (${openCount})` : st === 'RESOLVED' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          className={`mx-4 mt-4 p-3 rounded-xl border font-semibold ${
            notice.tone === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
          <div className="font-bold text-sm text-[#0F172A] dark:text-white">
            No {statusFilter === 'OPEN' ? 'open ' : ''}sync conflicts in quarantine
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Database balances and Google Sheet master records are clean and consistent.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E2E8F0] dark:divide-slate-700/80">
          {filtered.map((conflict) => {
            const financialLocked = isFinancialAuthorityEntity(conflict.entityType);
            const isOpen = conflict.status === 'OPEN';
            return (
              <div key={conflict.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`font-bold ${
                        conflict.severity === 'CRITICAL' || conflict.severity === 'HIGH'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {conflict.severity}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                      {conflict.entityType} / {conflict.entityId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Tab: {conflict.sheetTab}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {formatKarachiDateTime(conflict.detectedAt)}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                    {conflict.status}
                  </span>
                </div>

                <div className="font-semibold text-[#0F172A] dark:text-slate-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{conflict.reason}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase text-[#16A34A] dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <Database className="w-3.5 h-3.5" />
                      <span>Authoritative Database Snapshot</span>
                    </div>
                    <pre className="text-[11px] font-mono overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                      {conflict.dbSnapshot
                        ? JSON.stringify(conflict.dbSnapshot, null, 2)
                        : 'Database remains source of truth (direct Sheet write blocked).'}
                    </pre>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>External Google Sheet Snapshot</span>
                    </div>
                    <pre className="text-[11px] font-mono overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(conflict.sheetSnapshot, null, 2)}
                    </pre>
                  </div>
                </div>

                {isOpen && canResolveMaster ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === conflict.id}
                      onClick={() => void handleResolve(conflict, 'RESOLVED_KEEP_DB')}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold cursor-pointer disabled:opacity-60"
                    >
                      Keep Database Authoritative
                    </button>

                    {(!financialLocked || isSuperAdmin) ? (
                      <button
                        type="button"
                        disabled={busyId === conflict.id}
                        onClick={() => void handleResolve(conflict, 'RESOLVED_ACCEPT_SHEET')}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
                      >
                        Approve Sheet Override
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                        Financial override restricted to SUPER_ADMIN
                      </span>
                    )}
                  </div>
                ) : (
                  !isOpen && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Resolved by {conflict.resolvedBy || 'Admin'} at{' '}
                      {conflict.resolvedAt ? formatKarachiDateTime(conflict.resolvedAt) : '—'}
                      {conflict.resolutionNotes ? ` · ${conflict.resolutionNotes}` : ''}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
