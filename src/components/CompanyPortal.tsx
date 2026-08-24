/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Company Web Portal (Desktop / Office Application)
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Building,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MapPin,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  User,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  Customer,
  Dispatch,
  InventoryBalance,
  Invoice,
  LedgerEntry,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  User as UserType,
} from '../types';

interface CompanyPortalProps {
  currentUser: UserType;
  customers: Customer[];
  skus: SKU[];
  inventoryBalances: InventoryBalance[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  recoveries: Recovery[];
  ledgerEntries: LedgerEntry[];
  dispatches: Dispatch[];
  stockReturns: StockReturn[];
  onPostInvoice: (orderId: string) => void;
  onVerifyRecovery: (recoveryId: string) => void;
}

export const CompanyPortal: React.FC<CompanyPortalProps> = ({
  currentUser,
  customers,
  skus,
  inventoryBalances,
  salesOrders,
  invoices,
  recoveries,
  ledgerEntries,
  dispatches,
  stockReturns,
  onPostInvoice,
  onVerifyRecovery,
}) => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'ORDERS' | 'INVOICES' | 'INVENTORY' | 'CUSTOMERS' | 'RECOVERY' | 'LEDGER' | 'DISPATCH' | 'RETURNS'
  >('OVERVIEW');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculations for executive overview
  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalSalesMTD = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalRecoveryMTD = recoveries
    .filter((r) => r.status === 'VERIFIED')
    .reduce((sum, r) => sum + r.amount, 0);
  const pendingRecoveryCount = recoveries.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const pendingOrdersCount = salesOrders.filter((o) => o.status === 'SUBMITTED').length;

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const customerLedger = ledgerEntries.filter((l) => l.customerId === activeCustomer?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Sub-Navigation Bar for Company Portal */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm overflow-x-auto flex items-center gap-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Management Overview
        </button>

        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'ORDERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-400" />
          Sales Orders
          {pendingOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'INVOICES'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-400" />
          Posted Invoices
        </button>

        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'INVENTORY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-amber-400" />
          Inventory Ledger
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          Customers & Credit
        </button>

        <button
          onClick={() => setActiveTab('RECOVERY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'RECOVERY'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 text-amber-400" />
          Recovery Verification
          {pendingRecoveryCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px]">
              {pendingRecoveryCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'LEDGER'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          Customer Ledger (360°)
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'DISPATCH'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-400" />
          Logistics & Bility
        </button>

        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'RETURNS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          Returns & Damage
        </button>
      </div>

      {/* 1. OVERVIEW COCKPIT */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Market Outstanding</span>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  PKR {totalOutstanding.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Across 3 Distributors & Dealers</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Invoiced Sales (MTD)</span>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  PKR {totalSalesMTD.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">Target: PKR 5,000,000 (74% Achieved)</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Recovery Realized (MTD)</span>
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-sky-700">
                  PKR {totalRecoveryMTD.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-sky-600 font-medium mt-1">
                {pendingRecoveryCount} pending verification
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Central Warehouse Stock</span>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {inventoryBalances.reduce((sum, b) => sum + b.quantityOnHand, 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">Units</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">5 Core National Lights SKUs</p>
            </div>

          </div>

          {/* Quick Action Matrix & Supply Chain Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Orders Requiring Action */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Recent Sales Orders & Credit Check Status
                </h3>
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                >
                  View All ({salesOrders.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Field Officer</th>
                      <th className="py-2.5 px-3 text-right">Total (PKR)</th>
                      <th className="py-2.5 px-3 text-center">Credit Tier</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {salesOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 font-sans">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{order.orderNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{order.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{order.salesUserName}</td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                          {order.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            order.creditCheckStatus === 'GREEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.creditCheckStatus === 'AMBER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {order.creditCheckStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            order.status === 'INVOICED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800 font-bold'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse Stock Alert Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                Live Stock Status
              </h3>
              <div className="space-y-3 text-xs">
                {inventoryBalances.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{item.skuCode}</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.quantityOnHand.toLocaleString()} {item.quantityOnHand <= 500 ? '⚠️' : '✅'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.skuName}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Reserved: {item.quantityReserved}</span>
                      <span>Available: {item.availableQuantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. SALES ORDERS & INVOICING PIPELINE */}
      {activeTab === 'ORDERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sales Order Pipeline & Verification</h2>
              <p className="text-xs text-slate-500">
                Authoritative server-side credit checks, pricing verification, and atomic invoice generation.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Sales/Recovery Officer</th>
                  <th className="py-3 px-3">Order Items</th>
                  <th className="py-3 px-3 text-right">Order Subtotal</th>
                  <th className="py-3 px-3 text-center">Credit Evaluation</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">{order.orderDate}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{order.customerName}</td>
                    <td className="py-3 px-3 text-slate-600">{order.salesUserName}</td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="space-y-0.5">
                        {order.items.map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-600">
                            {it.orderedQuantity}x {it.skuCode} @ PKR {it.unitPrice}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      PKR {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          order.creditCheckStatus === 'GREEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.creditCheckStatus === 'AMBER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {order.creditCheckStatus}
                        </span>
                        {order.creditCheckNotes && (
                          <span className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate">
                            {order.creditCheckNotes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        order.status === 'INVOICED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {order.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => onPostInvoice(order.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs transition-all shadow-sm"
                        >
                          Generate Invoice
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-mono font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Invoiced
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. POSTED INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Official Sales Invoices</h2>
              <p className="text-xs text-slate-500">
                Posted invoices are immutable. Every invoice automatically posted stock-out and debited customer ledger.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Invoice Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Previous Balance</th>
                  <th className="py-3 px-3 text-right">Invoice Amount</th>
                  <th className="py-3 px-3 text-right">New Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{inv.invoiceDate}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{inv.customerName}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      PKR {inv.previousBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      PKR {inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                      PKR {inv.newBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => alert(`Print Invoice ${inv.invoiceNumber}`)}
                        className="px-2.5 py-1 border border-slate-300 hover:bg-slate-100 rounded text-slate-700 text-xs font-medium"
                      >
                        Print PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. INVENTORY LEDGER */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Central Warehouse Stock Ledger</h2>
              <p className="text-xs text-slate-500">
                Transaction-based inventory: Opening Stock + Stock In - Stock Out = Current Stock.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skus.map((sku) => {
              const balance = inventoryBalances.find((b) => b.skuId === sku.id);
              return (
                <div key={sku.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                        {sku.skuCode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{sku.name}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Trade Price:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {sku.tradePrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Retail Price:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {sku.retailPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Carton Packaging:</span>
                      <span className="font-mono text-slate-800">{sku.cartonQuantity} pcs / carton</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reorder Level:</span>
                      <span className="font-mono text-slate-800">{sku.reorderLevel} units</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t text-xs font-mono">
                    <span className="text-slate-500 font-sans">Current Warehouse Stock:</span>
                    <span className="text-base font-bold text-slate-900">
                      {balance?.quantityOnHand.toLocaleString() || 0} Units
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CUSTOMERS & CREDIT */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer Portfolio & Credit Limits</h2>
              <p className="text-xs text-slate-500">
                Distributors and Dealers across Pakistan. Accounts managed strictly through credit rules.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Company / Customer Name</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">City / Region</th>
                  <th className="py-3 px-3 text-right">Credit Limit</th>
                  <th className="py-3 px-3 text-right">Current Outstanding</th>
                  <th className="py-3 px-3 text-center">Credit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{cust.customerCode}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{cust.companyName}</td>
                    <td className="py-3 px-3 text-slate-600">{cust.contactPerson} ({cust.phone})</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cust.type === 'DISTRIBUTOR' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cust.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{cust.city}, {cust.region}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      PKR {cust.creditLimit.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                      PKR {cust.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        cust.isCreditLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {cust.isCreditLocked ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. RECOVERY VERIFICATION */}
      {activeTab === 'RECOVERY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Accounts Recovery Verification</h2>
              <p className="text-xs text-slate-500">
                Review payment instruments collected by the unified Sales & Recovery field team before ledger posting.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Recovery #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Collected By</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3">Instrument / Bank</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recoveries.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{rec.recoveryNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rec.collectionDate}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{rec.customerName}</td>
                    <td className="py-3 px-3 text-slate-600">{rec.salesUserName}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{rec.paymentMode}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {rec.instrumentNumber ? `${rec.instrumentNumber} (${rec.bankName})` : 'Cash Receipt'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      PKR {rec.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        rec.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rec.status === 'PENDING_VERIFICATION' ? (
                        <button
                          onClick={() => onVerifyRecovery(rec.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                        >
                          Verify & Post
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-mono font-semibold">
                          Verified by {rec.verifiedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. CUSTOMER LEDGER (360 VIEW) */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer 360° Account Ledger</h2>
              <p className="text-xs text-slate-500">
                Formula: Opening Balance + Debits (Invoices) - Credits (Recoveries/Notes) = Running Balance
              </p>
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Select Customer:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Summary Card */}
          <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-slate-400 block">Customer Code:</span>
              <span className="font-mono font-bold text-amber-400">{activeCustomer.customerCode}</span>
              <div className="text-sm font-bold text-white mt-0.5">{activeCustomer.companyName}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Credit Limit:</span>
              <span className="font-mono font-bold text-lg text-white">
                PKR {activeCustomer.creditLimit.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Approved Credit Days:</span>
              <span className="font-mono font-bold text-lg text-white">{activeCustomer.creditDays} Days</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Current Outstanding Balance:</span>
              <span className="font-mono font-bold text-xl text-amber-400">
                PKR {activeCustomer.currentBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-3">Entry #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Transaction Type</th>
                  <th className="py-3 px-3">Reference / Description</th>
                  <th className="py-3 px-3 text-right">Debit (PKR)</th>
                  <th className="py-3 px-3 text-right">Credit (PKR)</th>
                  <th className="py-3 px-3 text-right">Running Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {customerLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 font-sans">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{entry.entryNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{entry.entryDate}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                        {entry.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{entry.description}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {entry.debitAmount > 0 ? entry.debitAmount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {entry.creditAmount > 0 ? entry.creditAmount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 text-sm">
                      {entry.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. LOGISTICS & DISPATCH */}
      {activeTab === 'DISPATCH' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Logistics, Bility & Transit Tracking</h2>
              <p className="text-xs text-slate-500">
                Track carrier, vehicle, driver, and Bility status from warehouse to customer destination.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {dispatches.map((dsp) => (
              <div key={dsp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">{dsp.dispatchNumber}</span>
                    <span className="text-xs text-slate-500 font-mono font-medium">Bility: {dsp.bilityNumber}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-xs self-start">
                    {dsp.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Transporter:</span>
                    <span className="font-semibold text-slate-800">{dsp.transporterName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vehicle & Driver:</span>
                    <span className="font-semibold text-slate-800">
                      {dsp.vehicleNumber} • {dsp.driverName} ({dsp.driverPhone})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Adda / Terminal:</span>
                    <span className="font-semibold text-slate-800">{dsp.addaName}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between font-mono">
                  <span>Dispatch Date: {dsp.dispatchDate}</span>
                  <span>Freight: PKR {dsp.freightCharges.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. REVERSE LOGISTICS & DAMAGE */}
      {activeTab === 'RETURNS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reverse Logistics & Damage Stock</h2>
              <p className="text-xs text-slate-500">
                Customer returns inspection, defective stock quarantine, and credit note issuance.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stockReturns.map((ret) => (
              <div key={ret.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">{ret.returnNumber}</span>
                    <span className="text-slate-500 font-sans">({ret.customerName})</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
                    {ret.status}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Claimed Items:</span>
                  {ret.items.map((it) => (
                    <div key={it.id} className="p-2.5 bg-white rounded border border-slate-100">
                      <div className="flex items-center justify-between font-mono font-semibold">
                        <span>{it.skuCode} ({it.skuName})</span>
                        <span>{it.claimedQuantity} Units @ PKR {it.unitPrice}</span>
                      </div>
                      <p className="text-slate-500 mt-1 font-sans">Reason: {it.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
