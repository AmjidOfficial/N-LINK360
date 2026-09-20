/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Orders & Ledgers
 * Unified Dealer/Distributor-Based Booking, Recovery, Invoices, and Running Ledger Flow
 * Based on National Light Pakistan official rates catalog (PKR)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { NATIONAL_LIGHT_OFFICIAL_CATALOG, NationalLightItem, NATIONAL_LIGHT_OFFICE_INFO } from '../../data/national-light-rate-card';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NationalLightLogo } from '../NationalLightLogo';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import {
  isAutoSaveEnabled,
  saveDraftOrderProgress,
  getDraftOrderProgress,
  clearDraftOrderProgress
} from '../../services/orderAutoSaveService';

export interface EnterpriseOrdersTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  onPlaceOrder: (newOrder: SalesOrder) => void;
  onRecordRecovery: (newRecovery: Recovery) => void;
  onOpenRateCard: () => void;
  initialSelectedCustomerId?: string;
  selectedAttendanceTown?: string;
  isCheckedIn?: boolean;
  onNavigateToAttendance?: () => void;
  lockModeTo?: 'ENTRY' | 'LEDGERS';
  initialMode?: 'order' | 'recovery' | 'invoices' | 'ledger';
}

interface CartItem {
  product: NationalLightItem;
  quantity: number; // in pcs
}

const PAKISTAN_BANKS = [
  'Meezan Bank Limited (MBL)',
  'Habib Bank Limited (HBL)',
  'MCB Bank Limited',
  'United Bank Limited (UBL)',
  'Allied Bank Limited (ABL)',
  'Bank Alfalah',
  'Bank of Khyber (BOK)',
  'National Bank of Pakistan (NBP)',
  'Askari Bank Limited',
  'Bank AL Habib',
  'Faysal Bank',
  'Dubai Islamic Bank',
  'EasyPaisa / Telenor Bank',
  'JazzCash / Mobilink Microfinance',
];

export const EnterpriseOrdersTab: React.FC<EnterpriseOrdersTabProps> = ({
  currentUser,
  customers,
  orders,
  recoveries,
  onPlaceOrder,
  onRecordRecovery,
  onOpenRateCard,
  initialSelectedCustomerId,
  selectedAttendanceTown,
  isCheckedIn = true,
  onNavigateToAttendance,
  lockModeTo,
  initialMode,
}) => {
  // Strict Enterprise Filtering:
  // Flow: Assigned User -> Assigned Town -> Active Attendance Town -> Dealers/Distributors in that town
  const filteredCustomers = useMemo(() => {
    const isExecutive = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MANAGEMENT';

    // 1. If an active attendance town is selected (or user checked in)
    if (selectedAttendanceTown) {
      const normSelected = selectedAttendanceTown.toLowerCase().trim();
      return customers.filter((customer) => {
        const custTown = (customer.town || '').toLowerCase();
        const custCity = (customer.city || '').toLowerCase();
        const custTerritory = (customer.territory || '').toLowerCase();

        const townMatches =
          custTown.includes(normSelected) ||
          normSelected.includes(custTown) ||
          custCity.includes(normSelected) ||
          normSelected.includes(custCity) ||
          custTerritory.includes(normSelected) ||
          normSelected.includes(custTerritory);

        if (!townMatches) return false;

        // If field agent, verify customer is in their assigned towns
        if (!isExecutive && currentUser.assignedTowns && currentUser.assignedTowns.length > 0) {
          const userTowns = currentUser.assignedTowns.map((t) => t.toLowerCase());
          return userTowns.some(
            (t) => custTown.includes(t) || custCity.includes(t) || t.includes(custTown) || t.includes(custCity)
          );
        }

        return true;
      });
    }

    // 2. If no attendance town checked-in yet, filter strictly by user's assigned towns
    if (!isExecutive && currentUser.assignedTowns && currentUser.assignedTowns.length > 0) {
      const userTowns = currentUser.assignedTowns.map((t) => t.toLowerCase());
      return customers.filter((customer) => {
        const custTown = (customer.town || '').toLowerCase();
        const custCity = (customer.city || '').toLowerCase();
        return userTowns.some((t) => custTown.includes(t) || custCity.includes(t) || t.includes(custTown));
      });
    }

    // Executive fallback
    return customers;
  }, [customers, selectedAttendanceTown, currentUser]);

  // 1. Primary Selected Dealer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialSelectedCustomerId || filteredCustomers[0]?.id || customers[0]?.id || ''
  );

  // Sync when initialSelectedCustomerId prop changes from parent navigation
  useEffect(() => {
    if (initialSelectedCustomerId) {
      setSelectedCustomerId(initialSelectedCustomerId);
    }
  }, [initialSelectedCustomerId]);

  // Sync selectedCustomerId when town filters change the available list
  React.useEffect(() => {
    if (filteredCustomers.length > 0) {
      const exists = filteredCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) {
        setSelectedCustomerId(filteredCustomers[0].id);
        setOrderCart([]);
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [filteredCustomers, selectedCustomerId]);

  // Get active dealer details
  const activeDealer = useMemo(() => {
    return (
      filteredCustomers.find((c) => c.id === selectedCustomerId) ||
      customers.find((c) => c.id === selectedCustomerId) ||
      filteredCustomers[0] ||
      customers[0] || {
        id: '',
        customerCode: 'N/A',
        companyName: 'No Dealer Selected',
        contactPerson: 'None',
        phone: 'N/A',
        address: 'Please add a dealer from the Dealers tab or sync from Google Sheet',
        city: 'N/A',
        creditLimit: 0,
        currentBalance: 0,
        status: 'NORMAL',
        isActive: false,
      }
    );
  }, [filteredCustomers, customers, selectedCustomerId]);

  // Unified Section Tab Pages
  const defaultMode = lockModeTo === 'LEDGERS' ? 'invoices' : 'order';
  const [activeMode, setActiveMode] = useState<'order' | 'recovery' | 'invoices' | 'ledger'>(
    initialMode || defaultMode
  );

  // Keep mode in sync if lockModeTo changes
  useEffect(() => {
    if (lockModeTo === 'LEDGERS' && (activeMode === 'order' || activeMode === 'recovery')) {
      setActiveMode('invoices');
    } else if (lockModeTo === 'ENTRY' && (activeMode === 'invoices' || activeMode === 'ledger')) {
      setActiveMode('order');
    }
  }, [lockModeTo]);

  // Submission loading states to prevent duplicate submissions
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);

  // ================= ORDER BOOKING MODE STATE =================
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderCart, setOrderCart] = useState<CartItem[]>(() => {
    const saved = getDraftOrderProgress();
    if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
      // If items match CartItem format or can be restored
      if (saved.items[0]?.product) {
        return saved.items;
      }
    }
    return [];
  });
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [orderRemarks, setOrderRemarks] = useState('');
  const [cartQuantities, setCartQuantities] = useState<Record<string, { cartons: number; packs: number }>>({});

  // Order Cart Calculations
  const cartSubtotal = orderCart.reduce((sum, item) => sum + item.product.listPrice * item.quantity, 0);
  const cartDiscount = 0; // Removed Volume Trade Discount
  const cartTax = 0; // Removed General Sales Tax (GST)
  const cartFreight = 0; // Removed Cargo Freight Delivery
  const cartTotal = cartSubtotal;

  // Hourly Auto-Save Effect (Saves order progress to localStorage every 1 Hour to prevent mobile browser crash data loss)
  useEffect(() => {
    if (!isAutoSaveEnabled()) return;

    if (orderCart.length > 0) {
      saveDraftOrderProgress({
        items: orderCart,
        customerId: activeDealer?.id,
        customerName: activeDealer?.companyName,
        totalAmount: cartTotal,
      });
    }

    const ONE_HOUR_MS = 3600000; // 1 Hour in milliseconds
    const timer = setInterval(() => {
      if (isAutoSaveEnabled() && orderCart.length > 0) {
        saveDraftOrderProgress({
          items: orderCart,
          customerId: activeDealer?.id,
          customerName: activeDealer?.companyName,
          totalAmount: cartTotal,
        });
      }
    }, ONE_HOUR_MS);

    return () => clearInterval(timer);
  }, [orderCart, activeDealer?.id, activeDealer?.companyName, cartTotal]);

  // ================= RECOVERY ENTRY MODE STATE =================
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState(PAKISTAN_BANKS[0]);
  const [receiptSimulated, setReceiptSimulated] = useState(false);
  const [recoveryRemarks, setRecoveryRemarks] = useState('');

  // ================= LEDGER & INVOICES FILTERS STATE =================
  const [invoiceSelectedMonths, setInvoiceSelectedMonths] = useState<string[]>(['All Months']);
  const [ledgerSelectedMonths, setLedgerSelectedMonths] = useState<string[]>(['All Months']);
  const [ledgerStartDate, setLedgerStartDate] = useState('2026-07-01');
  const [ledgerEndDate, setLedgerEndDate] = useState('2026-09-30');
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<any | null>(null);

  // Party-wise View Isolation & Directory Navigation States
  const [invoiceViewMode, setInvoiceViewMode] = useState<'SINGLE_PARTY' | 'ALL_PARTIES_DIRECTORY'>('SINGLE_PARTY');
  const [ledgerViewMode, setLedgerViewMode] = useState<'SINGLE_PARTY' | 'ALL_PARTIES_DIRECTORY'>('SINGLE_PARTY');
  const [partyDirectorySearch, setPartyDirectorySearch] = useState('');
  const [partyLedgerSearch, setPartyLedgerSearch] = useState('');
  const [showRecentOrdersInOrdersTab, setShowRecentOrdersInOrdersTab] = useState(false);

  // Last 5 Recent Orders for the currently active Customer/Dealer
  const activeDealerRecentOrders = useMemo(() => {
    return orders
      .filter((o) => o.customerId === selectedCustomerId)
      .sort((a, b) => new Date(b.orderDate || b.createdAt || '').getTime() - new Date(a.orderDate || a.createdAt || '').getTime())
      .slice(0, 5);
  }, [orders, selectedCustomerId]);

  // Toast Notification States
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // 2-Way Sync Simulation
  const triggerLiveSyncNotification = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      triggerToast('ERP Database, Supabase & Google Sheets synchronized successfully!');
    }, 1200);
  };

  // Filter products by category & search query
  const filteredProducts = useMemo(() => {
    return NATIONAL_LIGHT_OFFICIAL_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.specification.toLowerCase().includes(catalogSearch.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        item.categoryGroup === selectedCategory ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [catalogSearch, selectedCategory]);

  // Credit check status
  const projectedBalance = (activeDealer.currentBalance || 0) + cartTotal;
  const isCreditExceeded = projectedBalance > (activeDealer.creditLimit || 350000);
  const creditProgressPercent = Math.min(
    100,
    Math.round(((activeDealer.currentBalance || 0) / (activeDealer.creditLimit || 350000)) * 100)
  );

  // Staged SKU items from the spreadsheet table for 1-click bulk submission
  const stagedItems = useMemo(() => {
    const items: {
      product: NationalLightItem;
      cartons: number;
      packs: number;
      totalPieces: number;
      amount: number;
    }[] = [];

    Object.entries(cartQuantities).forEach(([prodId, qty]) => {
      const q = qty as { cartons?: number; packs?: number } | undefined;
      const cartons = q?.cartons || 0;
      const packs = q?.packs || 0;
      if (cartons > 0 || packs > 0) {
        const prod = NATIONAL_LIGHT_OFFICIAL_CATALOG.find((p) => p.id === prodId);
        if (prod) {
          const quantityBox = prod.quantityBox || 100;
          const totalPieces = (cartons * quantityBox) + packs;
          if (totalPieces > 0) {
            items.push({
              product: prod,
              cartons,
              packs,
              totalPieces,
              amount: totalPieces * prod.listPrice,
            });
          }
        }
      }
    });

    return items;
  }, [cartQuantities]);

  const stagedCount = stagedItems.length;
  const stagedTotalPieces = stagedItems.reduce((acc, i) => acc + i.totalPieces, 0);
  const stagedTotalAmount = stagedItems.reduce((acc, i) => acc + i.amount, 0);

  // Single Submit Button Handler: Adds ALL staged SKUs to cart in 1 click
  const handleSubmitAllStagedToCart = () => {
    if (stagedItems.length === 0) {
      triggerToast('Please enter carton or pack quantities for at least one SKU in the table below first.');
      return;
    }

    setOrderCart((prev) => {
      const nextCart = [...prev];
      stagedItems.forEach((staged) => {
        const existingIdx = nextCart.findIndex((i) => i.product.id === staged.product.id);
        if (existingIdx >= 0) {
          nextCart[existingIdx] = {
            ...nextCart[existingIdx],
            quantity: nextCart[existingIdx].quantity + staged.totalPieces,
          };
        } else {
          nextCart.push({
            product: staged.product,
            quantity: staged.totalPieces,
          });
        }
      });
      return nextCart;
    });

    // Reset table quantity inputs in 1 go
    setCartQuantities({});
    triggerToast(`✓ Added ${stagedItems.length} SKU${stagedItems.length > 1 ? 's' : ''} (${stagedTotalPieces.toLocaleString()} pcs • Rs. ${stagedTotalAmount.toLocaleString()}) to Booking Cart!`);
  };

  // Cart actions
  const addToCart = (product: NationalLightItem, pcs: number = 1) => {
    setOrderCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + pcs } : i
        );
      }
      return [...prev, { product, quantity: pcs }];
    });
    triggerToast(`Added ${pcs} pcs of ${product.name} to booking cart.`);
  };

  const updateCartQty = (productId: string, pcs: number) => {
    setOrderCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + pcs;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleOrderSubmitClick = () => {
    if (!activeDealer.id) {
      triggerToast('Please register or select a dealer from the Dealers tab before booking orders.');
      return;
    }

    if (orderCart.length === 0) {
      triggerToast('Cannot submit empty order cart!');
      return;
    }

    const creditLimit = activeDealer.creditLimit || 250000;
    const currentBalance = activeDealer.currentBalance || 0;
    const projectedExposure = currentBalance + cartTotal;
    const isOverLimit = projectedExposure > creditLimit;
    const isHighExposure = cartTotal > (creditLimit * 0.75);

    // Browser Confirmation Dialog triggered if total value exceeds customer credit policy threshold
    if (isOverLimit || isHighExposure) {
      const warningReason = isOverLimit
        ? `⚠️ CREDIT LIMIT BREACH: This order will exceed the dealer's credit limit by Rs. ${(projectedExposure - creditLimit).toLocaleString()} PKR.`
        : `⚠️ CREDIT POLICY THRESHOLD: This single order utilizes over 75% of the dealer's total credit policy limit.`;

      const confirmMessage = 
        `========================================\n` +
        `N-LINK 360: CREDIT POLICY THRESHOLD NOTICE\n` +
        `========================================\n\n` +
        `Customer / Dealer: ${activeDealer.companyName} (${activeDealer.customerCode})\n` +
        `Authorized Credit Limit: Rs. ${creditLimit.toLocaleString()} PKR\n` +
        `Current Ledger Balance: Rs. ${currentBalance.toLocaleString()} PKR\n` +
        `New Order Amount: Rs. ${cartTotal.toLocaleString()} PKR\n` +
        `Projected Total Exposure: Rs. ${projectedExposure.toLocaleString()} PKR\n\n` +
        `${warningReason}\n\n` +
        `Submitting this entry will flag the order for Executive Approval (Shahzad Ullah).\n\n` +
        `Do you want to confirm and proceed with this order entry?`;

      const isConfirmed = window.confirm(confirmMessage);
      if (!isConfirmed) {
        triggerToast('Order submission cancelled by officer.');
        return;
      }
    }

    setShowOrderConfirmModal(true);
  };

  const executeOrderSubmit = () => {
    if (orderCart.length === 0 || isSubmittingOrder) return;

    // Safety Credit Check Threshold Verification
    const creditLimit = activeDealer.creditLimit || 250000;
    const currentBalance = activeDealer.currentBalance || 0;
    const projectedExposure = currentBalance + cartTotal;
    const isOverLimit = projectedExposure > creditLimit;

    setIsSubmittingOrder(true);

    try {
      // Submit Order Payload
      const newOrder: SalesOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: activeDealer.id,
        customerName: activeDealer.companyName,
        customerCode: activeDealer.customerCode,
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        orderDate: new Date().toISOString().split('T')[0],
        subtotal: cartSubtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: cartTotal,
        status: 'SUBMITTED',
        creditCheckStatus: (isOverLimit || isCreditExceeded) ? 'RED' : 'GREEN',
        dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
        shahzadApproval: 'PENDING',
        syncStatus: 'SYNCED',
        notes: orderRemarks || (isOverLimit ? 'Credit threshold flagged: Pending executive sign-off' : 'Field Order Booked'),
        items: orderCart.map((item, index) => ({
          id: `item-${index}`,
          orderId: `ORD-${Date.now()}`,
          skuId: item.product.sku,
          skuCode: item.product.sku,
          skuName: item.product.name,
          orderedQuantity: item.quantity,
          approvedQuantity: item.quantity,
          unitPrice: item.product.listPrice,
          discountPercent: parseFloat(item.product.discountPercentage) || 15,
          lineTotal: item.product.listPrice * item.quantity,
        })),
        createdAt: new Date().toISOString(),
      };

      onPlaceOrder(newOrder);
      setOrderCart([]);
      clearDraftOrderProgress();
      setOrderRemarks('');
      setShowOrderConfirmModal(false);
      triggerLiveSyncNotification();
      triggerToast('Order submitted! Awaiting executive approval (Shahzad Ullah).');
      if (lockModeTo !== 'ENTRY') {
        setActiveMode('invoices');
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Recovery Submit
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRecovery) return;

    if (!activeDealer.id) {
      triggerToast('Please register or select a dealer from the Dealers tab before recording recovery.');
      return;
    }

    const amt = parseFloat(recoveryAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('Please enter a valid recovery amount!');
      return;
    }

    const currentBal = activeDealer.currentBalance || 0;
    const isRecoveryExceedingBalance = currentBal > 0 && amt > currentBal;
    const isHighValueRecovery = amt >= 200000;

    // Browser Confirmation Dialog triggered if recovery value exceeds threshold or outstanding ledger balance
    if (isRecoveryExceedingBalance || isHighValueRecovery) {
      const note = isRecoveryExceedingBalance
        ? `⚠️ The recovery amount (Rs. ${amt.toLocaleString()} PKR) exceeds the dealer's current outstanding balance (Rs. ${currentBal.toLocaleString()} PKR).`
        : `⚠️ High-Value Collection Entry (Rs. ${amt.toLocaleString()} PKR).`;

      const confirmMessage =
        `========================================\n` +
        `N-LINK 360: RECOVERY VERIFICATION NOTICE\n` +
        `========================================\n\n` +
        `Customer / Dealer: ${activeDealer.companyName} (${activeDealer.customerCode})\n` +
        `Recovery Amount: Rs. ${amt.toLocaleString()} PKR\n` +
        `Payment Mode: ${paymentMode}\n` +
        `Reference / Instrument: ${referenceNumber || (paymentMode === 'CASH' ? 'Cash Handover' : 'Bank Slip')}\n` +
        `Current Outstanding Balance: Rs. ${currentBal.toLocaleString()} PKR\n\n` +
        `${note}\n\n` +
        `Please verify that the payment slip/instrument has been inspected.\n\n` +
        `Do you confirm and record this recovery entry?`;

      const isConfirmed = window.confirm(confirmMessage);
      if (!isConfirmed) {
        triggerToast('Recovery recording cancelled by officer.');
        return;
      }
    }

    setIsSubmittingRecovery(true);

    try {
      const newRecovery: Recovery = {
        id: `REC-${Date.now().toString().slice(-6)}`,
        recoveryNumber: `RC-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: activeDealer.id,
        customerName: activeDealer.companyName,
        customerCode: activeDealer.customerCode,
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        collectionDate: new Date().toISOString().split('T')[0],
        amount: amt,
        paymentMode: paymentMode,
        instrumentNumber: referenceNumber || (paymentMode === 'CASH' ? 'CASH-REC' : 'TRX-AUTO'),
        bankName: paymentMode !== 'CASH' ? bankName : undefined,
        status: 'PENDING_VERIFICATION',
        dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
        shahzadApproval: 'PENDING',
        syncStatus: 'SYNCED',
        remarks: recoveryRemarks || (receiptSimulated ? 'Payment slip attachment uploaded.' : 'Standard payment recovery logged.'),
        createdAt: new Date().toISOString(),
      };

      onRecordRecovery(newRecovery);
      setRecoveryAmount('');
      setReferenceNumber('');
      setReceiptSimulated(false);
      setRecoveryRemarks('');
      triggerLiveSyncNotification();
      triggerToast('Recovery logged! Awaiting executive sign-off (Shahzad Ullah).');
      if (lockModeTo !== 'ENTRY') {
        setActiveMode('ledger');
      }
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  // Dealer Invoices List - Strictly Party-Wise
  const dealerInvoices = useMemo(() => {
    // Filter orders belonging exclusively to the selected customer/party
    const partyOrders = orders.filter((o) => o.customerId === selectedCustomerId);

    return partyOrders.map((o) => ({
      id: o.id,
      invoiceNo: o.orderNumber,
      date: o.orderDate,
      amount: o.totalAmount,
      subtotal: o.subtotal || o.totalAmount,
      discountAmount: 0,
      taxAmount: 0,
      freightAmount: 0,
      itemsCount: o.items?.length || 0,
      status: o.status === 'APPROVED' ? 'Approved & Dispatched' : o.status === 'REJECTED' ? 'Rejected' : 'Awaiting Approval',
      badgeColor: o.status === 'APPROVED'
        ? 'bg-[#76f4e0]/20 text-[#006f63] dark:text-[#76f4e0]'
        : o.status === 'REJECTED'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
      items: (o.items || []).map((item) => ({
        id: item.id,
        skuCode: item.skuCode,
        skuName: item.skuName,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    }));
  }, [orders, selectedCustomerId]);

  // Dynamic Print Type Toggle State
  const [activePrintType, setActivePrintType] = useState<'NONE' | 'SINGLE_INVOICE' | 'STATEMENT' | 'LEDGER'>('NONE');

  // Filtered invoices used in UI registry map and reconciliation statements
  const filteredInvoicesForStatement = useMemo(() => {
    return dealerInvoices.filter((inv) => {
      if (invoiceSelectedMonths.includes('All Months')) return true;
      const dateObj = new Date(inv.date);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const invMonthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      return invoiceSelectedMonths.includes(invMonthYear);
    });
  }, [dealerInvoices, invoiceSelectedMonths]);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Issued Date', 'Items Count', 'Total Amount (PKR)', 'Status'];
    const rows = filteredInvoicesForStatement.map((inv) => [
      inv.invoiceNo,
      inv.date,
      inv.itemsCount,
      inv.amount,
      inv.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NL_Reconciliation_${activeDealer.companyName.replace(/\s+/g, '_')}_${activeDealer.customerCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Filtered invoices reconciliation statement exported to CSV successfully!');
  };

  // Excel Exporter
  const handleExportExcel = () => {
    const sheetData = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; }
          th { background-color: #006b5f; color: white; font-weight: bold; padding: 12px; border: 1.5px solid #ddd; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border: 1px solid #eee; font-size: 11px; }
          .title { font-size: 16px; font-weight: bold; color: #006b5f; margin-bottom: 5px; font-family: sans-serif; }
          .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; font-family: sans-serif; }
          .header-row { background-color: #f7f9fa; font-weight: bold; }
          .total-value { text-align: right; font-weight: 900; color: #006b5f; }
        </style>
      </head>
      <body>
        <div class="title">NATIONAL LIGHT PAKISTAN</div>
        <div class="subtitle">Distributor Account Invoices Reconciliation Statement (Excel Mode)</div>
        <div style="margin-bottom: 18px; font-family: sans-serif; font-size: 11px; line-height: 1.5;">
          <b>Dealer Business:</b> ${activeDealer.companyName}<br/>
          <b>Customer Code:</b> ${activeDealer.customerCode}<br/>
          <b>Location Town:</b> ${activeDealer.city || 'KPK Peshawar'}<br/>
          <b>Statement Date:</b> ${new Date().toLocaleDateString()}<br/>
          <b>Filtered Period:</b> ${invoiceSelectedMonths.join(', ')}<br/>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Date Issued</th>
              <th>Total SKU Count</th>
              <th>Grand Total (PKR)</th>
              <th>Delivery Dispatch Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoicesForStatement.map(inv => `
              <tr>
                <td><b>${inv.invoiceNo}</b></td>
                <td>${inv.date}</td>
                <td style="text-align: center;">${inv.itemsCount} Items</td>
                <td style="text-align: right; font-weight: bold;">${inv.amount}</td>
                <td>${inv.status}</td>
              </tr>
            `).join('')}
            <tr class="header-row">
              <td colspan="3" style="text-align: right; font-weight: bold; padding: 12px;">Cumulative Outstanding:</td>
              <td class="total-value">Rs. ${filteredInvoicesForStatement.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</td>
              <td>Verified Balance</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([sheetData], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NL_Reconciliation_${activeDealer.companyName.replace(/\s+/g, '_')}_${activeDealer.customerCode}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Filtered invoices reconciliation statement exported to Excel successfully!');
  };

  // Word Exporter
  const handleExportWord = () => {
    const wordData = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { border-bottom: 3px solid #006b5f; padding-bottom: 12px; margin-bottom: 25px; }
          .title { font-size: 24px; font-weight: bold; color: #006b5f; tracking: -0.5px; }
          .tagline { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; letter-spacing: 1px; }
          .meta-info { margin-bottom: 25px; padding: 15px; background-color: #f4f6f8; border: 1.5px solid #e1e4e6; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f7f9fa; color: #000; border: 1.5px solid #ccc; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; }
          td { border: 1px solid #e1e4e6; padding: 10px; font-size: 11px; }
          .bold { font-weight: bold; }
          .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">NATIONAL LIGHT PAKISTAN</div>
          <div class="tagline">Enlightening The Nation — Official Ledger Dispatch Document</div>
        </div>
        
        <h2>Statement of Outstanding Invoices</h2>
        <div class="meta-info">
          <b>Business Distributor:</b> ${activeDealer.companyName}<br/>
          <b>Customer Dealer Code:</b> ${activeDealer.customerCode}<br/>
          <b>Registered Town:</b> ${activeDealer.city || 'Peshawar'}<br/>
          <b>Date of Generation:</b> ${new Date().toLocaleDateString()}<br/>
          <b>Active Months:</b> ${invoiceSelectedMonths.join(', ')}<br/>
        </div>

        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Issued Date</th>
              <th>Items Detail</th>
              <th>Outstanding Amount</th>
              <th>Dispatch Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoicesForStatement.map(inv => `
              <tr>
                <td><b style="color: #006b5f;">${inv.invoiceNo}</b></td>
                <td>${inv.date}</td>
                <td>${inv.itemsCount} SKUs from Official Rates Card</td>
                <td class="bold">Rs. ${inv.amount.toLocaleString()}</td>
                <td>${inv.status}</td>
              </tr>
            `).join('')}
            <tr class="header-row" style="background-color: #f7f9fa;">
              <td colspan="3" style="text-align: right; font-weight: bold;"><b>Grand Cumulative Outstanding:</b></td>
              <td style="font-weight: bold; color: #006b5f;"><b>Rs. ${filteredInvoicesForStatement.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</b></td>
              <td><b>Verified</b></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          This document is generated by N-LINK 360 Field Intelligence on behalf of National Light Pakistan Finance.
          <br/>Office No GF 71, Sheikh Yaseen Tower, Majid Mohabbad Khan Road, Peshawar.
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([wordData], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NL_Reconciliation_${activeDealer.companyName.replace(/\s+/g, '_')}_${activeDealer.customerCode}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Filtered invoices reconciliation statement exported to Word successfully!');
  };

  // Dedicated jsPDF Statement Exporter for Customer Ledger
  const handleDownloadLedgerPdfStatement = async () => {
    if (!activeDealer?.id) {
      triggerToast('Please select an active dealer first.');
      return;
    }
    try {
      triggerToast('Generating official PDF statement via jsPDF...');
      
      const allEntriesComputed = [...ledgerEntries].reverse();
      let openingBalance = 0;
      const entriesInRange: typeof ledgerEntries = [];
      
      allEntriesComputed.forEach((entry) => {
        const matchesMonthFilter = () => {
          if (ledgerSelectedMonths.includes('All Months')) return true;
          const dateObj = new Date(entry.date);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const entMonthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
          return ledgerSelectedMonths.includes(entMonthYear);
        };

        const isBeforeStart = new Date(entry.date).getTime() < new Date(ledgerStartDate).getTime();
        const isAfterEnd = new Date(entry.date).getTime() > new Date(ledgerEndDate).getTime();

        if (isBeforeStart) {
          if (entry.debit) openingBalance += entry.debit;
          if (entry.credit) openingBalance -= entry.credit;
        } else if (!isAfterEnd && matchesMonthFilter()) {
          entriesInRange.push(entry);
        }
      });

      let currentRunning = openingBalance;
      const finalRenderableEntries = entriesInRange.map((entry) => {
        if (entry.debit) currentRunning += entry.debit;
        if (entry.credit) currentRunning -= entry.credit;
        return {
          ...entry,
          balance: currentRunning,
        };
      });

      const totalDebits = entriesInRange.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredits = entriesInRange.reduce((sum, e) => sum + (e.credit || 0), 0);
      const closingBalance = currentRunning;

      const result = await downloadCustomerLedgerPdf({
        customer: activeDealer,
        entries: finalRenderableEntries,
        openingBalance,
        totalDebits,
        totalCredits,
        closingBalance,
        startDate: ledgerStartDate,
        endDate: ledgerEndDate,
        selectedMonths: ledgerSelectedMonths,
        preparedByName: `${currentUser.fullName || currentUser.name} (${currentUser.roleTitle || currentUser.role})`,
      });

      if (result.success) {
        triggerToast(`Statement downloaded: ${result.filename}`);
      }
    } catch (err) {
      console.error('jsPDF Statement Generation Error:', err);
      triggerToast('Error generating PDF statement. Falling back to print view.');
      setActivePrintType('STATEMENT');
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  // PDF / Print Exporter (uses jsPDF Statement)
  const handleExportPDF = () => {
    handleDownloadLedgerPdfStatement();
  };

  // Running Ledger calculations strictly party-wise for the active customer
  const ledgerEntries = useMemo(() => {
    const entries: {
      id: string;
      date: string;
      reference: string;
      particulars: string;
      debit: number | null;
      credit: number | null;
      balance: number;
    }[] = [];

    // 1. Party Authentic Opening Balance (if any recorded on dealer file)
    const opBal = activeDealer.openingBalance || 0;
    if (opBal > 0) {
      entries.push({
        id: `op-bal-${activeDealer.id}`,
        date: activeDealer.createdAt ? activeDealer.createdAt.split('T')[0] : '2026-01-01',
        reference: `OP-BAL-${activeDealer.customerCode}`,
        particulars: `Opening Balance Brought Forward (${activeDealer.companyName})`,
        debit: opBal,
        credit: null,
        balance: opBal,
      });
    }

    // 2. Party Approved Sales Orders (Debits)
    const partyOrders = orders
      .filter((o) => o.customerId === selectedCustomerId && o.status === 'APPROVED')
      .map((o) => ({
        id: `dyn-inv-${o.id}`,
        date: o.orderDate,
        reference: o.orderNumber,
        particulars: `Sales Order Invoice (${o.items?.length || 0} SKUs) - Auth: ${o.approvedBy || 'Executive'}`,
        debit: o.totalAmount,
        credit: null,
        balance: 0,
      }));

    // 3. Party Verified Recoveries (Credits)
    const partyRecoveries = recoveries
      .filter((r) => r.customerId === selectedCustomerId && r.status === 'VERIFIED')
      .map((r) => ({
        id: `dyn-rec-${r.id}`,
        date: r.collectionDate,
        reference: r.recoveryNumber,
        particulars: `${r.paymentMode} Collection Verified (${r.instrumentNumber || 'Direct'}) - Sign-off: ${r.verifiedBy || 'Executive'}`,
        debit: null,
        credit: r.amount,
        balance: 0,
      }));

    // Sort all party transactions chronologically
    const allEntries = [...entries, ...partyOrders, ...partyRecoveries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Compute mathematically verified running balance
    let running = 0;
    return allEntries.map((entry) => {
      if (entry.debit) running += entry.debit;
      if (entry.credit) running -= entry.credit;
      return {
        ...entry,
        balance: running,
      };
    }).reverse(); // Latest on top for high-readability
  }, [orders, recoveries, selectedCustomerId, activeDealer]);

  const handleShareStatement = () => {
    const text = `National Light Pakistan • Statement of Accounts\nDealer: ${activeDealer.companyName} (${activeDealer.customerCode})\nCity: ${activeDealer.city}\nOutstanding Ledger Balance: Rs. ${(activeDealer.currentBalance || 0).toLocaleString()}\nCredit Limit: Rs. ${(activeDealer.creditLimit || 350000).toLocaleString()}\n\nContact Head Office Peshawar for reconciliation.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12 animate-fadeIn" id="unified-orders-recovery-flow">
      {/* 1. Unified Executive Dealer Terminal Card */}
      <div className="bg-[#0f2942] dark:bg-slate-950 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#1a3b5c] relative overflow-hidden flex flex-col gap-4">
        <div className="absolute right-0 top-0 w-48 h-48 bg-[#76f4e0]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar: Dealer selector dropdown + Cloud status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-700/60 relative z-10">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-black text-[#76f4e0] uppercase tracking-widest block mb-1.5">
              Active Dealer / Distributor Account
            </label>
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setOrderCart([]); // Clear cart when switching dealers to prevent cross-dealer booking
                }}
                className="w-full bg-slate-900/90 text-white pl-3.5 pr-9 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#76f4e0] transition-all text-xs sm:text-sm font-bold border border-slate-700/80 appearance-none cursor-pointer"
              >
                {filteredCustomers.length === 0 ? (
                  <option value="">No Registered Dealers Found (Add in Dealers Tab or Sync Sheet)</option>
                ) : (
                  filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.companyName} ({c.city || 'KPK'}) — Bal: Rs. {(c.currentBalance || 0).toLocaleString()}
                    </option>
                  ))
                )}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none text-[18px]">
                unfold_more
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-4">
            {selectedAttendanceTown && (
              <span className="text-[10px] text-[#76f4e0] font-bold flex items-center gap-1 bg-[#76f4e0]/10 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[13px]">location_on</span>
                Town: {selectedAttendanceTown}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Live Cloud Connected'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#76f4e0] text-[#001428]">
                {activeDealer.customerCode}
              </span>
              <span className="text-xs text-slate-300 font-medium font-mono">{activeDealer.city || 'Peshawar'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1.5">
              {activeDealer.companyName}
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">person</span>
              <span>{activeDealer.contactPerson || 'Proprietor'} • {activeDealer.phone || '+92 300 1234567'}</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase text-[#7991af] tracking-wider font-semibold block">Outstanding Balance</span>
            <span className="text-xl sm:text-2xl font-black text-[#76f4e0] font-mono block">
              Rs. {(activeDealer.currentBalance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Credit Limit and Days Progress bar */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Credit Utilization limit: Rs. {(activeDealer.creditLimit || 350000).toLocaleString()}</span>
            <span className="font-bold font-mono text-white">{creditProgressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditProgressPercent > 85 ? 'bg-rose-500' : creditProgressPercent > 60 ? 'bg-amber-400' : 'bg-[#76f4e0]'
              }`}
              style={{ width: `${creditProgressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Credit Term: {activeDealer.creditDays || 30} Days</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecentOrdersInOrdersTab(!showRecentOrdersInOrdersTab)}
                className="text-[10px] font-bold text-[#76f4e0] bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                <span>Recent Orders ({activeDealerRecentOrders.length})</span>
                <span className="material-symbols-outlined text-[12px]">
                  {showRecentOrdersInOrdersTab ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <span className={`font-bold ${isCreditExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isCreditExceeded ? '⚠️ Credit Limit Exceeded' : '✓ Credit Limit Safe'}
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Recent Orders Preview for Active Customer */}
        {showRecentOrdersInOrdersTab && (
          <div className="mt-2 pt-3 border-t border-slate-700/60 animate-form-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                Recent Orders for {activeDealer.companyName} (Last 5)
              </span>
              <span className="text-[10px] text-slate-400">
                {activeDealerRecentOrders.length} Booked Orders
              </span>
            </div>
            {activeDealerRecentOrders.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeDealerRecentOrders.map((ord) => {
                  const statusBg =
                    ord.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : ord.status === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300';
                  return (
                    <div
                      key={ord.id}
                      className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#76f4e0]">{ord.orderNumber}</span>
                        <span className="text-[10px] text-slate-400">📅 {ord.orderDate}</span>
                        <span className="text-[10px] text-slate-400">({ord.items?.length || 0} items)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBg}`}>
                          {ord.status}
                        </span>
                        <span className="font-mono font-black text-white">
                          Rs. {Number(ord.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-3 bg-slate-900/50 rounded-xl">
                No previous orders found for this party.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 3. Sub-segment Navigation Tabs */}
      {lockModeTo === 'ENTRY' ? (
        <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 p-1.5 rounded-2xl gap-2 shadow-3xs">
          <button
            onClick={() => setActiveMode('order')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'order'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Sales Order Booking</span>
          </button>
          <button
            onClick={() => setActiveMode('recovery')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'recovery'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Cash & Bank Recovery</span>
          </button>
        </div>
      ) : lockModeTo === 'LEDGERS' ? (
        <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 p-1.5 rounded-2xl gap-2 shadow-3xs">
          <button
            onClick={() => setActiveMode('invoices')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'invoices'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Invoices & Billing Statement</span>
          </button>
          <button
            onClick={() => setActiveMode('ledger')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'ledger'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span>Party Running Ledger</span>
          </button>
        </div>
      ) : (
        <div className="flex bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-1 rounded-2xl gap-1 shadow-3xs">
          <button
            onClick={() => setActiveMode('order')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'order'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Order Entry</span>
          </button>

          <button
            onClick={() => setActiveMode('recovery')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'recovery'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>Recovery Entry</span>
          </button>

          <button
            onClick={() => setActiveMode('invoices')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'invoices'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Old Invoices</span>
          </button>

          <button
            onClick={() => setActiveMode('ledger')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'ledger'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span>Running Ledger</span>
          </button>
        </div>
      )}

      {/* Attendance Gate Check for Ordering & Recovery */}
      {!isCheckedIn && (activeMode === 'order' || activeMode === 'recovery') && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-300 dark:border-amber-700">
            <span className="material-symbols-outlined text-[34px]">location_off</span>
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Active Town Attendance Required
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              In accordance with N-LINK 360 enterprise operational rules, you must check into your assigned beat town before recording new sales orders or collecting payment recoveries.
            </p>
          </div>
          {onNavigateToAttendance && (
            <button
              onClick={onNavigateToAttendance}
              className="px-6 py-3 bg-[#006b5f] hover:bg-[#00544a] text-white font-black text-xs rounded-2xl shadow-md inline-flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">event_available</span>
              <span>Select Assigned Town &amp; Check In</span>
            </button>
          )}
        </div>
      )}

      {/* Active Beat Town Confirmation Banner */}
      {isCheckedIn && selectedAttendanceTown && (activeMode === 'order' || activeMode === 'recovery') && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 px-4 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              Active Beat Town: <span className="font-black underline">{selectedAttendanceTown}</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-mono font-bold">
              GPS Verified
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {filteredCustomers.length} Assigned Dealer{filteredCustomers.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* When Attendance is verified (or viewing Invoices/Ledgers), render Mode content */}
      {(isCheckedIn || (activeMode !== 'order' && activeMode !== 'recovery')) && (
        <>
      {/* =======================================================================
          MODE 1: ORDER ENTRY CATALOG & BOOKING CART
          ======================================================================= */}
      {activeMode === 'order' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Catalog Filter Header */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2.5 shadow-xs border border-[#e0e3e5] dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="bg-transparent w-full outline-none text-xs sm:text-sm text-[#191c1e] dark:text-white placeholder:text-slate-400 font-semibold"
                placeholder="Search Bulbs, Panel lights, SMDs, Floodlights..."
              />
            </div>
            <button
              onClick={onOpenRateCard}
              className="bg-white dark:bg-slate-900 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[#006b5f] dark:text-[#76f4e0] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">price_change</span>
              <span className="hidden sm:inline">Rate Card</span>
            </button>
          </div>

          {/* Category Quick Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Products' },
              { id: 'LED_BULB', label: 'LED Bulbs' },
              { id: 'HIGH_WATTAGE', label: 'High Watt T-Bulbs' },
              { id: 'PANEL_LIGHT', label: 'Slim Panel SMD' },
              { id: 'FLOOD_LIGHT', label: 'Flood Lights' },
              { id: 'TUBE_LIGHT', label: 'Ice Tube Lights' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#001428] border-[#001428] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tabular Spreadsheet SKU Entry Form with 1 Unified Submit Button */}
          <div className="flex flex-col gap-2.5">
            {/* 1 Unified Submit Button Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006b5f]">table_view</span>
                  <span>SKU Order Entry Spreadsheet</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter carton and pack quantities for any items below, then tap the single submit button to add all items to your cart.
                </p>
              </div>

              <button
                type="button"
                id="primary-bulk-add-cart-btn"
                disabled={stagedCount === 0}
                onClick={handleSubmitAllStagedToCart}
                className={`py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                  stagedCount > 0
                    ? 'bg-[#006b5f] hover:bg-[#005249] text-white ring-2 ring-[#006b5f]/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {stagedCount > 0 ? 'shopping_cart_checkout' : 'add_shopping_cart'}
                </span>
                <span>
                  {stagedCount > 0
                    ? `Submit & Add All ${stagedCount} SKU${stagedCount > 1 ? 's' : ''} (${stagedTotalPieces.toLocaleString()} pcs • Rs. ${stagedTotalAmount.toLocaleString()})`
                    : 'Add Items to Cart (1 Submit Button)'}
                </span>
              </button>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    <th className="p-3.5">SKU Product</th>
                    <th className="p-3.5 w-24 text-center">Qty Ctns</th>
                    <th className="p-3.5 w-24 text-center">QTY Pcks</th>
                    <th className="p-3.5 w-28 text-center">Total Qty Ctns</th>
                    <th className="p-3.5 w-28 text-right">Value (PKR)</th>
                    <th className="p-3.5 w-24 text-center">Staged Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((product) => {
                    const qtyState = cartQuantities[product.id] || { cartons: 0, packs: 0 };
                    const quantityBox = product.quantityBox || 100;
                    
                    // Live math calculations
                    const totalCartonsCalculated = qtyState.cartons + (qtyState.packs / quantityBox);
                    const totalPieces = (qtyState.cartons * quantityBox) + qtyState.packs;
                    const rowAmount = totalPieces * product.listPrice;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-xs font-semibold ${
                          totalPieces > 0 ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[#191c1e] dark:text-white truncate max-w-[200px]">
                              {product.name}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <span>{product.sku}</span>
                              <span>•</span>
                              <span>Box: {quantityBox} pcs</span>
                              <span>•</span>
                              <span className="text-[#006b5f] dark:text-[#76f4e0]">Rs. {product.listPrice}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={qtyState.cartons || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setCartQuantities((prev) => ({
                                ...prev,
                                [product.id]: { ...qtyState, cartons: val },
                              }));
                            }}
                            className="w-16 text-center bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#006b5f]"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={qtyState.packs || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setCartQuantities((prev) => ({
                                ...prev,
                                [product.id]: { ...qtyState, packs: val },
                              }));
                            }}
                            className="w-16 text-center bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#006b5f]"
                          />
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300 font-bold">
                          {totalCartonsCalculated > 0 ? (
                            <span>{totalCartonsCalculated.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#006b5f] dark:text-[#76f4e0]">
                          {rowAmount > 0 ? (
                            <span>Rs. {rowAmount.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {totalPieces > 0 ? (
                            <div className="flex items-center justify-center">
                              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[10px] whitespace-nowrap shadow-2xs border border-emerald-200 dark:border-emerald-800">
                                ✓ {totalPieces} pcs staged
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom 1 Unified Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006b5f] text-[22px]">inventory_2</span>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    {stagedCount > 0 ? `${stagedCount} SKU Product(s) Selected & Ready to Submit` : 'No SKU Quantities Entered Yet'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {stagedCount > 0 ? `Total Value: Rs. ${stagedTotalAmount.toLocaleString()} (${stagedTotalPieces.toLocaleString()} pieces)` : 'Enter carton or pack numbers in the table above'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="bottom-bulk-add-cart-btn"
                disabled={stagedCount === 0}
                onClick={handleSubmitAllStagedToCart}
                className={`w-full sm:w-auto py-2.5 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                  stagedCount > 0
                    ? 'bg-[#006b5f] hover:bg-[#005249] text-white ring-2 ring-[#006b5f]/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                <span>Submit &amp; Add All to Cart ({stagedCount} SKUs)</span>
              </button>
            </div>
          </div>

          {/* Floating Sticky Quick-Submit Pill when User has Staged Items */}
          {stagedCount > 0 && (
            <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-md z-40 bg-[#006b5f] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-teal-400/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
                  {stagedCount}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black leading-tight">
                    {stagedCount} SKU{stagedCount > 1 ? 's' : ''} Staged ({stagedTotalPieces.toLocaleString()} pcs)
                  </span>
                  <span className="text-[11px] font-mono text-[#76f4e0] font-bold">
                    Rs. {stagedTotalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitAllStagedToCart}
                className="px-4 py-2 bg-white text-[#006b5f] hover:bg-teal-50 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Submit to Cart</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Checkout Booking Cart Summary Box */}
          {orderCart.length > 0 ? (
            <div className="bg-[#f8f9fb] dark:bg-slate-900/40 p-4 sm:p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191c1e] dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006b5f]">shopping_cart_checkout</span>
                  <span>Order Booking Cart ({orderCart.length} item types)</span>
                </h3>
                <button
                  onClick={() => setOrderCart([])}
                  className="text-xs text-slate-400 hover:text-rose-500 font-semibold"
                >
                  Clear Booking Cart
                </button>
              </div>

              {/* Items listing */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {orderCart.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] text-slate-400 block font-mono">{item.product.sku}</span>
                      <h4 className="font-bold text-[#191c1e] dark:text-white truncate">{item.product.name}</h4>
                      <span className="text-slate-500 font-mono font-medium block">
                        Rs. {item.product.listPrice.toLocaleString()} × {item.quantity} pcs
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-[#eceef0] dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300"
                      >
                        -
                      </button>
                      <span className="font-bold font-mono px-1 w-6 text-center text-[#191c1e] dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="w-6 h-6 rounded-md bg-[#eceef0] dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Math */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 font-semibold">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Gross Order Value</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    Rs. {cartSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                <div className="flex justify-between text-sm text-[#191c1e] dark:text-white font-black">
                  <span>NET ORDER TOTAL</span>
                  <span className="font-mono text-[#001428] dark:text-[#76f4e0]">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Credit check blocker */}
              {isCreditExceeded && (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/30 text-xs flex gap-2">
                  <span className="material-symbols-outlined text-rose-500 shrink-0">error</span>
                  <div className="text-rose-800 dark:text-rose-400">
                    <p className="font-black">Warning: Outstanding Portfolio Limit Exceeded!</p>
                    <p className="text-[10px] leading-relaxed mt-0.5">
                      Submitting this order will exceed the dealer credit limit (Rs. {activeDealer.creditLimit?.toLocaleString()}).
                      The order status will register as "SUBMITTED" and require Head Office Finance Audit clearance before dispatch.
                    </p>
                  </div>
                </div>
              )}

              {/* Remarks Area & Submit Button */}
              <div className="flex flex-col gap-2.5">
                <textarea
                  value={orderRemarks}
                  onChange={(e) => setOrderRemarks(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs outline-none text-[#191c1e] dark:text-white placeholder:text-slate-400 font-semibold resize-none"
                  placeholder="Specify Bilty transport name, cargo address or special credit clearance notes..."
                  rows={2}
                />
                <button
                  type="button"
                  id="open-booking-drawer-btn"
                  onClick={handleOrderSubmitClick}
                  className="w-full bg-[#006b5f] hover:bg-[#005047] text-white py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer min-h-[44px]"
                  title="Proceed to Order Booking Drawer to submit all cart items as 1 single transaction"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Proceed to Order Booking Drawer ({orderCart.length} SKUs • Rs. {cartTotal.toLocaleString()})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <span className="material-symbols-outlined text-slate-400 text-[40px] mb-2">shopping_bag</span>
              <h4 className="font-bold text-[#191c1e] dark:text-white text-sm">Booking Cart is Empty</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Start adding National Light LED bulbs, SMDs, and Tubes by clicking the '+' buttons on any items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          MODE 2: PAYMENT RECOVERY COLLECTION ENTRY FORM
          ======================================================================= */}
      {activeMode === 'recovery' && (
        <form onSubmit={handleRecoverySubmit} className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="material-symbols-outlined text-[#006b5f]">payments</span>
            <h3 className="text-sm font-black text-[#191c1e] dark:text-white uppercase tracking-wider">
              Record Payment Collection
            </h3>
          </div>

          {/* Old Balance | Recovery Amount | Net Balance Live Displays */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="text-center p-2 border-r border-slate-200 dark:border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">Old Balance</span>
              <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 font-mono block mt-1">
                Rs. {(activeDealer.currentBalance || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-center p-2 border-r border-slate-200 dark:border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">Recovery Amt</span>
              <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono block mt-1">
                Rs. {(parseFloat(recoveryAmount) || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-center p-2">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">Net Balance</span>
              <span className="text-xs sm:text-sm font-black text-[#006b5f] dark:text-[#76f4e0] font-mono block mt-1">
                Rs. {((activeDealer.currentBalance || 0) - (parseFloat(recoveryAmount) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recovery Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#43474d] dark:text-slate-300">Collection Amount (PKR)</label>
              <div className="relative">
                <input
                  type="number"
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(e.target.value)}
                  placeholder="Rs. Cash, Transfer or Cheque amount"
                  className="w-full bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white pl-10 pr-4 py-3 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                  required
                />
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-400 font-black">Rs.</span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#43474d] dark:text-slate-300 font-sans">Payment Mode</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'CASH', label: 'Cash' },
                  { id: 'CHEQUE', label: 'Cheque' },
                  { id: 'ONLINE_TRANSFER', label: 'Bank UTR' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id as any)}
                    className={`py-3 rounded-lg text-xs font-bold border transition-all text-center ${
                      paymentMode === mode.id
                        ? 'bg-[#001428] text-white border-[#001428]'
                        : 'bg-[#f2f4f6] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paymentMode !== 'CASH' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slideDown">
              {/* Reference/Cheque Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#43474d] dark:text-slate-300">
                  {paymentMode === 'CHEQUE' ? 'Cheque Leaf Number' : 'Transaction UTR Reference ID'}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={paymentMode === 'CHEQUE' ? 'e.g., CHQ-882901' : 'e.g., Meezan Slip Ref / Bank Txn ID'}
                  className="w-full bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white px-4 py-3 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              {/* Bank Name Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#43474d] dark:text-slate-300">Depository Bank</label>
                <div className="relative">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white px-4 py-3 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold appearance-none"
                  >
                    {PAKISTAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Slip / Instrument Attachment Camera Simulation */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#43474d] dark:text-slate-300">Proof of Deposit / Receipt Attachment</label>
            {receiptSimulated ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-300/40 flex items-center justify-between text-xs font-semibold animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">photo_library</span>
                  <span className="text-slate-800 dark:text-slate-200">National_Light_slip_receipt.jpg (Simulated Proof)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptSimulated(false)}
                  className="text-rose-500 hover:underline"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReceiptSimulated(true);
                  triggerToast('Payment receipt image uploaded and parsed successfully!');
                }}
                className="py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500/40 text-xs text-slate-500 flex items-center justify-center gap-2 transition-all group hover:bg-[#76f4e0]/5"
              >
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#006b5f]">photo_camera</span>
                <span>Tap to Scan Cheque / Online Transfer Deposit Slip</span>
              </button>
            )}
          </div>

          {/* Remarks Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#43474d] dark:text-slate-300">Audit Remarks</label>
            <textarea
              value={recoveryRemarks}
              onChange={(e) => setRecoveryRemarks(e.target.value)}
              className="bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white p-3 rounded-xl text-xs outline-none resize-none placeholder:text-slate-400 border border-transparent focus:border-[#006b5f]"
              placeholder="e.g. Cleared full outstanding balance of Invoice INV-2026-1044..."
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingRecovery}
            className="w-full bg-[#001428] dark:bg-slate-800 hover:bg-[#002850] dark:hover:bg-slate-700 disabled:opacity-50 text-white dark:text-[#76f4e0] py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md mt-1 border border-transparent dark:border-slate-700"
          >
            {isSubmittingRecovery ? (
              <>
                <span className="w-4 h-4 border-2 border-white dark:border-[#76f4e0] border-t-transparent rounded-full animate-spin" />
                <span>Recording Recovery...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">add_card</span>
                <span>Record Recovery &amp; Recalculate Balance</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* =======================================================================
          MODE 3: PARTY-WISE INVOICE REGISTRY & PARTY DIRECTORY
          ======================================================================= */}
      {activeMode === 'invoices' && (
        <div className="flex flex-col gap-4 animate-fadeIn" id="invoice-registry-view">
          {/* 1. Party-Wise View Navigation Switcher */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setInvoiceViewMode('SINGLE_PARTY')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  invoiceViewMode === 'SINGLE_PARTY'
                    ? 'bg-[#006b5f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span className="truncate max-w-[180px]">
                  {activeDealer.companyName}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceViewMode('ALL_PARTIES_DIRECTORY')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  invoiceViewMode === 'ALL_PARTIES_DIRECTORY'
                    ? 'bg-[#006b5f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">folder_shared</span>
                <span>All Parties Directory ({filteredCustomers.length})</span>
              </button>
            </div>

            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
              Party-Wise Isolation Mode
            </span>
          </div>

          {/* VIEW A: ALL PARTIES DIRECTORY */}
          {invoiceViewMode === 'ALL_PARTIES_DIRECTORY' ? (
            <div className="flex flex-col gap-3">
              {/* Directory Search */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search party by dealer name, code, or city..."
                  value={partyDirectorySearch}
                  onChange={(e) => setPartyDirectorySearch(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                />
                {partyDirectorySearch && (
                  <button
                    type="button"
                    onClick={() => setPartyDirectorySearch('')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Parties Grid / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCustomers
                  .filter((c) => {
                    if (!partyDirectorySearch) return true;
                    const q = partyDirectorySearch.toLowerCase();
                    return (
                      c.companyName.toLowerCase().includes(q) ||
                      c.customerCode.toLowerCase().includes(q) ||
                      (c.city && c.city.toLowerCase().includes(q))
                    );
                  })
                  .map((dealer) => {
                    const partyOrderCount = orders.filter((o) => o.customerId === dealer.id).length;
                    const isCurrent = dealer.id === selectedCustomerId;

                    return (
                      <div
                        key={dealer.id}
                        className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                          isCurrent
                            ? 'border-[#006b5f] dark:border-[#76f4e0] ring-1 ring-[#006b5f]/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {dealer.companyName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span className="font-bold text-slate-600 dark:text-slate-300">{dealer.customerCode}</span>
                              <span>•</span>
                              <span>{dealer.city || 'Khyber Pakhtunkhwa'}</span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {partyOrderCount} Invoice{partyOrderCount !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Ledger Balance</span>
                            <span className="text-xs font-black font-mono text-[#006b5f] dark:text-[#76f4e0]">
                              Rs. {(dealer.currentBalance || 0).toLocaleString()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(dealer.id);
                              setInvoiceViewMode('SINGLE_PARTY');
                              triggerToast(`Switched to party: ${dealer.companyName}`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-[#006b5f] text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#006b5f] hover:text-white'
                            }`}
                          >
                            <span>Open Invoices</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* VIEW B: STRICTLY ISOLATED SINGLE-PARTY INVOICE ARCHIVE */
            <div className="flex flex-col gap-3.5">
              {/* Active Party Profile Header with Quick Switcher */}
              <div className="bg-[#001428] dark:bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#76f4e0]/10 text-[#76f4e0] flex items-center justify-center font-black">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{activeDealer.companyName}</h4>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md uppercase font-mono">
                          {activeDealer.customerCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {activeDealer.contactPerson} • {activeDealer.phone} • {activeDealer.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                      Party Switcher:
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        triggerToast('Switched party view');
                      }}
                      className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      {filteredCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} ({c.customerCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                    <span className="text-xs font-black font-mono text-white mt-0.5 block">
                      Rs. {(activeDealer.creditLimit || 350000).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Current Balance</span>
                    <span className="text-xs font-black font-mono text-[#76f4e0] mt-0.5 block">
                      Rs. {(activeDealer.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Party Invoices</span>
                    <span className="text-xs font-black font-mono text-white mt-0.5 block">
                      {dealerInvoices.length} Total
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Select Month Filter Pills */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Filter Party Invoices by Month
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {['All Months', 'Oct 2026', 'Sep 2026', 'Aug 2026'].map((m) => {
                    const isActive = invoiceSelectedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (m === 'All Months') {
                            setInvoiceSelectedMonths(['All Months']);
                          } else {
                            let filtered = invoiceSelectedMonths.filter((x) => x !== 'All Months');
                            if (filtered.includes(m)) {
                              filtered = filtered.filter((x) => x !== m);
                            } else {
                              filtered.push(m);
                            }
                            if (filtered.length === 0) filtered = ['All Months'];
                            setInvoiceSelectedMonths(filtered);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                          isActive
                            ? 'bg-[#006b5f] border-[#006b5f] text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dealer Reconciliation Document Export Panel */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#006b5f] dark:text-[#76f4e0] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Party Reconciliation Export ({activeDealer.companyName})</span>
                  </span>
                  <span className="text-[8px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Official Invoices
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                  >
                    <span className="material-symbols-outlined text-teal-600 text-[18px]">csv</span>
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                  >
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">table_chart</span>
                    <span>Excel (XLS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                  >
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">article</span>
                    <span>Word (DOC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-white text-[18px]">picture_as_pdf</span>
                    <span>Save PDF</span>
                  </button>
                </div>
              </div>

              {/* Invoices for this specific party */}
              <div className="flex flex-col gap-3">
                {dealerInvoices
                  .filter((inv) => {
                    if (invoiceSelectedMonths.includes('All Months')) return true;
                    const dateObj = new Date(inv.date);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const invMonthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                    return invoiceSelectedMonths.includes(invMonthYear);
                  })
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 hover:border-slate-300 dark:hover:border-[#76f4e0]/30 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#006b5f] text-[20px]">description</span>
                          <span className="text-sm sm:text-base font-bold text-[#191c1e] dark:text-white font-mono">
                            {inv.invoiceNo}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.badgeColor}`}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs sm:text-sm text-slate-500">
                        <span>Issued Date: {inv.date}</span>
                        <span className="text-sm font-bold text-[#001428] dark:text-[#76f4e0] font-mono">
                          Rs. {inv.amount.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400">
                        Items Booked: {inv.itemsCount} SKUs from National Light Rate list • Party: {activeDealer.companyName}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceModal(inv)}
                          className="bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-slate-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Inspect Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `National Light Pakistan • Official Invoice ${inv.invoiceNo}\nDealer: ${activeDealer.companyName} (${activeDealer.customerCode})\nTotal Amount: Rs. ${inv.amount.toLocaleString()}\nStatus: Verified & Signed\n\nContact Head Office Peshawar for any questions.`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="bg-[#006b5f] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#005047]"
                        >
                          <span className="material-symbols-outlined text-[16px]">share</span>
                          <span>Share Invoice</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {dealerInvoices.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2">article</span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">No Invoices for {activeDealer.companyName}</h4>
                    <p className="text-[10px] text-slate-400">This specific party currently has no invoice records logged.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          MODE 4: PARTY-WISE RUNNING DOUBLE-ENTRY LEDGER SHEET & DIRECTORY
          ======================================================================= */}
      {activeMode === 'ledger' && (
        <div className="flex flex-col gap-4 animate-fadeIn" id="ledger-book-view">
          {/* 1. Party-Wise View Navigation Switcher */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setLedgerViewMode('SINGLE_PARTY')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  ledgerViewMode === 'SINGLE_PARTY'
                    ? 'bg-[#006b5f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                <span className="truncate max-w-[180px]">
                  {activeDealer.companyName}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLedgerViewMode('ALL_PARTIES_DIRECTORY')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  ledgerViewMode === 'ALL_PARTIES_DIRECTORY'
                    ? 'bg-[#006b5f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>All Parties Ledger Directory ({filteredCustomers.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePrintType('LEDGER');
                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                <span>Print Ledger</span>
              </button>
              <button
                type="button"
                onClick={handleShareStatement}
                className="text-[11px] font-bold text-[#006b5f] dark:text-[#76f4e0] flex items-center gap-1 bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2.5 py-1.5 rounded-xl cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">share</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* VIEW A: ALL PARTIES LEDGER DIRECTORY */}
          {ledgerViewMode === 'ALL_PARTIES_DIRECTORY' ? (
            <div className="flex flex-col gap-3">
              {/* Directory Search */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search party ledger by dealer name, code, or city..."
                  value={partyLedgerSearch}
                  onChange={(e) => setPartyLedgerSearch(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                />
                {partyLedgerSearch && (
                  <button
                    type="button"
                    onClick={() => setPartyLedgerSearch('')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Outstanding Portfolio Summary Card */}
              <div className="grid grid-cols-3 gap-2 bg-[#001428] text-white p-3.5 rounded-2xl border border-slate-800 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Parties</span>
                  <span className="text-sm font-black font-mono text-white mt-0.5 block">
                    {filteredCustomers.length} Accounts
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Outstanding</span>
                  <span className="text-sm font-black font-mono text-[#76f4e0] mt-0.5 block">
                    Rs. {filteredCustomers.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Credit Lines</span>
                  <span className="text-sm font-black font-mono text-emerald-300 mt-0.5 block">
                    Rs. {filteredCustomers.reduce((acc, c) => acc + (c.creditLimit || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Parties Ledger Cards List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCustomers
                  .filter((c) => {
                    if (!partyLedgerSearch) return true;
                    const q = partyLedgerSearch.toLowerCase();
                    return (
                      c.companyName.toLowerCase().includes(q) ||
                      c.customerCode.toLowerCase().includes(q) ||
                      (c.city && c.city.toLowerCase().includes(q))
                    );
                  })
                  .map((dealer) => {
                    const isCurrent = dealer.id === selectedCustomerId;
                    const bal = dealer.currentBalance || 0;
                    const lim = dealer.creditLimit || 350000;
                    const usagePct = Math.min(100, Math.round((bal / lim) * 100));

                    return (
                      <div
                        key={dealer.id}
                        className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                          isCurrent
                            ? 'border-[#006b5f] dark:border-[#76f4e0] ring-1 ring-[#006b5f]/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {dealer.companyName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span className="font-bold text-slate-600 dark:text-slate-300">{dealer.customerCode}</span>
                              <span>•</span>
                              <span>{dealer.city || 'Khyber Pakhtunkhwa'}</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bal > 0 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {bal > 0 ? 'Balance Due' : 'Settled'}
                          </span>
                        </div>

                        {/* Credit Bar */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Balance: Rs. {bal.toLocaleString()}</span>
                            <span>Limit: Rs. {lim.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usagePct > 90 ? 'bg-rose-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-[#006b5f]'}`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">
                            {usagePct}% Credit Utilized
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(dealer.id);
                              setLedgerViewMode('SINGLE_PARTY');
                              triggerToast(`Opened ledger for party: ${dealer.companyName}`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-[#006b5f] text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#006b5f] hover:text-white'
                            }`}
                          >
                            <span>Open Party Ledger</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* VIEW B: STRICTLY ISOLATED SINGLE-PARTY LEDGER SHEET */
            <div className="flex flex-col gap-3.5">
              {/* Active Party Profile Header with Quick Switcher */}
              <div className="bg-[#001428] dark:bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#76f4e0]/10 text-[#76f4e0] flex items-center justify-center font-black">
                      <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{activeDealer.companyName}</h4>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md uppercase font-mono">
                          {activeDealer.customerCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {activeDealer.contactPerson} • {activeDealer.phone} • {activeDealer.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                      Party Switcher:
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        triggerToast('Switched party ledger');
                      }}
                      className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      {filteredCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} ({c.customerCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                    <span className="text-xs font-black font-mono text-white mt-0.5 block">
                      Rs. {(activeDealer.creditLimit || 350000).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Current Balance</span>
                    <span className="text-xs font-black font-mono text-[#76f4e0] mt-0.5 block">
                      Rs. {(activeDealer.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Opening Balance</span>
                    <span className="text-xs font-black font-mono text-amber-300 mt-0.5 block">
                      Rs. {(activeDealer.openingBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Month range selection */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">
                  Party Ledger Date &amp; Month Range
                </span>
                
                {/* Multi-Select Month Filter Pills for Ledger */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {['All Months', 'Oct 2026', 'Sep 2026', 'Aug 2026'].map((m) => {
                    const isActive = ledgerSelectedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (m === 'All Months') {
                            setLedgerSelectedMonths(['All Months']);
                          } else {
                            let filtered = ledgerSelectedMonths.filter((x) => x !== 'All Months');
                            if (filtered.includes(m)) {
                              filtered = filtered.filter((x) => x !== m);
                            } else {
                              filtered.push(m);
                            }
                            if (filtered.length === 0) filtered = ['All Months'];
                            setLedgerSelectedMonths(filtered);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                          isActive
                            ? 'bg-[#006b5f] border-[#006b5f] text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">From Date</span>
                    <input
                      type="date"
                      value={ledgerStartDate}
                      onChange={(e) => setLedgerStartDate(e.target.value)}
                      className="bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white px-3 py-2 rounded-xl outline-none font-bold font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">To Date</span>
                    <input
                      type="date"
                      value={ledgerEndDate}
                      onChange={(e) => setLedgerEndDate(e.target.value)}
                      className="bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white px-3 py-2 rounded-xl outline-none font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Ledger Calculations Card */}
              {(() => {
                const allEntriesComputed = [...ledgerEntries].reverse(); // Sort chronologically ascending
                
                // 1. Calculate Opening Balance prior to ledgerStartDate
                let openingBalance = 0;
                const entriesInRange: typeof ledgerEntries = [];
                
                allEntriesComputed.forEach((entry) => {
                  const matchesMonthFilter = () => {
                    if (ledgerSelectedMonths.includes('All Months')) return true;
                    const dateObj = new Date(entry.date);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const entMonthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                    return ledgerSelectedMonths.includes(entMonthYear);
                  };

                  const isBeforeStart = new Date(entry.date).getTime() < new Date(ledgerStartDate).getTime();
                  const isAfterEnd = new Date(entry.date).getTime() > new Date(ledgerEndDate).getTime();

                  if (isBeforeStart) {
                    if (entry.debit) openingBalance += entry.debit;
                    if (entry.credit) openingBalance -= entry.credit;
                  } else if (!isAfterEnd && matchesMonthFilter()) {
                    entriesInRange.push(entry);
                  }
                });

                // Re-map running balance in range starting from Opening Balance
                let currentRunning = openingBalance;
                const finalRenderableEntries = entriesInRange.map((entry) => {
                  if (entry.debit) currentRunning += entry.debit;
                  if (entry.credit) currentRunning -= entry.credit;
                  return {
                    ...entry,
                    balance: currentRunning,
                  };
                }).reverse(); // Latest on top for high readability

                const totalDebits = entriesInRange.reduce((sum, e) => sum + (e.debit || 0), 0);
                const totalCredits = entriesInRange.reduce((sum, e) => sum + (e.credit || 0), 0);

                return (
                  <div className="flex flex-col gap-3">
                    {/* Mathematical Opening Balance Card */}
                    <div className="grid grid-cols-4 gap-2 bg-[#0f2942] dark:bg-slate-950 p-3 rounded-2xl text-white border border-[#1a3b5c] text-center">
                      <div className="border-r border-slate-700/60 p-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Opening Bal</span>
                        <span className="text-[11px] sm:text-xs font-black font-mono block text-[#76f4e0] mt-0.5">
                          Rs. {openingBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-r border-slate-700/60 p-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Range Debit</span>
                        <span className="text-[11px] sm:text-xs font-black font-mono block text-rose-400 mt-0.5">
                          +Rs. {totalDebits.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-r border-slate-700/60 p-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Range Credit</span>
                        <span className="text-[11px] sm:text-xs font-black font-mono block text-emerald-400 mt-0.5">
                          -Rs. {totalCredits.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Closing Bal</span>
                        <span className="text-[11px] sm:text-xs font-black font-mono block text-amber-300 mt-0.5">
                          Rs. {currentRunning.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Customer Ledger Statement Action & Download Bar */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                              Customer Ledger Statement
                            </h4>
                            <span className="text-[9px] bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md uppercase font-mono">
                              Audit Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                            {activeDealer.companyName} • {finalRenderableEntries.length} transaction records ({ledgerSelectedMonths.join(', ')})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleShareStatement}
                          className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100/50 transition-all cursor-pointer active:scale-95"
                          title="Share statement summary on WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[18px] text-emerald-600">chat</span>
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          id="download-ledger-pdf-statement-btn"
                          onClick={handleDownloadLedgerPdfStatement}
                          className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl bg-[#006b5f] hover:bg-[#00544a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                          title="Download professional vector PDF statement generated by jsPDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                          <span>Download PDF Statement</span>
                        </button>
                      </div>
                    </div>

                    {/* Ledger Sheet Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs min-w-[550px]">
                          <thead>
                            <tr className="bg-[#f2f4f6] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-3.5">Date</th>
                              <th className="py-3 px-3.5">Reference No</th>
                              <th className="py-3 px-3.5">Particulars Description</th>
                              <th className="py-3 px-3.5 text-right">Debit (INV+)</th>
                              <th className="py-3 px-3.5 text-right">Credit (REC-)</th>
                              <th className="py-3 px-3.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                            {finalRenderableEntries.map((entry) => (
                              <tr
                                key={entry.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-sans"
                              >
                                <td className="py-3 px-3.5 whitespace-nowrap text-slate-400">{entry.date}</td>
                                <td className="py-3 px-3.5 font-mono text-slate-800 dark:text-slate-100 font-bold">{entry.reference}</td>
                                <td className="py-3 px-3.5 text-[11px] leading-relaxed max-w-[180px] truncate">{entry.particulars}</td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-500">
                                  {entry.debit ? `+Rs. ${entry.debit.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-500">
                                  {entry.credit ? `-Rs. ${entry.credit.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-3 px-3.5 text-right font-mono font-bold text-[#001428] dark:text-[#76f4e0]">
                                  Rs. {entry.balance.toLocaleString()}
                                </td>
                              </tr>
                            ))}

                            {finalRenderableEntries.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                                  No transaction ledger records within date range.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          MOBILE DETAILED INVOICE INSPECT MODAL DIALOG
          ======================================================================= */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-slideUp">
            {/* Redesigned Branded Modal Header */}
            <div className="bg-[#001428] dark:bg-slate-950 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                {/* Official Circular Logo */}
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 shadow-xs shrink-0">
                  <NationalLightLogo size="sm" showGlow={false} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#76f4e0]">NL Tax Invoice</span>
                    <span className="text-[9px] bg-[#76f4e0]/25 text-[#76f4e0] px-1.5 py-0.5 rounded-sm font-mono font-bold">DISPATCHED</span>
                  </div>
                  <h4 className="font-bold text-sm font-mono tracking-tight text-white mt-0.5">{selectedInvoiceModal.invoiceNo}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
              {/* Issued Metadata Card */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <span className="font-medium">Issued Date: <b>{selectedInvoiceModal.date}</b></span>
                <span className="font-mono">Time: 11:45 AM (Peshawar)</span>
              </div>

              {/* Customer Details info block */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs font-semibold flex flex-col gap-1.5">
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Distributor Information</span>
                <p className="text-[#191c1e] dark:text-white font-black text-xs">{activeDealer.companyName}</p>
                <p className="text-slate-500 font-mono text-[10px]">{activeDealer.customerCode} • {activeDealer.city}</p>
                <p className="text-slate-500 text-[10px]">Phone: {activeDealer.phone || '+92 300 1234567'}</p>
              </div>

              {/* Redesigned SKU Details Structured Table */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Invoice Lines Summary</span>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 grid grid-cols-12 gap-1 text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                    <span className="col-span-6">Item Particulars</span>
                    <span className="col-span-3 text-center">Qty / Packing</span>
                    <span className="col-span-3 text-right">Value (PKR)</span>
                  </div>
                  
                  {(() => {
                    const modalItemsList = selectedInvoiceModal.items || [
                      {
                        id: 'mfallback-1',
                        skuCode: 'NL-BULB-12W-E27',
                        skuName: 'NL 12W Premium LED Bulbs (E27)',
                        orderedQuantity: Math.round(selectedInvoiceModal.amount * 0.6 / 210),
                        unitPrice: 210,
                        lineTotal: Math.round(selectedInvoiceModal.amount * 0.6),
                      },
                      {
                        id: 'mfallback-2',
                        skuCode: 'NL-PAN-24W-RND',
                        skuName: 'NL 24W Slim Round SMD Panel Light',
                        orderedQuantity: Math.round(selectedInvoiceModal.amount * 0.4 / 812.5),
                        unitPrice: 812.5,
                        lineTotal: Math.round(selectedInvoiceModal.amount * 0.4),
                      }
                    ];

                    const modalSubtotal = selectedInvoiceModal.subtotal || modalItemsList.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
                    const modalTotal = selectedInvoiceModal.amount || modalSubtotal;

                    return (
                      <>
                        {modalItemsList.map((item: any) => (
                          <div key={item.id} className="p-2.5 grid grid-cols-12 gap-1 items-center">
                            <div className="col-span-6">
                              <p className="text-[#191c1e] dark:text-white font-bold">{item.skuName}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">SKU: {item.skuCode}</p>
                            </div>
                            <span className="col-span-3 text-center text-[10px] font-mono text-slate-500">
                              {item.orderedQuantity} Pcs
                            </span>
                            <span className="col-span-3 text-right font-mono text-slate-900 dark:text-slate-100 font-black">
                              Rs. {item.lineTotal.toLocaleString()}
                            </span>
                          </div>
                        ))}

                        <div className="p-3 bg-slate-50 dark:bg-slate-950 flex flex-col gap-1.5 text-[11px] font-medium text-slate-500">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">Rs. {modalSubtotal.toLocaleString()}</span>
                          </div>
                          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-0.5" />
                          <div className="flex justify-between font-black text-xs text-[#006b5f] dark:text-[#76f4e0]">
                            <span>TOTAL COMMITTED NET:</span>
                            <span className="font-mono text-sm font-black">Rs. {modalTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Verified & Signed certification seal */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 text-xs flex gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 shrink-0">verified</span>
                <div className="text-emerald-800 dark:text-emerald-400">
                  <p className="font-black">Certified Digital Invoice Signed</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed">
                    This document is officially signed by National Light Peshawar Finance Audit system and dispatched with transport Bilty.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-100"
                >
                  Close View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `National Light Pakistan • Official Invoice ${selectedInvoiceModal.invoiceNo}\nDealer: ${activeDealer.companyName} (${activeDealer.customerCode})\nTotal Amount: Rs. ${selectedInvoiceModal.amount.toLocaleString()}\nStatus: Verified & Signed\n\nContact Head Office Peshawar for any questions.`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="bg-[#006b5f] hover:bg-[#005047] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span>WhatsApp Share</span>
                </button>
              </div>

              {/* Print action button */}
              <button
                type="button"
                onClick={() => {
                  setActivePrintType('SINGLE_INVOICE');
                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="w-full bg-[#0f2942] hover:bg-[#0c2236] text-[#76f4e0] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Official Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* =======================================================================
          CONFIRM ORDER SUBMISSION MODAL
          ======================================================================= */}
      {showOrderConfirmModal && (
        <div className="fixed inset-0 bg-[#001428]/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn">
          {/* Drawer Panel Container */}
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideUp">
            
            {/* Top drag handle indicator for mobile drawer aesthetics */}
            <div className="flex justify-center py-2.5 sm:hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900/50">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Branded Drawer Header */}
            <div className="bg-[#001428] dark:bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 shadow-md shrink-0">
                  <NationalLightLogo size="sm" showGlow={false} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-black tracking-tight uppercase text-white">Review &amp; Submit Order</h3>
                  <p className="text-[10px] text-[#76f4e0] font-black uppercase tracking-wider">Verification Step • National Light Pakistan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 flex items-center justify-center text-white transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Main Area */}
            <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-left">
              
              {/* Dealer Metadata summary */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-xs font-semibold">
                <div className="flex items-center gap-1.5 mb-2.5 border-b border-slate-200/40 dark:border-slate-800 pb-2">
                  <span className="material-symbols-outlined text-[#006b5f] text-[18px]">account_balance_wallet</span>
                  <span className="text-[9px] uppercase font-black text-[#006b5f] dark:text-[#76f4e0] tracking-wider">Distributor Verification</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Dealer/Distributor Name</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">{activeDealer.companyName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Account ERP Code</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{activeDealer.customerCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Credit Cap Limit</span>
                    <span className="font-mono font-bold text-[#006b5f] dark:text-[#76f4e0]">Rs. {activeDealer.creditLimit?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Outstanding Portfolio</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. {activeDealer.currentBalance?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Itemized list of current cart */}
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2 block">Current Booking SKUs ({orderCart.length} Items)</span>
                <div className="border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-850 text-[9px] font-black tracking-wider uppercase text-slate-400">
                        <th className="p-2.5">SKU Product details</th>
                        <th className="p-2.5 text-center">QTY</th>
                        <th className="p-2.5 text-right">Net Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-700 dark:text-slate-300">
                      {orderCart.map((item) => (
                        <tr key={item.product.id}>
                          <td className="p-2.5">
                            <span className="font-bold block text-slate-900 dark:text-white truncate max-w-[190px] sm:max-w-[240px]">{item.product.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{item.product.sku} • Rs. {item.product.listPrice.toLocaleString()}</span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{item.quantity} Pcs</td>
                          <td className="p-2.5 text-right font-mono text-slate-900 dark:text-white">Rs. {(item.product.listPrice * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial calculations breakdown */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-xs font-semibold flex flex-col gap-2">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Order Value</span>
                  <span className="font-mono text-slate-900 dark:text-white">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-0.5" />
                <div className="flex justify-between font-black text-sm text-[#001428] dark:text-white">
                  <span>NET COMMITTED AMOUNT</span>
                  <span className="font-mono text-sm sm:text-base text-[#006b5f] dark:text-[#76f4e0]">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Outstanding limit warning alerts */}
              {isCreditExceeded ? (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 text-xs flex gap-3">
                  <span className="material-symbols-outlined text-rose-500 shrink-0 text-xl">warning</span>
                  <div className="text-rose-800 dark:text-rose-400 leading-relaxed">
                    <p className="font-black">Outstanding Credit Range Exceeded!</p>
                    <p className="text-[10px] mt-0.5">
                      Submitting this order pushes dealer outstanding balance to <span className="font-mono font-bold">Rs. {projectedBalance.toLocaleString()}</span>, exceeding the authorized credit cap by <span className="font-mono font-bold">Rs. {(projectedBalance - activeDealer.creditLimit!).toLocaleString()}</span>. Submitting now will request central <span className="font-bold text-rose-600 dark:text-rose-400">FINANCE AUDIT clearance</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 text-xs flex gap-3">
                  <span className="material-symbols-outlined text-emerald-500 shrink-0 text-xl">check_circle</span>
                  <div className="text-emerald-800 dark:text-emerald-400 leading-relaxed">
                    <p className="font-black">Credit Limit Compliance Safe</p>
                    <p className="text-[10px] mt-0.5">
                      Total outstanding balance (<span className="font-mono font-bold">Rs. {projectedBalance.toLocaleString()}</span>) remains completely within dealer credit limit of <span className="font-mono">Rs. {activeDealer.creditLimit?.toLocaleString()}</span>. This booking is approved for immediate dispatch!
                    </p>
                  </div>
                </div>
              )}

              {/* User Remarks */}
              {orderRemarks && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-1">Dispatch Remarks / logistics Instructions</span>
                  <p className="italic text-slate-600 dark:text-slate-400 font-semibold font-serif">"{orderRemarks}"</p>
                </div>
              )}
            </div>

            {/* Bottom action panel with responsive padding */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-150 dark:border-slate-850 grid grid-cols-2 gap-3 pb-6 sm:pb-4">
              <button
                type="button"
                onClick={() => setShowOrderConfirmModal(false)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold transition-all hover:bg-slate-100"
              >
                Go Back / Edit Cart
              </button>
              <button
                type="button"
                id="submit-order-transaction-btn"
                disabled={isSubmittingOrder}
                onClick={executeOrderSubmit}
                className="bg-[#006b5f] hover:bg-[#005047] disabled:opacity-50 text-white py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer min-h-[44px]"
                title="Process all items currently in cart as 1 transaction"
              >
                {isSubmittingOrder ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting All {orderCart.length} SKUs...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Submit Order ({orderCart.length} Items • 1 Transaction)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          OFFICIAL CORPORATE PRINT-FRIENDLY PREVIEW CONTAINER (ONLY DISPLAYED FOR PRINTERS)
          ======================================================================= */}
      {activePrintType !== 'NONE' && (
        <div id="print-invoice-page" className="fixed inset-0 bg-white text-black p-10 font-sans z-50 overflow-y-auto block">
          {/* Style element that overrides standard viewport styles on OS Print trigger */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-invoice-page, #print-invoice-page * {
                visibility: visible !important;
              }
              #print-invoice-page {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 20px !important;
                border: none !important;
                background: white !important;
                color: black !important;
              }
            }
          ` }} />

          {/* Quick exit control for preview on screen */}
          <div className="print:hidden mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-xs font-black text-slate-800 uppercase">Print Preview Layout Active</span>
              <span className="text-[10px] text-slate-400">Click Exit below to resume application workspace.</span>
            </div>
            <button
              type="button"
              onClick={() => setActivePrintType('NONE')}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Exit Print Mode
            </button>
          </div>

          {activePrintType === 'SINGLE_INVOICE' && selectedInvoiceModal && (() => {
            const invoiceItemsList = selectedInvoiceModal.items || [
              {
                id: 'fallback-1',
                skuCode: 'NL-BULB-12W-E27',
                skuName: 'NL 12W Premium LED Bulbs (E27)',
                orderedQuantity: Math.round(selectedInvoiceModal.amount * 0.6 / 210),
                unitPrice: 210,
                lineTotal: Math.round(selectedInvoiceModal.amount * 0.6),
              },
              {
                id: 'fallback-2',
                skuCode: 'NL-PAN-24W-RND',
                skuName: 'NL 24W Slim Round SMD Panel Light',
                orderedQuantity: Math.round(selectedInvoiceModal.amount * 0.4 / 812.5),
                unitPrice: 812.5,
                lineTotal: Math.round(selectedInvoiceModal.amount * 0.4),
              }
            ];

            const printSubtotal = selectedInvoiceModal.subtotal || invoiceItemsList.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
            const printTotal = selectedInvoiceModal.amount || printSubtotal;

            return (
              <div className="bg-white p-6 max-w-[750px] mx-auto border border-slate-300 rounded-lg shadow-sm">
                {/* Branded Corporate Header */}
                <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-slate-200 p-1 bg-white flex items-center justify-center">
                      <NationalLightLogo size="md" showGlow={false} />
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-[#006b5f] tracking-tight">NATIONAL LIGHT PAKISTAN</h1>
                      <p className="text-[9px] text-slate-500 font-medium tracking-wide">Official Wholesaler of Premium LED Bulbs, SMDs &amp; Panels</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <h2 className="text-sm font-black text-slate-800 uppercase font-mono">{selectedInvoiceModal.invoiceNo}</h2>
                    <p className="text-slate-500 font-medium mt-0.5">Date Issued: {selectedInvoiceModal.date}</p>
                  </div>
                </div>

                {/* Metadata columns */}
                <div className="grid grid-cols-2 gap-6 mt-6 text-xs text-slate-700 leading-relaxed text-left">
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Vendor Information</h3>
                    <p className="font-bold text-slate-950">National Light Pakistan Co.</p>
                    <p className="text-slate-500">GF 71 Sheikh Yaseen Tower,</p>
                    <p className="text-slate-500">Majid Mohabbad Khan Road, Peshawar, KPK</p>
                    <p className="text-slate-500">Tel: +92 91 5253812 | Email: billing@nationallight.pk</p>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Billed To Distributor</h3>
                    <p className="font-bold text-slate-950">{activeDealer.companyName}</p>
                    <p className="text-slate-500 font-mono">Code: {activeDealer.customerCode} • Town: {activeDealer.city || 'KPK Peshawar'}</p>
                    <p className="text-slate-500">Contact Phone: {activeDealer.phone || '+92 300 1234567'}</p>
                    <p className="text-slate-500">Payment Mode: {paymentMode || 'Cash Delivery'}</p>
                  </div>
                </div>

                {/* Items Detail Table */}
                <div className="mt-8 text-left">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5 px-3">Item Details &amp; Specifications</th>
                        <th className="py-2.5 px-3 text-center">Packing Box Size</th>
                        <th className="py-2.5 px-3 text-center">Booked Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit List Price</th>
                        <th className="py-2.5 px-3 text-right">Total Net Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold">
                      {invoiceItemsList.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{item.skuName}</span>
                            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">SKU: {item.skuCode}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {item.skuCode.includes('BULB') ? '100 Pcs / Ctn' : item.skuCode.includes('PAN') ? '40 Pcs / Ctn' : 'Standard Box'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{item.orderedQuantity} Pcs</td>
                          <td className="py-3 px-3 text-right font-mono">Rs. {item.unitPrice.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">Rs. {item.lineTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Grid */}
                <div className="mt-6 border-t border-slate-300 pt-4 flex justify-end">
                  <div className="w-64 text-xs font-semibold flex flex-col gap-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Total Subtotal:</span>
                      <span className="font-mono text-slate-950">Rs. {printSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="h-[1px] bg-slate-200 my-1" />
                    <div className="flex justify-between font-black text-sm text-[#006b5f]">
                      <span>NET COMMITTED TOTAL:</span>
                      <span className="font-mono text-base">Rs. {printTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sign-off stamps */}
                <div className="grid grid-cols-2 gap-8 mt-14 text-center text-[10px] text-slate-500">
                  <div className="border-t border-dashed border-slate-400 pt-3">
                    <p className="font-bold uppercase text-slate-700">Prepared &amp; Booked By Sales Officer</p>
                    <p className="mt-1 font-mono">{currentUser.fullName} ({currentUser.role})</p>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-3 flex flex-col items-center">
                    <p className="font-bold uppercase text-slate-700">Distributor Received Signature &amp; Stamp</p>
                    <div className="w-14 h-14 border-2 border-emerald-800/20 rounded-full mt-2 flex items-center justify-center text-[8px] font-black text-emerald-800/40 uppercase rotate-12">
                      NL PK AUDIT
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {activePrintType === 'STATEMENT' && (
            <div className="bg-white p-6 max-w-[750px] mx-auto border border-slate-300 rounded-lg shadow-sm text-left">
              {/* Distributor Account Reconciliation Statement */}
              <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-slate-200 p-1 bg-white flex items-center justify-center">
                    <NationalLightLogo size="md" showGlow={false} />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-[#006b5f] tracking-tight">NATIONAL LIGHT PAKISTAN</h1>
                    <p className="text-[9px] text-slate-500 font-medium tracking-wide">Peshawar Head Office Finance Department</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Statement of Account</h2>
                  <p className="text-slate-500 font-medium mt-0.5">Date Printed: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6 text-xs text-slate-700 mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Subject Distributor</h3>
                  <p className="font-bold text-slate-950">{activeDealer.companyName}</p>
                  <p className="text-slate-500 font-mono">Code: {activeDealer.customerCode}</p>
                  <p className="text-slate-500">Town: {activeDealer.city}</p>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Reconciliation Parameters</h3>
                  <p className="text-slate-500">Filtered Months: {invoiceSelectedMonths.join(', ')}</p>
                  <p className="text-slate-500">Total Invoices Evaluated: {filteredInvoicesForStatement.length}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2.5 px-3">Invoice / Order Number</th>
                    <th className="py-2.5 px-3">Date Issued</th>
                    <th className="py-2.5 px-3 text-center">Items Count</th>
                    <th className="py-2.5 px-3 text-center">Dispatch Status</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold text-left">
                  {filteredInvoicesForStatement.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 px-3 font-mono text-slate-900 font-bold">{inv.invoiceNo}</td>
                      <td className="py-3 px-3">{inv.date}</td>
                      <td className="py-3 px-3 text-center">{inv.itemsCount} SKUs</td>
                      <td className="py-3 px-3 text-center text-[10px]">{inv.status}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-950">Rs. {inv.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                    <td colSpan={4} className="py-3 px-3 text-right text-[10px] uppercase tracking-wider text-slate-500">Net Outstanding Sum:</td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-black text-[#006b5f]">
                      Rs. {filteredInvoicesForStatement.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 mt-14 text-center text-[10px] text-slate-500">
                <div className="border-t border-dashed border-slate-400 pt-3">
                  <p className="font-bold uppercase text-slate-700">Finance Manager Audit Sign-off</p>
                  <p className="mt-1">Verified on: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-3">
                  <p className="font-bold uppercase text-slate-700">Distributor Received Acknowledgement</p>
                  <p className="mt-1 font-mono">Sign &amp; Stamp here</p>
                </div>
              </div>
            </div>
          )}

          {activePrintType === 'LEDGER' && (() => {
            const allEntriesComputed = [...ledgerEntries].reverse();
            let openingBalance = 0;
            const entriesInRange: typeof ledgerEntries = [];
            
            allEntriesComputed.forEach((entry) => {
              const matchesMonthFilter = () => {
                if (ledgerSelectedMonths.includes('All Months')) return true;
                const dateObj = new Date(entry.date);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const entMonthYear = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                return ledgerSelectedMonths.includes(entMonthYear);
              };

              const isBeforeStart = new Date(entry.date).getTime() < new Date(ledgerStartDate).getTime();
              const isAfterEnd = new Date(entry.date).getTime() > new Date(ledgerEndDate).getTime();

              if (isBeforeStart) {
                if (entry.debit) openingBalance += entry.debit;
                if (entry.credit) openingBalance -= entry.credit;
              } else if (!isAfterEnd && matchesMonthFilter()) {
                entriesInRange.push(entry);
              }
            });

            let currentRunning = openingBalance;
            const finalRenderableEntries = entriesInRange.map((entry) => {
              if (entry.debit) currentRunning += entry.debit;
              if (entry.credit) currentRunning -= entry.credit;
              return {
                ...entry,
                balance: currentRunning,
              };
            }).reverse();

            const totalDebits = entriesInRange.reduce((sum, e) => sum + (e.debit || 0), 0);
            const totalCredits = entriesInRange.reduce((sum, e) => sum + (e.credit || 0), 0);

            return (
              <div className="bg-white p-6 max-w-[750px] mx-auto border border-slate-300 rounded-lg shadow-sm text-left">
                <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-slate-200 p-1 bg-white flex items-center justify-center">
                      <NationalLightLogo size="md" showGlow={false} />
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-[#006b5f] tracking-tight">NATIONAL LIGHT PAKISTAN</h1>
                      <p className="text-[9px] text-slate-500 font-medium tracking-wide">Peshawar Head Office Finance Department</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide font-mono">Account Ledger Book</h2>
                    <p className="text-slate-500 font-medium mt-0.5">Date Printed: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-6 text-xs text-slate-700 mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Subject Distributor</h3>
                    <p className="font-bold text-slate-950">{activeDealer.companyName}</p>
                    <p className="text-slate-500 font-mono">Code: {activeDealer.customerCode}</p>
                    <p className="text-slate-500">Town: {activeDealer.city || 'Peshawar'}</p>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-[#006b5f] border-b border-slate-200 pb-1 mb-2">Ledger Details</h3>
                    <p className="text-slate-500">Date Range: {ledgerStartDate} to {ledgerEndDate}</p>
                    <p className="text-slate-500">Selected Months: {ledgerSelectedMonths.join(', ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 bg-[#f4f6f8] border border-slate-300 p-3 rounded-lg text-center text-xs mb-6 text-slate-900 font-bold">
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Opening Bal</span>
                    <span className="font-mono text-slate-Block font-black text-slate-900 block mt-0.5">Rs. {openingBalance.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Total Debits</span>
                    <span className="font-mono text-rose-600 block mt-0.5">+Rs. {totalDebits.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Total Credits</span>
                    <span className="font-mono text-emerald-600 block mt-0.5">-Rs. {totalCredits.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block uppercase font-bold">Closing Bal</span>
                    <span className="font-mono text-[#006b5f] block mt-0.5">Rs. {currentRunning.toLocaleString()}</span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Reference No</th>
                      <th className="py-2 px-3">Particulars Description</th>
                      <th className="py-2 px-3 text-right">Debit (INV)</th>
                      <th className="py-2 px-3 text-right">Credit (REC)</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold text-left">
                    {finalRenderableEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-500">{entry.date}</td>
                        <td className="py-2 px-3 font-mono text-slate-900 font-bold">{entry.reference}</td>
                        <td className="py-2 px-3 text-[11px] leading-relaxed max-w-[180px] truncate">{entry.particulars}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          {entry.debit ? `+Rs. ${entry.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600">
                          {entry.credit ? `-Rs. ${entry.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                          Rs. {entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {finalRenderableEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No ledger records exist in date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="grid grid-cols-2 gap-8 mt-14 text-center text-[10px] text-slate-500">
                  <div className="border-t border-dashed border-slate-400 pt-3">
                    <p className="font-bold uppercase text-slate-700">Audit Desk Signature</p>
                    <p className="mt-1">Verified on: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-3">
                    <p className="font-bold uppercase text-slate-700">Distributor Received Signature</p>
                    <p className="mt-1 font-mono">Sign &amp; Stamp here</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Sync & Save Feedback Popup Toast */}
      {showToast && (
        <div className="fixed bottom-24 inset-x-4 z-50 flex justify-center animate-slideUp">
          <div className="bg-[#001428] text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-[#76f4e0]/30 max-w-sm">
            <span className="material-symbols-outlined text-[#76f4e0] text-[20px] shrink-0">
              check_circle
            </span>
            <span className="text-xs font-bold leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
