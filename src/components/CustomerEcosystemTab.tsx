/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer & Partner Ecosystem Master
 * 360° Channel Registry, Dealer Directory, PJP Beat Scheduling, 
 * Order Cart (MSL), Recovery Entry, Invoices & Ledger Statement
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, SalesOrder, Invoice, Recovery, CustomerVisit, StockReturn, User, SalesOrderItem } from '../types';
import { generateUniqueCustomerCode, calculateCustomerCreditUtilization, calculateCustomerCreditHealth } from '../lib/business-rules';
import { CreditHealthIndicator } from './CreditHealthIndicator';
import { NLINK_OFFICIAL_PRODUCTS, NLinkSKU } from '../data/nlink-products';
import {
  isAutoSaveEnabled,
  saveDraftOrderProgress,
  getDraftOrderProgress,
  clearDraftOrderProgress
} from '../services/orderAutoSaveService';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Users, 
  Search, 
  MapPin, 
  DollarSign, 
  FileText, 
  Receipt, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  ShieldCheck,
  Building,
  Phone,
  Tag,
  Check,
  X,
  Calendar,
  History,
  TrendingUp,
  ShoppingBag,
  Coins,
  Send,
  Printer,
  Share2,
  Trash2,
  Navigation,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';

interface CustomerEcosystemTabProps {
  currentUser?: User;
  customers?: Customer[];
  salesOrders?: SalesOrder[];
  invoices?: Invoice[];
  recoveries?: Recovery[];
  visits?: CustomerVisit[];
  returns?: StockReturn[];
  onAddCustomer?: (newCustomer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onApproveCustomer?: (customerId: string, approvedBy: string) => void;
  onRejectCustomer?: (customerId: string, reason: string) => void;
  onOrderSubmitted?: (orderPartial: Partial<SalesOrder>, customerName: string) => void;
  onRecoverySubmitted?: (recoveryPartial: Partial<Recovery>, customerName: string) => void;
}

export const CustomerEcosystemTab: React.FC<CustomerEcosystemTabProps> = ({
  currentUser,
  customers = [],
  salesOrders = [],
  invoices = [],
  recoveries = [],
  visits = [],
  returns = [],
  onAddCustomer,
  onUpdateCustomer,
  onApproveCustomer,
  onRejectCustomer,
  onOrderSubmitted,
  onRecoverySubmitted,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pjpDayFilter, setPjpDayFilter] = useState<'ALL' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP'>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers?.[0]?.id || '');
  const [cockpitSubTab, setCockpitSubTab] = useState<'OVERVIEW' | 'ORDERING' | 'RECOVERY' | 'INVOICES' | 'LEDGER'>('OVERVIEW');

  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for creating a customer
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP'>('SHOP');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTown, setFormTown] = useState('Brandreth Road');
  const [formCity, setFormCity] = useState('Lahore');
  const [formRegion, setFormRegion] = useState('Punjab Central');
  const [formPriceTier, setFormPriceTier] = useState<'STANDARD' | 'WHOLESALE' | 'DISTRIBUTOR' | 'SPECIAL'>('WHOLESALE');
  const [formCreditLimit, setFormCreditLimit] = useState(500000);
  const [formCreditDays, setFormCreditDays] = useState(30);
  const [formOpeningBalance, setFormOpeningBalance] = useState(0);

  // --- Order Booking State inside Cockpit (with Auto-Save & Recovery) ---
  const [tripNumber, setTripNumber] = useState('TRIP-01');
  const [selectedSkuId, setSelectedSkuId] = useState<string>(NLINK_OFFICIAL_PRODUCTS[0]?.id || '');
  const [orderQuantity, setOrderQuantity] = useState<number>(10);
  const [cartItems, setCartItems] = useState<{
    sku: NLinkSKU;
    orderedQuantity: number;
    unitPrice: number;
    lineTotal: number;
  }[]>(() => {
    const saved = getDraftOrderProgress();
    if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
      return saved.items;
    }
    return [];
  });

  // Calculate cart total amount
  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
  }, [cartItems]);

  // Hourly Auto-Save Effect (Saves order progress to localStorage every 1 Hour or on item update)
  useEffect(() => {
    if (!isAutoSaveEnabled()) return;

    if (cartItems.length > 0) {
      saveDraftOrderProgress({
        items: cartItems,
        totalAmount: cartTotalAmount,
      });
    }

    const ONE_HOUR_MS = 3600000;
    const intervalTimer = setInterval(() => {
      if (isAutoSaveEnabled() && cartItems.length > 0) {
        saveDraftOrderProgress({
          items: cartItems,
          totalAmount: cartTotalAmount,
        });
      }
    }, ONE_HOUR_MS);

    return () => clearInterval(intervalTimer);
  }, [cartItems, cartTotalAmount]);

  // --- Recovery Entry State inside Cockpit ---
  const [recAmount, setRecAmount] = useState<number>(50000);
  const [recPaymentMode, setRecPaymentMode] = useState<'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER'>('CASH');
  const [recInstrumentNo, setRecInstrumentNo] = useState('');
  const [recBankName, setRecBankName] = useState('Meezan Bank');
  const [recRemarks, setRecRemarks] = useState('Payment collected at store visit');

  // Auto-calculated customer code preview
  const previewCustomerCode = generateUniqueCustomerCode(
    formType,
    customers.map((c) => c.customerCode)
  );

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Company/Shop Name and Phone number are required.');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: previewCustomerCode,
      companyName: formName.trim(),
      contactPerson: formContact.trim() || undefined,
      phone: formPhone.trim(),
      cnic: formCnic.trim() || undefined,
      email: `${previewCustomerCode.toLowerCase()}@nationallights.com`,
      type: formType,
      address: formAddress.trim(),
      city: formCity,
      town: formTown,
      region: formRegion,
      priceTier: formPriceTier,
      creditLimit: formCreditLimit,
      creditDays: formCreditDays,
      openingBalance: formOpeningBalance,
      currentBalance: formOpeningBalance,
      isCreditLocked: false,
      isActive: true,
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onAddCustomer) {
      onAddCustomer(newCustomer);
    }
    setSelectedCustomerId(newCustomer.id);
    setShowAddModal(false);
    showNotification(`New ${formType} registered! Pending Head Office Approval.`);
  };

  // Filter list by PJP Day, Type, Approval, and Search
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.town || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const currentApproval = (c as any).approvalStatus || 'APPROVED';
    const matchesApproval = approvalFilter === 'ALL' || currentApproval === approvalFilter;

    // Simulate PJP Day mapping based on code ending or explicit property
    const dayMap = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const charCode = (c.customerCode || c.id).charCodeAt((c.customerCode || c.id).length - 1) || 0;
    const assignedDay = dayMap[charCode % 6];
    const matchesPjp = pjpDayFilter === 'ALL' || assignedDay === pjpDayFilter;

    return matchesSearch && matchesType && matchesApproval && matchesPjp;
  });

  // Selected Customer aggregate details
  const selCustomer = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0] || customers[0];

  // Linkages
  const selOrders = salesOrders.filter(o => o.customerId === selCustomer?.id);
  const selInvoices = invoices.filter(i => i.customerId === selCustomer?.id);
  const selRecoveries = recoveries.filter(r => r.customerId === selCustomer?.id);
  const selVisits = visits.filter(v => v.customerId === selCustomer?.id);
  const selReturns = returns.filter(r => r.customerId === selCustomer?.id);

  // 3 Months Visit Logs Filtered by Current Dealer's Town
  const currentDealerTown = selCustomer?.town || selCustomer?.city || 'Brandreth Road';
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const townVisitsLast3Months = visits.filter(v => {
    const visitDate = new Date(v.checkinTime);
    const isWithin3Months = isNaN(visitDate.getTime()) || visitDate >= threeMonthsAgo;
    const matchesTown = (v.townName && v.townName.toLowerCase() === currentDealerTown.toLowerCase()) ||
                        v.customerId === selCustomer?.id ||
                        (v.customerName && selCustomer?.companyName && v.customerName.toLowerCase().includes(selCustomer.companyName.toLowerCase()));
    return isWithin3Months && matchesTown;
  });

  // Financial calculations using real domain rule
  const creditAnalysis = selCustomer 
    ? calculateCustomerCreditUtilization(selCustomer.creditLimit || 0, selCustomer.currentBalance || 0)
    : { creditLimit: 0, currentOutstanding: 0, availableCredit: 0, creditUtilizationPercentage: 0, isOverLimit: false };

  const approvalStatus = (selCustomer as any)?.approvalStatus || 'APPROVED';

  // Calculate 6-Month Net Balance Trajectory for selected customer profile using recharts
  const last6MonthsBalanceData = useMemo(() => {
    if (!selCustomer) return [];

    const now = new Date();
    const monthlyData = [];

    const openingBal = selCustomer.openingBalance || 0;
    const currentBal = selCustomer.currentBalance || 0;

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthLabel = monthStart.toLocaleString('default', { month: 'short' });

      // Sum invoices up to monthEnd
      const invoicesUpToMonth = selInvoices.filter(inv => {
        const d = new Date(inv.invoiceDate || inv.createdAt || '');
        return !isNaN(d.getTime()) && d <= monthEnd;
      });
      const invTotal = invoicesUpToMonth.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      // Sum recoveries up to monthEnd
      const recoveriesUpToMonth = selRecoveries.filter(rec => {
        const d = new Date(rec.collectionDate || rec.createdAt || '');
        return !isNaN(d.getTime()) && d <= monthEnd;
      });
      const recTotal = recoveriesUpToMonth.reduce((sum, rec) => sum + (rec.amount || 0), 0);

      // Sum returns up to monthEnd
      const returnsUpToMonth = selReturns.filter(ret => {
        const d = new Date(ret.createdAt || '');
        return !isNaN(d.getTime()) && d <= monthEnd;
      });
      const retTotal = returnsUpToMonth.reduce((sum, ret) => sum + (ret.totalAmount || 0), 0);

      let netBal = openingBal + invTotal - recTotal - retTotal;

      if (i === 0 && selCustomer.currentBalance !== undefined) {
        netBal = currentBal;
      }

      monthlyData.push({
        month: monthLabel,
        netBalance: Math.max(0, Math.round(netBal)),
        invoices: invTotal,
        recoveries: recTotal,
      });
    }

    return monthlyData;
  }, [selCustomer, selInvoices, selRecoveries, selReturns]);

  // Order Cart Helpers
  const handleAddToCart = (sku: NLinkSKU, qty: number = orderQuantity) => {
    if (qty <= 0) return;
    setCartItems(prev => {
      const existing = prev.find(item => item.sku.id === sku.id);
      if (existing) {
        const newQty = existing.orderedQuantity + qty;
        return prev.map(item =>
          item.sku.id === sku.id
            ? { ...item, orderedQuantity: newQty, lineTotal: newQty * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          sku,
          orderedQuantity: qty,
          unitPrice: sku.tradePrice,
          lineTotal: qty * sku.tradePrice,
        },
      ];
    });
    showNotification(`Added ${qty}x ${sku.name} to cart.`);
  };

  const handleRemoveFromCart = (skuId: string) => {
    setCartItems(prev => prev.filter(i => i.sku.id !== skuId));
  };

  const cartTotalQty = cartItems.reduce((sum, i) => sum + i.orderedQuantity, 0);

  const handleSubmitCartOrder = () => {
    if (!selCustomer) return;
    if (cartItems.length === 0) {
      alert('Your order cart is empty. Please add items before checking out.');
      return;
    }

    const orderItems: SalesOrderItem[] = cartItems.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      orderId: `so-${Date.now()}`,
      skuId: item.sku.id,
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      orderedQuantity: item.orderedQuantity,
      approvedQuantity: item.orderedQuantity,
      unitPrice: item.unitPrice,
      discountPercent: 0,
      lineTotal: item.lineTotal,
    }));

    const newOrder: Partial<SalesOrder> = {
      id: `so-${Date.now()}`,
      orderNumber: `SO-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: selCustomer.id,
      customerCode: selCustomer.customerCode,
      customerName: selCustomer.companyName,
      salesUserId: currentUser?.id || 'USR-040',
      salesUserName: currentUser?.fullName || 'Field Officer',
      orderDate: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      totalAmount: cartTotalAmount,
      subtotal: cartTotalAmount,
      discountAmount: 0,
      items: orderItems,
      creditCheckStatus: 'GREEN',
    };

    if (onOrderSubmitted) {
      onOrderSubmitted(newOrder, selCustomer.companyName);
    }
    setCartItems([]);
    clearDraftOrderProgress();
    showNotification(`Sales Order #${newOrder.orderNumber} successfully booked for ${selCustomer.companyName}!`);
  };

  const handleSubmitRecoveryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selCustomer || recAmount <= 0) {
      alert('Please enter a valid recovery payment amount.');
      return;
    }

    const newRec: Partial<Recovery> = {
      id: `rc-${Date.now()}`,
      recoveryNumber: `RC-${Math.floor(5000 + Math.random() * 5000)}`,
      customerId: selCustomer.id,
      customerCode: selCustomer.customerCode,
      customerName: selCustomer.companyName,
      salesUserId: currentUser?.id || 'USR-040',
      salesUserName: currentUser?.fullName || 'Field Representative',
      collectionDate: new Date().toISOString().split('T')[0],
      amount: recAmount,
      paymentMode: recPaymentMode,
      instrumentNumber: recPaymentMode !== 'CASH' ? recInstrumentNo || 'FT-883921' : undefined,
      bankName: recPaymentMode !== 'CASH' ? recBankName : undefined,
      status: 'VERIFIED',
      remarks: recRemarks,
    };

    if (onRecoverySubmitted) {
      onRecoverySubmitted(newRec, selCustomer.companyName);
    }
    showNotification(`Recovery #${newRec.recoveryNumber} of PKR ${recAmount.toLocaleString()} posted for ${selCustomer.companyName}!`);
  };

  // WhatsApp helper
  const handleSendWhatsApp = (customerPhone: string, text: string) => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : `92${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-slideDown">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
              <Building className="h-3.5 w-3.5 text-emerald-600" />
              DEALERS &amp; DISTRIBUTORS HUB
            </span>
            <span className="text-xs text-slate-400 font-mono">PJP ROUTE SCHEDULE &amp; 360° COCKPIT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Channel Directory &amp; Accounts</h1>
          <p className="text-xs text-slate-500 max-w-xl">
            Complete management of Distributors, Dealers, and Retail Outlets. Includes live ordering cart, payment recovery entry, previous invoices, and double-entry ledger statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black shadow-lg shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register New Dealer / Distributor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand: Customer Directory with Search, PJP Days & Filters */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by store name, code, town, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all font-medium"
            />
          </div>

          {/* Permanent Journey Plan (PJP) Day Filter Bar (Matching Image 2) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block px-1">
              PJP Beat Schedule (Day)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setPjpDayFilter(day)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    pjpDayFilter === day
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day === 'ALL' ? 'All Days' : day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Type & Approval Filters */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="DISTRIBUTOR">Distributors</option>
              <option value="DEALER">Dealers</option>
              <option value="SHOP">Retail Outlets</option>
              <option value="CUSTOMER">Corporate Accounts</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value as any)}
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Active Approved</option>
              <option value="PENDING_APPROVAL">Pending HO Approval</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Customer Cards List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[620px] pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Building className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-600">No dealers or distributors match filters</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try resetting the day or search filter.</p>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                const status = (cust as any).approvalStatus || 'APPROVED';
                const charCode = (cust.customerCode || cust.id).charCodeAt((cust.customerCode || cust.id).length - 1) || 0;
                const routeName = `Route R${(charCode % 3) + 1}`;

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl ring-2 ring-emerald-500/50' 
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {cust.customerCode}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cust.type}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {routeName}
                          </span>
                          <CreditHealthIndicator
                            customer={cust}
                            invoices={invoices}
                            recoveries={recoveries}
                            variant="badge"
                          />
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm pt-0.5">{cust.companyName}</h4>
                        <p className={`text-[11px] truncate flex items-center gap-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{cust.address || `${cust.town || 'Brandreth Road'}, ${cust.city}`}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black text-xs block ${isSelected ? 'text-emerald-400' : 'text-slate-900'}`}>
                          PKR {(cust.currentBalance || 0).toLocaleString()}
                        </span>
                        <span className={`text-[9px] block uppercase font-bold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          Outstanding
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Bar on Card (Matching Image 2) */}
                    <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                      isSelected ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <span className={`font-medium ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {cust.contactPerson || 'Proprietor'} · {cust.phone}
                      </span>

                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${cust.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="Direct Phone Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(
                              cust.phone,
                              `Hi ${cust.companyName} (${cust.customerCode}), this is National Lights field team. We are updating your route visit schedule.`
                            );
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected ? 'bg-emerald-900/80 text-emerald-300 hover:bg-emerald-800' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                          title="Direct WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerId(cust.id);
                            setCockpitSubTab('ORDERING');
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                          title="Quick Book Order"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand: 360° Partner Cockpit Detail Screen */}
        <div className="lg:col-span-7 space-y-4">
          {selCustomer ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
              {/* Top Banner & Info Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                      {selCustomer.type}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      Price Tier: {selCustomer.priceTier || 'WHOLESALE'}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono">
                      {selCustomer.customerCode}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">{selCustomer.companyName}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Contact: <strong>{selCustomer.contactPerson || 'Proprietor'}</strong></span>
                    <span>•</span>
                    <span className="font-mono">{selCustomer.phone}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">{selCustomer.town || 'Brandreth Road'}, {selCustomer.city}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                      approvalStatus === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : approvalStatus === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {approvalStatus === 'APPROVED' && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                    {approvalStatus === 'PENDING_APPROVAL' && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                    {approvalStatus === 'REJECTED' && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
                    {approvalStatus}
                  </span>

                  {approvalStatus === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => onApproveCustomer && onApproveCustomer(selCustomer.id, currentUser?.fullName || 'Head Office Admin')}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black shadow transition active:scale-95 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt('Please enter rejection reason:');
                          if (reason && onRejectCustomer) {
                            onRejectCustomer(selCustomer.id, reason);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cockpit Interactive Navigation Bar (Sub-tabs) */}
              <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCockpitSubTab('OVERVIEW')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    cockpitSubTab === 'OVERVIEW'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Overview &amp; Credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCockpitSubTab('ORDERING')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    cockpitSubTab === 'ORDERING'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Order Booking ({cartItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCockpitSubTab('RECOVERY')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    cockpitSubTab === 'RECOVERY'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Receive Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCockpitSubTab('INVOICES')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    cockpitSubTab === 'INVOICES'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Previous Invoices ({selInvoices.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCockpitSubTab('LEDGER')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    cockpitSubTab === 'LEDGER'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                  <span>Ledger Statement</span>
                </button>
              </div>

              {/* SUB-TAB 1: OVERVIEW & CREDIT ANALYSIS */}
              {cockpitSubTab === 'OVERVIEW' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Geographic & Territory Matrix */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Town / Market</span>
                      <span className="font-bold text-slate-800">{selCustomer.town || 'Brandreth Road'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">City / Division</span>
                      <span className="font-bold text-slate-800">{selCustomer.city || 'Lahore'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Region</span>
                      <span className="font-bold text-slate-800">{selCustomer.region || 'Punjab Central'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CNIC / NTN</span>
                      <span className="font-mono font-semibold text-slate-700">{selCustomer.cnic || 'N/A'}</span>
                    </div>
                  </div>

                  {/* 360° Credit Health & Payment Delay Intelligence */}
                  <CreditHealthIndicator
                    customer={selCustomer}
                    invoices={invoices}
                    recoveries={recoveries}
                    variant="full"
                    showSimulator={true}
                  />

                  {/* Credit Risk & Utilization Cockpit */}
                  <div className="p-5 border rounded-2xl border-slate-200 space-y-3 bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-700 font-bold">Credit Limit Utilization</span>
                        <p className="text-[10px] text-slate-400">Current Ledger Balance vs. Authorized Credit</p>
                      </div>
                      <span className={`text-xs font-black ${
                        creditAnalysis.isOverLimit ? 'text-rose-600' :
                        creditAnalysis.creditUtilizationPercentage > 85 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {creditAnalysis.creditUtilizationPercentage}% Used {creditAnalysis.isOverLimit ? '(OVER LIMIT)' : ''}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          creditAnalysis.isOverLimit ? 'bg-rose-600' :
                          creditAnalysis.creditUtilizationPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`} 
                        style={{ width: `${Math.min(100, creditAnalysis.creditUtilizationPercentage)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Authorized Credit</span>
                        <span className="font-mono font-bold text-slate-900">PKR {(selCustomer.creditLimit || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Current Balance</span>
                        <span className="font-mono font-bold text-slate-900">PKR {(selCustomer.currentBalance || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Available Headroom</span>
                        <span className="font-mono font-black text-emerald-700">PKR {creditAnalysis.availableCredit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6-Month Net Balance Trend Chart */}
                  <div className="p-5 border rounded-2xl border-slate-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-slate-900 uppercase tracking-wide">6-Month Net Balance Trajectory</h4>
                          <p className="text-[10px] text-slate-400">Historical outstanding trajectory for {selCustomer.companyName}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-black text-indigo-600">
                        PKR {(selCustomer.currentBalance || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="h-44 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={last6MonthsBalanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 10, fill: '#64748b' }} 
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#64748b' }} 
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : `${val}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', borderColor: '#334155', color: '#fff', fontSize: '11px' }}
                            formatter={(value: any) => [`PKR ${Number(value).toLocaleString()}`, 'Net Balance']}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="netBalance" 
                            stroke="#4f46e5" 
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#3730a3' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Visit Logs */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white">Town Visit Logs (90 Days)</h4>
                          <p className="text-[10px] text-slate-400">Market: <strong className="text-emerald-400">{currentDealerTown}</strong></p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] rounded-full border border-emerald-500/30">
                        {townVisitsLast3Months.length} Visits Logged
                      </span>
                    </div>

                    {townVisitsLast3Months.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-[11px] bg-slate-800/50 rounded-xl border border-slate-800">
                        <MapPin className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                        No field visits recorded in {currentDealerTown} over the last 90 days.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {townVisitsLast3Months.map((v) => (
                          <div
                            key={v.id}
                            className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-white text-xs block">{v.customerName || selCustomer.companyName}</span>
                              <p className="text-[10px] text-slate-400">
                                Rep: <strong className="text-emerald-400">{v.salesUserName || 'Field Rep'}</strong> · {new Date(v.checkinTime).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="text-[10px]">
                              {v.orderBooked && v.orderAmount ? (
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded">
                                  Order: PKR {v.orderAmount.toLocaleString()}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded">No Order</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: ORDER BOOKING (CART & MSL ITEMS - MATCHING IMAGE 3) */}
              {cockpitSubTab === 'ORDERING' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 block">Product Cart for {selCustomer.companyName}</span>
                      <span className="text-[10px] text-emerald-700">Code: {selCustomer.customerCode} · Tier: {selCustomer.priceTier || 'WHOLESALE'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-extrabold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg">
                        Trip: {tripNumber}
                      </span>
                    </div>
                  </div>

                  {/* SKU Selection Control */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">Select N-Link Product SKU</label>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <select
                        value={selectedSkuId}
                        onChange={(e) => setSelectedSkuId(e.target.value)}
                        className="sm:col-span-7 p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-800 focus:outline-none"
                      >
                        {NLINK_OFFICIAL_PRODUCTS.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            [{sku.wattage}] {sku.name} — TP: PKR {sku.tradePrice} (CTN: {sku.cartonQuantity})
                          </option>
                        ))}
                      </select>

                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const sku = NLINK_OFFICIAL_PRODUCTS.find(p => p.id === selectedSkuId);
                          if (sku) handleAddToCart(sku, orderQuantity);
                        }}
                        className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Must-Sell / MSL Items Quick Addition Bar (Matching Image 3) */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 block">
                      Must-Sell (MSL) Suggested Items
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {NLINK_OFFICIAL_PRODUCTS.slice(0, 3).map((sku) => (
                        <div key={sku.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div className="space-y-0.5 max-w-[130px]">
                            <span className="font-bold text-slate-900 truncate block text-[11px]">{sku.name}</span>
                            <span className="font-mono text-[10px] text-emerald-700 font-bold">TP: PKR {sku.tradePrice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(sku, 50)}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-[10px] rounded-lg transition cursor-pointer shrink-0"
                          >
                            + ADD (50)
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Cart Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-slate-900 text-white p-3 text-xs font-extrabold flex justify-between items-center">
                      <span>My Cart Items ({cartItems.length})</span>
                      <span>Total: PKR {cartTotalAmount.toLocaleString()}</span>
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No items added to cart yet. Select a product above or click + ADD on MSL items.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                        {cartItems.map((item) => (
                          <div key={item.sku.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{item.sku.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.orderedQuantity} pcs @ PKR {item.unitPrice} / pc
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900">
                                PKR {item.lineTotal.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.sku.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary Bar & Check Out Actions (Matching Image 3) */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span>Total Qty: {cartTotalQty}</span>
                        <span>|</span>
                        <span>Items: {cartItems.length}</span>
                        <span>|</span>
                        <span className="text-emerald-400">Total: PKR {cartTotalAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Order will be posted directly to sales ledger.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitCartOrder}
                      disabled={cartItems.length === 0}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Save &amp; Check Out Order
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: RECEIVE MONEY / RECOVERY ENTRY FORM */}
              {cockpitSubTab === 'RECOVERY' && (
                <form onSubmit={handleSubmitRecoveryForm} className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-900 block">Record Payment Recovery</span>
                      <span className="text-[10px] text-amber-800">Collecting payment for {selCustomer.companyName} ({selCustomer.customerCode})</span>
                    </div>
                    <span className="font-mono text-xs font-black text-amber-900">
                      Balance: PKR {(selCustomer.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Collection Amount (PKR) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={recAmount}
                        onChange={(e) => setRecAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                      <select
                        value={recPaymentMode}
                        onChange={(e) => setRecPaymentMode(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="CASH">CASH (Hand Over)</option>
                        <option value="CHEQUE">CHEQUE / PAY ORDER</option>
                        <option value="ONLINE_TRANSFER">ONLINE IBFT / BANK TRANSFER</option>
                      </select>
                    </div>

                    {recPaymentMode !== 'CASH' && (
                      <>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Cheque / Ref No. *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. CHQ-994012 or IBFT Ref"
                            value={recInstrumentNo}
                            onChange={(e) => setRecInstrumentNo(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={recBankName}
                            onChange={(e) => setRecBankName(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Remarks / Note</label>
                      <input
                        type="text"
                        value={recRemarks}
                        onChange={(e) => setRecRemarks(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" /> Save &amp; Post Recovery Receipt
                  </button>
                </form>
              )}

              {/* SUB-TAB 4: PREVIOUS INVOICES */}
              {cockpitSubTab === 'INVOICES' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Invoices History for {selCustomer.companyName}</span>
                    <span className="text-[10px] text-slate-400">{selInvoices.length} Posted Invoices</span>
                  </div>

                  {selInvoices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                      No invoices posted yet for this customer account.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selInvoices.map((inv) => (
                        <div key={inv.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-indigo-700">{inv.invoiceNumber}</span>
                              <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                {inv.status || 'POSTED'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Date: {inv.invoiceDate || '2026-09-12'} · Tax/GST: PKR {(inv.taxAmount || 0).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              PKR {inv.totalAmount.toLocaleString()}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                handleSendWhatsApp(
                                  selCustomer.phone,
                                  `*NATIONAL LIGHTS INVOICE #${inv.invoiceNumber}*\nCustomer: ${selCustomer.companyName}\nTotal Amount: PKR ${inv.totalAmount.toLocaleString()}\nStatus: ${inv.status || 'POSTED'}`
                                );
                              }}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                              title="Share Invoice via WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 5: ACCOUNT LEDGER STATEMENT */}
              {cockpitSubTab === 'LEDGER' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-black text-xs text-slate-900">Double-Entry Account Statement</h4>
                      <p className="text-[10px] text-slate-400">{selCustomer.companyName} ({selCustomer.customerCode})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Statement
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Ref / Doc #</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right">Debit (+)</th>
                          <th className="p-2.5 text-right">Credit (-)</th>
                          <th className="p-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {/* Opening Balance */}
                        <tr className="bg-slate-50 font-bold">
                          <td className="p-2.5 text-slate-400">2026-01-01</td>
                          <td className="p-2.5 text-slate-500">OPEN-BAL</td>
                          <td className="p-2.5 text-slate-700">Opening Balance Brought Forward</td>
                          <td className="p-2.5 text-right text-slate-400">-</td>
                          <td className="p-2.5 text-right text-slate-400">-</td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            PKR {(selCustomer.openingBalance || 0).toLocaleString()}
                          </td>
                        </tr>

                        {/* Invoices */}
                        {selInvoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="p-2.5 text-slate-600">{inv.invoiceDate || '2026-09-11'}</td>
                            <td className="p-2.5 font-bold text-indigo-700">{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-slate-800 font-sans">Sales Invoice Dispatch</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">PKR {inv.totalAmount.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-slate-400">-</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              PKR {((selCustomer.openingBalance || 0) + inv.totalAmount).toLocaleString()}
                            </td>
                          </tr>
                        ))}

                        {/* Recoveries */}
                        {selRecoveries.map((rec) => (
                          <tr key={rec.id} className="bg-emerald-50/40">
                            <td className="p-2.5 text-slate-600">{rec.collectionDate || '2026-09-12'}</td>
                            <td className="p-2.5 font-bold text-emerald-800">{rec.recoveryNumber}</td>
                            <td className="p-2.5 text-slate-800 font-sans">Payment Recovery ({rec.paymentMode})</td>
                            <td className="p-2.5 text-right text-slate-400">-</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">PKR {rec.amount.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-black text-emerald-900">
                              PKR {(selCustomer.currentBalance || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Building className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">No Dealer or Distributor Selected</h3>
              <p className="text-xs text-slate-500">Select an account from the left directory to open their 360° cockpit.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTER NEW CHANNEL PARTNER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  Register New Dealer / Distributor
                </h3>
                <p className="text-xs text-slate-500">Creates an onboarding record requiring Head Office approval.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Company / Shop Registered Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Madina Electric Traders"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Partner Channel Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-emerald-800 bg-emerald-50/50"
                  >
                    <option value="DISTRIBUTOR">DISTRIBUTOR (Main Wholesale)</option>
                    <option value="DEALER">DEALER (Authorized Depot)</option>
                    <option value="SHOP">RETAIL SHOP / SUB-DEALER</option>
                    <option value="CUSTOMER">CORPORATE ACCOUNT</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Auto Customer Code</label>
                  <input
                    type="text"
                    disabled
                    value={previewCustomerCode}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 font-mono font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Haji Muhammad Tariq"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="03001234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Town / Market Beat</label>
                  <input
                    type="text"
                    placeholder="e.g. Brandreth Road"
                    value={formTown}
                    onChange={(e) => setFormTown(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">City / Division</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Authorized Credit Limit (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg transition active:scale-95"
                >
                  Register Channel Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
