/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Ledgers Tab
 * Pixel-perfect implementation based on Stitch Design System
 */

import React, { useState, useMemo, useRef } from 'react';
import { Customer, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { ReceiptCameraCapture } from './ReceiptCameraCapture';

export interface EnterpriseLedgersTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  recoveries: Recovery[];
  onRecordRecovery: (newRecovery: Recovery) => void;
  initialSelectedCustomerId?: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  referenceNo: string;
  particulars: string;
  type: 'INVOICE' | 'COLLECTION' | 'RETURN';
  debit: number | null;
  credit: number | null;
  balance: number;
  receiptUrl?: string;
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
  'JazzCash / Mobilink Microfinance',
  'EasyPaisa / Telenor Bank',
  'SadaPay / NayaPay',
];

export const EnterpriseLedgersTab: React.FC<EnterpriseLedgersTabProps> = ({
  currentUser,
  customers,
  recoveries,
  onRecordRecovery,
  initialSelectedCustomerId,
}) => {
  const collectionFormRef = useRef<HTMLDivElement>(null);

  // Selected Active Dealer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialSelectedCustomerId || customers[0]?.id || 'CUST-001'
  );
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'MONTH' | 'PENDING'>('ALL');

  // Form State
  const [formCustomerId, setFormCustomerId] = useState<string>(
    initialSelectedCustomerId || customers[0]?.id || 'CUST-001'
  );
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'cheque' | 'transfer'>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastText, setToastText] = useState<string>('Collection Recorded! Transaction synced.');
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const activeCustomer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) ||
      customers[0] || {
        id: 'CUST-001',
        customerCode: 'DL-8839',
        companyName: 'Khyber Lights & Hardware Store',
        contactPerson: 'Muhammad Tariq',
        phone: '+92 300 9123456',
        creditLimit: 350000,
        currentBalance: 142500,
        address: 'Shop # 14, Sheikh Yaseen Tower, Peshawar',
        city: 'Peshawar',
        creditDays: 30,
        status: 'NORMAL',
        isActive: true,
        approvalStatus: 'APPROVED',
        accountNumber: 'DL-8839',
        isDistributor: true,
        createdDate: '2023-01-01',
      }
    );
  }, [customers, selectedCustomerId]);

  // Running Ledger Transactions Data
  const ledgerEntries: LedgerEntry[] = useMemo(() => {
    const defaultEntries: LedgerEntry[] = [
      {
        id: '1',
        date: 'Oct 12, 2024',
        referenceNo: '#INV-94021',
        particulars: 'Stock Shipment - LED Bulbs & Tube Batten',
        type: 'INVOICE',
        debit: 45000.0,
        credit: null,
        balance: (activeCustomer.currentBalance || 142500),
      },
      {
        id: '2',
        date: 'Oct 08, 2024',
        referenceNo: '#REC-8821',
        particulars: 'Meezan Bank Online Transfer (Ref: TXN99482)',
        type: 'COLLECTION',
        debit: null,
        credit: 25000.0,
        balance: (activeCustomer.currentBalance || 142500) - 45000 + 25000,
      },
      {
        id: '3',
        date: 'Sep 28, 2024',
        referenceNo: '#INV-93112',
        particulars: 'High Wattage Flood Lights & COB Downlights',
        type: 'INVOICE',
        debit: 77500.0,
        credit: null,
        balance: 117500.0,
      },
      {
        id: '4',
        date: 'Sep 15, 2024',
        referenceNo: '#REC-8501',
        particulars: 'Cash Field Recovery (Receipt #44)',
        type: 'COLLECTION',
        debit: null,
        credit: 30000.0,
        balance: 40000.0,
      },
    ];

    // Append dynamic recoveries for this customer
    const userRecoveries: LedgerEntry[] = recoveries
      .filter((r) => r.customerId === selectedCustomerId)
      .map((r, i) => ({
        id: `rec-${r.id || i}`,
        date: r.collectionDate || 'Today',
        referenceNo: `#${r.recoveryNumber || 'REC-9901'}`,
        particulars: `${r.paymentMode} Collection (${r.instrumentNumber || 'Direct'})${r.bankName ? ` - ${r.bankName}` : ''}`,
        type: 'COLLECTION' as const,
        debit: null,
        credit: r.amount,
        balance: Math.max(0, (activeCustomer.currentBalance || 142500) - r.amount),
        receiptUrl: r.receiptUrl,
      }));

    return [...userRecoveries, ...defaultEntries];
  }, [recoveries, selectedCustomerId, activeCustomer.currentBalance]);

  const scrollToCollectionForm = () => {
    collectionFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShareLedger = () => {
    const text = `National Light Pakistan - Official Dealer Statement\nDealer: ${activeCustomer.companyName} (${activeCustomer.customerCode || 'DL-8839'})\nCity: ${activeCustomer.city || 'Peshawar'}\nCurrent Outstanding Balance: Rs. ${(activeCustomer.currentBalance || 142500).toLocaleString()}\nCredit Limit: Rs. ${(activeCustomer.creditLimit || 350000).toLocaleString()}\nStatus: Active Credit\nHead Office: Office No GF 71, Sheikh Yaseen Tower, Majid Mohabbad Khan Road, Peshawar.\nPh: 091-2212700 | 0303-5262872`;
    if (navigator.share) {
      navigator.share({ title: `Statement - ${activeCustomer.companyName}`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSubmitCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(collectionAmount);
    if (!amt || isNaN(amt)) return;

    const targetCustomer = customers.find((c) => c.id === formCustomerId) || activeCustomer;

    const newRecovery: Recovery = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      recoveryNumber: `RC-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: targetCustomer.id,
      customerName: targetCustomer.companyName,
      customerCode: targetCustomer.customerCode,
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      collectionDate: new Date().toISOString().split('T')[0],
      amount: amt,
      paymentMode: paymentMode === 'cash' ? 'CASH' : paymentMode === 'cheque' ? 'CHEQUE' : 'ONLINE_TRANSFER',
      instrumentNumber: referenceNumber || (paymentMode === 'cheque' ? 'CHQ-883901' : 'UTR-993821'),
      bankName: bankName || (paymentMode !== 'cash' ? 'Meezan Bank Limited' : undefined),
      status: 'VERIFIED',
      remarks: notes || (receiptFileName ? `Receipt attached: ${receiptFileName}` : 'Field collection recorded'),
      receiptUrl: receiptImage || undefined,
      createdAt: new Date().toISOString(),
    };

    onRecordRecovery(newRecovery);
    setCollectionAmount('');
    setReferenceNumber('');
    setReceiptImage(null);
    setReceiptFileName(null);
    setNotes('');
    setToastText(`Payment of Rs. ${amt.toLocaleString()} recorded with proof for ${targetCustomer.companyName}!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-12 animate-fadeIn" id="enterprise-ledgers-view">
      {/* 1. Top Action & Balance Summary */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[11px] font-bold text-[#43474d] uppercase tracking-wider block">
              Total Outstanding Portfolio
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#191c1e] tracking-tight font-mono">
              Rs. 1,428,500
            </h2>
          </div>
          <button
            onClick={scrollToCollectionForm}
            className="flex items-center gap-1.5 bg-[#006b5f] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:bg-[#005047] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>Record Recovery / Collection</span>
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col gap-1">
            <div className="flex items-center justify-between text-[#43474d]">
              <span className="text-xs font-bold">Collected Today</span>
              <span className="material-symbols-outlined text-[18px] text-[#006b5f]">
                trending_up
              </span>
            </div>
            <span className="text-xl font-bold text-[#191c1e] font-mono">Rs. 85,000</span>
            <span className="text-[11px] text-[#43474d]">4 verified recoveries</span>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col gap-1">
            <div className="flex items-center justify-between text-[#43474d]">
              <span className="text-xs font-bold">Overdue / Aging</span>
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">
                warning
              </span>
            </div>
            <span className="text-xl font-bold text-[#191c1e] font-mono">Rs. 240,000</span>
            <span className="text-[11px] text-[#43474d]">3 accounts over 30 days</span>
          </div>
        </div>
      </div>

      {/* 2. Dealer Selector & Ledger Filter Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-[#191c1e] tracking-tight flex items-center gap-2">
            <span>Official Dealer Statement</span>
            <span className="text-xs font-normal text-slate-500 font-mono">({activeCustomer.city || 'Pakistan'})</span>
          </h3>
          <button
            onClick={handleShareLedger}
            className="flex items-center gap-1 text-xs font-bold text-[#006b5f] hover:underline bg-[#76f4e0]/20 px-2.5 py-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>WhatsApp / Share</span>
          </button>
        </div>

        {/* Dealer Dropdown */}
        <div className="relative">
          <label className="text-xs font-bold text-[#43474d] block mb-1 uppercase tracking-wider">
            Select Active Dealer / Distributor
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-[#f2f4f6] text-[#191c1e] px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm font-semibold appearance-none border border-transparent"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} — {c.city || 'KPK'} ({c.customerCode || 'DL-8839'}) • Bal: Rs. {(c.currentBalance || 0).toLocaleString()}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-8 text-[#74777e] pointer-events-none text-[20px]">
            expand_more
          </span>
        </div>

        {/* Date / Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setFilterPeriod('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              filterPeriod === 'ALL'
                ? 'bg-[#76f4e0] text-[#006f63]'
                : 'bg-[#f2f4f6] text-[#43474d] hover:bg-[#eceef0]'
            }`}
          >
            All Ledger Records
          </button>
          <button
            onClick={() => setFilterPeriod('MONTH')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              filterPeriod === 'MONTH'
                ? 'bg-[#76f4e0] text-[#006f63]'
                : 'bg-[#f2f4f6] text-[#43474d] hover:bg-[#eceef0]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilterPeriod('PENDING')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              filterPeriod === 'PENDING'
                ? 'bg-[#76f4e0] text-[#006f63]'
                : 'bg-[#f2f4f6] text-[#43474d] hover:bg-[#eceef0]'
            }`}
          >
            Overdue Invoices
          </button>
        </div>
      </div>

      {/* 3. Running Ledger Statement Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#e0e3e5] overflow-hidden flex flex-col">
        <div className="p-4 flex items-center justify-between bg-[#f2f4f6]/60 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#191c1e]">
              {activeCustomer.companyName}
            </h4>
            <span className="text-[11px] text-[#43474d]">{activeCustomer.address || 'Commercial Market'} • {activeCustomer.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-[11px] font-bold">
              Limit: Rs. {(activeCustomer.creditLimit || 350000).toLocaleString()}
            </span>
            <span className="bg-[#76f4e0] text-[#006f63] px-2.5 py-1 rounded-md text-[11px] font-bold">
              Active Credit
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="bg-[#eceef0] text-[#43474d] text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3">Date / Ref</th>
                <th className="p-3">Particulars / Proof</th>
                <th className="p-3 text-right">Debit (Invoice)</th>
                <th className="p-3 text-right">Credit (Payment)</th>
                <th className="p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0] text-xs">
              {ledgerEntries.map((row) => (
                <tr key={row.id} className="hover:bg-[#f8f9fb] transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-[#191c1e]">{row.date}</div>
                    <div className="text-[10px] text-[#74777e] font-mono">{row.referenceNo}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-[#191c1e] font-medium">{row.particulars}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          row.type === 'INVOICE'
                            ? 'bg-[#eceef0] text-[#43474d]'
                            : 'bg-[#76f4e0]/30 text-[#006f63]'
                        }`}
                      >
                        {row.type === 'INVOICE' ? 'Invoice' : 'Collection'}
                      </span>
                      {row.receiptUrl && (
                        <button
                          onClick={() => setPreviewModalImage(row.receiptUrl!)}
                          className="text-[10px] text-[#006b5f] font-bold flex items-center gap-0.5 hover:underline bg-[#76f4e0]/20 px-1.5 py-0.5 rounded"
                        >
                          <span className="material-symbols-outlined text-[12px]">image</span>
                          <span>View Proof</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold text-[#191c1e] font-mono">
                    {row.debit ? `Rs. ${row.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-bold text-[#006b5f] font-mono">
                    {row.credit ? `Rs. ${row.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-extrabold text-[#191c1e] font-mono">
                    Rs. {row.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 flex items-center justify-between bg-[#f2f4f6]/40 text-xs text-[#43474d] border-t border-slate-100">
          <span>Showing {ledgerEntries.length} transactions</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[#eceef0] rounded-lg hover:bg-slate-200 text-[#191c1e] font-bold">
              Previous
            </button>
            <button className="px-3 py-1 bg-[#eceef0] rounded-lg hover:bg-slate-200 text-[#191c1e] font-bold">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Payment Entry Form (Embedded Container) */}
      <div
        ref={collectionFormRef}
        className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col gap-4"
        id="collectionFormContainer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006b5f] text-[22px]">payments</span>
            <h3 className="text-base sm:text-lg font-bold text-[#191c1e]">
              Field Recovery &amp; Payment Entry
            </h3>
          </div>
          <span className="text-[11px] bg-[#76f4e0] text-[#006f63] px-2 py-0.5 rounded font-bold">
            Real-time Pakistan Sync
          </span>
        </div>

        <form onSubmit={handleSubmitCollection} className="flex flex-col gap-4">
          {/* Dealer Selector */}
          <div>
            <label className="text-xs font-bold text-[#43474d] block mb-1 uppercase tracking-wider">
              Select Dealer / Customer
            </label>
            <select
              value={formCustomerId}
              onChange={(e) => setFormCustomerId(e.target.value)}
              className="w-full bg-[#f2f4f6] text-[#191c1e] px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm font-medium"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} — {c.city || 'Peshawar'} ({c.customerCode || 'DL-8839'})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-[#43474d] block mb-1 uppercase tracking-wider">
              Recovery Amount (PKR / Rs.)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-[#43474d] font-bold text-sm">Rs.</span>
              <input
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(e.target.value)}
                className="w-full bg-[#f2f4f6] text-[#191c1e] pl-12 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-sm font-bold font-mono"
                placeholder="e.g. 50000"
                required
                type="number"
              />
            </div>
          </div>

          {/* Payment Mode Selector Cards */}
          <div>
            <label className="text-xs font-bold text-[#43474d] block mb-1 uppercase tracking-wider">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                  paymentMode === 'cash'
                    ? 'border-[#006b5f] bg-[#76f4e0]/20'
                    : 'border-transparent bg-[#f2f4f6] hover:bg-[#eceef0]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] mb-1 text-[#191c1e]">
                  payments
                </span>
                <span className="text-xs font-bold text-[#191c1e]">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('cheque')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                  paymentMode === 'cheque'
                    ? 'border-[#006b5f] bg-[#76f4e0]/20'
                    : 'border-transparent bg-[#f2f4f6] hover:bg-[#eceef0]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] mb-1 text-[#191c1e]">
                  receipt_long
                </span>
                <span className="text-xs font-bold text-[#191c1e]">Cheque</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('transfer')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                  paymentMode === 'transfer'
                    ? 'border-[#006b5f] bg-[#76f4e0]/20'
                    : 'border-transparent bg-[#f2f4f6] hover:bg-[#eceef0]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] mb-1 text-[#191c1e]">
                  account_balance
                </span>
                <span className="text-xs font-bold text-[#191c1e]">Online Bank</span>
              </button>
            </div>
          </div>

          {/* Conditional Reference Field & Bank Selector */}
          {paymentMode !== 'cash' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#43474d] block mb-1">
                  {paymentMode === 'cheque' ? 'Cheque Number' : 'Transaction Reference / UTR'}
                </label>
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-[#f2f4f6] text-[#191c1e] px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm font-medium"
                  placeholder={paymentMode === 'cheque' ? 'e.g. CHQ-882910' : 'e.g. TXN-994821'}
                  type="text"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#43474d] block mb-1">
                  Pakistan Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#f2f4f6] text-[#191c1e] px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm font-medium"
                >
                  <option value="">Select Bank / Wallet...</option>
                  {PAKISTAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Receipt Proof & Camera Section */}
          <div>
            <label className="text-xs font-bold text-[#43474d] block mb-1.5 uppercase tracking-wider">
              Upload Receipt / Proof or Open Camera for Direct Pic
            </label>
            <ReceiptCameraCapture
              receiptImage={receiptImage}
              receiptFileName={receiptFileName}
              onCapture={(dataUrl, name) => {
                setReceiptImage(dataUrl);
                setReceiptFileName(name);
              }}
              onClear={() => {
                setReceiptImage(null);
                setReceiptFileName(null);
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-[#43474d] block mb-1 uppercase tracking-wider">
              Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#f2f4f6] text-[#191c1e] p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[#006b5f] transition-all text-xs sm:text-sm resize-none font-medium"
              placeholder="e.g. Cheque handed over to DSF, clearing in 2 days..."
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#006b5f] text-white py-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-[#005047] transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Submit &amp; Sync Recovery</span>
          </button>
        </form>
      </div>

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-24 inset-x-4 z-50 flex justify-center animate-slideUp">
          <div className="bg-[#001428] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between border border-emerald-500/30 max-w-md w-full">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#76f4e0] text-[22px]">
                task_alt
              </span>
              <div>
                <h5 className="text-xs sm:text-sm font-bold">Recovery Synced!</h5>
                <p className="text-[11px] text-slate-300">{toastText}</p>
              </div>
            </div>
            <button onClick={() => setShowToast(false)} className="text-slate-400 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Proof Preview Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
            <div className="p-4 bg-[#001428] text-white flex items-center justify-between border-b border-slate-700">
              <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#76f4e0]">receipt</span>
                Verified Receipt Proof
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black max-h-[75vh] overflow-auto">
              <img
                src={previewModalImage}
                alt="Full receipt proof"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-[#001428] border-t border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
