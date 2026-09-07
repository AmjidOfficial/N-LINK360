import React, { useMemo } from 'react';
import { Target, TrendingUp, Award, AlertCircle, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';

interface MtdAchievementGaugeProps {
  salesAchieved: number;
  salesTarget: number;
  salesPercent: number;
  monthName?: string;
  approvedValue?: number;
  pendingValue?: number;
  daysPassed?: number;
  totalDaysInMonth?: number;
}

export const MtdAchievementGauge: React.FC<MtdAchievementGaugeProps> = ({
  salesAchieved,
  salesTarget,
  salesPercent,
  monthName = 'Current Month',
  approvedValue = 0,
  pendingValue = 0,
  daysPassed = new Date().getDate(),
  totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
}) => {
  // Safe math calculations
  const targetVal = Math.max(salesTarget, 1);
  const actualVal = Math.max(salesAchieved, 0);
  const percent = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
  const clampedPercent = Math.min(Math.max(percent, 0), 150); // allow up to 150% for overachievers

  // Time-based expected pace
  const monthElapsedPercent = Math.min(Math.round((daysPassed / totalDaysInMonth) * 100), 100);
  const paceGap = percent - monthElapsedPercent;

  const paceStatus = useMemo(() => {
    if (percent >= 100) {
      return {
        label: 'Target Achieved',
        subLabel: 'Outstanding Performance!',
        color: 'emerald',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badge: 'bg-emerald-600 text-white',
        strokeColor: '#059669',
      };
    }
    if (paceGap >= 0) {
      return {
        label: 'Ahead of Pace',
        subLabel: `${Math.abs(Math.round(paceGap))}% ahead of month elapsed velocity`,
        color: 'teal',
        bg: 'bg-teal-50 text-teal-800 border-teal-200',
        badge: 'bg-teal-600 text-white',
        strokeColor: '#0d9488',
      };
    }
    if (paceGap >= -15) {
      return {
        label: 'On Track',
        subLabel: 'Normal operating pace for current period',
        color: 'cyan',
        bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        badge: 'bg-cyan-600 text-white',
        strokeColor: '#0891b2',
      };
    }
    return {
      label: 'Requires Acceleration',
      subLabel: `${Math.abs(Math.round(paceGap))}% behind expected calendar pace`,
      color: 'amber',
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      badge: 'bg-amber-600 text-white',
      strokeColor: '#d97706',
    };
  }, [percent, paceGap]);

  // SVG Gauge Math (180-degree semicircle)
  // Radius = 85, Center = (110, 105), Circumference of semicircle = PI * R = 267.035
  const radius = 80;
  const strokeWidth = 14;
  const arcCircumference = Math.PI * radius;
  // Progress fraction 0.0 to 1.0 (capped at 100% for arc length, but displays true % number)
  const arcProgress = Math.min(percent / 100, 1.0);
  const strokeDashoffset = arcCircumference * (1 - arcProgress);

  // Needle angle: -90 degrees (0%) to +90 degrees (100%), with up to 135 deg for 150%
  const needleAngle = -90 + (clampedPercent / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 12;
  const needleX = 110 + needleLength * Math.cos(needleRad);
  const needleY = 105 + needleLength * Math.sin(needleRad);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>MTD Sales vs Assigned Target</span>
              <span className="text-[10px] font-bold text-slate-500 normal-case">({monthName})</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Day {daysPassed} of {totalDaysInMonth} ({monthElapsedPercent}% Month Elapsed)
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${paceStatus.bg}`}>
          {paceStatus.label}
        </span>
      </div>

      {/* Main Visual: Gauge + Comparative Metric Bars */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* SVG Speedometer Gauge (Col 5) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative w-full max-w-[230px] aspect-[220/130] flex items-center justify-center">
            <svg
              viewBox="0 0 220 130"
              className="w-full h-full overflow-visible"
              aria-label={`Sales achievement gauge showing ${Math.round(percent)}%`}
            >
              <defs>
                {/* Gradient for progress arc */}
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="65%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                {/* Subtle drop shadow for center needle hub */}
                <filter id="hubShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Background Track Arc (Greyed) */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Expected Month Pace Marker (Dotted arc or threshold tick) */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={strokeWidth - 6}
                strokeDasharray={`2, 6`}
                strokeLinecap="round"
              />

              {/* Active Progress Fill Arc */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={arcCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Major Tick Marks (0%, 50%, 100%) */}
              <text x="24" y="124" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="middle">
                0%
              </text>
              <text x="110" y="20" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="middle">
                50%
              </text>
              <text x="196" y="124" fontSize="10" fontWeight="bold" fill="#64748b" textAnchor="middle">
                100%
              </text>

              {/* Needle Indicator Line */}
              <line
                x1="110"
                y1="105"
                x2={needleX}
                y2={needleY}
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />

              {/* Needle Tip Accent Dot */}
              <circle
                cx={needleX}
                cy={needleY}
                r="3"
                fill={paceStatus.strokeColor}
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Center Hub */}
              <circle cx="110" cy="105" r="9" fill="#0f172a" filter="url(#hubShadow)" />
              <circle cx="110" cy="105" r="3.5" fill="#ffffff" />
            </svg>
          </div>

          {/* Central Percentage Value */}
          <div className="text-center -mt-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                {Math.round(percent)}%
              </span>
              <span className="text-xs font-bold text-teal-700 uppercase">Achieved</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{paceStatus.subLabel}</p>
          </div>
        </div>

        {/* Comparative SVG Bar Breakdown (Col 7) */}
        <div className="md:col-span-7 space-y-3.5 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80">
          {/* Bar 1: Assigned Target */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Assigned Target</span>
              </span>
              <span className="font-mono text-slate-900">
                Rs. {salesTarget.toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-slate-500 rounded-full w-full" />
            </div>
          </div>

          {/* Bar 2: Total Achieved (Stacked Approved + Pending) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <span>Total MTD Realized</span>
              </span>
              <span className="font-mono text-teal-700 text-sm font-black">
                Rs. {salesAchieved.toLocaleString()}
              </span>
            </div>

            {/* Split Bar (Approved vs Pending Clearance) */}
            <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
              {salesAchieved > 0 && targetVal > 0 && (
                <>
                  {approvedValue > 0 && (
                    <div
                      style={{ width: `${Math.min((approvedValue / targetVal) * 100, 100)}%` }}
                      className="h-full bg-teal-600 hover:bg-teal-700 transition-all duration-500"
                      title={`Approved Sales: Rs. ${approvedValue.toLocaleString()}`}
                    />
                  )}
                  {pendingValue > 0 && (
                    <div
                      style={{ width: `${Math.min((pendingValue / targetVal) * 100, 100 - (approvedValue / targetVal) * 100)}%` }}
                      className="h-full bg-amber-500 hover:bg-amber-600 transition-all duration-500"
                      title={`Pending Approval: Rs. ${pendingValue.toLocaleString()}`}
                    />
                  )}
                </>
              )}
            </div>

            {/* Legend for Approved vs Pending */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span>Approved: Rs. {approvedValue.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Pending: Rs. {pendingValue.toLocaleString()}</span>
                </span>
              </div>
              <span className="font-bold text-slate-700">
                {percent > 0 ? `${(percent).toFixed(1)}% of Target` : '0%'}
              </span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Shortfall / Gap</span>
              <span className={`font-mono font-bold ${salesTarget - salesAchieved <= 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                {salesTarget - salesAchieved <= 0
                  ? 'Target Surpassed'
                  : `Rs. ${(salesTarget - salesAchieved).toLocaleString()}`}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Daily Target Pace</span>
              <span className="font-mono font-bold text-teal-800">
                Rs. {Math.round(salesTarget / totalDaysInMonth).toLocaleString()} / day
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
