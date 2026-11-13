import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Save,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Trash2,
  ShieldCheck,
  Moon,
  Sun,
  HardDrive,
  FileSpreadsheet,
  Smartphone,
  Check
} from 'lucide-react';
import {
  isAutoSaveEnabled,
  setAutoSaveEnabled,
  getDraftOrderProgress,
  clearDraftOrderProgress,
  getFormattedLastAutoSave,
  saveDraftOrderProgress,
  DraftOrderProgress
} from '../services/orderAutoSaveService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCartItems?: any[];
  currentCustomerId?: string;
  currentCustomerName?: string;
  onRestoreDraft?: (draft: DraftOrderProgress) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentCartItems = [],
  currentCustomerId,
  currentCustomerName,
  onRestoreDraft,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState<boolean>(() => isAutoSaveEnabled());
  const [draftProgress, setDraftProgress] = useState<DraftOrderProgress | null>(() => getDraftOrderProgress());
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAutoSaveEnabledState(isAutoSaveEnabled());
      setDraftProgress(getDraftOrderProgress());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoSave = (enabled: boolean) => {
    setAutoSaveEnabledState(enabled);
    setAutoSaveEnabled(enabled);
    if (enabled) {
      // Perform immediate initial save if cart items exist
      if (currentCartItems.length > 0) {
        const saved = saveDraftOrderProgress({
          items: currentCartItems,
          customerId: currentCustomerId,
          customerName: currentCustomerName
        });
        setDraftProgress(saved);
      }
      triggerToast('Auto-Save Enabled (Saves every 1 Hour to localStorage)');
    } else {
      triggerToast('Auto-Save Disabled');
    }
  };

  const handleManualAutoSave = () => {
    if (currentCartItems.length === 0 && !draftProgress) {
      triggerToast('No active cart items to auto-save.');
      return;
    }

    if (currentCartItems.length > 0) {
      const saved = saveDraftOrderProgress({
        items: currentCartItems,
        customerId: currentCustomerId,
        customerName: currentCustomerName
      });
      setDraftProgress(saved);
      triggerToast(`Saved ${currentCartItems.length} order items to localStorage.`);
    } else if (draftProgress) {
      triggerToast(`Draft order is already saved from ${getFormattedLastAutoSave() || 'earlier'}.`);
    }
  };

  const handleRestoreDraftClick = () => {
    if (!draftProgress) return;
    if (onRestoreDraft) {
      onRestoreDraft(draftProgress);
      triggerToast(`Restored ${draftProgress.items.length} order items from localStorage draft.`);
      onClose();
    }
  };

  const handleClearDraftClick = () => {
    clearDraftOrderProgress();
    setDraftProgress(null);
    triggerToast('Saved order draft cleared from localStorage.');
  };

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 text-teal-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white">Application Settings</h3>
              <p className="text-[11px] text-teal-200 font-medium">Configure Auto-Save, Storage & Field Preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 text-xs">

          {/* Toast Notification Banner */}
          {saveToast && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 rounded-2xl flex items-center gap-2 font-bold animate-slideDown">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{saveToast}</span>
            </div>
          )}

          {/* SECTION 1: AUTO-SAVE ORDER PROGRESS (HOURLY CRASH PROTECTION) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Order Auto-Save</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mobile browser crash prevention</p>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => handleToggleAutoSave(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Auto-Save Frequency:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-extrabold text-[10px] font-mono border border-teal-300 dark:border-teal-700">
                  Every 1 Hour (3,600s)
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                When enabled, your active order booking cart items and customer selection are saved to local device storage every hour. If your mobile browser closes or crashes in the field, your order progress remains intact.
              </p>

              {/* Status Indicator & Last Saved Time */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${autoSaveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {autoSaveEnabled ? 'Auto-Save is Active' : 'Auto-Save is Disabled'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {draftProgress ? (
                    <span className="text-teal-700 dark:text-teal-400 font-bold">
                      Last Saved: {getFormattedLastAutoSave()} ({draftProgress.items.length} items)
                    </span>
                  ) : (
                    <span>No draft order saved yet</span>
                  )}
                </div>
              </div>

              {/* Action Buttons for Auto-Save */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualAutoSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft Now</span>
                </button>

                {draftProgress && onRestoreDraft && (
                  <button
                    type="button"
                    onClick={handleRestoreDraftClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Restore Draft ({draftProgress.items.length} items)</span>
                  </button>
                )}

                {draftProgress && (
                  <button
                    type="button"
                    onClick={handleClearDraftClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Draft</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: SYSTEM APPEARANCE & BATTERY SAVER */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span>Display &amp; Battery Saver</span>
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Dark Theme (Outdoor Battery Saver)</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Optimizes OLED screen energy consumption during field visits</p>
              </div>

              {onToggleDarkMode ? (
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs hover:bg-slate-300 transition-all cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                  <span>{isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">System Default</span>
              )}
            </div>
          </div>

          {/* SECTION 3: STORAGE & SYSTEM SYNC ARCHITECTURE */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-teal-600" />
              <span>Storage &amp; Synchronization</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Primary DB:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Supabase PostgreSQL
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Master Sync:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Google Sheets DB
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            N-LINK 360 • Field Force v3.60
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            Close Settings
          </button>
        </div>

      </div>
    </div>
  );
};
