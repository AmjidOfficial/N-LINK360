/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Company Web Portal (Desktop / Office Application)
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Building,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Image,
  Layers,
  MapPin,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  Customer,
  CustomerVisit,
  Dispatch,
  InventoryBalance,
  Invoice,
  LedgerEntry,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  User as UserType,
} from '../types';
import { VisitsMapView } from './VisitsMapView';

interface CompanyPortalProps {
  currentUser: UserType;
  customers: Customer[];
  skus: SKU[];
  inventoryBalances: InventoryBalance[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  recoveries: Recovery[];
  ledgerEntries: LedgerEntry[];
  dispatches: Dispatch[];
  stockReturns: StockReturn[];
  visits: CustomerVisit[];
  registrationRequests: any[]; // Use any or CustomerRegistrationRequest from imports
  onPostInvoice: (orderId: string) => void;
  onDirectCreateInvoice: (invoiceData: Partial<Invoice>) => void;
  onVerifyRecovery: (recoveryId: string) => void;
  onApproveRegistration: (id: string, overrideLimit?: number, overrideDays?: number) => void;
  onRejectRegistration: (id: string, reason: string) => void;
  logoUrl?: string;
  onUpdateLogo: (url: string) => void;
  onRemoveLogo: () => void;
}

export const CompanyPortal: React.FC<CompanyPortalProps> = ({
  currentUser,
  customers,
  skus,
  inventoryBalances,
  salesOrders,
  invoices,
  recoveries,
  ledgerEntries,
  dispatches,
  stockReturns,
  visits,
  registrationRequests = [],
  onPostInvoice,
  onDirectCreateInvoice,
  onVerifyRecovery,
  onApproveRegistration,
  onRejectRegistration,
  logoUrl,
  onUpdateLogo,
  onRemoveLogo,
}) => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'ORDERS' | 'INVOICES' | 'INVENTORY' | 'CUSTOMERS' | 'RECOVERY' | 'LEDGER' | 'DISPATCH' | 'RETURNS' | 'VISITS' | 'REGISTRATIONS'
  >('OVERVIEW');

  // Local state for approval override values and rejection reasons
  const [approvalLimits, setApprovalLimits] = useState<Record<string, number>>({});
  const [approvalDays, setApprovalDays] = useState<Record<string, number>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const [activeRejectionId, setActiveRejectionId] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Logo customization, Invoice Builder, Print/Report Settings states
  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<{ skuId: string; quantity: number; discountPercent: number; unitPrice: number; skuCode: string; skuName: string }[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  
  const [tempSkuId, setTempSkuId] = useState('');
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [tempDiscountPercent, setTempDiscountPercent] = useState<number>(0);

  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  
  // Invoice Printing settings
  const [printShowHeader, setPrintShowHeader] = useState(true);
  const [printShowTerms, setPrintShowTerms] = useState(true);
  const [printShowSignatures, setPrintShowSignatures] = useState(true);
  const [printShowTax, setPrintShowTax] = useState(true);
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'RECEIPT'>('A4');

  // Generic Printable Report Overlay State
  const [printableReport, setPrintableReport] = useState<{
    title: string;
    headers: string[];
    rows: string[][];
  } | null>(null);

  // Calculations for executive overview
  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalSalesMTD = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalRecoveryMTD = recoveries
    .filter((r) => r.status === 'VERIFIED')
    .reduce((sum, r) => sum + r.amount, 0);
  const pendingRecoveryCount = recoveries.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const pendingOrdersCount = salesOrders.filter((o) => o.status === 'SUBMITTED').length;

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const customerLedger = ledgerEntries.filter((l) => l.customerId === activeCustomer?.id);

  // CSV Export Utility
  const exportToCSV = (data: any[], headers: string[], keys: string[], filename: string) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const item of data) {
      const row = keys.map((key) => {
        let val = item;
        if (key.includes('.')) {
          const parts = key.split('.');
          for (const part of parts) {
            val = val ? val[part] : '';
          }
        } else {
          val = item[key];
        }
        const stringVal = val !== undefined && val !== null ? String(val) : '';
        const escaped = stringVal.replace(/"/g, '""').replace(/\r?\n/g, ' ');
        return `"${escaped}"`;
      });
      csvRows.push(row.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Item to Invoice Builder
  const handleAddInvoiceItem = () => {
    if (!tempSkuId) return;
    const sku = skus.find((s) => s.id === tempSkuId);
    if (!sku) return;
    const existingIdx = invoiceItems.findIndex((it) => it.skuId === tempSkuId);
    if (existingIdx !== -1) {
      const updated = [...invoiceItems];
      updated[existingIdx].quantity += tempQuantity;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          skuId: tempSkuId,
          skuCode: sku.skuCode,
          skuName: sku.name,
          quantity: tempQuantity,
          discountPercent: tempDiscountPercent,
          unitPrice: sku.tradePrice,
        },
      ]);
    }
    setTempSkuId('');
    setTempQuantity(1);
    setTempDiscountPercent(0);
  };

  // Remove Item from Invoice Builder
  const handleRemoveInvoiceItem = (skuId: string) => {
    setInvoiceItems(invoiceItems.filter((it) => it.skuId !== skuId));
  };

  // Create Direct Invoice Action Handler
  const handleCreateDirectInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (invoiceItems.length === 0) {
      alert('Please add at least one product SKU to the invoice.');
      return;
    }

    // Check stock availability
    for (const item of invoiceItems) {
      const bal = inventoryBalances.find((b) => b.skuId === item.skuId);
      if (!bal || bal.quantityOnHand < item.quantity) {
        alert(`Insufficient stock for SKU ${item.skuCode}. Required: ${item.quantity}, Available in warehouse: ${bal?.quantityOnHand || 0}`);
        return;
      }
    }

    const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const calculatedDiscount = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discountPercent) / 100, 0);
    const calculatedTax = printShowTax ? Math.round((calculatedSubtotal - calculatedDiscount) * 0.18) : 0;
    const calculatedTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;

    const directInvoiceData: Partial<Invoice> = {
      customerId: invoiceCustomerId,
      invoiceDate: invoiceDate,
      dueDate: invoiceDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: calculatedSubtotal,
      discountAmount: calculatedDiscount,
      taxAmount: calculatedTax,
      totalAmount: calculatedTotal,
      items: invoiceItems.map((it) => ({
        id: `direct-item-${Date.now()}-${it.skuId}`,
        invoiceId: '',
        skuId: it.skuId,
        skuCode: it.skuCode,
        skuName: it.skuName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountAmount: (it.unitPrice * it.quantity * it.discountPercent) / 100,
        taxAmount: 0,
        lineTotal: it.quantity * it.unitPrice - (it.unitPrice * it.quantity * it.discountPercent) / 100,
      })),
    };

    onDirectCreateInvoice(directInvoiceData);

    // Reset direct builder
    setInvoiceCustomerId('');
    setInvoiceItems([]);
    setInvoiceDueDate('');
    setShowInvoiceCreator(false);
  };

  return (
    <div className="nl-fluid-container py-6 space-y-6">
      
      {/* Sub-Navigation Bar for Company Portal */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm overflow-x-auto flex items-center gap-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Management Overview
        </button>

        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'ORDERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-400" />
          Sales Orders
          {pendingOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'INVOICES'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-400" />
          Posted Invoices
        </button>

        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'INVENTORY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-amber-400" />
          Inventory Ledger
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          Customers & Credit
        </button>

        <button
          onClick={() => setActiveTab('RECOVERY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'RECOVERY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 text-amber-400" />
          Recovery Verification
          {pendingRecoveryCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px]">
              {pendingRecoveryCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'LEDGER'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          Customer Ledger (360°)
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'DISPATCH'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-400" />
          Logistics & Bility
        </button>

        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'RETURNS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          Returns & Damage
        </button>

        <button
          onClick={() => setActiveTab('VISITS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'VISITS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-500" />
          Field Officer Visits
          <span className="px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px]">
            {visits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REGISTRATIONS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
            activeTab === 'REGISTRATIONS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Lead Registrations
          {registrationRequests.filter(r => r.status === 'PENDING_APPROVAL').length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px] animate-pulse">
              {registrationRequests.filter(r => r.status === 'PENDING_APPROVAL').length}
            </span>
          )}
        </button>
      </div>

      {/* 1. OVERVIEW COCKPIT */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          
          {/* Key Metric Cards */}
          <div className="nl-card-grid">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Market Outstanding</span>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  PKR {totalOutstanding.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Across 3 Distributors & Dealers</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Invoiced Sales (MTD)</span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  PKR {totalSalesMTD.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">Target: PKR 5,000,000 (74% Achieved)</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Recovery Realized (MTD)</span>
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-sky-700">
                  PKR {totalRecoveryMTD.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-sky-600 font-medium mt-1">
                {pendingRecoveryCount} pending verification
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Central Warehouse Stock</span>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {inventoryBalances.reduce((sum, b) => sum + b.quantityOnHand, 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">Units</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">5 Core National Lights SKUs</p>
            </div>

          </div>

          {/* Corporate Logo & Branding Identity Control */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Corporate Branding & Logo Control</h3>
                <p className="text-[11px] text-slate-500">Update corporate logo dynamically across the N-LINK 360 ecosystem.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column: Live Preview */}
              <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Preview</span>
                <div className="flex gap-4">
                  {/* Light background preview */}
                  <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center w-24 h-24">
                    {logoUrl ? (
                      <img src={logoUrl} className="max-h-16 max-w-16 object-contain" alt="Preview Light" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg">NL</div>
                    )}
                    <span className="text-[9px] text-slate-400 mt-2">Light BG</span>
                  </div>
                  {/* Dark background preview */}
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 shadow-sm flex flex-col items-center justify-center w-24 h-24">
                    {logoUrl ? (
                      <img src={logoUrl} className="max-h-16 max-w-16 object-contain" alt="Preview Dark" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg">NL</div>
                    )}
                    <span className="text-[9px] text-slate-400 mt-2">Dark BG</span>
                  </div>
                </div>
                {logoUrl && (
                  <button
                    onClick={onRemoveLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                  </button>
                )}
              </div>

              {/* Right Column: Custom URL / Preset Selector / Upload */}
              <div className="md:col-span-8 space-y-4">
                {/* Preset Options */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">Option A: Choose a Professional Corporate Preset</span>
                  <div className="nl-action-grid">
                    <button
                      onClick={() => onUpdateLogo('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%230f172a"/><circle cx="50" cy="45" r="22" stroke="%23f59e0b" stroke-width="6" fill="%231e293b"/><path d="M40 70h20M43 75h14M47 80h6" stroke="%23f59e0b" stroke-width="4" stroke-linecap="round"/><path d="M50 28v12M40 45h6M54 45h6" stroke="%23fbbf24" stroke-width="4" stroke-linecap="round"/></svg>')}
                      className="p-2 border border-slate-200 hover:border-amber-500 hover:bg-amber-50/20 rounded-lg text-left text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <div className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-amber-500">★</div>
                      Glow Gold
                    </button>
                    <button
                      onClick={() => onUpdateLogo('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23064e3b"/><circle cx="50" cy="50" r="20" fill="%2310b981"/><path d="M50 20 L30 55 H45 V80 L70 45 H55 Z" fill="%23ffffff"/></svg>')}
                      className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg text-left text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <div className="w-6 h-6 rounded bg-emerald-900 flex items-center justify-center text-[10px] font-black text-white">▲</div>
                      Emerald Eco
                    </button>
                    <button
                      onClick={() => onUpdateLogo('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23020617"/><path d="M30 30h40v40H30z" stroke="%2338bdf8" stroke-width="8"/><circle cx="50" cy="50" r="12" fill="%23f8fafc"/></svg>')}
                      className="p-2 border border-slate-200 hover:border-sky-500 hover:bg-sky-50/20 rounded-lg text-left text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <div className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-[10px] font-black text-sky-400">◆</div>
                      Minimal Tech
                    </button>
                    <button
                      onClick={() => onUpdateLogo('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%234c0519"/><circle cx="50" cy="50" r="25" stroke="%23f43f5e" stroke-width="5"/><path d="M35 50 C35 35, 65 35, 65 50 C65 65, 35 65, 35 50" fill="%23f43f5e"/></svg>')}
                      className="p-2 border border-slate-200 hover:border-rose-500 hover:bg-rose-50/20 rounded-lg text-left text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <div className="w-6 h-6 rounded bg-rose-950 flex items-center justify-center text-[10px] font-black text-rose-500">●</div>
                      Ruby Luxury
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {/* Option B: Local File Upload */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">Option B: Upload Custom Logo Image</span>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/5 p-3 rounded-lg cursor-pointer transition-all">
                      <Download className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-600">Select File (PNG/JPG/SVG)</span>
                      <span className="text-[9px] text-slate-400">File is processed locally to Base64</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                onUpdateLogo(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Option C: Image URL */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Option C: Enter Custom Image URL</span>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const input = form.elements.namedItem('logo_url_input') as HTMLInputElement;
                        if (input && input.value) {
                          onUpdateLogo(input.value);
                        }
                      }}
                      className="flex gap-1.5"
                    >
                      <input
                        name="logo_url_input"
                        type="url"
                        placeholder="https://example.com/logo.png"
                        defaultValue={logoUrl && logoUrl.startsWith('http') ? logoUrl : ''}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg transition-colors"
                      >
                        Apply
                      </button>
                    </form>
                    <p className="text-[10px] text-slate-400 mt-1">Provide a direct secure link (`https://`) to your corporate logo asset.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Matrix & Supply Chain Pipeline */}
          <div className="nl-page-grid">
            
            {/* Orders Requiring Action */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Recent Sales Orders & Credit Check Status
                </h3>
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                >
                  View All ({salesOrders.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Field Officer</th>
                      <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                      <th className="py-2.5 px-3 text-center">Credit Tier</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {salesOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 font-sans">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{order.orderNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{order.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{order.salesUserName}</td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                          {order.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            order.creditCheckStatus === 'GREEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.creditCheckStatus === 'AMBER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {order.creditCheckStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            order.status === 'INVOICED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800 font-bold'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse Stock Alert Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                Live Stock Status
              </h3>
              <div className="space-y-3 text-xs">
                {inventoryBalances.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{item.skuCode}</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.quantityOnHand.toLocaleString()} {item.quantityOnHand <= 500 ? '⚠️' : '✅'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.skuName}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Reserved: {item.quantityReserved}</span>
                      <span>Available: {item.availableQuantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. SALES ORDERS & INVOICING PIPELINE */}
      {activeTab === 'ORDERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sales Order Pipeline & Verification</h2>
              <p className="text-xs text-slate-500">
                Authoritative server-side credit checks, pricing verification, and atomic invoice generation.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Pipeline actions for {salesOrders.length} records</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  salesOrders,
                  ['OrderNumber', 'OrderDate', 'CustomerName', 'SalesUserName', 'TotalAmount', 'CreditCheckStatus', 'Status'],
                  ['orderNumber', 'orderDate', 'customerName', 'salesUserName', 'totalAmount', 'creditCheckStatus', 'status'],
                  'Sales_Orders_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Sales Orders Pipeline Report',
                  headers: ['Order #', 'Date', 'Customer (Dealer)', 'Field Officer', 'Total Amount (PKR)', 'Credit Tier', 'Status'],
                  rows: salesOrders.map(o => [
                    o.orderNumber,
                    o.orderDate,
                    o.customerName,
                    o.salesUserName,
                    o.totalAmount.toLocaleString(),
                    o.creditCheckStatus,
                    o.status
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Sales/Recovery Officer</th>
                  <th className="py-3 px-3">Order Items</th>
                  <th className="py-3 px-3 text-right">Order Subtotal</th>
                  <th className="py-3 px-3 text-center">Credit Evaluation</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">{order.orderDate}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{order.customerName}</td>
                    <td className="py-3 px-3 text-slate-600">{order.salesUserName}</td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="space-y-0.5">
                        {order.items.map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-600">
                            {it.orderedQuantity}x {it.skuCode} @ PKR {it.unitPrice}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      PKR {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          order.creditCheckStatus === 'GREEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.creditCheckStatus === 'AMBER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {order.creditCheckStatus}
                        </span>
                        {order.creditCheckNotes && (
                          <span className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate">
                            {order.creditCheckNotes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        order.status === 'INVOICED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {order.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => onPostInvoice(order.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs transition-all shadow-sm"
                        >
                          Generate Invoice
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-mono font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Invoiced
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. POSTED INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-4 gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {showInvoiceCreator ? 'Create Direct Sales Invoice' : 'Official Sales Invoices'}
              </h2>
              <p className="text-xs text-slate-500">
                {showInvoiceCreator
                  ? 'Generate a direct commercial invoice. Deducts warehouse stock immediately and debits customer balance.'
                  : 'Posted invoices are immutable. Every invoice automatically posted stock-out and debited customer ledger.'}
              </p>
            </div>
            {showInvoiceCreator && (
              <button
                onClick={() => setShowInvoiceCreator(false)}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 text-xs font-bold transition-all"
              >
                Cancel Builder
              </button>
            )}
          </div>

          {showInvoiceCreator ? (
            /* ============ DIRECT INVOICE FORM CREATOR ============ */
            <form onSubmit={handleCreateDirectInvoiceSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Select Dealer / Distributor*</label>
                  <select
                    required
                    value={invoiceCustomerId}
                    onChange={(e) => setInvoiceCustomerId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerCode}) - Bal: PKR {c.currentBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Invoice Date*</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Due Date (Credit Overdue Cutoff)</label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    placeholder="Auto-calculates +30 credit days"
                  />
                </div>
              </div>

              {/* Product Lines Builder */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Add Product Line Items</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* SKU Select */}
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium">Select SKU Brand*</label>
                    <select
                      value={tempSkuId}
                      onChange={(e) => setTempSkuId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose National Lights SKU --</option>
                      {skus.map((s) => {
                        const bal = inventoryBalances.find((b) => b.skuId === s.id);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.skuCode} - {s.name} (PKR {s.tradePrice} | Stock: {bal?.quantityOnHand || 0})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium">Quantity*</label>
                    <input
                      type="number"
                      min={1}
                      value={tempQuantity}
                      onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Discount */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium">Trade Disc %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tempDiscountPercent}
                      onChange={(e) => setTempDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddInvoiceItem}
                      disabled={!tempSkuId}
                      className="w-full p-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-amber-400 disabled:text-slate-400 font-bold text-xs rounded-lg transition-colors h-[34px] flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Line
                    </button>
                  </div>
                </div>

                {/* Line Items Grid */}
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 italic">No line items added yet. Choose products above to compile.</div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                    <table className="w-full text-left text-[11px] font-sans">
                      <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2 px-3">SKU Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Price (PKR)</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-center">Disc %</th>
                          <th className="py-2 px-3 text-right font-semibold">Total Amount (PKR)</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {invoiceItems.map((item, index) => {
                          const lineSubtotal = item.quantity * item.unitPrice;
                          const discount = (lineSubtotal * item.discountPercent) / 100;
                          const lineTotal = lineSubtotal - discount;
                          const bal = inventoryBalances.find((b) => b.skuId === item.skuId);
                          const isOOS = bal ? item.quantity > bal.quantityOnHand : true;

                          return (
                            <tr key={item.skuId + '-' + index} className={`hover:bg-slate-50/50 ${isOOS ? 'bg-rose-50/40' : ''}`}>
                              <td className="py-2 px-3 font-bold text-slate-900">{item.skuCode}</td>
                              <td className="py-2 px-3 text-slate-500 font-sans">{item.skuName}</td>
                              <td className="py-2 px-3 text-right text-slate-600">{item.unitPrice.toLocaleString()}</td>
                              <td className="py-2 px-3 text-center text-slate-900 font-sans font-semibold">
                                {item.quantity}
                                {isOOS && (
                                  <span className="block text-[8px] text-rose-600 font-bold uppercase animate-pulse">Deficit (Max {bal?.quantityOnHand || 0})</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">{item.discountPercent}%</td>
                              <td className="py-2 px-3 text-right text-slate-900 font-bold">{lineTotal.toLocaleString()}</td>
                              <td className="py-2 px-3 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvoiceItem(item.skuId)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Summaries & Validations */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Credit Check Status Alerts */}
                <div className="md:col-span-7 space-y-3">
                  {invoiceCustomerId && (
                    <div className="p-4 rounded-xl border space-y-2 text-xs bg-slate-50 border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">Direct Ledger Check</span>
                      {(() => {
                        const customer = customers.find((c) => c.id === invoiceCustomerId);
                        if (!customer) return null;

                        const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
                        const calculatedDiscount = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discountPercent) / 100, 0);
                        const calculatedTax = printShowTax ? Math.round((calculatedSubtotal - calculatedDiscount) * 0.18) : 0;
                        const invoiceTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;
                        const projectedOutstanding = customer.currentBalance + invoiceTotal;
                        const creditLimit = customer.creditLimit;
                        const isViolated = projectedOutstanding > creditLimit;

                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[9px] font-sans">Current Ledger Balance:</span>
                                <span className="font-bold text-slate-700">PKR {customer.currentBalance.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] font-sans">Corporate Credit Limit:</span>
                                <span className="font-bold text-slate-700">PKR {creditLimit.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] font-sans">New Invoice Total:</span>
                                <span className="font-bold text-slate-900">PKR {invoiceTotal.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] font-sans">Projected Outstanding:</span>
                                <span className={`font-bold ${isViolated ? 'text-rose-600' : 'text-emerald-700'}`}>
                                  PKR {projectedOutstanding.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {isViolated ? (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-sans flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="font-bold block text-[11px]">CREDIT WARNING: LIMIT EXCEEDED</strong>
                                  <span className="text-[10px] block mt-0.5">
                                    Projected outstanding balance exceeds approved credit limit by <strong className="font-bold font-mono">PKR {(projectedOutstanding - creditLimit).toLocaleString()}</strong>. Standard corporate rules require supervisory override code or head-office validation before dispatch.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 font-sans flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-[10px]">Accounts Verification: Ledger remains within approved safety credit parameters. Approved.</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Stock Warnings */}
                  {invoiceItems.some((it) => {
                    const bal = inventoryBalances.find((b) => b.skuId === it.skuId);
                    return bal ? it.quantity > bal.quantityOnHand : true;
                  }) && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <strong className="font-bold block">WAREHOUSE STOCK CONFLICT ERROR</strong>
                        <span className="text-[10px] block mt-0.5">
                          You have compiled quantity limits that exceed the actual physical balances in Lahore central warehouse. Please correct deficits before posting.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals Summary Panel */}
                <div className="md:col-span-5 bg-slate-900 text-white rounded-xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commercial Ledger Summary</span>
                  {(() => {
                    const calculatedSubtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
                    const calculatedDiscount = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discountPercent) / 100, 0);
                    const calculatedTax = printShowTax ? Math.round((calculatedSubtotal - calculatedDiscount) * 0.18) : 0;
                    const calculatedTotal = calculatedSubtotal - calculatedDiscount + calculatedTax;

                    return (
                      <div className="space-y-3 text-xs font-mono">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                          <span className="text-slate-400">Items Gross Subtotal:</span>
                          <span className="font-bold">PKR {calculatedSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2 text-rose-400">
                          <span>Trade Discount:</span>
                          <span className="font-bold">- PKR {calculatedDiscount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-300">
                          <span className="flex items-center gap-1 font-sans">
                            <input
                              type="checkbox"
                              checked={printShowTax}
                              onChange={(e) => setPrintShowTax(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                            />
                            Apply standard tax (GST 18%)
                          </span>
                          <span className="font-bold">PKR {calculatedTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base border-t border-slate-700 pt-3 text-amber-400 font-sans">
                          <span className="font-bold">Total Net Payable:</span>
                          <span className="font-mono font-black">PKR {calculatedTotal.toLocaleString()}</span>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            !invoiceCustomerId ||
                            invoiceItems.length === 0 ||
                            invoiceItems.some((it) => {
                              const bal = inventoryBalances.find((b) => b.skuId === it.skuId);
                              return bal ? it.quantity > bal.quantityOnHand : true;
                            })
                          }
                          className="w-full mt-4 p-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-bold rounded-lg text-xs transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                          <FileCheck className="w-4 h-4" /> Post & Register Invoice
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </form>
          ) : (
            /* ============ INVOICES LIST TABLE ============ */
            <div className="space-y-4">
              {/* Controls and Actions Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoices by customer, number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowInvoiceCreator(true);
                      setInvoiceCustomerId(customers[0]?.id || '');
                      setInvoiceItems([]);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Direct Invoice
                  </button>
                  <button
                    onClick={() =>
                      exportToCSV(
                        invoices,
                        ['InvoiceNumber', 'InvoiceDate', 'CustomerName', 'PreviousBalance', 'TotalAmount', 'NewBalance', 'Status'],
                        ['invoiceNumber', 'invoiceDate', 'customerName', 'previousBalance', 'totalAmount', 'newBalance', 'status'],
                        'Posted_Invoices_Report'
                      )
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" /> Export CSV
                  </button>
                  <button
                    onClick={() =>
                      setPrintableReport({
                        title: 'Posted Official Sales Invoices Ledger',
                        headers: ['Invoice #', 'Date', 'Distributor / Dealer', 'Prev Balance (PKR)', 'Invoice Amount (PKR)', 'New Balance (PKR)', 'Status'],
                        rows: invoices.map((i) => [
                          i.invoiceNumber,
                          i.invoiceDate,
                          i.customerName,
                          i.previousBalance.toLocaleString(),
                          i.totalAmount.toLocaleString(),
                          i.newBalance.toLocaleString(),
                          i.status,
                        ]),
                      })
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-500" /> Print Report
                  </button>
                </div>
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-3 px-3">Invoice Number</th>
                      <th className="py-3 px-3">Invoice Date</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3 text-right">Previous Balance</th>
                      <th className="py-3 px-3 text-right">Invoice Amount</th>
                      <th className="py-3 px-3 text-right">New Balance</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices
                      .filter(
                        (inv) =>
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{inv.invoiceDate}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">{inv.customerName}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            PKR {inv.previousBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            PKR {inv.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                            PKR {inv.newBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedInvoiceForPrint(inv)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-amber-800 text-xs font-semibold flex items-center gap-1 mx-auto"
                            >
                              <Printer className="w-3.5 h-3.5" /> View & Print
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INVENTORY LEDGER */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Central Warehouse Stock Ledger</h2>
              <p className="text-xs text-slate-500">
                Transaction-based inventory: Opening Stock + Stock In - Stock Out = Current Stock.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Active balances for {skus.length} corporate items</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  inventoryBalances.map(b => {
                    const sku = skus.find(s => s.id === b.skuId);
                    return {
                      skuCode: b.skuCode,
                      name: b.skuName,
                      opening: b.openingStock,
                      stockIn: b.stockIn,
                      stockOut: b.stockOut,
                      available: b.availableQuantity,
                      quantityOnHand: b.quantityOnHand
                    };
                  }),
                  ['SkuCode', 'ProductName', 'OpeningStock', 'StockIn', 'StockOut', 'AvailableStock', 'OnHandQuantity'],
                  ['skuCode', 'name', 'opening', 'stockIn', 'stockOut', 'available', 'quantityOnHand'],
                  'Warehouse_Inventory_Balances'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Central Warehouse Inventory & Balances Report',
                  headers: ['SKU Code', 'Description', 'Opening', 'Stock In', 'Stock Out', 'Available', 'On Hand'],
                  rows: inventoryBalances.map(b => [
                    b.skuCode,
                    b.skuName,
                    b.openingStock.toString(),
                    b.stockIn.toString(),
                    b.stockOut.toString(),
                    b.availableQuantity.toString(),
                    b.quantityOnHand.toString()
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="nl-card-grid">
            {skus.map((sku) => {
              const balance = inventoryBalances.find((b) => b.skuId === sku.id);
              return (
                <div key={sku.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                        {sku.skuCode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{sku.name}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Trade Price:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {sku.tradePrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Retail Price:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {sku.retailPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Carton Packaging:</span>
                      <span className="font-mono text-slate-800">{sku.cartonQuantity} pcs / carton</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reorder Level:</span>
                      <span className="font-mono text-slate-800">{sku.reorderLevel} units</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t text-xs font-mono">
                    <span className="text-slate-500 font-sans">Current Warehouse Stock:</span>
                    <span className="text-base font-bold text-slate-900">
                      {balance?.quantityOnHand.toLocaleString() || 0} Units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CUSTOMERS & CREDIT */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer Portfolio & Credit Limits</h2>
              <p className="text-xs text-slate-500">
                Distributors and Dealers across Pakistan. Accounts managed strictly through credit rules.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Portfolios of {customers.length} business channel partners</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  customers,
                  ['CustomerCode', 'CompanyName', 'ContactPerson', 'Phone', 'Type', 'City', 'Region', 'CreditLimit', 'CurrentOutstanding', 'Status'],
                  ['customerCode', 'companyName', 'contactPerson', 'phone', 'type', 'city', 'region', 'creditLimit', 'currentBalance', 'status'],
                  'Distributors_Dealers_Credit_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Customers, Distributors & Dealers Credit Portfolio Report',
                  headers: ['Code', 'Company Name', 'Contact Person', 'Type', 'Location', 'Credit Limit (PKR)', 'Outstanding (PKR)', 'Status'],
                  rows: customers.map(c => [
                    c.customerCode,
                    c.companyName,
                    c.contactPerson,
                    c.type,
                    `${c.city}, ${c.region}`,
                    c.creditLimit.toLocaleString(),
                    c.currentBalance.toLocaleString(),
                    c.status
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Company / Customer Name</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">City / Region</th>
                  <th className="py-3 px-3 text-right">Credit Limit</th>
                  <th className="py-3 px-3 text-right">Current Outstanding</th>
                  <th className="py-3 px-3 text-center">Credit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{cust.customerCode}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{cust.companyName}</td>
                    <td className="py-3 px-3 text-slate-600">{cust.contactPerson} ({cust.phone})</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cust.type === 'DISTRIBUTOR' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cust.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{cust.city}, {cust.region}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      PKR {cust.creditLimit.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                      PKR {cust.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        cust.isCreditLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {cust.isCreditLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. RECOVERY VERIFICATION */}
      {activeTab === 'RECOVERY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Accounts Recovery Verification</h2>
              <p className="text-xs text-slate-500">
                Review payment instruments collected by the unified Sales & Recovery field team before ledger posting.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Verification records for {recoveries.length} field payments</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  recoveries,
                  ['RecoveryNumber', 'CollectionDate', 'CustomerName', 'SalesUserName', 'PaymentMode', 'BankName', 'ChequeNumber', 'Amount', 'Status'],
                  ['recoveryNumber', 'collectionDate', 'customerName', 'salesUserName', 'paymentMode', 'bankName', 'chequeNumber', 'amount', 'status'],
                  'Accounts_Recovery_Collections_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Accounts Recovery & Field Collections Report',
                  headers: ['Recov #', 'Date', 'Customer', 'Collected By', 'Mode', 'Instrument / Bank Details', 'Amount (PKR)', 'Status'],
                  rows: recoveries.map(r => [
                    r.recoveryNumber,
                    r.collectionDate,
                    r.customerName,
                    r.salesUserName,
                    r.paymentMode,
                    `${r.bankName || 'N/A'} - No: ${r.chequeNumber || 'N/A'}`,
                    r.amount.toLocaleString(),
                    r.status
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Recovery #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Collected By</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3">Instrument / Bank</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recoveries.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{rec.recoveryNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rec.collectionDate}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{rec.customerName}</td>
                    <td className="py-3 px-3 text-slate-600">{rec.salesUserName}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{rec.paymentMode}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {rec.instrumentNumber ? `${rec.instrumentNumber} (${rec.bankName})` : 'Cash Receipt'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      PKR {rec.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        rec.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rec.status === 'PENDING_VERIFICATION' ? (
                        <button
                          onClick={() => onVerifyRecovery(rec.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                        >
                          Verify & Post
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-mono font-semibold">
                          Verified by {rec.verifiedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. CUSTOMER LEDGER (360 VIEW) */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer 360° Account Ledger</h2>
              <p className="text-xs text-slate-500">
                Formula: Opening Balance + Debits (Invoices) - Credits (Recoveries/Notes) = Running Balance
              </p>
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Select Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Summary Card */}
          <div className="p-4 bg-slate-900 text-white rounded-xl nl-card-grid">
            <div>
              <span className="text-xs text-slate-400 block">Customer Code:</span>
              <span className="font-mono font-bold text-amber-400">{activeCustomer.customerCode}</span>
              <div className="text-sm font-bold text-white mt-0.5">{activeCustomer.companyName}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Credit Limit:</span>
              <span className="font-mono font-bold text-lg text-white">
                PKR {activeCustomer.creditLimit.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Approved Credit Days:</span>
              <span className="font-mono font-bold text-lg text-white">{activeCustomer.creditDays} Days</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Current Outstanding Balance:</span>
              <span className="font-mono font-bold text-xl text-amber-400">
                PKR {activeCustomer.currentBalance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Ledger entries for {activeCustomer.companyName} ({customerLedger.length} records)</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  customerLedger,
                  ['EntryNumber', 'EntryDate', 'TransactionType', 'Description', 'DebitAmount', 'CreditAmount', 'RunningBalance'],
                  ['entryNumber', 'entryDate', 'transactionType', 'description', 'debitAmount', 'creditAmount', 'runningBalance'],
                  `Ledger_${activeCustomer.customerCode}_${activeCustomer.companyName.replace(/\s+/g, '_')}`
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: `360° Account Ledger: ${activeCustomer.companyName} (${activeCustomer.customerCode})`,
                  headers: ['Entry #', 'Date', 'Type', 'Reference / Description', 'Debit Amount', 'Credit Amount', 'Running Balance'],
                  rows: customerLedger.map(e => [
                    e.entryNumber,
                    e.entryDate,
                    e.transactionType,
                    e.description,
                    e.debitAmount > 0 ? `PKR ${e.debitAmount.toLocaleString()}` : '-',
                    e.creditAmount > 0 ? `PKR ${e.creditAmount.toLocaleString()}` : '-',
                    `PKR ${e.runningBalance.toLocaleString()}`
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Entry #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Transaction Type</th>
                  <th className="py-3 px-3">Reference / Description</th>
                  <th className="py-3 px-3 text-right">Debit (PKR)</th>
                  <th className="py-3 px-3 text-right">Credit (PKR)</th>
                  <th className="py-3 px-3 text-right">Running Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {customerLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 font-sans">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{entry.entryNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{entry.entryDate}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                        {entry.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{entry.description}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {entry.debitAmount > 0 ? entry.debitAmount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {entry.creditAmount > 0 ? entry.creditAmount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 text-sm">
                      {entry.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. LOGISTICS & DISPATCH */}
      {activeTab === 'DISPATCH' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Logistics, Bility & Transit Tracking</h2>
              <p className="text-xs text-slate-500">
                Track carrier, vehicle, driver, and Bility status from warehouse to customer destination.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Active logistics records for {dispatches.length} consignments</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  dispatches,
                  ['DispatchNumber', 'BilityNumber', 'TransporterName', 'VehicleNumber', 'DriverName', 'DriverPhone', 'AddaName', 'FreightCharges', 'DispatchDate', 'Status'],
                  ['dispatchNumber', 'bilityNumber', 'transporterName', 'vehicleNumber', 'driverName', 'driverPhone', 'addaName', 'freightCharges', 'dispatchDate', 'status'],
                  'Logistics_Consignments_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Logistics, Bility & Consignments Transit Report',
                  headers: ['Dispatch #', 'Bility #', 'Transporter', 'Vehicle', 'Driver', 'Adda Name', 'Freight (PKR)', 'Dispatch Date', 'Status'],
                  rows: dispatches.map(d => [
                    d.dispatchNumber,
                    d.bilityNumber,
                    d.transporterName,
                    d.vehicleNumber,
                    `${d.driverName} (${d.driverPhone})`,
                    d.addaName,
                    d.freightCharges.toLocaleString(),
                    d.dispatchDate,
                    d.status
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {dispatches.map((dsp) => (
              <div key={dsp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">{dsp.dispatchNumber}</span>
                    <span className="text-xs text-slate-500 font-mono font-medium">Bility: {dsp.bilityNumber}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-xs self-start">
                    {dsp.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Transporter:</span>
                    <span className="font-semibold text-slate-800">{dsp.transporterName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vehicle & Driver:</span>
                    <span className="font-semibold text-slate-800">
                      {dsp.vehicleNumber} • {dsp.driverName} ({dsp.driverPhone})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Adda / Terminal:</span>
                    <span className="font-semibold text-slate-800">{dsp.addaName}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between font-mono">
                  <span>Dispatch Date: {dsp.dispatchDate}</span>
                  <span>Freight: PKR {dsp.freightCharges.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. REVERSE LOGISTICS & DAMAGE */}
      {activeTab === 'RETURNS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reverse Logistics & Damage Stock</h2>
              <p className="text-xs text-slate-500">
                Customer returns inspection, defective stock quarantine, and credit note issuance.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Claims records for {stockReturns.length} return consignments</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  stockReturns.map(r => ({
                    returnNumber: r.returnNumber,
                    customerName: r.customerName,
                    createdByUserName: r.createdByUserName,
                    createdDate: r.createdDate,
                    totalRefundAmount: r.totalRefundAmount,
                    status: r.status
                  })),
                  ['ReturnNumber', 'CustomerName', 'FieldOfficer', 'CreatedDate', 'RefundAmount', 'Status'],
                  ['returnNumber', 'customerName', 'createdByUserName', 'createdDate', 'totalRefundAmount', 'status'],
                  'Stock_Returns_Claims_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Reverse Logistics & Stock Returns Claim Report',
                  headers: ['Return #', 'Customer Name', 'Collected By', 'Date Received', 'Credit Refund Amount (PKR)', 'Status'],
                  rows: stockReturns.map(r => [
                    r.returnNumber,
                    r.customerName,
                    r.createdByUserName,
                    r.createdDate,
                    `PKR ${r.totalRefundAmount.toLocaleString()}`,
                    r.status
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {stockReturns.map((ret) => (
              <div key={ret.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">{ret.returnNumber}</span>
                    <span className="text-slate-500 font-sans">({ret.customerName})</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
                    {ret.status}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Claimed Items:</span>
                  {ret.items.map((it) => (
                    <div key={it.id} className="p-2.5 bg-white rounded border border-slate-100">
                      <div className="flex items-center justify-between font-mono font-semibold">
                        <span>{it.skuCode} ({it.skuName})</span>
                        <span>{it.claimedQuantity} Units @ PKR {it.unitPrice}</span>
                      </div>
                      <p className="text-slate-500 mt-1 font-sans">Reason: {it.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. FIELD OFFICER VISITS & PHOTOS */}
      {activeTab === 'VISITS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Field Officer Visits & Storefront Tracker</h2>
              <p className="text-xs text-slate-500">
                Real-time tracking of dealer visits, live GPS coordinate captures, and storefront/delivery receipt photo verification.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-semibold">Active check-in logs for {visits.length} dealer field visits</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToCSV(
                  visits,
                  ['VisitId', 'CheckinTime', 'CustomerName', 'SalesUserName', 'Purpose', 'Latitude', 'Longitude', 'Notes', 'OrderPlaced', 'RecoveryCollected'],
                  ['id', 'checkinTime', 'customerName', 'salesUserName', 'purpose', 'latitude', 'longitude', 'notes', 'orderPlaced', 'recoveryCollected'],
                  'Field_Visits_GPS_Report'
                )}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setPrintableReport({
                  title: 'Field Officer Visits & Storefront Tracker Report',
                  headers: ['Visit ID', 'Date & Time', 'Customer (Dealer)', 'Sales Officer', 'Purpose Of Visit', 'GPS Latitude', 'GPS Longitude', 'Order', 'Recovery'],
                  rows: visits.map(v => [
                    v.id.toUpperCase(),
                    v.checkinTime,
                    v.customerName,
                    v.salesUserName,
                    v.purpose,
                    v.latitude?.toFixed(5) || '-',
                    v.longitude?.toFixed(5) || '-',
                    v.orderPlaced ? 'YES' : 'NO',
                    v.recoveryCollected ? 'YES' : 'NO'
                  ])
                })}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Report
              </button>
            </div>
          </div>

          {visits.length > 0 && (
            <div className="pt-2 pb-4">
              <VisitsMapView visits={visits} />
            </div>
          )}

          {visits.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl bg-slate-50 text-slate-400 space-y-2">
              <MapPin className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-sm">No visit records found</p>
              <p className="text-xs">Log a customer check-in from the mobile field app simulator to see live logs here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visits.map((vis) => (
                <div key={vis.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-amber-400 border border-slate-800">
                          {vis.id.toUpperCase()}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm mt-1">{vis.customerName}</h3>
                        <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400" /> Logged by: <strong className="text-slate-700">{vis.salesUserName}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] uppercase">
                          COMPLETED
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          {new Date(vis.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-slate-100 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-50 pb-1">
                        <span>Purpose: {vis.purpose}</span>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-rose-500" /> {vis.latitude?.toFixed(4)}, {vis.longitude?.toFixed(4)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">" {vis.notes || 'No notes provided.'} "</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono font-semibold">
                      <span className={`px-2 py-0.5 rounded ${vis.orderPlaced ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                        Order: {vis.orderPlaced ? 'YES' : 'NO'}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${vis.recoveryCollected ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                        Recovery: {vis.recoveryCollected ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Photo Section */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">Captured Storefront / Receipt</span>
                    {vis.photoUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center aspect-video max-h-48 group">
                        <img 
                          src={vis.photoUrl} 
                          alt="Storefront Capture" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <a 
                            href={vis.photoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-3 py-1.5 bg-white text-slate-900 font-bold rounded-lg text-xs shadow-md hover:bg-slate-100"
                          >
                            View Fullscreen
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs italic">
                        No photo captured during this visit.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 11. LEAD REGISTRATIONS (DEALER & DISTRIBUTOR APPROVALS) */}
      {activeTab === 'REGISTRATIONS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Dealer & Distributor Authorization Pipeline
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verify and approve new dealer or distributor applications submitted from the field. 
                  Approval automatically generates a global customer code, initiates the 360° ledger, and sets authorized credit boundaries.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-semibold">Dealer/distributor registration requests ({registrationRequests.length} applications)</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => exportToCSV(
                    registrationRequests,
                    ['BusinessName', 'OwnerName', 'ContactPhone', 'CNIC', 'Address', 'Type', 'ProposedLimit', 'ProposedDays', 'SalesPerson', 'Status'],
                    ['businessName', 'contactPerson', 'phone', 'cnic', 'address', 'type', 'proposedCreditLimit', 'proposedCreditDays', 'submittedByUserName', 'status'],
                    'Dealer_Distributor_Applications_Report'
                  )}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-500" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setPrintableReport({
                    title: 'Dealer & Distributor Registration Authorization Report',
                    headers: ['Business Name', 'Owner / Contact', 'Phone / CNIC', 'Registered Address', 'Type', 'Proposed Credit Limit', 'Submitted By', 'Status'],
                    rows: registrationRequests.map(r => [
                      r.businessName,
                      r.contactPerson,
                      `${r.phone} / CNIC: ${r.cnic}`,
                      r.address,
                      r.type,
                      `PKR ${r.proposedCreditLimit.toLocaleString()} (${r.proposedCreditDays} Days)`,
                      r.submittedByUserName,
                      r.status
                    ])
                  })}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500" /> Print Report
                </button>
              </div>
            </div>
          </div>

          <div className="nl-page-grid">
            
            {/* Left: Pending Requests list */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Authorizations ({registrationRequests.filter(r => r.status === 'PENDING_APPROVAL').length})
                </h3>

                {registrationRequests.filter(r => r.status === 'PENDING_APPROVAL').length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-slate-600 text-xs font-semibold">No pending authorizations</p>
                    <p className="text-slate-400 text-[10px]">All submitted leads are verified and processed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {registrationRequests.filter(r => r.status === 'PENDING_APPROVAL').map((req) => {
                      const limitVal = approvalLimits[req.id] !== undefined ? approvalLimits[req.id] : req.proposedCreditLimit;
                      const daysVal = approvalDays[req.id] !== undefined ? approvalDays[req.id] : req.proposedCreditDays;
                      const rejectReason = rejectionReasons[req.id] || '';

                      return (
                        <div key={req.id} className="py-5 first:pt-0 last:pb-0 space-y-4 animate-fade-in">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{req.businessName}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  req.type === 'DISTRIBUTOR' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {req.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Proposed by Sales Officer: <strong className="text-slate-700">{req.salesUserName}</strong> &bull; Submitted on {req.submissionDate}
                              </p>
                            </div>

                            <div className="text-left md:text-right font-mono text-xs">
                              <span className="text-slate-400 text-[10px] block">Proposed Credit Limit:</span>
                              <strong className="text-slate-900">PKR {req.proposedCreditLimit.toLocaleString()}</strong>
                              <span className="text-slate-400 text-[10px] block">Proposed Credit Days: {req.proposedCreditDays} days</span>
                            </div>
                          </div>

                          {/* Specific Registration Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-3 border border-slate-100 rounded-lg bg-white space-y-2">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Owner Credentials</span>
                              <div className="space-y-1">
                                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-800">{req.ownerName}</strong></div>
                                <div><span className="text-slate-500">CNIC #:</span> <strong className="text-slate-800 font-mono">{req.cnic}</strong></div>
                                <div><span className="text-slate-500">Contact:</span> <strong className="text-slate-800 font-mono">{req.contactNumber}</strong></div>
                              </div>
                            </div>

                            <div className="p-3 border border-slate-100 rounded-lg bg-white space-y-2">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Store Physical Location</span>
                              <div className="space-y-1">
                                <div><span className="text-slate-500">Address:</span> <span className="text-slate-800 font-medium">{req.address}</span></div>
                                <div><span className="text-slate-500">City / Region:</span> <strong className="text-slate-800">{req.city} ({req.region})</strong></div>
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-mono">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>GPS: {req.latitude}, {req.longitude}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 border border-slate-100 rounded-lg bg-white space-y-1.5">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Sales Assessment</span>
                              <p className="text-slate-600 italic text-[11px] leading-relaxed">
                                "{req.notes || 'No assessment notes attached by officer.'}"
                              </p>
                              <div className="text-[10px] text-slate-400">
                                Opening Balance: PKR {req.openingBalance?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>

                          {/* Approval and Rejection Configurations */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                            
                            {/* Standard Action buttons */}
                            {activeApprovalId !== req.id && activeRejectionId !== req.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setActiveApprovalId(req.id);
                                    setActiveRejectionId(null);
                                  }}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Configure & Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveRejectionId(req.id);
                                    setActiveApprovalId(null);
                                  }}
                                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold rounded-lg text-xs"
                                >
                                  Reject Proposal
                                </button>
                              </>
                            )}

                            {/* Active Approval Panel */}
                            {activeApprovalId === req.id && (
                              <div className="w-full bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3 animate-fade-in text-xs">
                                <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider block">Set Final Approved Boundaries</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-slate-600 font-medium">Approved Credit Limit (PKR):</label>
                                    <input
                                      type="number"
                                      value={limitVal}
                                      onChange={(e) => setApprovalLimits({ ...approvalLimits, [req.id]: Number(e.target.value) })}
                                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-800 font-mono font-bold"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-slate-600 font-medium">Approved Credit Days:</label>
                                    <input
                                      type="number"
                                      value={daysVal}
                                      onChange={(e) => setApprovalDays({ ...approvalDays, [req.id]: Number(e.target.value) })}
                                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-800 font-mono font-bold"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                  <button
                                    onClick={() => setActiveApprovalId(null)}
                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      onApproveRegistration(req.id, limitVal, daysVal);
                                      setActiveApprovalId(null);
                                    }}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm"
                                  >
                                    Confirm & Provision Code
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Active Rejection Panel */}
                            {activeRejectionId === req.id && (
                              <div className="w-full bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 space-y-3 animate-fade-in text-xs">
                                <span className="font-bold text-rose-800 text-[11px] uppercase tracking-wider block">Specify Rejection Reason</span>
                                <div className="space-y-1">
                                  <label className="text-slate-600 font-medium">Reason for Return/Rejection*:</label>
                                  <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectionReasons({ ...rejectionReasons, [req.id]: e.target.value })}
                                    placeholder="Missing verification of original CNIC, credit references not provided, address mismatch, etc..."
                                    rows={2}
                                    className="w-full p-2 bg-white border border-slate-300 rounded text-slate-800"
                                  />
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    onClick={() => setActiveRejectionId(null)}
                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!rejectReason.trim()) {
                                        alert('Please provide a reason for rejecting the proposal.');
                                        return;
                                      }
                                      onRejectRegistration(req.id, rejectReason);
                                      setActiveRejectionId(null);
                                    }}
                                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm"
                                  >
                                    Confirm Rejection
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: History log and statistics */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Authorization History Log
                </h3>
                <p className="text-[11px] text-slate-500 mb-4">
                  Immutable record of registration requests approved or rejected by Lahore Central Office.
                </p>

                {registrationRequests.filter(r => r.status !== 'PENDING_APPROVAL').length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center py-6">No historical records found.</p>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {registrationRequests.filter(r => r.status !== 'PENDING_APPROVAL').map((req) => (
                      <div 
                        key={req.id} 
                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                          req.status === 'APPROVED' ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50 border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">{req.businessName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Date: {req.submissionDate}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        {req.status === 'APPROVED' ? (
                          <div className="text-[10px] bg-white p-2 border border-emerald-50 rounded space-y-0.5 font-mono">
                            <div className="text-slate-400">Assigned Customer Code:</div>
                            <strong className="text-emerald-700 text-[11px]">{req.approvedCustomerCode}</strong>
                            <div className="text-slate-400 mt-1">Approved terms:</div>
                            <span className="text-slate-700 font-sans">
                              PKR {req.approvedCreditLimit?.toLocaleString()} &bull; {req.approvedCreditDays} Days
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] bg-white p-2 border border-slate-100 rounded text-slate-500">
                            <strong>Reason for rejection:</strong> <span className="italic">"{req.rejectionReason}"</span>
                          </div>
                        )}
                        
                        <div className="text-[9px] text-slate-400 flex items-center justify-between">
                          <span>Officer: {req.salesUserName}</span>
                          <span>Verified: {req.approvedBy || 'System Admin'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============ PRINTABLE INVOICE DETAIL & SETTINGS OVERLAY ============ */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-0 md:p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:text-black">
          <div className="bg-slate-100 md:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col md:flex-row h-full md:max-h-[90vh] overflow-hidden print:border-0 print:shadow-none print:max-h-full print:rounded-none">
            
            {/* LEFT SIDEBAR: Printing Preferences Controls (Hidden on Print) */}
            <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col justify-between gap-4 shrink-0 print:hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Printer className="w-4.5 h-4.5 text-amber-500" />
                    Print Customizer
                  </h3>
                  <button 
                    onClick={() => setSelectedInvoiceForPrint(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Close &times;
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Configure real-time paper formats, standard tax rates, signature blocks, and corporate branding details.
                </p>

                <div className="space-y-3 pt-3 border-t">
                  {/* Paper size */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paper Size Format</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintPaperSize('A4')}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          printPaperSize === 'A4'
                            ? 'bg-slate-900 text-amber-400 border-slate-900'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        Standard A4 Sheet
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintPaperSize('RECEIPT')}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          printPaperSize === 'RECEIPT'
                            ? 'bg-slate-900 text-amber-400 border-slate-900'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        80mm Thermal Receipt
                      </button>
                    </div>
                  </div>

                  {/* Toggle headers */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Layout Elements</label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={printShowHeader}
                        onChange={(e) => setPrintShowHeader(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      Show Corporate Header
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={printShowTax}
                        onChange={(e) => setPrintShowTax(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      Show Sales Tax Breakdown (GST)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={printShowTerms}
                        onChange={(e) => setPrintShowTerms(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      Show Commercial Disclaimers
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={printShowSignatures}
                        onChange={(e) => setPrintShowSignatures(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      Show Authorized Signature Block
                    </label>
                  </div>
                </div>
              </div>

              {/* Sidebar Action Triggers */}
              <div className="space-y-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full p-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Trigger System Print
                </button>
                <button
                  type="button"
                  onClick={() => exportToCSV(
                    selectedInvoiceForPrint.items || [],
                    ['SkuCode', 'SkuName', 'Quantity', 'UnitPrice', 'DiscountAmount', 'LineTotal'],
                    ['skuCode', 'skuName', 'quantity', 'unitPrice', 'discountAmount', 'lineTotal'],
                    `Invoice_${selectedInvoiceForPrint.invoiceNumber}_Lines`
                  )}
                  className="w-full p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export Line Items CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="w-full p-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* RIGHT SIDE: Dynamic Printable Document Sheets preview */}
            <div className="flex-1 bg-slate-200/50 p-3 md:p-6 overflow-y-auto print:bg-white print:p-0 print:overflow-visible">
              
              {/* Paper simulation wrapper */}
              <div 
                id="invoice-printable-container"
                className={`bg-white mx-auto shadow-lg border border-slate-200 print:shadow-none print:border-0 print:p-0 text-slate-800 ${
                  printPaperSize === 'RECEIPT' 
                    ? 'w-[80mm] max-w-full p-4 text-[10px] space-y-3 font-mono' 
                    : 'w-[210mm] max-w-full min-h-[297mm] p-8 md:p-12 space-y-6'
                }`}
              >
                
                {/* 1. Header block */}
                {printShowHeader && (
                  <div className={`flex items-start justify-between border-b pb-4 ${
                    printPaperSize === 'RECEIPT' ? 'flex-col items-center text-center gap-1' : ''
                  }`}>
                    <div className="space-y-1">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          className="h-12 w-auto object-contain mb-1" 
                          alt="Company Branding Logo" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-inner mb-1">
                          NL
                        </div>
                      )}
                      <h1 className="text-sm font-bold tracking-tight text-slate-900">NATIONAL LIGHTS CO.</h1>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Rawalpindi - Lahore Industrial Link Road, Lahore, Pakistan<br />
                        Tax Registration Number: STRN-209483-PK &bull; Phone: +92 (42) 111-544-487
                      </p>
                    </div>

                    <div className={`text-right space-y-1 font-mono ${
                      printPaperSize === 'RECEIPT' ? 'text-center border-t border-dotted pt-2 w-full mt-1' : ''
                    }`}>
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-bold text-[10px] uppercase font-sans">
                        Official Sales Invoice
                      </span>
                      <div className="text-[11px] font-bold text-slate-900 mt-1"># {selectedInvoiceForPrint.invoiceNumber}</div>
                      <div className="text-[9px] text-slate-500">Date: {selectedInvoiceForPrint.invoiceDate}</div>
                      <div className="text-[9px] text-slate-500">Due: {selectedInvoiceForPrint.dueDate}</div>
                    </div>
                  </div>
                )}

                {/* 2. Addresses Block */}
                <div className={`grid gap-4 ${
                  printPaperSize === 'RECEIPT' ? 'grid-cols-1 border-b border-dotted pb-2 text-left' : 'grid-cols-2 border-b pb-4'
                }`}>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Distributor / Dealer (Billed To)</span>
                    <strong className="text-slate-900 block mt-0.5 text-xs font-sans">{selectedInvoiceForPrint.customerName}</strong>
                    {/* Retrieve customer meta data if available, else standard placeholder */}
                    {(() => {
                      const custObj = customers.find(c => c.name === selectedInvoiceForPrint.customerName);
                      return custObj ? (
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">
                          Address: {custObj.address || 'Rawalpindi Main Bazaar Area'}<br />
                          CNIC #: {custObj.cnic || '37405-1928374-1'}<br />
                          Contact: {custObj.contactNumber || '+92 333 555 1234'}
                        </p>
                      ) : (
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">
                          Registered Address: Main Commercial Hub, G.T. Road, Pakistan<br />
                          CNIC / SECP Company Registration Code: 37405-9204928-1
                        </p>
                      );
                    })()}
                  </div>

                  <div className={printPaperSize === 'RECEIPT' ? 'text-left' : 'text-right'}>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Payment Commercial Terms</span>
                    <p className="text-[9px] text-slate-500 mt-1 font-sans">
                      Payment Account Type: Credit Ledger Account<br />
                      Authorized Terms: Strictly within Credit Days limit<br />
                      Dispatched Via: Central Warehouse Logistics Fleet<br />
                      Representative: Lahore Office Desk
                    </p>
                  </div>
                </div>

                {/* 3. Items Table */}
                <div className="space-y-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-slate-900 font-bold border-b ${
                        printPaperSize === 'RECEIPT' ? 'border-dotted text-[9px]' : 'border-slate-800 text-[10px]'
                      }`}>
                        <th className="py-1.5">SKU Code</th>
                        <th className="py-1.5">Product Description</th>
                        <th className="py-1.5 text-right">Qty</th>
                        <th className="py-1.5 text-right">Trade Price</th>
                        <th className="py-1.5 text-right">Net Price</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-slate-700 ${
                      printPaperSize === 'RECEIPT' ? 'divide-dotted text-[9px]' : 'divide-slate-200 text-[10px]'
                    }`}>
                      {/* Handle fallback if item details are empty */}
                      {(selectedInvoiceForPrint.items && selectedInvoiceForPrint.items.length > 0) ? (
                        selectedInvoiceForPrint.items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="py-2 font-mono font-bold text-slate-900">{it.skuCode}</td>
                            <td className="py-2">{it.skuName}</td>
                            <td className="py-2 text-right font-mono">{it.quantity}</td>
                            <td className="py-2 text-right font-mono">PKR {it.unitPrice.toLocaleString()}</td>
                            <td className="py-2 text-right font-mono font-bold text-slate-950">PKR {it.lineTotal.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        /* Generate realistic mock items matching original sales order values */
                        <tr>
                          <td className="py-2 font-mono font-bold text-slate-900">SKU-BULB-12W</td>
                          <td className="py-2">LED Premium Bulb 12W White</td>
                          <td className="py-2 text-right font-mono">200</td>
                          <td className="py-2 text-right font-mono">PKR 350</td>
                          <td className="py-2 text-right font-mono font-bold text-slate-950">PKR {selectedInvoiceForPrint.totalAmount.toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Totals Sum Grid */}
                <div className="border-t pt-3 flex justify-end">
                  <div className={`space-y-1.5 text-right ${
                    printPaperSize === 'RECEIPT' ? 'w-full' : 'w-72'
                  }`}>
                    {/* Dynamic fallback calculations */}
                    {(() => {
                      const subtotal = selectedInvoiceForPrint.subtotal || selectedInvoiceForPrint.totalAmount;
                      const discAmount = selectedInvoiceForPrint.discountAmount || 0;
                      const taxAmount = selectedInvoiceForPrint.taxAmount || 0;
                      const finalTotal = selectedInvoiceForPrint.totalAmount;

                      return (
                        <div className="text-[10px] space-y-1 font-mono">
                          <div className="flex justify-between text-slate-500">
                            <span>Gross Items Subtotal:</span>
                            <span>PKR {subtotal.toLocaleString()}</span>
                          </div>
                          {discAmount > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Trade Discount Applied:</span>
                              <span>- PKR {discAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {printShowTax && (
                            <div className="flex justify-between text-slate-500">
                              <span>Sales Tax (GST 18%):</span>
                              <span>PKR {taxAmount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-500 border-t border-dotted pt-1">
                            <span>Pre-outstanding Balance:</span>
                            <span>PKR {selectedInvoiceForPrint.previousBalance.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between font-bold text-slate-950 ${
                            printPaperSize === 'RECEIPT' ? 'text-xs border-t border-double pt-1.5' : 'text-sm border-t border-slate-800 pt-2'
                          }`}>
                            <span className="font-sans">Invoice Total (Net):</span>
                            <span>PKR {finalTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-amber-700 font-bold">
                            <span className="font-sans">New Customer Balance:</span>
                            <span>PKR {selectedInvoiceForPrint.newBalance.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. Terms / Disclaimer */}
                {printShowTerms && (
                  <div className={`pt-4 border-t border-dotted text-[9px] text-slate-400 text-left ${
                    printPaperSize === 'RECEIPT' ? 'text-[8px] space-y-1' : 'space-y-1'
                  }`}>
                    <strong>Terms & Standard Commercial Conditions:</strong>
                    <p className="font-sans italic leading-relaxed">
                      1. All goods are packed under central warehouse supervision. Stock shortages, if any, must be reported in writing within 48 hours of logistics delivery receipt.<br />
                      2. Payment is strictly debited to ledger balance. Overdue bills are liable to lock dispatch pipelines automatically.<br />
                      3. All payments must be made strictly via Crossed Cheques or Bank Drafts in favor of <strong>National Lights Co.</strong> Cash collections by field representatives are strictly forbidden.
                    </p>
                  </div>
                )}

                {/* 6. Signatures */}
                {printShowSignatures && (
                  <div className={`pt-12 grid grid-cols-2 gap-12 text-[10px] font-sans ${
                    printPaperSize === 'RECEIPT' ? 'pt-8 grid-cols-1 gap-6 text-[9px]' : ''
                  }`}>
                    <div className="border-t border-slate-300 pt-1 text-slate-500">
                      Prepared By (Warehouse Dispatch Clerk)
                      <span className="block font-mono text-[9px] text-slate-400 mt-4">N-Link System Verified</span>
                    </div>
                    <div className="border-t border-slate-300 pt-1 text-slate-500 text-right print:text-right">
                      Authorized Signature & Corporate Stamp
                      <span className="block font-mono text-[9px] text-slate-400 mt-4">Lahore Head Office</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============ GENERIC PRINTABLE REPORT MODAL ============ */}
      {printableReport && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:text-black">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden print:border-0 print:shadow-none print:max-h-full print:rounded-none">
            
            {/* Header control bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs">Print Preview: {printableReport.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button
                  onClick={() => setPrintableReport(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document sheet wrapper */}
            <div className="flex-1 p-6 bg-slate-50 overflow-y-auto print:bg-white print:p-0">
              <div className="bg-white p-8 md:p-12 border border-slate-200 print:border-0 rounded-xl print:rounded-none space-y-6 max-w-4xl mx-auto shadow-sm print:shadow-none">
                
                {/* Branding head */}
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="space-y-1">
                    {logoUrl ? (
                      <img src={logoUrl} className="h-10 w-auto object-contain mb-1" alt="Logo" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm">NL</div>
                    )}
                    <h2 className="text-xs font-bold text-slate-900">NATIONAL LIGHTS CO.</h2>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Commercial Ledger Report</span>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    <div>System Date: {new Date().toLocaleDateString()}</div>
                    <div>Source: N-LINK 360 Admin Portal</div>
                  </div>
                </div>

                {/* Report Title */}
                <div>
                  <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{printableReport.title}</h1>
                  <p className="text-[10px] text-slate-500 mt-1">This report is compiled in real-time on behalf of Lahore Head Office administration and constitutes an official ledger.</p>
                </div>

                {/* Tabular sheet */}
                <div className="overflow-x-auto border rounded-lg bg-white">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b">
                        {printableReport.headers.map((h, i) => (
                          <th key={i} className="py-2.5 px-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600 font-mono">
                      {printableReport.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                <div className="pt-6 border-t border-dashed flex justify-between items-center text-[9px] text-slate-400 font-sans">
                  <span>End of Report &bull; N-LINK 360 Ecosystem</span>
                  <span>Page 1 of 1</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
