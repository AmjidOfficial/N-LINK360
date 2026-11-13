/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Target vs Achievement of Sales & Recovery
 * Synced with Google Sheet tabs: Targets, Team Data & N-LINK Analytics
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  DollarSign,
  Coins,
  Users,
  Target as TargetIcon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { NLinkUser } from '../data/nlink-users-team';
import { exportCustomerLedgerToCsv } from '../services/exportEngine';

interface NLinkTargetAchievementTabProps {
  currentUser: NLinkUser;
  allUsers: NLinkUser[];
}

export const NLinkTargetAchievementTab: React.FC<NLinkTargetAchievementTabProps> = ({
  currentUser,
  allUsers,
}) => {
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Regions list
  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(allUsers.map((u) => u.region).filter(Boolean)));
  }, [allUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchRegion = regionFilter === 'ALL' || u.region === regionFilter;
      const matchRole =
        roleFilter === 'ALL'
          ? true
          : roleFilter === 'TOP_MANAGEMENT'
          ? ['SUPER_ADMIN', 'MANAGEMENT'].includes(u.role)
          : u.role === roleFilter;
      const matchSearch =
        !searchQuery.trim() ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.territory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchRole && matchSearch;
    });
  }, [allUsers, regionFilter, roleFilter, searchQuery]);

  // Overall aggregates
  const aggregates = useMemo(() => {
    const totalSalesTarget = filteredUsers.reduce((sum, u) => sum + u.monthlySalesTarget, 0);
    const totalSalesAchieved = filteredUsers.reduce((sum, u) => sum + u.mtdSalesAchieved, 0);
    const salesPct = totalSalesTarget > 0 ? (totalSalesAchieved / totalSalesTarget) * 100 : 0;

    const totalRecTarget = filteredUsers.reduce((sum, u) => sum + u.monthlyRecoveryTarget, 0);
    const totalRecAchieved = filteredUsers.reduce((sum, u) => sum + u.mtdRecoveryAchieved, 0);
    const recPct = totalRecTarget > 0 ? (totalRecAchieved / totalRecTarget) * 100 : 0;

    const todaySales = filteredUsers.reduce((sum, u) => sum + u.todaySalesAchieved, 0);
    const todayRecovery = filteredUsers.reduce((sum, u) => sum + u.todayRecoveryAchieved, 0);

    return {
      totalSalesTarget,
      totalSalesAchieved,
      salesPct,
      totalRecTarget,
      totalRecAchieved,
      recPct,
      todaySales,
      todayRecovery,
    };
  }, [filteredUsers]);

  // Export Target vs Achievement CSV
  const handleExportCsv = () => {
    const headers = [
      'Employee Code',
      'Name',
      'Designation / Role',
      'Region',
      'Territory',
      'Monthly Sales Target (PKR)',
      'MTD Sales Achieved (PKR)',
      'Sales Achievement %',
      'Monthly Recovery Target (PKR)',
      'MTD Recovery Achieved (PKR)',
      'Recovery Achievement %',
      'Today Sales (PKR)',
      'Today Recovery (PKR)',
    ];

    const rows = filteredUsers.map((u) => {
      const sPct = u.monthlySalesTarget > 0 ? ((u.mtdSalesAchieved / u.monthlySalesTarget) * 100).toFixed(1) : '0';
      const rPct = u.monthlyRecoveryTarget > 0 ? ((u.mtdRecoveryAchieved / u.monthlyRecoveryTarget) * 100).toFixed(1) : '0';
      return [
        u.employeeCode,
        u.fullName,
        u.roleTitle,
        u.region,
        u.territory,
        u.monthlySalesTarget,
        u.mtdSalesAchieved,
        `${sPct}%`,
        u.monthlyRecoveryTarget,
        u.mtdRecoveryAchieved,
        `${rPct}%`,
        u.todaySalesAchieved,
        u.todayRecoveryAchieved,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NLink_Target_vs_Achievement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="target-achievement-tab">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Sales Target vs MTD Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              MTD Sales Booking
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              Rs. {aggregates.totalSalesAchieved.toLocaleString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-700 font-mono">Rs. {aggregates.totalSalesTarget.toLocaleString()}</strong>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-700">{aggregates.salesPct.toFixed(1)}% Achieved</span>
              <span className="text-slate-400">Monthly</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, aggregates.salesPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recovery Target vs MTD Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              MTD Recovery Collection
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              Rs. {aggregates.totalRecAchieved.toLocaleString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-700 font-mono">Rs. {aggregates.totalRecTarget.toLocaleString()}</strong>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-blue-700">{aggregates.recPct.toFixed(1)}% Recovered</span>
              <span className="text-slate-400">Monthly</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, aggregates.recPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's Combined Field Activity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Field Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              Rs. {aggregates.todaySales.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Booked by Field Force Today
            </div>
          </div>
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
            Active Force: <strong className="text-slate-800">{filteredUsers.length} Officers Online</strong>
          </div>
        </div>

        {/* Today's Recovery Collections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Recovery Receipts
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              Rs. {aggregates.todayRecovery.toLocaleString()}
            </div>
            <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
              Deposited &amp; Reconciled Today
            </div>
          </div>
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
            Efficiency Rate: <strong className="text-slate-800">92.4% on Route</strong>
          </div>
        </div>
      </div>

      {/* 2. Controls & Table / Cards View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 self-start md:self-auto">
            <TargetIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Team Target vs Achievement Matrix</h3>
            <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-600">
              {filteredUsers.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none flex-1 sm:flex-initial touch-control"
            >
              <option value="ALL">All Regions</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Field Force Hierarchy Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none flex-1 sm:flex-initial touch-control"
            >
              <option value="ALL">All Hierarchy Tiers</option>
              <option value="TSM">1 - TSM (Territory Sales Manager)</option>
              <option value="ZSM">2 - ZSM (Zonal Sales Manager)</option>
              <option value="RSM">3 - RSM (Regional Sales Manager)</option>
              <option value="TOP_MANAGEMENT">4 - Top Management</option>
            </select>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-control"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* MOBILE CARD VIEW (Phones & Narrow Screens) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.map((user) => {
            const salesPct =
              user.monthlySalesTarget > 0 ? (user.mtdSalesAchieved / user.monthlySalesTarget) * 100 : 0;
            const recPct =
              user.monthlyRecoveryTarget > 0
                ? (user.mtdRecoveryAchieved / user.monthlyRecoveryTarget) * 100
                : 0;
            const isTopPerformer = salesPct >= 85 && recPct >= 85;

            return (
              <div key={user.id} className="p-3.5 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {user.avatarInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{user.fullName}</h4>
                      <p className="text-[10px] text-slate-500">
                        {user.employeeCode} • {user.roleTitle}
                      </p>
                    </div>
                  </div>

                  {isTopPerformer ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Award className="w-3 h-3 text-amber-600" /> Star
                    </span>
                  ) : salesPct >= 70 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Target
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      In Progress
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                  <span className="font-semibold text-slate-700">{user.region}</span> — {user.territory}
                </div>

                {/* Sales Progress Row */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Sales Quota:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      Rs. {user.mtdSalesAchieved.toLocaleString()} / {user.monthlySalesTarget.toLocaleString()} ({salesPct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        salesPct >= 80 ? 'bg-emerald-500' : salesPct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, salesPct)}%` }}
                    />
                  </div>
                </div>

                {/* Recovery Progress Row */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Recovery Quota:</span>
                    <span className="font-mono font-bold text-blue-700">
                      Rs. {user.mtdRecoveryAchieved.toLocaleString()} / {user.monthlyRecoveryTarget.toLocaleString()} ({recPct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        recPct >= 80 ? 'bg-blue-500' : recPct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, recPct)}%` }}
                    />
                  </div>
                </div>

                {/* Today's Stats Row */}
                <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-100">
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Today Bookings</span>
                    <span className="font-mono font-bold text-[11px] text-slate-900">
                      Rs. {user.todaySalesAchieved.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Today Recovery</span>
                    <span className="font-mono font-bold text-[11px] text-slate-900">
                      Rs. {user.todayRecoveryAchieved.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP MATRIX TABLE (Tablets & Desktops) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Officer &amp; Designation</th>
                <th className="py-3 px-3">Region &amp; Beat</th>
                <th className="py-3 px-3 text-right">Sales Target</th>
                <th className="py-3 px-3 text-right">MTD Sales</th>
                <th className="py-3 px-3 text-center">Sales %</th>
                <th className="py-3 px-3 text-right">Rec Target</th>
                <th className="py-3 px-3 text-right">MTD Recovery</th>
                <th className="py-3 px-3 text-center">Rec %</th>
                <th className="py-3 px-4 text-center">Status Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const salesPct =
                  user.monthlySalesTarget > 0 ? (user.mtdSalesAchieved / user.monthlySalesTarget) * 100 : 0;
                const recPct =
                  user.monthlyRecoveryTarget > 0
                    ? (user.mtdRecoveryAchieved / user.monthlyRecoveryTarget) * 100
                    : 0;
                const isTopPerformer = salesPct >= 85 && recPct >= 85;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                          {user.avatarInitials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.fullName}</p>
                          <p className="text-[10px] text-slate-500">
                            {user.employeeCode} • {user.roleTitle}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800">{user.region}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">{user.territory}</p>
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      Rs. {user.monthlySalesTarget.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      Rs. {user.mtdSalesAchieved.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-bold text-xs ${
                            salesPct >= 80
                              ? 'text-emerald-700'
                              : salesPct >= 60
                              ? 'text-amber-700'
                              : 'text-red-600'
                          }`}
                        >
                          {salesPct.toFixed(1)}%
                        </span>
                        <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              salesPct >= 80 ? 'bg-emerald-500' : salesPct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, salesPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      Rs. {user.monthlyRecoveryTarget.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-blue-700">
                      Rs. {user.mtdRecoveryAchieved.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-bold text-xs ${
                            recPct >= 80
                              ? 'text-blue-700'
                              : recPct >= 60
                              ? 'text-amber-700'
                              : 'text-red-600'
                          }`}
                        >
                          {recPct.toFixed(1)}%
                        </span>
                        <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              recPct >= 80 ? 'bg-blue-500' : recPct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, recPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isTopPerformer ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Award className="w-3 h-3 text-amber-600" /> Star Performer
                        </span>
                      ) : salesPct >= 70 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Target
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
