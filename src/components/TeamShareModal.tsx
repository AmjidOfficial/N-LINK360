/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Team Working Link Share Modal
 * Provides a unique, verified link for the team to open the app for daily field work & management.
 * Features:
 * 1. Smart Auto-Detect link (Opens Mobile version on phones, Web Portal on Laptops)
 * 2. Dedicated Mobile Link & Dedicated Desktop Link
 * 3. 1-Tap WhatsApp Share with pre-composed professional message
 * 4. 1-Tap Copy Link to Clipboard
 * 5. Visual on-screen QR Code for instant phone camera scanning
 */

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Sparkles,
  QrCode,
  ExternalLink,
  MessageCircle,
  Users,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getCleanShareableUrl } from '../utils/deviceDetection';

export interface TeamShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const TeamShareModal: React.FC<TeamShareModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [copiedMode, setCopiedMode] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen) return null;

  const currentUrl = getCleanShareableUrl(selectedMode);
  const autoUrl = getCleanShareableUrl('auto');
  const mobileUrl = getCleanShareableUrl('mobile');
  const desktopUrl = getCleanShareableUrl('desktop');

  const handleCopy = (url: string, label: string) => {
    triggerHaptic('success');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedMode(label);
    setTimeout(() => setCopiedMode(null), 2500);
  };

  const handleWhatsAppShare = () => {
    triggerHaptic('medium');
    const officerName = currentUser?.fullName || 'National Lights Team';
    const message = 
`⚡ *N-LINK 360 — National Lights Enterprise System* ⚡

Assalam-o-Alaikum Team!
Here is the official link to open the app for field orders, recovery collection, attendance check-in, and ledger accounting:

🔗 *Open App Link:*
${currentUrl}

📱 *Mobile Phones:* Automatically opens the fast Field Touch version.
💻 *Laptops / Desktops:* Automatically opens the Head Office Command Center.

_Authorized by Executive Director Shahzad Ullah_
Shared by: ${officerName}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Simple clean SVG QR code visual generator
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=004d40&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Share2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Share Team Working Link
              </h2>
              <p className="text-xs text-teal-200/90 font-medium">
                100% Production Ready • Direct Access for National Lights Team
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          
          {/* Target Mode Selector Tabs */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Select Link Behavior for Sharing:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedMode('auto');
                }}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedMode === 'auto'
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-600 text-teal-900 dark:text-teal-200 font-black shadow-xs ring-1 ring-teal-500'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[11px]">Auto-Detect</span>
                <span className="text-[9px] font-normal text-slate-500">Phones &rarr; Mobile, PC &rarr; Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedMode('mobile');
                }}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedMode === 'mobile'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-black shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">Direct Mobile</span>
                <span className="text-[9px] font-normal text-slate-500">For field officers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedMode('desktop');
                }}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedMode === 'desktop'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-200 font-black shadow-xs ring-1 ring-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100'
                }`}
              >
                <Laptop className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px]">Direct Desktop</span>
                <span className="text-[9px] font-normal text-slate-500">Command Center</span>
              </button>
            </div>
          </div>

          {/* Clean URL Box with Copy Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Official Working URL:
              </span>
              {copiedMode && (
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  Copied to Clipboard!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-transparent px-2 font-mono text-[11px] text-slate-800 dark:text-slate-200 outline-none truncate font-bold"
              />
              <button
                type="button"
                onClick={() => handleCopy(currentUrl, selectedMode)}
                className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                {copiedMode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[46px] p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className="min-h-[46px] p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <QrCode className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>{showQrCode ? 'Hide QR Code' : 'Scan Phone QR Code'}</span>
            </button>
          </div>

          {/* QR Code Container */}
          {showQrCode && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3 animate-in fade-in duration-200">
              <div className="bg-white p-3 rounded-2xl inline-block shadow-sm border border-slate-200">
                <img
                  src={qrSvgUrl}
                  alt="N-LINK 360 QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium max-w-xs mx-auto">
                Scan this QR code with any smartphone camera to open the application directly on field rounds.
              </p>
            </div>
          )}

          {/* Feature Highlights for Field Team */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-slate-600 dark:text-slate-300">
            <span className="font-black text-slate-900 dark:text-white block uppercase tracking-wider text-[10px]">
              What team members can do once opened:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">&bull;</span>
                <span>Check-in GPS Attendance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">&bull;</span>
                <span>Book Orders with SKUs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">&bull;</span>
                <span>Record Recovery &amp; Slips</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-black">&bull;</span>
                <span>View Full Dealer Ledger</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono">
            N-LINK 360 &bull; Verified Production Build
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
