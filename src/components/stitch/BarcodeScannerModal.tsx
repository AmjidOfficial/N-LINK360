/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Barcode Camera Scanner Component
 * Modeled after Dukan360 Barcode Scanner feature
 */

import React, { useState, useEffect, useRef } from 'react';
import { NLINK_OFFICIAL_PRODUCTS, NLinkSKU } from '../../data/nlink-products';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (product: NLinkSKU) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductScanned,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<string>('Align barcode inside frame');

  // Play auditory beep on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1800;
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio context ignored if not permitted
    }
  };

  // Start Camera Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (isOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          })
          .then((mediaStream) => {
            activeStream = mediaStream;
            setStream(mediaStream);
            setCameraActive(true);
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch(() => {
            setCameraActive(false);
            setScanMessage('Camera unavailable. Use manual barcode entry or select below.');
          });
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanProduct = (sku: NLinkSKU) => {
    playBeep();
    setScanMessage(`✓ Scanned: ${sku.name}`);
    setTimeout(() => {
      onProductScanned(sku);
      onClose();
    }, 400);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualCode.trim().toLowerCase();
    if (!query) return;

    const found = NLINK_OFFICIAL_PRODUCTS.find(
      (p) =>
        p.skuCode.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.wattage.toLowerCase().includes(query)
    );

    if (found) {
      handleScanProduct(found);
    } else {
      setScanMessage(`No SKU found for barcode "${manualCode}"`);
    }
  };

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[24px]">
              barcode_scanner
            </span>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Barcode Scanner
              </h3>
              <p className="text-[11px] text-slate-400">Scan product packaging</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative w-full h-64 bg-black flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-4 text-center">
              <span className="material-symbols-outlined text-[48px] mb-2 opacity-60">
                photo_camera
              </span>
              <span className="text-xs">Camera Feed Ready</span>
            </div>
          )}

          {/* Scanner Targeting Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <div className="w-56 h-36 border-2 border-emerald-400/90 rounded-2xl relative shadow-lg shadow-emerald-500/20">
              {/* Laser Line Animation */}
              <div className="absolute left-1 right-1 h-0.5 bg-rose-500 shadow-md shadow-rose-500 animate-pulse top-1/2 -translate-y-1/2" />
              <div className="absolute top-1 left-2 text-[9px] font-mono text-emerald-300 font-bold">
                EAN-13 / CODE-128
              </div>
            </div>
          </div>

          <div className="absolute bottom-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-emerald-300">
            {scanMessage}
          </div>
        </div>

        {/* Manual Barcode Entry Form */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                qr_code
              </span>
              <input
                type="text"
                placeholder="Type Barcode or SKU Code (e.g. NL-TB-12W)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Enter
            </button>
          </form>
        </div>

        {/* Quick Tap Simulation SKUs */}
        <div className="p-4 flex flex-col gap-2 max-h-48 overflow-y-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Scan Direct Test (Simulated Barcodes):
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {NLINK_OFFICIAL_PRODUCTS.slice(0, 4).map((sku) => (
              <button
                key={sku.id}
                type="button"
                onClick={() => handleScanProduct(sku)}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400 group-hover:scale-110 transition-transform">
                    barcode
                  </span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{sku.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Code: {sku.skuCode} • TP: Rs. {sku.tradePrice}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-md shrink-0">
                  Scan +
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
