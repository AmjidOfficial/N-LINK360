import React, { useState } from 'react';
import {
  TrendingUp,
  Banknote,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Store,
  FileText,
  Target
} from 'lucide-react';
import { User } from '../types';
import { isAdminUser, isFieldForceUser, getAssignedDealerIds } from '../services/production-users';

interface ExecutiveDashboardProps {
  currentUser: User;
  onNavigateToDomain: (domain: 'OPERATIONS' | 'REPORTS', subTab?: string) => void;
}

export const NeumorphicExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentUser,
  onNavigateToDomain,
}) => {
  const [timeframe, setTimeframe] = useState<'TODAY' | 'MTD' | 'YTD'>('MTD');

  const isAdmin = isAdminUser(currentUser);
  const isField = isFieldForceUser(currentUser);
  const assignedDealers = getAssignedDealerIds(currentUser);

  // Dynamic KPI calculations according to role & timeframe
  const adminKpiData = {
    TODAY: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% vs yesterday',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: '0 Dealers',
      inventoryValuationLabel: 'PKR 0',
    },
    MTD: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% vs last month',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: '0 Dealers',
      inventoryValuationLabel: 'PKR 0',
    },
    YTD: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% vs last fiscal',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: '0 Dealers',
      inventoryValuationLabel: 'PKR 0',
    },
  };

  const fieldForceKpiData = {
    TODAY: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% vs target',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: `${assignedDealers.length} Assigned Accounts`,
      inventoryValuationLabel: 'Central Stock',
    },
    MTD: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% achievement',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: `${assignedDealers.length} Assigned Accounts`,
      inventoryValuationLabel: 'Central Stock',
    },
    YTD: {
      grossSalesLabel: 'PKR 0',
      salesGrowth: '0.0% YoY',
      salesTarget: 'PKR 0',
      salesTargetPct: '0.0%',
      netRecoveryLabel: 'PKR 0',
      recoveryRate: 0,
      chequeClearance: '0%',
      overdueExposureLabel: 'PKR 0',
      overdueCount: `${assignedDealers.length} Assigned Accounts`,
      inventoryValuationLabel: 'Central Stock',
    },
  };

  const currentMetrics = isField ? fieldForceKpiData[timeframe] : adminKpiData[timeframe];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Global / Territory Snapshot */}
      <div className="nm-flat p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              {isAdmin ? 'Executive Command & Overview' : `Field Workspace — ${currentUser.fullName}`}
            </h1>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
              isAdmin ? 'nm-badge-teal text-teal-800' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
            }`}>
              {isAdmin ? '👑 Global Unrestricted Access' : '🚶 Field Force Scoped (Assigned Accounts Only)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {isAdmin
              ? 'National Lights 360 Automotive & Industrial Distribution Network (All Branches)'
              : `Assigned Territory Beat: ${currentUser.branchName || 'Lahore Metro'} • Real-time field sync`}
          </p>
        </div>

        {/* Timeframe Filter Switcher */}
        <div className="flex items-center gap-1.5 p-1 nm-inset rounded-2xl self-start md:self-auto">
          {(['TODAY', 'MTD', 'YTD'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === period
                  ? 'nm-btn-primary shadow-sm'
                  : 'nm-btn text-slate-600 hover:text-slate-900'
              }`}
            >
              {period === 'TODAY' ? 'Today' : period === 'MTD' ? 'Month-to-Date' : 'Year-to-Date'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gross Sales */}
        <div
          onClick={() => onNavigateToDomain('REPORTS', 'SALES')}
          className="nm-flat p-5 rounded-3xl border border-white cursor-pointer hover:border-teal-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isField ? 'My Gross Booked Sales' : 'Global Gross Sales'}
            </span>
            <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-teal-700">
            {currentMetrics.grossSalesLabel}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="text-teal-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {currentMetrics.salesGrowth}
            </span>
            <span className="text-slate-400 text-[11px]">Target: {currentMetrics.salesTargetPct}</span>
          </div>
        </div>

        {/* Metric 2: Net Realized Recovery */}
        <div
          onClick={() => onNavigateToDomain('REPORTS', 'RECOVERY')}
          className="nm-flat p-5 rounded-3xl border border-white cursor-pointer hover:border-teal-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isField ? 'My Realized Recovery' : 'Net Realized Recovery'}
            </span>
            <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-indigo-700">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-700">
            {currentMetrics.netRecoveryLabel}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="text-indigo-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentMetrics.recoveryRate}% Realization Rate
            </span>
            <span className="text-slate-400 text-[11px]">Clearance: {currentMetrics.chequeClearance}</span>
          </div>
        </div>

        {/* Metric 3: Overdue Exposure */}
        <div
          onClick={() => onNavigateToDomain('REPORTS', 'CREDIT')}
          className="nm-flat p-5 rounded-3xl border border-white cursor-pointer hover:border-rose-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isField ? 'Assigned Overdue Exposure' : 'Total Overdue Exposure'}
            </span>
            <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight text-amber-700">
            {currentMetrics.overdueExposureLabel}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="text-amber-600 flex items-center gap-0.5">
              <Clock className="w-3.5 h-3.5" />
              {currentMetrics.overdueCount}
            </span>
            <span className="text-rose-600 text-[11px]">Aging &gt; 30 Days</span>
          </div>
        </div>

        {/* Metric 4: Stock & Warehouse */}
        <div
          onClick={() => onNavigateToDomain('REPORTS', 'STOCKS_WAREHOUSE')}
          className="nm-flat p-5 rounded-3xl border border-white cursor-pointer hover:border-teal-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isField ? 'Branch Stock Status' : 'Warehouse Inventory Valuation'}
            </span>
            <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-emerald-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700">
            {currentMetrics.inventoryValuationLabel}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="text-emerald-600 flex items-center gap-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              National Lights Auto SKUs
            </span>
            <span className="text-slate-400 text-[11px]">Ready for Dispatch</span>
          </div>
        </div>
      </div>

      {/* Quick Access Operational Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Workflows */}
        <div className="lg:col-span-2 nm-flat p-6 rounded-3xl border border-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800">
                {isField ? 'Field Force Khata, Ledger & Invoice Hub' : 'Master Enterprise Operations'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isField
                  ? 'CreditBook & Invoice Maker mode: Fast party khata, cash-in logging & 1-tap professional billing'
                  : 'Manage national branch hubs, automotive SKU catalogue, target quotas & territories'}
              </p>
            </div>
            <button
              onClick={() => onNavigateToDomain('OPERATIONS', isField ? 'DEALERS_DISTRIBUTORS' : 'COMPANY')}
              className="nm-btn px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 flex items-center gap-1"
            >
              <span>Explore</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div
              onClick={() => onNavigateToDomain('OPERATIONS', 'DEALERS_DISTRIBUTORS')}
              className="nm-btn p-4 rounded-2xl cursor-pointer hover:border-teal-500 transition-all text-left space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-teal-700 font-bold">
                <Store className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-800">
                {isField ? 'Party Khata / Accounts' : 'Dealer & Distributor Network'}
              </div>
              <p className="text-[10px] text-slate-500">
                {isField ? 'CreditBook style ledger balances & phone contacts' : 'All accounts across all 5 national regions'}
              </p>
            </div>

            <div
              onClick={() => onNavigateToDomain('OPERATIONS', 'TARGET')}
              className="nm-btn p-4 rounded-2xl cursor-pointer hover:border-teal-500 transition-all text-left space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-indigo-700 font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-800">
                {isField ? 'Sales & Recovery Quota' : 'Target Allocation Quotas'}
              </div>
              <p className="text-[10px] text-slate-500">
                {isField ? 'Track realization against monthly target' : 'Sales and recovery quotas by officer'}
              </p>
            </div>

            <div
              onClick={() => onNavigateToDomain('REPORTS', 'LEDGERS')}
              className="nm-btn p-4 rounded-2xl cursor-pointer hover:border-teal-500 transition-all text-left space-y-1.5"
            >
              <div className="w-8 h-8 rounded-xl nm-inset flex items-center justify-center text-emerald-700 font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs font-black text-slate-800">
                {isField ? 'Invoice & Ledger Book' : 'Audited Party Ledgers'}
              </div>
              <p className="text-[10px] text-slate-500">
                {isField ? 'Invoice Maker estimates & double-entry statement' : 'Full double-entry party ledgers with PDF export'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Active Security & Scoping Summary */}
        <div className="nm-flat p-6 rounded-3xl border border-white space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-black text-slate-800">Security & Scoping Policy</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="nm-inset p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Active User:</span>
                <span className="font-mono text-slate-700 font-bold">{currentUser.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Role Code:</span>
                <span className="nm-badge-teal text-[9px] px-2 py-0.5 rounded-full font-bold">{currentUser.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Assigned Branch:</span>
                <span className="text-slate-600">{currentUser.branchName || 'Head Office'}</span>
              </div>
            </div>

            <div className="nm-inset p-3.5 rounded-2xl space-y-1.5 text-[11px] text-slate-600">
              <p className="font-bold text-slate-700">Enforcement Rules:</p>
              <ul className="list-disc pl-4 space-y-1 text-[10px]">
                {isAdmin ? (
                  <>
                    <li>Unrestricted access to all company records and branches.</li>
                    <li>Full authority to assign quotas and modify SKU pricing.</li>
                    <li>Global financial ledgers and company audit logs.</li>
                  </>
                ) : (
                  <>
                    <li>Data scoped strictly to assigned territory and dealers.</li>
                    <li>Restricted from accessing other officers&apos; accounts.</li>
                    <li>Branch configurations are locked to Head Office Admins.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
