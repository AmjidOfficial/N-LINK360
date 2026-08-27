import React, { useState } from 'react';
import { Customer, SalesOrder, Invoice, Recovery, CustomerVisit, StockReturn } from '../types';
import { 
  Users, 
  Search, 
  MapPin, 
  DollarSign, 
  FileText, 
  Receipt, 
  Truck, 
  RotateCcw, 
  TrendingUp, 
  ShieldAlert,
  Sliders,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowUpRight,
  Eye,
  Plus
} from 'lucide-react';

interface CustomerEcosystemTabProps {
  customers?: Customer[];
  salesOrders?: SalesOrder[];
  invoices?: Invoice[];
  recoveries?: Recovery[];
  visits?: CustomerVisit[];
  returns?: StockReturn[];
  onAddCustomer?: (newCustomer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
}

export const CustomerEcosystemTab: React.FC<CustomerEcosystemTabProps> = ({
  customers = [],
  salesOrders = [],
  invoices = [],
  recoveries = [],
  visits = [],
  returns = [],
  onAddCustomer,
  onUpdateCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP'>('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers?.[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for creating a customer
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP'>('SHOP');
  const [formRegion, setFormRegion] = useState('Punjab North');
  const [formZone, setFormZone] = useState('Central Zone');
  const [formArea, setFormArea] = useState('Lahore Division');
  const [formTerritory, setFormTerritory] = useState('Brandreth Road');
  const [formTown, setFormTown] = useState('Anarkali');
  const [formRoute, setFormRoute] = useState('Route A (Morning)');
  const [formEmployee, setFormEmployee] = useState('Suhail Ahmed (OB)');
  const [formCreditLimit, setFormCreditLimit] = useState(500000);
  const [formOpeningBalance, setFormOpeningBalance] = useState(100000);

  // Extract unique regions for filters
  const uniqueRegions = Array.from(new Set(customers.map(c => c.region || 'Punjab North')));

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) {
      alert('Company/Shop Name and Customer Code are required.');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: formCode.toUpperCase().trim(),
      companyName: formName.trim(),
      contactPerson: formContact.trim(),
      phone: formPhone,
      email: `${formCode.toLowerCase()}@nlink360.pk`,
      type: formType,
      address: formAddress,
      city: formTown,
      region: formRegion,
      creditLimit: formCreditLimit,
      creditDays: 30,
      openingBalance: formOpeningBalance,
      currentBalance: formOpeningBalance,
      isCreditLocked: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Hierarchy linkages:
      zone: formZone,
      area: formArea,
      territory: formTerritory,
      town: formTown,
      route: formRoute,
      assignedEmployee: formEmployee,
      status: 'ACTIVE'
    } as any; // Cast safely

    if (onAddCustomer) {
      onAddCustomer(newCustomer);
    } else {
      // Fallback local append
      customers.push(newCustomer);
      alert(`Customer ${newCustomer.companyName} created successfully in local session!`);
    }

    setSelectedCustomerId(newCustomer.id);
    setShowAddModal(false);
  };

  // Filter list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchesRegion = regionFilter === 'ALL' || c.region === regionFilter;

    return matchesSearch && matchesType && matchesRegion;
  });

  // Selected Customer aggregate details
  const selCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Linkages
  const selOrders = salesOrders.filter(o => o.customerId === selCustomer?.id);
  const selInvoices = invoices.filter(i => i.customerId === selCustomer?.id);
  const selRecoveries = recoveries.filter(r => r.customerId === selCustomer?.id);
  const selVisits = visits.filter(v => v.customerId === selCustomer?.id);
  const selReturns = returns.filter(r => r.customerId === selCustomer?.id);

  // Financial status calculations
  const totalSalesVal = selInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalRecoveryVal = selRecoveries.filter(r => r.status === 'VERIFIED').reduce((sum, r) => sum + r.amount, 0);
  const currentOutstanding = selCustomer?.currentBalance || 0;
  const creditLimit = selCustomer?.creditLimit || 0;
  const creditUsagePercent = creditLimit > 0 ? (currentOutstanding / creditLimit) * 100 : 0;

  // Credit gauge color
  let creditColor = 'bg-secondary';
  let creditTextColor = 'text-emerald-700 font-bold';
  let creditBadgeColor = 'bg-emerald-100 text-emerald-800';

  if (creditUsagePercent >= 90) {
    creditColor = 'bg-rose-600';
    creditTextColor = 'text-rose-700 font-black';
    creditBadgeColor = 'bg-rose-100 text-rose-800 animate-pulse';
  } else if (creditUsagePercent >= 70) {
    creditColor = 'bg-secondary';
    creditTextColor = 'text-amber-700 font-bold';
    creditBadgeColor = 'bg-amber-100 text-amber-800';
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-black text-text-primary flex items-center gap-1.5">
            <Users className="w-5 h-5 text-indigo-600" />
            360° Customer Ecosystem & Relationship Center
          </h2>
          <p className="text-xs text-slate-500">Unifying accounts, physical routes, sales, recoveries, and GPS checks into one operational database.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Register New Account
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Customers Master List with search & filters */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search business accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-secondary border rounded-lg focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="p-1.5 border rounded-lg text-xs bg-bg-secondary font-medium"
              >
                <option value="ALL">All Types</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="DEALER">Dealer</option>
                <option value="CUSTOMER">Customer</option>
                <option value="SHOP">Retail Shop</option>
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="p-1.5 border rounded-lg text-xs bg-bg-secondary font-medium"
              >
                <option value="ALL">All Regions</option>
                {uniqueRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No matching accounts found.</p>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected 
                        ? 'bg-surface-card border-slate-900 text-white shadow-sm' 
                        : 'bg-bg-secondary border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-deep-teal' : 'text-indigo-600'}`}>
                        {cust.customerCode}
                      </span>
                      <h4 className={`font-bold mt-0.5 truncate max-w-[200px] ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                        {cust.companyName}
                      </h4>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        Type: <span className="font-semibold">{cust.type}</span> · {cust.city || 'Punjab'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold block ${isSelected ? 'text-white' : 'text-deep-green'}`}>
                        PKR {cust.currentBalance.toLocaleString()}
                      </span>
                      <span className={`text-[9px] block uppercase font-bold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Outstanding
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand: Selected Customer 360° Relationship Cockpit */}
        <div className="lg:col-span-7 space-y-6">
          {selCustomer ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-4">
                <div>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded">
                    {selCustomer.type} PROFILE
                  </span>
                  <h3 className="font-extrabold text-lg text-text-primary mt-1.5">{selCustomer.companyName}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1 items-center">
                    <span className="font-semibold text-slate-700">Code: {selCustomer.customerCode}</span>
                    <span>•</span>
                    <span>Contact: {selCustomer.contactPerson || 'N/A'}</span>
                    <span>•</span>
                    <span className="text-slate-600 font-semibold">{selCustomer.phone}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${creditBadgeColor}`}>
                    Credit Status: {selCustomer.isCreditLocked ? 'POLICY LOCKED' : 'HEALTHY'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-1">Assigned OB: {selCustomer.assignedEmployee || 'Unassigned'}</span>
                </div>
              </div>

              {/* Sales Hierarchy & Coverage Info */}
              <div className="p-4 bg-bg-secondary rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Region/Zone</span>
                  <span className="font-bold text-slate-800">{selCustomer.region || 'Punjab North'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{selCustomer.zone || 'Central'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Area / Territory</span>
                  <span className="font-bold text-slate-800">{selCustomer.area || 'Lahore'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{selCustomer.territory || 'Brandreth'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Town / City</span>
                  <span className="font-bold text-slate-800">{selCustomer.city || 'Anarkali'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Route Assigned</span>
                  <span className="font-bold text-slate-800 text-[11px]">{selCustomer.route || 'Route A (Morning)'}</span>
                </div>
              </div>

              {/* Credit Risk and outstanding Gauge */}
              <div className="p-5 border rounded-xl border-slate-200 space-y-3 shadow-inner bg-bg-secondary/20">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold">Credit Utilization Profile</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Compares current ledger balance to authorized company limit.</p>
                  </div>
                  <span className={`text-sm ${creditTextColor}`}>
                    {creditUsagePercent.toFixed(1)}% Used
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${creditColor} transition-all`} 
                    style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Authorized Credit Limit</span>
                    <span className="font-mono font-bold text-text-primary">PKR {creditLimit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Current Active Outstanding</span>
                    <span className="font-mono font-bold text-text-primary">PKR {currentOutstanding.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Remaining credit headroom</span>
                    <span className="font-mono font-bold text-slate-700">PKR {Math.max(0, creditLimit - currentOutstanding).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Sub-Ledger Modules / Deep Linkages Tabs */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">360° Integrated Account Activities</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Sales Orders & Pipeline */}
                  <div className="p-4 bg-bg-secondary rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1 mb-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      Sales Order Pipeline ({selOrders.length})
                    </span>
                    {selOrders.length === 0 ? (
                      <p className="text-slate-400 text-[11px] italic">No active or historic sales orders logged.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto font-mono">
                        {selOrders.map(o => (
                          <div key={o.id} className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
                            <span>{o.orderNumber}</span>
                            <span className="font-bold">PKR {o.totalAmount.toLocaleString()}</span>
                            <span className={`px-1 rounded text-[9px] ${o.status === 'INVOICED' ? 'bg-slate-200' : 'bg-amber-100 text-amber-800'}`}>
                              {o.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* posted Invoices */}
                  <div className="p-4 bg-bg-secondary rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1 mb-2">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      Posted Invoices & Debits ({selInvoices.length})
                    </span>
                    {selInvoices.length === 0 ? (
                      <p className="text-slate-400 text-[11px] italic">No posted invoices available.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto font-mono">
                        {selInvoices.map(i => (
                          <div key={i.id} className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
                            <span className="font-bold">{i.invoiceNumber}</span>
                            <span>{i.invoiceDate}</span>
                            <span className="font-extrabold text-deep-green">PKR {i.totalAmount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recoveries / Receipts */}
                  <div className="p-4 bg-bg-secondary rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1 mb-2">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                      Recoveries & Credits ({selRecoveries.length})
                    </span>
                    {selRecoveries.length === 0 ? (
                      <p className="text-slate-400 text-[11px] italic">No payment recovery transactions logged.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto font-mono">
                        {selRecoveries.map(r => (
                          <div key={r.id} className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
                            <span>{r.recoveryNumber}</span>
                            <span className="font-bold text-deep-teal">PKR {r.amount.toLocaleString()}</span>
                            <span className={`px-1 rounded text-[9px] ${r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Field officer Visits */}
                  <div className="p-4 bg-bg-secondary rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      GPS Field Officer Visits ({selVisits.length})
                    </span>
                    {selVisits.length === 0 ? (
                      <p className="text-slate-400 text-[11px] italic">No field representative GPS logs found.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto font-sans">
                        {selVisits.map(v => (
                          <div key={v.id} className="text-[10px] border-b border-slate-100 pb-1">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-700">{v.salesUserName}</span>
                              <span className="font-mono text-[9px] text-slate-400">{v.checkInTime.split('T')[0]}</span>
                            </div>
                            <p className="text-slate-500 text-[9px] truncate">Notes: {v.purpose || 'Routine route call'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <p className="text-slate-400 text-xs text-center">Select an account from the master registry to view details.</p>
          )}
        </div>

      </div>

      {/* Account Registration Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-surface-card/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in duration-150">
            <div className="bg-primary text-deep-green hover:bg-primary/90 px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Users className="w-5 h-5 text-deep-teal" /> Register New Channel Partner
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                
                <div className="col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">Company / Shop Registered Name*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Hamd Electric House"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Customer Code (Unique Identifier)*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CUST-RET-054"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Ecosystem Channel Account Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-1.5 border rounded-lg focus:outline-none font-semibold text-indigo-700 bg-indigo-50"
                  >
                    <option value="DISTRIBUTOR">DISTRIBUTOR (Bulk Dealer)</option>
                    <option value="DEALER">DEALER (Authorized Depot)</option>
                    <option value="CUSTOMER">KEY ACCOUNT / CUSTOMER</option>
                    <option value="SHOP">RETAIL SHOP / SUB-DEALER</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Jamil"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Mobile / Phone*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +92 300 1234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">Physical Postal Address*</label>
                  <input
                    type="text"
                    required
                    placeholder="Shop #, Market Name, Road, City"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none"
                  />
                </div>

                <div className="border-t pt-3 col-span-2 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                  Corporate Sales Hierarchy Assignments
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Assigned Region</label>
                  <select value={formRegion} onChange={(e) => setFormRegion(e.target.value)} className="w-full p-1.5 border rounded-lg">
                    <option value="Punjab North">Punjab North</option>
                    <option value="Punjab South">Punjab South</option>
                    <option value="Sindh Central">Sindh Central</option>
                    <option value="KP West">KP West</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Assigned Route</label>
                  <select value={formRoute} onChange={(e) => setFormRoute(e.target.value)} className="w-full p-1.5 border rounded-lg font-mono">
                    <option value="Route A (Morning)">Route A (Morning)</option>
                    <option value="Route B (Evening)">Route B (Evening)</option>
                    <option value="Express Highway Route">Express Highway Route</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Authorized Credit Limit (PKR)</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Opening Outstanding Balance (PKR)</label>
                  <input
                    type="number"
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

              </div>

              <div className="pt-4 flex gap-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold rounded-lg shadow">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
