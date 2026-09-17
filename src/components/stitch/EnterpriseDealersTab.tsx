/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Dealers Tab
 * Pixel-perfect implementation based on Stitch Design System
 * Pakistan Comprehensive Regional & City Dealer Directory
 */

import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  PAKISTAN_REGIONS,
  getCitiesByRegionId,
} from '../../data/pakistan-geography';

export interface EnterpriseDealersTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  onAddDealer: (newDealer: Partial<Customer>) => void;
  onApproveDealer: (customerId: string) => void;
  onSelectDealerForLedger: (customerId: string) => void;
  onSelectDealerForOrder: (customerId: string) => void;
}

export const EnterpriseDealersTab: React.FC<EnterpriseDealersTabProps> = ({
  currentUser,
  customers,
  onAddDealer,
  onApproveDealer,
  onSelectDealerForLedger,
  onSelectDealerForOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'pending' | 'overdue'>('all');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Modal Form Fields
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('KPK');
  const [selectedCity, setSelectedCity] = useState('Peshawar');
  const [assignedBeat, setAssignedBeat] = useState('Sheikh Yaseen Tower Beat');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('250000');
  const [priceTier, setPriceTier] = useState('WHOLESALE');

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

  // Filtering
  const filteredDealers = useMemo(() => {
    return customers.filter((d) => {
      const matchesSearch =
        d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.territory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.phone || '').includes(searchQuery);

      if (!matchesSearch) return false;

      // Region Filter
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
  }, [customers, searchQuery, filterType, selectedRegionFilter]);

  // Counts
  const activeCount = customers.filter((c) => c.approvalStatus === 'APPROVED' || c.isActive).length;
  const pendingCount = customers.filter((c) => c.approvalStatus === 'PENDING' || c.status === 'PENDING_APPROVAL').length;
  const highBalanceCount = customers.filter((c) => (c.currentBalance || 0) > (c.creditLimit || 1) * 0.7).length;

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const totalLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const utilizationRate = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 42;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName) return;

    const regionName = PAKISTAN_REGIONS.find((r) => r.id === selectedRegion)?.name || 'Khyber Pakhtunkhwa';

    const newDealer: Partial<Customer> = {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      customerCode: `DL-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName,
      contactPerson: contactName,
      phone: phoneNumber || '+92 300 0000000',
      address: address || `${assignedBeat}, ${selectedCity}`,
      territory: `${regionName} • ${assignedBeat}`,
      city: selectedCity,
      creditLimit: parseFloat(creditLimit) || 250000,
      currentBalance: 0,
      status: 'NORMAL',
      isActive: true,
      approvalStatus: 'APPROVED',
      priceTier: priceTier as any,
    };

    onAddDealer(newDealer);
    setIsAddModalOpen(false);
    setCompanyName('');
    setContactName('');
    setPhoneNumber('');
    setAddress('');
    triggerToast(`Dealer ${companyName} (${selectedCity}) registered successfully!`);
  };

  return (
    <div className="flex flex-col w-full pb-20 animate-fadeIn" id="enterprise-dealers-view">
      {/* 1. Top Stats Summary (2 Cards) */}
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#43474d] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dealers Network</span>
            <span className="material-symbols-outlined text-[#006b5f] text-[20px]">
              storefront
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#191c1e] font-mono">{customers.length || 48}</span>
            <span className="text-[11px] text-[#006b5f] font-bold">Pakistan Wide</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e5] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#43474d] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Portfolio Outstanding</span>
            <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">
              account_balance_wallet
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#191c1e] font-mono">
              Rs. {(totalOutstanding > 0 ? (totalOutstanding / 100000).toFixed(1) : '14.2')} Lacs
            </span>
            <span className="text-[11px] text-[#006b5f] font-bold">{utilizationRate}% utilized</span>
          </div>
        </div>
      </div>

      {/* 2. Pakistan Region Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
        <button
          onClick={() => setSelectedRegionFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedRegionFilter === 'ALL'
              ? 'bg-[#001428] text-white shadow-xs'
              : 'bg-white text-[#43474d] border border-[#e0e3e5] hover:bg-slate-50'
          }`}
        >
          All Pakistan
        </button>
        {PAKISTAN_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRegionFilter(r.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedRegionFilter === r.id
                ? 'bg-[#001428] text-white shadow-xs'
                : 'bg-white text-[#43474d] border border-[#e0e3e5] hover:bg-slate-50'
            }`}
          >
            {r.name} ({r.shortCode})
          </button>
        ))}
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74777e] text-[20px]">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-xs sm:text-sm text-[#191c1e] placeholder:text-[#74777e] focus:outline-none focus:ring-2 focus:ring-[#006b5f] transition-all shadow-xs border border-[#e0e3e5] font-medium"
            id="dealer-search"
            placeholder="Search by dealer name, city (Peshawar, Lahore, Karachi...), phone..."
            type="text"
          />
        </div>
      </div>

      {/* 4. Status Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all ${
            filterType === 'all'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'bg-[#f2f4f6] text-[#43474d]'
          }`}
        >
          All Status ({filteredDealers.length})
        </button>
        <button
          onClick={() => setFilterType('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all ${
            filterType === 'active'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'bg-[#f2f4f6] text-[#43474d]'
          }`}
        >
          Active Verified ({activeCount})
        </button>
        <button
          onClick={() => setFilterType('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all ${
            filterType === 'pending'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'bg-[#f2f4f6] text-[#43474d]'
          }`}
        >
          Pending Approval ({pendingCount})
        </button>
        <button
          onClick={() => setFilterType('overdue')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition-all ${
            filterType === 'overdue'
              ? 'bg-[#006b5f] text-white shadow-xs'
              : 'bg-[#f2f4f6] text-[#43474d]'
          }`}
        >
          High Balance / Aging ({highBalanceCount})
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
              className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e5] transition-all hover:border-slate-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#001428] text-[#76f4e0] flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-2xs">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[#191c1e] truncate">
                      {dealer.companyName}
                    </h3>
                    <p className="text-xs text-[#43474d] truncate flex items-center gap-1.5">
                      <span>{dealer.contactPerson}</span>
                      <span>•</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {dealer.city || 'Peshawar'}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500 truncate">{dealer.territory || 'Main Commercial Beat'}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${
                    isPending
                      ? 'bg-[#e0e3e5] text-[#43474d]'
                      : 'bg-[#76f4e0] text-[#006f63]'
                  }`}
                >
                  {isPending ? 'Pending' : 'Active'}
                </span>
              </div>

              {/* Credit Limit & Outstanding Matrix */}
              <div className="grid grid-cols-2 gap-2 py-2.5 bg-[#f2f4f6] rounded-xl px-4 mb-3 border border-slate-100">
                <div>
                  <span className="text-[10px] text-[#74777e] font-semibold block uppercase">
                    Credit Limit
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#191c1e] font-mono">
                    Rs. {(dealer.creditLimit || 250000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#74777e] font-semibold block uppercase">
                    Outstanding
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold font-mono ${
                      (dealer.currentBalance || 0) > 0 ? 'text-[#ba1a1a]' : 'text-[#191c1e]'
                    }`}
                  >
                    Rs. {(dealer.currentBalance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Footer Phone & Action Buttons */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <a
                  href={`tel:${dealer.phone}`}
                  className="flex items-center gap-1.5 text-xs text-[#43474d] hover:text-[#006b5f] font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>{dealer.phone || '+92 300 1234567'}</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectDealerForOrder(dealer.id)}
                    className="px-3 py-1.5 bg-[#eceef0] text-[#191c1e] rounded-xl text-xs font-bold hover:bg-[#e0e3e5] transition-all"
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
                      className="px-3.5 py-1.5 bg-[#001428] text-white rounded-xl text-xs font-bold hover:bg-[#0f2942] transition-all"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectDealerForLedger(dealer.id)}
                      className="px-3.5 py-1.5 bg-[#76f4e0]/40 text-[#006f63] rounded-xl text-xs font-bold hover:bg-[#76f4e0] transition-all"
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
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <span className="material-symbols-outlined text-slate-400 text-[40px]">store_mall_directory</span>
            <h4 className="font-bold text-slate-800 mt-2">No dealers found in this region</h4>
            <p className="text-xs text-slate-500 mt-1">Try switching province or adjusting your search keyword.</p>
          </div>
        )}
      </div>

      {/* 6. Floating Action Button (FAB) for Add New Dealer */}
      <div className="fixed right-5 bottom-24 z-40">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#006b5f] text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-[#005047] active:scale-95 transition-all font-bold text-xs sm:text-sm"
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
                  className="px-5 py-2.5 bg-[#006b5f] text-white rounded-xl font-bold hover:bg-[#005047] shadow-sm"
                >
                  Register Partner
                </button>
              </div>
            </form>
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
