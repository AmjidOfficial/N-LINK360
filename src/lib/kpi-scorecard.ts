/**
 * Configurable Salesflo-Inspired 6-KPI Scorecard Engine for N-LINK 360
 * Shared across Field Mobile and Head Office Enterprise Reporting.
 * Excludes REJECTED/CANCELLED/DRAFT orders and protects against zero denominators.
 */

import { Customer, Recovery, SalesOrder } from '../types';

export type KpiPeriod = 'DAILY' | 'WEEKLY' | 'MTD';

export interface KpiWeightConfig {
  outletProductivity: number; // default 20%
  callProductivity: number;   // default 15%
  billProductivity: number;   // default 20%
  skuPerBill: number;         // default 15%
  strikeRate: number;         // default 20%
  visitCompliance: number;    // default 10%
}

export const DEFAULT_KPI_WEIGHTS: KpiWeightConfig = {
  outletProductivity: 20,
  callProductivity: 15,
  billProductivity: 20,
  skuPerBill: 15,
  strikeRate: 20,
  visitCompliance: 10,
};

export interface KpiMetricResult {
  id: keyof KpiWeightConfig;
  label: string;
  weightage: number;
  target: number;
  achievement: number;
  achievementPct: number;
  pointsEarned: number;
  formula: string;
  sourceSummary: string;
  unit?: string;
}

export interface KpiScorecardResult {
  period: KpiPeriod;
  totalPoints: number;
  maxPoints: number;
  metrics: KpiMetricResult[];
  eligibleOrderCount: number;
  eligibleRecoveryCount: number;
  uniqueDealersServed: number;
}

function getPeriodCutoffIso(period: KpiPeriod, referenceDate = new Date()): string {
  const d = new Date(referenceDate);
  if (period === 'DAILY') {
    return d.toISOString().slice(0, 10);
  }
  if (period === 'WEEKLY') {
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  return `${d.toISOString().slice(0, 7)}-01`;
}

export function calculateKpiScorecard(params: {
  period: KpiPeriod;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  weights?: KpiWeightConfig;
  referenceDate?: Date;
}): KpiScorecardResult {
  const {
    period,
    customers,
    orders,
    recoveries,
    weights = DEFAULT_KPI_WEIGHTS,
    referenceDate = new Date(),
  } = params;

  const cutoffIso = getPeriodCutoffIso(period, referenceDate);

  // Exclude REJECTED / CANCELLED / DRAFT orders from productive bill calculations
  const eligibleOrders = orders.filter((o) => {
    const dt = (o.orderDate || o.createdAt || '').slice(0, 10);
    const status = String(o.status || '').toUpperCase();
    return dt >= cutoffIso && status !== 'REJECTED' && status !== 'CANCELLED' && status !== 'DRAFT';
  });

  const eligibleRecoveries = recoveries.filter((r) => {
    const dt = (r.recordedAt || r.createdAt || '').slice(0, 10);
    const status = String(r.status || '').toUpperCase();
    return dt >= cutoffIso && status !== 'REJECTED';
  });

  const assignedDealerCount = Math.max(customers.length, 1);
  const periodMultiplier = period === 'DAILY' ? 1 : period === 'WEEKLY' ? 2 : 3;

  // 1. Outlet (Dealer / Distributor) Productivity: unique dealers billed / assigned target
  const uniqueBilledDealers = new Set(eligibleOrders.map((o) => o.customerId));
  const uniqueRecoveredDealers = new Set(eligibleRecoveries.map((r) => r.customerId));
  const uniqueServedDealers = new Set([...uniqueBilledDealers, ...uniqueRecoveredDealers]);

  const outletTarget = assignedDealerCount;
  const outletAch = uniqueBilledDealers.size;
  const outletPct = outletTarget > 0 ? Math.min(100, Math.round((outletAch / outletTarget) * 100)) : 0;
  const outletPts = Number(((outletPct / 100) * weights.outletProductivity).toFixed(1));

  // 2. Call Productivity: valid field interactions (orders + recoveries) / target calls
  const callTarget = Math.max(assignedDealerCount * periodMultiplier, 1);
  const totalValidCalls = eligibleOrders.length + eligibleRecoveries.length;
  const callPct = callTarget > 0 ? Math.min(100, Math.round((totalValidCalls / callTarget) * 100)) : 0;
  const callPts = Number(((callPct / 100) * weights.callProductivity).toFixed(1));

  // 3. Bill Productivity: productive invoices / assigned bill target
  const billTarget = Math.max(Math.round(assignedDealerCount * 0.75 * periodMultiplier), 1);
  const billAch = eligibleOrders.length;
  const billPct = billTarget > 0 ? Math.min(100, Math.round((billAch / billTarget) * 100)) : 0;
  const billPts = Number(((billPct / 100) * weights.billProductivity).toFixed(1));

  // 4. SKU per Bill: total eligible SKU lines / eligible invoices
  const totalSkuLines = eligibleOrders.reduce((sum, o) => sum + (o.items?.length || 1), 0);
  const avgSkuPerBill = eligibleOrders.length > 0 ? Number((totalSkuLines / eligibleOrders.length).toFixed(2)) : 0;
  const skuTarget = 4;
  const skuPct = skuTarget > 0 ? Math.min(100, Math.round((avgSkuPerBill / skuTarget) * 100)) : 0;
  const skuPts = Number(((skuPct / 100) * weights.skuPerBill).toFixed(1));

  // 5. Strike Rate: productive orders / valid total calls * 100
  const strikePct = totalValidCalls > 0 ? Math.min(100, Math.round((eligibleOrders.length / totalValidCalls) * 100)) : 0;
  const strikeTarget = 80;
  const strikeRatio = strikeTarget > 0 ? Math.min(1, strikePct / strikeTarget) : 0;
  const strikePts = Number((strikeRatio * weights.strikeRate).toFixed(1));

  // 6. Visit Compliance: unique served Dealers / Distributors / planned beat
  const visitTarget = assignedDealerCount;
  const visitAch = uniqueServedDealers.size;
  const visitPct = visitTarget > 0 ? Math.min(100, Math.round((visitAch / visitTarget) * 100)) : 0;
  const visitPts = Number(((visitPct / 100) * weights.visitCompliance).toFixed(1));

  const metrics: KpiMetricResult[] = [
    {
      id: 'outletProductivity',
      label: 'Dealer / Distributor Productivity',
      weightage: weights.outletProductivity,
      target: outletTarget,
      achievement: outletAch,
      achievementPct: outletPct,
      pointsEarned: outletPts,
      formula: 'Unique Dealers Billed ÷ Assigned Dealers × 100',
      sourceSummary: `${outletAch} billed of ${outletTarget} assigned Dealers / Distributors`,
    },
    {
      id: 'callProductivity',
      label: 'Call Productivity',
      weightage: weights.callProductivity,
      target: callTarget,
      achievement: totalValidCalls,
      achievementPct: callPct,
      pointsEarned: callPts,
      formula: 'Valid Field Calls (Orders + Recoveries) ÷ Call Target × 100',
      sourceSummary: `${totalValidCalls} valid calls against target ${callTarget}`,
    },
    {
      id: 'billProductivity',
      label: 'Bill Productivity',
      weightage: weights.billProductivity,
      target: billTarget,
      achievement: billAch,
      achievementPct: billPct,
      pointsEarned: billPts,
      formula: 'Productive Invoices ÷ Bill Target × 100',
      sourceSummary: `${billAch} eligible invoices (excludes Rejected/Draft)`,
    },
    {
      id: 'skuPerBill',
      label: 'SKU Per Bill',
      weightage: weights.skuPerBill,
      target: skuTarget,
      achievement: avgSkuPerBill,
      achievementPct: skuPct,
      pointsEarned: skuPts,
      formula: 'Total Eligible SKU Lines ÷ Eligible Invoices',
      sourceSummary: `${totalSkuLines} SKU lines across ${eligibleOrders.length} invoices`,
      unit: 'SKUs',
    },
    {
      id: 'strikeRate',
      label: 'Strike Rate',
      weightage: weights.strikeRate,
      target: strikeTarget,
      achievement: strikePct,
      achievementPct: strikePct,
      pointsEarned: strikePts,
      formula: 'Productive Orders ÷ Valid Total Calls × 100',
      sourceSummary: `${eligibleOrders.length} productive orders from ${totalValidCalls} calls`,
      unit: '%',
    },
    {
      id: 'visitCompliance',
      label: 'Visit Compliance',
      weightage: weights.visitCompliance,
      target: visitTarget,
      achievement: visitAch,
      achievementPct: visitPct,
      pointsEarned: visitPts,
      formula: 'Valid Completed Visits ÷ Planned Beat × 100',
      sourceSummary: `${visitAch} Dealers / Distributors visited of ${visitTarget} in beat`,
    },
  ];

  const totalPoints = Number(metrics.reduce((s, m) => s + m.pointsEarned, 0).toFixed(1));
  const maxPoints =
    weights.outletProductivity +
    weights.callProductivity +
    weights.billProductivity +
    weights.skuPerBill +
    weights.strikeRate +
    weights.visitCompliance;

  return {
    period,
    totalPoints,
    maxPoints,
    metrics,
    eligibleOrderCount: eligibleOrders.length,
    eligibleRecoveryCount: eligibleRecoveries.length,
    uniqueDealersServed: uniqueServedDealers.size,
  };
}
