/**
 * Design Token System
 *
 * CRITICAL: Never hardcode colors, sizes, or spacing
 * Always import and use tokens from this file
 */

export const COLORS = {
  // GAIN Brand Colors (from current portal)
  brand: {
    teal: '#1E8E8E',       // Primary brand color
    tealDark: '#166D6D',   // Hover states, emphasis
    tealLight: '#E6F4F4',  // Backgrounds, highlights
    gold: '#C5A057',       // Secondary accent
    goldDark: '#A68847',   // Hover states
    goldLight: '#F7F2E6',  // Backgrounds
  },

  // Semantic Colors
  semantic: {
    success: '#10B981',    // Collections/positive
    successLight: '#D1FAE5',
    successDark: '#047857',
    warning: '#F59E0B',    // Caution/at-risk
    warningLight: '#FEF3C7',
    warningDark: '#B45309',
    danger: '#EF4444',     // Risk/negative
    dangerLight: '#FEE2E2',
    dangerDark: '#B91C1C',
    info: '#3B82F6',       // Neutral information
    infoLight: '#DBEAFE',
    infoDark: '#1E40AF',
  },

  // Risk Grades (for law firm/provider performance)
  grades: {
    A: '#10B981',          // Excellent - Green
    B: '#3B82F6',          // Good - Blue
    C: '#6B7280',          // Average - Gray
    D: '#F59E0B',          // Below Average - Yellow
    E: '#EF4444',          // Poor - Red
  },

  // Neutral Colors
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Chart Colors (in order of use)
  chart: {
    primary: '#1E8E8E',    // GAIN Teal
    secondary: '#C5A057',  // GAIN Gold
    tertiary: '#3B82F6',   // Blue
    quaternary: '#10B981', // Green
    quinary: '#F97316',    // Orange
    senary: '#EF4444',     // Red
  },
};

export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'].join(', '),
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'].join(', '),
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px - Display/Hero KPI
    '4xl': '2.5rem',  // 40px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const TRANSITIONS = {
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out',
};

export const BORDER_RADIUS = {
  none: '0px',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px',  // Pills, avatars
};

/**
 * Get color for risk grade
 */
export const getGradeColor = (grade: 'A' | 'B' | 'C' | 'D' | 'E'): string => {
  return COLORS.grades[grade];
};

/**
 * Get color for trend (context-aware)
 * @param trend Positive or negative number
 * @param isUpGood Whether upward trend is good (default: true)
 */
export const getTrendColor = (trend: number, isUpGood: boolean = true): string => {
  if (trend === 0) return COLORS.neutral[500];
  const isPositive = trend > 0;
  if (isUpGood) {
    return isPositive ? COLORS.semantic.success : COLORS.semantic.danger;
  }
  return isPositive ? COLORS.semantic.danger : COLORS.semantic.success;
};
