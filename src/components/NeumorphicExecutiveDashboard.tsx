import React, { useState } from 'react';
import {
  TrendingUp,
  Banknote,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Store,
  FileText,
  Target,
  Users
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { User } from '../types';
import { isAdminUser, isFieldForceUser, getAssignedDealerIds } from '../services/production-users';

interface ExecutiveDashboardProps {
  currentUser: User;
  onNavigateToDomain: (domain: 'OPERATIONS' | 'REPORTS', subTab?: string) => void;
}

interface TownPerformanceData {
  town: string;
  region: string;
  mtdSales: number;
  mtdRecovery: number;
  targetSales: number;
  achievementPct: number;
  activeDealersCount: number;
  lastVisitDate: string;
  topDealer: string;
}

export const NeumorphicExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentUser,
  onNavigateToDomain,
}) => {
  const [timeframe, setTimeframe] = useState<'TODAY' | 'MTD' | 'YTD'>('MTD');
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [isDrilldownExpanded, setIsDrilldownExpanded] = useState<boolean>(true);

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

  // Town drill-down data with realistic branch performance & dealer breakdown
  const townPerformanceList: TownPerformanceData[] = [
    {
      town: 'Lahore',
      region: 'Punjab Central',
      mtdSales: 4850000,
      mtdRecovery: 4120000,
      targetSales: 5000000,
      achievementPct: 97,
      activeDealersCount: 24,
      lastVisitDate: '2026-08-31',
      topDealer: 'Al-Madina Auto Spares & Lighting',
    },
    {
      town: 'Gujranwala',
      region: 'Punjab Central',
      mtdSales: 3200000,
      mtdRecovery: 2850000,
      targetSales: 3500000,
      achievementPct: 91,
      activeDealersCount: 16,
      lastVisitDate: '2026-08-30',
      topDealer: 'Usman Autos & Electric Works',
    },
    {
      town: 'Karachi',
      region: 'Sindh South',
      mtdSales: 6400000,
      mtdRecovery: 5200000,
      targetSales: 7000000,
      achievementPct: 91,
      activeDealersCount: 32,
      lastVisitDate: '2026-08-31',
      topDealer: 'Super Karachi Auto Traders',
    },
    {
      town: 'Peshawar',
      region: 'KPK North',
      mtdSales: 2750000,
      mtdRecovery: 2300000,
      targetSales: 3000000,
      achievementPct: 92,
      activeDealersCount: 14,
      lastVisitDate: '2026-08-29',
      topDealer: 'Khyber Lighting Hub',
    },
    {
      town: 'Multan',
      region: 'Punjab South',
      mtdSales: 2100000,
      mtdRecovery: 1750000,
      targetSales: 2600000,
      achievementPct: 81,
      activeDealersCount: 12,
      lastVisitDate: '2026-08-31',
      topDealer: 'Farhan Light House',
    },
    {
      town: 'Faisalabad',
      region: 'Punjab Central',
      mtdSales: 3100000,
      mtdRecovery: 2600000,
      targetSales: 3800000,
      achievementPct: 82,
      activeDealersCount: 18,
      lastVisitDate: '2026-08-28',
      topDealer: 'Chenab Auto Electricians',
    },
    {
      town: 'Rawalpindi',
      region: 'Punjab North',
      mtdSales: 2400000,
      mtdRecovery: 2100000,
      targetSales: 2800000,
      achievementPct: 86,
      activeDealersCount: 15,
      lastVisitDate: '2026-08-30',
      topDealer: 'Potohar Auto Lighting',
    },
  ];

  // Town-specific top dealers mapping for deep dive
  const townDealersMap: Record<string, { name: string; code: string; sales: number; recovery: number; contact: string; status: string }[]> = {
    Lahore: [
      { name: 'Al-Madina Auto Spares & Lighting', code: 'CUST-001', sales: 1850000, recovery: 1600000, contact: 'Muhammad Asif (+92 300 4123456)', status: 'Active (Gold)' },
      { name: 'Raza Auto Electrician', code: 'CUST-004', sales: 1200000, recovery: 1100000, contact: 'Haji Raza (+92 321 4455667)', status: 'Active (Silver)' },
      { name: 'Bilal Traders Badami Bagh', code: 'CUST-007', sales: 980000, recovery: 850000, contact: 'Bilal Ahmad (+92 333 4567890)', status: 'Active (Bronze)' },
      { name: 'Montgomery Auto Bulb Center', code: 'CUST-009', sales: 820000, recovery: 570000, contact: 'Sheikh Imran (+92 301 9876543)', status: 'Active' },
    ],
    Gujranwala: [
      { name: 'Usman Autos & Electric Works', code: 'CUST-002', sales: 1450000, recovery: 1300000, contact: 'Tariq Mehmood (+92 301 8899001)', status: 'Active (Gold)' },
      { name: 'Gondlanwala Auto Center', code: 'CUST-012', sales: 950000, recovery: 850000, contact: 'M. Akram (+92 302 7788990)', status: 'Active (Silver)' },
      { name: 'Small Industrial Auto Hub', code: 'CUST-014', sales: 800000, recovery: 700000, contact: 'Ch. Nadeem (+92 322 6655443)', status: 'Active' },
    ],
    Karachi: [
      { name: 'Super Karachi Auto Traders', code: 'CUST-005', sales: 2900000, recovery: 2400000, contact: 'Haji Farooq (+92 300 2233445)', status: 'Active (Platinum)' },
      { name: 'Plaza Lighting & Bulbs Co.', code: 'CUST-015', sales: 1950000, recovery: 1650000, contact: 'Kamran Ali (+92 333 1122334)', status: 'Active (Gold)' },
      { name: 'Tariq Road Auto Electric', code: 'CUST-018', sales: 1550000, recovery: 1150000, contact: 'Zubair Sheikh (+92 321 9988776)', status: 'Active (Silver)' },
    ],
    Peshawar: [
      { name: 'Khyber Lighting Hub', code: 'CUST-006', sales: 1350000, recovery: 1150000, contact: 'Khan Zaman (+92 300 9012345)', status: 'Active (Gold)' },
      { name: 'Charsadda Road Auto Stores', code: 'CUST-021', sales: 850000, recovery: 720000, contact: 'Gulzar Khan (+92 313 8877665)', status: 'Active' },
      { name: 'University Road Bulb Mart', code: 'CUST-023', sales: 550000, recovery: 430000, contact: 'Inamullah (+92 345 6655443)', status: 'Active' },
    ],
    Multan: [
      { name: 'Farhan Light House', code: 'CUST-003', sales: 1150000, recovery: 980000, contact: 'Malik Farhan (+92 300 6876543)', status: 'Active (Silver)' },
      { name: 'Bosan Road Auto Spares', code: 'CUST-025', sales: 950000, recovery: 770000, contact: 'Kashif Mehmood (+92 301 5544332)', status: 'Active' },
    ],
    Faisalabad: [
      { name: 'Chenab Auto Electricians', code: 'CUST-008', sales: 1650000, recovery: 1400000, contact: 'M. Arshad (+92 300 7654321)', status: 'Active (Gold)' },
      { name: 'Sargodha Road Bulb Distribution', code: 'CUST-028', sales: 1450000, recovery: 1200000, contact: 'Haji Ishaq (+92 321 8877665)', status: 'Active (Silver)' },
    ],
    Rawalpindi: [
      { name: 'Potohar Auto Lighting', code: 'CUST-010', sales: 1300000, recovery: 1150000, contact: 'Raja Tariq (+92 333 5566778)', status: 'Active (Silver)' },
      { name: 'Kashmir Road Auto Spares', code: 'CUST-030', sales: 1100000, recovery: 950000, contact: 'Noman Butt (+92 302 4433221)', status: 'Active' },
    ],
  };

  const selectedTownDetail = selectedTown
    ? townPerformanceList.find((t) => t.town === selectedTown)
    : null;

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
              {isAdmin ? 'Global Unrestricted Access' : 'Field Force Scoped (Assigned Accounts Only)'}
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

      {/* MTD Sales Performance & Town Drill-Down Section */}
      <div className="nm-flat p-6 rounded-3xl border border-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-black text-slate-800">
                Month-to-Date (MTD) Sales vs. Target Quotas by Territory Town
              </h2>
              <span className="nm-badge-teal text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                Interactive Drill-Down
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any town bar or row to drill down into customer dealer accounts, visit logs and realization percentages.
            </p>
          </div>

          <button
            onClick={() => setIsDrilldownExpanded((prev) => !prev)}
            className="nm-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-teal-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{isDrilldownExpanded ? 'Collapse Drill-Down' : 'Expand Drill-Down'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDrilldownExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isDrilldownExpanded && (
          <div className="space-y-6 pt-2">
            {/* Recharts Bar Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={townPerformanceList}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedTown = state.activePayload[0].payload.town;
                      setSelectedTown((prev) => (prev === clickedTown ? null : clickedTown));
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis dataKey="town" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [`PKR ${Number(value).toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="targetSales"
                    name="Target Quota"
                    fill="#94a3b8"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="mtdSales"
                    name="MTD Achieved Sales"
                    fill="#0f766e"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="mtdRecovery"
                    name="Realized Recovery"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Selected Town Drill-Down Focus Banner & Top Dealers Breakdown */}
            {selectedTownDetail && (
              <div className="nm-inset p-5 rounded-2xl space-y-4 border border-teal-400/80 bg-teal-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MapPin className="w-4 h-4 text-teal-700" />
                    <span className="text-sm font-black text-slate-800">
                      Town Deep Dive: {selectedTownDetail.town} ({selectedTownDetail.region})
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 bg-teal-200 text-teal-900 rounded-full font-bold">
                      {selectedTownDetail.achievementPct}% Quota Achieved
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTown(null)}
                    className="text-xs font-bold text-teal-800 hover:text-teal-950 underline self-start sm:self-auto"
                  >
                    Clear Focus Filter
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">MTD Realized Sales</span>
                    <span className="font-black font-mono text-teal-800 text-sm">PKR {selectedTownDetail.mtdSales.toLocaleString()}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Realized Recovery</span>
                    <span className="font-black font-mono text-indigo-700 text-sm">PKR {selectedTownDetail.mtdRecovery.toLocaleString()}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Active Outlets</span>
                    <span className="font-black text-slate-800 text-sm">{selectedTownDetail.activeDealersCount} Dealers</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-teal-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Target Quota</span>
                    <span className="font-black font-mono text-slate-700 text-sm">PKR {selectedTownDetail.targetSales.toLocaleString()}</span>
                  </div>
                </div>

                {/* Top Dealers in this Town */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-teal-700" />
                      <span>Top Performing Dealers in {selectedTownDetail.town}</span>
                    </h4>
                    <button
                      onClick={() => onNavigateToDomain('OPERATIONS', 'DEALERS_DISTRIBUTORS')}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
                    >
                      View in Party Khata →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {(townDealersMap[selectedTownDetail.town] || []).map((dealer) => (
                      <div
                        key={dealer.code}
                        className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-teal-500 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-bold text-slate-800 text-xs block leading-tight">{dealer.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{dealer.code}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                            {dealer.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Sales</span>
                            <span className="font-bold text-teal-800">PKR {(dealer.sales / 1000).toFixed(0)}k</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[9px]">Recovery</span>
                            <span className="font-bold text-indigo-700">PKR {(dealer.recovery / 1000).toFixed(0)}k</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate pt-0.5">
                          {dealer.contact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Drill-down Interactive Table */}
            <div className="nm-flat rounded-2xl border border-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Town / Market</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4 text-right">MTD Target</th>
                      <th className="py-3 px-4 text-right text-teal-800">MTD Sales</th>
                      <th className="py-3 px-4 text-right text-indigo-800">Recovery</th>
                      <th className="py-3 px-4 text-center">Achievement</th>
                      <th className="py-3 px-4">Top Performing Dealer</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 font-medium text-slate-700">
                    {townPerformanceList.map((t) => {
                      const isRowSelected = selectedTown === t.town;
                      return (
                        <tr
                          key={t.town}
                          onClick={() => setSelectedTown((prev) => (prev === t.town ? null : t.town))}
                          className={`cursor-pointer transition-colors ${
                            isRowSelected ? 'bg-teal-100/60 font-semibold' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{t.town}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{t.region}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            PKR {(t.targetSales / 1000).toLocaleString()}k
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-teal-800">
                            PKR {(t.mtdSales / 1000).toLocaleString()}k
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                            PKR {(t.mtdRecovery / 1000).toLocaleString()}k
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                t.achievementPct >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.achievementPct >= 50
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {t.achievementPct}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-bold">{t.topDealer}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToDomain('OPERATIONS', 'DEALERS_DISTRIBUTORS');
                              }}
                              className="nm-btn px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-700 hover:text-teal-900"
                            >
                              View Dealers
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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
                {isField ? 'CreditBook style ledger balances & phone contacts' : 'All accounts across all national regions'}
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
            <h2 className="text-base font-black text-slate-800">Security &amp; Scoping Policy</h2>
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
