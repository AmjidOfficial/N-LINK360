/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 10: Executive Reports, Analytics & Central Audit Log
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 */

import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  Download,
  Printer,
  Search,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { AuditLog, Customer, EmployeeAttendance, InventoryBalance, Recovery, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { getAuditLogs } from '../../services/auditLog';
import {
  exportAgingReportCsv,
  exportAttendanceCsv,
  exportAuditLogCsv,
  exportDispatchDeliveryCsv,
  exportRecoveryAuditCsv,
  exportSalesSummaryCsv,
  exportStockReportCsv,
} from '../../utils/reportExport';

interface ReportsAuditModuleProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  inventoryBalances: InventoryBalance[];
  attendanceRecords: EmployeeAttendance[];
}

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';
type ReportTab = 'SALES' | 'FINANCE' | 'OPERATIONS' | 'HR' | 'AUDIT_TRAIL';

export const ReportsAuditModule: React.FC<ReportsAuditModuleProps> = ({
  customers,
  orders,
  recoveries,
  inventoryBalances,
  attendanceRecords,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('SALES');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [townFilter, setTownFilter] = useState('ALL');
  const [officerFilter, setOfficerFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');

  const auditLogs: AuditLog[] = useMemo(() => getAuditLogs(), [orders, recoveries, customers, attendanceRecords, activeTab]);

  const townsList = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.town || c.city) set.add(c.town || c.city);
    });
    return Array.from(set).sort();
  }, [customers]);

  const officersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.salesUserName) set.add(o.salesUserName);
    });
    recoveries.forEach((r) => {
      if (r.salesUserName) set.add(r.salesUserName);
    });
    return Array.from(set).sort();
  }, [orders, recoveries]);

  const isDateInRange = (isoDate?: string): boolean => {
    if (datePreset === 'ALL') return true;
    const dStr = (isoDate || '').slice(0, 10);
    if (!dStr) return false;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (datePreset === 'TODAY') return dStr === todayStr;
    if (datePreset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return dStr === y.toISOString().slice(0, 10);
    }
    if (datePreset === 'THIS_WEEK') {
      const w = new Date(now);
      w.setDate(now.getDate() - 7);
      return dStr >= w.toISOString().slice(0, 10) && dStr <= todayStr;
    }
    if (datePreset === 'THIS_MONTH') {
      return dStr.slice(0, 7) === todayStr.slice(0, 7);
    }
    if (datePreset === 'CUSTOM') {
      return dStr >= customFrom && dStr <= customTo;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!isDateInRange(o.orderDate || o.createdAt)) return false;
      const oTown = o.customerTown || o.town || customers.find((c) => c.id === o.customerId)?.town || '';
      if (townFilter !== 'ALL' && oTown !== townFilter) return false;
      if (officerFilter !== 'ALL' && o.salesUserName !== officerFilter) return false;
      return true;
    });
  }, [orders, customers, datePreset, customFrom, customTo, townFilter, officerFilter]);

  const filteredRecoveries = useMemo(() => {
    return recoveries.filter((r) => {
      if (!isDateInRange(r.collectionDate || r.recordedAt || r.createdAt)) return false;
      const rTown = customers.find((c) => c.id === r.customerId || c.companyName === r.customerName)?.town || '';
      if (townFilter !== 'ALL' && rTown !== townFilter) return false;
      if (officerFilter !== 'ALL' && r.salesUserName !== officerFilter) return false;
      return true;
    });
  }, [recoveries, customers, datePreset, customFrom, customTo, townFilter, officerFilter]);

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((a) => {
      if (!isDateInRange(a.date)) return false;
      if (officerFilter !== 'ALL' && a.employeeName !== officerFilter) return false;
      return true;
    });
  }, [attendanceRecords, datePreset, customFrom, customTo, officerFilter]);

  const filteredAudits = useMemo(() => {
    const q = auditSearch.toLowerCase();
    return auditLogs.filter((l) => {
      if (!isDateInRange(l.timestamp || l.createdAt)) return false;
      if (auditModuleFilter !== 'ALL' && l.module !== auditModuleFilter) return false;
      if (!q) return true;
      return (
        (l.action || '').toLowerCase().includes(q) ||
        (l.userName || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.recordId || '').toLowerCase().includes(q)
      );
    });
  }, [auditLogs, datePreset, customFrom, customTo, auditModuleFilter, auditSearch]);

  const summary = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== 'REJECTED' && o.status !== 'CANCELLED');
    const totalSales = validOrders.reduce((s, o) => s + (o.netAmount ?? o.totalAmount ?? 0), 0);
    const invoicedCount = validOrders.filter((o) => Boolean(o.invoiceNumber) || o.status === 'INVOICED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED').length;
    const validRecs = filteredRecoveries.filter((r) => r.status !== 'REJECTED');
    const totalRecovery = validRecs.reduce((s, r) => s + (r.amount || 0), 0);
    const totalOutstanding = customers.reduce((s, c) => s + (c.currentBalance ?? c.openingBalance ?? 0), 0);
    return {
      orderCount: validOrders.length,
      invoicedCount,
      totalSales,
      totalRecovery,
      totalOutstanding,
    };
  }, [filteredOrders, filteredRecoveries, customers]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 10 &middot; Executive Reports, Analytics &amp; Audit
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Enterprise Reporting &amp; Compliance Audit Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filter operational, financial, warehouse, HR, and security audit records with formula-safe CSV export and print support.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>Print View</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 mr-1" />
          {(
            [
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(p.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                datePreset === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {datePreset === 'CUSTOM' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </>
          )}
          <select
            value={townFilter}
            onChange={(e) => setTownFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
          >
            <option value="ALL">All Towns</option>
            {townsList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={officerFilter}
            onChange={(e) => setOfficerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
          >
            <option value="ALL">All Sales Officers</option>
            {officersList.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Aggregate KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Filtered Sales Volume</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
            Rs. {summary.totalSales.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{summary.orderCount} orders &middot; {summary.invoicedCount} invoiced</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Filtered Recoveries</span>
          <span className="text-lg font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
            Rs. {summary.totalRecovery.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{filteredRecoveries.length} receipts</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Receivables</span>
          <span className="text-lg font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1 block">
            Rs. {summary.totalOutstanding.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{customers.length} active accounts</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Audit Events Logged</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
            {filteredAudits.length}
          </span>
          <span className="text-[10px] text-slate-400">Immutable security &amp; ledger trail</span>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
        {(
          [
            { id: 'SALES', label: 'Sales & Orders' },
            { id: 'FINANCE', label: 'Recovery & Aging' },
            { id: 'OPERATIONS', label: 'Stock & Dispatch' },
            { id: 'HR', label: 'HR Attendance' },
            { id: 'AUDIT_TRAIL', label: 'Central Audit Trail' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap cursor-pointer ${
              activeTab === t.id
                ? 'bg-[#0B132B] dark:bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SALES TAB */}
      {activeTab === 'SALES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-emerald-500" />
              <span>Sales Orders &amp; Invoiced Volume ({filteredOrders.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => exportSalesSummaryCsv(filteredOrders)}
              className="btn-primary py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Sales CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Order / Invoice</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Officer</th>
                  <th className="py-2.5 px-4 text-right">Net Amount</th>
                  <th className="py-2.5 px-4">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No orders in selected period/filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 50).map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        #{o.orderNumber} {o.invoiceNumber ? `· ${o.invoiceNumber}` : ''}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{(o.orderDate || o.createdAt).slice(0, 10)}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{o.customerName}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{o.salesUserName}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        Rs. {(o.netAmount ?? o.totalAmount ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{o.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'FINANCE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Recovery &amp; Collections Audit</div>
                <div className="text-[11px] text-slate-500">{filteredRecoveries.length} receipts matched</div>
              </div>
              <button
                type="button"
                onClick={() => exportRecoveryAuditCsv(filteredRecoveries)}
                className="btn-primary py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Recovery CSV</span>
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Dealer Outstanding Aging</div>
                <div className="text-[11px] text-slate-500">Total Receivable: Rs. {summary.totalOutstanding.toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={() => exportAgingReportCsv(customers)}
                className="btn-primary py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Aging CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Dealer</th>
                    <th className="py-2.5 px-4">Town</th>
                    <th className="py-2.5 px-4 text-right">Credit Limit</th>
                    <th className="py-2.5 px-4 text-right">Current Balance</th>
                    <th className="py-2.5 px-4 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.slice(0, 40).map((c) => {
                    const bal = c.currentBalance ?? c.openingBalance ?? 0;
                    const limit = c.creditLimit || 0;
                    const pct = limit > 0 ? Math.round((bal / limit) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{c.companyName}</td>
                        <td className="py-2.5 px-4 text-slate-500">{c.town || c.city}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">Rs. {limit.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">Rs. {bal.toLocaleString()}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${pct > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS TAB */}
      {activeTab === 'OPERATIONS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-slate-900 dark:text-white text-sm">Warehouse Stock Valuation &amp; Balances</div>
            <p className="text-slate-500">
              {inventoryBalances.length} tracked SKUs &middot;{' '}
              {inventoryBalances.reduce((s, b) => s + (b.quantityOnHand || 0), 0).toLocaleString()} total units on hand.
            </p>
            <button
              type="button"
              onClick={() => exportStockReportCsv(inventoryBalances)}
              className="btn-primary py-2.5 px-4 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Stock CSV</span>
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-slate-900 dark:text-white text-sm">Dispatch &amp; Delivery Logistics Register</div>
            <p className="text-slate-500">
              {filteredOrders.filter((o) => Boolean(o.dispatchNoteNumber)).length} dispatched consignments &middot;{' '}
              {filteredOrders.filter((o) => o.status === 'DELIVERED').length} POD confirmed.
            </p>
            <button
              type="button"
              onClick={() => exportDispatchDeliveryCsv(filteredOrders)}
              className="btn-primary py-2.5 px-4 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Dispatch &amp; POD CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* HR ATTENDANCE TAB */}
      {activeTab === 'HR' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">HR Field &amp; Office Attendance ({filteredAttendance.length})</h3>
            <button
              type="button"
              onClick={() => exportAttendanceCsv(filteredAttendance)}
              className="btn-primary py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Attendance CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Check-In</th>
                  <th className="py-2.5 px-4">Check-Out</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No attendance logs matched filters.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{a.employeeName}</td>
                      <td className="py-2.5 px-4 font-mono">{a.date}</td>
                      <td className="py-2.5 px-4 text-slate-500">{a.checkInLocation || '-'}</td>
                      <td className="py-2.5 px-4 font-mono">{a.checkInTime || '-'}</td>
                      <td className="py-2.5 px-4 font-mono">{a.checkOutTime || '-'}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{a.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CENTRAL AUDIT TRAIL TAB */}
      {activeTab === 'AUDIT_TRAIL' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
              >
                {['ALL', 'AUTH', 'EMPLOYEES', 'SALES', 'ACCOUNTS', 'INVENTORY', 'PACKING', 'INVOICING', 'DISPATCH', 'HR'].map((m) => (
                  <option key={m} value={m}>
                    {m === 'ALL' ? 'All Modules' : m}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => exportAuditLogCsv(filteredAudits)}
              className="btn-primary py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No audit log entries match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.slice(0, 100).map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {(log.timestamp || log.createdAt).slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{log.module}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{log.action}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{log.userName || log.userEmail || 'System'}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
