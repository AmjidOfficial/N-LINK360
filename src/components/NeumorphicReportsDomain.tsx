import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  CreditCard,
  Banknote,
  BookOpen,
  Warehouse,
  Store,
  Download,
  Filter,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  X,
  FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ReportSubTab } from './NeumorphicHeader';
import { User } from '../types';
import { isAdminUser, isFieldForceUser, getAssignedDealerIds } from '../services/production-users';

interface ReportsDomainProps {
  activeSubTab: ReportSubTab;
  setActiveSubTab: (tab: ReportSubTab) => void;
  currentUser: User;
  searchQuery: string;
}

export const NeumorphicReportsDomain: React.FC<ReportsDomainProps> = ({
  activeSubTab,
  setActiveSubTab,
  currentUser,
  searchQuery,
}) => {
  const isAdmin = isAdminUser(currentUser);
  const isField = isFieldForceUser(currentUser);
  const assignedDealers = getAssignedDealerIds(currentUser);

  // Sales Invoices State
  const [salesInvoices] = useState<any[]>([]);

  // Credit Aging State
  const [creditAging] = useState<any[]>([]);

  // Recovery Log State
  const [recoveryLog] = useState<any[]>([]);

  // Multi-Dealer Ledger Database
  const [dealerLedgers] = useState<{ [key: string]: { dealerName: string; code: string; location: string; creditLimit: number; openingBalance: number; entries: any[] } }>({});

  // Determine initial selected dealer for ledger
  const initialDealerId = isField && assignedDealers.length > 0 ? assignedDealers[0] : 'DLR-101';
  const [selectedLedgerDealerId, setSelectedLedgerDealerId] = useState<string>(initialDealerId);

  // Available ledger dealer keys based on user role
  const availableLedgerDealerIds = useMemo(() => {
    if (isAdmin || currentUser.role === 'ACCOUNTS') {
      return Object.keys(dealerLedgers);
    }
    return Object.keys(dealerLedgers).filter((id) => assignedDealers.includes(id));
  }, [dealerLedgers, isAdmin, currentUser, assignedDealers]);

  const activeLedgerData = dealerLedgers[selectedLedgerDealerId] || {
    dealerName: 'No Party Selected',
    code: 'DLR-000',
    location: 'N/A',
    creditLimit: 0,
    openingBalance: 0,
    entries: [],
  };

  // -------------------------------------------------------------
  // Data Filtering (Strict Scoping for Field Force)
  // -------------------------------------------------------------
  const visibleInvoices = useMemo(() => {
    let list = salesInvoices;
    if (isField && !isAdmin) {
      list = list.filter((inv) => assignedDealers.includes(inv.dealerId) || inv.officer.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase()));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inv) =>
        inv.invNo.toLowerCase().includes(q) ||
        inv.dealer.toLowerCase().includes(q) ||
        inv.town.toLowerCase().includes(q) ||
        inv.officer.toLowerCase().includes(q)
    );
  }, [salesInvoices, isField, isAdmin, assignedDealers, currentUser, searchQuery]);

  const visibleCreditAging = useMemo(() => {
    let list = creditAging;
    if (isField && !isAdmin) {
      list = list.filter((c) => assignedDealers.includes(c.dealerId));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.dealer.toLowerCase().includes(q) || c.town.toLowerCase().includes(q));
  }, [creditAging, isField, isAdmin, assignedDealers, searchQuery]);

  const visibleRecoveryLog = useMemo(() => {
    let list = recoveryLog;
    if (isField && !isAdmin) {
      list = list.filter((r) => assignedDealers.includes(r.dealerId) || r.officer.toLowerCase().includes(currentUser.fullName.split(' ')[0].toLowerCase()));
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.recId.toLowerCase().includes(q) ||
        r.dealer.toLowerCase().includes(q) ||
        r.instrumentNo.toLowerCase().includes(q) ||
        r.bank.toLowerCase().includes(q)
    );
  }, [recoveryLog, isField, isAdmin, assignedDealers, currentUser, searchQuery]);

  // Export to CSV Function
  const handleExportCSV = (reportName: string, data: any[]) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NationalLights_${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub Tab Navigation Ribbon */}
      <div className="nm-flat p-2 rounded-3xl border border-white">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'SALES', label: isField ? 'My Sales Register' : 'Sales Register & Invoices', icon: BarChart3 },
            { id: 'CREDIT', label: isField ? 'Assigned Credit Aging' : 'Credit & Debt Aging Matrix', icon: CreditCard },
            { id: 'RECOVERY', label: isField ? 'My Recovery Log' : 'Recovery & Cheque Clearing', icon: Banknote },
            { id: 'LEDGERS', label: 'Audited Party Ledgers', icon: BookOpen },
            { id: 'STOCKS_WAREHOUSE', label: 'Stock & Warehouse Valuation', icon: Warehouse },
            { id: 'DEALERS_DISTRIBUTOR', label: isField ? 'My Dealer Performance' : 'Dealer Performance Register', icon: Store },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as ReportSubTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive ? 'nm-btn-primary shadow-sm' : 'nm-btn text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SALES REGISTER */}
      {activeSubTab === 'SALES' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'My Field Sales Order Register' : 'National Sales Register & Dispatches'}
                </h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  isAdmin ? 'nm-badge-teal text-teal-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {isAdmin ? '👑 Global Register' : `Scoped: ${visibleInvoices.length} Invoices`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? `Invoices and delivery status for dealers assigned to ${currentUser.fullName}.`
                  : 'Complete commercial invoicing journal, discount provisions, and dispatch statuses.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Sales_Register', visibleInvoices)}
                className="nm-btn px-4 py-2.5 rounded-2xl text-xs font-bold text-teal-700 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="nm-btn p-2.5 rounded-2xl text-slate-700 hover:text-slate-900"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Commercial Dealer</th>
                    <th className="py-3.5 px-4">Market Town</th>
                    <th className="py-3.5 px-4">Sales Officer</th>
                    <th className="py-3.5 px-4 text-center">Total Bulbs</th>
                    <th className="py-3.5 px-4 text-right">Net Billed (PKR)</th>
                    <th className="py-3.5 px-4 text-center">Dispatch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {visibleInvoices.map((inv) => (
                    <tr key={inv.invNo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">{inv.invNo}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{inv.dealer}</td>
                      <td className="py-3 px-4">{inv.town}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{inv.officer}</td>
                      <td className="py-3 px-4 text-center font-mono">{inv.totalQty} pcs</td>
                      <td className="py-3 px-4 text-right font-black text-slate-800">PKR {inv.netAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${
                            inv.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'DISPATCHED'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT & AGING */}
      {activeSubTab === 'CREDIT' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'Assigned Accounts Debt Aging Matrix' : 'Commercial Debt Aging Matrix & Risk Evaluation'}
                </h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">Overdue Surveillance</span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? `Aging breakdown for accounts assigned to your beat.`
                  : 'Time-bucketed receivable aging analysis across 30, 60, and 90+ days intervals.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Credit_Aging', visibleCreditAging)}
                className="nm-btn px-4 py-2.5 rounded-2xl text-xs font-bold text-teal-700 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Dealer Name</th>
                    <th className="py-3.5 px-4">Town</th>
                    <th className="py-3.5 px-4 text-right">Total Outstanding</th>
                    <th className="py-3.5 px-4 text-right">Current (1-30d)</th>
                    <th className="py-3.5 px-4 text-right">31-60 Days</th>
                    <th className="py-3.5 px-4 text-right text-rose-700">90+ Days</th>
                    <th className="py-3.5 px-4 text-center">Risk Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {visibleCreditAging.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{c.dealer}</td>
                      <td className="py-3 px-4">{c.town}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-800">PKR {c.totalDue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-teal-700">PKR {c.current.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-amber-700">PKR {c.days30.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">PKR {c.days90Plus.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${
                            c.riskScore === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.riskScore === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECOVERY LOG */}
      {activeSubTab === 'RECOVERY' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {isField ? 'My Field Recovery Receipts' : 'Recovery Realization & Cheque Clearance Log'}
                </h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">Banking Reconciliation</span>
              </div>
              <p className="text-xs text-slate-500">
                {isField
                  ? `Recovery receipts and instruments logged by ${currentUser.fullName}.`
                  : 'Cheques, online transfers, cash receipts, and bank deposit statuses.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Recovery_Log', visibleRecoveryLog)}
                className="nm-btn px-4 py-2.5 rounded-2xl text-xs font-bold text-teal-700 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Receipt #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Dealer</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Instrument / Slip #</th>
                    <th className="py-3.5 px-4">Bank</th>
                    <th className="py-3.5 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3.5 px-4 text-center">Clearance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {visibleRecoveryLog.map((r) => (
                    <tr key={r.recId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.recId}</td>
                      <td className="py-3 px-4 text-slate-500">{r.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{r.dealer}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{r.mode}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">{r.instrumentNo}</td>
                      <td className="py-3 px-4 text-slate-600">{r.bank}</td>
                      <td className="py-3 px-4 text-right font-black text-indigo-700">PKR {r.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${
                            r.status === 'CLEARED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'DEPOSITED'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITED PARTY LEDGERS (INTERACTIVE & SCOPED) */}
      {activeSubTab === 'LEDGERS' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">Double-Entry Commercial Party Ledger</h2>
                <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">Audited Statements</span>
              </div>
              <p className="text-xs text-slate-500">
                Official statement of accounts with running balances, invoices, credit memos, and payment vouchers.
              </p>
            </div>

            {/* Dealer Selector Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Select Party:</label>
                <select
                  value={selectedLedgerDealerId}
                  onChange={(e) => setSelectedLedgerDealerId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl nm-inset text-xs font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {availableLedgerDealerIds.map((key) => {
                    const d = dealerLedgers[key];
                    return (
                      <option key={key} value={key}>
                        {d.dealerName} ({d.code})
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="nm-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Ledger</span>
              </button>
            </div>
          </div>

          {/* Ledger Party Summary Card */}
          <div className="nm-flat p-5 rounded-3xl border border-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {activeLedgerData.code}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">{activeLedgerData.dealerName}</h3>
                <p className="text-xs text-slate-500">{activeLedgerData.location}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="nm-inset p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block uppercase">Credit Limit</span>
                  <span className="text-slate-700 font-mono">PKR {activeLedgerData.creditLimit.toLocaleString()}</span>
                </div>
                <div className="nm-inset p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block uppercase">Closing Balance</span>
                  <span className="text-teal-700 font-mono font-black">
                    PKR {activeLedgerData.entries[activeLedgerData.entries.length - 1]?.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Voucher / Ref #</th>
                    <th className="py-3.5 px-4">Transaction Narrative</th>
                    <th className="py-3.5 px-4 text-right text-slate-700">Debit (PKR)</th>
                    <th className="py-3.5 px-4 text-right text-emerald-700">Credit (PKR)</th>
                    <th className="py-3.5 px-4 text-right font-black">Running Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {activeLedgerData.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">{entry.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">{entry.ref}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{entry.description}</td>
                      <td className="py-3 px-4 text-right text-slate-800">
                        {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                        {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-teal-800">
                        PKR {entry.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STOCK & WAREHOUSE */}
      {activeSubTab === 'STOCKS_WAREHOUSE' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Finished Goods Warehouse Inventory Valuation</h2>
              <p className="text-xs text-slate-500">
                Live batch tracking, carton quantities, unit valuation, and reserved order stocks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="nm-flat p-5 rounded-3xl border border-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Finished Goods</span>
              <div className="text-2xl font-black text-slate-800">21,350 Pcs</div>
              <p className="text-xs text-teal-700 font-semibold">4 Central & Regional Hubs</p>
            </div>
            <div className="nm-flat p-5 rounded-3xl border border-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Valuation at Trade Price</span>
              <div className="text-2xl font-black text-teal-700">PKR 45.82 Million</div>
              <p className="text-xs text-slate-500 font-medium">Standard Automotive Catalogue</p>
            </div>
            <div className="nm-flat p-5 rounded-3xl border border-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Stock Dispatch Reserve</span>
              <div className="text-2xl font-black text-indigo-700">1,800 Pcs</div>
              <p className="text-xs text-indigo-600 font-semibold">Allocated for Outbound Trucks</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DEALER PERFORMANCE */}
      {activeSubTab === 'DEALERS_DISTRIBUTOR' && (
        <div className="space-y-6">
          <div className="nm-flat p-6 rounded-3xl border border-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {isField ? 'My Assigned Dealer Performance & Ledgers' : 'Commercial Dealer Ranking & MTD Sales vs Recovery'}
              </h2>
              <p className="text-xs text-slate-500">
                Visual trend analysis, opening & net balances, SKU order entry, and real-time recovery logging.
              </p>
            </div>
          </div>

          {/* Recharts Visual Trend Bar Chart */}
          <div className="nm-flat p-6 rounded-3xl border border-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>Top 5 Dealers: MTD Sales vs Recovery (PKR)</span>
              </h3>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                Live Real-Time Analytics
              </span>
            </div>
            
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Lahore Auto Hub', sales: 4850000, recovery: 4200000 },
                    { name: 'Badami Bagh Spares', sales: 3920000, recovery: 3500000 },
                    { name: 'Karachi Shershah', sales: 5100000, recovery: 4800000 },
                    { name: 'Faisalabad Electric', sales: 2950000, recovery: 2700000 },
                    { name: 'Rawalpindi Saddar', sales: 3400000, recovery: 3100000 },
                  ]}
                  margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#E8ECF2',
                      borderColor: '#cbd5e1',
                      borderRadius: '16px',
                      color: '#1e293b',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="sales" name="MTD Invoiced Sales" fill="#0d9488" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="recovery" name="MTD Realized Recovery" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dealer Ranking Table & Ledger Quick View */}
          <div className="nm-flat rounded-3xl border border-white overflow-hidden">
            <div className="p-4 bg-slate-100/50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Assigned Dealer Ledgers & Balances</span>
              <span className="text-xs text-slate-500">Click any dealer to inspect net balance & add orders/recovery</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Dealer Name</th>
                    <th className="py-3.5 px-4">Town / Hub</th>
                    <th className="py-3.5 px-4 text-right">Opening Bal (PKR)</th>
                    <th className="py-3.5 px-4 text-right">Till Date Invoices</th>
                    <th className="py-3.5 px-4 text-right">Till Date Recovery</th>
                    <th className="py-3.5 px-4 text-right font-black">Net Balance (PKR)</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                  {[
                    { id: 'DLR-101', name: 'Lahore Auto Hub', town: 'Badami Bagh', opening: 1200000, invoices: 4850000, recovery: 4200000, target: 5000000 },
                    { id: 'DLR-102', name: 'Bilal Gunj Spares', town: 'Bilal Gunj', opening: 850000, invoices: 3920000, recovery: 3500000, target: 4000000 },
                    { id: 'DLR-103', name: 'Karachi Shershah Traders', town: 'Shershah', opening: 1500000, invoices: 5100000, recovery: 4800000, target: 5500000 },
                    { id: 'DLR-104', name: 'Rawalpindi Saddar Lighting', town: 'Saddar', opening: 950000, invoices: 3400000, recovery: 3100000, target: 3800000 },
                  ].map((d, idx) => {
                    const netBalance = d.opening + d.invoices - d.recovery;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <Store className="w-4 h-4 text-teal-600" />
                          <span>{d.name}</span>
                        </td>
                        <td className="py-3.5 px-4">{d.town}</td>
                        <td className="py-3.5 px-4 text-right font-mono">PKR {d.opening.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-teal-700 font-bold">PKR {d.invoices.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-indigo-700 font-bold">PKR {d.recovery.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-rose-700">PKR {netBalance.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => alert(`Opening Dealer Ledger for ${d.name}\nNet Balance: PKR ${netBalance.toLocaleString()}\nTarget Achievement: ${Math.round((d.invoices / d.target) * 100)}%`)}
                            className="nm-btn-primary px-3 py-1.5 rounded-xl text-[11px] font-bold"
                          >
                            Open Ledger ➔
                          </button>
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
    </div>
  );
};
