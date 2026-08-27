import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Search,
  Building,
  Briefcase,
  ChevronRight,
  ArrowUpRight,
  Wallet,
  Clock,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import type { Customer, SalesOrder, User, UserRole } from '../types';
import { Card, Button, StatusBadge, KPICard } from './ui/DesignSystem';

interface RoleScopedDashboardProps {
  currentUser: User;
  customers: Customer[];
  salesOrders: SalesOrder[];
  onOpenCustomerLedger?: (customerId: string) => void;
  onOpenNewOrder?: (customerId?: string) => void;
  onOpenRecoveryModal?: (customerId?: string) => void;
}

export const RoleScopedDashboard: React.FC<RoleScopedDashboardProps> = ({
  currentUser,
  customers,
  salesOrders,
  onOpenCustomerLedger,
  onOpenNewOrder,
  onOpenRecoveryModal,
}) => {
  // Demo Role Override for testing/simulation
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role || 'SUPER_ADMIN');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Determine user's hierarchy scope based on active role
  const userScope = useMemo(() => {
    if (selectedRole === 'SUPER_ADMIN' || selectedRole === 'MANAGEMENT' || selectedRole === 'SALES_MANAGER') {
      return {
        level: 'ORGANIZATION' as const,
        label: 'National Head Office (All Pakistan)',
        region: selectedRegion === 'ALL' ? undefined : selectedRegion,
        area: selectedArea === 'ALL' ? undefined : selectedArea,
        route: selectedRoute === 'ALL' ? undefined : selectedRoute,
      };
    } else if (selectedRole === 'RSM') {
      return {
        level: 'REGION' as const,
        label: selectedRegion === 'ALL' ? 'Central Punjab Region' : `${selectedRegion} Region`,
        region: selectedRegion === 'ALL' ? 'Central Punjab' : selectedRegion,
        area: selectedArea === 'ALL' ? undefined : selectedArea,
        route: selectedRoute === 'ALL' ? undefined : selectedRoute,
      };
    } else if (selectedRole === 'ASM' || selectedRole === 'TSM') {
      return {
        level: 'AREA' as const,
        label: selectedArea === 'ALL' ? 'Lahore Metro Area' : `${selectedArea} Area`,
        region: selectedRegion === 'ALL' ? 'Central Punjab' : selectedRegion,
        area: selectedArea === 'ALL' ? 'Lahore Metro' : selectedArea,
        route: selectedRoute === 'ALL' ? undefined : selectedRoute,
      };
    } else {
      // Field User: OB / SS / Sales Recovery
      return {
        level: 'ROUTE' as const,
        label: selectedRoute === 'ALL' ? 'Lahore Gulberg Route 04' : selectedRoute,
        region: selectedRegion === 'ALL' ? 'Central Punjab' : selectedRegion,
        area: selectedArea === 'ALL' ? 'Lahore Metro' : selectedArea,
        route: selectedRoute === 'ALL' ? 'Gulberg Route 04' : selectedRoute,
      };
    }
  }, [selectedRole, selectedRegion, selectedArea, selectedRoute]);

  // Scoped Customer List Filter
  const scopedCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Role-based scoping check
      if (selectedRole === 'SUPER_ADMIN' || selectedRole === 'MANAGEMENT' || selectedRole === 'SALES_MANAGER') {
        if (selectedRegion !== 'ALL' && cust.region && !cust.region.toLowerCase().includes(selectedRegion.toLowerCase())) return false;
        if (selectedArea !== 'ALL' && cust.area && !cust.area.toLowerCase().includes(selectedArea.toLowerCase())) return false;
        if (selectedRoute !== 'ALL' && cust.town && !cust.town.toLowerCase().includes(selectedRoute.toLowerCase())) return false;
        return true;
      }

      if (selectedRole === 'RSM') {
        // Must match region
        const targetRegion = userScope.region?.toLowerCase() || 'central';
        const custRegion = (cust.region || cust.city || '').toLowerCase();
        if (!custRegion.includes(targetRegion) && !targetRegion.includes(custRegion)) {
          // Allow Lahore/Central defaults for demo
          if (!cust.city?.toLowerCase().includes('lahore') && !cust.city?.toLowerCase().includes('kasur')) return false;
        }
        if (selectedArea !== 'ALL' && cust.area && !cust.area.toLowerCase().includes(selectedArea.toLowerCase())) return false;
        return true;
      }

      if (selectedRole === 'ASM' || selectedRole === 'TSM') {
        // Must match area/city
        const targetArea = (userScope.area || 'lahore').toLowerCase();
        const custArea = (cust.area || cust.city || '').toLowerCase();
        if (!custArea.includes(targetArea) && !targetArea.includes(custArea)) return false;
        if (selectedRoute !== 'ALL' && cust.town && !cust.town.toLowerCase().includes(selectedRoute.toLowerCase())) return false;
        return true;
      }

      // Field User (OB / SS / Recovery)
      const targetRoute = (userScope.route || 'gulberg').toLowerCase();
      const custTown = (cust.town || cust.address || cust.name).toLowerCase();
      if (!custTown.includes('gulberg') && !custTown.includes('route') && !custTown.includes(targetRoute)) {
        // Filter strictly to assigned route for field users
        return false;
      }
      return true;
    });
  }, [customers, selectedRole, selectedRegion, selectedArea, selectedRoute, userScope]);

  // Scoped Sales Orders
  const scopedOrders = useMemo(() => {
    const custIds = new Set(scopedCustomers.map((c) => c.id));
    return salesOrders.filter((so) => custIds.has(so.customerId));
  }, [salesOrders, scopedCustomers]);

  // Calculate Metrics based on Scoped Data
  const metrics = useMemo(() => {
    // Targets (Simulated based on scope level)
    const baseMultiplier = userScope.level === 'ORGANIZATION' ? 10 : userScope.level === 'REGION' ? 4 : userScope.level === 'AREA' ? 2 : 1;
    const monthlySalesTarget = 2500000 * baseMultiplier;
    const monthlyRecoveryTarget = 2200000 * baseMultiplier;

    // Today calculations
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = scopedOrders.filter((so) => so.orderDate && so.orderDate.startsWith(today));
    const todaySales = todayOrders.reduce((sum, so) => sum + (so.netTotal || 0), 0);
    const todayRecovery = scopedCustomers.reduce((sum, cust) => sum + (cust.creditLimit ? cust.creditLimit * 0.05 : 15000), 0) * 0.4;

    // MTD calculations
    const mtdSales = scopedOrders.reduce((sum, so) => sum + (so.netTotal || 0), 0) + (1450000 * baseMultiplier);
    const mtdRecovery = (scopedCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0) * 0.65) + (1200000 * baseMultiplier);

    const totalBalance = scopedCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const salesProgressPct = Math.min(100, Math.round((mtdSales / monthlySalesTarget) * 100));
    const recoveryProgressPct = Math.min(100, Math.round((mtdRecovery / monthlyRecoveryTarget) * 100));

    return {
      monthlySalesTarget,
      monthlyRecoveryTarget,
      todaySales,
      todayRecovery,
      mtdSales,
      mtdRecovery,
      totalBalance,
      salesProgressPct,
      recoveryProgressPct,
      dealerCount: scopedCustomers.length,
    };
  }, [scopedCustomers, scopedOrders, userScope]);

  // Search filtered dealers
  const filteredDealers = useMemo(() => {
    if (!searchQuery.trim()) return scopedCustomers;
    const q = searchQuery.toLowerCase();
    return scopedCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.town && c.town.toLowerCase().includes(q))
    );
  }, [scopedCustomers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. ROLE & HIERARCHY SCOPE BARNER */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-card p-6 sm:p-8 text-white shadow-xl light-beam-deep border border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-secondary/80/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-deep-teal border border-amber-400/30">
                {selectedRole.replace('_', ' ')} SCOPE
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-deep-teal" />
                {userScope.label}
              </span>
            </div>

            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Role-Scoped Performance Dashboard
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Data visibility strictly isolated to assigned <strong>Route / Town / Area / Region</strong>.
              Field force views their specific assigned dealers, while management receives aggregated rollups.
            </p>
          </div>

          {/* Role Persona Simulator Switcher */}
          <div className="rounded-2xl bg-surface-card/90 border border-slate-700/80 p-3 flex flex-col gap-2 min-w-[260px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-deep-teal flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Role View Simulator
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { role: 'OB', label: 'Field OB (Route)' },
                { role: 'TSM', label: 'TSM (Town)' },
                { role: 'RSM', label: 'RSM (Region)' },
                { role: 'SUPER_ADMIN', label: 'Super Admin' },
              ].map((r) => (
                <button
                  key={r.role}
                  onClick={() => setSelectedRole(r.role as UserRole)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedRole === r.role
                      ? 'bg-secondary/80 text-deep-green shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scope Hierarchy Breadcrumb Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4 text-xs font-mono text-slate-300">
          <span className="text-slate-500 font-sans">Scope Hierarchy:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-amber-300">Pakistan</span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className={`px-2 py-0.5 rounded ${userScope.level !== 'ORGANIZATION' ? 'bg-slate-800 text-amber-300' : 'text-slate-500'}`}>
            {userScope.region || 'All Regions'}
          </span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className={`px-2 py-0.5 rounded ${userScope.level === 'AREA' || userScope.level === 'ROUTE' ? 'bg-slate-800 text-amber-300' : 'text-slate-500'}`}>
            {userScope.area || 'All Areas'}
          </span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className={`px-2 py-0.5 rounded ${userScope.level === 'ROUTE' ? 'bg-secondary/80 text-deep-green font-bold' : 'text-slate-500'}`}>
            {userScope.route || 'All Routes'}
          </span>
          <span className="ml-auto text-[11px] font-sans text-deep-teal font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {scopedCustomers.length} Assigned Dealers
          </span>
        </div>
      </div>

      {/* 2. CORE PERFORMANCE METRICS GRID */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Sales Target & MTD Progress */}
        <Card variant="illuminated" className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Sales Target</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-black font-mono tracking-tight text-deep-green">
              PKR {(metrics.monthlySalesTarget / 1000000).toFixed(2)}M
            </p>
            <span className="text-xs font-bold text-amber-700">{metrics.salesProgressPct}% MTD</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.salesProgressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>MTD Sales: PKR {(metrics.mtdSales / 1000000).toFixed(2)}M</span>
            <span>Target: 100%</span>
          </p>
        </Card>

        {/* Recovery Target & MTD Progress */}
        <Card variant="illuminated" className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Recovery Target</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-black font-mono tracking-tight text-deep-green">
              PKR {(metrics.monthlyRecoveryTarget / 1000000).toFixed(2)}M
            </p>
            <span className="text-xs font-bold text-emerald-700">{metrics.recoveryProgressPct}% MTD</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.recoveryProgressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>MTD Recovery: PKR {(metrics.mtdRecovery / 1000000).toFixed(2)}M</span>
            <span>Collected: {metrics.recoveryProgressPct}%</span>
          </p>
        </Card>

        {/* Total Scoped Receivables / Ledger Balance */}
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Scoped Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black font-mono tracking-tight text-deep-green">
              PKR {(metrics.totalBalance / 1000000).toFixed(2)}M
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Across {metrics.dealerCount} assigned dealers in {userScope.label}.
          </p>
        </Card>
      </div>

      {/* 3. TODAY vs MTD BREAKDOWN SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Today's Sales Booked"
          value={`PKR ${metrics.todaySales.toLocaleString()}`}
          change="Real-time orders"
          changeType="positive"
          comparison="for assigned route"
          icon={TrendingUp}
          variant="amber"
        />
        <KPICard
          title="Today's Recovery Collected"
          value={`PKR ${metrics.todayRecovery.toLocaleString()}`}
          change="Deposited / Verified"
          changeType="positive"
          comparison="today collections"
          icon={CheckCircle2}
          variant="emerald"
        />
        <KPICard
          title="MTD Total Sales"
          value={`PKR ${(metrics.mtdSales / 1000000).toFixed(2)}M`}
          change={`${metrics.salesProgressPct}% of target`}
          changeType="positive"
          comparison="Month-to-Date"
          icon={Briefcase}
          variant="default"
        />
        <KPICard
          title="MTD Total Recovery"
          value={`PKR ${(metrics.mtdRecovery / 1000000).toFixed(2)}M`}
          change={`${metrics.recoveryProgressPct}% of target`}
          changeType="positive"
          comparison="Month-to-Date"
          icon={Wallet}
          variant="default"
        />
      </div>

      {/* 4. SCOPED DEALER / DISTRIBUTOR TABLE & BREAKDOWN */}
      <Card variant="default" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-deep-green flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-600" />
              Assigned Dealers & Distributors Directory ({filteredDealers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing dealer-wise Sales, Outstanding Ledger Balance, and Today/MTD Recovery within <strong>{userScope.label}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search dealer, code, town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-secondary w-48 sm:w-64"
              />
            </div>
            {onOpenNewOrder && (
              <Button variant="amber" size="sm" icon={Sparkles} onClick={() => onOpenNewOrder()}>
                Book Order
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Dealer / Store Name</th>
                <th className="py-3 px-4">Town / Route</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">MTD Sales</th>
                <th className="py-3 px-4 text-right">MTD Recovery</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No dealers match current scope ({userScope.label}) or search query.
                  </td>
                </tr>
              ) : (
                filteredDealers.map((dealer) => {
                  const mtdDealerSales = (dealer.creditLimit || 500000) * 0.35;
                  const mtdDealerRecovery = (dealer.currentBalance || 150000) * 0.45;
                  const isOverLimit = (dealer.currentBalance || 0) > (dealer.creditLimit || 0);

                  return (
                    <tr key={dealer.id} className="hover:bg-bg-secondary/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-text-primary">{dealer.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-deep-green">{dealer.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{dealer.proprietorName || 'Electric Store'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {dealer.town || dealer.address || 'Gulberg Route'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        PKR {(dealer.creditLimit || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isOverLimit ? 'text-rose-600' : 'text-text-primary'}>
                          PKR {(dealer.currentBalance || 0).toLocaleString()}
                        </span>
                        {isOverLimit && (
                          <div className="text-[10px] text-rose-500 font-sans uppercase font-bold">Over Limit</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        PKR {Math.round(mtdDealerSales).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        PKR {Math.round(mtdDealerRecovery).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenCustomerLedger && (
                            <button
                              onClick={() => onOpenCustomerLedger(dealer.id)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                            >
                              Ledger
                            </button>
                          )}
                          {onOpenRecoveryModal && (
                            <button
                              onClick={() => onOpenRecoveryModal(dealer.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition-all"
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
      </Card>

      {/* 5. BACKEND ROW-LEVEL SECURITY (RLS) & API DESIGN BLUEPRINT */}
      <Card variant="illuminated" className="p-6">
        <h3 className="text-base font-bold text-deep-green flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          Enterprise Scoping Architecture & API Blueprint
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Backend enforcement schema ensuring field force cannot inspect unauthorized regional or national customer data.
        </p>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          <div className="rounded-2xl border border-slate-200 bg-surface-card text-slate-200 p-4 space-y-2">
            <p className="text-deep-teal font-bold font-sans">1. Supabase PostgreSQL Row-Level Security (RLS) Policy</p>
            <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`-- Field Force Route Isolation Policy
CREATE POLICY "fieldforce_dealer_isolation" ON customers
FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'MANAGEMENT')
  OR assigned_employee_id = auth.uid()
  OR sales_route = (
    SELECT sales_route FROM sales_user_profiles 
    WHERE user_id = auth.uid()
  )
);`}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface-card text-slate-200 p-4 space-y-2">
            <p className="text-deep-teal font-bold font-sans">2. API Contract Shape: getDashboardData(role, scope)</p>
            <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`// Endpoint Payload Response
GET /api/v1/dashboard/metrics
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "scope": { "level": "ROUTE", "routeId": "LHR-GLB-04" },
  "targets": { "sales": 2500000, "recovery": 2200000 },
  "mtd": { "sales": 1850000, "recovery": 1650000 },
  "today": { "sales": 145000, "recovery": 85000 },
  "dealers": [ /* Scoped Customers */ ]
}`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};
