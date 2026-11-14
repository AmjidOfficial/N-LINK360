import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';

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
 const baseStyles = 'rounded-2xl border transition-all duration-200';
 const variantStyles = {
 default: 'bg-surface-card border-border-subtle shadow-sm',
 illuminated: 'bg-surface-card border-primary/40 light-beam-green shadow-md',
 elevated: 'bg-surface-card border-border-subtle shadow-lg hover:border-primary/50',
 glass: 'bg-surface-card/90 backdrop-blur-md border-white/40 shadow-sm',
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
 sm: 'px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
 md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
 lg: 'px-5 py-3 text-base font-bold rounded-2xl gap-2.5',
 };

 const variantStyles = {
 primary: 'bg-primary hover:bg-primary/90 active:bg-primary/80 text-deep-green shadow-sm hover:shadow border border-transparent',
 amber: 'bg-secondary hover:bg-secondary/90 active:bg-secondary/80 text-deep-green font-bold shadow-sm border border-transparent',
 secondary: 'bg-white hover:bg-bg-secondary text-deep-green border border-deep-green',
 outline: 'border border-border-subtle bg-white hover:bg-bg-secondary text-text-secondary',
 danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-sm border border-rose-200',
 ghost: 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary',
 };

 return (
 <button
 disabled={disabled || isLoading}
 className={`inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
 {...props}
 >
 {isLoading ? (
 <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
 ) : Icon ? (
 <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
 ) : null}
 {children}
 </button>
 );
};

interface BadgeProps {
 variant?: 'emerald' | 'amber' | 'crimson' | 'sky' | 'navy' | 'slate';
 children: React.ReactNode;
 className?: string;
 dot?: boolean;
}

export const StatusBadge: React.FC<BadgeProps> = ({
 variant = 'slate',
 children,
 className = '',
 dot = false,
}) => {
 const styles = {
 emerald: 'bg-primary/30 text-deep-green border-primary/50',
 amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
 crimson: 'bg-rose-50 text-rose-700 border-rose-200/80',
 sky: 'bg-secondary/30 text-deep-teal border-secondary/50',
 navy: 'bg-deep-green text-primary border-deep-green',
 slate: 'bg-bg-secondary text-text-secondary border-border-subtle',
 };

 const dotColors = {
 emerald: 'bg-deep-green',
 amber: 'bg-amber-500',
 crimson: 'bg-rose-500',
 sky: 'bg-deep-teal',
 navy: 'bg-primary',
 slate: 'bg-text-muted',
 };

 return (
 <span
 className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}
 >
 {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
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
 default: 'bg-white dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 shadow-xs',
 amber: 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-xs',
 emerald: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 shadow-xs',
 navy: 'bg-[#0F172A] text-white border-slate-800 shadow-xs',
 };

 return (
 <div className={`p-5 rounded-lg border transition-all duration-200 ${variantStyles[variant]} ${className}`}>
 <div className="flex items-center justify-between">
 <p className={`text-xs font-bold uppercase tracking-wider ${variant === 'navy' ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
 {title}
 </p>
 {Icon && (
 <div className={`p-2 rounded ${variant === 'navy' ? 'bg-white/10 text-blue-400' : variant === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-[#0052FF] dark:text-blue-400'}`}>
 <Icon className="h-4 w-4" />
 </div>
 )}
 </div>
 <div className="mt-3">
 <p className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${variant === 'emerald' ? 'text-[#059669]' : variant === 'navy' ? 'text-white' : 'text-[#191C1E] dark:text-white'}`}>
 {value}
 </p>
 </div>
 {change && (
 <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
 <span
 className={
 changeType === 'positive'
 ? 'text-[#059669]'
 : changeType === 'negative'
 ? 'text-rose-600'
 : 'text-slate-400'
 }
 >
 {change}
 </span>
 <span className={variant === 'navy' ? 'text-slate-400' : 'text-slate-400'}>
 {comparison}
 </span>
 </div>
 )}
 </div>
 );
};

