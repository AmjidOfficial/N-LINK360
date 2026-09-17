import React, { useMemo } from 'react';
import { Target, TrendingUp, Award, DollarSign, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

interface MtdAchievementGaugeProps {
  salesAchieved: number;
  salesTarget: number;
  salesPercent: number;
  recoveryAchieved?: number;
  recoveryTarget?: number;
  recoveryPercent?: number;
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
  recoveryAchieved = 0,
  recoveryTarget = 0,
  recoveryPercent = 0,
  monthName = 'Current Month',
  approvedValue = 0,
  pendingValue = 0,
  daysPassed = new Date().getDate(),
  totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
}) => {
  // 1. Sales Math
  const targetVal = Math.max(salesTarget, 1);
  const actualVal = Math.max(salesAchieved, 0);
  const percent = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
  const clampedPercent = Math.min(Math.max(percent, 0), 150);

  // 2. Recovery Math
  const recTargetVal = Math.max(recoveryTarget, 1);
  const recActualVal = Math.max(recoveryAchieved, 0);
  const recPercent = recTargetVal > 0 ? (recActualVal / recTargetVal) * 100 : 0;
  const clampedRecPercent = Math.min(Math.max(recPercent, 0), 150);

  // Time-based expected pace
  const monthElapsedPercent = Math.min(Math.round((daysPassed / totalDaysInMonth) * 100), 100);
  const paceGap = percent - monthElapsedPercent;
  const recPaceGap = recPercent - monthElapsedPercent;

  const getPaceStatus = (pct: number, gap: number) => {
    if (pct >= 100) {
      return {
        label: 'Achieved',
        color: '#059669',
        textColor: 'text-emerald-800 dark:text-emerald-400',
        borderColor: 'border-emerald-200 dark:border-emerald-900/30',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      };
    }
    if (gap >= 0) {
      return {
        label: 'Ahead of Pace',
        color: '#0d9488',
        textColor: 'text-teal-800 dark:text-teal-400',
        borderColor: 'border-teal-200 dark:border-teal-900/30',
        bgColor: 'bg-teal-50 dark:bg-teal-950/20',
      };
    }
    if (gap >= -15) {
      return {
        label: 'On Track',
        color: '#0891b2',
        textColor: 'text-cyan-800 dark:text-cyan-400',
        borderColor: 'border-cyan-200 dark:border-cyan-900/30',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
      };
    }
    return {
      label: 'Needs Attention',
      color: '#d97706',
      textColor: 'text-amber-900 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-900/30',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    };
  };

  const salesPace = getPaceStatus(percent, paceGap);
  const recoveryPace = getPaceStatus(recPercent, recPaceGap);

  // SVG Gauge Calculations (Radius = 80, Semicircle Circumference = PI * R = 251.327)
  const radius = 80;
  const strokeWidth = 14;
  const arcCircumference = Math.PI * radius;

  // Gauge SVG Coordinates Function
  const calculateNeedleCoordinates = (valPercent: number) => {
    const angle = -180 + (valPercent / 100) * 180; // maps 0%-100% to -180 to 0 degrees
    const angleRad = (angle * Math.PI) / 180;
    const length = radius - 15;
    const x = 110 + length * Math.cos(angleRad);
    const y = 105 + length * Math.sin(angleRad);
    return { x, y };
  };

  // Needle positions for both gauges
  const salesNeedle = calculateNeedleCoordinates(clampedPercent);
  const recNeedle = calculateNeedleCoordinates(clampedRecPercent);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-5">
      {/* Target Gauge Title Area */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Assigned Monthly Targets ({monthName})
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Day {daysPassed} of {totalDaysInMonth} ({monthElapsedPercent}% Month Elapsed)
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full uppercase">
          Dynamic Pace Trackers
        </span>
      </div>

      {/* Grid: Sales Target Gauge & Recovery Target Gauge side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sales Target Speedometer */}
        <div className="flex flex-col items-center bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150 dark:border-slate-850">
          <div className="w-full flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              Sales Target Progress
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-md border font-extrabold uppercase ${salesPace.textColor} ${salesPace.bgColor} ${salesPace.borderColor}`}>
              {salesPace.label}
            </span>
          </div>

          {/* Speedometer Gauge Arc SVG */}
          <div className="relative w-full max-w-[200px] aspect-[220/125] flex items-center justify-center mt-2">
            <svg viewBox="0 0 220 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="salesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              {/* Semicircle track */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="opacity-40 dark:opacity-20"
              />
              {/* Active fill */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="url(#salesGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcCircumference * (1 - Math.min(percent / 100, 1.0))}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <text x="30" y="120" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">0%</text>
              <text x="110" y="20" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">50%</text>
              <text x="190" y="120" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">100%</text>

              {/* Needle */}
              <line
                x1="110" y1="105" x2={salesNeedle.x} y2={salesNeedle.y}
                stroke="#0f172a" strokeWidth="3" strokeLinecap="round"
                className="transition-all duration-700 ease-out dark:stroke-slate-100"
              />
              <circle cx="110" cy="105" r="7" fill="#0f172a" className="dark:fill-slate-100" />
            </svg>
          </div>

          <div className="text-center mt-1 space-y-1">
            <p className="text-2xl font-black font-mono text-teal-700 dark:text-teal-400">
              {Math.round(percent)}%
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              Rs. {actualVal.toLocaleString()} / Rs. {targetVal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recovery Target Speedometer */}
        <div className="flex flex-col items-center bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150 dark:border-slate-850">
          <div className="w-full flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Recovery Target Progress
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-md border font-extrabold uppercase ${recoveryPace.textColor} ${recoveryPace.bgColor} ${recoveryPace.borderColor}`}>
              {recoveryPace.label}
            </span>
          </div>

          {/* Speedometer Gauge Arc SVG */}
          <div className="relative w-full max-w-[200px] aspect-[220/125] flex items-center justify-center mt-2">
            <svg viewBox="0 0 220 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="recGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              {/* Semicircle track */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="opacity-40 dark:opacity-20"
              />
              {/* Active fill */}
              <path
                d="M 30 105 A 80 80 0 0 1 190 105"
                fill="none"
                stroke="url(#recGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcCircumference * (1 - Math.min(recPercent / 100, 1.0))}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <text x="30" y="120" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">0%</text>
              <text x="110" y="20" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">50%</text>
              <text x="190" y="120" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">100%</text>

              {/* Needle */}
              <line
                x1="110" y1="105" x2={recNeedle.x} y2={recNeedle.y}
                stroke="#0f172a" strokeWidth="3" strokeLinecap="round"
                className="transition-all duration-700 ease-out dark:stroke-slate-100"
              />
              <circle cx="110" cy="105" r="7" fill="#0f172a" className="dark:fill-slate-100" />
            </svg>
          </div>

          <div className="text-center mt-1 space-y-1">
            <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {Math.round(recPercent)}%
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              Rs. {recActualVal.toLocaleString()} / Rs. {recTargetVal.toLocaleString()}
            </p>
          </div>
        </div>

      </div>

      {/* Target Achievement Insights Banner */}
      <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Calculated Monthly Target Quotas based on hierarchy configuration.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          Sync Interval: 30m
        </span>
      </div>
    </div>
  );
};
