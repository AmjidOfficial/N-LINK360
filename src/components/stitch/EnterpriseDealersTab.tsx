/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Dealers Tab
 * Pixel-perfect implementation based on Stitch Design System
 * Pakistan Comprehensive Regional & City Dealer Directory
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
import { CreditHealthIndicator } from '../CreditHealthIndicator';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import {
  PAKISTAN_REGIONS,
  getCitiesByRegionId,
} from '../../data/pakistan-geography';

export interface EnterpriseDealersTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders?: SalesOrder[];
  onAddDealer: (newDealer: Partial<Customer>) => void;
  onEditDealer?: (updatedDealer: Customer) => void;
  onDeleteDealer?: (customerId: string) => void;
  onApproveDealer: (customerId: string) => void;
  onSelectDealerForLedger: (customerId: string) => void;
  onSelectDealerForOrder: (customerId: string) => void;
  onUpdateDealerAssignment?: (customerId: string, salesUserId: string, salesUserName: string) => void;
}

export const EnterpriseDealersTab: React.FC<EnterpriseDealersTabProps> = ({
  currentUser,
  customers,
  orders = [],
  onAddDealer,
  onEditDealer,
  onDeleteDealer,
  onApproveDealer,
  onSelectDealerForLedger,
  onSelectDealerForOrder,
  onUpdateDealerAssignment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'pending' | 'overdue'>('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reassigningDealer, setReassigningDealer] = useState<Customer | null>(null);
  const [profileDealer, setProfileDealer] = useState<Customer | null>(null);
  const [editingDealer, setEditingDealer] = useState<Customer | null>(null);
  const [dealerToDelete, setDealerToDelete] = useState<Customer | null>(null);
  const [selectedNewOfficerId, setSelectedNewOfficerId] = useState<string>('');

  const isExecutive =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGEMENT' ||
    currentUser.email === 'syedzain@nationallights.com' ||
    currentUser.email === 'shahzadullah@nationallights.com';

  const fieldOfficers = useMemo(() => {
    return NLINK_TEAM_ROSTER.filter(
      (u) => u.role !== 'SUPER_ADMIN' && u.role !== 'MANAGEMENT'
    );
  }, []);

  // Add Modal Form Fields
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('KPK');
  const [selectedCity, setSelectedCity] = useState('Peshawar');
  const [assignedBeat, setAssignedBeat] = useState('Sheikh Yaseen Tower Beat');
  const [assignedOfficerId, setAssignedOfficerId] = useState<string>(
    isExecutive && fieldOfficers.length > 0 ? fieldOfficers[0].id : currentUser.id
  );
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('250000');
  const [priceTier, setPriceTier] = useState('WHOLESALE');

  // Edit Modal Form Fields
  const [editContactName, setEditContactName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editTerritory, setEditTerritory] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('250000');
  const [editPriceTier, setEditPriceTier] = useState('WHOLESALE');

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Dynamic Cities for chosen Region in form
  const availableCities = useMemo(() => {
    return getCitiesByRegionId(selectedRegion);
  }, [selectedRegion]);

  // Dynamic Beats for chosen City in form
  const availableBeats = useMemo(() => {
    const cityObj = availableCities.find((c) => c.name === selectedCity || c.id === selectedCity);
    return cityObj?.majorBeats || ['Main Wholesale Bazar', 'Circular Road Market', 'City Center Beat'];
  }, [availableCities, selectedCity]);

  // Filtering with Strict User Permission Scope
  const filteredDealers = useMemo(() => {
    return customers.filter((d) => {
      // 1. Strict Territory & Assignment Isolation for Field Users
      if (!isExecutive) {
        const assignedTowns = currentUser.assignedTowns || [];
        const isAssignedToMe =
          (d.salesUserId && d.salesUserId === currentUser.id) ||
          (d.assignedOfficerId && d.assignedOfficerId === currentUser.id);

        const matchesMyTown = assignedTowns.some((t) => {
          const tLow = t.toLowerCase();
          return (
            (d.city && d.city.toLowerCase().includes(tLow)) ||
            (d.town && d.town.toLowerCase().includes(tLow)) ||
            (d.territory && d.territory.toLowerCase().includes(tLow))
          );
        });

        if (!isAssignedToMe && !matchesMyTown) {
          return false;
        }
      }

      // 2. Search Query Match
      const matchesSearch =
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.territory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.salesUserName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.phone || '').includes(searchQuery);

      if (!matchesSearch) return false;

      // 3. Region Filter
      if (selectedRegionFilter !== 'ALL') {
        const regionObj = PAKISTAN_REGIONS.find((r) => r.id === selectedRegionFilter);
        const cityNames = regionObj?.cities.map((c) => c.name.toLowerCase()) || [];
        const dealerCity = (d.city || '').toLowerCase();
        const matchesRegion =
          (d.territory || '').toLowerCase().includes(selectedRegionFilter.toLowerCase()) ||
          cityNames.some((cn) => dealerCity.includes(cn) || cn.includes(dealerCity));
        if (!matchesRegion) return false;
      }

      if (filterType === 'active') return d.approvalStatus === 'APPROVED' || d.isActive;
      if (filterType === 'pending') return d.approvalStatus === 'PENDING' || d.status === 'PENDING_APPROVAL';
      if (filterType === 'overdue') return (d.currentBalance || 0) > (d.creditLimit || 1) * 0.7;
      return true;
    });
  }, [customers, searchQuery, filterType, selectedRegionFilter, isExecutive, currentUser]);

  // Counts
  const activeCount = customers.filter((c) => c.approvalStatus === 'APPROVED' || c.isActive).length;
  const pendingCount = customers.filter((c) => c.approvalStatus === 'PENDING' || c.status === 'PENDING_APPROVAL').length;
  const highBalanceCount = customers.filter((c) => (c.currentBalance || 0) > (c.creditLimit || 1) * 0.7).length;

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const totalLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const utilizationRate = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 42;

  // Last 5 Recent Orders for the selected Customer Profile
  const profileDealerRecentOrders = useMemo(() => {
    if (!profileDealer || !orders) return [];
    return orders
      .filter((o) => o.customerId === profileDealer.id)
      .sort((a, b) => new Date(b.orderDate || b.createdAt || '').getTime() - new Date(a.orderDate || a.createdAt || '').getTime())
      .slice(0, 5);
  }, [profileDealer, orders]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName) return;

    const regionName = PAKISTAN_REGIONS.find((r) => r.id === selectedRegion)?.name || 'Khyber Pakhtunkhwa';
    const targetOfficer = fieldOfficers.find((o) => o.id === assignedOfficerId) || currentUser;

    const newDealer: Partial<Customer> = {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      customerCode: `DL-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName,
      contactPerson: contactName,
      phone: phoneNumber || '+92 300 0000000',
      address: address || `${assignedBeat}, ${selectedCity}`,
      territory: `${regionName} • ${assignedBeat}`,
      city: selectedCity,
      town: selectedCity,
      creditLimit: parseFloat(creditLimit) || 250000,
      currentBalance: 0,
      status: isExecutive ? 'NORMAL' : 'PENDING_APPROVAL',
      isActive: isExecutive,
      approvalStatus: isExecutive ? 'APPROVED' : 'PENDING_APPROVAL',
      priceTier: priceTier as any,
      salesUserId: isExecutive ? targetOfficer.id : currentUser.id,
      salesUserName: isExecutive ? targetOfficer.fullName : currentUser.fullName,
      assignedOfficerId: isExecutive ? targetOfficer.id : currentUser.id,
      assignedOfficerName: isExecutive ? targetOfficer.fullName : currentUser.fullName,
    };

    onAddDealer(newDealer);
    setIsAddModalOpen(false);
    setCompanyName('');
    setContactName('');
    setPhoneNumber('');
    setAddress('');
    triggerToast(
      isExecutive
        ? `Dealer ${companyName} registered and assigned to ${targetOfficer.fullName}!`
        : `Dealer ${companyName} submitted for administrative approval!`
    );
  };

  const handleExecuteReassign = () => {
    if (!reassigningDealer || !selectedNewOfficerId) return;
    const targetOfficer = NLINK_TEAM_ROSTER.find((u) => u.id === selectedNewOfficerId);
    if (!targetOfficer) return;

    if (onUpdateDealerAssignment) {
      onUpdateDealerAssignment(reassigningDealer.id, targetOfficer.id, targetOfficer.fullName);
    }
    triggerToast(`Dealer ${reassigningDealer.companyName} reassigned to ${targetOfficer.fullName} (${targetOfficer.roleTitle})`);
    setReassigningDealer(null);
  };

  const handleOpenEditModal = (dealer: Customer) => {
    setEditingDealer(dealer);
    setEditContactName(dealer.contactPerson || '');
    setEditCompanyName(dealer.companyName || '');
    setEditPhone(dealer.phone || '');
    setEditAddress(dealer.address || '');
    setEditCity(dealer.city || dealer.town || 'Peshawar');
    setEditTerritory(dealer.territory || 'Main Wholesale Market');
    setEditCreditLimit((dealer.creditLimit || 250000).toString());
    setEditPriceTier((dealer.priceTier as string) || 'WHOLESALE');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDealer) return;

    const updated: Customer = {
      ...editingDealer,
      contactPerson: editContactName,
      companyName: editCompanyName,
      phone: editPhone,
      address: editAddress,
      city: editCity,
      town: editCity,
      territory: editTerritory,
      creditLimit: parseFloat(editCreditLimit) || 250000,
      priceTier: editPriceTier as any,
      updatedAt: new Date().toISOString(),
    };

    if (onEditDealer) {
      onEditDealer(updated);
    }
    setEditingDealer(null);
    triggerToast(`Dealer ${updated.companyName} details updated successfully!`);
  };

  const handleConfirmDelete = () => {
    if (!dealerToDelete) return;
    if (!isExecutive) {
      triggerToast('Permission Denied: Only Admins can delete dealers.');
      setDealerToDelete(null);
      return;
    }
    if (onDeleteDealer) {
      onDeleteDealer(dealerToDelete.id);
    }
    triggerToast(`Dealer ${dealerToDelete.companyName} removed from roster.`);
    setDealerToDelete(null);
  };

  const handleDownloadProfilePdfStatement = async (dealer: Customer) => {
    try {
      triggerToast(`Generating official PDF statement for ${dealer.companyName}...`);
      const dealerOrders = orders.filter((o) => o.customerId === dealer.id);

      const entries = dealerOrders.map((o) => ({
        id: o.id,
        date: o.orderDate || o.createdAt?.split('T')[0] || '2026-01-01',
        reference: o.orderNumber,
        particulars: `Sales Order Booking (${o.items?.length || 0} products)`,
        debit: o.totalAmount,
        credit: null,
        balance: o.totalAmount,
      }));

      const opBal = dealer.openingBalance || 0;
      const totalDebits = entries.reduce((s, e) => s + (e.debit || 0), 0);
      const closingBal = dealer.currentBalance || (opBal + totalDebits);

      const result = await downloadCustomerLedgerPdf({
        customer: dealer,
        entries,
        openingBalance: opBal,
        totalDebits,
        totalCredits: 0,
        closingBalance: closingBal,
        preparedByName: `${currentUser.fullName || currentUser.name} (${currentUser.roleTitle || currentUser.role})`,
      });

      if (result.success) {
        triggerToast(`Statement downloaded: ${result.filename}`);
      }
    } catch (err) {
      console.error('Customer PDF Generation Error:', err);
      triggerToast('Unable to export statement at this moment.');
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 animate-fadeIn" id="enterprise-dealers-view">
      {/* 1. Top Stats Summary (2 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Distributor Network</span>
            <span className="material-symbols-outlined text-[#006b5f] dark:text-[#76f4e0] text-[20px]">
              storefront
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{customers.length || 48}</span>
            <span className="text-xs text-[#006b5f] dark:text-[#76f4e0] font-bold">Verified Parties Nationwide</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Portfolio Receivables</span>
            <span className="material-symbols-outlined text-rose-500 text-[20px]">
              account_balance_wallet
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              Rs. {(totalOutstanding > 0 ? (totalOutstanding / 100000).toFixed(1) : '14.2')} Lacs
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">({utilizationRate}% limit used)</span>
          </div>
        </div>
      </div>

      {/* 2. Pakistan Region Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3.5 no-scrollbar">
        <button
          onClick={() => setSelectedRegionFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedRegionFilter === 'ALL'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Pakistan
        </button>
        {PAKISTAN_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRegionFilter(r.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedRegionFilter === r.id
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {r.name} ({r.shortCode})
          </button>
        ))}
      </div>

      {/* 3. Search Bar with Top Register CTA */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006b5f] transition-all shadow-2xs border border-slate-200/90 dark:border-slate-800 font-medium"
            id="dealer-search"
            placeholder="Search by shop name, owner, city (Peshawar, Lahore, Karachi...), phone..."
            type="text"
          />
        </div>

        <button
          type="button"
          id="top-register-dealer-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#006b5f] hover:bg-[#005047] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Register a new Dealer or Distributor"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Register Dealer</span>
        </button>
      </div>

      {/* 4. Status Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-[#001428] dark:bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All Status ({filteredDealers.length})
        </button>
        <button
          onClick={() => setFilterType('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filterType === 'active'
              ? 'bg-[#001428] dark:bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Active Verified ({activeCount})
        </button>
        <button
          onClick={() => setFilterType('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filterType === 'pending'
              ? 'bg-[#001428] dark:bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Pending Approval ({pendingCount})
        </button>
        <button
          onClick={() => setFilterType('overdue')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            filterType === 'overdue'
              ? 'bg-[#001428] dark:bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          High Balance ({highBalanceCount})
        </button>
      </div>

      {/* 5. Dealers List Cards */}
      <div className="flex flex-col gap-3.5" id="dealers-list-container">
        {filteredDealers.map((dealer) => {
          const initials = dealer.companyName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'NL';

          const isPending = dealer.approvalStatus === 'PENDING' || dealer.status === 'PENDING_APPROVAL';

          return (
            <div
              key={dealer.id}
              className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#006b5f]/10 dark:bg-[#76f4e0]/10 text-[#006b5f] dark:text-[#76f4e0] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {dealer.companyName}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{dealer.contactPerson}</span>
                      <span>•</span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {dealer.city || 'Peshawar'}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{dealer.territory || 'Commercial Beat'}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                        <span className="material-symbols-outlined text-[12px] text-[#006b5f] dark:text-[#76f4e0]">badge</span>
                        <span>Officer: {dealer.salesUserName || dealer.assignedOfficerName || 'Shahid Khan'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${
                      isPending
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    }`}
                  >
                    {isPending ? 'Pending' : 'Active'}
                  </span>

                  {isExecutive && (
                    <button
                      onClick={() => {
                        setReassigningDealer(dealer);
                        setSelectedNewOfficerId(dealer.salesUserId || fieldOfficers[0]?.id || '');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#006b5f] dark:hover:text-[#76f4e0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Reassign Officer"
                    >
                      <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Credit Health & Payment Discipline Summary */}
              <div className="mb-3">
                <CreditHealthIndicator
                  customer={dealer}
                  variant="compact"
                  className="bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
                />
              </div>

              {/* Credit Limit & Outstanding Matrix */}
              <div className="grid grid-cols-2 gap-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 mb-3 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">
                    Approved Credit Limit
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white font-mono">
                    Rs. {(dealer.creditLimit || 250000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">
                    Outstanding Balance
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold font-mono ${
                      (dealer.currentBalance || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    Rs. {(dealer.currentBalance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Footer Phone & Action Buttons */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/80">
                <a
                  href={`tel:${dealer.phone}`}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-[#006b5f] dark:hover:text-[#76f4e0] font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>{dealer.phone || '+92 300 1234567'}</span>
                </a>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setProfileDealer(dealer)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                    title="View 360° Customer Profile & Credit Health"
                  >
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">health_and_safety</span>
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(dealer)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                    title="Edit Dealer Information"
                  >
                    <span className="material-symbols-outlined text-[14px] text-blue-600 dark:text-blue-400">edit</span>
                    <span>Edit</span>
                  </button>

                  {isExecutive && (
                    <>
                      <button
                        onClick={() => {
                          setReassigningDealer(dealer);
                          setSelectedNewOfficerId(dealer.salesUserId || fieldOfficers[0]?.id || '');
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                        title="Reassign to Another Officer"
                      >
                        <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                        <span>Assign</span>
                      </button>

                      <button
                        onClick={() => setDealerToDelete(dealer)}
                        className="px-2 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all flex items-center gap-1 cursor-pointer"
                        title="Admin Authorized: Delete Dealer"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onSelectDealerForOrder(dealer.id)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    title="Book new order for this dealer"
                  >
                    Order
                  </button>

                  {isPending ? (
                    <button
                      onClick={() => {
                        onApproveDealer(dealer.id);
                        triggerToast(`${dealer.companyName} has been approved!`);
                      }}
                      className="px-3.5 py-1.5 bg-[#006b5f] hover:bg-[#005047] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectDealerForLedger(dealer.id)}
                      className="px-3.5 py-1.5 bg-[#006b5f] hover:bg-[#005047] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      View Ledger
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredDealers.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-slate-400 text-[40px]">store_mall_directory</span>
            <h4 className="font-bold text-slate-800 dark:text-white mt-2">No dealers found in this region</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try switching province or adjusting your search keyword.</p>
          </div>
        )}
      </div>

      {/* 6. Floating Action Button (FAB) for Add New Dealer */}
      <div className="fixed right-4 sm:right-6 bottom-20 sm:bottom-24 z-30">
        <button
          type="button"
          id="floating-register-dealer-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#006b5f] text-white px-5 py-3.5 rounded-full shadow-xl hover:bg-[#005047] active:scale-95 transition-all font-bold text-xs sm:text-sm ring-2 ring-white/40 cursor-pointer min-h-[44px]"
          aria-label="Register Dealer"
        >
          <span className="material-symbols-outlined text-[22px]">person_add</span>
          <span>Register Dealer</span>
        </button>
      </div>

      {/* 7. Add New Dealer Bottom Sheet / Modal Backdrop */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center sm:justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col animate-slideUp overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 bg-[#001428] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#76f4e0]/20 text-[#76f4e0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Register Dealer / Distributor
                  </h2>
                  <p className="text-xs text-slate-300">Pakistan Nationwide Coverage</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Contact Person Name</label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                    placeholder="e.g. Haji Muhammad Tariq"
                    required
                    type="text"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Business / Company Name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                    placeholder="e.g. Khyber Electric & Lighting"
                    required
                    type="text"
                  />
                </div>
              </div>

              {/* Pakistan Province / Region & City Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Province / Region (Pakistan)</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      const newReg = e.target.value;
                      setSelectedRegion(newReg);
                      const cities = getCitiesByRegionId(newReg);
                      if (cities.length > 0) {
                        setSelectedCity(cities[0].name);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] font-medium"
                  >
                    {PAKISTAN_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">City / District</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] font-medium"
                  >
                    {availableCities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Commercial Beat / Market Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Phone Number (Pak Cell)</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                    placeholder="+92 300 1234567"
                    required
                    type="tel"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Assigned Commercial Beat</label>
                  <select
                    value={assignedBeat}
                    onChange={(e) => setAssignedBeat(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                  >
                    {availableBeats.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="General Commercial Beat">Other / General Beat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#191c1e] mb-1">Shop / Business Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] resize-none"
                  placeholder="e.g. Shop # 24, Main Commercial Market, Near Clock Tower..."
                  required
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Credit Limit (PKR / Rs.)</label>
                  <input
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] font-mono font-bold"
                    placeholder="250000"
                    required
                    type="number"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#191c1e] mb-1">Pricing Tier</label>
                  <select
                    value={priceTier}
                    onChange={(e) => setPriceTier(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                  >
                    <option value="DISTRIBUTOR">Distributor (Max Dealer Margin)</option>
                    <option value="WHOLESALE">Wholesale Dealer (15% Disc)</option>
                    <option value="RETAIL">Standard Retail Outlets</option>
                  </select>
                </div>
              </div>

              {/* Officer Assignment */}
              <div>
                <label className="block font-bold text-[#191c1e] mb-1">Assigned Sales Officer</label>
                {isExecutive ? (
                  <select
                    value={assignedOfficerId}
                    onChange={(e) => setAssignedOfficerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] font-medium"
                  >
                    {fieldOfficers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.roleTitle} • {u.region})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2.5 bg-[#f2f4f6] rounded-xl text-[#43474d] flex items-center justify-between border border-slate-200">
                    <span className="font-semibold">{currentUser.fullName} ({currentUser.roleTitle})</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">Assigned to You</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {isExecutive
                    ? 'Executives can route this dealer directly to any field officer.'
                    : 'Registered dealers will be mapped to your route pending management approval.'}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-[#eceef0] text-[#43474d] rounded-xl font-bold hover:bg-[#e0e3e5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-register-dealer-btn"
                  className="px-6 py-2.5 bg-[#006b5f] text-white rounded-xl font-bold hover:bg-[#005047] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Register Dealer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Reassign Officer Modal for Executives */}
      {reassigningDealer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#001428] text-[#76f4e0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#191c1e] text-sm sm:text-base">Reassign Dealer</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">{reassigningDealer.companyName}</p>
                </div>
              </div>
              <button
                onClick={() => setReassigningDealer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-[#f2f4f6] p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Officer:</span>
                  <span className="font-bold text-slate-800">
                    {reassigningDealer.salesUserName || reassigningDealer.assignedOfficerName || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Town / Beat:</span>
                  <span className="font-medium text-slate-800">{reassigningDealer.city} • {reassigningDealer.territory}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select New Responsible Officer</label>
                <select
                  value={selectedNewOfficerId}
                  onChange={(e) => setSelectedNewOfficerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f2f4f6] rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006b5f]"
                >
                  {fieldOfficers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.employeeCode}) — {u.roleTitle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReassigningDealer(null)}
                className="px-4 py-2 bg-[#eceef0] text-slate-700 rounded-xl text-xs font-bold hover:bg-[#e0e3e5]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassign}
                className="px-4 py-2 bg-[#006b5f] text-white rounded-xl text-xs font-bold hover:bg-[#005047] shadow-xs"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile & Credit Health 360° Modal */}
      {profileDealer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#001428] text-[#76f4e0] flex items-center justify-center font-bold text-base font-mono shadow-md">
                  {profileDealer.companyName?.substring(0, 2).toUpperCase() || 'DL'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {profileDealer.companyName}
                    </h2>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                      {profileDealer.customerCode || 'NL-CUST'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{profileDealer.contactPerson}</span>
                    <span>•</span>
                    <span>{profileDealer.city}</span>
                    <span>•</span>
                    <span>{profileDealer.phone}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProfileDealer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Credit Health Indicator: Full Screen Cockpit */}
            <CreditHealthIndicator
              customer={profileDealer}
              variant="full"
              showSimulator={true}
            />

            {/* Financial Ledger & Contact Details Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Commercial &amp; Territory Profile
                </h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Business Channel:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{profileDealer.type || 'Retailer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Beat / Territory:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{profileDealer.territory || 'Main Commercial Beat'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Officer:</span>
                    <span className="font-semibold text-[#006b5f]">{profileDealer.salesUserName || profileDealer.assignedOfficerName || 'Shahid Khan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CNIC / Tax Number:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{profileDealer.cnic || '35201-9283719-3'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Ledger Exposure &amp; Headroom
                </h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Authorized Credit Limit:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs. {(profileDealer.creditLimit || 250000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Outstanding Balance:</span>
                    <span className="font-mono font-bold text-rose-600">
                      Rs. {(profileDealer.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net Credit Headroom:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      Rs. {Math.max(0, (profileDealer.creditLimit || 250000) - (profileDealer.currentBalance || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Credit Term:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{profileDealer.creditDays || 30} Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 'Recent Orders' View (Last 5 Orders for Current Customer) */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b5f] dark:text-[#76f4e0] text-[20px]">receipt_long</span>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent Orders (Last 5 Orders)
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {profileDealerRecentOrders.length} {profileDealerRecentOrders.length === 1 ? 'Order' : 'Orders'} On Record
                </span>
              </div>

              {profileDealerRecentOrders.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {profileDealerRecentOrders.map((ord) => {
                    const statusBg =
                      ord.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : ord.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
                    const statusLabel =
                      ord.status === 'APPROVED'
                        ? 'Approved & Dispatched'
                        : ord.status === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending Dual Approval';

                    return (
                      <div
                        key={ord.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-mono text-xs font-bold shrink-0">
                            #
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {ord.orderNumber}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBg}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>📅 {ord.orderDate}</span>
                              <span>•</span>
                              <span>📦 {ord.items?.length || 0} Products</span>
                              {ord.salesUserName && (
                                <>
                                  <span>•</span>
                                  <span>👤 {ord.salesUserName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block sm:hidden">Total Value</span>
                            <span className="text-sm font-black font-mono text-[#006b5f] dark:text-[#76f4e0]">
                              Rs. {Number(ord.totalAmount || 0).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const id = profileDealer.id;
                              setProfileDealer(null);
                              onSelectDealerForLedger(id);
                            }}
                            className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                            title="View Invoice Details"
                          >
                            <span>View</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60">
                  <span className="material-symbols-outlined text-[32px] text-slate-400">shopping_bag</span>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">No orders booked yet for this customer</p>
                  <p className="text-[11px] text-slate-400">Book their first order by clicking 'Create Sales Order' below.</p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://wa.me/${(profileDealer.phone || '').replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(profileDealer.contactPerson || profileDealer.companyName)},%20Greeting%20from%20N-Link%20360.%20Your%20current%20outstanding%20balance%20is%20PKR%20${(profileDealer.currentBalance || 0).toLocaleString()}.%20Please%20arrange%20settlement%20at%20your%20earliest.`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[44px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadProfilePdfStatement(profileDealer)}
                  className="min-h-[44px] px-3.5 py-2.5 bg-[#006b5f] hover:bg-[#005249] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Download official jsPDF print-ready statement"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Download PDF Statement</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = profileDealer.id;
                    setProfileDealer(null);
                    onSelectDealerForLedger(id);
                  }}
                  className="min-h-[44px] px-3.5 py-2.5 bg-[#76f4e0]/30 text-[#006f63] dark:text-[#76f4e0] dark:bg-teal-950/60 hover:bg-[#76f4e0]/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>View Ledger</span>
                </button>

                <button
                  onClick={() => {
                    const id = profileDealer.id;
                    setProfileDealer(null);
                    onSelectDealerForOrder(id);
                  }}
                  className="min-h-[44px] px-3.5 py-2.5 bg-[#001428] hover:bg-[#0f2942] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                  <span>Book Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Dealer Modal */}
      {editingDealer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scaleUp">
            <div className="p-5 bg-[#001428] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-300 text-[18px]">edit</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Edit Dealer Information</h3>
                  <p className="text-[11px] text-slate-300">Update party credentials & commercial parameters</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDealer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Company / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Territory / Beat</label>
                  <input
                    type="text"
                    value={editTerritory}
                    onChange={(e) => setEditTerritory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Credit Limit (PKR)</label>
                  <input
                    type="number"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Price Tier</label>
                  <select
                    value={editPriceTier}
                    onChange={(e) => setEditPriceTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="WHOLESALE">Wholesale Tier</option>
                    <option value="RETAIL">Retail Tier</option>
                    <option value="DISTRIBUTOR">Distributor Tier</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDealer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#006b5f] hover:bg-[#005a50] text-white font-bold text-xs shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Admin Authorized Delete Dealer Confirmation Dialog */}
      {dealerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden animate-scaleUp">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="text-base font-black">Confirm Dealer Removal</h3>
                  <p className="text-[11px] text-rose-100">Super Admin / Management Authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDealerToDelete(null)}
                className="p-1 rounded-full text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{dealerToDelete.companyName}</strong> ({dealerToDelete.city || 'Peshawar'}) from the enterprise master dealer network?
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-amber-600">info</span>
                <span>This action cannot be undone and will unassign active orders and ledger records for this dealer.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setDealerToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  <span>Delete Dealer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#001428] text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-slideDown border border-emerald-500/30">
          <span className="material-symbols-outlined text-[#76f4e0] text-[20px]">
            check_circle
          </span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
