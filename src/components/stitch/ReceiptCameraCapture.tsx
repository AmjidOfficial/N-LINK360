/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Direct Camera & Proof Upload Component
 * Allows live camera snapshot taking or file / gallery upload with preview
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Eye,
  CheckCircle2,
  ZoomIn,
  Trash2,
  Receipt,
} from 'lucide-react';

export interface ReceiptCameraCaptureProps {
  receiptImage: string | null;
  receiptFileName: string | null;
  onCapture: (imageDataUrl: string, fileName: string) => void;
  onClear: () => void;
}

export const ReceiptCameraCapture: React.FC<ReceiptCameraCaptureProps> = ({
  receiptImage,
  receiptFileName,
  onCapture,
  onClear,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Direct browser camera access was blocked or unsupported. Falling back to native device camera.'
      );
      // Fallback: Trigger native camera file picker
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Flip Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Take Snapshot
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `camera_proof_${timestamp}.jpg`;

      onCapture(dataUrl, fileName);
      stopCamera();
    }
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onCapture(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* When No Receipt is Captured Yet */}
      {!receiptImage && !isCameraActive && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* 1. Open Camera Button */}
          <button
            type="button"
            onClick={() => startCamera()}
            className="flex-1 min-h-[52px] bg-[#0F172A] dark:bg-[#1E293B] text-white p-3.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-slate-800 transition-all border border-slate-700 shadow-xs active:scale-98 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#16A34A]/20 text-[#4ADE80] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold text-white">Open Camera for Direct Pic</span>
              <span className="text-[10px] text-slate-300">Snap paper receipt or bank slip</span>
            </div>
          </button>

          {/* 2. Upload File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[52px] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-slate-100 p-3.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-[#E2E8F0] dark:border-slate-700 shadow-xs active:scale-98 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#1E293B] text-[#16A34A] border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">Upload from Gallery / PDF</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Pick image or transaction PDF</span>
            </div>
          </button>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && (
        <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-[#16A34A] shadow-lg flex flex-col items-center">
          <div className="relative w-full aspect-4/3 max-h-[320px] bg-slate-900 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Target Alignment Overlay Guide */}
            <div className="absolute inset-6 border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[11px] font-bold text-white/90 bg-black/60 px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-xs">
                Align Receipt Inside Box
              </span>
            </div>
          </div>

          {/* Camera Controls Bar */}
          <div className="w-full bg-[#0F172A] p-3 flex items-center justify-between px-4 border-t border-slate-800">
            <button
              type="button"
              onClick={stopCamera}
              className="min-h-[44px] px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>

            {/* Big Shutter Button */}
            <button
              type="button"
              onClick={capturePhoto}
              aria-label="Capture photo"
              className="w-14 h-14 rounded-full bg-white border-4 border-[#16A34A] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#16A34A]" />
            </button>

            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="min-h-[44px] px-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>
        </div>
      )}

      {/* Display Captured or Uploaded Proof Preview */}
      {receiptImage && (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-3 border border-[#E2E8F0] dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => setIsPreviewModalOpen(true)}
              className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 overflow-hidden shrink-0 cursor-pointer relative group"
            >
              <img
                src={receiptImage}
                alt="Receipt Proof"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Eye className="w-4 h-4" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white line-clamp-1">
                  {receiptFileName || 'Receipt Proof Attached'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Captured on {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Ready to sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all cursor-pointer"
              title="View full image"
              aria-label="View full image"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClear}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
              title="Remove receipt"
              aria-label="Remove receipt"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox Modal */}
      {isPreviewModalOpen && receiptImage && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden shadow-2xl border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col">
            <div className="p-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800">
              <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#16A34A]" />
                Receipt / Collection Proof
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                aria-label="Close preview"
                className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-[#0B1120] max-h-[75vh] overflow-auto">
              <img
                src={receiptImage}
                alt="Full receipt"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-[#0F172A] border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="btn-outline min-h-[44px] border-slate-600 text-white hover:bg-slate-800 text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
          {cameraError}
        </p>
      )}
    </div>
  );
};
