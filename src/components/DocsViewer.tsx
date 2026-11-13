/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Documentation & Schema Browser
 */

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Shield,
  Terminal,
} from 'lucide-react';

export const DocsViewer: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<
    'BLUEPRINT' | 'SCHEMA' | 'ARCHITECTURE' | 'ENV' | 'ROADMAP' | 'MIGRATION_SQL' | 'SEED_SQL'
  >('BLUEPRINT');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary text-deep-green hover:bg-primary/90 p-6 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-secondary/20 text-amber-300 border border-secondary/30">
                  PHASE 0 FOUNDATION
                </span>
                <a
                  href="https://github.com/AmjidOfficial/N-LINK360"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-deep-teal hover:text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>Repository: AmjidOfficial/N-LINK360</span>
                </a>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                System Blueprint & Technical Architecture
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Complete specifications for National Lights Integrated Sales, Recovery, Inventory & Distribution Platform
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/10 text-deep-teal border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-deep-teal" />
                Schema & Rules Verified
              </span>
            </div>
          </div>

          {/* Document Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveDoc('BLUEPRINT')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'BLUEPRINT'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Master Blueprint
            </button>

            <button
              onClick={() => setActiveDoc('SCHEMA')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'SCHEMA'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Database Schema (35+ Tables)
            </button>

            <button
              onClick={() => setActiveDoc('ARCHITECTURE')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'ARCHITECTURE'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              System Architecture & Flows
            </button>

            <button
              onClick={() => setActiveDoc('ENV')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'ENV'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Environment & Free-Tier Rules
            </button>

            <button
              onClick={() => setActiveDoc('ROADMAP')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'ROADMAP'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Development Roadmap (10 Phases)
            </button>

            <button
              onClick={() => setActiveDoc('MIGRATION_SQL')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'MIGRATION_SQL'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              001_initial_schema.sql
            </button>

            <button
              onClick={() => setActiveDoc('SEED_SQL')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeDoc === 'SEED_SQL'
                  ? 'bg-secondary text-deep-green font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              dev_seed.sql (Synthetic Fixtures)
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 text-slate-800 leading-relaxed font-sans text-sm overflow-x-auto">
          {activeDoc === 'BLUEPRINT' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-bold text-amber-900 text-base">National Lights North Star</h3>
                <p className="text-amber-800 mt-1">
                  “Enter information once, connect it everywhere, and let the system calculate the rest.”
                </p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-text-primary border-b pb-2 mb-3">
                  1. The Unified Sales + Recovery Single-Role Mandate
                </h2>
                <p className="text-slate-700">
                  National Lights utilizes a unified field representation model. The same field officer handles both customer sales orders and recovery collections. Operational workflows are unified in the mobile app, preventing duplicated field visits and uncoordinated accounts follow-ups.
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                    <span className="font-bold text-emerald-900 block mb-1">Field Representative Can:</span>
                    <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                      <li>Check customer live balance & credit limit</li>
                      <li>Book orders with live warehouse stock visibility</li>
                      <li>Record cash/cheque recovery collections</li>
                      <li>Report returns and damaged goods</li>
                      <li>GPS check-in/out during dealer visits</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
                    <span className="font-bold text-rose-900 block mb-1">Strict System Safeguards (Forbidden):</span>
                    <ul className="list-disc list-inside text-rose-800 space-y-0.5">
                      <li>Cannot manually change warehouse stock balances</li>
                      <li>Cannot alter posted invoices or prices</li>
                      <li>Cannot directly edit customer ledger balances</li>
                      <li>Cannot override manager approval decisions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-text-primary border-b pb-2 mb-3">
                  2. Forward & Reverse Transaction Equations
                </h2>
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-surface-card text-deep-teal rounded-lg">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-sans font-semibold">
                      INVENTORY EQUATION
                    </span>
                    Opening Stock + Stock In (Production/Returns/Transfers) - Stock Out (Sales/Damage/Transfers) = Current Stock
                  </div>
                  <div className="p-3 bg-surface-card text-deep-teal rounded-lg">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-sans font-semibold">
                      CUSTOMER LEDGER EQUATION
                    </span>
                    Opening Balance + Debits (Invoices/Debit Notes) - Credits (Recoveries/Credit Notes) = Closing Balance
                  </div>
                  <div className="p-3 bg-surface-card text-sky-400 rounded-lg">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-sans font-semibold">
                      CREDIT CHECK ENGINE
                    </span>
                    Current Outstanding + Pending Orders + New Order &le; Customer Credit Limit (Green &le; Limit, Amber &le; 115%, Red &gt; 115%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDoc === 'SCHEMA' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-bold text-text-primary">
                  Database Table Catalog (11 Functional Domains)
                </h2>
                <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600">
                  Engine: PostgreSQL 15+
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">1. Organization</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">companies:</strong> Company code, tax number, currency</li>
                    <li><strong className="text-text-primary">branches:</strong> Multi-city branch network</li>
                    <li><strong className="text-text-primary">factories:</strong> Production plants (Sundar Estate, etc.)</li>
                    <li><strong className="text-text-primary">warehouses:</strong> Central, Regional, Transit, Damage</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">2. Security & RBAC</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">roles:</strong> 8 distinct system roles</li>
                    <li><strong className="text-text-primary">permissions:</strong> Granular feature permissions</li>
                    <li><strong className="text-text-primary">users:</strong> User identity and branch linkage</li>
                    <li><strong className="text-text-primary">audit_logs:</strong> Immutable state change logs (JSONB)</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">3. Products & SKUs</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">product_categories:</strong> Bulbs, Panels, Floods</li>
                    <li><strong className="text-text-primary">brands:</strong> National Pro, National EcoLine</li>
                    <li><strong className="text-text-primary">products:</strong> Base item definitions</li>
                    <li><strong className="text-text-primary">skus:</strong> Wattage, CCT, Trade/Retail/Min Price</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">4. Sales Field & Customers</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">customers:</strong> Distributors & Dealers with Credit Limits</li>
                    <li><strong className="text-text-primary">sales_users:</strong> Employee code, region, monthly targets</li>
                    <li><strong className="text-text-primary">customer_assignments:</strong> Account mapping</li>
                    <li><strong className="text-text-primary">customer_visits:</strong> GPS check-in/out records</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">5. Inventory & Production</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">production_batches:</strong> Factory batches & QC notes</li>
                    <li><strong className="text-text-primary">production_items:</strong> Planned vs produced quantities</li>
                    <li><strong className="text-text-primary">inventory_transactions:</strong> Immutable source of truth</li>
                    <li><strong className="text-text-primary">inventory_balances:</strong> Fast projection cache</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">6. Orders & Invoicing</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">sales_orders:</strong> Order items, credit check evaluation</li>
                    <li><strong className="text-text-primary">invoices:</strong> Atomic stock-out + ledger debit</li>
                    <li><strong className="text-text-primary">invoice_items:</strong> Invoiced lines & discounts</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">7. Logistics & Dispatch</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">dispatches:</strong> Transporter, vehicle, driver, bility</li>
                    <li><strong className="text-text-primary">goods_receipts:</strong> GRN receiving and short/excess</li>
                  </ul>
                </div>

                <div className="p-4 bg-bg-secondary border rounded-lg">
                  <h3 className="font-bold text-text-primary text-sm mb-2 text-amber-700">8. Accounts & Recovery</h3>
                  <ul className="text-xs space-y-1 text-slate-700 font-mono">
                    <li><strong className="text-text-primary">recoveries:</strong> Cash, cheque, bank transfer logs</li>
                    <li><strong className="text-text-primary">ledger_entries:</strong> Debits, credits, running balance</li>
                    <li><strong className="text-text-primary">credit_notes / debit_notes:</strong> Reversals & allowances</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeDoc === 'ARCHITECTURE' && (
            <div className="space-y-6 max-w-4xl">
              <h2 className="text-lg font-bold text-text-primary border-b pb-2">
                System Topology & Transactional Integrity
              </h2>
              <div className="p-4 bg-surface-card text-slate-100 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre">
{`+-----------------------------------------------------------------------------------+
|                              N-LINK 360 DUAL CLIENTS                              |
|   +------------------------------------+    +---------------------------------+   |
|   |        Company Web Portal          |    |      Sales & Recovery App       |   |
|   |      (Desktop / Operations)        |    |      (Mobile-First / Field)     |   |
|   +-----------------+------------------+    +-----------------+---------------+   |
+---------------------+-----------------------------------------+-------------------+
                      |                                         |
                      +--------------------+--------------------+
                                           |
                               HTTPS REST / RPC Gateway
                                           |
+------------------------------------------+----------------------------------------+
|                          NODE.JS EXPRESS RUNTIME                                  |
|  * RBAC Security Guard & Auth Middleware                                          |
|  * Fixed-Precision Money Math (Zero floating-point corruption)                   |
|  * Credit Policy Evaluation Engine (Green / Amber / Red)                          |
|  * Atomic Transaction Orchestrator (Single-commit rollback boundary)              |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------+----------------------------------------+
|                          DATABASE: POSTGRESQL / SUPABASE                          |
|  * Immutable Transaction Logs: inventory_transactions, ledger_entries, audit_logs |
|  * Materialized Projections: inventory_balances, customers.current_balance        |
+-----------------------------------------------------------------------------------+`}
              </div>
            </div>
          )}

          {activeDoc === 'ENV' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className="text-lg font-bold text-text-primary border-b pb-2">
                Free-Tier Infrastructure & Environment Separation
              </h2>
              <div className="p-4 bg-bg-secondary border rounded-lg text-xs space-y-2">
                <p><strong className="text-text-primary">DEV Environment:</strong> Project <code className="bg-slate-200 px-1 rounded">n-link360-dev</code> using synthetic fixture data exclusively.</p>
                <p><strong className="text-text-primary">PROD Environment:</strong> Dedicated isolated project <code className="bg-slate-200 px-1 rounded">n-link360-prod</code> upon pilot approval.</p>
                <p><strong className="text-text-primary">Free-First Policy:</strong> Zero paid upgrades or subscriptions permitted during development. Operates entirely within Supabase free-tier PostgreSQL, free auth, free storage, and AI Studio free models.</p>
              </div>
            </div>
          )}

          {activeDoc === 'ROADMAP' && (
            <div className="space-y-4 max-w-4xl">
              <h2 className="text-lg font-bold text-text-primary border-b pb-2">
                10-Phase Gated Implementation Tracker
              </h2>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                  <div>
                    <strong className="text-emerald-950 font-bold">Phase 0: Foundation & Core Integrity Math</strong>
                    <p className="text-emerald-800">Master blueprint, database schema, migration DDL, seed dataset, business rules engine, and unit test suite.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-deep-teal text-white rounded font-semibold text-[11px]">COMPLETED</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 1: Identity & Masters Management</strong>
                    <p className="text-slate-600">Company, Branch, Factory, Warehouse, Product, SKU, and Customer masters with RBAC.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded font-semibold text-[11px]">NEXT IN QUEUE</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 2: Inventory & Production Engine</strong>
                    <p className="text-slate-600">Factory batching, QC inspection, inter-warehouse stock transfers, adjustments, stock ledger.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 2</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 3: Sales & Recovery Field Mobile App</strong>
                    <p className="text-slate-600">Mobile visits, GPS check-in, order booking, recovery collections, customer 360.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 3</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 4: Order to Invoice & Atomic Ledger Integration</strong>
                    <p className="text-slate-600">Credit check evaluation, manager approval workflow, atomic invoice posting & PDF generation.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 4</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 5: Logistics, Dispatch & GRN</strong>
                    <p className="text-slate-600">Transporter, vehicle, driver, bility creation, transit tracking, receiving discrepancy notes.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 5</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 6: Accounts, Recovery Verification & Statements</strong>
                    <p className="text-slate-600">Payment instrument clearance, customer ledger aging (30/60/90 days), credit/debit notes.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 6</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 7: Reverse Logistics & Damaged Stock</strong>
                    <p className="text-slate-600">Customer returns grading (Saleable vs Defective), scrap/repair workflows, credit notes.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 7</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 8: Executive Intelligence & Performance Analytics</strong>
                    <p className="text-slate-600">Drillable sales & recovery KPIs (National &rarr; Region &rarr; Field Rep &rarr; Customer &rarr; SKU).</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 8</span>
                </div>

                <div className="p-3 bg-bg-secondary border border-slate-200 rounded-lg flex items-center justify-between opacity-80">
                  <div>
                    <strong className="text-text-primary font-bold">Phase 9 & 10: In-App Alerts, Security Audit & Pilot Rollout</strong>
                    <p className="text-slate-600">Notification triggers, database RLS hardening, backup/restore drills, pilot launch.</p>
                  </div>
                  <span className="text-slate-400 font-mono">PHASE 9-10</span>
                </div>
              </div>
            </div>
          )}

          {activeDoc === 'MIGRATION_SQL' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-500 font-semibold">/database/migrations/001_initial_schema.sql</span>
                <span className="text-xs text-slate-500">PostgreSQL DDL</span>
              </div>
              <pre className="p-4 bg-surface-card text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]">
{`-- N-LINK 360: PostgreSQL Database Schema Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATION
CREATE TABLE IF NOT EXISTS companies (...);
CREATE TABLE IF NOT EXISTS branches (...);
CREATE TABLE IF NOT EXISTS factories (...);
CREATE TABLE IF NOT EXISTS warehouses (...);

-- 2. SECURITY & RBAC
CREATE TABLE IF NOT EXISTS roles (...);
CREATE TABLE IF NOT EXISTS permissions (...);
CREATE TABLE IF NOT EXISTS role_permissions (...);
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS audit_logs (...);
CREATE TABLE IF NOT EXISTS notifications (...);

-- 3. PRODUCTS & SKUs
CREATE TABLE IF NOT EXISTS product_categories (...);
CREATE TABLE IF NOT EXISTS brands (...);
CREATE TABLE IF NOT EXISTS products (...);
CREATE TABLE IF NOT EXISTS skus (...);

-- 4. SALES FIELD & CUSTOMERS
CREATE TABLE IF NOT EXISTS sales_users (...);
CREATE TABLE IF NOT EXISTS customers (...);
CREATE TABLE IF NOT EXISTS customer_assignments (...);
CREATE TABLE IF NOT EXISTS customer_visits (...);

-- 5. PRODUCTION & INVENTORY
CREATE TABLE IF NOT EXISTS production_batches (...);
CREATE TABLE IF NOT EXISTS production_items (...);
CREATE TABLE IF NOT EXISTS inventory_transactions (...);
CREATE TABLE IF NOT EXISTS inventory_balances (...);

-- 6. SALES ORDERS & INVOICES
CREATE TABLE IF NOT EXISTS sales_orders (...);
CREATE TABLE IF NOT EXISTS sales_order_items (...);
CREATE TABLE IF NOT EXISTS invoices (...);
CREATE TABLE IF NOT EXISTS invoice_items (...);

-- 7. LOGISTICS & DISPATCH
CREATE TABLE IF NOT EXISTS transporters (...);
CREATE TABLE IF NOT EXISTS addas (...);
CREATE TABLE IF NOT EXISTS vehicles (...);
CREATE TABLE IF NOT EXISTS drivers (...);
CREATE TABLE IF NOT EXISTS dispatches (...);
CREATE TABLE IF NOT EXISTS goods_receipts (...);
CREATE TABLE IF NOT EXISTS goods_receipt_items (...);

-- 8. ACCOUNTS & RECOVERY
CREATE TABLE IF NOT EXISTS recoveries (...);
CREATE TABLE IF NOT EXISTS ledger_entries (...);
CREATE TABLE IF NOT EXISTS credit_notes (...);
CREATE TABLE IF NOT EXISTS debit_notes (...);

-- 9. REVERSE LOGISTICS
CREATE TABLE IF NOT EXISTS stock_returns (...);
CREATE TABLE IF NOT EXISTS stock_return_items (...);
CREATE TABLE IF NOT EXISTS damage_stock (...);`}
              </pre>
            </div>
          )}

          {activeDoc === 'SEED_SQL' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-500 font-semibold">/database/seed/dev_seed.sql</span>
                <span className="text-xs text-deep-teal font-semibold">DEV Synthetic Dataset</span>
              </div>
              <pre className="p-4 bg-surface-card text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]">
{`-- N-LINK 360 Development Seed Dataset
-- Strict prohibition against real customer data in DEV environment.

-- Company
INSERT INTO companies (id, code, name, currency) VALUES ('...', 'NL-CORP', 'National Lights (Pvt) Ltd', 'PKR');

-- Branches & Factories
INSERT INTO branches (id, code, name, city) VALUES ('...', 'BR-LHR', 'Lahore Central Branch', 'Lahore');
INSERT INTO factories (id, code, name) VALUES ('...', 'FACT-LHR-01', 'National Lights Main Plant 1');
INSERT INTO warehouses (id, code, name, type) VALUES ('...', 'WH-LHR-CENTRAL', 'Lahore Central Warehouse', 'CENTRAL');

-- SKUs Catalog
-- 12W LED Bulbs, 18W Bulbs, 7W SMD Panels, 50W Flood Lights
-- Distributors & Dealers
-- Al-Madina Electric Corp, Bright Spark Light House, Khyber Light Centre
-- Initial Inventory Balances & Ledger Transactions`}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
