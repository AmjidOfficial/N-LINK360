import React, { useState } from 'react';
import { Invoice, Customer, SalesOrder, AuditLog } from '../types';
import { 
  FileText, 
  RotateCcw, 
  Plus, 
  ShieldAlert, 
  Sliders, 
  CheckCircle, 
  XCircle, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Info,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface InvoiceCorrectionTabProps {
  invoices?: Invoice[];
  customers?: Customer[];
  salesOrders?: SalesOrder[];
  auditLogs?: any[];
  onAddTransaction?: (tx: any) => void;
  onPostCreditDebitNote?: (note: {
    type: 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'CANCEL';
    invoiceId: string;
    amount: number;
    notes: string;
    userId: string;
  }) => { success: boolean; error?: string };
  onApproveCreditOverride?: (orderId: string) => void;
}

export const InvoiceCorrectionTab: React.FC<InvoiceCorrectionTabProps> = ({
  invoices = [],
  customers = [],
  salesOrders = [],
  auditLogs = [],
  onAddTransaction = (_tx: any) => {},
  onPostCreditDebitNote = (_note: any) => ({ success: true as boolean, error: undefined as string | undefined }),
  onApproveCreditOverride = (_orderId: string) => {}
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices?.[0]?.id || '');
  const [correctionType, setCorrectionType] = useState<'CREDIT_NOTE' | 'DEBIT_NOTE' | 'CANCEL'>('CREDIT_NOTE');
  const [correctionAmount, setCorrectionAmount] = useState<number>(5000);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Policy Settings States
  const [amberThreshold, setAmberThreshold] = useState<number>(100); // 100% of credit limit
  const [redThreshold, setRedThreshold] = useState<number>(110); // 110% of credit limit (10% over)
  const [allowAmberSubmission, setAllowAmberSubmission] = useState<boolean>(true);

  // Selected Invoice info
  const selInvoice = invoices.find(i => i.id === selectedInvoiceId) || invoices[0];
  const selCustomer = customers.find(c => c.id === selInvoice?.customerId);

  // Handle Note Submission
  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selInvoice) return;
    if (correctionAmount <= 0 && correctionType !== 'CANCEL') {
      alert('Amount must be positive.');
      return;
    }
    if (!correctionReason.trim()) {
      alert('Reason is required for audit trail.');
      return;
    }

    const res = onPostCreditDebitNote({
      type: correctionType,
      invoiceId: selInvoice.id,
      amount: correctionType === 'CANCEL' ? selInvoice.totalAmount : correctionAmount,
      notes: correctionReason,
      userId: 'u-1' // Admin
    });

    if (res.success) {
      alert(`Successfully posted ${correctionType} correction for ${selInvoice.invoiceNumber}. Account balance and logs updated.`);
      setCorrectionReason('');
      setCorrectionAmount(5000);
    } else {
      alert(`Error posting correction: ${res.error}`);
    }
  };

  // Blocked / Pending credit approval orders
  const pendingApprovalOrders = salesOrders.filter(o => 
    o.status === 'SUBMITTED' && o.creditCheckStatus === 'RED'
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Header and Explanation */}
      <div className="bg-primary text-deep-green hover:bg-primary/90 rounded-2xl p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
          <ShieldAlert className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
            Risk & Legal Compliance Desk
          </span>
          <h1 className="text-2xl font-black text-white">Credit Control & Invoice Adjustments</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Enforcing strict immutability on posted invoices. Ledger corrections are restricted to audited 
            Credit/Debit notes or authorized system cancellations with reverse inventory allocation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Invoice Immutability & Correction Desk */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="border-b pb-2">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-500" />
              Audited Correction Desk
            </h3>
            <p className="text-[11px] text-slate-500">Select any posted invoice to issue a corrective credit/debit instrument.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Target Invoice*</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-bg-secondary font-medium"
              >
                {invoices.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} - {i.customerName} (PKR {i.totalAmount.toLocaleString()}) {i.status === 'CANCELLED' ? '[CANCELLED]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selInvoice && (
              <div className="bg-bg-secondary p-3 rounded-lg border border-slate-200 text-xs font-mono">
                <span className="text-[10px] font-bold text-slate-400 block border-b pb-1 font-sans">INVOICE METRICS</span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold">{selInvoice.invoiceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Total:</span>
                  <span className="font-bold text-indigo-700">PKR {selInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold truncate max-w-[150px] font-sans">{selInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">O/S Before:</span>
                  <span className="font-bold">PKR {selInvoice.previousBalance.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {selInvoice && selInvoice.status !== 'CANCELLED' ? (
            <form onSubmit={handlePostNote} className="p-4 bg-bg-secondary/50 rounded-xl border border-dashed border-slate-300 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Adjustment Method</label>
                  <select
                    value={correctionType}
                    onChange={(e) => setCorrectionType(e.target.value as any)}
                    className="w-full p-1.5 border rounded-lg font-bold text-text-primary bg-white"
                  >
                    <option value="CREDIT_NOTE">CREDIT NOTE (Reduce O/S)</option>
                    <option value="DEBIT_NOTE">DEBIT NOTE (Increase O/S)</option>
                    <option value="CANCEL">COMPLETE CANCELLATION (Full Reversal)</option>
                  </select>
                </div>

                {correctionType !== 'CANCEL' && (
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Correction Amount (PKR)*</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selInvoice.totalAmount}
                      value={correctionAmount}
                      onChange={(e) => setCorrectionAmount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full p-1.5 border rounded-lg font-mono font-bold"
                    />
                  </div>
                )}

                <div className={correctionType === 'CANCEL' ? 'sm:col-span-2' : ''}>
                  <label className="text-slate-600 font-semibold block mb-1">Auditor Reason / remarks*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Returned damaged items, price difference compensation"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full p-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-extrabold rounded-lg shadow-md transition-all"
                >
                  Post Audited Instrument
                </button>
              </div>
            </form>
          ) : (
            selInvoice && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs rounded-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" /> This invoice is already marked as CANCELLED. No further corrective instruments can be posted.
              </div>
            )
          )}

          {/* Audit Logs of Corrections */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Adjustment Ledger Audit Trail</span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-bg-secondary text-slate-500 font-bold border-b">
                  <tr>
                    <th className="py-2 px-2">Timestamp</th>
                    <th className="py-2 px-2">Invoice #</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2 text-right">Adjustment Amount</th>
                    <th className="py-2 px-2">User</th>
                    <th className="py-2 px-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.filter(l => l.action.includes('NOTE') || l.action.includes('CANCEL')).map(log => (
                    <tr key={log.id} className="hover:bg-bg-secondary text-xs">
                      <td className="py-2 px-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 px-2 font-bold text-slate-800">{log.invoiceNumber || 'INV-2026-001'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          log.action.includes('CREDIT') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-text-primary">PKR {log.amount?.toLocaleString()}</td>
                      <td className="py-2 px-2 text-slate-600 font-sans">{log.username || 'Admin'}</td>
                      <td className="py-2 px-2 text-slate-500 font-sans">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.filter(l => l.action.includes('NOTE') || l.action.includes('CANCEL')).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-slate-400 italic">No corrections posted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Real Credit Control Cockpit */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Credit Policy Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Credit Policy Controller
              </h3>
              <p className="text-[11px] text-slate-500">Define threshold boundaries driving automated GREEN/AMBER/RED alerts.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold flex justify-between block mb-1">
                  <span>AMBER Border Threshold (%)</span>
                  <span className="font-mono text-amber-600 font-bold">{amberThreshold}%</span>
                </label>
                <input
                  type="range"
                  min={80}
                  max={100}
                  value={amberThreshold}
                  onChange={(e) => setAmberThreshold(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold flex justify-between block mb-1">
                  <span>RED Block Threshold (%)</span>
                  <span className="font-mono text-rose-600 font-bold">{redThreshold}%</span>
                </label>
                <input
                  type="range"
                  min={101}
                  max={130}
                  value={redThreshold}
                  onChange={(e) => setRedThreshold(parseInt(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="amber_sub"
                  checked={allowAmberSubmission}
                  onChange={(e) => setAllowAmberSubmission(e.target.checked)}
                  className="rounded border-slate-300 accent-slate-900"
                />
                <label htmlFor="amber_sub" className="text-[11px] text-slate-600 font-medium">Allow automated submission of Amber orders</label>
              </div>
            </div>
          </div>

          {/* Credit Override Request Queue */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Policy Override Approvals
            </h3>
            <p className="text-[11px] text-slate-500">Orders exceeding credit limits requiring manager signature.</p>

            <div className="space-y-3 pt-1">
              {pendingApprovalOrders.length === 0 ? (
                <div className="p-3 bg-emerald-50 rounded-lg text-center border border-emerald-100">
                  <span className="text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Policy Queue Clear
                  </span>
                  <span className="text-[10px] text-deep-teal block mt-0.5">No orders are blocked by credit policy.</span>
                </div>
              ) : (
                pendingApprovalOrders.map(o => {
                  const cust = customers.find(c => c.id === o.customerId);
                  const limit = cust?.creditLimit || 0;
                  const currentOs = cust?.currentBalance || 0;
                  const newOrderVal = o.totalAmount;
                  const projectedOs = currentOs + newOrderVal;

                  return (
                    <div key={o.id} className="p-3.5 bg-bg-secondary border border-slate-200 rounded-lg text-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-indigo-700 font-bold block">{o.orderNumber}</span>
                          <span className="font-bold text-text-primary block mt-0.5">{o.customerName}</span>
                        </div>
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded animate-pulse">
                          RED BLOCK
                        </span>
                      </div>

                      <div className="space-y-1 bg-white p-2.5 rounded-md border border-slate-100 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Credit Limit:</span>
                          <span className="font-semibold">PKR {limit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                          <span className="text-rose-500 font-sans">Projected O/S:</span>
                          <span className="font-black">PKR {projectedOs.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans pt-1 border-t mt-1">
                          Exceeds limit by <span className="font-bold text-rose-600 font-mono">PKR {(projectedOs - limit).toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (onApproveCreditOverride) {
                            onApproveCreditOverride(o.id);
                            alert(`Credit Policy Override Approved for Order ${o.orderNumber}. Order released for invoicing and processing.`);
                          }
                        }}
                        className="w-full py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                      >
                        Approve Credit Override
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
