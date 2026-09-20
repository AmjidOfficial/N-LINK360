/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Light Khata & Invoicing System
 * Built with user-friendly digital ledger & invoicing architecture:
 * 1. Khata Management: Customer Directory, Net Receivables (Lena Hai), WhatsApp reminders
 * 2. Passbook Ledger: Chronological timeline with [🔴 YOU GAVE / MAAL] & [🟢 YOU GOT / PAISA]
 * 3. Digital Invoicing: Create, view, print, and WhatsApp share itemized tax invoices
 * 4. Daily CashBook (Roznamcha): Track cash in hand, daily collections, and WhatsApp daily logs
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, SalesOrder, Recovery, PaymentMode, SalesOrderItem } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NLINK_OFFICIAL_PRODUCTS, NLinkSKU } from '../../data/nlink-products';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import {
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  FileText,
  Share2,
  CheckCircle2,
  ChevronRight,
  X,
  User,
  Store,
  Clock,
  Wallet,
  ArrowLeft,
  Download,
  Building2,
  Printer,
  FileSpreadsheet,
  Layers,
  Trash2,
  Eye,
  Check,
  CreditCard,
  Receipt,
  HelpCircle,
} from 'lucide-react';

export interface NLinkKhataViewProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  onPlaceOrder: (newOrder: SalesOrder) => void;
  onRecordRecovery: (newRecovery: Recovery) => void;
  onAddDealer?: (newDealer: Partial<Customer>) => void;
  onOpenRateCard?: () => void;
  initialSelectedCustomerId?: string;
  selectedAttendanceTown?: string;
  isCheckedIn?: boolean;
  onNavigateToAttendance?: () => void;
}

export const NLinkKhataView: React.FC<NLinkKhataViewProps> = ({
  currentUser,
  customers,
  orders,
  recoveries,
  onPlaceOrder,
  onRecordRecovery,
  onAddDealer,
  onOpenRateCard,
  initialSelectedCustomerId,
  selectedAttendanceTown,
  isCheckedIn = true,
  onNavigateToAttendance,
}) => {
  // Top-level Navigation Mode: 'KHATA' | 'INVOICES' | 'CASHBOOK'
  const [topTab, setTopTab] = useState<'KHATA' | 'INVOICES' | 'CASHBOOK'>('KHATA');

  // Khata Screen state: 'CUSTOMERS_LIST' | 'CUSTOMER_LEDGER'
  const [khataScreen, setKhataScreen] = useState<'CUSTOMERS_LIST' | 'CUSTOMER_LEDGER'>(
    initialSelectedCustomerId ? 'CUSTOMER_LEDGER' : 'CUSTOMERS_LIST'
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialSelectedCustomerId || (customers[0]?.id ?? '')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isGotModalOpen, setIsGotModalOpen] = useState(false); // Paisa Mila (Recovery)
  const [isGaveModalOpen, setIsGaveModalOpen] = useState(false); // Maal Diya (Order)
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false); // Create New Invoice
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false); // Add Customer
  const [inspectedInvoice, setInspectedInvoice] = useState<SalesOrder | null>(null); // View Invoice

  // --- RECOVERY FORM STATE ---
  const [recoveryAmount, setRecoveryAmount] = useState<string>('');
  const [recoveryDate, setRecoveryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [recoveryMode, setRecoveryMode] = useState<PaymentMode>('CASH');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string>('');
  const [recoveryNotes, setRecoveryNotes] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Meezan Bank Limited');
  const [slipNumber, setSlipNumber] = useState<string>('');

  // --- QUICK ORDER FORM STATE ---
  const [quickSkuId, setQuickSkuId] = useState<string>(NLINK_OFFICIAL_PRODUCTS[0]?.id || '');
  const [quickCartons, setQuickCartons] = useState<number>(5);
  const [quickPacks, setQuickPacks] = useState<number>(0);
  const [quickOrderDate, setQuickOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickNotes, setQuickNotes] = useState<string>('');

  // --- MULTI-ITEM INVOICE BUILDER STATE ---
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<string>(selectedCustomerId);
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState<number>(0);
  const [invoiceItems, setInvoiceItems] = useState<
    Array<{
      skuId: string;
      skuCode: string;
      skuName: string;
      cartonQty: number;
      packQty: number;
      unitsPerCarton: number;
      totalUnits: number;
      tradePrice: number;
      lineTotal: number;
    }>
  >([
    {
      skuId: NLINK_OFFICIAL_PRODUCTS[0]?.id || 'sku-1',
      skuCode: NLINK_OFFICIAL_PRODUCTS[0]?.skuCode || 'NL-B12W',
      skuName: NLINK_OFFICIAL_PRODUCTS[0]?.name || 'National LED Bulb 12W',
      cartonQty: 5,
      packQty: 0,
      unitsPerCarton: NLINK_OFFICIAL_PRODUCTS[0]?.cartonQuantity || 50,
      totalUnits: 5 * (NLINK_OFFICIAL_PRODUCTS[0]?.cartonQuantity || 50),
      tradePrice: NLINK_OFFICIAL_PRODUCTS[0]?.tradePrice || 260,
      lineTotal: 5 * (NLINK_OFFICIAL_PRODUCTS[0]?.cartonQuantity || 50) * (NLINK_OFFICIAL_PRODUCTS[0]?.tradePrice || 260),
    },
  ]);

  // --- ADD CUSTOMER STATE ---
  const [newShopName, setNewShopName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Peshawar');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');

  // Synchronize when initialSelectedCustomerId changes
  useEffect(() => {
    if (initialSelectedCustomerId) {
      setSelectedCustomerId(initialSelectedCustomerId);
      setInvoiceCustomerId(initialSelectedCustomerId);
      setKhataScreen('CUSTOMER_LEDGER');
    }
  }, [initialSelectedCustomerId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active Customer Object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  // Overall Portfolio Totals
  const portfolioMetrics = useMemo(() => {
    let totalReceive = 0;
    customers.forEach((c) => {
      if ((c.currentBalance || 0) > 0) {
        totalReceive += c.currentBalance;
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecoveries = recoveries.filter((r) => r.collectionDate === todayStr);
    const todayCollected = todayRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

    const todayOrders = orders.filter((o) => (o.orderDate || o.createdAt?.split('T')[0]) === todayStr);
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalReceive,
      totalGive: 0,
      todayCollected,
      todaySales,
    };
  }, [customers, recoveries, orders]);

  // List of unique cities
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city) set.add(c.city.trim());
    });
    return Array.from(set);
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.companyName.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));

      const matchCity = cityFilter === 'ALL' || c.city === cityFilter;

      return matchSearch && matchCity;
    });
  }, [customers, searchQuery, cityFilter]);

  // Customer transactions (Orders/Bills + Recoveries/Payments)
  const customerTransactions = useMemo(() => {
    if (!activeCustomer) return [];

    const custOrders = orders.filter((o) => o.customerId === activeCustomer.id);
    const custRecs = recoveries.filter((r) => r.customerId === activeCustomer.id);

    type Tx = {
      id: string;
      date: string;
      type: 'ORDER' | 'RECOVERY';
      reference: string;
      description: string;
      debit: number; // You Gave
      credit: number; // You Got
      rawDate: string;
      paymentMode?: string;
      orderRef?: SalesOrder;
    };

    const list: Tx[] = [];

    custOrders.forEach((o) => {
      const d = o.orderDate || o.createdAt?.split('T')[0] || '2026-09-01';
      list.push({
        id: o.id,
        date: d,
        type: 'ORDER',
        reference: o.orderNumber,
        description: `Bill #${o.orderNumber.replace('ORD-', 'INV-')} (${o.items?.length || 1} items)`,
        debit: o.totalAmount,
        credit: 0,
        rawDate: o.createdAt || d,
        orderRef: o,
      });
    });

    custRecs.forEach((r) => {
      const d = r.collectionDate || r.createdAt?.split('T')[0] || '2026-09-01';
      list.push({
        id: r.id,
        date: d,
        type: 'RECOVERY',
        reference: r.recoveryNumber,
        description: `Payment Received (${r.paymentMode === 'CASH' ? 'Cash' : 'Bank Slip'})`,
        debit: 0,
        credit: r.amount,
        rawDate: r.createdAt || d,
        paymentMode: r.paymentMode,
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    let running = activeCustomer.currentBalance || 0;
    return list.map((tx) => {
      const current = running;
      if (tx.debit) running -= tx.debit;
      if (tx.credit) running += tx.credit;
      return {
        ...tx,
        balanceAfter: current,
      };
    });
  }, [activeCustomer, orders, recoveries]);

  // Customer Invoices for manual link
  const availableInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return orders
      .filter((o) => o.customerId === activeCustomer.id)
      .map((o) => ({
        id: o.id,
        invoiceNo: `INV-${o.orderNumber.replace('ORD-', '')}`,
        date: o.orderDate || o.createdAt?.split('T')[0] || '2026-09-01',
        amount: o.totalAmount,
      }));
  }, [activeCustomer, orders]);

  // Quick WhatsApp Payment Reminder
  const handleSendWhatsAppReminder = (customer: Customer) => {
    const bal = customer.currentBalance || 0;
    const officerName = currentUser.fullName || currentUser.name || 'Sales Officer';
    const text =
      `*NATIONAL LIGHT PAKISTAN • KHATA STATEMENT*\n` +
      `Assalam-o-Alaikum Respected *${customer.companyName}*,\n\n` +
      `Your current outstanding balance is: *Rs. ${bal.toLocaleString()}*.\n` +
      `Kindly arrange payment at your earliest convenience.\n\n` +
      `Field Officer: *${officerName}* (${currentUser.phone})\n` +
      `National Light Helpline: +92 91 111 654 448`;

    const phoneClean = customer.phone?.replace(/[^0-9]/g, '') || '';
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // WhatsApp Share for specific Invoice / Bill
  const handleShareInvoiceWhatsApp = (order: SalesOrder) => {
    const cust = customers.find((c) => c.id === order.customerId);
    const invoiceNo = order.orderNumber.replace('ORD-', 'INV-');
    let text = `*NATIONAL LIGHT PAKISTAN • TAX INVOICE*\n`;
    text += `Invoice No: *${invoiceNo}*\n`;
    text += `Date: *${order.orderDate || order.createdAt?.split('T')[0]}*\n`;
    text += `Customer: *${order.customerName}* (${cust?.city || 'Peshawar'})\n`;
    text += `Officer: *${order.salesUserName}*\n\n`;
    text += `*ITEMS PURCHASED:*\n`;

    order.items?.forEach((it, idx) => {
      text += `${idx + 1}. ${it.skuName} × ${it.orderedQuantity} pcs @ Rs. ${it.unitPrice} = *Rs. ${it.lineTotal.toLocaleString()}*\n`;
    });

    text += `\n*TOTAL BILL: Rs. ${order.totalAmount.toLocaleString()}*\n`;
    if (cust?.currentBalance) {
      text += `Account Balance: *Rs. ${cust.currentBalance.toLocaleString()}*\n`;
    }
    text += `\nThank you for doing business with National Light Pakistan!`;

    const phoneClean = cust?.phone?.replace(/[^0-9]/g, '') || '';
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Download PDF statement
  const handleDownloadStatement = async () => {
    if (!activeCustomer) return;
    try {
      triggerToast(`Generating PDF Statement for ${activeCustomer.companyName}...`);
      const entries = customerTransactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        reference: tx.reference,
        particulars: tx.description,
        debit: tx.debit > 0 ? tx.debit : null,
        credit: tx.credit > 0 ? tx.credit : null,
        balance: tx.balanceAfter,
      }));

      await downloadCustomerLedgerPdf({
        customer: activeCustomer,
        entries,
        openingBalance: activeCustomer.openingBalance || 0,
        preparedByName: `${currentUser.fullName} (${currentUser.roleTitle || currentUser.role})`,
      });
      triggerToast(`✓ Statement downloaded successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast('Could not download statement.');
    }
  };

  // Save Recovery (Paisa Mila)
  const handleSaveRecovery = () => {
    const amt = parseFloat(recoveryAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!activeCustomer) return;

    const recNo = `REC-${Date.now().toString().slice(-6)}`;
    const newRec: Recovery = {
      id: `rec-${Date.now()}`,
      recoveryNumber: recNo,
      customerId: activeCustomer.id,
      customerName: activeCustomer.companyName,
      customerCode: activeCustomer.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName || currentUser.name,
      collectionDate: recoveryDate,
      amount: amt,
      paymentMode: recoveryMode,
      bankName: recoveryMode === 'ONLINE_TRANSFER' ? bankName : undefined,
      instrumentNumber: recoveryMode === 'ONLINE_TRANSFER' ? slipNumber : undefined,
      status: 'PENDING_VERIFICATION',
      remarks: linkedInvoiceId ? `Linked to ${linkedInvoiceId}. ${recoveryNotes}` : recoveryNotes || 'Cash payment',
      createdAt: new Date().toISOString(),
    };

    onRecordRecovery(newRec);
    setIsGotModalOpen(false);
    setRecoveryAmount('');
    setRecoveryNotes('');
    setLinkedInvoiceId('');
    triggerToast(`✓ Paisa Mila: Rs. ${amt.toLocaleString()} recorded for ${activeCustomer.companyName}`);
  };

  // Save Quick Order (Maal Diya)
  const handleSaveQuickOrder = () => {
    if (!activeCustomer) return;
    const sku = NLINK_OFFICIAL_PRODUCTS.find((p) => p.id === quickSkuId) || NLINK_OFFICIAL_PRODUCTS[0];
    const totalUnits = quickCartons * sku.cartonQuantity + quickPacks;
    if (totalUnits <= 0) {
      alert('Please enter carton or pack quantity.');
      return;
    }

    const lineTotal = totalUnits * sku.tradePrice;
    const ordNo = `ORD-${Date.now().toString().slice(-5)}`;

    const newOrder: SalesOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: ordNo,
      customerId: activeCustomer.id,
      customerName: activeCustomer.companyName,
      customerCode: activeCustomer.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName || currentUser.name,
      orderDate: quickOrderDate,
      status: 'SUBMITTED',
      creditCheckStatus: 'GREEN',
      subtotal: lineTotal,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: lineTotal,
      items: [
        {
          id: `item-${Date.now()}`,
          orderId: `ord-${Date.now()}`,
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          orderedQuantity: totalUnits,
          unitPrice: sku.tradePrice,
          discountPercent: 0,
          lineTotal: lineTotal,
        },
      ],
      notes: quickNotes || 'N-Link Khata Quick Bill',
      createdAt: new Date().toISOString(),
    };

    onPlaceOrder(newOrder);
    setIsGaveModalOpen(false);
    setQuickCartons(5);
    setQuickPacks(0);
    setQuickNotes('');
    triggerToast(`✓ Maal Diya: Bill #${ordNo.replace('ORD-', 'INV-')} (Rs. ${lineTotal.toLocaleString()}) recorded!`);
  };

  // Multi-Item Invoice Builder Handlers
  const handleAddInvoiceRow = () => {
    const defaultSku = NLINK_OFFICIAL_PRODUCTS[0];
    setInvoiceItems([
      ...invoiceItems,
      {
        skuId: defaultSku.id,
        skuCode: defaultSku.skuCode,
        skuName: defaultSku.name,
        cartonQty: 1,
        packQty: 0,
        unitsPerCarton: defaultSku.cartonQuantity,
        totalUnits: defaultSku.cartonQuantity,
        tradePrice: defaultSku.tradePrice,
        lineTotal: defaultSku.cartonQuantity * defaultSku.tradePrice,
      },
    ]);
  };

  const handleUpdateInvoiceRow = (index: number, skuId: string, cartonQty: number, packQty: number) => {
    const sku = NLINK_OFFICIAL_PRODUCTS.find((p) => p.id === skuId) || NLINK_OFFICIAL_PRODUCTS[0];
    const totalUnits = cartonQty * sku.cartonQuantity + packQty;
    const lineTotal = totalUnits * sku.tradePrice;

    const updated = [...invoiceItems];
    updated[index] = {
      skuId: sku.id,
      skuCode: sku.skuCode,
      skuName: sku.name,
      cartonQty,
      packQty,
      unitsPerCarton: sku.cartonQuantity,
      totalUnits,
      tradePrice: sku.tradePrice,
      lineTotal,
    };
    setInvoiceItems(updated);
  };

  const handleRemoveInvoiceRow = (index: number) => {
    if (invoiceItems.length === 1) {
      alert('Invoice must have at least one product line.');
      return;
    }
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  // Submit Multi-Item Invoice
  const handleSaveMultiItemInvoice = () => {
    const targetCust = customers.find((c) => c.id === invoiceCustomerId);
    if (!targetCust) {
      alert('Please select a customer for this invoice.');
      return;
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountAmt = Math.round((subtotal * invoiceDiscountPercent) / 100);
    const totalAmount = subtotal - discountAmt;

    if (totalAmount <= 0) {
      alert('Please add valid product quantities.');
      return;
    }

    const ordNo = `ORD-${Date.now().toString().slice(-5)}`;
    const newItems: SalesOrderItem[] = invoiceItems.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      orderId: `ord-${Date.now()}`,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      orderedQuantity: item.totalUnits,
      unitPrice: item.tradePrice,
      discountPercent: invoiceDiscountPercent,
      lineTotal: item.lineTotal,
    }));

    const newOrder: SalesOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: ordNo,
      customerId: targetCust.id,
      customerName: targetCust.companyName,
      customerCode: targetCust.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName || currentUser.name,
      orderDate: invoiceDate,
      status: 'SUBMITTED',
      creditCheckStatus: 'GREEN',
      subtotal,
      discountAmount: discountAmt,
      taxAmount: 0,
      totalAmount,
      items: newItems,
      notes: `Tax Invoice Generated via N-Link Khata`,
      createdAt: new Date().toISOString(),
    };

    onPlaceOrder(newOrder);
    setIsCreateInvoiceOpen(false);
    triggerToast(`✓ Invoice #${ordNo.replace('ORD-', 'INV-')} generated successfully!`);
  };

  // Add Customer
  const handleSaveCustomer = () => {
    if (!newShopName.trim()) {
      alert('Please enter shop name.');
      return;
    }

    const opBal = parseFloat(newOpeningBalance) || 0;
    const newCust: Partial<Customer> = {
      id: `cust-${Date.now()}`,
      customerCode: `DL-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: newShopName.trim(),
      contactPerson: newContactPerson.trim() || 'Proprietor',
      phone: newPhone.trim() || '+92 300 0000000',
      city: newCity,
      town: newCity,
      openingBalance: opBal,
      currentBalance: opBal,
      creditLimit: 300000,
      status: 'NORMAL',
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
    };

    if (onAddDealer) {
      onAddDealer(newCust);
    }
    setIsAddCustomerOpen(false);
    setNewShopName('');
    setNewContactPerson('');
    setNewPhone('');
    setNewOpeningBalance('');
    triggerToast(`✓ Added ${newShopName} to Khata!`);
  };

  // Export Daily Cash Log
  const handleExportDailyWhatsAppLog = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = recoveries.filter((r) => r.collectionDate === today);
    const todayOrds = orders.filter((o) => (o.orderDate || o.createdAt?.split('T')[0]) === today);

    let text = `*NATIONAL LIGHT PAKISTAN • DAILY SUMMARY LOG*\n`;
    text += `Date: *${today}*\n`;
    text += `Officer: *${currentUser.fullName}* (${currentUser.roleTitle || currentUser.role})\n`;
    text += `Town / Beat: *${selectedAttendanceTown || 'Peshawar Beat'}*\n\n`;

    text += `*--- WASOOLI (CASH IN) ---*\n`;
    if (todayRecs.length === 0) {
      text += `No cash recoveries recorded today.\n`;
    } else {
      todayRecs.forEach((r, idx) => {
        text += `${idx + 1}. *${r.customerName}*: Rs. ${r.amount.toLocaleString()} (${r.paymentMode})\n`;
      });
    }
    text += `*Total Wasooli: Rs. ${portfolioMetrics.todayCollected.toLocaleString()}*\n\n`;

    text += `*--- BILLS / INVOICES ISSUED ---*\n`;
    if (todayOrds.length === 0) {
      text += `No invoices issued today.\n`;
    } else {
      todayOrds.forEach((o, idx) => {
        text += `${idx + 1}. *${o.customerName}*: Rs. ${o.totalAmount.toLocaleString()} (${o.orderNumber.replace('ORD-', 'INV-')})\n`;
      });
    }
    text += `*Total Orders: Rs. ${portfolioMetrics.todaySales.toLocaleString()}*\n\n`;
    text += `Official National Light Pakistan Field Intelligence.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 font-sans antialiased text-slate-900 dark:text-slate-100 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#006b5f] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold border border-emerald-300/40 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#76f4e0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TOP NAVIGATION PILLS (Khata • Invoices • CashBook)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs mb-4 grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            setTopTab('KHATA');
            setKhataScreen('CUSTOMERS_LIST');
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            topTab === 'KHATA'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Khata (Ledgers)</span>
        </button>

        <button
          type="button"
          onClick={() => setTopTab('INVOICES')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            topTab === 'INVOICES'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices (Bills)</span>
        </button>

        <button
          type="button"
          onClick={() => setTopTab('CASHBOOK')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            topTab === 'CASHBOOK'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>CashBook (Roznamcha)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: KHATA (Customers Directory & Passbook Ledger)
          ========================================================================= */}
      {topTab === 'KHATA' && khataScreen === 'CUSTOMERS_LIST' && (
        <div className="space-y-4">
          {/* Top Summary Banner: You'll Receive (Lena Hai) vs You'll Give (Dena Hai) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
              {/* You'll Receive (Lena Hai) */}
              <div className="pr-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  You'll Receive (Lena Hai)
                </span>
                <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  Rs. {portfolioMetrics.totalReceive.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">From {customers.length} market dealers</p>
              </div>

              {/* You'll Give (Dena Hai) */}
              <div className="pl-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  You'll Give (Dena Hai)
                </span>
                <span className="text-xl sm:text-3xl font-black text-slate-400 dark:text-slate-500 font-mono">
                  Rs. 0
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Clear supplier accounts</p>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Beat Town: <b>{selectedAttendanceTown || 'Peshawar Central'}</b>
              </span>
              <button
                type="button"
                onClick={handleExportDailyWhatsAppLog}
                className="flex items-center gap-1 text-[#006b5f] dark:text-[#76f4e0] font-bold hover:underline cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Daily Log on WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Search Bar + Add Customer Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dealer by shop name, city, phone..."
                className="w-full pl-10 pr-9 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-4 py-3 bg-[#006b5f] hover:bg-[#005249] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>

          {/* City Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setCityFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                cityFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              All Pakistan ({customers.length})
            </button>
            {availableCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setCityFilter(city)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  cityFilter === city
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Customer Cards List */}
          <div className="space-y-2.5">
            {filteredCustomers.map((cust) => {
              const bal = cust.currentBalance || 0;
              const initials =
                cust.companyName
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'NL';

              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    setKhataScreen('CUSTOMER_LEDGER');
                  }}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#006b5f] dark:text-[#76f4e0] border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center font-black text-sm shrink-0">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-[#006b5f] dark:group-hover:text-[#76f4e0] transition-colors">
                        {cust.companyName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span>{cust.contactPerson || 'Proprietor'}</span>
                        <span className="mx-1">•</span>
                        <span>{cust.city || 'Peshawar'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        Rs. {bal.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tight">
                        {bal > 0 ? "You'll Receive" : 'Settled'}
                      </span>
                    </div>

                    {/* WhatsApp 1-tap reminder */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendWhatsAppReminder(cust);
                      }}
                      className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition-all cursor-pointer"
                      title="Send WhatsApp payment reminder"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: CUSTOMER LEDGER (Passbook Timeline + The Iconic Two Bottom CTAs)
          ========================================================================= */}
      {topTab === 'KHATA' && khataScreen === 'CUSTOMER_LEDGER' && activeCustomer && (
        <div className="space-y-4">
          {/* Back Header & Dealer Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setKhataScreen('CUSTOMERS_LIST')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer py-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Customers</span>
              </button>

              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                {activeCustomer.customerCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {activeCustomer.companyName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeCustomer.contactPerson} • {activeCustomer.phone} • {activeCustomer.city}
                </p>
              </div>

              {/* Net Balance Pill */}
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3 px-4 text-right">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase">
                  Net Balance (You'll Receive)
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  Rs. {(activeCustomer.currentBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSendWhatsAppReminder(activeCustomer)}
                className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <a
                href={`tel:${activeCustomer.phone}`}
                className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-all text-center"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadStatement}
                className="py-2.5 px-3 bg-[#006b5f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#00544a] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Statement</span>
              </button>
            </div>
          </div>

          {/* Transactions Passbook Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Transactions Ledger ({customerTransactions.length})
              </h3>
              <span className="text-[11px] text-slate-400">Tap bill to view full tax invoice</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (tx.orderRef) {
                      setInspectedInvoice(tx.orderRef);
                    }
                  }}
                  className={`p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                    tx.orderRef ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {tx.description}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {tx.reference}
                        </span>
                        {tx.orderRef && (
                          <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5" />
                            <span>View Bill</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{tx.date}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      {tx.debit > 0 ? (
                        <div>
                          <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                            - Rs. {tx.debit.toLocaleString()}
                          </span>
                          <span className="text-[9px] block font-bold text-rose-500 uppercase">
                            You Gave (Maal)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            + Rs. {tx.credit.toLocaleString()}
                          </span>
                          <span className="text-[9px] block font-bold text-emerald-500 uppercase">
                            You Got (Paisa)
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Bal: Rs. {tx.balanceAfter.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {customerTransactions.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No transactions recorded yet for this customer.
                </div>
              )}
            </div>
          </div>

          {/* THE TWO ICONIC FIXED BOTTOM ACTION BUTTONS */}
          <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 p-3 px-4 z-40 shadow-2xl">
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
              {/* 🔴 YOU GAVE (MAAL DIYA) */}
              <button
                type="button"
                onClick={() => setIsGaveModalOpen(true)}
                className="h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                <span>YOU GAVE (MAAL)</span>
              </button>

              {/* 🟢 YOU GOT (PAISA MILA) */}
              <button
                type="button"
                onClick={() => setIsGotModalOpen(true)}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                <span>YOU GOT (PAISA)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: INVOICES (Digital Invoices & Bill Maker)
          ========================================================================= */}
      {topTab === 'INVOICES' && (
        <div className="space-y-4">
          {/* Invoices Header Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Official Digital Billing
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                Invoices &amp; Tax Bills
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {orders.length} total invoices issued across all territories
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setInvoiceCustomerId(selectedCustomerId || customers[0]?.id || '');
                setIsCreateInvoiceOpen(true);
              }}
              className="px-5 py-3 bg-[#006b5f] hover:bg-[#005249] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invoice</span>
            </button>
          </div>

          {/* Invoices List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">All Invoices</span>
              <span className="text-slate-400 font-mono">Latest first</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((ord) => {
                const invNo = ord.orderNumber.replace('ORD-', 'INV-');
                const cust = customers.find((c) => c.id === ord.customerId);

                return (
                  <div
                    key={ord.id}
                    onClick={() => setInspectedInvoice(ord)}
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-[#006b5f] transition-colors">
                            {ord.customerName}
                          </h4>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {invNo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          <span>{ord.orderDate || ord.createdAt?.split('T')[0]}</span>
                          <span className="mx-1">•</span>
                          <span>{ord.items?.length || 1} SKU items</span>
                          <span className="mx-1">•</span>
                          <span>{cust?.city || 'Peshawar'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white block">
                          Rs. {ord.totalAmount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          DISPATCHED
                        </span>
                      </div>

                      {/* 1-tap WhatsApp Share */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareInvoiceWhatsApp(ord);
                        }}
                        className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center transition-all cursor-pointer"
                        title="Share invoice on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CASHBOOK (Roznamcha / Daily Cash Flow)
          ========================================================================= */}
      {topTab === 'CASHBOOK' && (
        <div className="space-y-4">
          {/* Daily Cash In Hand Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Today's Net Cash in Hand
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#006b5f] dark:text-[#76f4e0] font-mono">
                  Rs. {portfolioMetrics.todayCollected.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportDailyWhatsAppLog}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Day Summary</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                  Total Cash In (Wasooli)
                </span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  Rs. {portfolioMetrics.todayCollected.toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block">
                  Total Cash Out (Kharcha)
                </span>
                <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                  Rs. 0
                </span>
              </div>
            </div>
          </div>

          {/* Today's Cash Receipts */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Today's Cash Receipts Feed
              </h4>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recoveries.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                      {r.customerName}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {r.collectionDate} • {r.paymentMode === 'CASH' ? 'Cash Handover' : 'Online / Bank Transfer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      + Rs. {r.amount.toLocaleString()}
                    </span>
                    <span className="text-[9px] block text-emerald-500 font-bold uppercase">Wasooli</span>
                  </div>
                </div>
              ))}

              {recoveries.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No cash receipts recorded for today yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: 🟢 YOU GOT (PAISA MILA) - Recovery Entry
          ========================================================================= */}
      {isGotModalOpen && activeCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">YOU GOT (PAISA MILA)</h3>
                  <p className="text-[11px] text-emerald-100">{activeCustomer.companyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGotModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Enter Amount Received (Rs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto text-[11px] font-bold">
                  {[5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRecoveryAmount(amt.toString())}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                    >
                      +Rs. {amt.toLocaleString()}
                    </button>
                  ))}
                  {activeCustomer.currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecoveryAmount(activeCustomer.currentBalance.toString())}
                      className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black cursor-pointer"
                    >
                      Full Bal ({activeCustomer.currentBalance.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Recovery Date *
                  </label>
                  <input
                    type="date"
                    value={recoveryDate}
                    onChange={(e) => setRecoveryDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={recoveryMode}
                    onChange={(e) => setRecoveryMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="CASH">Cash (Naqd)</option>
                    <option value="ONLINE_TRANSFER">Bank / Online</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {recoveryMode === 'ONLINE_TRANSFER' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Deposit Bank</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Meezan Bank, HBL"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Slip / Transaction ID</label>
                    <input
                      type="text"
                      value={slipNumber}
                      onChange={(e) => setSlipNumber(e.target.value)}
                      placeholder="Slip # or Txn Ref"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Invoice Date-Wise Linkage */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Link to Invoice (Date-Wise)
                </label>
                <select
                  value={linkedInvoiceId}
                  onChange={(e) => setLinkedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                >
                  <option value="">-- General Account Balance Recovery --</option>
                  {availableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.invoiceNo}>
                      {inv.invoiceNo} • Dated {inv.date} (Rs. {inv.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Remarks / Note
                </label>
                <input
                  type="text"
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  placeholder="e.g. Shop visit collection"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveRecovery}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>SAVE PAYMENT (PAISA MILA)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: 🔴 YOU GAVE (MAAL DIYA) - Quick Bill Entry
          ========================================================================= */}
      {isGaveModalOpen && activeCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">YOU GAVE (MAAL DIYA)</h3>
                  <p className="text-[11px] text-rose-100">{activeCustomer.companyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGaveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Select Product Item *
                </label>
                <select
                  value={quickSkuId}
                  onChange={(e) => setQuickSkuId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                >
                  {NLINK_OFFICIAL_PRODUCTS.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.name} • {sku.wattage} (TP: Rs. {sku.tradePrice})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const sku = NLINK_OFFICIAL_PRODUCTS.find((p) => p.id === quickSkuId) || NLINK_OFFICIAL_PRODUCTS[0];
                const totalUnits = quickCartons * sku.cartonQuantity + quickPacks;
                const estimatedTotal = totalUnits * sku.tradePrice;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Cartons ({sku.cartonQuantity} pcs/ctn)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={quickCartons}
                          onChange={(e) => setQuickCartons(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-800 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Loose Packs (pcs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={quickPacks}
                          onChange={(e) => setQuickPacks(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-800 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 block">
                          Total Quantity
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white font-mono">
                          {totalUnits.toLocaleString()} Pieces
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 block">
                          Total Bill Amount
                        </span>
                        <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                          Rs. {estimatedTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Bill Date
                </label>
                <input
                  type="date"
                  value={quickOrderDate}
                  onChange={(e) => setQuickOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Notes / Order Details
                </label>
                <input
                  type="text"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="e.g. Shop stock dispatch"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveQuickOrder}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>SAVE BILL (MAAL DIYA)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: MULTI-ITEM DIGITAL INVOICE MAKER (Full Invoicing System)
          ========================================================================= */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#006b5f] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#76f4e0]" />
                <div>
                  <h3 className="font-black text-sm">Create New Tax Invoice</h3>
                  <p className="text-[11px] text-emerald-100">Official National Light Invoicing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Customer Selector & Invoice Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Select Dealer / Customer *
                  </label>
                  <select
                    value={invoiceCustomerId}
                    onChange={(e) => setInvoiceCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Invoice Issue Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Items Table Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Invoice Line Items ({invoiceItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInvoiceRow}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {invoiceItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={item.skuId}
                          onChange={(e) =>
                            handleUpdateInvoiceRow(idx, e.target.value, item.cartonQty, item.packQty)
                          }
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white text-xs cursor-pointer"
                        >
                          {NLINK_OFFICIAL_PRODUCTS.map((sku) => (
                            <option key={sku.id} value={sku.id}>
                              {sku.name} • {sku.wattage} (TP: Rs. {sku.tradePrice})
                            </option>
                          ))}
                        </select>

                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoiceRow(idx)}
                            className="p-2 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">Cartons</span>
                          <input
                            type="number"
                            min="0"
                            value={item.cartonQty}
                            onChange={(e) =>
                              handleUpdateInvoiceRow(
                                idx,
                                item.skuId,
                                Math.max(0, parseInt(e.target.value) || 0),
                                item.packQty
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">Loose Pcs</span>
                          <input
                            type="number"
                            min="0"
                            value={item.packQty}
                            onChange={(e) =>
                              handleUpdateInvoiceRow(
                                idx,
                                item.skuId,
                                item.cartonQty,
                                Math.max(0, parseInt(e.target.value) || 0)
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 font-bold block mb-0.5">Subtotal</span>
                          <span className="text-xs font-black font-mono text-slate-800 dark:text-white pt-1 block">
                            Rs. {item.lineTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Card */}
              {(() => {
                const subtotal = invoiceItems.reduce((sum, it) => sum + it.lineTotal, 0);
                const discountAmt = Math.round((subtotal * invoiceDiscountPercent) / 100);
                const netTotal = subtotal - discountAmt;

                return (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span className="font-mono font-bold">Rs. {subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Trade Discount (%)</span>
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={invoiceDiscountPercent}
                          onChange={(e) =>
                            setInvoiceDiscountPercent(Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-center font-bold text-xs"
                        />
                        <span>%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        Net Invoice Total
                      </span>
                      <span className="text-lg font-black font-mono text-[#006b5f] dark:text-[#76f4e0]">
                        Rs. {netTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={handleSaveMultiItemInvoice}
                className="w-full py-3.5 bg-[#006b5f] hover:bg-[#005249] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#006b5f]/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>ISSUE &amp; POST INVOICE TO KHATA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: DIGITAL INVOICE PREVIEW / PRINT / WHATSAPP SHARE
          ========================================================================= */}
      {inspectedInvoice && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] text-[#76f4e0] font-black uppercase tracking-wider block">
                  NATIONAL LIGHT TAX INVOICE
                </span>
                <h4 className="font-bold text-sm font-mono text-white mt-0.5">
                  {inspectedInvoice.orderNumber.replace('ORD-', 'INV-')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Preview Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                <span className="text-slate-500">Date: <b>{inspectedInvoice.orderDate || inspectedInvoice.createdAt?.split('T')[0]}</b></span>
                <span className="text-emerald-600 font-bold">STATUS: DISPATCHED</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Customer Information
                </span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {inspectedInvoice.customerName}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Code: {inspectedInvoice.customerCode} • Officer: {inspectedInvoice.salesUserName}
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Item Particulars
                </span>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectedInvoice.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block">{it.skuName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {it.orderedQuantity} pcs × Rs. {it.unitPrice}
                        </span>
                      </div>
                      <span className="font-black font-mono text-slate-900 dark:text-white">
                        Rs. {it.lineTotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Total */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
                <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                  Total Bill Amount
                </span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  Rs. {inspectedInvoice.totalAmount.toLocaleString()}
                </span>
              </div>

              {/* Actions: WhatsApp Bill Share & Print */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleShareInvoiceWhatsApp(inspectedInvoice)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: + ADD NEW CUSTOMER TO KHATA
          ========================================================================= */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#76f4e0]" />
                <h3 className="font-bold text-sm">Add New Dealer to Khata</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Dealer / Shop Business Name *
                </label>
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Al-Madina Electric Store"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    placeholder="e.g. Haji Saleem"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    City / Market Beat
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="Peshawar">Peshawar</option>
                    <option value="Mardan">Mardan</option>
                    <option value="Swat">Swat</option>
                    <option value="Charsadda">Charsadda</option>
                    <option value="Nowshera">Nowshera</option>
                    <option value="Kohat">Kohat</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                    <option value="Lahore">Lahore</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Opening Balance (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCustomer}
                className="w-full py-3 bg-[#006b5f] hover:bg-[#005249] text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer mt-2"
              >
                Add Customer to Khata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
