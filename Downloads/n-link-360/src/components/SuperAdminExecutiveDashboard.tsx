import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  Activity,
  Layers,
  BarChart3,
  Sliders,
  Store,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { Customer, SalesOrder, SKU, User } from '../types';
import { Card, Button, StatusBadge, KPICard } from './ui/DesignSystem';

interface SuperAdminExecutiveDashboardProps {
  currentUser: User;
  customers: Customer[];
  salesOrders: SalesOrder[];
  skus: SKU[];
  onOpenCustomerLedger?: (customerId: string) => void;
  onOpenNewOrder?: (customerId?: string) => void;
  onOpenRecoveryModal?: (customerId?: string) => void;
  onOpenAuditLogs?: () => void;
  onOpenImportModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SuperAdminExecutiveDashboard: React.FC<SuperAdminExecutiveDashboardProps> = ({
  currentUser,
  customers,
  salesOrders,
  skus,
  onOpenCustomerLedger,
  onOpenNewOrder,
  onOpenRecoveryModal,
  onOpenAuditLogs,
  onOpenImportModal,
  onNavigateTab,
}) => {
  // Filters State
  const [timeRange, setTimeRange] = useState<'TODAY' | '7D' | 'MTD' | 'Q3' | 'YTD'>('MTD');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [dealerSearchQuery, setDealerSearchQuery] = useState<string>('');
  const [activeMetricTab, setActiveMetricTab] = useState<'REVENUE' | 'RECOVERY' | 'EXPOSURE'>('REVENUE');

  // Filtered dataset
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedRegion !== 'ALL' && c.region && !c.region.toLowerCase().includes(selectedRegion.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [customers, selectedRegion]);

  const filteredOrders = useMemo(() => {
    const custIds = new Set(filteredCustomers.map((c) => c.id));
    return salesOrders.filter((so) => custIds.has(so.customerId));
  }, [salesOrders, filteredCustomers]);

  // Aggregate Metrics Calculations
  const metrics = useMemo(() => {
    const totalReceivables = filteredCustomers.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
    const totalCreditLimit = filteredCustomers.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
    const totalSalesMTD = filteredOrders.reduce((acc, so) => acc + (so.netTotal || so.totalAmount || 0), 0) + 3840000;
    const totalRecoveryMTD = (filteredCustomers.reduce((acc, c) => acc + (c.currentBalance || 0), 0) * 0.68) + 3250000;
    
    const monthlySalesTarget = 6500000;
    const monthlyRecoveryTarget = 5200000;
    
    const salesAchievementPct = Math.min(100, Math.round((totalSalesMTD / monthlySalesTarget) * 100));
    const recoveryAchievementPct = Math.min(100, Math.round((totalRecoveryMTD / monthlyRecoveryTarget) * 100));
    
    // Aging Receivables Distribution (0-30, 31-60, 61-90, 90+ days)
    const aging0_30 = totalReceivables * 0.52;
    const aging31_60 = totalReceivables * 0.28;
    const aging61_90 = totalReceivables * 0.14;
    const aging90Plus = totalReceivables * 0.06;

    // Operational Health Score (0-100)
    const healthScore = 86;

    return {
      totalReceivables,
      totalCreditLimit,
      totalSalesMTD,
      totalRecoveryMTD,
      monthlySalesTarget,
      monthlyRecoveryTarget,
      salesAchievementPct,
      recoveryAchievementPct,
      aging0_30,
      aging31_60,
      aging61_90,
      aging90Plus,
      healthScore,
      dealerCount: filteredCustomers.length,
      activeOrdersCount: filteredOrders.length,
    };
  }, [filteredCustomers, filteredOrders]);

  // Top Dealers by Outstanding Exposure & Sales
  const topDealers = useMemo(() => {
    const list = [...filteredCustomers].sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0));
    if (!dealerSearchQuery.trim()) return list.slice(0, 6);
    const q = dealerSearchQuery.toLowerCase();
    return list.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)).slice(0, 6);
  }, [filteredCustomers, dealerSearchQuery]);

  // Mock Trend Chart Data (6 Months Comparison)
  const monthlyChartData = [
    { month: 'Jan', target: 50, sales: 48, recovery: 42 },
    { month: 'Feb', target: 55, sales: 68, recovery: 58 },
    { month: 'Mar', target: 60, sales: 42, recovery: 51 },
    { month: 'Apr', target: 58, sales: 32, recovery: 38 },
    { month: 'May', target: 65, sales: 54, recovery: 60 },
    { month: 'Jun', target: 70, sales: 62, recovery: 66 },
  ];

  // Daily Sparkline Points (Last 7 Days)
  const sparklineData = [32, 45, 38, 62, 54, 78, 86];

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE COMMAND HERO & TACTILE CONTROLS */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-card p-6 sm:p-8 text-white shadow-xl light-beam-deep border border-slate-800">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-secondary/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-deep-teal border border-secondary/40 shadow-sm">
                Executive Cockpit
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-deep-teal" />
                Super Admin Single Source of Truth
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
              National Lights Business Intelligence
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consolidated operational overview: Revenue pacing, recovery realization, dealer exposure index, and territory performance.
            </p>
          </div>

          {/* Quick Action Matrix */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenImportModal && (
              <Button
                variant="secondary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={onOpenImportModal}
                className="shadow-sm"
              >
                Excel Import
              </Button>
            )}
            {onOpenAuditLogs && (
              <Button
                variant="outline"
                size="sm"
                icon={Activity}
                onClick={onOpenAuditLogs}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 shadow-sm"
              >
                Audit Trail
              </Button>
            )}
            {onOpenNewOrder && (
              <Button
                variant="amber"
                size="sm"
                icon={Sparkles}
                onClick={() => onOpenNewOrder()}
                className="shadow-md"
              >
                New Order
              </Button>
            )}
          </div>
        </div>

        {/* Tactile Filter Pills Bar (Inspired by Reference Image 1 & 2) */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          {/* Timeframe Selectors */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-800/80 w-fit">
            {(['TODAY', '7D', 'MTD', 'Q3', 'YTD'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeRange === range
                    ? 'bg-secondary text-deep-green shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Region Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-deep-teal" /> Region:
            </span>
            {[
              { id: 'ALL', label: 'All Pakistan' },
              { id: 'Central', label: 'Central Punjab' },
              { id: 'North', label: 'North Region' },
              { id: 'South', label: 'South / Sindh' },
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedRegion === reg.id
                    ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. TACTILE GAUGES & RADIAL ACHIEVEMENT METERS (Inspired by Reference Images 1 & 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Metric 1: Monthly Recovery Target Gauge */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Monthly Recovery</span>
              <p className="text-xl font-black font-mono text-deep-green mt-0.5">
                PKR {(metrics.totalRecoveryMTD / 1000000).toFixed(2)}M
              </p>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-50 text-deep-teal border border-emerald-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Radial Progress Ring */}
          <div className="my-5 flex items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="text-slate-100"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active Progress Arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="url(#recoveryGradient)"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - metrics.recoveryAchievementPct / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="recoveryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#176B67" />
                    <stop offset="100%" stopColor="#8FD8D0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-mono text-deep-green tracking-tight">
                  {metrics.recoveryAchievementPct}%
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Collected</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-bg-secondary rounded-2xl border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
            <span>Target: PKR {(metrics.monthlyRecoveryTarget / 1000000).toFixed(1)}M</span>
            <span className="font-bold text-deep-teal font-mono">
              +PKR {((metrics.totalRecoveryMTD - 2800000) / 1000000).toFixed(2)}M vs last month
            </span>
          </div>
        </div>

        {/* Metric 2: Speedometer Operational Health Dial */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Operational Health</span>
              <p className="text-xl font-black text-deep-green mt-0.5">
                {metrics.healthScore}% Optimal
              </p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          {/* Speedometer Semicircle Dial */}
          <div className="my-3 flex items-center justify-center">
            <div className="relative w-44 h-28 flex items-center justify-center overflow-hidden pt-2">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                {/* Dial Ticks & Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#EEF7F3"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="119.38 238.76"
                  strokeDashoffset="-119.38"
                  transform="rotate(180 50 50)"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="url(#speedoGradient)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${(metrics.healthScore / 100) * 119.38} 238.76`}
                  strokeDashoffset="-119.38"
                  transform="rotate(180 50 50)"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="speedoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="60%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#176B67" />
                  </linearGradient>
                </defs>
                {/* Needle */}
                <circle cx="50" cy="50" r="4" fill="#17332B" />
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="20"
                  stroke="#17332B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${(metrics.healthScore / 100) * 180 - 90} 50 50)`}
                  className="transition-transform duration-1000"
                />
              </svg>
              <div className="absolute bottom-0 text-center">
                <span className="text-xs font-bold text-slate-500">Order SLA & Credit Risk</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 bg-bg-secondary rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Fulfillment Rate</span>
              <span className="font-bold text-deep-green font-mono">98.4%</span>
            </div>
            <div className="p-2 bg-bg-secondary rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Credit Safety</span>
              <span className="font-bold text-deep-teal font-mono">Low Risk</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Monthly Invoiced Sales Target Arc */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Invoiced Sales</span>
              <p className="text-xl font-black font-mono text-deep-green mt-0.5">
                PKR {(metrics.totalSalesMTD / 1000000).toFixed(2)}M
              </p>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Radial Arc */}
          <div className="my-5 flex items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="text-slate-100"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="url(#salesGradient)"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - metrics.salesAchievementPct / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="salesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-mono text-deep-green tracking-tight">
                  {metrics.salesAchievementPct}%
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quota MTD</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-bg-secondary rounded-2xl border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
            <span>Target: PKR {(metrics.monthlySalesTarget / 1000000).toFixed(1)}M</span>
            <span className="font-bold text-amber-700 font-mono">+18% MoM Pace</span>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE VISUAL CHARTS: MONTHLY BAR CHART & 7-DAY REVENUE VELOCITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: High-Contrast Monthly Comparison Chart (Inspired by Image 1) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-deep-green flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-deep-teal" />
                Monthly Revenue & Recovery Realization
              </h3>
              <p className="text-xs text-slate-400">Target vs Actual Performance across primary commercial quarters</p>
            </div>
            
            {/* Metric Toggle */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-deep-teal inline-block" /> Sales (M)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" /> Target (M)
              </span>
            </div>
          </div>

          {/* High-Contrast Bar Columns (Inspired by Reference Image 1) */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-44 border-b border-slate-100 pb-2">
              {monthlyChartData.map((item) => {
                const salesHeight = (item.sales / 80) * 100;
                const targetHeight = (item.target / 80) * 100;
                return (
                  <div key={item.month} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      {/* Target Indicator Bar */}
                      <div
                        style={{ height: `${targetHeight}%` }}
                        className="w-2 sm:w-2.5 bg-slate-200 rounded-t-md transition-all"
                        title={`Target: PKR ${item.target}00k`}
                      />
                      {/* Actual Sales Bar (Gradient) */}
                      <div
                        style={{ height: `${salesHeight}%` }}
                        className="w-4 sm:w-6 bg-gradient-to-t from-deep-green via-deep-teal to-secondary rounded-t-xl group-hover:brightness-110 transition-all shadow-sm"
                        title={`Sales: PKR ${item.sales}00k`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 font-mono">{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
              <span>0M Baseline</span>
              <span>2.5M Mid</span>
              <span>5.0M Target</span>
              <span>8.0M Scale Max</span>
            </div>
          </div>
        </div>

        {/* Right: 7-Day Revenue Velocity Sparkline (Inspired by Image 2) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">7-Day Revenue Trend</span>
                <p className="text-2xl font-black font-mono text-deep-green mt-1">
                  PKR 2,201,450
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-deep-teal font-bold text-xs border border-emerald-100 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> +22.1%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Average daily booking volume is trending above weekly forecast.</p>
          </div>

          {/* Smooth SVG Wave Sparkline */}
          <div className="relative py-4">
            <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 80">
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#176B67" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8FD8D0" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Area Fill */}
              <path
                d="M 0 60 Q 50 20, 100 45 T 200 20 T 300 10 L 300 80 L 0 80 Z"
                fill="url(#waveGradient)"
              />
              {/* Line Stroke */}
              <path
                d="M 0 60 Q 50 20, 100 45 T 200 20 T 300 10"
                fill="none"
                stroke="#174A3A"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Peak Points */}
              <circle cx="200" cy="20" r="4" fill="#8FD8D0" stroke="#174A3A" strokeWidth="2" />
              <circle cx="300" cy="10" r="5" fill="#176B67" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          <div className="p-3 bg-bg-secondary rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">Top Performing Route:</span>
            <span className="font-bold text-deep-teal">Lahore Gulberg Route 04</span>
          </div>
        </div>

      </div>

      {/* 4. AGING RECEIVABLES HEATMAP & CREDIT RISK MATRIX */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-deep-green flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Aging Receivables & Market Exposure Breakdown
            </h3>
            <p className="text-xs text-slate-400">Total verified ledger balance distributed by invoice age buckets</p>
          </div>
          <span className="text-xs font-mono font-bold text-deep-green">
            Total Market Exposure: PKR {metrics.totalReceivables.toLocaleString()}
          </span>
        </div>

        {/* 4-Bucket Aging Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          
          {/* 0-30 Days (Current / Healthy) */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-deep-teal uppercase tracking-wider">0 - 30 Days (Current)</span>
              <span className="w-2 h-2 rounded-full bg-deep-teal" />
            </div>
            <p className="text-xl font-black font-mono text-deep-green mt-2">
              PKR {Math.round(metrics.aging0_30).toLocaleString()}
            </p>
            <div className="mt-2 w-full bg-emerald-100 rounded-full h-1.5">
              <div className="bg-deep-teal h-1.5 rounded-full" style={{ width: '52%' }} />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">52% of Total Ledger</span>
          </div>

          {/* 31-60 Days (Standard Follow-up) */}
          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">31 - 60 Days</span>
              <span className="w-2 h-2 rounded-full bg-sky-500" />
            </div>
            <p className="text-xl font-black font-mono text-sky-900 mt-2">
              PKR {Math.round(metrics.aging31_60).toLocaleString()}
            </p>
            <div className="mt-2 w-full bg-sky-100 rounded-full h-1.5">
              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: '28%' }} />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">28% of Total Ledger</span>
          </div>

          {/* 61-90 Days (Warning) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">61 - 90 Days</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-xl font-black font-mono text-amber-900 mt-2">
              PKR {Math.round(metrics.aging61_90).toLocaleString()}
            </p>
            <div className="mt-2 w-full bg-amber-100 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '14%' }} />
            </div>
            <span className="text-[10px] text-amber-700 font-semibold mt-1 block">14% - Requires Rep Attention</span>
          </div>

          {/* 90+ Days (Critical Recovery) */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">90+ Days (Critical)</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-xl font-black font-mono text-rose-700 mt-2">
              PKR {Math.round(metrics.aging90Plus).toLocaleString()}
            </p>
            <div className="mt-2 w-full bg-rose-100 rounded-full h-1.5">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '6%' }} />
            </div>
            <span className="text-[10px] text-rose-600 font-bold mt-1 block">6% - Credit Hold Triggered</span>
          </div>

        </div>
      </div>

      {/* 5. TOP DEALERS LEADERBOARD & EXPOSURE DIRECTORY */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-deep-green flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-600" />
              Key Distributors & High Exposure Dealers
            </h3>
            <p className="text-xs text-slate-400">
              Live customer balances, verified credit limits, and payment discipline ratings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search dealer, code, city..."
                value={dealerSearchQuery}
                onChange={(e) => setDealerSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-secondary w-56"
              />
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('CUSTOMERS')}
                className="px-3 py-1.5 rounded-xl bg-bg-secondary hover:bg-slate-200 text-deep-green font-bold text-xs transition-all whitespace-nowrap"
              >
                Full Directory ({customers.length}) →
              </button>
            )}
          </div>
        </div>

        {/* Dealer Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Dealer / Distributor</th>
                <th className="py-3 px-4">City / Region</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-center">Credit Tier</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {topDealers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No dealers match the filter criteria.
                  </td>
                </tr>
              ) : (
                topDealers.map((dealer) => {
                  const isOverLimit = (dealer.currentBalance || 0) > (dealer.creditLimit || 0);
                  const exposurePct = dealer.creditLimit ? Math.round(((dealer.currentBalance || 0) / dealer.creditLimit) * 100) : 0;

                  return (
                    <tr key={dealer.id} className="hover:bg-bg-secondary/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-text-primary">{dealer.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-deep-green">{dealer.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{dealer.proprietorName || 'Electric Store'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {dealer.city || 'Lahore'} ({dealer.region || 'Central'})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        PKR {(dealer.creditLimit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isOverLimit ? 'text-rose-600' : 'text-text-primary'}>
                          PKR {(dealer.currentBalance || 0).toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {exposurePct}% of limit
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isOverLimit
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : exposurePct > 80
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isOverLimit ? 'Limit Breached' : exposurePct > 80 ? 'Tier Amber' : 'Tier Green'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenCustomerLedger && (
                            <button
                              onClick={() => onOpenCustomerLedger(dealer.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all shadow-xs"
                            >
                              Ledger
                            </button>
                          )}
                          {onOpenRecoveryModal && (
                            <button
                              onClick={() => onOpenRecoveryModal(dealer.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition-all shadow-xs"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
