import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, RefreshCw, Route, ShoppingBag, WalletCards } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateDutyDuration, formatTimeFromIso, type FieldAttendanceRecord } from '../services/attendance';

type Activity = { id: string; date: string; time: string | null; label: string; detail: string };

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStart(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function FieldAttendanceDashboard() {
  const [today, setToday] = useState<FieldAttendanceRecord | null>(null);
  const [history, setHistory] = useState<FieldAttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<'today' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    try {
      const start = monthStart();
      const end = localDateString();
      const [attendanceResult, visitsResult, ordersResult, recoveriesResult] = await Promise.all([
        supabase.from('field_attendance').select('*').gte('attendance_date', start).lte('attendance_date', end).order('attendance_date', { ascending: false }),
        supabase.from('customer_visits').select('id,visit_at,customer_id,customers(company_name)').gte('visit_at', `${start}T00:00:00`).lte('visit_at', `${end}T23:59:59`).order('visit_at', { ascending: false }).limit(100),
        supabase.from('sales_orders').select('id,order_number,order_date,total_amount').gte('order_date', start).lte('order_date', end).order('order_date', { ascending: false }).limit(100),
        supabase.from('recoveries').select('id,recovery_number,collection_date,amount').gte('collection_date', start).lte('collection_date', end).order('collection_date', { ascending: false }).limit(100),
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      setHistory((attendanceResult.data || []).map((r: any) => ({ ...r, latitude: Number(r.latitude), longitude: Number(r.longitude), gps_accuracy_m: r.gps_accuracy_m == null ? null : Number(r.gps_accuracy_m), duration_text: calculateDutyDuration(r.check_in_at, r.check_out_at) })));
      setToday((attendanceResult.data || []).find((r: any) => r.attendance_date === end) || null);

      const next: Activity[] = [];
      for (const r of visitsResult.data || []) next.push({ id: `visit-${r.id}`, date: String(r.visit_at).slice(0, 10), time: r.visit_at, label: 'Customer visit', detail: r.customers?.company_name || 'Market visit' });
      for (const r of ordersResult.data || []) next.push({ id: `order-${r.id}`, date: String(r.order_date).slice(0, 10), time: null, label: 'Sales order', detail: `${r.order_number || r.id}${r.total_amount != null ? ` • Rs. ${Number(r.total_amount).toLocaleString()}` : ''}` });
      for (const r of recoveriesResult.data || []) next.push({ id: `recovery-${r.id}`, date: String(r.collection_date).slice(0, 10), time: null, label: 'Recovery', detail: `${r.recovery_number || r.id} • Rs. ${Number(r.amount || 0).toLocaleString()}` });
      next.sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`));
      setActivities(next);
    } catch (e: any) {
      setError(e?.message || 'Unable to load attendance details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const todayActivities = useMemo(() => activities.filter(a => a.date === localDateString()), [activities]);
  const presentDays = history.filter(h => h.status === 'CHECKED_IN' || h.status === 'CHECKED_OUT').length;
  const totalVisits = activities.filter(a => a.label === 'Customer visit').length;
  const totalOrders = activities.filter(a => a.label === 'Sales order').length;
  const totalRecoveries = activities.filter(a => a.label === 'Recovery').length;

  return (
    <section className="w-full max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Field work</p>
          <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
          <p className="text-sm text-slate-500">Simple daily check-in, duty time and market activity.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm active:scale-[.99] disabled:opacity-60">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Clock3 className="h-5 w-5" />} label="Today" value={today ? (today.status === 'CHECKED_OUT' ? 'Completed' : 'On duty') : 'Not checked in'} />
        <Stat icon={<Route className="h-5 w-5" />} label="Visits" value={String(view === 'today' ? todayActivities.filter(a => a.label === 'Customer visit').length : totalVisits)} />
        <Stat icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={String(view === 'today' ? todayActivities.filter(a => a.label === 'Sales order').length : totalOrders)} />
        <Stat icon={<WalletCards className="h-5 w-5" />} label="Recovery" value={String(view === 'today' ? todayActivities.filter(a => a.label === 'Recovery').length : totalRecoveries)} />
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1">
        <button onClick={() => setView('today')} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${view === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Today</button>
        <button onClick={() => setView('month')} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Monthly</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {view === 'today' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">Today's attendance</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="Check in" value={formatTimeFromIso(today?.check_in_at)} />
              <Info label="Check out" value={formatTimeFromIso(today?.check_out_at)} />
              <Info label="Duty" value={today ? calculateDutyDuration(today.check_in_at, today.check_out_at) : '--'} />
              <Info label="Town" value={today?.town || '--'} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <MapPin className="h-4 w-4 shrink-0" />
              {today ? `GPS recorded${today.gps_accuracy_m ? ` • ±${Math.round(today.gps_accuracy_m)}m` : ''}` : 'No attendance recorded today'}
            </div>
          </div>
          <ActivityList title="Today's activities" items={todayActivities} />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div><h3 className="font-bold text-slate-900">Monthly attendance</h3><p className="text-xs text-slate-500">{presentDays} attendance record{presentDays === 1 ? '' : 's'} this month</p></div>
            <CalendarDays className="h-5 w-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100">
            {history.length === 0 && <p className="p-5 text-sm text-slate-500">No attendance records found.</p>}
            {history.map(r => <div key={r.id || r.attendance_date} className="grid grid-cols-[1fr_auto] gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <div><p className="font-semibold text-slate-900">{new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</p><p className="text-xs text-slate-500">{r.town}</p></div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Present</span>
              <span className="text-sm text-slate-600">{formatTimeFromIso(r.check_in_at)} - {formatTimeFromIso(r.check_out_at)}</span>
              <span className="text-sm font-semibold text-slate-800">{calculateDutyDuration(r.check_in_at, r.check_out_at)}</span>
            </div>)}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 text-emerald-700">{icon}</div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}

function ActivityList({ title, items }: { title: string; items: Activity[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-bold text-slate-900">{title}</h3><div className="mt-3 divide-y divide-slate-100">{items.length === 0 && <p className="py-4 text-sm text-slate-500">No activity recorded yet.</p>}{items.map(a => <div key={a.id} className="flex gap-3 py-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{a.label}</p><p className="truncate text-xs text-slate-500">{a.detail}{a.time ? ` • ${formatTimeFromIso(a.time)}` : ''}</p></div></div>)}</div></div>;
}
