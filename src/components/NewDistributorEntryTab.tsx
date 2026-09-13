/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - New Distributor & Dealer Registration Form
 * Clean, focused, mobile-friendly input workspace with validation & auto-code generation.
 */

import React, { useState } from 'react';
import { Store, Plus, CheckCircle2, User, Phone, MapPin, DollarSign, Calendar, Building2 } from 'lucide-react';
import { Customer } from '../types';
import { generateUniqueCustomerCode } from '../lib/business-rules';

interface NewDistributorEntryTabProps {
  customers: Customer[];
  onAddCustomer: (newCustomer: Customer) => void;
  currentUser?: any;
}

export const NewDistributorEntryTab: React.FC<NewDistributorEntryTabProps> = ({
  customers,
  onAddCustomer,
  currentUser,
}) => {
  // Form input states
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<'DISTRIBUTOR' | 'DEALER'>('DEALER');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [town, setTown] = useState('');
  const [city, setCity] = useState('Lahore');
  const [region, setRegion] = useState('Punjab Central');
  const [creditLimit, setCreditLimit] = useState('500000');
  const [creditDays, setCreditDays] = useState('30');
  const [openingBalance, setOpeningBalance] = useState('0');

  // Status flags
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-calculated unique customer code
  const generatedCode = generateUniqueCustomerCode(
    type,
    customers.map((c) => c.customerCode)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      alert('Please enter a valid Company / Shop Name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter a valid Contact Phone Number.');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: generatedCode,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || 'Proprietor',
      phone: phone.trim(),
      cnic: cnic.trim() || undefined,
      address: address.trim() || 'General Market Lahore',
      town: town.trim() || 'General Market',
      city: city,
      region: region,
      creditLimit: parseFloat(creditLimit) || 0,
      creditDays: parseInt(creditDays) || 30,
      currentBalance: parseFloat(openingBalance) || 0,
      openingBalance: parseFloat(openingBalance) || 0,
      status: 'NORMAL',
      isActive: true,
      isCreditLocked: false,
      type: type,
      approvalStatus: 'APPROVED', // Auto approved for field portal simplicity
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      salesUserId: currentUser?.id || 'USR-001',
      salesUserName: currentUser?.fullName || 'System Admin',
    };

    onAddCustomer(newCust);

    setSuccessMessage(
      `Successfully registered "${newCust.companyName}" with Account Code ${newCust.customerCode} under territory ${newCust.region}!`
    );

    // Reset inputs
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setCnic('');
    setAddress('');
    setTown('');
    setCreditLimit('500000');
    setCreditDays('30');
    setOpeningBalance('0');

    // Scroll to top of tab to show success
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="new-distributor-tab-container">
      
      {/* Title & Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Distributor & Dealers Registration Hub</h2>
            <p className="text-xs text-slate-500">Register new business accounts and generate automatic credit limits instantly.</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-extrabold">Registration Completed</p>
            <p className="text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Distributor Details & Demographics
          </h3>
        </div>

        {/* Form Fields Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Company / Business / Shop Name*</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setSuccessMessage(null);
              }}
              placeholder="e.g. Al-Rehman Electrical Lights Store"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Channel Type*</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="DEALER">Dealer / Retailer</option>
              <option value="DISTRIBUTOR">Official Distributor</option>
            </select>
          </div>

        </div>

        {/* Code Generator Preview & Proprietor Info */}
        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-[11px] flex items-center justify-between">
          <span className="text-emerald-800 font-semibold uppercase">Auto-Generated Code Preview:</span>
          <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded border border-emerald-200">{generatedCode}</span>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Proprietor / Owner Name
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Haji Shafiullah"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> Phone Number*
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +92 300 1234567"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Proprietor CNIC (Optional)</label>
            <input
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="e.g. 35201-1234567-9"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Row 3 - Geographic */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1.5 border-t border-slate-50">
          
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Town / Route Beat
            </label>
            <input
              type="text"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              placeholder="e.g. Shah Alam Market Beat"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">City / Town*</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Lahore">Lahore</option>
              <option value="Gujranwala">Gujranwala</option>
              <option value="Faisalabad">Faisalabad</option>
              <option value="Sialkot">Sialkot</option>
              <option value="Peshawar">Peshawar</option>
              <option value="Karachi">Karachi</option>
              <option value="Rawalpindi">Rawalpindi</option>
              <option value="Islamabad">Islamabad</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Region*</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Punjab Central">Punjab Central</option>
              <option value="Punjab North">Punjab North</option>
              <option value="Sindh South">Sindh South</option>
              <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
              <option value="Balochistan">Balochistan</option>
            </select>
          </div>

        </div>

        {/* Row 4 - Credit Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1.5 border-t border-slate-50">
          
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" /> Credit Limit (PKR)*
            </label>
            <input
              type="number"
              required
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="500000"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Max Credit Term Days*</label>
            <input
              type="number"
              required
              value={creditDays}
              onChange={(e) => setCreditDays(e.target.value)}
              placeholder="30"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" /> Opening Balance (PKR)*
            </label>
            <input
              type="number"
              required
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Row 5 - Address */}
        <div className="space-y-1 pt-1.5 border-t border-slate-50">
          <label className="text-[11px] font-bold text-slate-700 block">Shop Full Physical Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Shop # 21, Electric Plaza, Brandreth Road"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register Distributor / Dealer</span>
          </button>
        </div>

      </form>

    </div>
  );
};
