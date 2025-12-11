/**
 * Portfolio Health Gauge Component
 *
 * Displays Portfolio Health Score (0-100) as circular gauge
 * with color-coded segments and component breakdown
 *
 * CRITICAL RULE: Display-only component - NO calculations
 * All values must be pre-calculated from database
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PortfolioHealthGaugeProps {
  score: number; // 0-100 (pre-calculated from database)
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  components?: {
    collectionRateScore: number;
    dsoScore: number;
    agingScore: number;
    riskScore: number;
  };
  trend?: {
    value: number;
    period: string;
  };
  loading?: boolean;
}

export function PortfolioHealthGauge({
  score,
  grade,
  components,
  trend,
  loading = false,
}: PortfolioHealthGaugeProps) {
  // Convert score to number if it's a string (from API)
  const scoreNumber = typeof score === 'string' ? parseFloat(score) : score;

  // Color mapping based on grade
  const getColor = () => {
    if (scoreNumber >= 80) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'stroke-green-600' };
    if (scoreNumber >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'stroke-blue-600' };
    if (scoreNumber >= 40) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'stroke-yellow-600' };
    if (scoreNumber >= 20) return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'stroke-orange-600' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'stroke-red-600' };
  };

  const colors = getColor();

  // Calculate SVG arc for circular gauge
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scoreNumber / 100) * circumference;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-48 h-48 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Health Score</h3>
        <p className="text-sm text-gray-500 mt-1">Composite performance indicator</p>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
            />
            {/* Foreground circle (progress) */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              className={colors.ring}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>

          {/* Score and Grade */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-gray-900">{scoreNumber.toFixed(1)}</div>
            <div className="text-sm text-gray-500 mt-1">/100</div>
            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
              {grade}
            </div>
          </div>
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div className={`flex items-center gap-1 mt-4 text-sm ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : trend.value < 0 ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span className="font-medium">
              {trend.value > 0 ? '+' : ''}
              {trend.value.toFixed(1)}
            </span>
            <span className="text-gray-500">{trend.period}</span>
          </div>
        )}
      </div>

      {/* Component Breakdown */}
      {components && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Component Scores</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Collection Rate (40%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${parseFloat(components.collectionRateScore as any)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {parseFloat(components.collectionRateScore as any).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">DSO (30%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${parseFloat(components.dsoScore as any)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {parseFloat(components.dsoScore as any).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Aging (20%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${parseFloat(components.agingScore as any)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {parseFloat(components.agingScore as any).toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk (10%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${parseFloat(components.riskScore as any)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {parseFloat(components.riskScore as any).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="grid grid-cols-5 gap-2 text-xs text-center">
          <div>
            <div className="w-full h-1 bg-red-600 rounded mb-1"></div>
            <span className="text-gray-500">0-19<br/>Critical</span>
          </div>
          <div>
            <div className="w-full h-1 bg-orange-600 rounded mb-1"></div>
            <span className="text-gray-500">20-39<br/>Poor</span>
          </div>
          <div>
            <div className="w-full h-1 bg-yellow-600 rounded mb-1"></div>
            <span className="text-gray-500">40-59<br/>Fair</span>
          </div>
          <div>
            <div className="w-full h-1 bg-blue-600 rounded mb-1"></div>
            <span className="text-gray-500">60-79<br/>Good</span>
          </div>
          <div>
            <div className="w-full h-1 bg-green-600 rounded mb-1"></div>
            <span className="text-gray-500">80-100<br/>Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
