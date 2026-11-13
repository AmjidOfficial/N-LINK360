import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, FileText } from 'lucide-react';
import { ReportSubTab } from './NeumorphicHeader';
import { User } from '../types';
import { loadSupabaseAppData, emptyData, SupabaseAppData } from '../services/supabase-data';
import { isAdminUser } from '../services/production-users';

interface ReportsDomainProps {
  activeSubTab: ReportSubTab;
  setActiveSubTab: (tab: ReportSubTab) => void;
  currentUser: User;
  searchQuery: string;
}

const tabs: Array<{ id: ReportSubTab; label: string }> = [
  { id: 'SALES', label: 'Sales' },
  { id: 'RECOVERY', label: 'Recovery' },
  { id: 'CREDIT', label: 'Credit' },
  { id: 'LEDGERS', label: 'Ledgers' },
  { id: 'STOCKS_WAREHOUSE', label: 'Stock / Warehouse' },
  { id: 'DEALERS_DISTRIBUTOR', label: 'Dealers / Distributors' },
];

function csv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export const NeumorphicReportsDomain: React.FC<ReportsDomainProps> = ({ activeSubTab, setActiveSubTab, currentUser, searchQuery }) => {
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const admin = isAdminUser(currentUser);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loadSupabaseAppData(currentUser));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [currentUser.id]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter(c => `${c.customerCode} ${c.companyName} ${c.city} ${c.region}`.toLowerCase().includes(q));
  }, [data.customers, searchQuery]);

  const exportRows = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    if (activeSubTab === 'SALES') {
      headers = ['Order','Customer','Date','Status','Amount'];
      rows = data.salesOrders.map(o => [o.orderNumber,o.customerName,o.orderDate,o.status,String(o.totalAmount)]);
    } else if (activeSubTab === 'RECOVERY') {
      headers = ['Recovery','Customer','Date','Status','Amount','Mode'];
      rows = data.recoveries.map(r => [r.recoveryNumber,r.customerName,r.collectionDate,r.status,String(r.amount),r.paymentMode]);
    } else if (activeSubTab === 'CREDIT' || activeSubTab === 'LEDGERS') {
      headers = ['Customer','Date','Type','Debit','Credit','Balance'];
      rows = data.ledgerEntries.map(l => [l.customerName,l.entryDate,l.transactionType,String(l.debitAmount),String(l.creditAmount),String(l.runningBalance)]);
    } else if (activeSubTab === 'STOCKS_WAREHOUSE') {
      headers = ['Warehouse','SKU','Name','On Hand','Reserved','Available'];
      rows = data.inventoryBalances.map(b => [b.warehouseName || '',b.skuCode || '',b.skuName || '',String(b.quantityOnHand),String(b.quantityReserved),String(b.availableQuantity)]);
    } else {
      headers = ['Code','Customer','Type','City','Region','Credit Limit','Balance','Status'];
      rows = filteredCustomers.map(c => [c.customerCode,c.companyName,c.type,c.city,c.region,String(c.creditLimit),String(c.currentBalance),c.isActive ? 'ACTIVE' : 'PENDING']);
    }
    const body = [headers, ...rows].map(row => row.map(csv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `N-LINK-360-${activeSubTab}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const salesValue = data.invoices.reduce((s, i) => s + i.totalAmount, 0);
  const recoveryValue = data.recoveries.filter(r => r.status === 'VERIFIED').reduce((s, r) => s + r.amount, 0);
  const outstanding = data.customers.reduce((s, c) => s + c.currentBalance, 0);

  return (
    <section className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black text-slate-800">Live Reports</h2><p className="text-xs text-slate-500">All figures below are loaded from the production database.</p></div>
        <div className="flex gap-2"><button onClick={() => void refresh()} className="nm-btn px-3 py-2 rounded-xl text-xs font-bold"><RefreshCw className="inline w-4 h-4 mr-1" />Refresh</button><button onClick={exportRows} disabled={loading} className="nm-btn-primary px-3 py-2 rounded-xl text-xs font-bold"><Download className="inline w-4 h-4 mr-1" />CSV</button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="nm-flat rounded-2xl p-4"><div className="text-[10px] uppercase font-bold text-slate-500">Customers</div><div className="text-2xl font-black text-slate-800">{data.customers.length}</div></div>
        <div className="nm-flat rounded-2xl p-4"><div className="text-[10px] uppercase font-bold text-slate-500">Sales</div><div className="text-2xl font-black text-slate-800">PKR {salesValue.toLocaleString()}</div></div>
        <div className="nm-flat rounded-2xl p-4"><div className="text-[10px] uppercase font-bold text-slate-500">Verified Recovery</div><div className="text-2xl font-black text-slate-800">PKR {recoveryValue.toLocaleString()}</div></div>
        <div className="nm-flat rounded-2xl p-4"><div className="text-[10px] uppercase font-bold text-slate-500">Outstanding</div><div className="text-2xl font-black text-slate-800">PKR {outstanding.toLocaleString()}</div></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => <button key={t.id} onClick={() => setActiveSubTab(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold ${activeSubTab === t.id ? 'nm-inset text-teal-700' : 'nm-btn text-slate-600'}`}>{t.label}</button>)}
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>}
      {loading ? <div className="nm-flat rounded-2xl p-8 text-center text-sm font-bold text-slate-500">Loading live report data…</div> : (
        <div className="nm-flat rounded-2xl overflow-auto">
          {activeSubTab === 'SALES' && <table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{data.salesOrders.map(o => <tr key={o.id} className="border-t border-slate-200"><td className="p-3 font-bold">{o.orderNumber}</td><td className="p-3">{o.customerName}</td><td className="p-3 text-center">{o.orderDate}</td><td className="p-3 text-center">{o.status}</td><td className="p-3 text-right">{o.totalAmount.toLocaleString()}</td></tr>)}</tbody></table>}
          {activeSubTab === 'RECOVERY' && <table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Recovery</th><th className="p-3 text-left">Customer</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{data.recoveries.map(r => <tr key={r.id} className="border-t border-slate-200"><td className="p-3 font-bold">{r.recoveryNumber}</td><td className="p-3">{r.customerName}</td><td className="p-3 text-center">{r.collectionDate}</td><td className="p-3 text-center">{r.status}</td><td className="p-3 text-right">{r.amount.toLocaleString()}</td></tr>)}</tbody></table>}
          {(activeSubTab === 'CREDIT' || activeSubTab === 'LEDGERS') && <table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Customer</th><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Balance</th></tr></thead><tbody>{data.ledgerEntries.map(l => <tr key={l.id} className="border-t border-slate-200"><td className="p-3">{l.customerName}</td><td className="p-3 text-center">{l.entryDate}</td><td className="p-3 text-center">{l.transactionType}</td><td className="p-3 text-right">{l.debitAmount.toLocaleString()}</td><td className="p-3 text-right">{l.creditAmount.toLocaleString()}</td><td className="p-3 text-right font-bold">{l.runningBalance.toLocaleString()}</td></tr>)}</tbody></table>}
          {activeSubTab === 'STOCKS_WAREHOUSE' && <table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Warehouse</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Name</th><th className="p-3 text-right">On Hand</th><th className="p-3 text-right">Available</th></tr></thead><tbody>{data.inventoryBalances.map(b => <tr key={b.id} className="border-t border-slate-200"><td className="p-3">{b.warehouseName}</td><td className="p-3 font-bold">{b.skuCode}</td><td className="p-3">{b.skuName}</td><td className="p-3 text-right">{b.quantityOnHand.toLocaleString()}</td><td className="p-3 text-right">{b.availableQuantity.toLocaleString()}</td></tr>)}</tbody></table>}
          {activeSubTab === 'DEALERS_DISTRIBUTOR' && <table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Customer</th><th className="p-3">Type</th><th className="p-3">City</th><th className="p-3 text-right">Limit</th><th className="p-3 text-right">Balance</th></tr></thead><tbody>{filteredCustomers.map(c => <tr key={c.id} className="border-t border-slate-200"><td className="p-3 font-bold">{c.customerCode}</td><td className="p-3">{c.companyName}</td><td className="p-3 text-center">{c.type}</td><td className="p-3 text-center">{c.city}</td><td className="p-3 text-right">{c.creditLimit.toLocaleString()}</td><td className="p-3 text-right">{c.currentBalance.toLocaleString()}</td></tr>)}</tbody></table>}
        </div>
      )}
      {!admin && <div className="text-[10px] text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" />Visibility is restricted by the authenticated employee portfolio and database RLS.</div>}
    </section>
  );
};
