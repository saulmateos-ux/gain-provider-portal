/**
 * KPI Card Component
 *
 * CRITICAL RULE: Display-only component - NO calculations
 * All values must be pre-calculated from database
 */

import { COLORS, getTrendColor } from '@/lib/design-tokens';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;  // Pre-formatted value from database
  trend?: number; // Pre-calculated trend from database
  trendLabel?: string;
  icon?: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number' | 'days';
  isUpGood?: boolean; // Whether upward trend is positive
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon,
  isUpGood = true,
  loading = false,
}: KPICardProps) {
  // RULE: NO calculations - only formatting for display
  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="h-4 w-4" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColorClass = () => {
    if (!trend || trend === 0) return 'text-gray-500';
    const isPositive = trend > 0;
    if (isUpGood) {
      return isPositive ? 'text-green-600' : 'text-red-600';
    }
    return isPositive ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      {/* Value */}
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>

      {/* Trend */}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${getTrendColorClass()}`}>
          {getTrendIcon()}
          <span className="font-medium">
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
          {trendLabel && <span className="text-gray-500 ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
