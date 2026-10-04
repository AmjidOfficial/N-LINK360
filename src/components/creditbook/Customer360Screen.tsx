/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer 360 Screen
 * Redesigned to professional premium standards:
 * - 100% clean, crisp layout with perfectly aligned elements and vertical rhythm.
 * - Mobile-first design optimized for touch targets (>44px) and fluid grid system.
 * - Clean visual hierarchy and balanced typography.
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { CustomerMapView } from './CustomerMapView';
import { CreditHealthIndicator } from '../CreditHealthIndicator';
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
  Sparkles,
  Wallet,
  ShoppingBag,
  BookOpen,
} from 'lucide-react';
import {
  computeOfficerToCustomerRoute,
  PAKISTAN_TOWN_COORDINATES,
} from '../../utils/geoUtils';
import { triggerHaptic } from '../../utils/haptics';

export interface Customer360ScreenProps {
  customer: Customer;
  currentUser: NLinkUser;
  orders?: SalesOrder[];
  recoveries?: Recovery[];
  onBack: () => void;
  onOpenNewOrder?: () => void;
  onOpenOrderDrawer?: () => void;
  onOpenRecordRecovery?: () => void;
  onOpenRecoveryDrawer?: () => void;
  onOpenInvoices?: () => void;
  onViewInvoices?: () => void;
  onOpenLedger?: () => void;
  onViewLedger?: () => void;
  onUpdateCustomerCoordinates?: (updatedCustomer: Customer) => void;
}

export const Customer360Screen: React.FC<Customer360ScreenProps> = ({
  customer,
  currentUser,
  orders = [],
  recoveries = [],
  onBack,
  onOpenNewOrder,
  onOpenOrderDrawer,
  onOpenRecordRecovery,
  onOpenRecoveryDrawer,
  onOpenInvoices,
  onViewInvoices,
  onOpenLedger,
  onViewLedger,
  onUpdateCustomerCoordinates,
}) => {
  const triggerOrder = onOpenNewOrder || onOpenOrderDrawer || (() => {});
  const triggerRecovery = onOpenRecordRecovery || onOpenRecoveryDrawer || (() => {});
  const triggerInvoices = onOpenInvoices || onViewInvoices || (() => {});
  const triggerLedger = onOpenLedger || onViewLedger || (() => {});
  const [profileViewMode, setProfileViewMode] = useState<'FINANCIAL' | 'LEDGER' | 'MAP'>('FINANCIAL');

  // Filter orders & recoveries for this customer
  const customerOrders = useMemo(() => {
    return orders.filter(
      (o) => o && (
        o.customerId === customer.id ||
        o.customerId === customer.customerCode ||
        o.customerCode === customer.customerCode ||
        (o.customerName && customer.companyName && o.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim())
      )
    );
  }, [orders, customer]);

  const customerRecoveries = useMemo(() => {
    return recoveries.filter(
      (r) => r && (
        r.customerId === customer.id ||
        r.customerId === customer.customerCode ||
        r.customerCode === customer.customerCode ||
        (r.customerName && customer.companyName && r.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim())
      )
    );
  }, [recoveries, customer]);

  // Derive complete, chronological ledger statement with Running Ledger Balances
  const derivedLedger = useMemo(() => {
    const list: any[] = [];
    const openingBal = customer.openingBalance ?? 0;

    // 1. Initial Opening Balance Entry
    list.push({
      date: customer.createdAt ? customer.createdAt.slice(0, 10) : '2026-07-01',
      type: 'OPENING',
      ref: 'DL-INIT',
      description: 'Account Opening Sanctioned Ledger Balance',
      debit: openingBal >= 0 ? openingBal : 0,
      credit: openingBal < 0 ? Math.abs(openingBal) : 0,
    });

    // 2. Debit Entries (Approved Sales Orders)
    customerOrders.forEach((o) => {
      if (o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED') {
        list.push({
          date: (o.orderDate || o.createdAt || '').slice(0, 10),
          type: 'DEBIT',
          ref: o.orderNumber || o.id || 'ORD-REF',
          description: `Commercial Invoice / Booking Order Ref: ${o.orderNumber || o.id}`,
          debit: o.totalAmount || 0,
          credit: 0,
          timestamp: new Date(o.createdAt || o.orderDate || '').getTime(),
        });
      }
    });

    // 3. Credit Entries (Verified Payments / Recoveries)
    customerRecoveries.forEach((r) => {
      if ((r.status as string) === 'VERIFIED' || (r.status as string) === 'APPROVED' || r.shahzadApproval === 'APPROVED') {
        list.push({
          date: (r.collectionDate || r.recordedAt || r.createdAt || '').slice(0, 10),
          type: 'CREDIT',
          ref: r.id || 'REC-REF',
          description: `Verified Payment Recovery via ${r.paymentMode || 'CASH'}${r.instrumentNumber ? ' (Slip Ref: ' + r.instrumentNumber + ')' : ''}`,
          debit: 0,
          credit: r.amount || 0,
          timestamp: new Date(r.createdAt || r.recordedAt || '').getTime(),
        });
      }
    });

    // 4. Chronological Sorting: Ascending order
    list.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const orderA = a.type === 'OPENING' ? 0 : a.type === 'DEBIT' ? 1 : 2;
      const orderB = b.type === 'OPENING' ? 0 : b.type === 'DEBIT' ? 1 : 2;
      return orderA - orderB;
    });

    // 5. Calculate Running Ledger Balance
    let runningBal = 0;
    return list.map((item) => {
      if (item.type === 'OPENING') {
        runningBal = item.debit - item.credit;
      } else {
        runningBal = runningBal + item.debit - item.credit;
      }
      return {
        ...item,
        runningBalance: runningBal,
      };
    });
  }, [customer, customerOrders, customerRecoveries]);

  // Quick route summary calculation for header badge
  const quickRoute = useMemo(() => {
    const userTown = (currentUser?.assignedTowns?.[0] || 'Abbottabad').trim();
    const townEntry = Object.entries(PAKISTAN_TOWN_COORDINATES).find(
      ([k]) => k.toLowerCase() === userTown.toLowerCase()
    );
    const townCoord = townEntry ? townEntry[1] : (PAKISTAN_TOWN_COORDINATES['Abbottabad'] || { lat: 34.1688, lng: 73.2215 });
    const officerPos = {
      lat: (townCoord?.lat ?? 34.1688) + 0.012,
      lng: (townCoord?.lng ?? 73.2215) + 0.015,
      label: currentUser?.fullName || 'Field Officer',
    };
    return computeOfficerToCustomerRoute(officerPos, customer);
  }, [currentUser, customer]);

  // Calculate MTD & Today metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayDateString = now.toISOString().slice(0, 10);

  // MTD Invoices
  const mtdInvoicesTotal = useMemo(() => {
    return customerOrders
      .filter((o) => {
        const d = new Date(o.orderDate || o.createdAt || '');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && o.status !== 'REJECTED';
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [customerOrders, currentMonth, currentYear]);

  // MTD Recovery
  const mtdRecoveryTotal = useMemo(() => {
    return customerRecoveries
      .filter((r) => {
        const d = new Date(r.recordedAt || r.createdAt || '');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.status !== 'REJECTED';
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [customerRecoveries, currentMonth, currentYear]);

  // Today's Recovery
  const todayRecoveryTotal = useMemo(() => {
    return customerRecoveries
      .filter((r) => {
        const recDate = (r.recordedAt || r.createdAt || '').slice(0, 10);
        return recDate === todayDateString && r.status !== 'REJECTED';
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [customerRecoveries, todayDateString]);

  // Net Balance Metrics
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
  const recentActivities = useMemo(() => {
    return [
      ...customerOrders.map((o) => ({
        id: o.id || o.orderNumber,
        type: 'ORDER' as const,
        date: o.orderDate || o.createdAt || '',
        amount: o.totalAmount || 0,
        title: `Order #${o.orderNumber || o.id?.slice(-5)}`,
        subtitle: `${o.items?.length || 1} SKUs • ${o.status || 'SUBMITTED'}`,
        status: o.status || 'SUBMITTED',
      })),
      ...customerRecoveries.map((r) => ({
        id: r.id,
        type: 'RECOVERY' as const,
        date: r.recordedAt || r.createdAt || '',
        amount: r.amount || 0,
        title: `Recovery #${r.id?.slice(-5)}`,
        subtitle: `${r.paymentMode || 'CASH'} • ${r.status || 'PENDING'}`,
        status: r.status || 'PENDING_VERIFICATION',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerOrders, customerRecoveries]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-16 px-4 md:px-0 animate-in fade-in duration-200">
      
      {/* 1. Header Card with Refined Identity and Clean Action Buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        
        {/* Top bar with back navigation & status tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer border border-slate-200/40"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-slate-500" />
            <span>← Back to Dealers &amp; Map</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Official Dealer Dossier
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/50">
              {customer.type || 'DEALER'}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/20">
              {customer.customerCode || 'NL-CUST'}
            </span>
          </div>
        </div>

        {/* Identity & Main Controls */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Dealer Accounts &bull; 360 Credit Health Profile
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {customer.companyName}
            </h1>
            
            {/* Metadata Tags with Consistent Spacing */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                {customer.contactPerson || 'Proprietor'}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {customer.town || customer.city || 'Commercial Market'}
              </span>
              {rawPhone && (
                <>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {rawPhone}
                  </span>
                </>
              )}
            </div>

            {/* Geographic Route & Real-Time Distance */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setProfileViewMode('MAP')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer group"
              >
                <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span>{quickRoute.formattedDistance} from current point</span>
                <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 font-mono font-bold">
                  ({quickRoute.formattedEta} ETA)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Quick Connect Actions (Clean buttons, min 44px touch targets) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
            {rawPhone && (
              <a
                href={`tel:${rawPhone}`}
                className="h-11 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700 active:scale-98"
                title="Call Dealer"
              >
                <Phone className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>Call Dealer</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer"
              title="Message on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Message</span>
            </button>
          </div>
        </div>

        {/* 4 PROMINENT CLICKABLE ACTION BUTTONS (Daily Recovery, Daily Ordering, Invoices, Ledgers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {/* 1. Daily Recovery Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              triggerRecovery();
            }}
            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="Record cash or cheque recovery"
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span>Daily Recovery</span>
          </button>

          {/* 2. Daily Ordering Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              triggerOrder();
            }}
            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="Book sales order for this dealer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>Daily Ordering</span>
          </button>

          {/* 3. Invoices Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              triggerInvoices();
            }}
            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-2 border border-sky-200 dark:border-sky-800 transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="View bills and commercial invoices"
          >
            <Receipt className="w-4 h-4 text-sky-700 dark:text-sky-400" />
            <span>Invoices</span>
          </button>

          {/* 4. Khata Ledger Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              triggerLedger();
            }}
            className="min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="View running balance Khata ledger"
          >
            <BookOpen className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Khata Ledger</span>
          </button>
        </div>

        {/* Tab Segmented Control */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setProfileViewMode('FINANCIAL')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'FINANCIAL'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileViewMode('LEDGER')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'LEDGER'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Ledger Details</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileViewMode('MAP')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'MAP'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span>Store GPS</span>
          </button>
        </div>

        {/* Over Credit Limit Guard */}
        {isOverCredit && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Credit Over-Exposure Alert</span>
              <span>
                Net balance (Rs. {netBalance.toLocaleString()}) exceeds approved credit limit (Rs. {creditLimit.toLocaleString()}). Prioritize collection.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Toggle Mode Viewport */}
      {profileViewMode === 'MAP' ? (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <CustomerMapView
            customer={customer}
            currentUser={currentUser}
            onUpdateCustomerCoordinates={onUpdateCustomerCoordinates}
          />
        </div>
      ) : profileViewMode === 'LEDGER' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Chronological Ledger Statement Details
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {derivedLedger.length} Transactions
            </span>
          </div>

          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[650px] border-collapse text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Ref Code</th>
                  <th className="pb-3">Description / Event</th>
                  <th className="pb-3 text-right">Debit (Rs.)</th>
                  <th className="pb-3 text-right">Credit (Rs.)</th>
                  <th className="pb-3 text-right pr-2">Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {derivedLedger.map((item, idx) => {
                  const isOpening = item.type === 'OPENING';
                  const isDebit = item.type === 'DEBIT';
                  const isCredit = item.type === 'CREDIT';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        {item.date}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                          isOpening 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                            : isDebit
                              ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {item.ref}
                      </td>
                      <td className="py-3.5 max-w-[220px] truncate text-slate-500 dark:text-slate-400" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-teal-700 dark:text-teal-400">
                        {item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3.5 text-right font-mono font-black text-slate-900 dark:text-white pr-2">
                        Rs. {item.runningBalance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-semibold text-center italic">
            Note: All debit and credit balances are reconciled and locked under Managing Director Shahzad Ullah&apos;s authoritative ledger seal.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* A. Authoritative Ledger Statement Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                Ledger Account Overview
              </span>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Large Prominent Highlight Ledger Box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl p-6 text-white border border-slate-700/40 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Compass className="w-48 h-48" />
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                    AUTHORITATIVE NET OUTSTANDING BALANCE
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight flex items-baseline gap-2">
                    Rs. {netBalance.toLocaleString()}
                    <span className="text-xs font-sans font-black text-teal-400 uppercase tracking-widest">PKR</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium max-w-lg">
                    Real-Time Ledger Audit Rule: Opening Balance (Rs. {openingBalance.toLocaleString()}) + MTD Invoices (Rs. {mtdInvoicesTotal.toLocaleString()}) - Total MTD Recovery (Rs. {mtdRecoveryTotal.toLocaleString()})
                  </p>
                </div>

                <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-slate-700/50 pt-4 lg:pt-0 lg:pl-6 shrink-0 space-y-1">
                  <span className="text-[10px] font-bold text-teal-400 block uppercase tracking-wider">Today&apos;s recovery collection</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    Rs. {todayRecoveryTotal.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Sanctioned Credit: Rs. {creditLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Column Balanced Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Opening Balance</span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-slate-100 mt-1 block">
                  Rs. {openingBalance.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 block">MTD Invoices</span>
                <span className="text-base font-black font-mono text-teal-900 dark:text-teal-300 mt-1 block">
                  Rs. {mtdInvoicesTotal.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">MTD Recovery</span>
                <span className="text-base font-black font-mono text-emerald-900 dark:text-emerald-300 mt-1 block">
                  Rs. {mtdRecoveryTotal.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Today&apos;s Recovery</span>
                <span className="text-base font-black font-mono text-amber-900 dark:text-amber-300 mt-1 block">
                  Rs. {todayRecoveryTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Credit Health Risk Intelligence Panel (Corresponds to D3 Map Pin) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Dealer Credit Health Assessment &bull; D3 Pin Intelligence
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Limit: Rs. {creditLimit.toLocaleString()}
              </span>
            </div>

            <CreditHealthIndicator
              customer={customer}
              invoices={customerOrders as any}
              recoveries={customerRecoveries}
              variant="full"
              showSimulator={true}
            />
          </div>

          {/* B. Large Prominent Core Touch Targets (Book Order & Log Recovery) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                triggerOrder();
              }}
              className="min-h-[72px] p-5 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm flex items-center justify-between shadow-xs transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-teal-700 flex items-center justify-center text-white shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black uppercase tracking-wide">Place Sales Booking</span>
                  <span className="block text-[11px] font-medium text-teal-200/95">Book product SKUs &amp; build draft</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-teal-300 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                triggerRecovery();
              }}
              className="min-h-[72px] p-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-between shadow-xs transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <CreditCard className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black uppercase tracking-wide">Record Payment Recovery</span>
                  <span className="block text-[11px] font-medium text-emerald-200/95">Collect cash, cheque, or bank slips</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* C. Direct Report & Ledger Navigation Cards (Consistent 3-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={triggerInvoices}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:dark:border-teal-700 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200/40">
                  <Receipt className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Invoices List &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {customerOrders.length} bookings &bull; Invoice PDF
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileViewMode('LEDGER');
                triggerLedger();
              }}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:dark:border-teal-700 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200/40">
                  <FileText className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Export Ledger &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Audit report &amp; CSV statement
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => setProfileViewMode('MAP')}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:dark:border-teal-700 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200/40">
                  <Navigation className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Shop Direction &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {quickRoute.formattedDistance} &bull; {quickRoute.formattedEta} ETA
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* D. Chronological Activity Stream */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Recent Transaction Feed
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Latest 5 actions
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
                <p className="font-bold text-slate-600 dark:text-slate-400">No previous activities found</p>
                <p className="text-[11px] text-slate-400 mt-1">Book an order or log a recovery payment above to begin building history.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentActivities.slice(0, 5).map((act) => {
                  const isOrder = act.type === 'ORDER';
                  const actDate = act.date ? new Date(act.date) : new Date();
                  const dateDisplay = actDate.toLocaleDateString('en-PK', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={act.id} className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/55 dark:hover:bg-slate-800/20 px-2 -mx-2 transition-colors rounded-xl">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isOrder
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                          }`}
                        >
                          {isOrder ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                              {act.title}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                act.status === 'APPROVED' || act.status === 'VERIFIED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : act.status === 'REJECTED'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {act.status === 'APPROVED' || act.status === 'VERIFIED'
                                ? 'Approved'
                                : act.status === 'REJECTED'
                                ? 'Rejected'
                                : 'Pending Approval'}
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
                            isOrder ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-emerald-700 dark:text-emerald-400 font-bold'
                          }`}
                        >
                          {isOrder ? '+' : '-'} Rs. {Number(act.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                          {isOrder ? 'Debit' : 'Credit'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
