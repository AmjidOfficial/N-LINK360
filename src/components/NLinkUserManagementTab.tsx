/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - User Management & Team Hierarchy
 * Synced with Google Sheet tabs: Users & Team Data
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  Download,
  Building2,
  MapPin,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { NLinkUser } from '../data/nlink-users-team';

interface NLinkUserManagementTabProps {
  currentUser: NLinkUser;
  allUsers: NLinkUser[];
  onSelectUserToImpersonate?: (user: NLinkUser) => void;
}

export const NLinkUserManagementTab: React.FC<NLinkUserManagementTabProps> = ({
  currentUser,
  allUsers,
  onSelectUserToImpersonate,
}) => {
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Unique regions
  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(allUsers.map((u) => u.region).filter(Boolean)));
  }, [allUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchRegion = regionFilter === 'ALL' || u.region === regionFilter;
      const matchSearch =
        !searchQuery.trim() ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.territory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchRegion && matchSearch;
    });
  }, [allUsers, roleFilter, regionFilter, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Role / Designation',
      'Department',
      'Email',
      'Phone',
      'Region',
      'Area',
      'Territory',
      'Reporting Manager',
      'Monthly Sales Target (PKR)',
      'Monthly Recovery Target (PKR)',
      'Status',
    ];

    const rows = filteredUsers.map((u) => [
      u.employeeCode,
      `"${u.fullName}"`,
      `"${u.roleTitle}"`,
      u.department,
      u.email,
      u.phone,
      u.region,
      `"${u.area}"`,
      `"${u.territory}"`,
      `"${u.reportingManagerName || 'Executive Board'}"`,
      u.monthlySalesTarget,
      u.monthlyRecoveryTarget,
      u.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NLink_User_Team_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="user-management-tab">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Users className="w-3 h-3 mr-1 text-blue-600" /> Google Sheet User Management
            </span>
            <span className="text-xs text-slate-400 font-medium">Role-Based Access & Team Hierarchy</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Field Force & Management Directory</h2>
          <p className="text-xs text-slate-500">
            Hierarchical reporting lines (Super Admin &gt; RSM &gt; ASM &gt; TSM &gt; OB / Sales & Recovery Officer) with territory assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Team Roster CSV
          </button>
        </div>
      </div>

      {/* 2. Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search officer name, code, email, territory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Roles / Hierarchy Tiers</option>
            <option value="SUPER_ADMIN">4 - Top Management (Super Admin)</option>
            <option value="MANAGEMENT">4 - Top Management (Executive)</option>
            <option value="RSM">3 - Regional Sales Manager (RSM)</option>
            <option value="ZSM">2 - Zonal Sales Manager (ZSM)</option>
            <option value="TSM">1 - Territory Sales Manager (TSM)</option>
            <option value="ACCOUNTS">Accounts & Finance</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Regions</option>
            {uniqueRegions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Team User Cards / Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isMe = user.id === currentUser.id;
          const salesPct =
            user.monthlySalesTarget > 0 ? (user.mtdSalesAchieved / user.monthlySalesTarget) * 100 : 0;
          const recPct =
            user.monthlyRecoveryTarget > 0 ? (user.mtdRecoveryAchieved / user.monthlyRecoveryTarget) * 100 : 0;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                isMe ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/80'
              }`}
            >
              {/* Top Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {user.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{user.fullName}</h4>
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Active Session
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{user.roleTitle}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {user.status}
                </span>
              </div>

              {/* Territory & Hierarchy details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center text-slate-600 gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <strong>{user.region}:</strong> {user.territory}
                  </span>
                </div>
                <div className="flex items-center text-slate-600 gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-slate-500">{user.email}</span>
                </div>
                <div className="flex items-center text-slate-600 gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500">{user.phone}</span>
                </div>
                {user.reportingManagerName && (
                  <div className="flex items-center text-slate-600 gap-1.5 pt-1 border-t border-slate-200/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Reports to: <strong className="text-slate-800">{user.reportingManagerName}</strong></span>
                  </div>
                )}
              </div>

              {/* Target vs Achievement Metrics */}
              {user.monthlySalesTarget > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Sales MTD</span>
                    <span className="font-bold text-slate-900 text-xs">
                      Rs. {(user.mtdSalesAchieved / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold block">{salesPct.toFixed(0)}% Target</span>
                  </div>

                  <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-semibold text-blue-800 uppercase block">Rec MTD</span>
                    <span className="font-bold text-slate-900 text-xs">
                      Rs. {(user.mtdRecoveryAchieved / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold block">{recPct.toFixed(0)}% Target</span>
                  </div>
                </div>
              )}

              {/* Fast switch button */}
              {onSelectUserToImpersonate && !isMe && (
                <button
                  type="button"
                  onClick={() => onSelectUserToImpersonate(user)}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Switch Role / View as {user.fullName}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
