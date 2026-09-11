import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  CheckCircle,
  Copy,
  ExternalLink,
  RotateCw,
  Download,
  AlertCircle,
  Database,
  CloudUpload,
  Layers,
  ShieldCheck
} from 'lucide-react';
import {
  getGoogleSheetsWebhookUrl,
  setGoogleSheetsWebhookUrl,
  getGoogleSheetsLastSync,
  syncToGoogleSheetsWebhook,
  exportGoogleSheetsCsv,
  GOOGLE_APPS_SCRIPT_CODE
} from '../services/google-sheets';
import { SupabaseAppData } from '../services/supabase-data';

interface GoogleSheetsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: SupabaseAppData;
}

export const GoogleSheetsIntegrationModal: React.FC<GoogleSheetsIntegrationModalProps> = ({
  isOpen,
  onClose,
  appData,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'SYNC' | 'SCRIPT_SETUP' | 'SERVER_EDGE_FUNCTION' | 'CSV_EXPORT'>('SYNC');
  const [copiedEdgeScript, setCopiedEdgeScript] = useState(false);

  const handleCopyEdgeScript = () => {
    const edgeFuncSnippet = `// Supabase Edge Function: supabase/functions/sync-google-sheets/index.ts
// Secure Server-to-Server Mirroring for Google Sheet: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SPREADSHEET_ID = "1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo";

serve(async (req) => {
  const payload = await req.json();
  const webhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        spreadsheetId: SPREADSHEET_ID,
        timestamp: new Date().toISOString()
      }),
    });
  }
  
  return new Response(JSON.stringify({ status: "mirrored_securely" }), {
    headers: { "Content-Type": "application/json" }
  });
});`;
    navigator.clipboard.writeText(edgeFuncSnippet);
    setCopiedEdgeScript(true);
    setTimeout(() => setCopiedEdgeScript(false), 2000);
  };

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getGoogleSheetsWebhookUrl());
      setLastSyncTime(getGoogleSheetsLastSync());
      setSyncStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleSheetsWebhookUrl(webhookUrl);
    setSyncStatus({
      type: 'success',
      message: 'Google Sheets Webhook URL saved successfully.',
    });
  };

  const handleSyncNow = async () => {
    if (!webhookUrl) {
      setSyncStatus({
        type: 'error',
        message: 'Please provide a Google Apps Script Webhook URL first (or use the Script Setup tab).',
      });
      return;
    }

    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncToGoogleSheetsWebhook(webhookUrl, appData);
      setSyncStatus({ type: 'success', message: res.message });
      setLastSyncTime(getGoogleSheetsLastSync());
    } catch (err) {
      setSyncStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Synchronization failed.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#E8ECF2] rounded-3xl nm-flat border border-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-300/80 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                Google Sheets Storage Center
                <span className="text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Continuous automated backup & real-time data storage in your Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 pt-4 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('SYNC')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SYNC'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Live Webhook Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('SCRIPT_SETUP')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SCRIPT_SETUP'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Apps Script Setup (2 Mins)</span>
          </button>
          <button
            onClick={() => setActiveTab('SERVER_EDGE_FUNCTION')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SERVER_EDGE_FUNCTION'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Supabase Edge Server Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('CSV_EXPORT')}
            className={`pb-2.5 px-3 text-xs font-black transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'CSV_EXPORT'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Direct CSV Export</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {syncStatus && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 border ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {syncStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}

          {/* TAB 1: LIVE WEBHOOK SYNC */}
          {activeTab === 'SYNC' && (
            <div className="space-y-5">
              {/* Dataset Scope Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="nm-inset p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Customers</span>
                  <span className="text-base font-black text-slate-800">{appData.customers.length}</span>
                </div>
                <div className="nm-inset p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Orders</span>
                  <span className="text-base font-black text-teal-700">{appData.salesOrders.length}</span>
                </div>
                <div className="nm-inset p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Recoveries</span>
                  <span className="text-base font-black text-emerald-700">{appData.recoveries.length}</span>
                </div>
                <div className="nm-inset p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">SKU Stock</span>
                  <span className="text-base font-black text-indigo-700">{appData.skus.length}</span>
                </div>
              </div>

              {/* Webhook URL Input */}
              <form onSubmit={handleSaveWebhook} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Google Apps Script Webhook Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl nm-inset text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl nm-btn text-xs font-black text-slate-700 hover:text-emerald-700 active:scale-95 transition-all cursor-pointer"
                  >
                    Save URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Paste the deployment Web App URL generated from your Google Sheet (see "Apps Script Setup" tab).
                </p>
              </form>

              {/* Sync Action Area */}
              <div className="nm-flat p-4 rounded-2xl border border-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Manual & Instant Full Synchronization</span>
                  <span className="text-[11px] text-slate-500">
                    Last synced to Google Sheets:{' '}
                    <strong className="text-slate-700">{lastSyncTime || 'Never'}</strong>
                  </span>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Synchronizing Data...' : 'Sync All Data Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: APPS SCRIPT SETUP (INSTRUCTIONS + CODE) */}
          {activeTab === 'SCRIPT_SETUP' && (
            <div className="space-y-4">
              <div className="space-y-2 text-xs text-slate-700 bg-white/60 p-4 rounded-2xl border border-slate-200">
                <span className="font-black text-slate-900 block text-sm">3 Quick Steps to Connect Google Sheets:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open your target Google Sheet (or create a new blank one).</li>
                  <li>Go to menu: <strong className="text-slate-800">Extensions &gt; Apps Script</strong>.</li>
                  <li>Delete default code, paste the script below, and click <strong className="text-slate-800">Deploy &gt; New deployment</strong>.</li>
                  <li>Select type: <strong className="text-slate-800">Web app</strong>, set <em className="text-slate-800">"Who has access"</em> to <strong className="text-emerald-700">"Anyone"</strong>, click Deploy.</li>
                  <li>Copy the provided Web App URL and paste it into the <strong>Live Webhook Sync</strong> tab!</li>
                </ol>
              </div>

              {/* Copyable Code Box */}
              <div className="relative">
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    Google Apps Script Code
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-[11px] font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="nm-inset p-3.5 rounded-xl text-[11px] font-mono text-slate-800 max-h-56 overflow-y-auto border border-slate-200">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: SERVER-SIDE SUPABASE EDGE FUNCTION SYNC */}
          {activeTab === 'SERVER_EDGE_FUNCTION' && (
            <div className="space-y-4">
              <div className="space-y-2 text-xs text-slate-700 bg-white/60 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-black text-slate-900 text-sm">Server-to-Server Zero Credential Exposure</span>
                </div>
                <p className="text-slate-600">
                  Confirmed transactions (Orders, Recoveries, Approved Dealers) trigger PostgreSQL database webhooks in Supabase, which immediately replicate data directly to Google Sheet <strong className="font-mono text-slate-800">1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo</strong> without exposing API credentials to browser clients.
                </p>
                <div className="pt-2 border-t border-slate-200 text-slate-600">
                  <span className="font-bold text-slate-800 block mb-1">Architecture Pipeline:</span>
                  <p className="font-mono text-[11px] bg-slate-100 p-2 rounded-lg text-slate-700">
                    Supabase PostgreSQL (Triggers) ➔ Supabase Edge Function (Deno) ➔ Google Apps Script Webhook ➔ Google Sheets DB
                  </p>
                </div>
              </div>

              {/* Edge Function Code Box */}
              <div className="relative">
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    Supabase Edge Function Code (<span className="font-mono">supabase/functions/sync-google-sheets/index.ts</span>)
                  </span>
                  <button
                    onClick={handleCopyEdgeScript}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-[11px] font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    {copiedEdgeScript ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Edge Function</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="nm-inset p-3.5 rounded-xl text-[11px] font-mono text-slate-800 max-h-52 overflow-y-auto border border-slate-200">
{`// Supabase Edge Function (Deno): sync-google-sheets
// Target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SPREADSHEET_ID = "1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo";

serve(async (req) => {
  const payload = await req.json();
  const webhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
  
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        spreadsheetId: SPREADSHEET_ID,
        timestamp: new Date().toISOString()
      }),
    });
  }
  
  return new Response(JSON.stringify({ status: "mirrored_securely" }), {
    headers: { "Content-Type": "application/json" }
  });
});`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT CSV / EXCEL EXPORT */}
          {activeTab === 'CSV_EXPORT' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl nm-flat text-emerald-600 flex items-center justify-center border border-white">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">1-Click Direct Google Sheets Multi-Table Export</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Downloads an authoritative, clean CSV containing separated tables for Customers, Sales Orders, Recoveries, and Inventory Balances ready to open directly in Google Sheets or Microsoft Excel.
                </p>
              </div>
              <button
                onClick={() => exportGoogleSheetsCsv(appData)}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-teal-600/30 inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Spreadsheet File (.CSV)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white/40 border-t border-slate-300/80 flex items-center justify-between text-xs text-slate-500">
          <span>Target Platform: Google Sheets & Drive</span>
          <button
            onClick={onClose}
            className="nm-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
