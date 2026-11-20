import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Users,
  Building2,
  Store,
  Layers,
  ShoppingBag,
  DollarSign,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Clock,
  HardDrive,
  UploadCloud,
  Check,
  Link2,
  Copy,
} from 'lucide-react';
import {
  getGoogleSheetsWebhookUrl,
  setGoogleSheetsWebhookUrl,
  syncToGoogleSheetsWebhook,
  GOOGLE_APPS_SCRIPT_CODE,
} from '../services/google-sheets';
import {
  TARGET_SPREADSHEET_ID,
  getActiveSpreadsheetId,
  setActiveSpreadsheetId,
  fetchSpreadsheetMetadata,
  syncDatabaseToGoogleSheet,
  SheetMetadata,
} from '../services/googleSheetsLiveService';
import type { SupabaseAppData } from '../services/supabase-data';
import {
  executeGoogleSheetImport,
  getSavedImportAuditLogs,
  ImportSummary,
} from '../services/googleSheetImportService';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getCurrentGoogleUser,
  getAccessToken,
} from '../services/googleAuth';
import {
  executeTwoWaySync,
  subscribeToAutoSync,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  AutoSyncStatus,
  getPendingUploads,
  getLocalDatabaseCache,
  retrySinglePendingUpload,
  removePendingUpload,
  PendingUploadItem,
} from '../services/googleSheetsTwoWaySyncService';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: SupabaseAppData;
  onSyncComplete?: (message: string) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onSyncComplete,
}) => {
  const [activeMode, setActiveMode] = useState<'FULL_SYNC' | 'IMPORT' | 'EXPORT' | 'OFFLINE_QUEUE' | 'WEBHOOK'>('FULL_SYNC');
  const [customWebhookUrl, setCustomWebhookUrl] = useState(getGoogleSheetsWebhookUrl());
  const [copiedScript, setCopiedScript] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(getActiveSpreadsheetId());
  const [user, setUser] = useState<any>(getCurrentGoogleUser());
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<SheetMetadata | null>(null);

  // Import states
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(() => {
    const logs = getSavedImportAuditLogs();
    return logs.length > 0 ? logs[0] : null;
  });
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [pendingImportScope, setPendingImportScope] = useState<'USERS' | 'CUSTOMERS' | 'ALL' | null>(null);

  // Export states
  const [showConfirmExport, setShowConfirmExport] = useState<boolean>(false);
  const [opStatus, setOpStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus>({
    isEnabled: true,
    isSyncing: false,
    lastSyncTime: null,
    nextSyncTarget: Date.now() + 30 * 60 * 1000,
    secondsRemaining: 1800,
    pendingUploadsCount: 0,
    lastError: null,
    lastSummaryMessage: null,
  });

  useEffect(() => {
    const unsub = subscribeToAutoSync((status) => {
      setAutoSyncStatus(status);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token && spreadsheetId) {
      loadSheetMetadata();
    }
  }, [token, spreadsheetId]);

  const loadSheetMetadata = async () => {
    if (!token) return;
    try {
      const meta = await fetchSpreadsheetMetadata(spreadsheetId, token);
      setMetadata(meta);
    } catch (err: any) {
      console.warn('Could not load spreadsheet metadata:', err);
    }
  };

  const [pendingItems, setPendingItems] = useState<PendingUploadItem[]>([]);
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setPendingItems(getPendingUploads());
  }, [autoSyncStatus]);

  const handleRetryItem = async (id: string) => {
    setRetryingIds(prev => ({ ...prev, [id]: true }));
    setOpStatus({ type: 'idle' });
    try {
      await retrySinglePendingUpload(id, token);
      setPendingItems(getPendingUploads());
      setOpStatus({
        type: 'success',
        message: '✓ Transaction synchronized successfully to Google Sheet!',
      });
      if (onSyncComplete) {
        onSyncComplete('Individual transaction synchronized successfully.');
      }
    } catch (err: any) {
      setOpStatus({
        type: 'error',
        message: `Failed to retry transaction: ${err.message || err}`,
      });
    } finally {
      setRetryingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteItem = (id: string) => {
    removePendingUpload(id);
    setPendingItems(getPendingUploads());
    setOpStatus({
      type: 'success',
      message: '✓ Transaction removed from queue.',
    });
    if (onSyncComplete) {
      onSyncComplete('Transaction removed from queue.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setOpStatus({ type: 'idle' });
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setOpStatus({
          type: 'success',
          message: `Connected Google Account: ${res.user.email}`,
        });
      }
    } catch (err: any) {
      setOpStatus({
        type: 'error',
        message: err.message || 'Failed to sign in with Google',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setUser(null);
    setToken(null);
    setMetadata(null);
    setOpStatus({ type: 'idle' });
  };

  // Run Full 2-Way Sync (Update All Database & All Google Sheets)
  const handleExecuteFullSync = async () => {
    if (!token) {
      setOpStatus({
        type: 'error',
        message: 'Please sign in with Google first to authorize spreadsheet synchronization.',
      });
      return;
    }

    setIsOperating(true);
    setOpStatus({ type: 'idle' });

    try {
      const res = await executeTwoWaySync(appData, token);
      if (res.importedSummary) {
        setImportSummary(res.importedSummary);
      }

      setOpStatus({
        type: 'success',
        message: res.message,
      });
      if (onSyncComplete) {
        onSyncComplete(res.message);
      }
      loadSheetMetadata();
    } catch (err: any) {
      setOpStatus({
        type: 'error',
        message: err?.message || 'Failed during two-way synchronization with Google Sheets.',
      });
    } finally {
      setIsOperating(false);
    }
  };

  // Run Import from Sheet to Supabase
  const handleExecuteImport = async (scope: 'USERS' | 'CUSTOMERS' | 'ALL') => {
    if (!token) {
      setOpStatus({
        type: 'error',
        message: 'Please sign in with Google first to authorize access to the spreadsheet.',
      });
      return;
    }

    setPendingImportScope(null);
    setIsOperating(true);
    setOpStatus({ type: 'idle' });

    try {
      const summary = await executeGoogleSheetImport(spreadsheetId, token, scope);
      setImportSummary(summary);
      setOpStatus({
        type: 'success',
        message: `Import complete: ${summary.createdCount} created, ${summary.updatedCount} updated, ${summary.failedCount} failed.`,
      });
      if (onSyncComplete) {
        onSyncComplete(`Synchronized ${summary.createdCount + summary.updatedCount} records from Google Sheet.`);
      }
    } catch (err: any) {
      setOpStatus({
        type: 'error',
        message: err?.message || 'Failed to import data from Google Sheet.',
      });
    } finally {
      setIsOperating(false);
    }
  };

  // Run Export from Supabase to Sheet
  const handleExecuteExport = async () => {
    if (!token) {
      setOpStatus({
        type: 'error',
        message: 'Please sign in with Google first to authorize Google Sheets API.',
      });
      return;
    }

    setShowConfirmExport(false);
    setIsOperating(true);
    setOpStatus({ type: 'idle' });

    try {
      const result = await syncDatabaseToGoogleSheet(spreadsheetId, appData, token);
      setOpStatus({
        type: 'success',
        message: result.message,
      });
      if (onSyncComplete) {
        onSyncComplete(result.message);
      }
      loadSheetMetadata();
    } catch (err: any) {
      setOpStatus({
        type: 'error',
        message: err.message || 'Failed to export to Google Sheet',
      });
    } finally {
      setIsOperating(false);
    }
  };

  if (!isOpen) return null;

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E293B] w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-slate-700/80 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col text-[#0F172A] dark:text-slate-100">
        {/* Header */}
        <div className="bg-[#0F172A] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] border border-[#3B82F6]/40 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-wide truncate">Google Sheets Integration</h2>
              <p className="text-xs text-slate-300 font-medium truncate">
                Master Data Import &amp; Production Database Synchronization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Google Sheets modal"
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 p-2 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700/80 shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveMode('FULL_SYNC'); setOpStatus({ type: 'idle' }); }}
            className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeMode === 'FULL_SYNC'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>2-Way Sync</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('IMPORT'); setOpStatus({ type: 'idle' }); }}
            className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeMode === 'IMPORT'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
            <span>Import</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('EXPORT'); setOpStatus({ type: 'idle' }); }}
            className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeMode === 'EXPORT'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 shrink-0" />
            <span>Push</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('OFFLINE_QUEUE'); setOpStatus({ type: 'idle' }); }}
            className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeMode === 'OFFLINE_QUEUE'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Queue</span>
            {pendingItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#F97316] text-white text-[9px] font-mono tabular-nums font-bold leading-none">
                {pendingItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('WEBHOOK'); setOpStatus({ type: 'idle' }); }}
            className={`min-h-[40px] py-1.5 px-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              activeMode === 'WEBHOOK'
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>Webhook</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Spreadsheet Card */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Target Google Spreadsheet
              </span>
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#3B82F6] hover:underline flex items-center gap-1"
              >
                <span>Open in Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => {
                setSpreadsheetId(e.target.value);
                setActiveSpreadsheetId(e.target.value);
              }}
              placeholder="Google Spreadsheet ID"
              className="w-full min-h-[44px] text-xs font-mono tabular-nums font-bold bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-3 py-2 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#3B82F6]"
            />
            {metadata && (
              <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Sheet:</span>
                <span className="font-bold text-[#0F172A] dark:text-white bg-white dark:bg-[#1E293B] px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700">
                  {metadata.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  ({metadata.sheets.length} worksheets detected)
                </span>
              </div>
            )}
          </div>

          {/* Google Auth Status Card */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    user
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {user ? 'Connected' : 'Auth Required'}
                </span>
                <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                  {user ? 'Google Account Connected' : 'Google Authentication Required'}
                </span>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="min-h-[36px] px-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2.5 bg-white dark:bg-[#1E293B] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700">
                <div className="w-7 h-7 rounded-lg bg-[#3B82F6] text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoadingAuth}
                className="btn-outline w-full min-h-[44px] text-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoadingAuth ? 'Connecting Google Account...' : 'Sign in with Google Account'}</span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* TAB 0: 2-WAY FULL SYNC (ALL DATABASE & ALL GOOGLE SHEETS) */}
          {/* ========================================================= */}
          {activeMode === 'FULL_SYNC' && (
            <div className="space-y-4">
              {/* 30-Minute Auto-Sync & Local Storage Banner */}
              <div className="p-4 rounded-xl bg-[#0F172A] text-white border border-slate-700/80 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-white">
                          Auto-Sync Engine (Every 30 Minutes)
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            autoSyncStatus.isEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {autoSyncStatus.isEnabled ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Automatically runs full 2-way database synchronization every 30 minutes in background.
                      </p>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => setAutoSyncEnabled(!autoSyncStatus.isEnabled)}
                    className="min-h-[36px] text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    {autoSyncStatus.isEnabled ? 'Pause Auto-Sync' : 'Resume Auto-Sync'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="bg-[#1E293B] rounded-lg p-2.5 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Next Cycle In</span>
                    <span className="text-sm font-mono tabular-nums font-bold text-[#60A5FA]">
                      {Math.floor(autoSyncStatus.secondsRemaining / 60)}m{' '}
                      {autoSyncStatus.secondsRemaining % 60 < 10 ? '0' : ''}
                      {autoSyncStatus.secondsRemaining % 60}s
                    </span>
                  </div>
                  <div className="bg-[#1E293B] rounded-lg p-2.5 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Local Storage Status</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      100% Persisted
                    </span>
                  </div>
                  <div className="bg-[#1E293B] rounded-lg p-2.5 border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Pending Queue</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-white">
                      {autoSyncStatus.pendingUploadsCount > 0 ? (
                        <span className="text-[#F97316] font-bold">{autoSyncStatus.pendingUploadsCount} queued</span>
                      ) : (
                        <span className="text-emerald-400">All Synced</span>
                      )}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  * All customer orders, recoveries, registrations, and visits are buffered in local storage until the 30-minute interval, or uploaded immediately when clicking Submit from the user side.
                </p>
              </div>

              {/* Action Box */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
                      Submit &amp; Upload All Local Data Now
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Flushes all locally stored data immediately into Google Sheets and pulls fresh updates from the spreadsheet:
                    </p>
                    <ul className="text-[11px] text-slate-700 dark:text-slate-300 mt-2 space-y-1 list-disc list-inside font-medium">
                      <li>Imports registered <strong>Users, Distributors &amp; Dealers</strong> from Google Sheets into Database</li>
                      <li>Pushes live <strong>Customers, Orders, Recoveries, Inventory &amp; Ledger</strong> into Google Sheets tabs</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) handleGoogleLogin();
                    else handleExecuteFullSync();
                  }}
                  disabled={isOperating}
                  className="btn-primary w-full min-h-[44px] text-xs sm:text-sm disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isOperating ? 'animate-spin' : ''}`} />
                  <span>
                    {isOperating
                      ? 'Uploading Local Data to Google Sheets...'
                      : user
                      ? 'Submit / Upload All Local Data to Sheet Now'
                      : 'Sign in to Google to Upload All'}
                  </span>
                </button>
              </div>

              {/* Individual Sync Queue & Retries Section */}
              <div className="border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                      Individual Transactions Queue ({pendingItems.length})
                    </span>
                  </div>
                  {pendingItems.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Sync Pending
                    </span>
                  )}
                </div>

                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {pendingItems.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-white dark:bg-[#1E293B] rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">All Transactions Synchronized</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        No pending orders or recoveries in local storage queue.
                      </div>
                    </div>
                  ) : (
                    pendingItems.map((item) => {
                      const dateStr = item.timestamp
                        ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—';
                      const isOrder = item.type === 'ORDER';
                      const isRecovery = item.type === 'RECOVERY';

                      let amountDisplay = '';
                      if (isOrder) {
                        amountDisplay = `PKR ${(item.data?.grandTotal || item.data?.totalAmount || 0).toLocaleString()}`;
                      } else if (isRecovery) {
                        amountDisplay = `PKR ${(item.data?.amount || item.data?.recoveryAmount || 0).toLocaleString()}`;
                      }

                      const detailLabel = item.customerName || 'Direct Dealer';
                      const retryLoading = !!retryingIds[item.id];

                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 shadow-2xs transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    isOrder
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : isRecovery
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span className="text-[10px] font-mono tabular-nums text-slate-400">{dateStr}</span>
                                {amountDisplay && (
                                  <span className="font-bold font-mono tabular-nums text-[#0F172A] dark:text-white text-[10px]">
                                    {amountDisplay}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-[#0F172A] dark:text-white mt-1 truncate">{detailLabel}</div>
                              {item.userName && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Officer: {item.userName}</div>
                              )}
                            </div>

                            {/* Row Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={retryLoading || isOperating}
                                onClick={() => handleRetryItem(item.id)}
                                className={`min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                  retryLoading
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                    : 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#3B82F6] border-blue-200 dark:border-blue-800 shadow-2xs'
                                }`}
                                title="Retry specific sync item"
                                aria-label="Retry specific sync item"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                type="button"
                                disabled={retryLoading || isOperating}
                                onClick={() => handleDeleteItem(item.id)}
                                className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs transition-all cursor-pointer"
                                title="Clear item from local queue"
                                aria-label="Clear item from local queue"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Failure / Attempt Logs */}
                          {(item.attempts > 0 || item.lastError) && (
                            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] text-rose-700 dark:text-rose-300 space-y-0.5 leading-relaxed">
                              <div className="flex justify-between font-bold text-rose-800 dark:text-rose-200">
                                <span className="font-mono tabular-nums">Failed Attempts: {item.attempts}</span>
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Failed
                                </span>
                              </div>
                              {item.lastError && (
                                <div className="font-mono text-[9px] line-clamp-2 break-all bg-white/60 dark:bg-[#0F172A] p-1 rounded border border-rose-100 dark:border-rose-900">
                                  Error: {item.lastError}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Customers</div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">{appData.customers.length}</div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Orders</div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">{appData.salesOrders.length}</div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Recoveries</div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">{appData.recoveries.length}</div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">SKUs</div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">{appData.skus.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: DATA IMPORT / GOOGLE SHEET SYNC (SECTION 30) */}
          {/* ========================================================= */}
          {activeMode === 'IMPORT' && (
            <div className="space-y-4">
              {/* Last Sync & Statistics Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-700/80 pb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-xs font-black text-[#0F172A] dark:text-white">Latest Import Status</span>
                  </div>
                  <span className="text-[10px] font-medium font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {importSummary
                      ? `Last sync: ${new Date(importSummary.timestamp).toLocaleString()}`
                      : 'No previous import recorded'}
                  </span>
                </div>

                {/* 6 Key Stat Counters */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Users</span>
                    <span className="font-mono tabular-nums font-black text-[#3B82F6] text-sm">
                      {importSummary?.usersCount ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Distributors</span>
                    <span className="font-mono tabular-nums font-black text-[#3B82F6] text-sm">
                      {importSummary?.distributorsCount ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Dealers</span>
                    <span className="font-mono tabular-nums font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {importSummary?.dealersCount ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Created</span>
                    <span className="font-mono tabular-nums font-black text-emerald-700 dark:text-emerald-300 text-sm">
                      {importSummary?.createdCount ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-800/80 shadow-2xs">
                    <span className="text-[10px] text-[#3B82F6] block font-bold">Updated</span>
                    <span className="font-mono tabular-nums font-black text-blue-700 dark:text-blue-300 text-sm">
                      {importSummary?.updatedCount ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-800/80 shadow-2xs">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">Failed</span>
                    <span className="font-mono tabular-nums font-black text-rose-700 dark:text-rose-300 text-sm">
                      {importSummary?.failedCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* Error Report Collapsible */}
                {importSummary && importSummary.errors.length > 0 && (
                  <div className="border border-rose-200 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl p-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowErrorDetails((v) => !v)}
                      className="w-full min-h-[44px] flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{importSummary.errors.length} Import Warning(s) / Error(s)</span>
                      </span>
                      {showErrorDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showErrorDetails && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px] pt-1">
                        {importSummary.errors.map((err, idx) => (
                          <div key={idx} className="bg-white dark:bg-[#1E293B] p-2 rounded-lg border border-rose-100 dark:border-rose-900/60 text-slate-700 dark:text-slate-300">
                            <strong>{err.identifier}</strong> (Row {err.row}): {err.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmation Prompt Before Large Imports */}
              {pendingImportScope && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                        Confirm Google Sheet Master Import ({pendingImportScope})
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1">
                        This action will fetch records from the spreadsheet, validate data integrity, check for duplicates, and synchronize them directly with your operational Supabase tables.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPendingImportScope(null)}
                      className="btn-outline px-4 min-h-[44px] rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteImport(pendingImportScope)}
                      className="btn-primary flex-1 min-h-[44px] rounded-xl font-black text-xs shadow-sm cursor-pointer"
                    >
                      Confirm &amp; Start Import
                    </button>
                  </div>
                </div>
              )}

              {/* 3 Explicit Import Action Buttons (Section 30) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) handleGoogleLogin();
                    else setPendingImportScope('USERS');
                  }}
                  disabled={isOperating}
                  className="p-3.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 hover:border-[#3B82F6] hover:shadow-md transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#3B82F6] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-[#0F172A] dark:text-white">Sync Users</div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Import &amp; match corporate staff profiles</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) handleGoogleLogin();
                    else setPendingImportScope('CUSTOMERS');
                  }}
                  disabled={isOperating}
                  className="p-3.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 hover:border-[#3B82F6] hover:shadow-md transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#3B82F6] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-[#0F172A] dark:text-white">Sync Customers</div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Distributors &amp; Dealers with balances</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) handleGoogleLogin();
                    else setPendingImportScope('ALL');
                  }}
                  disabled={isOperating}
                  className="btn-primary p-3.5 min-h-[44px] rounded-2xl shadow-sm hover:shadow-md transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <RefreshCw className={`w-4 h-4 ${isOperating ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-xs font-black text-white">Sync All</div>
                  <p className="text-[10px] text-orange-100 mt-0.5">Full batch synchronization</p>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: DATABASE PUSH (MIRRORING TO GOOGLE SHEET) */}
          {/* ========================================================= */}
          {activeMode === 'EXPORT' && (
            <div className="space-y-4">
              {/* Push Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <Store className="w-3 h-3 text-[#3B82F6]" />
                    <span>Customers</span>
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                    {appData.customers.length}
                  </div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <ShoppingBag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Orders</span>
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                    {appData.salesOrders.length}
                  </div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <DollarSign className="w-3 h-3 text-[#3B82F6]" />
                    <span>Recovery</span>
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                    {appData.recoveries.length}
                  </div>
                </div>
                <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <Package className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>SKUs</span>
                  </div>
                  <div className="text-sm font-black font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
                    {appData.skus.length}
                  </div>
                </div>
              </div>

              {/* Confirmation Dialog for Push */}
              {showConfirmExport ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                        Confirm Google Sheets Push Mirroring
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1">
                        This action will write <span className="font-mono tabular-nums">{appData.customers.length}</span> Customers, <span className="font-mono tabular-nums">{appData.salesOrders.length}</span> Orders, and <span className="font-mono tabular-nums">{appData.recoveries.length}</span> Recoveries to the designated spreadsheet.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmExport(false)}
                      className="btn-outline px-4 min-h-[44px] rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteExport}
                      className="btn-primary flex-1 min-h-[44px] rounded-xl font-black text-xs shadow-sm cursor-pointer"
                    >
                      Confirm &amp; Push Now
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) handleGoogleLogin();
                    else setShowConfirmExport(true);
                  }}
                  disabled={isOperating}
                  className="btn-primary w-full min-h-[44px] py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isOperating ? 'animate-spin' : ''}`} />
                  <span>
                    {isOperating
                      ? 'Pushing Database to Sheets...'
                      : user
                      ? 'Push N-LINK 360 to Google Sheets'
                      : 'Sign in to Push Database'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* 4. DEDICATED OFFLINE QUEUE TAB */}
          {activeMode === 'OFFLINE_QUEUE' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-black text-[#0F172A] dark:text-white uppercase">
                      Dedicated Offline &amp; Sync Queue
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Transactions recorded offline or pending due to intermittent network / Google Sheet rate limits.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-md font-black text-xs font-mono tabular-nums">
                    {pendingItems.length} Record{pendingItems.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {pendingItems.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border-2 border-dashed border-[#E2E8F0] dark:border-slate-700/80">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-[#0F172A] dark:text-white uppercase tracking-tight">Queue is Clean</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    All offline sales orders and recovery collections have been completely synced to Google Sheets.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pending Transaction Items (<span className="font-mono tabular-nums">{pendingItems.length}</span>)
                    </span>
                    {!confirmClearAll ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(true)}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer min-h-[44px] px-2.5"
                      >
                        Clear Entire Queue
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Clear {pendingItems.length} cached items?</span>
                        <button
                          type="button"
                          onClick={() => {
                            pendingItems.forEach((item) => removePendingUpload(item.id));
                            setPendingItems(getPendingUploads());
                            setConfirmClearAll(false);
                            setOpStatus({ type: 'success', message: 'Cleared all items from queue.' });
                          }}
                          className="btn-danger px-3 min-h-[36px] rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="btn-outline px-3 min-h-[36px] rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {pendingItems.map((item) => {
                      const isOrder = item.type === 'ORDER';
                      const isRecovery = item.type === 'RECOVERY';
                      const dateStr = item.timestamp
                        ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : '—';
                      
                      let amountDisplay = '';
                      if (isOrder) {
                        amountDisplay = `PKR ${(item.data?.grandTotal || item.data?.totalAmount || 0).toLocaleString()}`;
                      } else if (isRecovery) {
                        amountDisplay = `PKR ${(item.data?.amount || item.data?.recoveryAmount || 0).toLocaleString()}`;
                      }

                      const detailLabel = item.customerName || (item.data?.customerName) || 'Direct Dealer / Retailer';
                      const retryLoading = !!retryingIds[item.id];

                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-[#0F172A] p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs hover:shadow-xs transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                    isOrder
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                      : isRecovery
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {item.type}
                                </span>
                                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 text-[11px]">{dateStr}</span>
                                {amountDisplay && (
                                  <span className="font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-xs">
                                    {amountDisplay}
                                  </span>
                                )}
                              </div>
                              <div className="font-black text-[#0F172A] dark:text-white text-xs sm:text-sm mt-1.5 truncate">
                                {detailLabel}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                <span>Officer: <strong className="text-slate-700 dark:text-slate-200">{item.userName || 'Current User'}</strong></span>
                                <span>Ref ID: <code className="font-mono tabular-nums text-[10px] text-slate-600 dark:text-slate-300">{item.id.slice(0, 8)}</code></span>
                              </div>
                            </div>

                            {/* Targeted Retry & Delete Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={retryLoading || isOperating}
                                onClick={() => handleRetryItem(item.id)}
                                className={`px-3 min-h-[44px] rounded-xl border text-[11px] font-black inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                  retryLoading
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                    : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#3B82F6] border-blue-200 dark:border-blue-800/80 active:scale-95'
                                }`}
                                title="Retry syncing this record"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Retry</span>
                              </button>
                              {confirmDeleteId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteItem(item.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="btn-danger px-2.5 min-h-[44px] rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="btn-outline px-2.5 min-h-[44px] rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={retryLoading || isOperating}
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="px-3 min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 text-[11px] font-black inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                  title="Delete record from queue"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Failure notes if any */}
                          {(item.attempts > 0 || item.lastError) && (
                            <div className="p-2.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 rounded-xl text-[10px] text-rose-800 dark:text-rose-300 space-y-1 leading-relaxed">
                              <div className="flex justify-between font-bold">
                                <span className="font-mono tabular-nums">Failed Attempts: {item.attempts}</span>
                                <span className="text-rose-600 dark:text-rose-400 font-mono">Status: Retry Queued</span>
                              </div>
                              {item.lastError && (
                                <div className="text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-[#1E293B] p-1.5 rounded border border-rose-100 dark:border-rose-900 font-mono text-[9px] break-all">
                                  {item.lastError}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. PERMANENT WEBHOOK SYNC CONFIGURATION */}
          {activeMode === 'WEBHOOK' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0F172A] text-white border border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-[#3B82F6]" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Permanent Webhook Mirror Channel
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Set up a "set-and-forget" serverless synchronization channel. This connects all devices and web clients directly to your sheet permanently without requiring users to sign in again and again!
                  </p>
                </div>
              </div>

              {/* Configure Webhook URL Card */}
              <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs space-y-3.5">
                <h4 className="text-xs font-black text-[#0F172A] dark:text-white uppercase tracking-tight">Configure Webhook URL</h4>
                
                {import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Server-Attached Webhook Active: <strong className="font-mono text-[10px] break-all">{import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL.slice(0, 50)}...</strong></span>
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setGoogleSheetsWebhookUrl(customWebhookUrl);
                  setOpStatus({
                    type: 'success',
                    message: '✓ Permanent Webhook URL saved successfully on this device!',
                  });
                }} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Google Apps Script Webhook Exec URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={customWebhookUrl}
                      onChange={(e) => setCustomWebhookUrl(e.target.value)}
                      className="w-full min-h-[44px] text-xs font-mono p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                    <button
                      type="submit"
                      className="btn-primary px-4 min-h-[44px] rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all active:scale-95"
                    >
                      Save Webhook
                    </button>
                    {customWebhookUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsOperating(true);
                          setOpStatus({ type: 'idle' });
                          try {
                            const res = await syncToGoogleSheetsWebhook(customWebhookUrl, appData);
                            setOpStatus({
                              type: 'success',
                              message: res.message,
                            });
                          } catch (err: any) {
                            setOpStatus({
                              type: 'error',
                              message: `Webhook Sync failed: ${err.message || err}`,
                            });
                          } finally {
                            setIsOperating(false);
                          }
                        }}
                        disabled={isOperating}
                        className="btn-outline px-4 min-h-[44px] rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                        <span>Force Webhook Sync Now</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* How to deploy Script instructions */}
              <div className="p-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#0F172A] dark:text-white uppercase tracking-tight">Deployment Script</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">Google Apps Script</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="text-[11px] font-black text-[#3B82F6] hover:underline inline-flex items-center gap-1 min-h-[36px] px-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#0B1120] text-slate-300 rounded-xl font-mono text-[10px] max-h-[160px] overflow-y-auto leading-relaxed border border-slate-800">
                  <pre className="whitespace-pre-wrap">{GOOGLE_APPS_SCRIPT_CODE}</pre>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed bg-white dark:bg-[#1E293B] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                  <p className="font-bold text-[#0F172A] dark:text-white text-xs mb-1">How to deploy Google Apps Script:</p>
                  <div>1. Open your Google Spreadsheet. Click <strong>Extensions &rarr; Apps Script</strong>.</div>
                  <div>2. Delete any existing code, paste the script copied above, and save the project.</div>
                  <div>3. Click <strong>Deploy &rarr; New Deployment</strong>. Choose <strong>Web App</strong> type.</div>
                  <div>4. Set "Execute as" to <strong>Me (your email)</strong> and "Who has access" to <strong>Anyone</strong>. Click Deploy.</div>
                  <div>5. Authorize permissions when prompted, and paste the generated <strong>Web App Exec URL</strong> above.</div>
                </div>
              </div>
            </div>
          )}

          {/* Operation Status Feedback */}
          {opStatus.type !== 'idle' && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 ${
                opStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
              }`}
            >
              {opStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{opStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-slate-700/80 text-center text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Connected to Google Sheets API v4 • Two-way synchronization engine for National Lights
        </div>
      </div>
    </div>
  );
};
