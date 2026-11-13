import React from 'react';

export interface DashboardLayoutProps {
  header?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Adaptive Industrial Dark & Emerald + Light Mode Dashboard Container.
 * Provides consistent viewport framing, 1px hairline borders, and responsive spacing across Desktop, Tablet, and Mobile.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  filters,
  children,
  className = '',
}) => {
  return (
    <section
      className={`w-full space-y-5 text-slate-900 dark:text-emerald-50 transition-colors ${className}`}
      data-testid="role-dashboard-layout"
    >
      {header && <div className="w-full">{header}</div>}
      {filters && <div className="w-full">{filters}</div>}
      <div className="w-full space-y-5">{children}</div>
    </section>
  );
};
