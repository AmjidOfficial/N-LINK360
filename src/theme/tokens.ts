export const colors = {
  brand: {
    navy: '#17332B',
    navyDark: '#0F221C',
    navyLight: '#174A3A',
    navyMuted: '#3A506B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberLight: '#FDE68A',
    amberGlow: 'rgba(245, 158, 11, 0.15)',
    emerald: '#10B981',
    emeraldGlow: 'rgba(16, 185, 129, 0.15)',
    crimson: '#EF4444',
    crimsonGlow: 'rgba(239, 68, 68, 0.15)',
    sky: '#0284C7',
    skyGlow: 'rgba(2, 132, 199, 0.15)',
  },
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceHover: '#E2E8F0',
    border: '#E2E8F0',
    borderHighlight: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
  },
  dark: {
    bg: '#0F221C',
    surface: '#17332B',
    surfaceSubtle: '#111C3A',
    surfaceHover: '#174A3A',
    border: '#1E293B',
    borderHighlight: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
  }
} as const;

export const typography = {
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'text-2xl sm:text-3xl font-black tracking-tight',
  h1: 'text-xl sm:text-2xl font-bold tracking-tight',
  h2: 'text-lg sm:text-xl font-bold',
  h3: 'text-base font-semibold',
  body: 'text-sm leading-relaxed',
  bodySmall: 'text-xs leading-normal',
  caption: 'text-[11px] font-medium tracking-wide uppercase',
  tabularNumber: 'font-mono tracking-tight tabular-nums',
  kpiNumber: 'text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums',
} as const;

export const shadows = {
  card: 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]',
  cardHover: 'shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)]',
  amberBeam: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  emeraldBeam: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  modal: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]',
} as const;

export const motionTokens = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const themeTokens = {
  colors,
  typography,
  shadows,
  motionTokens,
};

export default themeTokens;
