/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - SKU-Wise Ordering & Payment Recovery Entry Form
 * Unified Single-Screen N-Link Entry Form Engine
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Coins,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  CreditCard,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  Percent,
  Check,
  Package,
  FileText,
  DollarSign,
  Phone,
  MapPin,
  RotateCcw,
  CheckCheck,
  Tag,
  TrendingUp,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { NLINK_OFFICIAL_PRODUCTS, NLINK_PRODUCT_CATEGORIES, NLinkSKU } from '../data/nlink-products';
import { NLinkUser } from '../data/nlink-users-team';
import { Customer, SalesOrder, Recovery } from '../types';
import { PaymentSlipCameraUpload, ExtractedSlipData } from './PaymentSlipCameraUpload';

const FORM_STORAGE_KEY = 'nlink_sales_recovery_form_unified_v3';

interface NLinkSkuOrderRecoveryFormProps {
  currentUser: NLinkUser;
  customers: Customer[];
  allUsers: NLinkUser[];
  invoices?: any[];
  recoveries?: any[];
  onOrderSubmitted: (order: Partial<SalesOrder>, customerName: string) => void;
  onRecoverySubmitted: (recovery: Partial<Recovery>, customerName: string) => void;
}

interface OrderItemRow {
  sku: NLinkSKU;
  cartons: number;
  looseUnits: number;
  totalUnits: number;
  unitPrice: number; // Trade Price
  discountPercent: number;
  lineTotal: number;
}

interface SavedFormDraft {
  selectedCustomerId: string;
  selectedCategory: string;
  orderItems: Record<string, { cartons: number; looseUnits: number; discount: number }>;
  orderRemarks: string;
  selectedBookerId: string;
  specialDiscountPct: number;
  recoveryAmount: string;
  collectionDate: string;
  paymentMode: 'CASH' | 'ONLINE_TRANSFER' | 'CHEQUE' | 'BANK_DEPOSIT';
  instrumentNo: string;
  bankName: string;
  recoveryRemarks: string;
  lastSavedAt?: string;
}

export const NLinkSkuOrderRecoveryForm: React.FC<NLinkSkuOrderRecoveryFormProps> = ({
  currentUser,
  customers,
  allUsers,
  invoices,
  recoveries,
  onOrderSubmitted,
  onRecoverySubmitted,
}) => {
  // Load saved draft or initialize default values
  const getInitialDraft = (): SavedFormDraft => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          selectedCustomerId: parsed.selectedCustomerId || customers[0]?.id || '',
          selectedCategory: parsed.selectedCategory || 'ALL',
          orderItems: parsed.orderItems || {},
          orderRemarks: parsed.orderRemarks || '',
          selectedBookerId: parsed.selectedBookerId || currentUser.id,
          specialDiscountPct: typeof parsed.specialDiscountPct === 'number' ? parsed.specialDiscountPct : 0,
          recoveryAmount: parsed.recoveryAmount || '',
          collectionDate: parsed.collectionDate || new Date().toISOString().split('T')[0],
          paymentMode: parsed.paymentMode || 'CASH',
          instrumentNo: parsed.instrumentNo || '',
          bankName: parsed.bankName || '',
          recoveryRemarks: parsed.recoveryRemarks || '',
          lastSavedAt: parsed.lastSavedAt,
        };
      }
    } catch (e) {
      console.error('Error loading order form draft from storage:', e);
    }
    return {
      selectedCustomerId: customers[0]?.id || '',
      selectedCategory: 'ALL',
      orderItems: {},
      orderRemarks: '',
      selectedBookerId: currentUser.id,
      specialDiscountPct: 0,
      recoveryAmount: '',
      collectionDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      instrumentNo: '',
      bankName: '',
      recoveryRemarks: '',
    };
  };

  const initialDraft = useMemo(() => getInitialDraft(), []);

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialDraft.selectedCustomerId);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Order Form State
  const [selectedCategory, setSelectedCategory] = useState<string>(initialDraft.selectedCategory);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [orderItems, setOrderItems] = useState<Record<string, { cartons: number; looseUnits: number; discount: number }>>(
    initialDraft.orderItems
  );
  const [orderRemarks, setOrderRemarks] = useState(initialDraft.orderRemarks);
  const [selectedBookerId, setSelectedBookerId] = useState<string>(initialDraft.selectedBookerId);
  const [specialDiscountPct, setSpecialDiscountPct] = useState<number>(initialDraft.specialDiscountPct);

  // Recovery Form State
  const [recoveryAmount, setRecoveryAmount] = useState<string>(initialDraft.recoveryAmount);
  const [collectionDate, setCollectionDate] = useState<string>(initialDraft.collectionDate);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE_TRANSFER' | 'CHEQUE' | 'BANK_DEPOSIT'>(
    initialDraft.paymentMode
  );
  const [instrumentNo, setInstrumentNo] = useState(initialDraft.instrumentNo);
  const [bankName, setBankName] = useState(initialDraft.bankName);
  const [recoveryRemarks, setRecoveryRemarks] = useState(initialDraft.recoveryRemarks);
  const [slipData, setSlipData] = useState<ExtractedSlipData | null>(null);

  // Auto-save notification timestamp
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(initialDraft.lastSavedAt || null);

  // Notification / Feedback Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // Persistence Hook: auto-save all state changes to localStorage
  useEffect(() => {
    try {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const draftToSave: SavedFormDraft = {
        selectedCustomerId,
        selectedCategory,
        orderItems,
        orderRemarks,
        selectedBookerId,
        specialDiscountPct,
        recoveryAmount,
        collectionDate,
        paymentMode,
        instrumentNo,
        bankName,
        recoveryRemarks,
        lastSavedAt: now,
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(draftToSave));
      setLastSavedTime(now);
    } catch (e) {
      console.error('Error saving unified draft to localStorage:', e);
    }
  }, [
    selectedCustomerId,
    selectedCategory,
    orderItems,
    orderRemarks,
    selectedBookerId,
    specialDiscountPct,
    recoveryAmount,
    collectionDate,
    paymentMode,
    instrumentNo,
    bankName,
    recoveryRemarks,
  ]);

  // Filtered customer list by role assignment
  const assignedCustomers = useMemo(() => {
    const bypassRoles = ['SUPER_ADMIN', 'MANAGEMENT', 'CORPORATE_ACCOUNTS', 'WAREHOUSE', 'DISPATCH'];
    if (bypassRoles.includes(currentUser.role)) {
      return customers;
    }

    return customers.filter((c) => {
      // Direct assignment by ID
      const isDirectIdMatch = 
        c.assignedOfficerId === currentUser.id || 
        c.salesUserId === currentUser.id || 
        c.submittedById === currentUser.id;
      if (isDirectIdMatch) return true;

      // Match by assigned towns
      if (currentUser.assignedTowns && currentUser.assignedTowns.length > 0) {
        const matchesTown = currentUser.assignedTowns.some(
          (t) => 
            (c.city && c.city.toLowerCase() === t.toLowerCase()) || 
            (c.town && c.town.toLowerCase() === t.toLowerCase()) || 
            (c.territory && c.territory.toLowerCase() === t.toLowerCase())
        );
        if (matchesTown) return true;
      }

      // Match by territory
      if (currentUser.territory && currentUser.territory !== 'National') {
        const matchesTerritory = 
          (c.territory && c.territory.toLowerCase() === currentUser.territory.toLowerCase()) ||
          (c.city && c.city.toLowerCase() === currentUser.territory.toLowerCase());
        if (matchesTerritory) return true;
      }

      // Match by officer name
      if (c.assignedOfficerName && c.assignedOfficerName.toLowerCase() === currentUser.fullName.toLowerCase()) {
        return true;
      }

      return false;
    });
  }, [customers, currentUser]);

  // Selected customer object (prefers assigned ones first)
  const selectedCustomer = useMemo(() => {
    return assignedCustomers.find((c) => c.id === selectedCustomerId) || assignedCustomers[0] || null;
  }, [assignedCustomers, selectedCustomerId]);

  // Filtered customer list for picker
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return assignedCustomers;
    const q = customerSearchQuery.toLowerCase();
    return assignedCustomers.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.territory && c.territory.toLowerCase().includes(q))
    );
  }, [assignedCustomers, customerSearchQuery]);

  // Real-time Dealers Account Statement values
  const customerStatement = useMemo(() => {
    if (!selectedCustomer) {
      return { openingBalance: 0, invoicesTotal: 0, recoveriesTotal: 0, netBalance: 0 };
    }
    const openingBalance = Number(selectedCustomer.openingBalance || 0);

    // Sum of invoices for this customer
    const invoicesTotal = (invoices || [])
      .filter((inv) => inv.customerId === selectedCustomer.id)
      .reduce((sum, inv) => sum + Number(inv.totalAmount || inv.amount || 0), 0);

    // Sum of recoveries for this customer
    const recoveriesTotal = (recoveries || [])
      .filter((rec) => rec.customerId === selectedCustomer.id)
      .reduce((sum, rec) => sum + Number(rec.amount || 0), 0);

    const netBalance = openingBalance + invoicesTotal - recoveriesTotal;

    return {
      openingBalance,
      invoicesTotal,
      recoveriesTotal,
      netBalance,
    };
  }, [selectedCustomer, invoices, recoveries]);

  // Filtered N-Link SKU list
  const filteredSkus = useMemo(() => {
    return NLINK_OFFICIAL_PRODUCTS.filter((sku) => {
      const matchCat = selectedCategory === 'ALL' || sku.category === selectedCategory;
      const matchSearch =
        !skuSearchQuery.trim() ||
        sku.name.toLowerCase().includes(skuSearchQuery.toLowerCase()) ||
        sku.skuCode.toLowerCase().includes(skuSearchQuery.toLowerCase()) ||
        sku.wattage.toLowerCase().includes(skuSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, skuSearchQuery]);

  // Active Order Rows Calculation
  const activeOrderRows: OrderItemRow[] = useMemo(() => {
    const rows: OrderItemRow[] = [];
    Object.entries(orderItems).forEach(([skuId, rawItemState]) => {
      const itemState = rawItemState as { cartons: number; looseUnits: number; discount: number };
      const sku = NLINK_OFFICIAL_PRODUCTS.find((s) => s.id === skuId);
      if (!sku) return;
      const totalUnits = (itemState.cartons || 0) * sku.cartonQuantity + (itemState.looseUnits || 0);
      if (totalUnits <= 0) return;

      const gross = totalUnits * sku.tradePrice;
      const disc = gross * ((itemState.discount || 0) / 100);
      const lineTotal = Math.max(0, gross - disc);

      rows.push({
        sku,
        cartons: itemState.cartons || 0,
        looseUnits: itemState.looseUnits || 0,
        totalUnits,
        unitPrice: sku.tradePrice,
        discountPercent: itemState.discount || 0,
        lineTotal,
      });
    });
    return rows;
  }, [orderItems]);

  // Order Summary Calculations
  const orderSummary = useMemo(() => {
    const totalCartons = activeOrderRows.reduce((sum, r) => sum + r.cartons, 0);
    const totalUnits = activeOrderRows.reduce((sum, r) => sum + r.totalUnits, 0);
    const subtotal = activeOrderRows.reduce((sum, r) => sum + r.lineTotal, 0);
    const specialDiscAmount = subtotal * (specialDiscountPct / 100);
    const netGrandTotal = Math.max(0, subtotal - specialDiscAmount);

    const prevBalance = selectedCustomer?.currentBalance || 0;
    const creditLimit = selectedCustomer?.creditLimit || 0;
    const projectedNewBalance = prevBalance + netGrandTotal;
    const isExceedingCredit = creditLimit > 0 && projectedNewBalance > creditLimit;

    return {
      totalCartons,
      totalUnits,
      subtotal,
      specialDiscAmount,
      netGrandTotal,
      prevBalance,
      creditLimit,
      projectedNewBalance,
      isExceedingCredit,
      itemsCount: activeOrderRows.length,
    };
  }, [activeOrderRows, specialDiscountPct, selectedCustomer]);

  // Handlers for Order Quantity Adjustments
  const handleCartonIncrement = (skuId: string, delta: number) => {
    setOrderItems((prev) => {
      const curr = prev[skuId] || { cartons: 0, looseUnits: 0, discount: 0 };
      const newCartons = Math.max(0, (curr.cartons || 0) + delta);
      return {
        ...prev,
        [skuId]: { ...curr, cartons: newCartons },
      };
    });
  };

  const handleCartonChange = (skuId: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setOrderItems((prev) => {
      const curr = prev[skuId] || { cartons: 0, looseUnits: 0, discount: 0 };
      return {
        ...prev,
        [skuId]: { ...curr, cartons: num },
      };
    });
  };

  const handleLooseUnitsChange = (skuId: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setOrderItems((prev) => {
      const curr = prev[skuId] || { cartons: 0, looseUnits: 0, discount: 0 };
      return {
        ...prev,
        [skuId]: { ...curr, looseUnits: num },
      };
    });
  };

  const handleLooseUnitsIncrement = (skuId: string, delta: number) => {
    setOrderItems((prev) => {
      const curr = prev[skuId] || { cartons: 0, looseUnits: 0, discount: 0 };
      const newLoose = Math.max(0, (curr.looseUnits || 0) + delta);
      return {
        ...prev,
        [skuId]: { ...curr, looseUnits: newLoose },
      };
    });
  };

  const handleItemDiscountChange = (skuId: string, val: string) => {
    const disc = Math.min(25, Math.max(0, parseFloat(val) || 0));
    setOrderItems((prev) => {
      const curr = prev[skuId] || { cartons: 0, looseUnits: 0, discount: 0 };
      return {
        ...prev,
        [skuId]: { ...curr, discount: disc },
      };
    });
  };

  const handleRemoveItem = (skuId: string) => {
    setOrderItems((prev) => {
      const copy = { ...prev };
      delete copy[skuId];
      return copy;
    });
  };

  const handleClearOrderItems = () => {
    setOrderItems({});
    setSpecialDiscountPct(0);
  };

  const handleResetEntireDraft = () => {
    if (window.confirm('Clear all draft quantities, remarks, and selections?')) {
      setOrderItems({});
      setOrderRemarks('');
      setSpecialDiscountPct(0);
      setRecoveryAmount('');
      setInstrumentNo('');
      setBankName('');
      setRecoveryRemarks('');
      localStorage.removeItem(FORM_STORAGE_KEY);
      setFeedback({ type: 'info', message: 'Form draft reset to clean state.' });
    }
  };

  // Submit Order Handler
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setFeedback({ type: 'warning', message: 'Please select an authorized customer dealer.' });
      return;
    }
    if (activeOrderRows.length === 0) {
      setFeedback({ type: 'warning', message: 'Please add at least 1 product carton or loose unit to book an order.' });
      return;
    }

    const booker = allUsers.find((u) => u.id === selectedBookerId) || currentUser;
    const orderNumber = `SO-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Partial<SalesOrder> = {
      id: `ord_${Date.now()}`,
      orderNumber,
      orderDate: new Date().toISOString().split('T')[0],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      customerCode: selectedCustomer.customerCode,
      salesUserId: booker.id,
      salesUserName: booker.fullName,
      status: 'APPROVED',
      totalAmount: orderSummary.netGrandTotal,
      subtotal: orderSummary.subtotal,
      discountAmount: orderSummary.specialDiscAmount,
      taxAmount: 0,
      creditCheckStatus: orderSummary.isExceedingCredit ? 'AMBER' : 'GREEN',
      notes: orderRemarks ? `Delivery Note: ${orderRemarks}` : 'Booked via N-Link Field Portal',
      items: activeOrderRows.map((r, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        orderId: `ord_${Date.now()}`,
        skuId: r.sku.id,
        skuCode: r.sku.skuCode,
        skuName: r.sku.name,
        orderedQuantity: r.totalUnits,
        unitPrice: r.unitPrice,
        discountPercent: r.discountPercent,
        lineTotal: r.lineTotal,
      })),
      createdAt: new Date().toISOString(),
    };

    onOrderSubmitted(newOrder, selectedCustomer.companyName);

    setFeedback({
      type: 'success',
      message: `Sales Order #${orderNumber} (${activeOrderRows.length} items, Rs. ${orderSummary.netGrandTotal.toLocaleString()}) submitted and synced to central ledger!`,
    });

    // Reset order items
    setOrderItems({});
    setOrderRemarks('');
    setSpecialDiscountPct(0);
  };

  // Submit Recovery Handler
  const handleSubmitRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(recoveryAmount);
    if (!selectedCustomer) {
      setFeedback({ type: 'warning', message: 'Please select a customer dealer first.' });
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: 'warning', message: 'Please enter a valid recovery payment amount.' });
      return;
    }

    // Enforce mandatory slip picture proof for non-cash recoveries
    if (paymentMode !== 'CASH') {
      if (!slipData || !slipData.slipImageUrl) {
        setFeedback({
          type: 'warning',
          message: `Mandatory Slip Proof: Please capture with camera or upload a clear slip/cheque photo for ${paymentMode}.`,
        });
        return;
      }
    }

    const collector = allUsers.find((u) => u.id === selectedBookerId) || currentUser;
    const recoveryNumber = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalBank = slipData?.bankName || bankName || undefined;
    const finalInstrument = slipData?.instrumentNumber || instrumentNo || undefined;
    const finalRemarks = recoveryRemarks
      ? `Payment: ${recoveryRemarks}`
      : slipData?.remarks
      ? `Verified Slip: ${slipData.remarks}`
      : `Payment received via ${paymentMode}`;

    const newRecovery: Partial<Recovery> = {
      id: `rec_${Date.now()}`,
      recoveryNumber,
      collectionDate: collectionDate,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.companyName,
      customerCode: selectedCustomer.customerCode,
      salesUserId: collector.id,
      salesUserName: collector.fullName,
      amount: amountNum,
      paymentMode: paymentMode as any,
      instrumentNumber: finalInstrument,
      bankName: finalBank,
      status: 'VERIFIED',
      remarks: finalRemarks,
      createdAt: new Date().toISOString(),
    };

    onRecoverySubmitted(newRecovery, selectedCustomer.companyName);

    setFeedback({
      type: 'success',
      message: `Payment Recovery #${recoveryNumber} for Rs. ${amountNum.toLocaleString()} with 100% verified slip posted to customer ledger!`,
    });

    // Reset recovery inputs
    setRecoveryAmount('');
    setInstrumentNo('');
    setBankName('');
    setRecoveryRemarks('');
    setSlipData(null);
  };

  // Current Target Achievement stats for the logged-in user
  const salesPercentage = Math.min(100, Math.round((currentUser.mtdSalesAchieved / (currentUser.monthlySalesTarget || 1)) * 100));
  const recoveryPercentage = Math.min(100, Math.round((currentUser.mtdRecoveryAchieved / (currentUser.monthlyRecoveryTarget || 1)) * 100));

  return (
    <div className="space-y-6" id="nlink-entry-form-container">
      
      {/* 1. HEADER SECTION & AUTO-SAVE INDICATOR */}
      <div className="bg-white rounded-2xl border border-slate-200/95 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Zap className="w-3 h-3 mr-1 text-emerald-600" /> N-Link Direct Entry
            </span>
            {lastSavedTime && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Draft Auto-Saved {lastSavedTime}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Order Booking & Recovery Statement</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Officer: <strong className="text-slate-800">{currentUser.fullName}</strong> ({currentUser.roleTitle}) • Beat Territory: <strong className="text-slate-800">{currentUser.territory}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetEntireDraft}
          className="self-start sm:self-center px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Draft Fields</span>
        </button>
      </div>

      {/* FEEDBACK SYSTEM NOTIFICATION */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. TARGET VS ACHIEVEMENT PROFILE (Section 3 of user requirements) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3 sm:mb-4">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Target vs Achievement (MTD Performance)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* MTD Sales Target Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 p-3 sm:p-4 rounded-xl border border-slate-200/70">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> MTD Order Sales Quota
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                {salesPercentage}%
              </span>
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${salesPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center pt-1.5 border-t border-slate-200/60">
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">Quota</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 font-mono">
                  Rs. {(currentUser.monthlySalesTarget / 1000).toFixed(0)}k
                </span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">MTD Booked</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-emerald-700 font-mono">
                  Rs. {(currentUser.mtdSalesAchieved / 1000).toFixed(0)}k
                </span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">Today</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 font-mono">
                  Rs. {(currentUser.todaySalesAchieved / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
          </div>

          {/* MTD Recovery Target Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-3 sm:p-4 rounded-xl border border-slate-200/70">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-600 shrink-0" /> MTD Cash Recovery Quota
              </span>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                {recoveryPercentage}%
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${recoveryPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center pt-1.5 border-t border-slate-200/60">
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">Quota</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 font-mono">
                  Rs. {(currentUser.monthlyRecoveryTarget / 1000).toFixed(0)}k
                </span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">MTD Rec.</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-blue-700 font-mono">
                  Rs. {(currentUser.mtdRecoveryAchieved / 1000).toFixed(0)}k
                </span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block font-medium">Today</span>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 font-mono">
                  Rs. {(currentUser.todayRecoveryAchieved / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE GRID - LEFT COLUMN (DISTRIBUTOR DETAILS & RECOVERY) VS RIGHT COLUMN (ORDER SKU GRIDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* LEFT COLUMN: DISTRIBUTOR & STATEMENT & PAYMENT RECOVERY */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          
          {/* A. DISTRIBUTOR DETAILS (Section 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. Distributor &amp; Dealer Account
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono font-bold px-2 py-0.5 rounded-lg">
                {assignedCustomers.length} Assigned
              </span>
            </div>

            {/* Selector Search & Dropdown */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dealer by name or town..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 text-slate-950 placeholder-slate-400 pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-control"
                />
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none touch-control"
              >
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.customerCode}) - Bal: Rs. {c.currentBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Dealer Summary Details */}
            {selectedCustomer && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-700 font-bold text-[11px]">Code: {selectedCustomer.customerCode}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedCustomer.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedCustomer.approvalStatus === 'APPROVED' ? 'Active Ledger' : 'Pending Approval'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-medium">Proprietor</span>
                    <span className="font-bold text-slate-800 truncate block">{selectedCustomer.contactPerson || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-medium">Phone / Call</span>
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="font-bold text-emerald-700 flex items-center gap-1 hover:underline truncate"
                    >
                      <Phone className="w-3 h-3 shrink-0" /> {selectedCustomer.phone}
                    </a>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[9px] uppercase font-medium">Supply Town &amp; City</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {selectedCustomer.town}, {selectedCustomer.city}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* B. LEDGER BALANCE / DEALERS ACCOUNT STATEMENT (Section 2) */}
          {selectedCustomer && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-3.5">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-amber-500" />
                2. Dealers Account Statement
              </h3>

              {/* Connected Mathematical Equation Block (Mobile Refined) */}
              <div className="bg-slate-900 rounded-xl p-3.5 text-white border border-slate-800 space-y-3">
                {/* 3 Step Financial Ledger Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  
                  {/* 1. Opening Balance */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">Opening</span>
                    <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm mt-0.5">
                      Rs. {customerStatement.openingBalance.toLocaleString()}
                    </span>
                  </div>

                  {/* 2. Invoices */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col justify-between relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-300 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold z-10">
                      +
                    </span>
                    <span className="text-[9px] text-emerald-400 uppercase font-semibold">Invoices</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm mt-0.5">
                      Rs. {customerStatement.invoicesTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* 3. Recovery */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col justify-between relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-300 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold z-10">
                      -
                    </span>
                    <span className="text-[9px] text-blue-400 uppercase font-semibold">Recovery</span>
                    <span className="font-mono font-bold text-blue-400 text-xs sm:text-sm mt-0.5">
                      Rs. {customerStatement.recoveriesTotal.toLocaleString()}
                    </span>
                  </div>

                </div>

                {/* Net Balance Result Banner */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="font-medium">Live Ledger Balance:</span>
                  </div>
                  <div className="bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-lg text-right">
                    <span className="text-[9px] text-amber-300 uppercase block font-semibold">Current Net Balance</span>
                    <span className="font-mono font-extrabold text-amber-400 text-sm sm:text-base">
                      Rs. {customerStatement.netBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Status Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[9px] uppercase block font-medium">Credit Limit</span>
                  <span className="font-bold text-slate-800">Rs. {selectedCustomer.creditLimit.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[9px] uppercase block font-medium">Credit Terms</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.creditDays} Days allowed</span>
                </div>
              </div>
            </div>
          )}

          {/* C. PAYMENT RECOVERY ENTRY FORM (Section 4) */}
          {selectedCustomer && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-blue-600" />
                  4. Payment Recovery Entry
                </h3>
              </div>

              {/* Quick Preset Amount Buttons */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 block">Preset Shortcut Amounts:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRecoveryAmount(String(amt))}
                      className="py-2 px-2 text-xs font-bold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors touch-control flex items-center justify-center"
                    >
                      Rs. {amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRecoveryAmount(String(selectedCustomer.currentBalance))}
                    className="py-2 px-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors touch-control flex items-center justify-center"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              {/* Recovery Amount and Collection Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Amount (PKR)*
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-control"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Collection Date*
                  </label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-control"
                  />
                </div>
              </div>

              {/* Payment Mode Tiles */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700">Payment Instrument Channel*:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'CASH', label: 'Cash Payment' },
                    { mode: 'ONLINE_TRANSFER', label: 'Online IBFT' },
                    { mode: 'CHEQUE', label: 'Bank Cheque' },
                    { mode: 'BANK_DEPOSIT', label: 'Bank Deposit Slip' },
                  ].map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => setPaymentMode(m.mode as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all touch-control flex items-center justify-between ${
                        paymentMode === m.mode
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className="text-xs">{m.label}</span>
                      {paymentMode === m.mode && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* MANDATORY PAYMENT SLIP CAMERA / OCR UPLOAD FOR NON-CASH */}
              {paymentMode !== 'CASH' && (
                <div className="pt-2">
                  <PaymentSlipCameraUpload
                    paymentMode={paymentMode}
                    currentSlipData={slipData}
                    expectedAmount={parseFloat(recoveryAmount) || undefined}
                    onSlipVerified={(extracted) => {
                      setSlipData(extracted);
                      if (extracted.amount) {
                        setRecoveryAmount(String(extracted.amount));
                      }
                      if (extracted.bankName) {
                        setBankName(extracted.bankName);
                      }
                      if (extracted.instrumentNumber) {
                        setInstrumentNo(extracted.instrumentNumber);
                      }
                      if (extracted.date) {
                        setCollectionDate(extracted.date);
                      }
                      if (extracted.remarks) {
                        setRecoveryRemarks(extracted.remarks);
                      }
                    }}
                    onRemoveSlip={() => {
                      setSlipData(null);
                    }}
                  />
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-700 block">Recovery Remarks / Ledger Notes:</label>
                <input
                  type="text"
                  value={recoveryRemarks}
                  onChange={(e) => setRecoveryRemarks(e.target.value)}
                  placeholder="e.g. Cleared pending bill invoice"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 touch-control"
                />
              </div>

              {/* Post Recovery Submit Button */}
              <button
                type="button"
                onClick={handleSubmitRecovery}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 active:scale-98 touch-control"
              >
                <Coins className="w-4 h-4" />
                <span>Submit &amp; Post Payment Recovery</span>
              </button>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: BRAND & SKU SELECTION & ORDERING */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* BRANDS / SKU ENTRY FOR ORDERING (Section 5) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                5. Brand SKUs Ordering Catalog
              </h3>
              
              {/* Category selector pill badges */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                {NLINK_PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${
                      selectedCategory === cat.key ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SKU Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search lights, bulbs, wattage..."
                value={skuSearchQuery}
                onChange={(e) => setSkuSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-950 placeholder-slate-400 pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* PRODUCT SKU CATALOG LIST/CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredSkus.map((sku) => {
                const itemState = orderItems[sku.id] || { cartons: 0, looseUnits: 0, discount: 0 };
                const totalUnits = (itemState.cartons || 0) * sku.cartonQuantity + (itemState.looseUnits || 0);
                const isSelected = totalUnits > 0;
                
                const gross = totalUnits * sku.tradePrice;
                const disc = gross * ((itemState.discount || 0) / 100);
                const lineTotal = Math.max(0, gross - disc);

                return (
                  <div
                    key={sku.id}
                    className={`p-3.5 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{sku.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-emerald-700 font-bold font-mono">
                            Rs. {sku.tradePrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({sku.cartonQuantity} pcs/CTN)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Carton Entry Inputs and steppers */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Cartons (CTN):
                        </label>
                        <div className="flex items-center bg-slate-100/80 rounded-xl border border-slate-200 p-1">
                          <button
                            type="button"
                            onClick={() => handleCartonIncrement(sku.id, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors touch-control shrink-0"
                            aria-label="Decrease cartons"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={itemState.cartons || ''}
                            onChange={(e) => handleCartonChange(sku.id, e.target.value)}
                            placeholder="0"
                            className="w-full text-center bg-transparent font-extrabold font-mono text-slate-900 text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCartonIncrement(sku.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors touch-control shrink-0"
                            aria-label="Increase cartons"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Loose Pcs:
                        </label>
                        <div className="flex items-center bg-slate-100/80 rounded-xl border border-slate-200 p-1">
                          <button
                            type="button"
                            onClick={() => handleLooseUnitsIncrement(sku.id, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors touch-control shrink-0"
                            aria-label="Decrease loose pcs"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={itemState.looseUnits || ''}
                            onChange={(e) => handleLooseUnitsChange(sku.id, e.target.value)}
                            placeholder="0"
                            className="w-full text-center bg-transparent font-extrabold font-mono text-slate-900 text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleLooseUnitsIncrement(sku.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors touch-control shrink-0"
                            aria-label="Increase loose pcs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Item Card Footer details */}
                    {isSelected && (
                      <div className="pt-2.5 mt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-600 block">
                            Units: <strong className="text-slate-950 font-mono">{totalUnits} pcs</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(sku.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-bold underline"
                          >
                            Clear Item
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block uppercase font-semibold">Line Total</span>
                          <span className="font-extrabold font-mono text-emerald-800 text-xs">
                            Rs. {lineTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BOOKING TOTALS SUMMARY CARD */}
            {activeOrderRows.length > 0 && (
              <div id="order-summary-box" className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3.5 border border-slate-800 shadow-lg scroll-mt-20">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Order Totals Overview</span>
                  <button
                    type="button"
                    onClick={handleClearOrderItems}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-950/40 rounded border border-red-900/50"
                  >
                    Clear All Bookings
                  </button>
                </div>

                {/* Subtotals & Discounts */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal Price ({orderSummary.itemsCount} SKUs):</span>
                    <span className="font-mono font-bold">Rs. {orderSummary.subtotal.toLocaleString()}</span>
                  </div>

                  {/* Special scheme discount entry field */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-emerald-400" /> Scheme Promo Discount (%):
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={specialDiscountPct || ''}
                      onChange={(e) => setSpecialDiscountPct(Math.min(20, parseFloat(e.target.value) || 0))}
                      placeholder="0%"
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg text-center text-xs font-bold text-white py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {specialDiscountPct > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Scheme Discount Deducted:</span>
                      <span className="font-mono font-bold">- Rs. {orderSummary.specialDiscAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm sm:text-base font-extrabold border-t border-slate-800 pt-2 text-white">
                    <span>Net Order Value:</span>
                    <span className="text-emerald-400 font-mono">Rs. {orderSummary.netGrandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Credit Limit Warnings */}
                {selectedCustomer && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Current Ledger:</span>
                      <span className="font-mono">Rs. {orderSummary.prevBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span>Projected Ledger After Delivery:</span>
                      <span className="font-mono text-amber-300">Rs. {orderSummary.projectedNewBalance.toLocaleString()}</span>
                    </div>
                    {orderSummary.isExceedingCredit && (
                      <div className="text-amber-400 flex items-center gap-1.5 pt-1 text-[10px]">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Exceeds dealer credit limit of Rs. {orderSummary.creditLimit.toLocaleString()} (Requires approval).</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Remarks */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block">Order Remarks / Delivery Instructions:</label>
                  <input
                    type="text"
                    value={orderRemarks}
                    onChange={(e) => setOrderRemarks(e.target.value)}
                    placeholder="e.g. Deliver before noon, call store keeper"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 touch-control"
                  />
                </div>

                {/* Submit Order Booking Button */}
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 touch-control"
                >
                  <Send className="w-4 h-4" />
                  <span>Book Distributor Sales Order (Rs. {orderSummary.netGrandTotal.toLocaleString()})</span>
                </button>
              </div>
            )}

            {activeOrderRows.length === 0 && (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No quantities added. Use Cartons or Loose Pcs steppers above to add SKUs.
              </div>
            )}

          </div>

        </div>

      </div>

      {/* FLOATING MOBILE QUICK ORDER SUMMARY BAR */}
      {activeOrderRows.length > 0 && (
        <div className="fixed md:hidden bottom-20 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  {orderSummary.itemsCount} SKUs ({orderSummary.totalUnits} Pcs)
                </span>
                <span className="font-mono font-extrabold text-xs text-emerald-400">
                  Rs. {orderSummary.netGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                document.getElementById('order-summary-box')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-2 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 touch-control"
            >
              <span>Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
