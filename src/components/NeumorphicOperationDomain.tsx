import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, CheckCircle2, XCircle, Users, Store, Package, MapPin, ShieldCheck } from 'lucide-react';
import { OperationSubTab } from './NeumorphicHeader';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loadSupabaseAppData, SupabaseAppData, emptyData } from '../services/supabase-data';
import { isAdminUser, isFieldForceUser } from '../services/production-users';
import { registerCustomerPending, approveCustomerRegistration, rejectCustomerRegistration, approveOrder, rejectOrder, verifyRecovery, rejectRecovery } from '../services/supabase-transactions';

interface OperationDomainProps { activeSubTab: OperationSubTab; setActiveSubTab: (tab: OperationSubTab) => void; currentUser: User; searchQuery: string; }
type MasterRow = Record<string, any>;
const tabs: Array<{ id: OperationSubTab; label: string }> = [
  { id: 'COMPANY', label: 'Company / Branches' }, { id: 'BRANDS_PRODUCTS', label: 'Products / SKUs' }, { id: 'DEALERS_DISTRIBUTORS', label: 'Dealers / Distributors' }, { id: 'TARGET', label: 'Targets' }, { id: 'SALES_TEAM', label: 'Employees / Sales Team' }, { id: 'HIERARCHY', label: 'Hierarchy' }, { id: 'APPROVALS', label: 'Approvals' },
];

export const NeumorphicOperationDomain: React.FC<OperationDomainProps> = ({ activeSubTab, setActiveSubTab, currentUser, searchQuery }) => {
  const [data, setData] = useState<SupabaseAppData>(emptyData);
  const [branches, setBranches] = useState<MasterRow[]>([]);
  const [products, setProducts] = useState<MasterRow[]>([]);
  const [employees, setEmployees] = useState<MasterRow[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, MasterRow[]>>({ regions: [], zones: [], areas: [], territories: [], towns: [], routes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ type: 'DEALER', name: '', owner: '', mobile: '', address: '', city: '', creditLimit: '', creditDays: '' });
  const admin = isAdminUser(currentUser);
  const field = isFieldForceUser(currentUser);

  const refresh = async () => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) throw new Error('Supabase production backend is not configured.');
    setLoading(true); setError('');
    try {
      const [app, br, pr, emp, reg, zon, ar, terr, town, route] = await Promise.all([
        loadSupabaseAppData(currentUser), client.from('branches').select('*').order('name'), client.from('products').select('*,brands(name)').order('name'), client.from('employees').select('id,employee_code,full_name,email,mobile,status,territory,role_id').order('full_name'),
        client.from('regions').select('*').order('name'), client.from('zones').select('*,regions(name)').order('name'), client.from('areas').select('*,zones(name)').order('name'), client.from('territories').select('*,areas(name)').order('name'), client.from('towns').select('*,territories(name)').order('name'), client.from('routes').select('*,towns(name)').order('name'),
      ]);
      const failed = [br, pr, emp, reg, zon, ar, terr, town, route].find(x => x.error);
      if (failed?.error) throw failed.error;
      setData(app); setBranches(br.data || []); setProducts(pr.data || []); setEmployees(emp.data || []); setHierarchy({ regions: reg.data || [], zones: zon.data || [], areas: ar.data || [], territories: terr.data || [], towns: town.data || [], routes: route.data || [] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load live operations data.'); } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [currentUser.id]);

  const q = searchQuery.trim().toLowerCase();
  const customers = useMemo(() => data.customers.filter(c => !q || `${c.customerCode} ${c.companyName} ${c.city} ${c.region}`.toLowerCase().includes(q)), [data.customers, q]);
  const pendingCustomers = data.customers.filter(c => !c.isActive);
  const pendingOrders = data.salesOrders.filter(o => ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(o.status));
  const pendingRecoveries = data.recoveries.filter(r => r.status === 'PENDING_VERIFICATION');

  const submitCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await registerCustomerPending({ customerType: customerForm.type, businessName: customerForm.name, ownerName: customerForm.owner, mobile: customerForm.mobile, address: customerForm.address, city: customerForm.city, proposedCreditLimit: Number(customerForm.creditLimit), proposedCreditDays: Number(customerForm.creditDays) }); setCustomerForm({ type: 'DEALER', name: '', owner: '', mobile: '', address: '', city: '', creditLimit: '', creditDays: '' }); setShowCustomerForm(false); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Customer registration failed.'); }
  };
  const approveCustomer = async (id: string, code: string) => { try { await approveCustomerRegistration(id, code, currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed.'); } };
  const rejectCustomer = async (id: string) => { const reason = window.prompt('Rejection reason'); if (!reason) return; try { await rejectCustomerRegistration(id, reason, currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Rejection failed.'); } };
  const approveSalesOrder = async (id: string) => { try { await approveOrder(id, 'Approved through N-LINK 360 Operations', currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Order approval failed.'); } };
  const rejectSalesOrder = async (id: string) => { const reason = window.prompt('Rejection reason'); if (!reason) return; try { await rejectOrder(id, reason, currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Order rejection failed.'); } };
  const verifyRec = async (id: string) => { try { await verifyRecovery(id, currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Recovery verification failed.'); } };
  const rejectRec = async (id: string) => { const reason = window.prompt('Rejection reason'); if (!reason) return; try { await rejectRecovery(id, reason, currentUser.email); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Recovery rejection failed.'); } };

  return <section className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-800">Live Operations</h2><p className="text-xs text-slate-500">Production master data and approval workflows. No demo records are loaded.</p></div><button onClick={() => void refresh()} className="nm-btn px-3 py-2 rounded-xl text-xs font-bold"><RefreshCw className="inline w-4 h-4 mr-1" />Refresh</button></div>
    <div className="flex flex-wrap gap-2">{tabs.map(t => <button key={t.id} onClick={() => setActiveSubTab(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold ${activeSubTab === t.id ? 'nm-inset text-teal-700' : 'nm-btn text-slate-600'}`}>{t.label}</button>)}</div>
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</div>}
    {loading ? <div className="nm-flat rounded-2xl p-10 text-center text-sm font-bold text-slate-500">Loading live production data…</div> : <>
      {activeSubTab === 'COMPANY' && <div className="grid gap-3 sm:grid-cols-2">{branches.map(b => <div key={b.id} className="nm-flat rounded-2xl p-4"><div className="font-black text-slate-800">{b.name}</div><div className="text-xs text-slate-500 mt-1">{b.code || ''} · {b.city || ''}</div><div className="text-xs mt-2">{b.address || ''}</div></div>)}{!branches.length && <Empty icon={<MapPin />} text="No branches are configured yet." />}</div>}
      {activeSubTab === 'BRANDS_PRODUCTS' && <div className="nm-flat rounded-2xl overflow-auto"><table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Product Code</th><th className="p-3 text-left">Product</th><th className="p-3">Brand</th><th className="p-3">Status</th></tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-t border-slate-200"><td className="p-3 font-bold">{p.product_code}</td><td className="p-3">{p.name}</td><td className="p-3 text-center">{p.brands?.name || ''}</td><td className="p-3 text-center">{p.status ? 'ACTIVE' : 'INACTIVE'}</td></tr>)}</tbody></table>{!products.length && <Empty icon={<Package />} text="No products are configured yet." />}</div>}
      {activeSubTab === 'DEALERS_DISTRIBUTORS' && <div className="space-y-3"><div className="flex justify-end"><button onClick={() => setShowCustomerForm(v => !v)} className="nm-btn-primary px-4 py-2 rounded-xl text-xs font-black"><Plus className="inline w-4 h-4 mr-1" />Add Dealer / Distributor</button></div>{showCustomerForm && <form onSubmit={submitCustomer} className="nm-flat rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><select value={customerForm.type} onChange={e => setCustomerForm({ ...customerForm, type: e.target.value })} className="nm-inset rounded-xl p-3 text-xs font-bold"><option value="DEALER">Dealer</option><option value="DISTRIBUTOR">Distributor</option></select>{[['name','Business Name'],['owner','Owner / Contact'],['mobile','Mobile'],['address','Address'],['city','Town / City'],['creditLimit','Credit Limit'],['creditDays','Credit Days']].map(([k,l]) => <input key={k} required={['name','mobile','city','creditLimit','creditDays'].includes(k)} value={(customerForm as any)[k]} onChange={e => setCustomerForm({ ...customerForm, [k]: e.target.value })} placeholder={l} type={k.includes('credit') ? 'number' : 'text'} className="nm-inset rounded-xl p-3 text-xs font-bold" />)}<button className="nm-btn-primary rounded-xl p-3 text-xs font-black">Submit for HO Approval</button></form>}<div className="nm-flat rounded-2xl overflow-auto"><table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Customer</th><th className="p-3">Type</th><th className="p-3">Town</th><th className="p-3 text-right">Balance</th><th className="p-3">Status</th></tr></thead><tbody>{customers.map(c => <tr key={c.id} className="border-t border-slate-200"><td className="p-3 font-bold">{c.customerCode}</td><td className="p-3">{c.companyName}</td><td className="p-3 text-center">{c.type}</td><td className="p-3 text-center">{c.city}</td><td className="p-3 text-right">{c.currentBalance.toLocaleString()}</td><td className="p-3 text-center">{c.isActive ? 'ACTIVE' : 'PENDING'}</td></tr>)}</tbody></table>{!customers.length && <Empty icon={<Store />} text="No Dealer / Distributor records exist yet." />}</div></div>}
      {activeSubTab === 'TARGET' && <Empty icon={<ShieldCheck />} text="Targets are database-controlled. Configure employee targets after the employee master is populated." />}
      {activeSubTab === 'SALES_TEAM' && <div className="nm-flat rounded-2xl overflow-auto"><table className="w-full text-xs"><thead><tr><th className="p-3 text-left">Employee Code</th><th className="p-3 text-left">Name</th><th className="p-3">Email</th><th className="p-3">Status</th></tr></thead><tbody>{employees.map(e => <tr key={e.id} className="border-t border-slate-200"><td className="p-3 font-bold">{e.employee_code}</td><td className="p-3">{e.full_name}</td><td className="p-3 text-center">{e.email || ''}</td><td className="p-3 text-center">{e.status ? 'ACTIVE' : 'INACTIVE'}</td></tr>)}</tbody></table>{!employees.length && <Empty icon={<Users />} text="No employees are configured yet." />}</div>}
      {activeSubTab === 'HIERARCHY' && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{(Object.entries(hierarchy) as Array<[string, MasterRow[]]>).map(([k,v]) => <div key={k} className="nm-flat rounded-2xl p-4"><div className="text-[10px] uppercase font-bold text-slate-500">{k}</div><div className="text-2xl font-black text-slate-800">{v.length}</div></div>)}</div>}
      {activeSubTab === 'APPROVALS' && <div className="space-y-5"><ApprovalSection title="Dealer / Distributor Registrations" count={pendingCustomers.length}>{pendingCustomers.map(c => <div key={c.id} className="nm-flat rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{c.companyName}</div><div className="text-xs text-slate-500">{c.customerCode} · {c.type} · {c.city}</div></div>{admin && <div className="flex gap-2"><button onClick={() => void approveCustomer(c.id, c.customerCode)} className="nm-btn-primary px-3 py-2 rounded-xl text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 mr-1" />Approve</button><button onClick={() => void rejectCustomer(c.id)} className="nm-btn px-3 py-2 rounded-xl text-xs font-bold text-rose-700"><XCircle className="inline w-4 h-4 mr-1" />Reject</button></div>}</div>)}</ApprovalSection><ApprovalSection title="Sales Orders" count={pendingOrders.length}>{pendingOrders.map(o => <div key={o.id} className="nm-flat rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{o.orderNumber} · {o.customerName}</div><div className="text-xs text-slate-500">{o.status} · PKR {o.totalAmount.toLocaleString()}</div></div>{admin && <div className="flex gap-2"><button onClick={() => void approveSalesOrder(o.id)} className="nm-btn-primary px-3 py-2 rounded-xl text-xs font-bold">Approve</button><button onClick={() => void rejectSalesOrder(o.id)} className="nm-btn px-3 py-2 rounded-xl text-xs font-bold text-rose-700">Reject</button></div>}</div>)}</ApprovalSection><ApprovalSection title="Recoveries" count={pendingRecoveries.length}>{pendingRecoveries.map(r => <div key={r.id} className="nm-flat rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{r.recoveryNumber} · {r.customerName}</div><div className="text-xs text-slate-500">PKR {r.amount.toLocaleString()} · {r.paymentMode}</div></div>{admin && <div className="flex gap-2"><button onClick={() => void verifyRec(r.id)} className="nm-btn-primary px-3 py-2 rounded-xl text-xs font-bold">Verify</button><button onClick={() => void rejectRec(r.id)} className="nm-btn px-3 py-2 rounded-xl text-xs font-bold text-rose-700">Reject</button></div>}</div>)}</ApprovalSection></div>}
    </>}
    {field && <div className="text-[10px] text-slate-400">Field-force visibility and customer portfolio are enforced by Supabase RLS and customer assignments.</div>}
  </section>;
};
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="nm-flat rounded-2xl p-8 text-center text-sm text-slate-500">{icon}<div className="mt-2 font-bold">{text}</div></div>; }
function ApprovalSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) { return <section><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-black text-slate-700">{title}</h3><span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">{count} pending</span></div>{count === 0 ? <div className="nm-flat rounded-2xl p-5 text-xs text-slate-500">No pending records.</div> : <div className="space-y-2">{children}</div>}</section>; }
