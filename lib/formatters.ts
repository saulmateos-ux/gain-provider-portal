/**
 * Formatting Utilities
 *
 * Centralized number, currency, date, and percentage formatters
 * RULE: Frontend ONLY formats for display, never calculates
 */

/**
 * Format number with locale-aware thousand separators
 * @param value Number to format
 * @param decimals Number of decimal places (default: 0)
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format currency (USD)
 * @param value Amount to format
 * @param decimals Show decimals (default: 0 for whole dollars)
 */
export const formatCurrency = (value: number, decimals: number = 0): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format large currency with K/M/B abbreviations
 * @param value Amount to format
 */
export const formatCurrencyCompact = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

/**
 * Format percentage
 * @param value Decimal (e.g., 0.642 for 64.2%)
 * @param decimals Number of decimal places (default: 1)
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format percentage from whole number (e.g., 64.2 → 64.2%)
 * @param value Percentage as whole number
 * @param decimals Number of decimal places (default: 1)
 */
export const formatPercentageWhole = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format date to readable string
 * @param date Date object or ISO string
 * @param format 'short' (MM/DD/YYYY) or 'long' (Month DD, YYYY)
 */
export const formatDate = (date: Date | string | null | undefined, format: 'short' | 'long' = 'short'): string => {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';

  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Format days as readable duration
 * @param days Number of days
 */
export const formatDays = (days: number): string => {
  if (days === null || days === undefined || isNaN(days)) return '-';

  const roundedDays = Math.round(days);

  if (roundedDays >= 365) {
    const years = Math.floor(roundedDays / 365);
    const months = Math.floor((roundedDays % 365) / 30);
    if (months === 0) return `${years}y`;
    return `${years}y ${months}m`;
  }

  if (roundedDays >= 30) {
    const months = Math.floor(roundedDays / 30);
    const remainingDays = roundedDays % 30;
    if (remainingDays === 0) return `${months}m`;
    return `${months}m ${remainingDays}d`;
  }

  return `${roundedDays}d`;
};

/**
 * Format days as "X days" string
 * @param days Number of days
 */
export const formatDaysSimple = (days: number): string => {
  if (days === null || days === undefined || isNaN(days)) return '-';
  const roundedDays = Math.round(days);
  return `${roundedDays} ${roundedDays === 1 ? 'day' : 'days'}`;
};

/**
 * Format months as readable duration
 * @param months Number of months
 */
export const formatMonths = (months: number): string => {
  if (months === null || months === undefined || isNaN(months)) return '-';
  const roundedMonths = Math.round(months);
  return `${roundedMonths} ${roundedMonths === 1 ? 'month' : 'months'}`;
};

/**
 * Format trend indicator (with + or -)
 * @param value Trend value
 * @param formatter Formatter function to use
 */
export const formatTrend = (
  value: number,
  formatter: (val: number) => string = formatNumber
): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatter(Math.abs(value))}`;
};

/**
 * Format trend as percentage (with + or -)
 * @param value Trend percentage (decimal)
 * @param decimals Number of decimal places
 */
export const formatTrendPercentage = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercentage(value, decimals)}`;
};

/**
 * Format IRR (Internal Rate of Return)
 * @param irr IRR as decimal
 */
export const formatIRR = (irr: number): string => {
  return formatPercentage(irr, 2);
};

/**
 * Format MOIC (Multiple on Invested Capital)
 * @param moic MOIC value
 */
export const formatMOIC = (moic: number): string => {
  if (moic === null || moic === undefined || isNaN(moic)) return '-';
  return `${moic.toFixed(2)}x`;
};
