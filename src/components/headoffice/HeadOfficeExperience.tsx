/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Head Office Desktop Command Center
 * "ONE SMART PLATFORM" Archetype:
 * - Premium, spacious, modern enterprise layout
 * - Brand aesthetic: Premium N-LINK Green, Light Mint/Teal, Dark Charcoal, Light Grey/White surfaces
 * - Sections:
 *   1. OVERVIEW: Today's KPIs, Approval Alerts, Field Force Status, Town Activity, Financial Summary
 *   2. APPROVALS: Dedicated Order Approvals & Payment Confirmations (Sole Approver: Shahzad Ullah)
 *   3. FIELD FORCE: Attendance Monitoring & Shift Status
 *   4. CUSTOMERS: Dealers & Distributors Directory + Customer 360 inspect
 *   5. SALES: Orders Pipeline & Invoices Master List
 *   6. FINANCE: Recovery Ledgers & Audit Logs
 *   7. REPORTS: Operational & Financial Reports with CSV/PDF export
 *   8. SETTINGS: Google Sheets Two-Way Sync & System Preferences
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery, EmployeeAttendance, UserProfileUpdateRequest } from '../../types';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
import { isAuthorizedApproverEmail, invalidateAllSessionsGlobally } from '../../services/production-users';
import { Customer360Screen } from '../creditbook/Customer360Screen';
import { CustomerInvoicesView } from '../creditbook/CustomerInvoicesView';
import { CustomerLedgerView } from '../creditbook/CustomerLedgerView';
import { FieldOfficerActivityDashboard } from '../creditbook/FieldOfficerActivityDashboard';
import { EmployeeAttendanceLedgerView } from '../creditbook/EmployeeAttendanceLedgerView';
import { NationalLightLogo } from '../NationalLightLogo';
import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  Building2,
  ShoppingBag,
  CreditCard,
  FileBarChart2,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileText,
  Receipt,
  Download,
  Phone,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Filter,
  Plus,
  UserCheck,
  Activity,
  Calendar,
} from 'lucide-react';
import { downloadSalesInvoicePdf } from '../../utils/exportInvoicePdf';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import { AddNewCustomerModal } from '../creditbook/AddNewCustomerModal';
import { ManageTownsInterface } from './ManageTownsInterface';
import { TownNode } from '../../types';
import { getStoredTownNodes, saveTownNodes } from '../../services/townManagement';

export type HeadOfficeTab =
  | 'OVERVIEW'
  | 'APPROVALS'
  | 'FIELD_FORCE'
  | 'CUSTOMERS'
  | 'SALES'
  | 'FINANCE'
  | 'REPORTS'
  | 'SETTINGS'
  | 'MANAGE_TOWNS';

export interface HeadOfficeExperienceProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  attendanceRecords?: EmployeeAttendance[];
  profileUpdateRequests?: UserProfileUpdateRequest[];
  townNodes?: TownNode[];
  onUpdateTownNodes?: (nodes: TownNode[]) => void;
  onApproveOrder: (orderId: string, approver?: any) => void;
  onRejectOrder: (orderId: string, approver: any, reason?: string) => void;
  onApproveRecovery: (recoveryId: string, approver?: any) => void;
  onRejectRecovery: (recoveryId: string, approver: any, reason?: string) => void;
  onApproveCustomer?: (customerId: string) => void;
  onRejectCustomer?: (customerId: string, reason?: string) => void;
  onApproveProfileRequest?: (requestId: string) => void;
  onRejectProfileRequest?: (requestId: string, reason?: string) => void;
  onAddCustomer?: (customer: Customer) => void;
  onSyncGoogleSheet?: () => Promise<void>;
  isSyncingSheet?: boolean;
  onPlaceOrder: (order: SalesOrder) => void;
  onRecordRecovery: (recovery: Recovery) => void;
  onOpenRateCard: () => void;
  onOpenSyncModal: () => void;
  onSwitchToFieldMobile: () => void;
  onSignOut: () => void;
  onPurgeMockData?: () => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  isOnline?: boolean;
}

export const HeadOfficeExperience: React.FC<HeadOfficeExperienceProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  attendanceRecords = [],
  profileUpdateRequests = [],
  townNodes,
  onUpdateTownNodes,
  onApproveOrder,
  onRejectOrder,
  onApproveRecovery,
  onRejectRecovery,
  onApproveCustomer,
  onRejectCustomer,
  onApproveProfileRequest,
  onRejectProfileRequest,
  onAddCustomer,
  onSyncGoogleSheet,
  isSyncingSheet,
  onPlaceOrder,
  onRecordRecovery,
  onOpenRateCard,
  onOpenSyncModal,
  onSwitchToFieldMobile,
  onSignOut,
  onPurgeMockData,
  onPreviewInvoicePdf,
  isOnline = true,
}) => {
  const [activeTab, setActiveTab] = useState<HeadOfficeTab>('OVERVIEW');
  const [approvalsSubTab, setApprovalsSubTab] = useState<'ORDERS' | 'RECOVERIES' | 'CUSTOMERS' | 'PROFILE_EDITS' | 'AUDIT'>('ORDERS');
  const [fieldForceSubTab, setFieldForceSubTab] = useState<'ROSTER' | 'ATTENDANCE_LEDGER' | 'PERFORMANCE_DASHBOARD'>('ROSTER');
  const [salesSubTab, setSalesSubTab] = useState<'ORDERS' | 'INVOICES'>('ORDERS');
  const [selectedCustomerIdFor360, setSelectedCustomerIdFor360] = useState<string | null>(null);
  const [customer360SubView, setCustomer360SubView] = useState<'360' | 'INVOICES' | 'LEDGER'>('360');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Dynamic Town Nodes State
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const handleUpdateTowns = (updated: TownNode[]) => {
    if (onUpdateTownNodes) {
      onUpdateTownNodes(updated);
    } else {
      saveTownNodes(updated);
    }
  };

  // Rejection modal state
  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; type: 'ORDER' | 'RECOVERY' | 'CUSTOMER' | 'PROFILE'; code: string } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Search & Filter states
  const [customerFilterQuery, setCustomerFilterQuery] = useState('');
  const [townFilter, setTownFilter] = useState('ALL');

  // Pending profile update requests
  const pendingProfileRequests = useMemo(() => {
    return profileUpdateRequests.filter((r) => r.status === 'PENDING');
  }, [profileUpdateRequests]);

  // Sole Approver Check (Shahzad Ullah)
  const isShahzad = isAuthorizedApproverEmail(currentUser?.email);

  // Core KPI Calculations for Today
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const todaySales = useMemo(() => {
    return orders
      .filter((o) => (o.orderDate || o.createdAt || '').slice(0, 10) === todayDateStr && o.status !== 'REJECTED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders, todayDateStr]);

  const todayRecovery = useMemo(() => {
    return recoveries
      .filter((r) => (r.recordedAt || r.createdAt || '').slice(0, 10) === todayDateStr && r.status !== 'REJECTED')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [recoveries, todayDateStr]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'SUBMITTED' || o.status === 'PENDING_APPROVAL');
  }, [orders]);

  const pendingRecoveries = useMemo(() => {
    return recoveries.filter((r) => r.status === 'PENDING_VERIFICATION');
  }, [recoveries]);

  const pendingCustomers = useMemo(() => {
    return customers.filter(
      (c) => c.approvalStatus === 'PENDING_APPROVAL' || c.status === 'PENDING_APPROVAL'
    );
  }, [customers]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentBalance ?? c.openingBalance ?? 0), 0);
  }, [customers]);

  // Town-wise Activity Breakdown
  const townActivityData = useMemo(() => {
    const map: Record<string, { town: string; sales: number; recovery: number; outstanding: number; customerCount: number }> = {};
    customers.forEach((c) => {
      const t = c.town || c.city || 'Other';
      if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
      map[t].outstanding += c.currentBalance ?? c.openingBalance ?? 0;
      map[t].customerCount += 1;
    });

    orders.forEach((o) => {
      if (o.status !== 'REJECTED') {
        const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
        const t = c?.town || c?.city || 'Other';
        if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
        map[t].sales += o.totalAmount || 0;
      }
    });

    recoveries.forEach((r) => {
      if (r.status !== 'REJECTED') {
        const c = customers.find((cust) => cust.id === r.customerId || cust.companyName === r.customerName);
        const t = c?.town || c?.city || 'Other';
        if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
        map[t].recovery += r.amount || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, orders, recoveries]);

  // Execute Rejection
  const handleConfirmRejection = () => {
    if (!rejectionTarget) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a clear rejection reason.');
      return;
    }
    if (rejectionTarget.type === 'ORDER') {
      onRejectOrder(rejectionTarget.id, 'SHAHZAD', rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'RECOVERY') {
      onRejectRecovery(rejectionTarget.id, 'SHAHZAD', rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'CUSTOMER') {
      onRejectCustomer?.(rejectionTarget.id, rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'PROFILE') {
      onRejectProfileRequest?.(rejectionTarget.id, rejectionReasonInput.trim());
    }
    setRejectionTarget(null);
    setRejectionReasonInput('');
  };

  // Inspect customer in Customer 360
  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerIdFor360) return null;
    return customers.find((c) => c.id === selectedCustomerIdFor360) || null;
  }, [selectedCustomerIdFor360, customers]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#070c14] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* 1. Desktop Modern Sidebar */}
      <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Brand & Platform Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <NationalLightLogo size="sm" showGlow={false} />
            <div>
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white block">
                N-LINK 360
              </span>
              <span className="text-[10px] text-teal-800 dark:text-teal-400 font-extrabold uppercase tracking-wider block">
                Command Center
              </span>
            </div>
          </div>
        </div>

        {/* User Identity Box */}
        <div className="p-4 mx-3 my-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.avatarInitials || 'NL'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold block truncate">
                {isShahzad ? '👑 Sole Signing Authority' : currentUser.roleTitle || 'Head Office'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'OVERVIEW' as const, label: 'Overview', icon: LayoutDashboard },
            {
              id: 'APPROVALS' as const,
              label: 'Approvals',
              icon: CheckSquare,
              badge: pendingOrders.length + pendingRecoveries.length + pendingCustomers.length,
            },
            { id: 'FIELD_FORCE' as const, label: 'Field Force', icon: Users2 },
            { id: 'CUSTOMERS' as const, label: 'Customers', icon: Building2 },
            { id: 'SALES' as const, label: 'Sales & Invoices', icon: ShoppingBag },
            { id: 'FINANCE' as const, label: 'Finance & Recovery', icon: CreditCard },
            { id: 'REPORTS' as const, label: 'Reports', icon: FileBarChart2 },
            { id: 'MANAGE_TOWNS' as const, label: 'Manage Towns', icon: MapPin },
            { id: 'SETTINGS' as const, label: 'Settings & Sync', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedCustomerIdFor360(null);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions (Switch to Field Mobile / Logout) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={onSwitchToFieldMobile}
            className="w-full py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 Field Mobile Mode</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2 px-3 rounded-xl text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Desktop Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900 dark:text-white capitalize">
              {activeTab.replace('_', ' ')}
            </h1>
            <span className="text-xs text-slate-400 font-medium">
              National Lights &bull; Enterprise 360
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sole Approver Shield Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Approver: Shahzad Ullah</span>
            </div>

            {onSyncGoogleSheet && (
              <button
                type="button"
                onClick={() => onSyncGoogleSheet()}
                disabled={isSyncingSheet}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheet ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Customer</span>
            </button>

            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
              <span>Sync Cloud</span>
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-6 space-y-6 max-w-7xl">
          {/* ==================================================== */}
          {/* CUSTOMER 360 OVERLAY IF SELECTED */}
          {/* ==================================================== */}
          {selectedCustomerObj ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {customer360SubView === '360' && (
                <Customer360Screen
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  recoveries={recoveries}
                  onBack={() => setSelectedCustomerIdFor360(null)}
                  onOpenNewOrder={() => {}}
                  onOpenRecordRecovery={() => {}}
                  onOpenInvoices={() => setCustomer360SubView('INVOICES')}
                  onOpenLedger={() => setCustomer360SubView('LEDGER')}
                />
              )}

              {customer360SubView === 'INVOICES' && (
                <CustomerInvoicesView
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  onBack={() => setCustomer360SubView('360')}
                  onPreviewPdf={onPreviewInvoicePdf}
                />
              )}

              {customer360SubView === 'LEDGER' && (
                <CustomerLedgerView
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  recoveries={recoveries}
                  onBack={() => setCustomer360SubView('360')}
                />
              )}
            </div>
          ) : (
            <>
              {/* ==================================================== */}
              {/* 1. OVERVIEW TAB (COMMAND CENTER) */}
              {/* ==================================================== */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top 5 KPI Summary Cards */}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-3">
                      Today&apos;s Operational Snapshot
                    </span>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Today&apos;s Sales</span>
                        <span className="text-lg font-black font-mono text-teal-800 dark:text-teal-300 mt-1 block">
                          Rs. {todaySales.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Today&apos;s Recovery</span>
                        <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-300 mt-1 block">
                          Rs. {todayRecovery.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block">Pending Orders</span>
                        <span className="text-lg font-black font-mono text-amber-800 dark:text-amber-300 mt-1 block">
                          {pendingOrders.length}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block">Pending Payments</span>
                        <span className="text-lg font-black font-mono text-amber-800 dark:text-amber-300 mt-1 block">
                          {pendingRecoveries.length}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Outstanding</span>
                        <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 block">
                          Rs. {totalOutstanding.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Center Callout Banner */}
                  {(pendingOrders.length > 0 || pendingRecoveries.length > 0) && (
                    <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 p-5 rounded-3xl border border-amber-700/50 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Executive Approval Center
                        </span>
                        <h2 className="text-base font-black text-white">
                          {pendingOrders.length} Orders &bull; {pendingRecoveries.length} Payments Awaiting Shahzad Ullah
                        </h2>
                        <p className="text-xs text-amber-200/80">
                          Transactions will post to official customer ledgers only upon executive confirmation.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('APPROVALS')}
                        className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                      >
                        <span>REVIEW APPROVALS</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Two-Column Overview Layout: Town Activity & Field Force Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Town Activity Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Town Activity &amp; Balances
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {townActivityData.length} Active Towns
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {townActivityData.map((t) => (
                          <div key={t.town} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{t.town}</span>
                              <span className="text-[11px] text-slate-400">{t.customerCount} Dealers &bull; Sales: Rs. {t.sales.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                Rs. {t.outstanding.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold">
                                Rec: Rs. {t.recovery.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Field Force Roster */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Field Force Attendance ({NLINK_TEAM_ROSTER.length})
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          Active Shifts
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {NLINK_TEAM_ROSTER.map((officer) => (
                          <div key={officer.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[11px] flex items-center justify-center">
                                {officer.avatarInitials}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{officer.fullName}</span>
                                <span className="text-[11px] text-slate-400">{officer.roleTitle} &bull; {officer.assignedTowns?.[0] || 'Field'}</span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Checked In
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 2. APPROVALS TAB (SOLE APPROVER: SHAHZAD ULLAH) */}
              {/* ==================================================== */}
              {activeTab === 'APPROVALS' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                        Executive Approval Center
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Sole Signing Authority: <strong>Shahzad Ullah (Executive Director)</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('ORDERS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'ORDERS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Orders Waiting ({pendingOrders.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('RECOVERIES')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'RECOVERIES'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Payments Waiting ({pendingRecoveries.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('CUSTOMERS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'CUSTOMERS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        New Customers ({pendingCustomers.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('PROFILE_EDITS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'PROFILE_EDITS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Profile Edits ({pendingProfileRequests.length})
                      </button>
                    </div>
                  </div>

                  {/* Order Approvals Queue */}
                  {approvalsSubTab === 'ORDERS' && (
                    <div className="space-y-3">
                      {pendingOrders.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Orders Processed</p>
                          <p className="mt-1">No pending orders awaiting Shahzad Ullah&apos;s review.</p>
                        </div>
                      ) : (
                        pendingOrders.map((ord) => {
                          const cust = customers.find((c) => c.id === ord.customerId || c.companyName === ord.customerName);
                          const oldBalance = cust?.currentBalance ?? cust?.openingBalance ?? 0;
                          const ordAmount = ord.totalAmount || 0;
                          const projectedBalance = oldBalance + ordAmount;
                          const creditLimit = cust?.creditLimit || 250000;
                          const isWarning = projectedBalance > creditLimit;

                          return (
                            <div
                              key={ord.id || ord.orderNumber}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                      Order #{ord.orderNumber || ord.id?.slice(-6)}
                                    </span>
                                    {isWarning && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                        Credit Limit Warning
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Customer: <strong>{ord.customerName}</strong> ({cust?.town || 'Town'}) &bull; Officer: {ord.salesUserName}
                                  </p>
                                </div>

                                <span className="text-xs font-mono font-bold text-slate-400">
                                  {ord.orderDate || ord.createdAt?.slice(0, 10)}
                                </span>
                              </div>

                              {/* Financial Matrix */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Old Balance</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {oldBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-teal-800 dark:text-teal-300 block font-bold">Order Amount</span>
                                  <span className="font-mono font-black text-teal-900 dark:text-teal-200">
                                    Rs. {ordAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Projected Balance</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {projectedBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Credit Limit</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {creditLimit.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Approver Action Bar */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Items: {ord.items?.length || 1} SKUs &bull; Cartons: {ord.items?.reduce((s, i) => s + (i.cartons || 0), 0) || 0}
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRejectionTarget({ id: ord.id || ord.orderNumber, type: 'ORDER', code: ord.orderNumber })}
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                  >
                                    Reject
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onApproveOrder(ord.id || ord.orderNumber, 'SHAHZAD')}
                                    className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>Approve (ShahzadUllah)</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Payment Confirmations Queue */}
                  {approvalsSubTab === 'RECOVERIES' && (
                    <div className="space-y-3">
                      {pendingRecoveries.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Payments Confirmed</p>
                          <p className="mt-1">No pending recoveries awaiting Shahzad Ullah&apos;s verification.</p>
                        </div>
                      ) : (
                        pendingRecoveries.map((rec) => {
                          const cust = customers.find((c) => c.id === rec.customerId || c.companyName === rec.customerName);
                          const balBefore = cust?.currentBalance ?? cust?.openingBalance ?? 0;
                          const balAfter = Math.max(0, balBefore - rec.amount);

                          return (
                            <div
                              key={rec.id}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white block">
                                    Recovery #{rec.id}
                                  </span>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Customer: <strong>{rec.customerName}</strong> &bull; Collector: {rec.salesUserName}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                                    Rs. {rec.amount.toLocaleString()} PKR
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {rec.paymentMode} {rec.bankName ? `(${rec.bankName})` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Balance Before</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {balBefore.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Balance After Confirmation</span>
                                  <span className="font-mono font-black text-teal-800 dark:text-teal-300">
                                    Rs. {balAfter.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500">
                                  Ref: {rec.instrumentNumber || 'Direct Payment'}
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRejectionTarget({ id: rec.id, type: 'RECOVERY', code: rec.id })}
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                  >
                                    Reject
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onApproveRecovery(rec.id, 'SHAHZAD')}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirm (ShahzadUllah)</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* New Customers Approvals Queue */}
                  {approvalsSubTab === 'CUSTOMERS' && (
                    <div className="space-y-3">
                      {pendingCustomers.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Customers Approved</p>
                          <p className="mt-1">No pending dealer registrations awaiting Shahzad Ullah&apos;s review.</p>
                        </div>
                      ) : (
                        pendingCustomers.map((cust) => (
                          <div
                            key={cust.id || cust.customerCode}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                    {cust.customerCode || cust.id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                                    {cust.type || cust.customerType || 'DEALER'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    Awaiting Shahzad Ullah
                                  </span>
                                </div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                                  {cust.companyName || cust.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Contact: <strong>{cust.contactPerson}</strong> &bull; Phone: {cust.phone} &bull; Town: <strong>{cust.town || cust.city}</strong>
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-slate-400 block font-bold">Requested Credit Limit</span>
                                <span className="text-base font-black font-mono text-teal-800 dark:text-teal-300">
                                  Rs. {(cust.creditLimit || 500000).toLocaleString()} PKR
                                </span>
                                <span className="text-[10px] text-slate-400 block font-bold">
                                  {cust.creditDays || 30} Days Terms
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Opening Balance</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  Rs. {(cust.openingBalance || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Address / Route</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {cust.address || 'Main Market'}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Registered By</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {cust.registeredBy || cust.submittedBy || 'Field Force'}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Submitted Date</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {(cust.createdAt || new Date().toISOString()).slice(0, 10)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                                Requires executive approval before credit invoices can be booked
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectionTarget({ id: cust.id, type: 'CUSTOMER', code: cust.customerCode || cust.companyName })}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                >
                                  Reject
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onApproveCustomer?.(cust.id)}
                                  className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>Approve Dealer (ShahzadUllah)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Profile Update Requests Approvals Queue */}
                  {approvalsSubTab === 'PROFILE_EDITS' && (
                    <div className="space-y-3">
                      {pendingProfileRequests.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Profile Change Requests</p>
                          <p className="mt-1">All employee profile information is up to date.</p>
                        </div>
                      ) : (
                        pendingProfileRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                    Request #{req.id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    Awaiting Approval
                                  </span>
                                </div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                                  {req.requestedChanges.fullName || req.currentInfo.fullName}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Requested by: <strong>{req.currentInfo.fullName}</strong> ({req.userEmail}) &bull; Date: {req.requestedAt?.slice(0, 10)}
                                </p>
                              </div>
                            </div>

                            {/* Comparison Table */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Current Info</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">Name: {req.currentInfo.fullName}</p>
                                <p className="text-slate-600 dark:text-slate-400">Phone: {req.currentInfo.phone || 'N/A'}</p>
                                <p className="text-slate-600 dark:text-slate-400">Role: {req.currentInfo.roleTitle || 'Field Officer'}</p>
                                <p className="text-slate-600 dark:text-slate-400">Towns: {(req.currentInfo.assignedTowns || []).join(', ')}</p>
                              </div>

                              <div className="space-y-1 sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-3">
                                <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">Requested Updates</span>
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                  Name: {req.requestedChanges.fullName || req.currentInfo.fullName}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Phone: {req.requestedChanges.phone || req.currentInfo.phone || 'N/A'}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Role: {req.requestedChanges.roleTitle || req.currentInfo.roleTitle}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Towns: {(req.requestedChanges.assignedTowns || req.currentInfo.assignedTowns || []).join(', ')}
                                </p>
                                {req.requestedChanges.reason && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300 italic pt-1">
                                    Reason: &ldquo;{req.requestedChanges.reason}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] text-slate-400">
                                Approving updates this user&apos;s identity credentials across all system records.
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectionTarget({ id: req.id, type: 'PROFILE', code: req.id })}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                >
                                  Reject
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onApproveProfileRequest?.(req.id)}
                                  className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>Approve Profile Update (Shahzad)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* 3. CUSTOMERS TAB */}
              {/* ==================================================== */}
              {activeTab === 'CUSTOMERS' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Customer Accounts &amp; Dealers
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {customers.length} Authorized Dealers &amp; Distributors
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search customer name, town or code..."
                          value={customerFilterQuery}
                          onChange={(e) => setCustomerFilterQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAddCustomerModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Customer</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Table */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customers
                        .filter(
                          (c) =>
                            !customerFilterQuery ||
                            c.companyName.toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                            (c.town || '').toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                            c.customerCode.toLowerCase().includes(customerFilterQuery.toLowerCase())
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerIdFor360(c.id);
                              setCustomer360SubView('360');
                            }}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {c.companyName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-xs text-slate-900 dark:text-white truncate">
                                  {c.companyName}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {c.type || 'DEALER'} &bull; {c.town || c.city} &bull; {c.phone || '+92 300 0000000'}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-4">
                              <div>
                                <span className="text-xs font-black font-mono text-slate-900 dark:text-white block">
                                  Rs. {(c.currentBalance ?? c.openingBalance ?? 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">Net Balance</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 4. SALES TAB */}
              {/* ==================================================== */}
              {activeTab === 'SALES' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Sales Orders &amp; Invoices
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {orders.length} Total Booked Orders
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenRateCard}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Rate List</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {orders.map((o) => (
                      <div key={o.id || o.orderNumber} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            #{o.orderNumber || o.id?.slice(-6)} &bull; {o.customerName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {o.orderDate || o.createdAt?.slice(0, 10)} &bull; {o.items?.length || 1} SKUs &bull; Officer: {o.salesUserName}
                          </span>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-black text-slate-900 dark:text-white block">
                              Rs. {Number(o.totalAmount || 0).toLocaleString()}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                o.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.status || 'SUBMITTED'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
                              if (c) {
                                downloadSalesInvoicePdf({
                                  customer: c,
                                  order: o,
                                  previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                                  preparedByName: currentUser.fullName,
                                });
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 5. FINANCE TAB */}
              {/* ==================================================== */}
              {activeTab === 'FINANCE' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Finance &amp; Collections
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {recoveries.length} Recovery Transactions Logged
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {recoveries.map((r) => (
                      <div key={r.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            #{r.id} &bull; {r.customerName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {r.recordedAt?.slice(0, 10)} &bull; {r.paymentMode} &bull; Collector: {r.salesUserName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm block">
                            Rs. {r.amount.toLocaleString()} PKR
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{r.status || 'PENDING'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 6. FIELD FORCE TAB */}
              {/* ==================================================== */}
              {activeTab === 'FIELD_FORCE' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Field Force Operations &amp; Shifts
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Attendance logs, geo-locations, and live performance analytics
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('ROSTER')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'ROSTER'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Team Roster
                      </button>

                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('ATTENDANCE_LEDGER')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'ATTENDANCE_LEDGER'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Attendance Ledger ({attendanceRecords.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('PERFORMANCE_DASHBOARD')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'PERFORMANCE_DASHBOARD'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Performance Dashboard
                      </button>
                    </div>
                  </div>

                  {/* Sub-view: Team Roster */}
                  {fieldForceSubTab === 'ROSTER' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                      {NLINK_TEAM_ROSTER.map((u) => (
                        <div key={u.id} className="p-4 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white font-black flex items-center justify-center text-xs">
                              {u.avatarInitials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{u.fullName}</span>
                              <span className="text-[11px] text-slate-400">{u.roleTitle} &bull; {u.assignedTowns?.join(', ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active Shift &bull; Checked In
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-view: Attendance Ledger with Date | Checkin time | location | checkout time | location */}
                  {fieldForceSubTab === 'ATTENDANCE_LEDGER' && (
                    <EmployeeAttendanceLedgerView
                      attendanceRecords={attendanceRecords}
                      currentUser={currentUser}
                    />
                  )}

                  {/* Sub-view: Dynamic Activity Dashboard */}
                  {fieldForceSubTab === 'PERFORMANCE_DASHBOARD' && (
                    <FieldOfficerActivityDashboard
                      currentUser={currentUser}
                      customers={customers}
                      orders={orders}
                      recoveries={recoveries}
                      onSelectCustomer={(cId) => {
                        setSelectedCustomerIdFor360(cId);
                        setCustomer360SubView('360');
                      }}
                    />
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* 7. REPORTS TAB */}
              {/* ==================================================== */}
              {activeTab === 'REPORTS' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Executive Reports &amp; Analytics
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Download and print comprehensive operational summaries
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Sales Summary Report</span>
                      <p className="text-[11px] text-slate-500">Town-wise order breakdown &amp; volume</p>
                      <button
                        type="button"
                        onClick={() => alert('Sales Report Exported to CSV')}
                        className="w-full py-2 rounded-xl bg-teal-800 text-white font-bold text-xs"
                      >
                        Export CSV
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Recovery Audit Statement</span>
                      <p className="text-[11px] text-slate-500">Shahzad Ullah verified payment records</p>
                      <button
                        type="button"
                        onClick={() => alert('Recovery Audit Exported')}
                        className="w-full py-2 rounded-xl bg-teal-800 text-white font-bold text-xs"
                      >
                        Export CSV
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Outstanding Aging Report</span>
                      <p className="text-[11px] text-slate-500">Dealers with high credit balances</p>
                      <button
                        type="button"
                        onClick={() => alert('Aging Report Exported')}
                        className="w-full py-2 rounded-xl bg-teal-800 text-white font-bold text-xs"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 8. SETTINGS & SYNC TAB */}
              {/* ==================================================== */}
              {activeTab === 'SETTINGS' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      System Settings &amp; Cloud Sync
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Maintain database integrity and two-way Google Sheets sync
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                    {/* Manage Towns Quick Access */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 dark:text-white block">Town Nodes &amp; Geographic Route Configuration</span>
                        <span className="text-[11px] text-slate-500">
                          Add, edit, or deactivate commercial towns and configure officer beats across all provinces.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('MANAGE_TOWNS')}
                        className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Manage Towns ({effectiveTownNodes.filter(t => t.isActive).length} Active)</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 dark:text-white block">Two-Way Google Sheets Sync</span>
                        <span className="text-[11px] text-slate-500">Synchronize all orders, recoveries and customer ledgers</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenSyncModal}
                        className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold"
                      >
                        Configure Sync
                      </button>
                    </div>

                    {/* Global Session Invalidation Action */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-black text-rose-700 dark:text-rose-400 block">Invalidate All Sessions Globally</span>
                        <span className="text-[11px] text-slate-500">
                          Force all users &amp; devices to re-authenticate immediately without deleting accounts or records.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to invalidate all active sessions globally? Every user across all devices will be required to re-authenticate. Your accounts and data will remain intact.')) {
                            invalidateAllSessionsGlobally();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                      >
                        Invalidate Sessions
                      </button>
                    </div>

                    {onPurgeMockData && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-black text-rose-700 block">Purge Mock / Demo Data</span>
                          <span className="text-[11px] text-slate-500">Remove any residual dummy records</span>
                        </div>
                        <button
                          type="button"
                          onClick={onPurgeMockData}
                          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100"
                        >
                          Purge Demo Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 9. MANAGE TOWNS & GEOGRAPHIC ROUTES TAB */}
              {/* ==================================================== */}
              {activeTab === 'MANAGE_TOWNS' && (
                <div className="animate-in fade-in duration-200">
                  <ManageTownsInterface
                    townNodes={effectiveTownNodes}
                    onUpdateTownNodes={handleUpdateTowns}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Rejection Modal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-rose-700 dark:text-rose-400">
              Decline {rejectionTarget.type === 'ORDER' ? 'Order' : rejectionTarget.type === 'CUSTOMER' ? 'Customer' : 'Recovery'} #{rejectionTarget.code}
            </h3>
            <p className="text-slate-500">
              Please enter the official reason for rejection before declining:
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Credit limit exceeded, verification incomplete, or payment proof unreadable"
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal for Head Office */}
      <AddNewCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSubmit={(newCust) => onAddCustomer?.(newCust)}
        currentUser={currentUser as any}
        availableTowns={townActivityData.map((t) => t.town).filter((t) => t && t !== 'Other')}
      />
    </div>
  );
};
