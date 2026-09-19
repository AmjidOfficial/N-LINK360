/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Daily Expense Logging Modal (Maali Hisab)
 * Modeled after Dukan360 Daily Expense recording module
 */

import React, { useState } from 'react';

export interface DailyExpenseRecord {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  loggedBy: string;
  timestamp: string;
}

interface DailyExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: DailyExpenseRecord) => void;
  currentUserFullName: string;
}

const QUICK_CATEGORIES = [
  { label: 'Chai / Tea', icon: 'coffee', amount: 50 },
  { label: 'Fuel / Petrol', icon: 'local_gas_station', amount: 1500 },
  { label: 'Van Maintenance', icon: 'build', amount: 800 },
  { label: 'Toll Plaza', icon: 'toll', amount: 120 },
  { label: 'Lunch / Kharcha', icon: 'restaurant', amount: 350 },
  { label: 'Shop Rent', icon: 'store', amount: 5000 },
  { label: 'Bijli Bill', icon: 'bolt', amount: 3500 },
];

export const DailyExpenseModal: React.FC<DailyExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  currentUserFullName,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('Chai / Tea');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof QUICK_CATEGORIES[0]) => {
    setSelectedPreset(preset.label);
    setDescription(preset.label);
    if (!amount) {
      setAmount(preset.amount.toString());
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount in Rs.');
      return;
    }

    const newRecord: DailyExpenseRecord = {
      id: `EXP-${Date.now()}`,
      date,
      amount: numAmount,
      description: description.trim() || selectedPreset,
      category: selectedPreset,
      loggedBy: currentUserFullName,
      timestamp: new Date().toISOString(),
    };

    onSaveExpense(newRecord);
    setAmount('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <div
      id="daily-expense-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">price_change</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Expense (Kharcha)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Log daily field & shop cash expenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#006b5f] outline-none"
            />
          </div>

          {/* Amount in PKR */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Amount (Rs.)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Rs.
              </span>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006b5f] outline-none font-mono"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Quick Category Chips
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CATEGORIES.map((cat) => {
                const isSelected = selectedPreset === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => handlePresetSelect(cat)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
                      isSelected
                        ? 'bg-[#006b5f] text-white shadow-xs font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Remarks */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
              Description (Optional Details)
            </label>
            <input
              type="text"
              placeholder="e.g. Chai for guests at Mingora market..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006b5f] outline-none"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>SAVE EXPENSE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
