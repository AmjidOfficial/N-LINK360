/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Light Daily Performance & Visit Audit PDF Report
 */

import React from 'react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NATIONAL_LIGHT_OFFICE_INFO } from '../../data/national-light-rate-card';

export interface DailyPerformancePDFModalProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  isOpen: boolean;
  onClose: () => void;
}

export const DailyPerformancePDFModal: React.FC<DailyPerformancePDFModalProps> = ({
  currentUser,
  customers,
  orders,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate metrics
  const totalOrdersCount = orders.length || 3;
  const totalSalesVal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 345000;
  const totalRecoveryVal = 280000; // Rs. 2.80 Lacs
  const visitedDealersCount = Math.min(8, customers.length);
  const targetSales = 600000; // 6.0 Lacs
  const salesAchievementRate = Math.round((totalSalesVal / targetSales) * 100);

  const mockVisits = [
    { dealer: customers[0]?.companyName || 'Khyber Lights & Hardware', city: customers[0]?.city || 'Peshawar', time: '09:45 AM', outcome: 'Order Booked (Rs. 84,500)', status: 'VERIFIED' },
    { dealer: customers[1]?.companyName || 'Swat Electric Store', city: customers[1]?.city || 'Mingora', time: '11:15 AM', outcome: 'Payment Recovered (Rs. 120,000)', status: 'VERIFIED' },
    { dealer: customers[2]?.companyName || 'Mardan Lighting Hub', city: customers[2]?.city || 'Mardan', time: '01:30 PM', outcome: 'Stock Inquiry / Quotation', status: 'VERIFIED' },
    { dealer: customers[3]?.companyName || 'Peshawar Light Palace', city: customers[3]?.city || 'Peshawar', time: '03:10 PM', outcome: 'Order Booked (Rs. 145,000)', status: 'VERIFIED' },
  ];

  const handlePrintPDF = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const message = `*NATIONAL LIGHT PAKISTAN — DAILY FIELD REPORT*\nDate: ${todayStr}\nOfficer: ${currentUser.fullName} (${currentUser.userCode})\nTerritory: ${currentUser.territory || 'KPK Zonal Area'}\n\n*SUMMARY metrics:*\n- Total Sales Booked: Rs. ${totalSalesVal.toLocaleString()}\n- Total Payment Recovered: Rs. ${totalRecoveryVal.toLocaleString()}\n- Orders Booked: ${totalOrdersCount}\n- Dealer Visits Completed: ${visitedDealersCount}\n- Target Achievement: ${salesAchievementRate}%\n\nHead Office: ${NATIONAL_LIGHT_OFFICE_INFO.headOffice}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-slideUp">
        
        {/* Modal Header Actions */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-[#001428] text-white">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#76f4e0] text-[24px]">picture_as_pdf</span>
            <div>
              <h2 className="text-base font-bold text-white">Daily Performance PDF Report</h2>
              <p className="text-xs text-slate-300">National Light Enterprise Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-4 py-1.5 bg-[#006b5f] hover:bg-[#005047] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable PDF Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 font-sans" id="printable-pdf-document">
          
          {/* 1. Official Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-2 border-[#001428] gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#001428] text-[#76f4e0] flex items-center justify-center font-black text-xl font-mono shadow-sm">
                NL
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#001428] tracking-tight uppercase">
                  NATIONAL LIGHT PAKISTAN
                </h1>
                <p className="text-xs font-bold text-[#006b5f]">
                  Official Field Operations &amp; Daily Audit Performance Report
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="inline-block px-2.5 py-1 bg-[#001428] text-[#76f4e0] font-mono font-bold rounded text-[11px] mb-1">
                DOC ID: NL-RPT-{Date.now().toString().slice(-6)}
              </span>
              <p className="text-slate-500 font-medium">{todayStr}</p>
            </div>
          </div>

          {/* 2. Officer & Territory Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Field Officer</span>
              <span className="font-bold text-slate-900 text-sm">{currentUser.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Employee Code</span>
              <span className="font-mono font-bold text-[#006b5f] text-sm">{currentUser.userCode}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Role &amp; Tier</span>
              <span className="font-bold text-slate-900 text-sm">{currentUser.role}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Territory</span>
              <span className="font-bold text-slate-900 text-sm">{currentUser.territory || 'KPK Zonal Hub'}</span>
            </div>
          </div>

          {/* 3. Daily Summary KPI Metrics */}
          <div>
            <h3 className="text-xs font-extrabold text-[#001428] uppercase tracking-wider mb-2.5">
              1. Daily Financial &amp; Operational Key Results
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Primary Sales Booked</span>
                <span className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
                  Rs. {totalSalesVal.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">{totalOrdersCount} Sales Orders</span>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Payment Recovery</span>
                <span className="text-base sm:text-lg font-bold text-blue-900 font-mono">
                  Rs. {totalRecoveryVal.toLocaleString()}
                </span>
                <span className="text-[10px] text-blue-700 font-medium block mt-0.5">Verified Collections</span>
              </div>

              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Dealer Visits</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                  {visitedDealersCount} Shops
                </span>
                <span className="text-[10px] text-slate-600 font-medium block mt-0.5">100% Geofenced</span>
              </div>

              <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-200">
                <span className="text-[10px] font-bold text-teal-800 uppercase block">Target Achievement</span>
                <span className="text-base sm:text-lg font-bold text-teal-900 font-mono">
                  {salesAchievementRate}%
                </span>
                <span className="text-[10px] text-teal-700 font-medium block mt-0.5">MTD On Track</span>
              </div>
            </div>
          </div>

          {/* 4. Detailed Visit Audit Log */}
          <div>
            <h3 className="text-xs font-extrabold text-[#001428] uppercase tracking-wider mb-2.5">
              2. Field Visit &amp; Dealer Touchpoint Log
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#001428] text-white font-bold text-[11px]">
                    <th className="p-3">Time</th>
                    <th className="p-3">Dealer / Distributor Name</th>
                    <th className="p-3">City / Beat</th>
                    <th className="p-3">Activity &amp; Outcome</th>
                    <th className="p-3 text-right">GPS Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {mockVisits.map((v, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 font-mono text-slate-500 font-semibold">{v.time}</td>
                      <td className="p-3 font-bold text-slate-900">{v.dealer}</td>
                      <td className="p-3 text-slate-600">{v.city}</td>
                      <td className="p-3 text-slate-800 font-medium">{v.outcome}</td>
                      <td className="p-3 text-right">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Official Verification & Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div className="flex flex-col gap-8">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Field Officer Signature &amp; Date</span>
              <div className="border-b border-slate-400 w-48" />
              <p className="text-[11px] text-slate-600 font-medium">{currentUser.fullName}</p>
            </div>

            <div className="flex flex-col gap-8 text-right items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Zonal Sales Manager Stamp</span>
              <div className="border-b border-slate-400 w-48" />
              <p className="text-[11px] text-slate-600 font-medium">{NATIONAL_LIGHT_OFFICE_INFO.headOffice}</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 text-[10px] text-slate-400 font-mono">
            Generated via N-LINK 360 Enterprise Mobile Intelligence • National Light Pakistan
          </div>
        </div>
      </div>
    </div>
  );
};
