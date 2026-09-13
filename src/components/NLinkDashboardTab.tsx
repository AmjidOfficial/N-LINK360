/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Interactive Unified Dashboard Hub
 * Combines individual Target Achievements and team-wide FMCG Analytical Command Center.
 */

import React, { useState } from 'react';
import { TrendingUp, Target, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { FmcgCommandCenter } from './FmcgCommandCenter';
import { NLinkTargetAchievementTab } from './NLinkTargetAchievementTab';
import { NLinkUser } from '../data/nlink-users-team';
import { Customer, SalesOrder, Recovery } from '../types';
import { NLINK_OFFICIAL_PRODUCTS } from '../data/nlink-products';

interface NLinkDashboardTabProps {
  currentUser: NLinkUser;
  allUsers: NLinkUser[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  recoveries: Recovery[];
}

export const NLinkDashboardTab: React.FC<NLinkDashboardTabProps> = ({
  currentUser,
  allUsers,
  customers,
  salesOrders,
  recoveries,
}) => {
  const [subTab, setSubTab] = useState<'ANALYTICS' | 'TARGET_GAUGES'>('ANALYTICS');

  return (
    <div className="space-y-6" id="unified-dashboard-tab-container">
      {/* Visual Navigation Sub-Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">N-Link Executive Dashboard</h2>
          <p className="text-[11px] text-slate-500">Real-time team analytics, individual targets and central business command.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('ANALYTICS')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'ANALYTICS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Command Analytics Desk</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSubTab('TARGET_GAUGES')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'TARGET_GAUGES'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Target Achievements</span>
          </button>
        </div>
      </div>

      {/* Conditional Sub-View Render */}
      <div>
        {subTab === 'ANALYTICS' ? (
          <FmcgCommandCenter
            currentUser={currentUser as any}
            customers={customers}
            skus={NLINK_OFFICIAL_PRODUCTS as any}
            salesOrders={salesOrders}
            recoveries={recoveries}
            visits={[]}
          />
        ) : (
          <NLinkTargetAchievementTab
            currentUser={currentUser}
            allUsers={allUsers}
          />
        )}
      </div>
    </div>
  );
};
