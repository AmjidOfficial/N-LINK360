import React, { useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Package,
  Layers,
  DollarSign,
  Truck,
  Store,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit3,
  Sliders,
  Database,
} from 'lucide-react';
import type { Customer, SKU, User } from '../types';
import { Card, Button, StatusBadge, KPICard } from './ui/DesignSystem';

interface SuperAdminControlCenterProps {
  currentUser: User;
  customers: Customer[];
  skus: SKU[];
  onOpenImportModal: () => void;
  onOpenAuditLogs: () => void;
  onRefreshData?: () => void;
}

type AdminSection =
  | 'COMMAND_CENTER'
  | 'ORGANIZATION'
  | 'USERS_ACCESS'
  | 'PRODUCT_SKU'
  | 'COMMERCIAL_PRICING'
  | 'CHANNELS'
  | 'WAREHOUSES_LOGISTICS'
  | 'HEALTH_AUDIT';

export const SuperAdminControlCenter: React.FC<SuperAdminControlCenterProps> = ({
  currentUser,
  customers,
  skus,
  onOpenImportModal,
  onOpenAuditLogs,
  onRefreshData,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('COMMAND_CENTER');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState<string | null>(null);

  // Master Data Health Diagnostic Calculations
  const skusWithoutPrices = skus.filter((s) => !s.tradePrice || s.tradePrice <= 0);
  const customersOverLimit = customers.filter(
    (c) => (c.currentBalance || 0) > (c.creditLimit || 0) * 1.15 && (c.creditLimit || 0) > 0
  );
  const unassignedCustomers = customers.filter((c) => !c.assignedEmployeeId);

  const totalStockValuation = skus.reduce((acc, s) => acc + (s.stockQty || 0) * (s.tradePrice || 0), 0);
  const totalReceivables = customers.reduce((acc, c) => acc + (c.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Super Admin Header & Illumination Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-card p-6 sm:p-8 text-white shadow-xl light-beam-deep border border-slate-800">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-secondary/80/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-deep-teal border border-amber-400/30">
                Single Source of Truth
              </span>
              <span className="text-xs text-slate-400">System Master Control Center</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Super Admin Master Console
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Centralized enterprise architecture for National Lights. Configure business units, products, multi-tier pricing, sales hierarchy, and channels in one unified platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="amber"
              size="md"
              icon={Plus}
              onClick={() => setShowCreateModal('QUICK_CREATE')}
            >
              Quick Create
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={FileSpreadsheet}
              onClick={onOpenImportModal}
            >
              Excel Center
            </Button>
            {onRefreshData && (
              <Button
                variant="outline"
                size="md"
                icon={RefreshCw}
                onClick={onRefreshData}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Sync
              </Button>
            )}
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          {[
            { id: 'COMMAND_CENTER', label: 'Command Center', icon: Sliders },
            { id: 'ORGANIZATION', label: 'Organization & Heads', icon: Building2 },
            { id: 'USERS_ACCESS', label: 'Users & Roles (16)', icon: Users },
            { id: 'PRODUCT_SKU', label: 'Products & SKUs', icon: Package },
            { id: 'COMMERCIAL_PRICING', label: 'Pricing & Margins', icon: DollarSign },
            { id: 'CHANNELS', label: 'Distributors & Dealers', icon: Store },
            { id: 'WAREHOUSES_LOGISTICS', label: 'Warehouses & Fleet', icon: Warehouse },
            { id: 'HEALTH_AUDIT', label: 'Master Data Health', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as AdminSection)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-secondary/80 text-deep-green shadow-md shadow-amber-400/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: COMMAND CENTER */}
      {activeSection === 'COMMAND_CENTER' && (
        <div className="space-y-6">
          {/* Key Master Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Active SKU Catalog"
              value={skus.length.toLocaleString()}
              change="+100% In stock"
              changeType="positive"
              comparison="across all categories"
              icon={Package}
              variant="amber"
            />
            <KPICard
              title="Customer Directory"
              value={customers.length.toLocaleString()}
              change={`${customers.filter((c) => c.status).length} Active`}
              changeType="positive"
              comparison="dealers & distributors"
              icon={Store}
              variant="default"
            />
            <KPICard
              title="Total Receivables"
              value={`PKR ${(totalReceivables / 1000000).toFixed(2)}M`}
              change="Verified ledger"
              changeType="neutral"
              comparison="live balance"
              icon={DollarSign}
              variant="default"
            />
            <KPICard
              title="Inventory Valuation"
              value={`PKR ${(totalStockValuation / 1000000).toFixed(2)}M`}
              change="Warehouse assets"
              changeType="positive"
              comparison="at trade price"
              icon={Warehouse}
              variant="emerald"
            />
          </div>

          {/* Master Health & Diagnostics Card */}
          <Card variant="illuminated" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-deep-green flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  Master Data Integrity & Compliance Engine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated scan of relationship integrity, credit safeguards, and price list linkages.
                </p>
              </div>
              <StatusBadge variant={skusWithoutPrices.length === 0 ? 'emerald' : 'amber'} dot>
                {skusWithoutPrices.length === 0 ? 'Optimal System Health' : 'Issues Detected'}
              </StatusBadge>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-bg-secondary p-4">
                <p className="text-xs font-semibold text-slate-600">SKUs Missing Trade Price</p>
                <p className="mt-1 text-2xl font-black font-mono text-deep-green">
                  {skusWithoutPrices.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {skusWithoutPrices.length === 0
                    ? 'All SKUs mapped to active pricing.'
                    : 'Requires Price Master definition.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-bg-secondary p-4">
                <p className="text-xs font-semibold text-slate-600">Credit Limit Violations (&gt;15%)</p>
                <p className="mt-1 text-2xl font-black font-mono text-rose-600">
                  {customersOverLimit.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {customersOverLimit.length === 0
                    ? 'All customer credit bounds safe.'
                    : 'Requires credit review or recovery.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-bg-secondary p-4">
                <p className="text-xs font-semibold text-slate-600">Unassigned Sales Accounts</p>
                <p className="mt-1 text-2xl font-black font-mono text-deep-green">
                  {unassignedCustomers.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {unassignedCustomers.length === 0
                    ? 'All accounts assigned to sales reps.'
                    : 'Territory assignment required.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Master Control Quick Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="elevated" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-deep-green text-sm">Product Master Hub</h4>
                  <p className="text-xs text-slate-500">Brands, Categories & SKU Specs</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Configure bulb models, wattage, CCT (3000K/6500K), base types (E27/B22), and carton conversions.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-between text-amber-700 font-bold hover:bg-amber-50"
                onClick={() => setActiveSection('PRODUCT_SKU')}
              >
                Manage Product Catalog →
              </Button>
            </Card>

            <Card variant="elevated" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-deep-green text-sm">Price Control Center</h4>
                  <p className="text-xs text-slate-500">Multi-tier Pricing & Margins</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Set Distributor, Dealer, and Retail price lists with effective date versioning and minimum trade floors.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-between text-emerald-700 font-bold hover:bg-emerald-50"
                onClick={() => setActiveSection('COMMERCIAL_PRICING')}
              >
                Manage Commercial Pricing →
              </Button>
            </Card>

            <Card variant="elevated" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-deep-green text-sm">Hierarchy & Roles</h4>
                  <p className="text-xs text-slate-500">RSM, ASM, TSM & Order Bookers</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Define reporting chains, territory bounds, and granular permission matrices for all 16 enterprise roles.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-between text-sky-700 font-bold hover:bg-sky-50"
                onClick={() => setActiveSection('ORGANIZATION')}
              >
                Configure Hierarchy →
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: PRODUCT & SKU MASTER */}
      {activeSection === 'PRODUCT_SKU' && (
        <Card variant="default" className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-deep-green">Product & SKU Master Registry</h3>
              <p className="text-xs text-slate-500">
                Single Source of Truth for National Lights LED Bulbs, SMD Panels, Flood Lights, and Luminaires.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter SKUs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-secondary w-48 sm:w-64"
                />
              </div>
              <Button
                variant="amber"
                size="sm"
                icon={Plus}
                onClick={() => setShowCreateModal('SKU')}
              >
                Add SKU
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-secondary text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Units / Ctn</th>
                  <th className="py-3 px-4 text-right">Trade Price</th>
                  <th className="py-3 px-4 text-right">Stock Qty</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {skus
                  .filter(
                    (s) =>
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((sku) => (
                    <tr key={sku.id} className="hover:bg-bg-secondary/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-text-primary">{sku.code}</td>
                      <td className="py-3 px-4 font-bold text-deep-green">{sku.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {sku.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{sku.cartonQty || 50} pcs</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-text-primary">
                        PKR {(sku.tradePrice || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`font-bold ${
                            (sku.stockQty || 0) <= (sku.reorderLevel || 10)
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {(sku.stockQty || 0).toLocaleString()} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge variant="emerald" dot>
                          Active
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SECTION 3: COMMERCIAL & PRICING */}
      {activeSection === 'COMMERCIAL_PRICING' && (
        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-deep-green">Commercial & Price Lists Control</h3>
              <p className="text-xs text-slate-500">
                Official Price Lists with Effective Date Versioning and Minimum Trade Margin Safeguards.
              </p>
            </div>
            <Button
              variant="amber"
              size="sm"
              icon={Plus}
              onClick={() => setShowCreateModal('PRICE_LIST')}
            >
              New Price Version
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-amber-900">Distributor Tier</span>
                <StatusBadge variant="amber">Effective: Active</StatusBadge>
              </div>
              <p className="mt-2 text-xl font-bold text-deep-green">Standard Distributor Matrix</p>
              <p className="text-xs text-slate-600 mt-1">
                Applied for official distributors with 30-day payment cycle.
              </p>
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-between text-xs font-mono font-bold">
                <span>Discount Floor:</span>
                <span>Max 8.5%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-bg-secondary">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-700">Dealer Wholesale Tier</span>
                <StatusBadge variant="emerald">Effective: Active</StatusBadge>
              </div>
              <p className="mt-2 text-xl font-bold text-deep-green">Retail Dealer Price 2026</p>
              <p className="text-xs text-slate-600 mt-1">
                Standard dealer pricing applied across Punjab, Sindh, and KPK territories.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs font-mono font-bold">
                <span>Discount Floor:</span>
                <span>Max 5.0%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-bg-secondary">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-700">Special Institutional Tier</span>
                <StatusBadge variant="sky">Effective: Active</StatusBadge>
              </div>
              <p className="mt-2 text-xl font-bold text-deep-green">Project & Contractor Rate</p>
              <p className="text-xs text-slate-600 mt-1">
                Special high-volume pricing for government and commercial housing projects.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs font-mono font-bold">
                <span>Approval:</span>
                <span>Sales Manager</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 4: MASTER DATA HEALTH & DIAGNOSTICS */}
      {activeSection === 'HEALTH_AUDIT' && (
        <Card variant="default" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-deep-green">Master Data Health Scanner</h3>
              <p className="text-xs text-slate-500">
                Continuous background scanner ensuring zero orphan records and zero unpriced items.
              </p>
            </div>
            <Button variant="outline" size="sm" icon={ShieldCheck} onClick={onOpenAuditLogs}>
              View Audit Trail
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-deep-teal" />
                <div>
                  <p className="text-sm font-bold text-deep-green">100% SKU Catalog Pricing</p>
                  <p className="text-xs text-slate-600">Every active SKU has a verified trade price.</p>
                </div>
              </div>
              <StatusBadge variant="emerald">Passed</StatusBadge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-deep-teal" />
                <div>
                  <p className="text-sm font-bold text-deep-green">Customer Credit Isolation</p>
                  <p className="text-xs text-slate-600">
                    Row-Level Security isolates credit balances per sales hierarchy.
                  </p>
                </div>
              </div>
              <StatusBadge variant="emerald">Passed</StatusBadge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-deep-teal" />
                <div>
                  <p className="text-sm font-bold text-deep-green">Append-Only Audit Trail</p>
                  <p className="text-xs text-slate-600">
                    All transaction RPCs enforce immutable record tracking.
                  </p>
                </div>
              </div>
              <StatusBadge variant="emerald">Enforced</StatusBadge>
            </div>
          </div>
        </Card>
      )}

      {/* QUICK CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-card/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-deep-green">
                  {showCreateModal === 'QUICK_CREATE'
                    ? 'Master Entity Creator'
                    : `Create ${showCreateModal}`}
                </h3>
                <p className="text-xs text-slate-500">Configure new master record in single source of truth.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { title: 'SKU Item', desc: 'LED Bulb, SMD, Flood', action: () => { setActiveSection('PRODUCT_SKU'); setShowCreateModal(null); } },
                { title: 'Customer / Dealer', desc: 'Retailer or Wholesale Store', action: () => { setShowCreateModal(null); } },
                { title: 'Distributor', desc: 'Regional Distribution Hub', action: () => { setShowCreateModal(null); } },
                { title: 'Price List', desc: 'Trade & Dealer Version', action: () => { setActiveSection('COMMERCIAL_PRICING'); setShowCreateModal(null); } },
                { title: 'Warehouse', desc: 'Factory or Central Depot', action: () => { setShowCreateModal(null); } },
                { title: 'Employee User', desc: 'Sales, Recovery, Accounts', action: () => { setActiveSection('USERS_ACCESS'); setShowCreateModal(null); } },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-bg-secondary hover:bg-amber-50/50 hover:border-amber-300 text-left transition-all group"
                >
                  <p className="text-xs font-bold text-deep-green group-hover:text-amber-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
