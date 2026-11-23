import { getCanonicalDashboardRole } from './permissions';

export type MobileNavTabId =
  | 'DASHBOARD'
  | 'ORDERING'
  | 'INVOICES'
  | 'LEDGER'
  | 'CUSTOMERS'
  | 'MORE';

export interface MobileBottomTabItem {
  id: MobileNavTabId;
  label: string;
}

/**
 * Returns a role-adaptive 4-tab primary mobile bottom navigation bar.
 * Secondary screens remain accessible via the Slide-Out Navigation Drawer and Home quick actions.
 */
export function getRoleAdaptiveMobileTabs(role?: string | null): MobileBottomTabItem[] {
  const canonical = getCanonicalDashboardRole(role || '');

  if (canonical === 'DEALER' || canonical === 'DISTRIBUTOR') {
    return [
      { id: 'DASHBOARD', label: 'Home' },
      { id: 'ORDERING', label: 'Orders' },
      { id: 'INVOICES', label: 'Invoices' },
      { id: 'LEDGER', label: 'Ledger' },
    ];
  }

  if (
    canonical === 'ACCOUNTS' ||
    canonical === 'WAREHOUSE' ||
    canonical === 'DISPATCH' ||
    canonical === 'HR_ADMIN'
  ) {
    return [
      { id: 'DASHBOARD', label: 'Home' },
      { id: 'INVOICES', label: 'Invoices' },
      { id: 'LEDGER', label: 'Ledgers' },
      { id: 'MORE', label: 'More' },
    ];
  }

  if (
    canonical === 'MD_EXECUTIVE' ||
    canonical === 'NATIONAL_MANAGER' ||
    canonical === 'RSM' ||
    canonical === 'ZSM'
  ) {
    return [
      { id: 'DASHBOARD', label: 'Home' },
      { id: 'ORDERING', label: 'Orders' },
      { id: 'CUSTOMERS', label: 'Dealers' },
      { id: 'MORE', label: 'More' },
    ];
  }

  // Default Field Sales Officer / Sales & Recovery Executive 4-tab bar
  return [
    { id: 'DASHBOARD', label: 'Home' },
    { id: 'ORDERING', label: 'Entry' },
    { id: 'CUSTOMERS', label: 'Dealers' },
    { id: 'MORE', label: 'More' },
  ];
}
