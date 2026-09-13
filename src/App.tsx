import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { getCurrentUser, sendLoginCode, signOut, verifyLoginCode } from './services/auth';

type Row = Record<string, any>;
type Tab = 'dashboard' | 'orders' | 'approvals' | 'invoices' | 'ledger' | 'recovery' | 'customers' | 'products';
const money = (v: any) => `PKR ${Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const dt = (v: any) => v ? new Date(v).toLocaleString('en-GB') : '-';
const active = (v: any) => v === true || v === 'true' || v === 'ACTIVE' || v === 'active';

function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send() {
    if (!email.trim()) return;
    setBusy(true); setError('');
    try { await sendLoginCode(email.trim()); setSent(true); }
    catch (e: any) { setError(e?.message || 'Unable to send verification code.'); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError('');
    try { await verifyLoginCode(email.trim(), code.trim()); location.reload(); }
    catch (e: any) { setError(e?.message || 'Invalid or expired verification code.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand-mark">NL</div><h1>N-LINK 360</h1>
    <p>Dealer & Distributor Sales Operations</p>
    <label>Registered corporate email</label>
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" disabled={sent} />
    {sent && <><label>Verification code</label><input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code" /></>}
    {error && <div className="error">{error}</div>}
    <button disabled={busy || !email || (sent && !code)} onClick={sent ? verify : send}>{busy ? 'Please wait…' : sent ? 'Verify & sign in' : 'Send verification code'}</button>
    {sent && <button className="secondary" onClick={() => { setSent(false); setCode(''); }}>Change email</button>}
  </section></main>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="loading">Connecting to N-LINK 360…</div>;
  return user ? <Workspace user={user} onSignOut={async () => { await signOut(); location.reload(); }} /> : <Login />;
}

function Workspace({ user, onSignOut }: { user: any; onSignOut: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<Record<string, Row[]>>({ customers: [], products: [], skus: [], orders: [], orderItems: [], invoices: [], recoveries: [], ledger: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    setLoading(true); setError('');
    try {
      const q = async (table: string, limit = 500) => {
        const r = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(limit);
        if (r.error) throw r.error;
        return r.data || [];
      };
      const [customers, products, skus, orders, orderItems, invoices, recoveries, ledger] = await Promise.all([
        q('customers'), q('products'), q('skus'), q('sales_orders'), q('sales_order_items'), q('invoices'), q('recoveries'), q('ledger_entries')
      ]);
      setData({ customers, products, skus, orders, orderItems, invoices, recoveries, ledger });
    } catch (e: any) { setError(e?.message || 'Production database read failed.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const channel = supabase?.channel('nlink-live').on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'recoveries' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => void load()).subscribe();
    return () => { window.clearInterval(timer); if (channel) void supabase?.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const sales = data.invoices.filter(x => x.status === 'POSTED').reduce((s, x) => s + Number(x.invoice_amount || 0), 0);
    const recovery = data.recoveries.filter(x => x.status === 'VERIFIED').reduce((s, x) => s + Number(x.amount || 0), 0);
    const outstanding = data.customers.reduce((s, c) => {
      const last = data.ledger.filter(l => l.customer_id === c.id).sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)))[0];
      return s + Number(last?.running_balance ?? c.opening_balance ?? 0);
    }, 0);
    return { sales, recovery, outstanding, customers: data.customers.filter(x => active(x.status)).length, pendingOrders: data.orders.filter(x => ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(x.status)).length, pendingRecovery: data.recoveries.filter(x => x.status === 'PENDING_VERIFICATION').length };
  }, [data]);

  const nav: [Tab, string][] = [['dashboard', 'Command Center'], ['orders', 'Sales Orders'], ['approvals', `Approvals ${stats.pendingOrders ? `(${stats.pendingOrders})` : ''}`], ['invoices', 'Invoices'], ['ledger', 'Live Ledger'], ['recovery', `Recovery ${stats.pendingRecovery ? `(${stats.pendingRecovery})` : ''}`], ['customers', 'Dealers / Distributors'], ['products', 'Products / SKUs']];
  return <div className="app">
    <header><div><div className="brand">N-LINK <span>360</span></div><small>Production Sales, Invoice & Recovery Control</small></div><div className="user"><b>{user.fullName || user.email}</b><span>{user.role || 'USER'}</span><button onClick={onSignOut}>Sign out</button></div></header>
    <nav>{nav.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <main className="content">
      {notice && <div className="notice">{notice}</div>}{error && <div className="error">{error}</div>}
      {loading ? <div className="loading-panel">Loading real production data…</div> : <>
        {tab === 'dashboard' && <Dashboard stats={stats} data={data} go={setTab} />}
        {tab === 'orders' && <Orders data={data} refresh={load} notice={setNotice} />}
        {tab === 'approvals' && <Approvals data={data} refresh={load} notice={setNotice} />}
        {tab === 'invoices' && <Invoices data={data} refresh={load} notice={setNotice} />}
        {tab === 'ledger' && <Ledger data={data} />}
        {tab === 'recovery' && <Recovery data={data} refresh={load} notice={setNotice} />}
        {tab === 'customers' && <EntityTable title="Dealers & Distributors" rows={data.customers} columns={['customer_code', 'name', 'customer_type', 'mobile', 'city', 'credit_limit', 'credit_days', 'opening_balance', 'status']} />}
        {tab === 'products' && <EntityTable title="Products / SKUs" rows={data.skus.map(s => ({ ...s, product_name: data.products.find(p => p.id === s.product_id)?.name || '-' }))} columns={['sku_code', 'sku_name', 'product_name', 'packing_unit', 'units_per_carton', 'dealer_price', 'trade_price', 'sale_price', 'status']} />}
      </>}
    </main>
  </div>;
}

function Dashboard({ stats, data, go }: { stats: any; data: Record<string, Row[]>; go: (t: Tab) => void }) {
  return <><section className="hero"><div><span className="eyebrow">LIVE PRODUCTION DATA</span><h2>Dealer & Distributor Command Center</h2><p>Supabase is the transactional source of truth. Google Sheets controls master data.</p></div><button onClick={() => go('orders')}>Create Sales Order</button></section>
    <div className="metrics"><Metric label="Posted Sales" value={money(stats.sales)} /><Metric label="Verified Recovery" value={money(stats.recovery)} /><Metric label="Outstanding" value={money(stats.outstanding)} /><Metric label="Active Accounts" value={stats.customers} /><Metric label="Orders Awaiting Action" value={stats.pendingOrders} /><Metric label="Recoveries Awaiting Verification" value={stats.pendingRecovery} /></div>
    <div className="grid2"><Panel title="Recent Orders"><EntityTable rows={data.orders.slice(0, 10)} columns={['order_code', 'order_date', 'customer_id', 'requested_amount', 'status']} /></Panel><Panel title="Recent Recoveries"><EntityTable rows={data.recoveries.slice(0, 10)} columns={['recovery_code', 'recovery_date', 'customer_id', 'amount', 'payment_method', 'status']} /></Panel></div>
  </>;
}
function Metric({ label, value }: { label: string; value: any }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel"><h3>{title}</h3>{children}</section>; }

function Orders({ data, refresh, notice }: { data: any; refresh: () => Promise<void>; notice: (s: string) => void }) {
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ skuId: '', qty: 1, price: 0 }]);
  const [recovery, setRecovery] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((s, x) => s + Number(x.qty || 0) * Number(x.price || 0), 0);
  const setLine = (i: number, k: string, v: any) => setLines(a => a.map((x, j) => j === i ? { ...x, [k]: v } : x));
  async function save() {
    if (!supabase || !customerId || !lines.every(x => x.skuId && x.qty > 0 && x.price > 0)) return;
    setBusy(true);
    try {
      const { data: id, error } = await supabase.rpc('nlink_submit_order', { p_customer_id: customerId, p_items: lines.map(x => ({ sku_id: x.skuId, order_qty: Number(x.qty), unit_price: Number(x.price) })), p_recovery_amount: Number(recovery || 0), p_remarks: remarks || null });
      if (error) throw error;
      notice(`Sales order ${id} was saved by the production transaction engine.`);
      setCustomerId(''); setLines([{ skuId: '', qty: 1, price: 0 }]); setRecovery(0); setRemarks(''); await refresh();
    } catch (e: any) { notice(`Order failed: ${e?.message || e}`); }
    finally { setBusy(false); }
  }
  return <section className="panel form-panel"><h2>Dealer / Distributor Sales Order</h2><label>Account<select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Select active account</option>{data.customers.filter((x: any) => active(x.status)).map((x: any) => <option key={x.id} value={x.id}>{x.customer_code} · {x.name} · {x.customer_type}</option>)}</select></label>
    {lines.map((l, i) => <div className="line" key={i}><select value={l.skuId} onChange={e => { const s = data.skus.find((x: any) => x.id === e.target.value); setLine(i, 'skuId', e.target.value); setLine(i, 'price', Number(s?.dealer_price ?? s?.trade_price ?? s?.sale_price ?? 0)); }}><option value="">Select SKU</option>{data.skus.filter((x: any) => active(x.status)).map((s: any) => <option key={s.id} value={s.id}>{s.sku_code} · {s.sku_name}</option>)}</select><input type="number" min="1" value={l.qty} onChange={e => setLine(i, 'qty', Number(e.target.value))} /><input type="number" min="0.01" step="0.01" value={l.price} onChange={e => setLine(i, 'price', Number(e.target.value))} />{lines.length > 1 && <button className="danger" onClick={() => setLines(a => a.filter((_, j) => j !== i))}>×</button>}</div>)}
    <button className="secondary" onClick={() => setLines(a => [...a, { skuId: '', qty: 1, price: 0 }])}>+ Add SKU</button>
    <div className="two-input"><label>Recovery with order<input type="number" min="0" step="0.01" value={recovery || ''} onChange={e => setRecovery(Number(e.target.value))} /></label><label>Remarks<input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional" /></label></div>
    <div className="total"><span>Order total</span><b>{money(total)}</b></div><button disabled={busy || !customerId}>{busy ? 'Saving…' : 'Submit real order'}</button><button disabled={busy || !customerId} onClick={save} className="primary-action">Confirm & submit</button>
  </section>;
}

function Approvals({ data, refresh, notice }: { data: any; refresh: () => Promise<void>; notice: (s: string) => void }) {
  const [busy, setBusy] = useState('');
  async function act(id: string, action: 'approve' | 'reject' | 'invoice') {
    if (!supabase) return; setBusy(`${action}:${id}`);
    try {
      const fn = action === 'approve' ? 'nlink_approve_order' : action === 'reject' ? 'nlink_reject_order' : 'nlink_post_invoice';
      const args = action === 'approve' ? { p_order_id: id, p_notes: null } : action === 'reject' ? { p_order_id: id, p_reason: 'Rejected by authorized approver' } : { p_order_id: id };
      const { data: result, error } = await supabase.rpc(fn, args); if (error) throw error;
      notice(action === 'invoice' ? `Invoice ${result} posted successfully.` : `Order ${id} ${action}d successfully.`); await refresh();
    } catch (e: any) { notice(`${action} failed: ${e?.message || e}`); } finally { setBusy(''); }
  }
  const rows = data.orders.filter((x: any) => ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD', 'APPROVED'].includes(x.status));
  return <section className="panel"><h2>Order Approval & Invoice Posting</h2><p className="muted">Approval and invoice posting are server-side controlled. No direct balance edits are used.</p><div className="approval-list">{rows.length ? rows.map((r: any) => <article className="approval-card" key={r.id}><div><b>{r.order_code}</b><span>{r.status}</span><small>{r.order_date} · {money(r.requested_amount)}</small></div><div className="actions">{['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(r.status) && <><button disabled={!!busy} onClick={() => void act(r.id, 'approve')}>Approve</button><button className="danger" disabled={!!busy} onClick={() => void act(r.id, 'reject')}>Reject</button></>}{r.status === 'APPROVED' && <button disabled={!!busy} onClick={() => void act(r.id, 'invoice')}>Post Invoice</button>}</div></article>) : <div className="empty-block">No orders awaiting action.</div>}</div></section>;
}

function Invoices({ data, refresh, notice }: { data: any; refresh: () => Promise<void>; notice: (s: string) => void }) {
  return <section className="panel"><h2>Production Invoices</h2><EntityTable rows={data.invoices} columns={['invoice_code', 'invoice_date', 'customer_id', 'invoice_amount', 'new_balance', 'status', 'posted_at']} /><button className="secondary" onClick={() => { void refresh(); notice('Invoice list refreshed from Supabase.'); }}>Refresh live data</button></section>;
}
function Ledger({ data }: { data: any }) { return <section className="panel"><h2>Live Customer Ledger</h2><EntityTable rows={data.ledger} columns={['ledger_code', 'entry_date', 'customer_id', 'reference_type', 'debit', 'credit', 'running_balance']} /></section>; }

function Recovery({ data, refresh, notice }: { data: any; refresh: () => Promise<void>; notice: (s: string) => void }) {
  const [customerId, setCustomerId] = useState(''); const [amount, setAmount] = useState(0); const [mode, setMode] = useState('CASH'); const [busy, setBusy] = useState('');
  async function record() { if (!supabase) return; setBusy('record'); try { const { data: id, error } = await supabase.rpc('nlink_record_recovery', { p_customer_id: customerId, p_amount: amount, p_payment_method: mode, p_instrument_no: null, p_bank_name: null, p_remarks: null, p_idempotency_key: crypto.randomUUID() }); if (error) throw error; notice(`Recovery ${id} recorded and sent to verification.`); setCustomerId(''); setAmount(0); await refresh(); } catch (e: any) { notice(`Recovery failed: ${e?.message || e}`); } finally { setBusy(''); } }
  async function verify(id: string) { if (!supabase) return; setBusy(id); try { const { error } = await supabase.rpc('nlink_verify_recovery', { p_recovery_id: id }); if (error) throw error; notice(`Recovery ${id} verified. Ledger credit posted by the transaction engine.`); await refresh(); } catch (e: any) { notice(`Verification failed: ${e?.message || e}`); } finally { setBusy(''); } }
  async function reject(id: string) { if (!supabase) return; setBusy(id); try { const { error } = await supabase.rpc('nlink_reject_recovery', { p_recovery_id: id, p_reason: 'Rejected by authorized approver' }); if (error) throw error; notice(`Recovery ${id} rejected.`); await refresh(); } catch (e: any) { notice(`Rejection failed: ${e?.message || e}`); } finally { setBusy(''); } }
  return <div className="grid2"><section className="panel form-panel"><h2>Record Recovery</h2><label>Account<select value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Select account</option>{data.customers.filter((x: any) => active(x.status)).map((x: any) => <option key={x.id} value={x.id}>{x.customer_code} · {x.name}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /></label><label>Payment mode<select value={mode} onChange={e => setMode(e.target.value)}><option>CASH</option><option>CHEQUE</option><option>ONLINE_TRANSFER</option><option>BANK_TRANSFER</option></select></label><button disabled={!customerId || amount <= 0 || !!busy} onClick={() => void record()}>{busy === 'record' ? 'Saving…' : 'Record recovery'}</button></section><section className="panel"><h2>Recovery Queue</h2>{data.recoveries.length ? data.recoveries.slice(0, 25).map((r: any) => <article className="approval-card" key={r.id}><div><b>{r.recovery_code}</b><span>{r.status}</span><small>{dt(r.recovery_date)} · {money(r.amount)}</small></div>{r.status === 'PENDING_VERIFICATION' && <div className="actions"><button disabled={!!busy} onClick={() => void verify(r.id)}>Verify</button><button className="danger" disabled={!!busy} onClick={() => void reject(r.id)}>Reject</button></div>}</article>) : <div className="empty-block">No recovery records.</div>}</section></div>;
}

function EntityTable({ title, rows, columns }: { title?: string; rows: Row[]; columns: string[] }) { return <div className="table-wrap">{title && <h2>{title}</h2>}<table><thead><tr>{columns.map(c => <th key={c}>{c.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={r.id || i}>{columns.map(c => <td key={c}>{c.includes('date') || c.endsWith('_at') ? dt(r[c]) : ['amount', 'balance', 'price', 'debit', 'credit', 'limit'].some(x => c.includes(x)) ? money(r[c]) : String(r[c] ?? '-')}</td>)}</tr>) : <tr><td className="empty" colSpan={columns.length}>No production records found.</td></tr>}</tbody></table></div>; }
