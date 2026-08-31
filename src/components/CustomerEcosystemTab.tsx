/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer & Partner Ecosystem Master
 * 360° Channel Registry, Auto-Code Generator & Multi-Tier Approvals
 */

import React, { useState } from 'react';
import { Customer, SalesOrder, Invoice, Recovery, CustomerVisit, StockReturn, User } from '../types';
import { generateUniqueCustomerCode, calculateCustomerCreditUtilization } from '../lib/business-rules';
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
  TrendingUp
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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP'>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers?.[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Auto-calculated customer code preview
  const previewCustomerCode = generateUniqueCustomerCode(
    formType,
    customers.map((c) => c.customerCode)
  );

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
  };

  // Filter list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.town || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const currentApproval = (c as any).approvalStatus || 'APPROVED';
    const matchesApproval = approvalFilter === 'ALL' || currentApproval === approvalFilter;

    return matchesSearch && matchesType && matchesApproval;
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 border border-indigo-200">
              <Users className="h-3.5 w-3.5" />
              CUSTOMER ECOSYSTEM MASTER
            </span>
            <span className="text-xs text-slate-400 font-mono">DISTRIBUTOR & DEALER NETWORK</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Channel Partners & Approvals</h1>
          <p className="text-xs text-slate-500 max-w-xl">
            Controlled partner onboarding with unique code generation, dynamic town scoping, and Head Office credit approval workflow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black shadow-lg shadow-indigo-600/20 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Register New Partner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand: Customer Directory with Search & Filters */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code, company, town..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700"
              >
                <option value="ALL">All Partner Types</option>
                <option value="DISTRIBUTOR">Distributors</option>
                <option value="DEALER">Dealers</option>
                <option value="SHOP">Retail Shops</option>
                <option value="CUSTOMER">Corporate Accounts</option>
              </select>

              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved Active</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Building className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-600">No matching partners found</p>
                <p className="text-[11px] text-slate-400">Zero dummy records are populated.</p>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                const status = (cust as any).approvalStatus || 'APPROVED';
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] font-black ${isSelected ? 'text-emerald-400' : 'text-indigo-600'}`}>
                          {cust.customerCode}
                        </span>
                        {status === 'PENDING_APPROVAL' && (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.2 border border-amber-500/30">
                            PENDING
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold truncate text-xs">{cust.companyName}</h4>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {cust.type} · {cust.town || cust.city || 'Punjab'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        PKR {(cust.currentBalance || 0).toLocaleString()}
                      </span>
                      <span className={`text-[9px] block uppercase font-semibold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Balance
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand: 360° Partner Cockpit */}
        <div className="lg:col-span-7 space-y-6">
          {selCustomer ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Partner Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                      {selCustomer.type}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      Tier: {selCustomer.priceTier || 'WHOLESALE'}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">{selCustomer.companyName}</h2>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-indigo-600">{selCustomer.customerCode}</span>
                    <span>•</span>
                    <span>Contact: {selCustomer.contactPerson || 'Proprietor'}</span>
                    <span>•</span>
                    <span className="font-mono">{selCustomer.phone}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
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

                  {/* Head Office Approval Actions */}
                  {approvalStatus === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => onApproveCustomer && onApproveCustomer(selCustomer.id, currentUser?.fullName || 'Head Office Admin')}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black shadow transition active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve Partner
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please enter rejection reason:');
                          if (reason && onRejectCustomer) {
                            onRejectCustomer(selCustomer.id, reason);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

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

              {/* Credit Risk & Utilization Cockpit */}
              <div className="p-5 border rounded-2xl border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-700 font-bold">Credit Limit Utilization</span>
                    <p className="text-[10px] text-slate-400">Current Ledger Balance vs. Authorized Company Credit</p>
                  </div>
                  <span className={`text-xs font-black ${
                    creditAnalysis.isOverLimit ? 'text-rose-600' :
                    creditAnalysis.creditUtilizationPercentage > 85 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {creditAnalysis.creditUtilizationPercentage}% Used {creditAnalysis.isOverLimit ? '(OVER LIMIT)' : ''}
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      creditAnalysis.isOverLimit ? 'bg-rose-600' :
                      creditAnalysis.creditUtilizationPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`} 
                    style={{ width: `${Math.min(100, creditAnalysis.creditUtilizationPercentage)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
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

              {/* Integrated Activities Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sales Orders */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Sales Orders ({selOrders.length})
                  </span>
                  {selOrders.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">No orders recorded.</p>
                  ) : (
                    <div className="space-y-1 max-h-[120px] overflow-y-auto font-mono text-[11px]">
                      {selOrders.map(o => (
                        <div key={o.id} className="flex justify-between items-center border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-800">{o.orderNumber}</span>
                          <span>PKR {o.totalAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    Posted Invoices ({selInvoices.length})
                  </span>
                  {selInvoices.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">No invoices posted.</p>
                  ) : (
                    <div className="space-y-1 max-h-[120px] overflow-y-auto font-mono text-[11px]">
                      {selInvoices.map(i => (
                        <div key={i.id} className="flex justify-between items-center border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-800">{i.invoiceNumber}</span>
                          <span className="font-black text-slate-900">PKR {i.totalAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Last 3 Months Visit Logs (Filtered by Current Dealer's Town) */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">Last 3 Months Visit Logs</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Filtered by Town: <span className="text-emerald-400 font-bold">{currentDealerTown}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] rounded-full border border-emerald-500/30">
                    {townVisitsLast3Months.length} Visits Logged
                  </span>
                </div>

                {townVisitsLast3Months.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-[11px] bg-slate-800/50 rounded-xl border border-slate-800">
                    <MapPin className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                    No field visits logged in {currentDealerTown} over the last 90 days.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {townVisitsLast3Months.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{v.customerName || selCustomer.companyName}</span>
                            <span className="px-2 py-0.2 bg-indigo-500/20 text-indigo-300 text-[9px] font-bold rounded">
                              {v.purposeOfVisit || 'Routine Check'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 flex items-center gap-2">
                            <span>Officer: <strong className="text-emerald-400">{v.salesUserName || 'Field Rep'}</strong></span>
                            <span>•</span>
                            <span className="font-mono">{new Date(v.checkinTime).toLocaleString()}</span>
                          </p>
                          {v.notes && (
                            <p className="text-[10px] text-slate-400 italic">"{v.notes}"</p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-[10px]">
                          {v.orderBooked && v.orderAmount ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded">
                              Order: PKR {v.orderAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded">No Order</span>
                          )}
                          {v.recoveryCollected && v.recoveryAmount ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold rounded">
                              Recov: PKR {v.recoveryAmount.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Building className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">No Customer Selected</h3>
              <p className="text-xs text-slate-500">Select an account from the left list to view ledger details.</p>
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
                  <Building className="w-5 h-5 text-indigo-600" />
                  Register New Channel Partner
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
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Partner Channel Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-indigo-700 bg-indigo-50/50"
                  >
                    <option value="DISTRIBUTOR">DISTRIBUTOR (Main Wholesale)</option>
                    <option value="DEALER">DEALER (Authorized Depot)</option>
                    <option value="SHOP">RETAIL SHOP / SUB-DEALER</option>
                    <option value="CUSTOMER">KEY ACCOUNT / CORPORATE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Auto Generated Customer Code</label>
                  <input
                    type="text"
                    disabled
                    value={previewCustomerCode}
                    className="w-full p-2.5 border border-slate-200 bg-slate-100 rounded-xl font-mono font-black text-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Proprietor / Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Haji Muhammad Tariq"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile / Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+92 300 1234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">CNIC / NTN Number</label>
                  <input
                    type="text"
                    placeholder="35202-XXXXXXX-X"
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Pricing Tier</label>
                  <select
                    value={formPriceTier}
                    onChange={(e) => setFormPriceTier(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="DISTRIBUTOR">Distributor Tier (Highest Discount)</option>
                    <option value="WHOLESALE">Wholesale Tier</option>
                    <option value="STANDARD">Standard Retail Tier</option>
                    <option value="SPECIAL">Special Contracted</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Physical Address</label>
                  <input
                    type="text"
                    placeholder="Shop #, Market, Main Road, City"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Town / Commercial Market *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brandreth Road"
                    value={formTown}
                    onChange={(e) => setFormTown(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Authorized Credit Limit (PKR)</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Payment Days</label>
                  <input
                    type="number"
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-black text-white hover:bg-indigo-700 shadow"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
