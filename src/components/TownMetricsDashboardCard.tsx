import React, { useMemo } from 'react';
import { Store, TrendingUp, DollarSign, MapPin, ChevronDown, Sparkles } from 'lucide-react';
import { Customer, SalesOrder, Recovery } from '../types';

interface TownMetricsDashboardCardProps {
  selectedTown: string;
  onSelectTown?: (town: string) => void;
  availableTowns: string[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  recoveries: Recovery[];
}

export const TownMetricsDashboardCard: React.FC<TownMetricsDashboardCardProps> = ({
  selectedTown,
  onSelectTown,
  availableTowns = [],
  customers = [],
  salesOrders = [],
  recoveries = [],
}) => {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const monthName = useMemo(() => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }, []);

  const townMetrics = useMemo(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeOrders = Array.isArray(salesOrders) ? salesOrders : [];
    const safeRecoveries = Array.isArray(recoveries) ? recoveries : [];

    // Filter customers belonging to the selected town (case-insensitive)
    const townCustomers = safeCustomers.filter((c) => {
      const town = (c.town || c.city || '').trim().toLowerCase();
      const target = (selectedTown || '').trim().toLowerCase();
      return town === target;
    });

    const townCustomerIds = new Set(townCustomers.map((c) => c.id));

    // 1. Calculate Outstanding Balance: Sum of current balances of these customers
    const totalOutstanding = townCustomers.reduce(
      (sum, c) => sum + Number(c.currentBalance ?? c.openingBalance ?? 0),
      0
    );

    // 2. Calculate Monthly Sales: Sum of orders in current month for these customers
    const mtdOrders = safeOrders.filter((o) => {
      const orderMonth = (o.orderDate || o.createdAt || '').slice(0, 7);
      const isCurrentMonth = orderMonth === currentMonth;
      const isNotCancelled = o.status !== 'CANCELLED' && o.status !== 'REJECTED';
      const isSameTown = o.customerId ? townCustomerIds.has(o.customerId) : false;
      return isCurrentMonth && isNotCancelled && isSameTown;
    });
    const totalMonthlySales = mtdOrders.reduce(
      (sum, o) => sum + Number((o as any).totalAmount || (o as any).requestedAmount || (o as any).netAmount || 0),
      0
    );

    // 3. Calculate Monthly Recovery: Sum of recoveries in current month for these customers
    const mtdRecoveries = safeRecoveries.filter((r) => {
      const recoveryMonth = ((r as any).paymentDate || (r as any).collectionDate || r.recordedAt || r.createdAt || '').slice(0, 7);
      const isCurrentMonth = recoveryMonth === currentMonth;
      const isNotRejected = r.status !== 'REJECTED';
      const isSameTown = r.customerId ? townCustomerIds.has(r.customerId) : false;
      return isCurrentMonth && isNotRejected && isSameTown;
    });
    const totalMonthlyRecovery = mtdRecoveries.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );

    return {
      totalOutstanding,
      totalMonthlySales,
      totalMonthlyRecovery,
      customerCount: townCustomers.length,
      salesCount: mtdOrders.length,
      recoveryCount: mtdRecoveries.length,
    };
  }, [selectedTown, customers, salesOrders, recoveries, currentMonth]);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shadow-xs border border-teal-100">
            <MapPin className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
              Geographic Focus KPI
              <Sparkles className="w-3 h-3 text-teal-500 animate-pulse" />
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-slate-900">
                {selectedTown || 'All Towns'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({townMetrics.customerCount} Dealers / Distributors)
              </span>
            </div>
          </div>
        </div>

        {/* Town Selector Dropdown within the Card */}
        {onSelectTown && availableTowns.length > 0 && (
          <div className="relative inline-block">
            <select
              value={selectedTown}
              onChange={(e) => onSelectTown(e.target.value)}
              className="appearance-none bg-white text-slate-800 text-xs font-bold pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              {availableTowns.map((town) => (
                <option key={town} value={town}>
                  {town}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Monthly Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Monthly Sales MTD
              </span>
              <p className="text-[10px] text-slate-400 font-medium lowercase">
                {monthName}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <TrendingUp className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-slate-900 font-mono">
              Rs. {townMetrics.totalMonthlySales.toLocaleString()}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-md">
                {townMetrics.salesCount} Orders
              </span>
              <span className="text-[10px] text-slate-500 font-medium">this month</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Recovery collected MTD */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Recovery Collected MTD
              </span>
              <p className="text-[10px] text-slate-400 font-medium lowercase">
                {monthName}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-emerald-700 font-mono">
              Rs. {townMetrics.totalMonthlyRecovery.toLocaleString()}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                {townMetrics.recoveryCount} Collections
              </span>
              <span className="text-[10px] text-slate-500 font-medium">this month</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Current Outstanding Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <p className="text-[10px] text-slate-400 font-medium">
                Active Credit Exposure
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Store className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-indigo-700 font-mono">
              Rs. {townMetrics.totalOutstanding.toLocaleString()}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md">
                {townMetrics.customerCount} Active Dealers
              </span>
              <span className="text-[10px] text-slate-500 font-medium">in town</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
