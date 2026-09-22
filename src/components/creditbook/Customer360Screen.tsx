/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer 360 Screen
 * The definitive single-screen customer hub matching CreditBook simplicity:
 * - Customer Details & Town
 * - Real-time Financial Summary (Opening Balance, MTD Invoices, MTD Recovery, Today's Recovery, Net Balance)
 * - Quick Actions: [+ NEW ORDER], [RECORD RECOVERY], [INVOICES →], [LEDGER →], [CALL], [WHATSAPP]
 * - Chronological Recent Activity Stream
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { CustomerMapView } from './CustomerMapView';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Plus,
  Receipt,
  FileText,
  Clock,
  Building2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Navigation,
  Compass,
} from 'lucide-react';
import {
  computeOfficerToCustomerRoute,
  PAKISTAN_TOWN_COORDINATES,
} from '../../utils/geoUtils';

export interface Customer360ScreenProps {
  customer: Customer;
  currentUser: NLinkUser;
  orders: SalesOrder[];
  recoveries: Recovery[];
  onBack: () => void;
  onOpenNewOrder: () => void;
  onOpenRecordRecovery: () => void;
  onOpenInvoices: () => void;
  onOpenLedger: () => void;
  onUpdateCustomerCoordinates?: (updatedCustomer: Customer) => void;
}

export const Customer360Screen: React.FC<Customer360ScreenProps> = ({
  customer,
  currentUser,
  orders,
  recoveries,
  onBack,
  onOpenNewOrder,
  onOpenRecordRecovery,
  onOpenInvoices,
  onOpenLedger,
  onUpdateCustomerCoordinates,
}) => {
  const [profileViewMode, setProfileViewMode] = useState<'FINANCIAL' | 'MAP'>('FINANCIAL');

  // Quick route summary calculation for header badge
  const quickRoute = useMemo(() => {
    const userTown = (currentUser.assignedTowns?.[0] || 'Abbottabad').toLowerCase().trim();
    const townCoord = PAKISTAN_TOWN_COORDINATES[userTown] || PAKISTAN_TOWN_COORDINATES['abbottabad'];
    const officerPos = {
      lat: townCoord.lat + 0.012,
      lng: townCoord.lng + 0.015,
      label: currentUser.fullName,
    };
    return computeOfficerToCustomerRoute(officerPos, customer);
  }, [currentUser, customer]);

  // Filter orders & recoveries for this customer
  const customerOrders = orders.filter(
    (o) => o.customerId === customer.id || o.customerName === customer.companyName
  );
  const customerRecoveries = recoveries.filter(
    (r) => r.customerId === customer.id || r.customerName === customer.companyName
  );

  // Calculate MTD & Today metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayDateString = now.toISOString().slice(0, 10);

  // MTD Invoices (Approved or All booked this month)
  const mtdInvoicesTotal = customerOrders
    .filter((o) => {
      const d = new Date(o.orderDate || o.createdAt || '');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && o.status !== 'REJECTED';
    })
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // MTD Recovery (Verified or recorded this month)
  const mtdRecoveryTotal = customerRecoveries
    .filter((r) => {
      const d = new Date(r.recordedAt || r.createdAt || '');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.status !== 'REJECTED';
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  // Today's Recovery
  const todayRecoveryTotal = customerRecoveries
    .filter((r) => {
      const recDate = (r.recordedAt || r.createdAt || '').slice(0, 10);
      return recDate === todayDateString && r.status !== 'REJECTED';
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  // Authoritative Current Net Balance
  const netBalance = customer.currentBalance ?? customer.openingBalance ?? 0;
  const openingBalance = customer.openingBalance ?? 0;
  const creditLimit = customer.creditLimit ?? 250000;
  const isOverCredit = netBalance > creditLimit;

  // Clean phone number for Call & WhatsApp
  const rawPhone = customer.phone || '';
  const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
  const waNumber = digitsOnly.startsWith('0') ? '92' + digitsOnly.slice(1) : digitsOnly;

  const handleCall = () => {
    if (rawPhone) {
      window.location.href = `tel:${rawPhone}`;
    }
  };

  const handleWhatsApp = () => {
    const text = `Assalam-o-Alaikum ${customer.contactPerson || customer.companyName},\n\nThis is ${currentUser.fullName} from National Lights.\n\n*Account Summary for ${customer.companyName}:*\n- Net Balance: Rs. ${netBalance.toLocaleString()}\n- Credit Limit: Rs. ${creditLimit.toLocaleString()}\n\nPlease let us know if you have any requirements or payment updates. Thank you!`;
    const url = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Recent Activity Items sorted by date
  const recentActivities = [
    ...customerOrders.map((o) => ({
      id: o.id || o.orderNumber,
      type: 'ORDER' as const,
      date: o.orderDate || o.createdAt || '',
      amount: o.totalAmount || 0,
      title: `Order #${o.orderNumber || o.id?.slice(-5)}`,
      subtitle: `${o.items?.length || 1} SKUs • ${o.status || 'SUBMITTED'}`,
      status: o.status || 'SUBMITTED',
      raw: o,
    })),
    ...customerRecoveries.map((r) => ({
      id: r.id,
      type: 'RECOVERY' as const,
      date: r.recordedAt || r.createdAt || '',
      amount: r.amount || 0,
      title: `Recovery #${r.id?.slice(-5)}`,
      subtitle: `${r.paymentMode || 'CASH'} • ${r.status || 'PENDING'}`,
      status: r.status || 'PENDING_VERIFICATION',
      raw: r,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Top bar with back button & badges */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Town</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
              {customer.type || 'DEALER'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {customer.customerCode || 'NL-CUST'}
            </span>
          </div>
        </div>

        {/* Customer Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {customer.companyName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                {customer.contactPerson || 'Proprietor'}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.town || customer.city || 'Commercial Market'}
              </span>
              {rawPhone && (
                <>
                  <span>&bull;</span>
                  <span className="font-mono">{rawPhone}</span>
                </>
              )}
            </div>

            {/* Quick Live Distance & Route Badge */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileViewMode('MAP')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors cursor-pointer group"
                title="View live route & map"
              >
                <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span>{quickRoute.formattedDistance} from your location</span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-black">
                  ({quickRoute.formattedEta} ETA)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
              </button>
            </div>
          </div>

          {/* Quick Contact & Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setProfileViewMode(profileViewMode === 'MAP' ? 'FINANCIAL' : 'MAP')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                profileViewMode === 'MAP'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{profileViewMode === 'MAP' ? 'Financial View' : 'Map View'}</span>
            </button>

            {rawPhone && (
              <button
                type="button"
                onClick={handleCall}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Call Dealer"
              >
                <Phone className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Call</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Message on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Tab Segmented Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileViewMode('FINANCIAL')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              profileViewMode === 'FINANCIAL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Financial Statement &amp; Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileViewMode('MAP')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              profileViewMode === 'MAP'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Shop Route &amp; Geolocation</span>
          </button>
        </div>

        {/* Credit Limit Warning if applicable */}
        {isOverCredit && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Credit Limit Warning:</strong> Net balance (Rs. {netBalance.toLocaleString()}) exceeds sanctioned limit of Rs. {creditLimit.toLocaleString()}.
            </span>
          </div>
        )}
      </div>

      {/* Conditionally Render Map View or Financial Dashboard */}
      {profileViewMode === 'MAP' ? (
        <CustomerMapView
          customer={customer}
          currentUser={currentUser}
          onUpdateCustomerCoordinates={onUpdateCustomerCoordinates}
        />
      ) : (
        <>
          {/* Financial Summary Cards (CreditBook Standard) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            Financial Statement &amp; Ledger
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {now.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Net Balance Highlight Box with Section 16 Formula */}
        <div className="bg-gradient-to-br from-[#004d40] via-[#006b5f] to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden border border-teal-700/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 block">
                NET BALANCE (Current Ledger Due)
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1">
                Rs. {netBalance.toLocaleString()} <span className="text-sm font-sans font-bold text-emerald-300">PKR</span>
              </div>
              <div className="text-[11px] text-teal-100/90 font-medium mt-1">
                Formula: Opening (Rs. {openingBalance.toLocaleString()}) + Invoices (Rs. {mtdInvoicesTotal.toLocaleString()}) - Recovery (Rs. {mtdRecoveryTotal.toLocaleString()})
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-2.5 border border-teal-500/30 text-right sm:text-right shrink-0">
              <span className="text-[10px] font-black text-emerald-300 block uppercase">Today&apos;s Recovery</span>
              <span className="text-base font-black font-mono text-white">
                Rs. {todayRecoveryTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Credit Limit: Rs. {creditLimit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Metric Grid (Section 16 Specification) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Opening Balance</span>
            <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
              Rs. {openingBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 block">MTD Invoices</span>
            <span className="text-sm font-black font-mono text-teal-900 dark:text-teal-200 mt-0.5 block truncate">
              Rs. {mtdInvoicesTotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">MTD Recovery</span>
            <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5 block truncate">
              Rs. {mtdRecoveryTotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Today&apos;s Recovery</span>
            <span className="text-sm font-black font-mono text-amber-900 dark:text-amber-200 mt-0.5 block truncate">
              Rs. {todayRecoveryTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Actions (CreditBook Style Prominent CTAs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenNewOrder}
          className="p-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-sm flex items-center justify-between shadow-md transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-black">+ NEW ORDER</span>
              <span className="block text-[11px] font-medium text-teal-200">Book products &amp; generate bill</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-teal-300 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onOpenRecordRecovery}
          className="p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-between shadow-md transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-black">RECORD RECOVERY</span>
              <span className="block text-[11px] font-medium text-emerald-200">Receive cash / cheque / bank</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Invoices, Ledger & Route Map Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onOpenInvoices}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Invoices &rarr;
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {customerOrders.length} bills &bull; PDF / Print
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onOpenLedger}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Ledger &rarr;
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Account statement PDF
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => setProfileViewMode('MAP')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Route &amp; Map &rarr;
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {quickRoute.formattedDistance} &bull; {quickRoute.formattedEta} ETA
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Recent Activity
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            Latest transactions
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold">No orders or recoveries recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Use the buttons above to book your first order or recovery.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.slice(0, 5).map((act) => {
              const isOrder = act.type === 'ORDER';
              const actDate = act.date ? new Date(act.date) : new Date();
              const dateDisplay = actDate.toLocaleDateString('en-PK', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isOrder
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                      }`}
                    >
                      {isOrder ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {act.title}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            act.status === 'APPROVED' || act.status === 'VERIFIED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : act.status === 'REJECTED'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {act.status === 'APPROVED' || act.status === 'VERIFIED'
                            ? 'Approved'
                            : act.status === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending ShahzadUllah'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {dateDisplay} &bull; {act.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-black font-mono block ${
                        isOrder ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isOrder ? '+' : '-'} Rs. {Number(act.amount || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isOrder ? 'Debit' : 'Credit'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  )}
    </div>
  );
};
