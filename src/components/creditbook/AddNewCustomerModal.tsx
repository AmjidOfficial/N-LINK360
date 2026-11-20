import React, { useState } from 'react';
import { X, Building2, User as UserIcon, Phone, MapPin, DollarSign, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Customer, User } from '../../types';

interface AddNewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
  currentUser: User;
  availableTowns?: string[];
}

const DEFAULT_TOWNS: string[] = [
  'Mingora',
  'Peshawar',
  'Abbottabad',
  'Rawalpindi',
  'Islamabad',
  'Lahore',
  'Mardan',
  'Swat',
  'Duran Pur',
  'Karachi',
];

export const AddNewCustomerModal: React.FC<AddNewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  availableTowns = DEFAULT_TOWNS,
}) => {
  const safeTowns = availableTowns && availableTowns.length > 0 ? availableTowns : DEFAULT_TOWNS;
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [channelType, setChannelType] = useState<'DEALER' | 'DISTRIBUTOR'>('DEALER');
  const [town, setTown] = useState(() => safeTowns.find((t) => t !== 'All Towns') || 'Mingora');
  const [customTown, setCustomTown] = useState('');
  const [marketAddress, setMarketAddress] = useState('');
  const [cnic, setCnic] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('500000');
  const [creditDays, setCreditDays] = useState('30');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isShahzadOrAdmin =
    Boolean(currentUser.fullName?.toLowerCase().includes('shahzad')) ||
    (currentUser.role as string) === 'SUPER_ADMIN' ||
    (currentUser.role as string) === 'MANAGING_DIRECTOR' ||
    (currentUser.role as string) === 'EXECUTIVE_DIRECTOR' ||
    (currentUser.role as string) === 'MANAGEMENT';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = businessName.trim();
    if (!cleanName) {
      setError('Please enter the Dealer / Distributor Name.');
      return;
    }

    const finalTown = (town === '__NEW__' ? customTown.trim() : town.trim()) || 'Mingora';
    const cleanPhone = phone.trim();
    const cleanContact = contactPerson.trim();

    // Auto-generate Customer Code: DL-<SLUG> or DS-<SLUG>
    const prefix = channelType === 'DISTRIBUTOR' ? 'DS' : 'DL';
    const slug = cleanName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
    const customerCode = `${prefix}-${slug || Date.now().toString().slice(-4)}`;

    const numOpeningBal = Number(openingBalance.replace(/[^0-9.-]/g, '')) || 0;
    const numLimit = Number(creditLimit.replace(/[^0-9.-]/g, '')) || 500000;
    const numDays = Number(creditDays) || 30;

    const newCust: Customer = {
      id: customerCode,
      customerCode,
      companyName: cleanName,
      contactPerson: cleanContact || cleanName,
      phone: cleanPhone || '0300-0000000',
      type: channelType,
      town: finalTown,
      city: finalTown,
      region: finalTown,
      address: marketAddress.trim() || `${finalTown} Main Market`,
      cnic: cnic.trim() || undefined,
      openingBalance: numOpeningBal,
      currentBalance: numOpeningBal,
      creditLimit: numLimit,
      creditDays: numDays,
      isCreditLocked: false,
      isActive: isShahzadOrAdmin,
      approvalStatus: isShahzadOrAdmin ? 'APPROVED' : 'PENDING_APPROVAL',
      status: isShahzadOrAdmin ? 'ACTIVE' : 'PENDING_APPROVAL',
      registeredBy: currentUser.fullName,
      submittedBy: currentUser.fullName,
      creatorEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] font-bold flex items-center justify-center text-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">Add New Dealer / Distributor</h2>
              <p className="text-[11px] text-slate-300 truncate">
                {isShahzadOrAdmin
                  ? 'Immediate registration with executive approval'
                  : 'Requires final sign-off from Shahzad Ullah'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold">
              {error}
            </div>
          )}

          {/* Authorization Notice */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-[11px] leading-relaxed">
              <strong>Mandatory Protocol:</strong>{' '}
              {isShahzadOrAdmin ? (
                <span>You are signed in with executive signing authority. Dealer will be activated instantly.</span>
              ) : (
                <span>
                  All new dealers and distributors require <strong>Final Approval from Shahzad Ullah</strong> before
                  credit invoices can be disbursed.
                </span>
              )}
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
              Business / Shop Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Iqbal Electric, Khyber Traders"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full min-h-[44px] p-3 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Channel Type */}
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Channel Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannelType('DEALER')}
                className={`min-h-[44px] p-2.5 rounded-xl font-bold text-center transition-all cursor-pointer ${
                  channelType === 'DEALER'
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                DEALER / RETAILER
              </button>
              <button
                type="button"
                onClick={() => setChannelType('DISTRIBUTOR')}
                className={`min-h-[44px] p-2.5 rounded-xl font-bold text-center transition-all cursor-pointer ${
                  channelType === 'DISTRIBUTOR'
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                DISTRIBUTOR / WHOLESALER
              </button>
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
                Contact Person / Owner
              </label>
              <input
                type="text"
                placeholder="e.g. Iqbal Ahmad"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full min-h-[44px] p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#3B82F6]" />
                Phone / WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0349-9255567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl font-mono tabular-nums font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Town / City Selection */}
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" />
              Town / City *
            </label>
            <select
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="w-full min-h-[44px] p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6] cursor-pointer"
            >
              {safeTowns
                .filter((t) => t !== 'All Towns')
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              <option value="__NEW__">+ Enter Other Town...</option>
            </select>

            {town === '__NEW__' && (
              <input
                type="text"
                placeholder="Enter city / town name"
                value={customTown}
                onChange={(e) => setCustomTown(e.target.value)}
                className="w-full min-h-[44px] mt-1.5 p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#3B82F6] rounded-xl font-bold text-[#0F172A] dark:text-white outline-none"
              />
            )}
          </div>

          {/* Market / Route Address */}
          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Market / Route Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop #14, Main Bazaar, Mingora"
              value={marketAddress}
              onChange={(e) => setMarketAddress(e.target.value)}
              className="w-full min-h-[44px] p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl font-bold text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Financials: Opening Balance & Credit Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#3B82F6]" />
                Opening Balance
              </label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full min-h-[44px] p-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-lg font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#3B82F6]" />
                Credit Limit (PKR)
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full min-h-[44px] p-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-lg font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#3B82F6]" />
                Credit Days
              </label>
              <input
                type="number"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full min-h-[44px] p-2 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-lg font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline min-h-[44px] text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary min-h-[44px] text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isShahzadOrAdmin ? 'Register & Approve' : 'Submit for Approval'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
