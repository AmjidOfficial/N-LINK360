import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  X,
  AlertCircle,
  LogIn,
  LogOut,
  Database,
  Users,
  ShoppingBag,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  getCurrentGoogleUser,
  initAuth,
} from '../services/googleAuth';
import {
  TARGET_SPREADSHEET_ID,
  getActiveSpreadsheetId,
  setActiveSpreadsheetId,
  fetchSpreadsheetMetadata,
  syncDatabaseToGoogleSheet,
  SheetMetadata,
} from '../services/googleSheetsLiveService';
import { SupabaseAppData } from '../services/supabase-data';

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
  const [spreadsheetId, setSpreadsheetId] = useState<string>(getActiveSpreadsheetId());
  const [user, setUser] = useState<any>(getCurrentGoogleUser());
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<SheetMetadata | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const [showConfirmSync, setShowConfirmSync] = useState<boolean>(false);

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

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setSyncStatus({ type: 'idle' });
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSyncStatus({
          type: 'success',
          message: `Connected Google Account: ${res.user.email}`,
        });
      }
    } catch (err: any) {
      setSyncStatus({
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
    setSyncStatus({ type: 'idle' });
  };

  const executeSync = async () => {
    if (!token) {
      setSyncStatus({
        type: 'error',
        message: 'Please sign in with Google first to authorize Google Sheets API.',
      });
      return;
    }

    setShowConfirmSync(false);
    setIsSyncing(true);
    setSyncStatus({ type: 'idle' });

    try {
      const result = await syncDatabaseToGoogleSheet(spreadsheetId, appData, token);
      setSyncStatus({
        type: 'success',
        message: result.message,
      });
      if (onSyncComplete) {
        onSyncComplete(result.message);
      }
      loadSheetMetadata();
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: err.message || 'Failed to sync with Google Sheet',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-100 border border-white/20 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">Google Sheets Database</h2>
              <p className="text-xs text-emerald-100 font-medium">
                Live Spreadsheet Sync & Data Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Target Spreadsheet Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Configured Spreadsheet
              </span>
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => {
                  setSpreadsheetId(e.target.value);
                  setActiveSpreadsheetId(e.target.value);
                }}
                placeholder="Google Spreadsheet ID"
                className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-slate-500">
                Default ID: <strong className="font-mono text-slate-700">{TARGET_SPREADSHEET_ID}</strong>
              </p>
            </div>
            {metadata && (
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-600 font-medium">Sheet Title:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {metadata.title}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({metadata.sheets.length} tabs found)
                </span>
              </div>
            )}
          </div>

          {/* Google Auth Section */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-emerald-900">
                  {user ? 'Google Account Connected' : 'Google Authentication Required'}
                </span>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-emerald-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoadingAuth}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoadingAuth ? 'Signing in...' : 'Sign in with Google Account'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                <Users className="w-3 h-3 text-teal-600" />
                <span>Dealers</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-1">
                {appData.customers.length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                <ShoppingBag className="w-3 h-3 text-emerald-600" />
                <span>Orders</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-1">
                {appData.salesOrders.length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                <DollarSign className="w-3 h-3 text-indigo-600" />
                <span>Recovery</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-1">
                {appData.recoveries.length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                <Package className="w-3 h-3 text-amber-600" />
                <span>SKUs</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-1">
                {appData.skus.length}
              </div>
            </div>
          </div>

          {/* Status Message */}
          {syncStatus.type !== 'idle' && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {syncStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{syncStatus.message}</span>
            </div>
          )}

          {/* Explicit User Confirmation Dialog for Workspace API Data Mutation */}
          {showConfirmSync ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-900">
                    Confirm Google Sheets Synchronization
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1">
                    This action will update data in spreadsheet{' '}
                    <span className="font-mono font-bold">({spreadsheetId.slice(0, 8)}...)</span> across{' '}
                    <strong>{appData.customers.length} Dealers</strong>,{' '}
                    <strong>{appData.salesOrders.length} Orders</strong>, and{' '}
                    <strong>{appData.recoveries.length} Recoveries</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={executeSync}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Confirm & Sync Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmSync(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  handleGoogleLogin();
                } else {
                  setShowConfirmSync(true);
                }
              }}
              disabled={isSyncing}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-700/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Synchronizing Database...'
                  : user
                  ? 'Sync N-LINK 360 to Google Sheets'
                  : 'Sign in to Sync Database'}
              </span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
          Connected to Google Sheets API v4 • Instant cloud replication for National Lights
        </div>
      </div>
    </div>
  );
};
