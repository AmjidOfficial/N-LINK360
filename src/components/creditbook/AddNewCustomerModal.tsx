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
    currentUser.fullName?.toLowerCase().includes('shahzad') ||
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGING_DIRECTOR';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = businessName.trim();
    if (!cleanName) {
      setError('Please enter the Business / Shop Name.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Add New Customer / Dealer</h2>
              <p className="text-[11px] text-teal-100/80">
                {isShahzadOrAdmin
                  ? 'Immediate registration with executive approval'
                  : 'Requires final sign-off from Shahzad Ullah'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold">
              {error}
            </div>
          )}

          {/* Authorization Notice */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-amber-800 dark:text-amber-300">
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
            <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              Business / Shop Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Iqbal Electric, Khyber Traders"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Channel Type */}
          <div className="space-y-1">
            <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Channel Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannelType('DEALER')}
                className={`p-2.5 rounded-xl font-black text-center transition-all cursor-pointer ${
                  channelType === 'DEALER'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                DEALER / RETAILER
              </button>
              <button
                type="button"
                onClick={() => setChannelType('DISTRIBUTOR')}
                className={`p-2.5 rounded-xl font-black text-center transition-all cursor-pointer ${
                  channelType === 'DISTRIBUTOR'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                DISTRIBUTOR / WHOLESALER
              </button>
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-teal-700" />
                Contact Person / Owner
              </label>
              <input
                type="text"
                placeholder="e.g. Iqbal Ahmad"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700" />
                Phone / WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0349-9255567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Town / City Selection */}
          <div className="space-y-1">
            <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              Town / City *
            </label>
            <select
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
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
                className="w-full mt-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 border border-teal-500 rounded-xl font-bold text-slate-900 dark:text-white outline-none"
              />
            )}
          </div>

          {/* Market / Route Address */}
          <div className="space-y-1">
            <label className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Market / Route Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop #14, Main Bazaar, Mingora"
              value={marketAddress}
              onChange={(e) => setMarketAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Financials: Opening Balance & Credit Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-teal-700" />
                Opening Balance
              </label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-teal-700" />
                Credit Limit (PKR)
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-700" />
                Credit Days
              </label>
              <input
                type="number"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-700 hover:to-emerald-600 text-white font-black flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isShahzadOrAdmin ? 'REGISTER & APPROVE' : 'SUBMIT FOR APPROVAL'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
