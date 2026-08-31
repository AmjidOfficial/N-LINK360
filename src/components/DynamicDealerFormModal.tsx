/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Dynamic Dealer / Distributor Registration & Edit Form
 * Features dynamic dependent hierarchy dropdowns, universal designation assignments,
 * parent distributor linking, all-dropdown/checkbox selections & AI smart suggestions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  Banknote,
  Users,
  GitFork,
  X,
  Check,
  Percent
} from 'lucide-react';
import {
  HIERARCHY_REGIONS_DATA,
  ALL_DESIGNATIONS_TEAM,
  PAKISTAN_COMMERCIAL_BANKS,
  generateAiSmartDealerDefaults,
  AssignedStaffMember
} from '../data/hierarchy-data';
import { User } from '../types';

interface DynamicDealerFormModalProps {
  isOpen: boolean;
  isEdit: boolean;
  dealer?: any;
  dealersList: any[];
  currentUser: User;
  onSave: (dealerData: any) => void;
  onClose: () => void;
}

export const DynamicDealerFormModal: React.FC<DynamicDealerFormModalProps> = ({
  isOpen,
  isEdit,
  dealer,
  dealersList,
  currentUser,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  // Active step tab
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState(dealer?.name || '');
  const [customerType, setCustomerType] = useState<string>(dealer?.customerType || 'DEALER');
  const [parentDistributorId, setParentDistributorId] = useState<string>(dealer?.parentDistributorId || 'DIRECT');
  
  // Hierarchy States
  const [selectedRegion, setSelectedRegion] = useState<string>(dealer?.region || 'Punjab Central');
  const [selectedArea, setSelectedArea] = useState<string>(dealer?.area || 'Lahore Division');
  const [selectedTown, setSelectedTown] = useState<string>(dealer?.town || 'Lahore');
  const [selectedBeat, setSelectedBeat] = useState<string>(dealer?.territory || 'Brandreth Road Auto Market');
  const [customBeat, setCustomBeat] = useState<string>('');

  // Primary Staff Assignment (Universal - ANY Designation)
  const [assignedStaffId, setAssignedStaffId] = useState<string>(
    dealer?.assignedOfficerId || ALL_DESIGNATIONS_TEAM[0].id
  );

  // Multi-Designation Team Checkboxes
  const [supervisingRsm, setSupervisingRsm] = useState<boolean>(dealer?.supervisingRsm ?? true);
  const [supervisingAsm, setSupervisingAsm] = useState<boolean>(dealer?.supervisingAsm ?? true);
  const [assignedAccountsOfficer, setAssignedAccountsOfficer] = useState<boolean>(dealer?.assignedAccountsOfficer ?? true);
  const [dedicatedDispatchOfficer, setDedicatedDispatchOfficer] = useState<boolean>(dealer?.dedicatedDispatchOfficer ?? false);

  // Contact & Identity
  const [contactPerson, setContactPerson] = useState(dealer?.contactPerson || '');
  const [cnic, setCnic] = useState(dealer?.cnic || '');
  const [phone, setPhone] = useState(dealer?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(dealer?.secondaryPhone || '');
  const [email, setEmail] = useState(dealer?.email || '');
  const [address, setAddress] = useState(dealer?.address || '');

  // Commercial & Credit
  const [creditLimit, setCreditLimit] = useState<number>(dealer?.creditLimit || 1000000);
  const [creditDays, setCreditDays] = useState<number>(dealer?.creditDays || 30);
  const [operatingStatus, setOperatingStatus] = useState<string>(dealer?.status || 'NORMAL');
  const [isTaxFiler, setIsTaxFiler] = useState<boolean>(dealer?.isTaxFiler ?? true);
  const [ntn, setNtn] = useState(dealer?.ntn || '');
  const [strn, setStrn] = useState(dealer?.strn || '');

  // Banking
  const [bankName, setBankName] = useState<string>(dealer?.bankName || 'Meezan Bank Ltd');
  const [bankIban, setBankIban] = useState(dealer?.bankIban || '');

  // Special Attributes Checkboxes
  const [isTopVolume, setIsTopVolume] = useState<boolean>(dealer?.isTopVolume ?? false);
  const [isPromptPayer, setIsPromptPayer] = useState<boolean>(dealer?.isPromptPayer ?? true);
  const [isTierADiscount, setIsTierADiscount] = useState<boolean>(dealer?.isTierADiscount ?? false);
  const [isDirectDelivery, setIsDirectDelivery] = useState<boolean>(dealer?.isDirectDelivery ?? false);
  const [isChequeVerificationMandatory, setIsChequeVerificationMandatory] = useState<boolean>(
    dealer?.isChequeVerificationMandatory ?? false
  );

  // Searchable Tags & Categorization
  const [tags, setTags] = useState<string[]>(dealer?.tags || ['Auto Lighting', 'LED Bulbs']);
  const [tagSearchInput, setTagSearchInput] = useState<string>('');

  const AVAILABLE_TAG_OPTIONS = [
    'Auto Lighting',
    'Halogen Bulbs',
    'LED Bulbs',
    'Heavy Transport',
    'Motorcycle Parts',
    'Wholesale Hub',
    'Key Account',
    'Cash Preferred',
    'Credit Verified',
    'OEM Supplier',
  ];

  // AI-Assisted Validation Feedback Calculation
  const aiValidationAssessment = useMemo(() => {
    const issues: string[] = [];
    const strengths: string[] = [];

    if (creditLimit > 2000000 && creditDays > 45) {
      issues.push('High credit exposure (>2.0M PKR with >45 days terms). Recommending mandatory cheque clearing or corporate collateral.');
    } else {
      strengths.push('Credit terms are within standard risk thresholds.');
    }

    if (cnic && !/^\d{5}-\d{7}-\d{1}$/.test(cnic.trim())) {
      issues.push('CNIC format recommendation: standard 13-digit pattern (e.g. 35202-1234567-1).');
    } else if (cnic) {
      strengths.push('CNIC verified in standard format.');
    }

    if (phone && phone.trim().length < 10) {
      issues.push('Phone number appears short. Include valid cellular format.');
    }

    if (selectedRegion && selectedTown) {
      strengths.push(`Geographical hierarchy aligned: ${selectedRegion} -> ${selectedArea} -> ${selectedTown}.`);
    }

    return {
      riskLevel: creditLimit > 2000000 && creditDays > 45 ? 'HIGH' : creditLimit > 1000000 ? 'MODERATE' : 'OPTIMAL',
      issues,
      strengths,
    };
  }, [creditLimit, creditDays, cnic, phone, selectedRegion, selectedArea, selectedTown]);

  // Toast / notification
  const [aiAppliedNotification, setAiAppliedNotification] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Dynamic Dependent Dropdown Calculations
  // -------------------------------------------------------------
  const currentRegionObj = useMemo(() => {
    return (
      HIERARCHY_REGIONS_DATA.find((r) => r.name === selectedRegion) || HIERARCHY_REGIONS_DATA[0]
    );
  }, [selectedRegion]);

  const availableAreas = useMemo(() => {
    return currentRegionObj.areas.map((a) => a.name);
  }, [currentRegionObj]);

  const currentAreaObj = useMemo(() => {
    return (
      currentRegionObj.areas.find((a) => a.name === selectedArea) || currentRegionObj.areas[0]
    );
  }, [currentRegionObj, selectedArea]);

  const availableTowns = useMemo(() => {
    return currentAreaObj.towns.map((t) => t.name);
  }, [currentAreaObj]);

  const currentTownObj = useMemo(() => {
    return currentAreaObj.towns.find((t) => t.name === selectedTown) || currentAreaObj.towns[0];
  }, [currentAreaObj, selectedTown]);

  const availableBeats = useMemo(() => {
    return currentTownObj?.beats || [];
  }, [currentTownObj]);

  // Sync dependent dropdowns when region changes
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    const regObj = HIERARCHY_REGIONS_DATA.find((r) => r.name === newRegion) || HIERARCHY_REGIONS_DATA[0];
    const firstArea = regObj.areas[0]?.name || '';
    setSelectedArea(firstArea);
    const firstTown = regObj.areas[0]?.towns[0]?.name || '';
    setSelectedTown(firstTown);
    const firstBeat = regObj.areas[0]?.towns[0]?.beats[0] || '';
    setSelectedBeat(firstBeat);
  };

  // Sync dependent dropdowns when area changes
  const handleAreaChange = (newArea: string) => {
    setSelectedArea(newArea);
    const areaObj = currentRegionObj.areas.find((a) => a.name === newArea) || currentRegionObj.areas[0];
    const firstTown = areaObj.towns[0]?.name || '';
    setSelectedTown(firstTown);
    const firstBeat = areaObj.towns[0]?.beats[0] || '';
    setSelectedBeat(firstBeat);
  };

  // Sync dependent dropdowns when town changes
  const handleTownChange = (newTown: string) => {
    setSelectedTown(newTown);
    const townObj = currentAreaObj.towns.find((t) => t.name === newTown) || currentAreaObj.towns[0];
    const firstBeat = townObj?.beats[0] || '';
    setSelectedBeat(firstBeat);
  };

  // Available Parent Distributors (filtered from current dealers list)
  const availableDistributors = useMemo(() => {
    return dealersList.filter(
      (d) => d.customerType === 'DISTRIBUTOR' || d.customerType === 'WHOLESALER'
    );
  }, [dealersList]);

  // Selected primary staff member
  const selectedStaffMember: AssignedStaffMember = useMemo(() => {
    return (
      ALL_DESIGNATIONS_TEAM.find((s) => s.id === assignedStaffId) || ALL_DESIGNATIONS_TEAM[0]
    );
  }, [assignedStaffId]);

  // -------------------------------------------------------------
  // AI Smart Suggest & Auto-Fill Handler
  // -------------------------------------------------------------
  const handleApplyAiDefaults = () => {
    const aiParams = generateAiSmartDealerDefaults(customerType, selectedRegion, selectedTown);
    setCreditLimit(aiParams.creditLimit);
    setCreditDays(aiParams.creditDays);
    setAssignedStaffId(aiParams.assignedStaff.id);
    if (!cnic) setCnic(aiParams.sampleCnic);
    if (!ntn) setNtn(aiParams.sampleNtn);
    setBankName(aiParams.recommendedBank);
    setOperatingStatus(aiParams.recommendedStatus);

    setAiAppliedNotification(
      `AI Auto-Parameters Configured: PKR ${(aiParams.creditLimit / 100000).toFixed(1)}L Limit, ${aiParams.creditDays} Days Credit Term, Assigned to ${aiParams.assignedStaff.name} (${aiParams.assignedStaff.role}).`
    );
    setTimeout(() => setAiAppliedNotification(null), 5000);
  };

  // -------------------------------------------------------------
  // Form Submit Handler
  // -------------------------------------------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please provide the Commercial Business / Shop Name.');
      return;
    }
    if (!contactPerson.trim()) {
      alert('Please provide the Proprietor / Contact Person Name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please provide a Primary Phone Number.');
      return;
    }

    const finalBeat = selectedBeat === 'CUSTOM_BEAT' ? customBeat.trim() || 'Custom Beat' : selectedBeat;

    const payload = {
      ...(dealer || {}),
      name: name.trim(),
      customerType,
      parentDistributorId,
      region: selectedRegion,
      area: selectedArea,
      town: selectedTown,
      territory: finalBeat,
      assignedTsm: `${selectedStaffMember.name} (${selectedStaffMember.role})`,
      assignedOfficerId: selectedStaffMember.id,
      assignedOfficerName: `${selectedStaffMember.name} (${selectedStaffMember.role})`,
      supervisingRsm,
      supervisingAsm,
      assignedAccountsOfficer,
      dedicatedDispatchOfficer,
      contactPerson: contactPerson.trim(),
      cnic: cnic.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      email: email.trim(),
      address: address.trim() || `Market Shop, ${finalBeat}, ${selectedTown}`,
      creditLimit: Number(creditLimit),
      creditDays: Number(creditDays),
      status: isEdit ? operatingStatus : 'PENDING_APPROVAL',
      approvalStatus: isEdit ? (dealer?.approvalStatus || 'APPROVED') : 'PENDING_APPROVAL',
      isActive: isEdit ? (dealer?.isActive ?? true) : false,
      isTaxFiler,
      ntn: ntn.trim(),
      strn: strn.trim(),
      bankName,
      bankIban: bankIban.trim(),
      isTopVolume,
      isPromptPayer,
      isTierADiscount,
      isDirectDelivery,
      isChequeVerificationMandatory,
      tags,
      currentBalance: dealer?.currentBalance ?? 0,
      submittedBy: currentUser.fullName,
      submittedById: currentUser.id,
      createdAt: dealer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="dealer-management-form nm-flat bg-[#E8ECF2] rounded-3xl border border-white max-w-3xl w-full space-y-4 shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Prominent Header */}
        <div className="sticky top-0 z-10 bg-[#E8ECF2] p-5 pb-4 border-b border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl nm-flat flex items-center justify-center text-teal-700 font-black border border-white shrink-0 shadow-sm">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  {isEdit ? 'Edit Commercial Account' : 'Dynamic Dealer & Distributor Registration'}
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-teal-800 text-teal-100 shadow-sm">
                  {customerType}
                </span>
                {dealer?.id && (
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                    {dealer.id}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                National Lights 360 Automotive Hierarchy • Universal Multi-Designation Assignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyAiDefaults}
              className="nm-btn px-3 py-2 rounded-xl text-xs font-black text-teal-800 hover:text-teal-950 flex items-center gap-1.5 shadow-sm border border-teal-300/80 bg-teal-50/50"
              title="Auto-Fill recommended parameters using AI business rules"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
              <span className="hidden sm:inline">AI Auto-Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="nm-btn w-9 h-9 rounded-2xl text-slate-600 font-bold hover:text-rose-600 flex items-center justify-center transition-colors"
              title="Close Registration Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Notification Alert */}
        {aiAppliedNotification && (
          <div className="mx-5 p-3 rounded-2xl bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{aiAppliedNotification}</span>
          </div>
        )}

        {/* Step Indicator Buttons */}
        <div className="px-5 pt-1 flex items-center gap-2 shrink-0">
          {[
            { step: 1, label: '1. Hierarchy & Team Assignment', icon: MapPin },
            { step: 2, label: '2. Firm Identity & Contacts', icon: Building },
            { step: 3, label: '3. Commercial & Banking Terms', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStep === tab.step;
            return (
              <button
                key={tab.step}
                type="button"
                onClick={() => setActiveStep(tab.step as 1 | 2 | 3)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'nm-btn-primary shadow-sm text-white'
                    : 'nm-btn text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 text-xs scrollbar-none">
          {/* STEP 1: HIERARCHY & UNIVERSAL ASSIGNMENT */}
          {activeStep === 1 && (
            <div className="space-y-4">
              {/* Account Category & Parent Channel Partner */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                    Account Classification &amp; Hierarchy Tier
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">Category Selector</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Customer Category *</label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-black text-teal-900 bg-white"
                    >
                      <option value="DISTRIBUTOR">Regional Distributor (Primary Stockist)</option>
                      <option value="WHOLESALER">Wholesale Stockist (Bulk Buyer)</option>
                      <option value="DEALER">Authorized Dealer (Lighting &amp; Auto Spares)</option>
                      <option value="RETAIL_SHOP">Retail Store / Auto Electrician Outlet</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Parent Distributor Link *</label>
                    <select
                      value={parentDistributorId}
                      onChange={(e) => setParentDistributorId(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="DIRECT">Direct National Lights Head Office Account</option>
                      {availableDistributors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.customerType} - {d.town})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Dependent Geographical Hierarchy */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                    Geographical Hierarchy Matrix (Dependent Dropdowns)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {selectedRegion} &gt; {selectedArea} &gt; {selectedTown}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1. Region *</label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold bg-white text-slate-800"
                    >
                      {HIERARCHY_REGIONS_DATA.map((r) => (
                        <option key={r.code} value={r.name}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">2. Area / Division *</label>
                    <select
                      value={selectedArea}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold bg-white text-slate-800"
                    >
                      {availableAreas.map((areaName) => (
                        <option key={areaName} value={areaName}>
                          {areaName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">3. Town / Market City *</label>
                    <select
                      value={selectedTown}
                      onChange={(e) => handleTownChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold bg-white text-slate-800"
                    >
                      {availableTowns.map((townName) => (
                        <option key={townName} value={townName}>
                          {townName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">4. Territory / Market Beat *</label>
                    <select
                      value={selectedBeat}
                      onChange={(e) => setSelectedBeat(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold bg-white text-slate-800"
                    >
                      {availableBeats.map((beat) => (
                        <option key={beat} value={beat}>
                          {beat}
                        </option>
                      ))}
                      <option value="CUSTOM_BEAT">+ Define Custom Beat</option>
                    </select>
                  </div>
                </div>

                {selectedBeat === 'CUSTOM_BEAT' && (
                  <div className="pt-2">
                    <label className="font-bold text-slate-700 block mb-1">Custom Beat Name *</label>
                    <input
                      type="text"
                      required
                      value={customBeat}
                      onChange={(e) => setCustomBeat(e.target.value)}
                      placeholder="e.g. New Auto Market Zone B, Link Road"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Universal Designation Assignment (Not only TSM!) */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                    Universal Team Assignment (Assignable to Every Designation)
                  </span>
                  <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md font-bold">
                    Role Parity Enabled
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Primary Dedicated Officer *</label>
                  <select
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-black text-teal-900 bg-white"
                  >
                    {ALL_DESIGNATIONS_TEAM.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} — [{staff.role}] {staff.designation} ({staff.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-Designation Supervision Checkboxes */}
                <div className="pt-2 space-y-2">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Supervisory Team &amp; Functional Attachments (Checkboxes):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2 p-2 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={supervisingRsm}
                        onChange={(e) => setSupervisingRsm(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-slate-700">Attach Regional Sales Manager (RSM)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={supervisingAsm}
                        onChange={(e) => setSupervisingAsm(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-slate-700">Attach Area Sales Manager (ASM)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={assignedAccountsOfficer}
                        onChange={(e) => setAssignedAccountsOfficer(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-slate-700">Dedicated Recovery &amp; Accounts Controller</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={dedicatedDispatchOfficer}
                        onChange={(e) => setDedicatedDispatchOfficer(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-slate-700">Direct Warehouse Dispatch Access</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="nm-btn-primary px-6 py-2.5 rounded-xl font-bold shadow-md"
                >
                  Proceed to Step 2: Firm Identity &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FIRM IDENTITY & CONTACTS */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  Proprietor &amp; Outlet Identity Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Business / Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Al-Madina Auto Lighting & Electric Spares"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-black text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Proprietor / Key Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Haji Muhammad Younas"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">CNIC Number *</label>
                    <input
                      type="text"
                      required
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="e.g. 35202-1234567-1"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Mobile / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-teal-900 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Secondary Phone / Landline</label>
                    <input
                      type="text"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="e.g. +92 42 37351234"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. almadina.spares@gmail.com"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Complete Physical Shop / Warehouse Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Shop #42, Auto Spares Market, Brandreth Road, Lahore"
                    className="w-full p-2.5 rounded-xl nm-inset text-xs font-medium bg-white"
                  />
                </div>
              </div>

              {/* Special Partnership Badges & Flags */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  Special Account Flags &amp; Privileges (Checkboxes)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isTopVolume}
                      onChange={(e) => setIsTopVolume(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-bold text-slate-800">Top Volume Partner (High Priority Allocation)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isPromptPayer}
                      onChange={(e) => setIsPromptPayer(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-bold text-slate-800">Prompt Payer (1.5% Early Clearance Rebate)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isTierADiscount}
                      onChange={(e) => setIsTierADiscount(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-bold text-slate-800">Tier-A Master Wholesale Discount Rate</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isDirectDelivery}
                      onChange={(e) => setIsDirectDelivery(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-bold text-slate-800">Direct Vehicle Dispatch Required</span>
                  </label>
                </div>
              </div>

              {/* Searchable Tags & Specialty Selection */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                    Product Focus Tags &amp; Specialization (Multi-Select)
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold font-mono">{tags.length} Active Tags</span>
                </div>

                {/* Quick Search and Selection */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAG_OPTIONS.map((tag) => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setTags((prev) =>
                              isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                            );
                          }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-teal-700 text-white shadow-sm border border-teal-800'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="nm-btn px-5 py-2.5 rounded-xl font-bold text-slate-600"
                >
                  &larr; Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="nm-btn-primary px-6 py-2.5 rounded-xl font-bold shadow-md"
                >
                  Proceed to Step 3: Commercial Terms &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COMMERCIAL TERMS & BANKING */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  Credit Limit, Payment Terms &amp; Operating Status
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Credit Limit (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-black text-teal-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Credit Term (Days) *</label>
                    <select
                      value={creditDays}
                      onChange={(e) => setCreditDays(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value={0}>0 Days (Cash on Delivery / COD)</option>
                      <option value={7}>7 Days Term</option>
                      <option value={15}>15 Days Term</option>
                      <option value={30}>30 Days Term (Standard)</option>
                      <option value={45}>45 Days Term (Distributor)</option>
                      <option value={60}>60 Days Term</option>
                      <option value={90}>90 Days Term (Special Tier)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Operating Status *</label>
                    <select
                      value={operatingStatus}
                      onChange={(e) => setOperatingStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-black bg-white"
                    >
                      <option value="NORMAL">NORMAL (Active Credit Book)</option>
                      <option value="HIGH_RISK">HIGH_RISK (Watchlist &amp; Approval Required)</option>
                      <option value="CREDIT_LOCKED">CREDIT_LOCKED (Stop Invoicing)</option>
                      <option value="SUSPENDED">SUSPENDED (Blacklisted)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tax & Banking Information */}
              <div className="nm-inset p-4 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block">
                  Tax Registration &amp; Commercial Bank Accounts
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">FBR Tax Filer Status</label>
                    <select
                      value={isTaxFiler ? 'FILER' : 'NON_FILER'}
                      onChange={(e) => setIsTaxFiler(e.target.value === 'FILER')}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold bg-white text-slate-800"
                    >
                      <option value="FILER">Active Taxpayer (FBR Active Filer)</option>
                      <option value="NON_FILER">Non-Filer (Standard WHT Applicable)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NTN Number</label>
                    <input
                      type="text"
                      value={ntn}
                      onChange={(e) => setNtn(e.target.value)}
                      placeholder="e.g. 1234567-8"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Commercial Bank Name *</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-bold text-slate-800 bg-white"
                    >
                      {PAKISTAN_COMMERCIAL_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bank IBAN / Account #</label>
                    <input
                      type="text"
                      value={bankIban}
                      onChange={(e) => setBankIban(e.target.value)}
                      placeholder="e.g. PK36MEZN0001234567890101"
                      className="w-full p-2.5 rounded-xl nm-inset text-xs font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl nm-flat cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isChequeVerificationMandatory}
                      onChange={(e) => setIsChequeVerificationMandatory(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-bold text-slate-800">
                      Mandatory Cheque Clearing (Dispatch only after bank clearance)
                    </span>
                  </label>
                </div>
              </div>

              {/* AI-Assisted Validation Feedback & Risk Assessment */}
              <div className="nm-inset p-4 rounded-2xl space-y-2.5 bg-[#EDF3F9] border border-teal-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700 animate-pulse" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      AI-Assisted Commercial Validation &amp; Credit Health
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                      aiValidationAssessment.riskLevel === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : aiValidationAssessment.riskLevel === 'MODERATE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Risk Level: {aiValidationAssessment.riskLevel}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {aiValidationAssessment.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-teal-900 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                  {aiValidationAssessment.issues.map((iss, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-amber-800 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{iss}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="nm-btn px-5 py-2.5 rounded-xl font-bold text-slate-600"
                >
                  &larr; Back to Step 2
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="nm-btn px-4 py-2.5 rounded-xl font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="nm-btn-primary px-7 py-2.5 rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform text-white"
                  >
                    {isEdit ? 'Save Changes' : 'Submit to Head Office Approval Queue'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
