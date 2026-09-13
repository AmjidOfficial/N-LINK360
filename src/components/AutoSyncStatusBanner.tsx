import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  HardDrive,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  TableProperties,
} from 'lucide-react';
import {
  subscribeToAutoSync,
  AutoSyncStatus,
  uploadAllLocalDataNow,
  TARGET_SPREADSHEET_ID,
} from '../services/googleSheetsTwoWaySyncService';
import { getAccessToken, googleSignIn, getCurrentGoogleUser } from '../services/googleAuth';
import { SupabaseAppData } from '../services/supabase-data';

interface AutoSyncStatusBannerProps {
  appData: SupabaseAppData;
  onOpenSyncModal: () => void;
  onSyncComplete?: (message: string) => void;
  compact?: boolean;
}

export const AutoSyncStatusBanner: React.FC<AutoSyncStatusBannerProps> = ({
  appData,
  onOpenSyncModal,
  onSyncComplete,
  compact = false,
}) => {
  const [syncStatus, setSyncStatus] = useState<AutoSyncStatus>({
    isEnabled: true,
    isSyncing: false,
    lastSyncTime: null,
    nextSyncTarget: Date.now() + 30 * 60 * 1000,
    secondsRemaining: 1800,
    pendingUploadsCount: 0,
    lastError: null,
    lastSummaryMessage: null,
  });
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAutoSync((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  // Format seconds to mm:ss
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Immediate upload all local data triggered by user clicking submit
  const handleUploadAllNow = async () => {
    setIsManualSubmitting(true);
    setToastMessage(null);

    let token = getAccessToken();
    if (!token) {
      try {
        const signinResult = await googleSignIn();
        token = signinResult?.accessToken || null;
      } catch (err: any) {
        setToastMessage('Google authorization needed to upload directly to spreadsheet.');
        setIsManualSubmitting(false);
        return;
      }
    }

    try {
      const res = await uploadAllLocalDataNow(appData, token);
      setToastMessage(res.message);
      if (onSyncComplete) onSyncComplete(res.message);
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      setToastMessage(err?.message || 'Upload failed. All records remain safely stored in Local Storage.');
      setTimeout(() => setToastMessage(null), 7000);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const isOperating = syncStatus.isSyncing || isManualSubmitting;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={handleUploadAllNow}
          disabled={isOperating}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          title="Upload all local data to Google Sheet immediately"
        >
          <UploadCloud className={`w-3.5 h-3.5 ${isOperating ? 'animate-bounce' : ''}`} />
          <span>{isOperating ? 'Syncing...' : 'Upload to Sheet'}</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-lg font-medium border border-slate-200">
          <Clock className="w-3 h-3 text-emerald-600" />
          <span>Auto-Sync in: <strong>{formatCountdown(syncStatus.secondsRemaining)}</strong></span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-900/90 via-teal-900 to-slate-900 text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-emerald-500/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Info & Target Sheet */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-wide uppercase text-emerald-300">
                2-Way Google Sheet Database
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Sync: Every 30 Mins
              </span>
              {syncStatus.pendingUploadsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/50">
                  {syncStatus.pendingUploadsCount} Pending Upload
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                Next Auto-Sync in: <strong className="text-white font-black">{formatCountdown(syncStatus.secondsRemaining)}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-teal-400" />
                Local Storage: <strong className="text-emerald-300 font-bold">100% Persisted</strong>
              </span>
              {syncStatus.lastSyncTime && (
                <>
                  <span className="text-slate-500">•</span>
                  <span>Last Synced: <strong className="text-slate-200">{syncStatus.lastSyncTime}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Immediate Upload / Submit to Sheet Button */}
          <button
            type="button"
            onClick={handleUploadAllNow}
            disabled={isOperating}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Click to immediately upload all local orders, recoveries, and database records to Google Sheets now"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isOperating ? 'animate-bounce' : ''}`} />
            <span>{isOperating ? 'Uploading Data...' : 'Submit / Upload All Now'}</span>
          </button>

          {/* Open Google Sheet DB Modal */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
            title="Manage 2-Way Sync & View Sheet Schema"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">2-Way Sync Settings</span>
          </button>

          {/* Open Sheet directly in new tab */}
          <a
            href={`https://docs.google.com/spreadsheets/d/${TARGET_SPREADSHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
            title="Open Google Sheet in Google Drive"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Toast / Notification feedback */}
      {toastMessage && (
        <div className="mt-2.5 text-xs px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-400/40 text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}
      {syncStatus.lastError && !toastMessage && (
        <div className="mt-2.5 text-xs px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-400/40 text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="leading-snug">{syncStatus.lastError}</span>
        </div>
      )}
    </div>
  );
};
