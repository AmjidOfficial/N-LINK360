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
  onViewOrderHistory?: () => void;
  onOpenOrderHistory?: () => void;
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
  onViewOrderHistory,
  onOpenOrderHistory,
  onUpdateCustomerCoordinates,
}) => {
  const triggerOrder = onOpenNewOrder || onOpenOrderDrawer || (() => {});
  const triggerRecovery = onOpenRecordRecovery || onOpenRecoveryDrawer || (() => {});
  const triggerInvoices = onOpenInvoices || onViewInvoices || (() => {});
  const triggerLedger = onOpenLedger || onViewLedger || (() => {});
  const triggerOrderHistory = onViewOrderHistory || onOpenOrderHistory || triggerInvoices;
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

  // Net Balance Metrics: Opening Balance + Total Invoices - Total Recoveries
  const openingBalance = customer.openingBalance ?? 0;
  const totalInvoiced = customerOrders.filter((o) => o.status !== 'REJECTED').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRecovered = customerRecoveries.filter((r) => r.status !== 'REJECTED').reduce((sum, r) => sum + (r.amount || 0), 0);
  const netBalance = openingBalance + totalInvoiced - totalRecovered;
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

  const creditUtilizationPct = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, netBalance) / creditLimit) * 100)) : 0;
  const derivedTotalDebit = useMemo(() => derivedLedger.reduce((s, r) => s + (r.debit || 0), 0), [derivedLedger]);
  const derivedTotalCredit = useMemo(() => derivedLedger.reduce((s, r) => s + (r.credit || 0), 0), [derivedLedger]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-16 px-4 md:px-0 animate-in fade-in duration-200">
      
      {/* 1. Header Card with Refined Identity and Clean Action Buttons */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-5">
        
        {/* Top bar with back navigation & metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-slate-700/80">
          <button
            type="button"
            onClick={onBack}
            className="btn-outline min-h-[44px] px-3 py-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dealers &amp; Map</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Official Dealer Dossier
            </span>
            <span aria-hidden="true">&middot;</span>
            <span className="font-semibold text-[#0F172A] dark:text-slate-200 uppercase">
              {customer.type || 'DEALER'}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-bold bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700">
              {customer.customerCode || 'NL-CUST'}
            </span>
          </div>
        </div>

        {/* Identity & Main Controls */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400 uppercase tracking-wider">
                Dealer Accounts &bull; 360 Credit Health Profile
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0F172A] dark:text-white tracking-tight">
              {customer.companyName}
            </h1>
            
            {/* Metadata Tags with Consistent Spacing */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
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
                  <span className="font-mono tabular-nums flex items-center gap-1">
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
                className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-slate-100 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-[#16A34A] dark:text-emerald-300 border border-[#E2E8F0] dark:border-slate-700 transition-all cursor-pointer group"
              >
                <Navigation className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>{quickRoute.formattedDistance} from current point</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums font-bold">
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
                className="btn-outline min-h-[44px] px-4 text-xs"
                title="Call Dealer"
              >
                <Phone className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                <span>Call Dealer</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="btn-outline min-h-[44px] px-4 text-xs text-emerald-700 dark:text-emerald-300"
              title="Message on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Message</span>
            </button>
          </div>
        </div>

        {/* 5 PROMINENT CLICKABLE ACTION BUTTONS (Single Vibrant Orange CTA: Ordering) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
          {/* 1. Daily Recovery Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              triggerRecovery();
            }}
            className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation whitespace-nowrap"
            title="Record cash or cheque recovery"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Recovery</span>
          </button>

          {/* 2. Daily Ordering Button (Primary Orange CTA) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              triggerOrder();
            }}
            className="btn-primary min-h-[44px] px-3 py-2.5 text-xs whitespace-nowrap"
            title="Book sales order for this dealer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Ordering</span>
          </button>

          {/* 3. Order History Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              triggerOrderHistory();
            }}
            className="btn-outline min-h-[44px] px-3 py-2.5 text-xs whitespace-nowrap"
            title="View past sales orders history"
          >
            <Clock className="w-4 h-4 shrink-0 text-[#EA580C] dark:text-orange-400" />
            <span>Order History</span>
          </button>

          {/* 4. Invoices Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              triggerInvoices();
            }}
            className="btn-outline min-h-[44px] px-3 py-2.5 text-xs whitespace-nowrap"
            title="View bills and commercial invoices"
          >
            <Receipt className="w-4 h-4 shrink-0 text-[#EA580C] dark:text-orange-400" />
            <span>Invoices</span>
          </button>

          {/* 5. Khata Ledger Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              triggerLedger();
            }}
            className="btn-outline min-h-[44px] px-3 py-2.5 text-xs whitespace-nowrap col-span-2 sm:col-span-1"
            title="View running balance Khata ledger"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-[#16A34A] dark:text-emerald-400" />
            <span>Khata</span>
          </button>
        </div>

        {/* Tab Segmented Control */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setProfileViewMode('FINANCIAL')}
            className={`min-h-[42px] py-2 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'FINANCIAL'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileViewMode('LEDGER')}
            className={`min-h-[42px] py-2 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'LEDGER'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ledger Details</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileViewMode('MAP')}
            className={`min-h-[42px] py-2 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              profileViewMode === 'MAP'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Store GPS</span>
          </button>
        </div>

        {/* Over Credit Limit Guard */}
        {isOverCredit && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 tabular-nums">
              <span className="font-bold block">Credit Over-Exposure Alert</span>
              <span>
                Net balance (PKR {netBalance.toLocaleString()}) exceeds approved credit limit (PKR {creditLimit.toLocaleString()}). Prioritize collection.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Toggle Mode Viewport */}
      {profileViewMode === 'MAP' ? (
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs">
          <CustomerMapView
            customer={customer}
            currentUser={currentUser}
            onUpdateCustomerCoordinates={onUpdateCustomerCoordinates}
          />
        </div>
      ) : profileViewMode === 'LEDGER' ? (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-slate-700/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
              Chronological Ledger Statement Details
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono tabular-nums bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 px-2.5 py-1 rounded-md">
              {derivedLedger.length} Transactions
            </span>
          </div>

          <div className="space-y-3">
            {/* Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {derivedLedger.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400">No transactions.</div>
              ) : (
                derivedLedger.map((item, idx) => {
                  const isOpening = item.type === 'OPENING';
                  const isDebit = item.type === 'DEBIT';

                  return (
                    <div key={idx} className="bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-[10px] font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">{item.date}</div>
                          <div className="font-bold text-[#0F172A] dark:text-white font-mono tabular-nums text-xs">{item.ref}</div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          isOpening 
                            ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            : isDebit
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{item.description}</div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                        <div className="space-x-3 flex">
                          {item.debit > 0 && (
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Debit</div>
                              <div className="text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-orange-300">PKR {item.debit.toLocaleString()}</div>
                            </div>
                          )}
                          {item.credit > 0 && (
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Credit</div>
                              <div className="text-xs font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">-PKR {item.credit.toLocaleString()} CR</div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Balance</div>
                          <div className="text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">PKR {item.runningBalance.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
              <table className="w-full min-w-[650px] border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F172A] dark:bg-[#0B1120] border-b border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    <th className="py-3 pl-3 pr-2 frozen-first-col bg-[#0F172A] dark:bg-[#0B1120]">Date</th>
                    <th className="py-3 px-2 text-center">Type</th>
                    <th className="py-3 px-2">Ref Code</th>
                    <th className="py-3 px-2">Description / Event</th>
                    <th className="py-3 px-2 text-right">Debit (PKR)</th>
                    <th className="py-3 px-2 text-right">Credit (PKR)</th>
                    <th className="py-3 px-2 text-right pr-3">Balance (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {derivedLedger.map((item, idx) => {
                    const isOpening = item.type === 'OPENING';
                    const isDebit = item.type === 'DEBIT';
                    return (
                      <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 pl-3 pr-2 frozen-first-col font-mono tabular-nums text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.date}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            isOpening ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' : isDebit ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>{item.type}</span>
                        </td>
                        <td className="py-3 px-2 font-mono tabular-nums text-[11px] font-bold text-[#0F172A] dark:text-white whitespace-nowrap">{item.ref}</td>
                        <td className="py-3 px-2 max-w-[220px] truncate text-slate-600 dark:text-slate-300" title={item.description}>{item.description}</td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-orange-300 whitespace-nowrap">{item.debit > 0 ? `PKR ${item.debit.toLocaleString()}` : '—'}</td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{item.credit > 0 ? `-PKR ${item.credit.toLocaleString()} CR` : '—'}</td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white pr-3 whitespace-nowrap">PKR {item.runningBalance.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-t-2 border-[#E2E8F0] dark:border-slate-700 font-bold text-xs">
                    <td className="py-3 pl-3 pr-2 frozen-first-col bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white uppercase text-[10px]">
                      Totals ({derivedLedger.length})
                    </td>
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400" colSpan={3}>
                      Reconciled Closing Position
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-[#0F172A] dark:text-orange-300 whitespace-nowrap">
                      PKR {derivedTotalDebit.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      -PKR {derivedTotalCredit.toLocaleString()} CR
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-[#0F172A] dark:text-white pr-3 whitespace-nowrap">
                      PKR {netBalance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-[11px] font-medium text-center">
            All debit and credit balances are reconciled and locked under Managing Director Shahzad Ullah&apos;s authoritative ledger seal.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* A. Authoritative Ledger Statement Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-slate-700/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                Ledger Account Overview
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                {now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Large Prominent Highlight Ledger Box */}
            <div className="bg-[#0F172A] dark:bg-[#0B1120] rounded-2xl p-5 sm:p-6 text-white border border-slate-700/80 shadow-xs relative overflow-hidden space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    AUTHORITATIVE NET OUTSTANDING BALANCE
                  </span>
                  <div className="text-2xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight flex items-baseline gap-2">
                    PKR {netBalance.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-300 font-medium max-w-lg tabular-nums">
                    Authoritative Ledger Rule: Opening (PKR {openingBalance.toLocaleString()}) + Posted Invoices (PKR {totalInvoiced.toLocaleString()}) - Confirmed Recovery (PKR {totalRecovered.toLocaleString()}) = Closing (PKR {netBalance.toLocaleString()})
                  </p>
                </div>

                <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-slate-700/80 pt-4 lg:pt-0 lg:pl-6 shrink-0 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">Available Credit Line</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
                    PKR {Math.max(0, creditLimit - netBalance).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono tabular-nums">
                    Sanctioned Credit Limit: PKR {creditLimit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Calibrated Credit Utilization Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-slate-400">Credit Utilization</span>
                  <span className={`font-bold ${
                    creditUtilizationPct >= 100
                      ? 'text-rose-400'
                      : creditUtilizationPct >= 75
                      ? 'text-orange-400'
                      : 'text-emerald-400'
                  }`}>
                    {creditUtilizationPct}% utilized
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      creditUtilizationPct >= 100
                        ? 'bg-[#DC2626]'
                        : creditUtilizationPct >= 75
                        ? 'bg-[#F97316]'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${creditUtilizationPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Authoritative All-Time Ledger Breakdown */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                All-Time Ledger Reconciliation (Authoritative Rule)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Opening Balance</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-slate-100 mt-1 block truncate">
                    PKR {openingBalance.toLocaleString()}
                  </span>
                </div>

                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C] dark:text-orange-400 block">
                    Posted Invoices
                  </span>
                  <span className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-orange-300 mt-1 block truncate">
                    PKR {totalInvoiced.toLocaleString()}
                  </span>
                </div>

                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Confirmed Recovery
                  </span>
                  <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-1 block truncate">
                    -PKR {totalRecovered.toLocaleString()} CR
                  </span>
                </div>

                <div className="h-full flex flex-col justify-between bg-[#0F172A] dark:bg-[#0B1120] border border-slate-700/80 p-4 rounded-xl text-white min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Closing Balance</span>
                  <span className="text-base font-bold font-mono tabular-nums text-white mt-1 block truncate">
                    PKR {netBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Separate Month-to-Date (MTD) Operating Metrics */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                Current Month Operational Activity (MTD)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch">
                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">MTD Invoices</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-slate-200 mt-0.5 block truncate">
                    PKR {mtdInvoicesTotal.toLocaleString()}
                  </span>
                </div>
                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">MTD Recovery</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                    -PKR {mtdRecoveryTotal.toLocaleString()} CR
                  </span>
                </div>
                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Today&apos;s Recovery</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                    -PKR {todayRecoveryTotal.toLocaleString()} CR
                  </span>
                </div>
                <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Approved Term</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-slate-200 mt-0.5 block truncate">
                    {customer.creditDays || 30} Days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Health Risk Intelligence Panel */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-slate-200">
                  Dealer Credit Health Assessment &bull; D3 Pin Intelligence
                </h3>
              </div>
              <span className="text-[11px] font-bold font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Limit: PKR {creditLimit.toLocaleString()}
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

          {/* B. Large Prominent Core Touch Targets (Book Order Orange CTA & Log Recovery Emerald) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                triggerOrder();
              }}
              className="btn-primary min-h-[72px] p-5 rounded-2xl flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold uppercase tracking-wide">Place Sales Booking</span>
                  <span className="block text-[11px] font-medium text-orange-100">Book product SKUs &amp; build draft</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                triggerRecovery();
              }}
              className="min-h-[72px] p-5 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm flex items-center justify-between shadow-xs transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <CreditCard className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold uppercase tracking-wide">Record Payment Recovery</span>
                  <span className="block text-[11px] font-medium text-emerald-100">Collect cash, cheque, or bank slips</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>

          {/* C. Direct Report & Ledger Navigation Cards (Consistent 3-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
            <button
              type="button"
              onClick={triggerInvoices}
              className="h-full p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 hover:border-[#16A34A] dark:hover:border-emerald-500/70 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-[#EA580C] dark:text-orange-400 flex items-center justify-center border border-[#E2E8F0] dark:border-slate-700 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                    Invoices List &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                    {customerOrders.length} bookings &bull; Invoice PDF
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileViewMode('LEDGER');
                triggerLedger();
              }}
              className="h-full p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 hover:border-[#16A34A] dark:hover:border-emerald-500/70 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-[#16A34A] dark:text-emerald-400 flex items-center justify-center border border-[#E2E8F0] dark:border-slate-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                    Export Ledger &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                    Audit report &amp; CSV statement
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setProfileViewMode('MAP')}
              className="h-full p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 hover:border-[#16A34A] dark:hover:border-emerald-500/70 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xs group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-[#16A34A] dark:text-emerald-400 flex items-center justify-center border border-[#E2E8F0] dark:border-slate-700 shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white block">
                    Shop Direction &rarr;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                    {quickRoute.formattedDistance} &bull; {quickRoute.formattedEta} ETA
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* D. Chronological Activity Stream */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-700/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                Recent Transaction Feed
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Latest 5 actions
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
                <p className="font-bold text-slate-600 dark:text-slate-300">No previous activities found</p>
                <p className="text-[11px] text-slate-400 mt-1">Book an order or log a recovery payment above to begin building history.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
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
                    <div key={act.id} className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 px-2 -mx-2 transition-colors rounded-xl">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isOrder
                              ? 'bg-orange-50 dark:bg-orange-950/50 text-[#EA580C] dark:text-orange-400 border-orange-200 dark:border-orange-800/60'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                          }`}
                        >
                          {isOrder ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                              {act.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                act.status === 'APPROVED' || act.status === 'VERIFIED'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                  : act.status === 'REJECTED'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
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
                          className={`text-xs font-bold font-mono tabular-nums block ${
                            isOrder ? 'text-[#0F172A] dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isOrder ? '+' : '-'}PKR {Number(act.amount || 0).toLocaleString()}{!isOrder ? ' CR' : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">
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
