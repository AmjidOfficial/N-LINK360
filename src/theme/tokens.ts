export const colors = {
  brand: {
    navy: '#0F172A',
    navyDark: '#0B1120',
    navyElevated: '#1E293B',
    navyMuted: '#334155',
    orange: '#F97316',
    orangeHover: '#EA580C',
    orangeGlow: 'rgba(249, 115, 22, 0.16)',
    blue: '#3B82F6',
    blueHover: '#2563EB',
    blueGlow: 'rgba(59, 130, 246, 0.16)',
    amber: '#F59E0B',
    amberDark: '#D97706',
    emerald: '#10B981',
    emeraldGlow: 'rgba(16, 185, 129, 0.15)',
    crimson: '#DC2626',
    crimsonGlow: 'rgba(220, 38, 38, 0.15)',
    sky: '#0EA5E9',
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
    textMuted: '#64748B',
  },
  dark: {
    bg: '#0B1120',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    surfaceSubtle: '#1E293B',
    surfaceHover: '#334155',
    border: '#334155',
    borderHighlight: '#475569',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
  },
} as const;

export const typography = {
  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  monoFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  display: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
  h1: 'text-xl sm:text-2xl font-bold tracking-tight',
  h2: 'text-lg sm:text-xl font-bold',
  h3: 'text-base font-semibold',
  body: 'text-sm leading-relaxed',
  bodySmall: 'text-xs leading-normal',
  caption: 'text-[11px] font-semibold tracking-wider uppercase',
  tabularNumber: 'font-mono tracking-tight tabular-nums',
  kpiNumber: 'text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums',
} as const;

export const shadows = {
  card: 'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
  cardHover: 'shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.06)]',
  orangeBeam: 'shadow-[0_0_20px_rgba(249,115,22,0.18)]',
  blueBeam: 'shadow-[0_0_20px_rgba(59,130,246,0.18)]',
  modal: 'shadow-[0_25px_50px_-12px_rgba(2,6,23,0.45)]',
} as const;

export const motionTokens = {
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const themeTokens = {
  colors,
  typography,
  shadows,
  motionTokens,
};

export default themeTokens;
