/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Orders Tab
 * Unified Dealer/Distributor-Based Booking, Recovery, Invoices, and Running Ledger Flow
 * Based on SalesPulse design conventions & National Light official rates catalog (PKR)
 */

import React, { useState, useMemo } from 'react';
import { NATIONAL_LIGHT_OFFICIAL_CATALOG, NationalLightItem, NATIONAL_LIGHT_OFFICE_INFO } from '../../data/national-light-rate-card';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NationalLightLogo } from '../NationalLightLogo';

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
}) => {
  // Filter customers based on Selected Attendance Town
  const filteredCustomers = useMemo(() => {
    if (!selectedAttendanceTown) return customers;
    
    const normSelected = selectedAttendanceTown.toLowerCase().trim();
    const filtered = customers.filter((customer) => {
      const custTown = (customer.town || '').toLowerCase();
      const custCity = (customer.city || '').toLowerCase();
      const custTerritory = (customer.territory || '').toLowerCase();
      
      return (
        custTown.includes(normSelected) ||
        normSelected.includes(custTown) ||
        custCity.includes(normSelected) ||
        normSelected.includes(custCity) ||
        custTerritory.includes(normSelected) ||
        normSelected.includes(custTerritory)
      );
    });

    return filtered.length > 0 ? filtered : customers;
  }, [customers, selectedAttendanceTown]);

  // 1. Primary Selected Dealer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialSelectedCustomerId || filteredCustomers[0]?.id || customers[0]?.id || 'CUST-001'
  );

  // Sync selectedCustomerId when town filters change the available list
  React.useEffect(() => {
    if (filteredCustomers.length > 0) {
      const exists = filteredCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) {
        setSelectedCustomerId(filteredCustomers[0].id);
        setOrderCart([]);
      }
    }
  }, [filteredCustomers, selectedCustomerId]);

  // Get active dealer details
  const activeDealer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) ||
      customers[0] || {
        id: 'CUST-001',
        customerCode: 'DL-8839',
        companyName: 'Apex Industrial Supply',
        contactPerson: 'Marcus Vance',
        phone: '+92 300 4123456',
        address: 'Shop #42, North District Commercial Beat',
        city: 'Peshawar',
        creditLimit: 350000,
        currentBalance: 142500,
        status: 'NORMAL',
        isActive: true,
      }
    );
  }, [customers, selectedCustomerId]);

  // Unified Section Tab Pages
  const [activeMode, setActiveMode] = useState<'order' | 'recovery' | 'invoices' | 'ledger'>('order');

  // ================= ORDER BOOKING MODE STATE =================
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderCart, setOrderCart] = useState<CartItem[]>([]);
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [orderRemarks, setOrderRemarks] = useState('');
  const [cartQuantities, setCartQuantities] = useState<Record<string, { cartons: number; packs: number }>>({});

  // Searchable SKU Quick-Select States
  const [skuQuickSearchQuery, setSkuQuickSearchQuery] = useState('');
  const [skuQuickSelectOpen, setSkuQuickSelectOpen] = useState(false);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState<NationalLightItem | null>(null);
  const [quickCartons, setQuickCartons] = useState<string>('');
  const [quickPacks, setQuickPacks] = useState<string>('');

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
  const [ledgerStartDate, setLedgerStartDate] = useState('2026-08-01');
  const [ledgerEndDate, setLedgerEndDate] = useState('2026-09-30');
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<any | null>(null);

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

  // Searchable SKU Quick-Select Dropdown list
  const quickSelectFilteredProducts = useMemo(() => {
    if (!skuQuickSearchQuery.trim()) {
      // If empty but open, show a couple of featured/popular items from the catalog
      return NATIONAL_LIGHT_OFFICIAL_CATALOG.slice(0, 5);
    }
    const q = skuQuickSearchQuery.toLowerCase();
    return NATIONAL_LIGHT_OFFICIAL_CATALOG.filter((item) => {
      return (
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.specification.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [skuQuickSearchQuery]);

  // Order Cart Calculations
  const cartSubtotal = orderCart.reduce((sum, item) => sum + item.product.listPrice * item.quantity, 0);
  const cartDiscount = Math.round(cartSubtotal * 0.05); // 5% commercial discount
  const cartTax = Math.round((cartSubtotal - cartDiscount) * 0.18); // 18% General Sales Tax (GST)
  const cartFreight = orderCart.length > 0 ? 350 : 0; // Flat trade delivery charges
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + cartTax + cartFreight);

  // Credit check status
  const projectedBalance = (activeDealer.currentBalance || 0) + cartTotal;
  const isCreditExceeded = projectedBalance > (activeDealer.creditLimit || 350000);
  const creditProgressPercent = Math.min(
    100,
    Math.round(((activeDealer.currentBalance || 0) / (activeDealer.creditLimit || 350000)) * 100)
  );

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
    if (orderCart.length === 0) {
      triggerToast('Cannot submit empty order cart!');
      return;
    }
    setShowOrderConfirmModal(true);
  };

  const executeOrderSubmit = () => {
    if (orderCart.length === 0) return;

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
      discountAmount: cartDiscount,
      taxAmount: cartTax,
      totalAmount: cartTotal,
      status: 'SUBMITTED',
      creditCheckStatus: isCreditExceeded ? 'RED' : 'GREEN',
      notes: orderRemarks || 'Field Order Booked',
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
    setOrderRemarks('');
    setShowOrderConfirmModal(false);
    triggerLiveSyncNotification();
    setActiveMode('invoices');
  };

  // Recovery Submit
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(recoveryAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('Please enter a valid recovery amount!');
      return;
    }

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
      remarks: recoveryRemarks || (receiptSimulated ? 'Payment slip attachment uploaded.' : 'Standard payment recovery logged.'),
      createdAt: new Date().toISOString(),
    };

    onRecordRecovery(newRecovery);
    setRecoveryAmount('');
    setReferenceNumber('');
    setReceiptSimulated(false);
    setRecoveryRemarks('');
    triggerLiveSyncNotification();
    setActiveMode('ledger');
  };

  // Dealer Invoices List
  const dealerInvoices = useMemo(() => {
    const historicalInvoices = [
      {
        id: 'inv-prev-1',
        invoiceNo: 'INV-2026-1044',
        date: '2026-09-10',
        amount: 85200,
        subtotal: 72000,
        discountAmount: 3600,
        taxAmount: 12312,
        freightAmount: 350,
        itemsCount: 2,
        status: 'Delivered',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
        items: [
          {
            id: 'hi-1-1',
            skuCode: 'NL-BULB-12W-E27',
            skuName: 'NL 12W Premium LED Bulbs (E27)',
            orderedQuantity: 300,
            unitPrice: 210,
            lineTotal: 63000,
          },
          {
            id: 'hi-1-2',
            skuCode: 'NL-SMD-7W-RND',
            skuName: 'NL 7W Concealed SMD Slim',
            orderedQuantity: 40,
            unitPrice: 225,
            lineTotal: 9000,
          }
        ],
      },
      {
        id: 'inv-prev-2',
        invoiceNo: 'INV-2026-0988',
        date: '2026-08-24',
        amount: 142500,
        subtotal: 121000,
        discountAmount: 6050,
        taxAmount: 20691,
        freightAmount: 350,
        itemsCount: 2,
        status: 'Paid',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
        items: [
          {
            id: 'hi-2-1',
            skuCode: 'NL-PAN-24W-RND',
            skuName: 'NL 24W Slim Round SMD Panel Light',
            orderedQuantity: 120,
            unitPrice: 812.5,
            lineTotal: 97500,
          },
          {
            id: 'hi-2-2',
            skuCode: 'NL-T8-4FT-20W',
            skuName: 'NL 4FT 20W Premium LED Tube Light',
            orderedQuantity: 50,
            unitPrice: 470,
            lineTotal: 23500,
          }
        ],
      },
    ];

    const currentBooked = orders
      .filter((o) => o.customerId === selectedCustomerId)
      .map((o) => ({
        id: o.id,
        invoiceNo: o.orderNumber,
        date: o.orderDate,
        amount: o.totalAmount,
        subtotal: o.subtotal,
        discountAmount: o.discountAmount,
        taxAmount: o.taxAmount,
        freightAmount: 350,
        itemsCount: o.items?.length || 0,
        status: o.status === 'APPROVED' ? 'Approved & Dispatched' : 'Awaiting Dispatch',
        badgeColor: o.status === 'APPROVED' ? 'bg-[#76f4e0]/20 text-[#006f63] dark:text-[#76f4e0]' : 'bg-[#1a283e] text-[#818fa9] dark:text-slate-400',
        items: o.items.map(item => ({
          id: item.id,
          skuCode: item.skuCode,
          skuName: item.skuName,
          orderedQuantity: item.orderedQuantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      }));

    return [...currentBooked, ...historicalInvoices];
  }, [orders, selectedCustomerId]);

  // Dynamic Print Type Toggle State
  const [activePrintType, setActivePrintType] = useState<'NONE' | 'SINGLE_INVOICE' | 'STATEMENT' | 'LEDGER'>('NONE');
  
  // Collapsed status for searchable SKU Quick-Select component
  const [skuQuickSelectCollapsed, setSkuQuickSelectCollapsed] = useState(false);

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

  // PDF / Print Exporter
  const handleExportPDF = () => {
    setActivePrintType('STATEMENT');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Quick Add function from searchable SKU dropdown
  const handleQuickAddProduct = () => {
    if (!selectedQuickProduct) return;
    const cartonsVal = Math.max(0, parseInt(quickCartons) || 0);
    const packsVal = Math.max(0, parseInt(quickPacks) || 0);
    const boxSize = selectedQuickProduct.quantityBox || 100;
    const totalPieces = (cartonsVal * boxSize) + packsVal;

    if (totalPieces <= 0) {
      triggerToast('Please enter a valid carton or pack quantity first.');
      return;
    }

    // Add to order cart
    addToCart(selectedQuickProduct, totalPieces);
    
    // Also update cartQuantities to show it in the grid
    setCartQuantities((prev) => ({
      ...prev,
      [selectedQuickProduct.id]: { cartons: cartonsVal, packs: packsVal },
    }));

    // Reset selection states
    setSelectedQuickProduct(null);
    setQuickCartons('');
    setQuickPacks('');
    setSkuQuickSearchQuery('');
    setSkuQuickSelectOpen(false);
    triggerToast(`Successfully added ${totalPieces} pcs of ${selectedQuickProduct.name} to Booking Cart!`);
  };

  // Running Ledger calculations specific to the selected customer
  const ledgerEntries = useMemo(() => {
    const baseEntries = [
      {
        id: 'ledge-0',
        date: '2026-08-15',
        reference: 'OP-BAL-01',
        particulars: 'Opening Outstanding balance forward',
        debit: 142500,
        credit: null,
        balance: 142500,
      },
      {
        id: 'ledge-1',
        date: '2026-08-24',
        reference: 'INV-2026-0988',
        particulars: 'Invoice for 12W LED Bulbs & Panel Lights',
        debit: 142500,
        credit: null,
        balance: 285000,
      },
      {
        id: 'ledge-2',
        date: '2026-08-25',
        reference: 'RC-2026-0988',
        particulars: 'Bank Online Receipt - Meezan bank transfer',
        debit: null,
        credit: 142500,
        balance: 142500,
      },
      {
        id: 'ledge-3',
        date: '2026-09-10',
        reference: 'INV-2026-1044',
        particulars: 'Invoice for 30W T-Bulbs & Floodlights delivery',
        debit: 85200,
        credit: null,
        balance: 227700,
      },
    ];

    // Combine current user booked orders & recorded recoveries dynamically
    let currentBal = 227700;

    const dynamicInvoices = orders
      .filter((o) => o.customerId === selectedCustomerId)
      .map((o) => ({
        id: `dyn-inv-${o.id}`,
        date: o.orderDate,
        reference: o.orderNumber,
        particulars: `Sales Order Booking - Net Trade Total`,
        debit: o.totalAmount,
        credit: null,
        balance: 0,
      }));

    const dynamicCollections = recoveries
      .filter((r) => r.customerId === selectedCustomerId)
      .map((r) => ({
        id: `dyn-rec-${r.id}`,
        date: r.collectionDate,
        reference: r.recoveryNumber,
        particulars: `${r.paymentMode} Collection logged on beat visit`,
        debit: null,
        credit: r.amount,
        balance: 0,
      }));

    // Sort chronologically & recompute balances
    const allEntries = [...baseEntries, ...dynamicInvoices, ...dynamicCollections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let running = 0;
    return allEntries.map((entry) => {
      if (entry.debit) running += entry.debit;
      if (entry.credit) running -= entry.credit;
      return {
        ...entry,
        balance: running,
      };
    }).reverse(); // Latest on top for high-readability
  }, [orders, recoveries, selectedCustomerId]);

  const handleShareStatement = () => {
    const text = `National Light Pakistan • Statement of Accounts\nDealer: ${activeDealer.companyName} (${activeDealer.customerCode})\nCity: ${activeDealer.city}\nOutstanding Ledger Balance: Rs. ${(activeDealer.currentBalance || 0).toLocaleString()}\nCredit Limit: Rs. ${(activeDealer.creditLimit || 350000).toLocaleString()}\n\nContact Head Office Peshawar for reconciliation.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12 animate-fadeIn" id="unified-orders-recovery-flow">
      {/* 1. Header Dealer Selection Component */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-[#006b5f] dark:text-[#76f4e0] uppercase tracking-wider block">
            Select Active Dealer / Distributor
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Live Cloud Connected'}</span>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setOrderCart([]); // Clear cart when switching dealers to prevent cross-dealer booking
            }}
            className="w-full bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 appearance-none"
          >
            {filteredCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} ({c.city || 'KPK'}) — Bal: Rs. {(c.currentBalance || 0).toLocaleString()}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-400 pointer-events-none">
            expand_more
          </span>
        </div>
        {selectedAttendanceTown && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[12px]">filter_list</span>
            Filtered strictly by town of selected attendance: {selectedAttendanceTown}
          </p>
        )}
      </div>

      {/* 2. Top-most Active Dealer Details Profile Card */}
      <div className="bg-[#0f2942] dark:bg-slate-950 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#1a3b5c] relative overflow-hidden flex flex-col gap-4">
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#76f4e0]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 flex-wrap">
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

          <div className="text-right">
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
            <span className={`font-bold ${isCreditExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isCreditExceeded ? '⚠️ Credit Limit Exceeded' : '✓ Credit Limit Safe'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sub-segment Navigation Tabs (Orders / Recovery / Old Invoices / Ledger) */}
      <div className="flex bg-[#eceef0] dark:bg-slate-900 p-1.5 rounded-2xl gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveMode('order')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === 'order'
              ? 'bg-white dark:bg-slate-800 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
          <span>Order Entry</span>
        </button>

        <button
          onClick={() => setActiveMode('recovery')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === 'recovery'
              ? 'bg-white dark:bg-slate-800 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">add_card</span>
          <span>Recovery Entry</span>
        </button>

        <button
          onClick={() => setActiveMode('invoices')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === 'invoices'
              ? 'bg-white dark:bg-slate-800 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span>Old Invoices</span>
        </button>

        <button
          onClick={() => setActiveMode('ledger')}
          className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === 'ledger'
              ? 'bg-white dark:bg-slate-800 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance</span>
          <span>Running Ledger</span>
        </button>
      </div>

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

          {/* Searchable SKU Quick-Select Dropdown Component */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#006b5f] dark:text-[#76f4e0] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">flash_on</span>
                <span>Searchable SKU Quick-Select Dropdown</span>
              </span>
              <button
                type="button"
                onClick={() => setSkuQuickSelectCollapsed(!skuQuickSelectCollapsed)}
                className="w-7 h-7 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500"
              >
                <span className="material-symbols-outlined transition-transform duration-300">
                  {skuQuickSelectCollapsed ? 'expand_more' : 'expand_less'}
                </span>
              </button>
            </div>

            {!skuQuickSelectCollapsed && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-slate-400 font-medium">
                  Type any SKU code, name, or bulb wattage to quickly view its real-time warehouse inventory, trade pricing, and book quantities directly without scrolling the sheet.
                </p>

                {/* Dropdown Search Box */}
                <div className="relative">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
                    <input
                      type="text"
                      value={skuQuickSearchQuery}
                      onChange={(e) => {
                        setSkuQuickSearchQuery(e.target.value);
                        setSkuQuickSelectOpen(true);
                      }}
                      onFocus={() => setSkuQuickSelectOpen(true)}
                      placeholder="Type SKU name/code (e.g., 12W BULB, NL-HW-30W)..."
                      className="bg-transparent w-full outline-none text-xs sm:text-sm text-[#191c1e] dark:text-white placeholder:text-slate-400 font-bold"
                    />
                    {skuQuickSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkuQuickSearchQuery('');
                          setSkuQuickSelectOpen(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results Box */}
                  {skuQuickSelectOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-[280px] overflow-y-auto z-40 divide-y divide-slate-100 dark:divide-slate-900 animate-slideUp">
                      {quickSelectFilteredProducts.map((product) => {
                        // Product avatar gradient depending on categories
                        const avatarGrad = product.categoryGroup === 'LED_BULB' 
                          ? 'from-emerald-400 to-green-600' 
                          : product.categoryGroup === 'HIGH_WATTAGE' 
                          ? 'from-amber-400 to-orange-600' 
                          : 'from-blue-400 to-indigo-600';

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedQuickProduct(product);
                              setSkuQuickSelectOpen(false);
                            }}
                            className="w-full text-left p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-xs font-semibold"
                          >
                            <div className="flex items-center gap-3">
                              {/* Product Image / Avatar Container */}
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center text-white shrink-0 shadow-3xs`}>
                                <span className="material-symbols-outlined text-[18px]">
                                  {product.iconName || 'lightbulb'}
                                </span>
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-800 dark:text-white">{product.name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.sku} • {product.specification}</p>
                              </div>
                            </div>

                            <div className="text-right flex flex-col gap-1 items-end">
                              <span className="font-bold text-[#006b5f] dark:text-[#76f4e0] font-mono">
                                Trade Price: Rs. {product.tradePrice}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                product.stockCount > 1000 
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {product.stockCount.toLocaleString()} In Stock
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {quickSelectFilteredProducts.length === 0 && (
                        <div className="p-4 text-center text-slate-400">
                          No matching SKU found for "{skuQuickSearchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected SKU Form Panel */}
                {selectedQuickProduct && (
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#006b5f] text-[20px]">shopping_basket</span>
                        <div>
                          <h4 className="font-black text-xs text-slate-800 dark:text-white">
                            Selected Product: <span className="text-[#006b5f] dark:text-[#76f4e0]">{selectedQuickProduct.name}</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedQuickProduct.sku} • Box Size: {selectedQuickProduct.quantityBox || 100} pcs</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedQuickProduct(null)}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Quantity parameters inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Quantity Cartons</label>
                        <input
                          type="number"
                          min="0"
                          value={quickCartons}
                          onChange={(e) => setQuickCartons(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Quantity Packs / Pcs</label>
                        <input
                          type="number"
                          min="0"
                          value={quickPacks}
                          onChange={(e) => setQuickPacks(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Real-time Math calculation block */}
                    {(() => {
                      const cVal = Math.max(0, parseInt(quickCartons) || 0);
                      const pVal = Math.max(0, parseInt(quickPacks) || 0);
                      const boxSize = selectedQuickProduct.quantityBox || 100;
                      const totalPieces = (cVal * boxSize) + pVal;
                      const netVal = totalPieces * selectedQuickProduct.listPrice;

                      return (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#76f4e0]/5 p-2.5 rounded-xl border border-[#76f4e0]/10 text-xs font-bold mt-1 text-[#006b5f] dark:text-[#76f4e0]">
                          <div className="flex flex-col gap-0.5">
                            <span>Total Booking Pieces: {totalPieces.toLocaleString()} pcs</span>
                            <span className="text-[10px] text-slate-400">Equivalent: {(totalPieces / boxSize).toFixed(2)} Cartons</span>
                          </div>
                          <span className="text-sm font-black mt-1.5 sm:mt-0 font-mono">
                            Net Value: Rs. {netVal.toLocaleString()}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Add to Order button row */}
                    <button
                      type="button"
                      onClick={handleQuickAddProduct}
                      className="w-full bg-[#006b5f] hover:bg-[#005047] text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                      <span>Add directly to Order Cart &amp; Table</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* B. Tabular Spreadsheet SKU Entry Form */}
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  <th className="p-3.5">SKU Product</th>
                  <th className="p-3.5 w-24 text-center">Qty Ctns</th>
                  <th className="p-3.5 w-24 text-center">QTY Pcks</th>
                  <th className="p-3.5 w-28 text-center">Total Qty Ctns</th>
                  <th className="p-3.5 w-28 text-right">Value (PKR)</th>
                  <th className="p-3.5 w-16 text-center">Action</th>
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

                  const cartItem = orderCart.find((i) => i.product.id === product.id);

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-xs font-semibold"
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
                          className="w-16 text-center bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
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
                          className="w-16 text-center bg-[#f2f4f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
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
                        <button
                          type="button"
                          disabled={totalPieces === 0}
                          onClick={() => {
                            addToCart(product, totalPieces);
                            // Reset inputs for this row
                            setCartQuantities((prev) => ({
                              ...prev,
                              [product.id]: { cartons: 0, packs: 0 },
                            }));
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all ${
                            totalPieces > 0
                              ? 'bg-[#006b5f] hover:bg-[#005047] active:scale-90'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          }`}
                          title="Add items to cart"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
                  <span>Gross Catalog Value</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    Rs. {cartSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Commercial Trade Volume Discount (5%)</span>
                  <span className="font-mono text-emerald-500">-Rs. {cartDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Standard Delivery Cargo &amp; Freight</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">Rs. {cartFreight}</span>
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
                  onClick={handleOrderSubmitClick}
                  className="w-full bg-[#006b5f] hover:bg-[#005047] text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Clear Credit &amp; Book Order</span>
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
            className="w-full bg-[#001428] dark:bg-slate-800 hover:bg-[#002850] dark:hover:bg-slate-700 text-white dark:text-[#76f4e0] py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md mt-1 border border-transparent dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>Record Recovery &amp; Recalculate Balance</span>
          </button>
        </form>
      )}

      {/* =======================================================================
          MODE 3: DEALER INVOICE DIRECTORY (WITH MULTI-SELECT MONTHS & MODAL)
          ======================================================================= */}
      {activeMode === 'invoices' && (
        <div className="flex flex-col gap-3.5 animate-fadeIn" id="invoice-registry-view">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-[#191c1e] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#006b5f]">receipt_long</span>
              <span>Invoice Registry ({dealerInvoices.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Issued to: {activeDealer.companyName}</span>
          </div>

          {/* Multi-Select Month Filter Pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filter Months (Multi-Select)</span>
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
                        let filtered = invoiceSelectedMonths.filter(x => x !== 'All Months');
                        if (filtered.includes(m)) {
                          filtered = filtered.filter(x => x !== m);
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
                <span>Dealer Reconciliation Document Export</span>
              </span>
              <span className="text-[8px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Full Statement Reports
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-teal-600 text-[18px]">csv</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">table_chart</span>
                <span>Excel (XLS)</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#43474d] dark:text-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-blue-600 text-[18px]">article</span>
                <span>Word (DOC)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-white text-[18px]">picture_as_pdf</span>
                <span>Save PDF</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {dealerInvoices
              .filter((inv) => {
                if (invoiceSelectedMonths.includes('All Months')) return true;
                // Match invoice date to selected months: e.g. "2026-09-10" matches "Sep 2026"
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

                  <p className="text-[10px] text-slate-400">Items Booked: {inv.itemsCount} SKUs from National Light Rate list</p>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceModal(inv)}
                      className="bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-slate-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Inspect Mobile</span>
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
                      <span>Share invoice</span>
                    </button>
                  </div>
                </div>
              ))}

            {dealerInvoices.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2">article</span>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">No Invoice Record Exist</h4>
                <p className="text-[10px] text-slate-400">This account has no booked invoice records logged yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          MODE 4: RUNNING DOUBLE-ENTRY LEDGER SHEET WITH DATE RANGE FILTERING
          ======================================================================= */}
      {activeMode === 'ledger' && (
        <div className="flex flex-col gap-3.5 animate-fadeIn" id="ledger-book-view">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-[#191c1e] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#006b5f]">account_balance_wallet</span>
              <span>Account Ledger Book</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActivePrintType('LEDGER');
                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                <span>Print Ledger (PDF)</span>
              </button>
              <button
                type="button"
                onClick={handleShareStatement}
                className="text-[11px] font-bold text-[#006b5f] dark:text-[#76f4e0] hover:underline flex items-center gap-1 bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2.5 py-1.5 rounded-xl"
              >
                <span className="material-symbols-outlined text-[14px]">share</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Date range selection */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">Ledger Date &amp; Month Range</span>
            
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
                        let filtered = ledgerSelectedMonths.filter(x => x !== 'All Months');
                        if (filtered.includes(m)) {
                          filtered = filtered.filter(x => x !== m);
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
            // Divide base entries and dynamic entries
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
                // Accumulate to opening balance
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
                    const modalDiscount = selectedInvoiceModal.discountAmount || Math.round(modalSubtotal * 0.05);
                    const modalTax = selectedInvoiceModal.taxAmount || Math.round((modalSubtotal - modalDiscount) * 0.18);
                    const modalFreight = selectedInvoiceModal.freightAmount || (selectedInvoiceModal.amount ? 0 : 350);
                    const modalTotal = selectedInvoiceModal.amount || (modalSubtotal - modalDiscount + modalTax + modalFreight);

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
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount (5%):</span>
                            <span className="font-mono">-Rs. {modalDiscount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sales Tax (18% GST):</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">Rs. {modalTax.toLocaleString()}</span>
                          </div>
                          {modalFreight > 0 && (
                            <div className="flex justify-between">
                              <span>Delivery Freight Charge:</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">Rs. {modalFreight}</span>
                            </div>
                          )}
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
                  <span>Gross Catalog Subtotal Value</span>
                  <span className="font-mono text-slate-900 dark:text-white">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Volume Trade Discount (5%)</span>
                  <span className="font-mono">-Rs. {cartDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>General Sales Tax (18% GST)</span>
                  <span className="font-mono text-slate-900 dark:text-white">Rs. {cartTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Standard Cargo Freight Delivery</span>
                  <span className="font-mono text-slate-900 dark:text-white">Rs. {cartFreight}</span>
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
                onClick={executeOrderSubmit}
                className="bg-[#006b5f] hover:bg-[#005047] text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Confirm &amp; Book Order</span>
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
            const printDiscount = selectedInvoiceModal.discountAmount || Math.round(printSubtotal * 0.05);
            const printTax = selectedInvoiceModal.taxAmount || Math.round((printSubtotal - printDiscount) * 0.18);
            const printFreight = selectedInvoiceModal.freightAmount || (selectedInvoiceModal.amount ? 0 : 350);
            const printTotal = selectedInvoiceModal.amount || (printSubtotal - printDiscount + printTax + printFreight);

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
                    <div className="flex justify-between text-emerald-600">
                      <span>Volume Trade Discount (5%):</span>
                      <span className="font-mono">-Rs. {printDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">General Sales Tax (18% GST):</span>
                      <span className="font-mono text-slate-950">Rs. {printTax.toLocaleString()}</span>
                    </div>
                    {printFreight > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cargo Freight Delivery:</span>
                        <span className="font-mono text-slate-950">Rs. {printFreight}</span>
                      </div>
                    )}
                    <div className="h-[1px] bg-slate-200 my-1" />
                    <div className="flex justify-between font-black text-sm text-[#006b5f]">
                      <span>NET COMITTED TOTAL:</span>
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
