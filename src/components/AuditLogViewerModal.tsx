/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Compliance & Audit Trail Viewer
 * Protected ledger of all security, financial, pricing, inventory & role adjustments.
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  X,
  History,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { AuditLog, User } from '../types';
import { exportAuditLogsToCsv } from '../services/exportEngine';

interface AuditLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs?: AuditLog[];
  currentUser: User;
}

export const AuditLogViewerModal: React.FC<AuditLogViewerModalProps> = ({
  isOpen,
  onClose,
  auditLogs = [],
  currentUser,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [searchUserOrRecord, setSearchUserOrRecord] = useState<string>('');
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLog | null>(null);

  const isAuthorized =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGEMENT' ||
    currentUser.role === 'ACCOUNTS';

  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;
      if (searchUserOrRecord) {
        const q = searchUserOrRecord.toLowerCase();
        const matchUser = (log.userEmail || log.userId || '').toLowerCase().includes(q);
        const matchRecord = (log.recordId || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        return matchUser || matchRecord || matchAction;
      }
      return true;
    });
  }, [auditLogs, selectedModule, searchUserOrRecord]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface-card px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white font-black shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Enterprise Compliance Audit Trail</h3>
                <span className="rounded-md bg-rose-400/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 border border-rose-400/30">
                  IMMUTABLE LOGS
                </span>
              </div>
              <p className="text-xs text-slate-400">Tamper-evident logs of financial, pricing, stock and permission mutations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAuditLogsToCsv(filteredLogs)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-deep-teal" />
              <span>Export CSV</span>
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Security check */}
        {!isAuthorized ? (
          <div className="flex flex-col items-center justify-center py-20 text-center p-6 space-y-3">
            <Lock className="h-12 w-12 text-rose-500" />
            <h4 className="text-base font-bold text-text-primary">Access Restricted</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Only Super Admins, Management, and Accounts users have permission to inspect compliance audit records.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-bg-secondary">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border-b border-slate-200">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user, record ID, action..."
                  value={searchUserOrRecord}
                  onChange={(e) => setSearchUserOrRecord(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-bg-secondary pl-8 pr-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Module:</span>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-bg-secondary px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="ALL">All Modules</option>
                  <option value="INVOICES">Invoices & Credit</option>
                  <option value="RECOVERY">Recovery & Cash</option>
                  <option value="INVENTORY">Inventory & Plant</option>
                  <option value="CUSTOMERS">Customers & Credit Limits</option>
                  <option value="RETURNS">Stock Returns & Damages</option>
                  <option value="USER_ROLES">User Roles & Security</option>
                  <option value="IMPORT">Bulk Data Imports</option>
                </select>
              </div>
            </div>

            {/* Table & Diff Inspector */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Timestamp</th>
                      <th className="px-3.5 py-2.5">User</th>
                      <th className="px-3.5 py-2.5">Module</th>
                      <th className="px-3.5 py-2.5">Action</th>
                      <th className="px-3.5 py-2.5">Record ID</th>
                      <th className="px-3.5 py-2.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No audit logs matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-bg-secondary/80">
                          <td className="px-3.5 py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2 font-bold text-text-primary whitespace-nowrap">
                            {log.userEmail || log.userId}
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {log.module}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 font-mono font-bold text-slate-800">
                            {log.action}
                          </td>
                          <td className="px-3.5 py-2 text-slate-600 font-mono text-[11px]">
                            {log.recordId}
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            {(log.beforeValue || log.afterValue) && (
                              <button
                                type="button"
                                onClick={() => setSelectedLogForDiff(log)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Inspect</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Diff Drawer / Modal */}
        {selectedLogForDiff && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-surface-card/60 p-4 backdrop-blur-2xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Audit State Mutation Inspector</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Record: {selectedLogForDiff.recordId} ({selectedLogForDiff.module})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLogForDiff(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-t border border-rose-200">
                    State Before Mutation
                  </div>
                  <pre className="p-3 bg-surface-card text-slate-100 rounded-b font-mono text-[10px] overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLogForDiff.beforeValue || 'None (Initial Creation)', null, 2)}
                  </pre>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-t border border-emerald-200">
                    State After Mutation
                  </div>
                  <pre className="p-3 bg-surface-card text-slate-100 rounded-b font-mono text-[10px] overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLogForDiff.afterValue || 'None (Deleted)', null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={() => setSelectedLogForDiff(null)}
                  className="rounded-xl bg-surface-card px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
