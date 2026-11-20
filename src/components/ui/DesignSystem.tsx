import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'illuminated' | 'elevated' | 'glass';
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-xl border transition-all duration-200';
  const variantStyles = {
    default: 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700/80 shadow-xs',
    illuminated: 'bg-white dark:bg-[#1E293B] border-orange-500/40 shadow-sm',
    elevated: 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 shadow-md hover:border-blue-500/50',
    glass: 'bg-white/95 dark:bg-[#0F172A]/90 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-xs',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
    md: 'min-h-[44px] sm:min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2',
    lg: 'min-h-[48px] px-5 py-3 text-sm sm:text-base font-bold rounded-xl gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] text-white shadow-xs border border-transparent',
    amber: 'bg-[#F97316] hover:bg-[#EA580C] text-white font-bold shadow-xs border border-transparent',
    secondary: 'bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#1E293B] dark:hover:bg-slate-700 text-white border border-slate-700',
    outline: 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-blue-500/60 text-slate-800 dark:text-slate-100',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs border border-transparent',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-150 select-none disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] cursor-pointer ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
      ) : null}
      {children}
    </button>
  );
};

interface BadgeProps {
  variant?: 'emerald' | 'amber' | 'crimson' | 'sky' | 'navy' | 'slate';
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({
  variant = 'slate',
  children,
  className = '',
}) => {
  const styles = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    amber: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
    crimson: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
    sky: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
    navy: 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  comparison?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'amber' | 'emerald' | 'navy';
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  comparison = 'vs last period',
  icon: Icon,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700/80 shadow-xs',
    amber: 'bg-white dark:bg-[#1E293B] border-orange-200 dark:border-orange-500/30 shadow-xs',
    emerald: 'bg-white dark:bg-[#1E293B] border-emerald-200 dark:border-emerald-500/30 shadow-xs',
    navy: 'bg-[#0F172A] text-white border-slate-800 shadow-xs',
  };

  return (
    <div className={`h-full flex flex-col justify-between p-4 sm:p-5 rounded-xl border transition-all duration-200 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wider leading-tight ${variant === 'navy' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {title}
        </p>
        {Icon && (
          <div className={`p-2 rounded-lg shrink-0 ${variant === 'navy' ? 'bg-slate-800 text-blue-400' : variant === 'amber' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : variant === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight truncate ${variant === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : variant === 'navy' ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
          {value}
        </p>
      </div>
      {change && (
        <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={`tabular-nums ${
              changeType === 'positive'
                ? 'text-emerald-600 dark:text-emerald-400'
                : changeType === 'negative'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {change}
          </span>
          <span className="text-slate-500 dark:text-slate-400 truncate">
            {comparison}
          </span>
        </div>
      )}
    </div>
  );
};
