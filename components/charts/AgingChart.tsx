/**
 * Aging Analysis Chart Component
 *
 * Stacked horizontal bar chart showing receivables aging buckets
 * CRITICAL RULE: Display-only - data pre-calculated in database
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { COLORS } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/formatters';

interface AgingData {
  current_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_180: number;
  days_181_365: number;
  days_over_365: number;
}

interface AgingChartProps {
  data: AgingData;
  loading?: boolean;
}

export function AgingChart({ data, loading = false }: AgingChartProps) {
  if (loading) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-400">Loading aging analysis...</span>
      </div>
    );
  }

  // Transform data for stacked bar chart
  const chartData = [
    {
      name: 'Aging Buckets',
      '0-30 days': data.current_0_30,
      '31-60 days': data.days_31_60,
      '61-90 days': data.days_61_90,
      '91-180 days': data.days_91_180,
      '181-365 days': data.days_181_365,
      'Over 365 days': data.days_over_365,
    },
  ];

  // Risk-based color progression (green → red)
  const colors = {
    '0-30 days': COLORS.semantic.success,
    '31-60 days': COLORS.brand.teal,
    '61-90 days': COLORS.semantic.info,
    '91-180 days': COLORS.semantic.warning,
    '181-365 days': COLORS.semantic.warningDark,
    'Over 365 days': COLORS.semantic.danger,
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tickFormatter={(value) => formatCurrency(value, 0)} />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="0-30 days" stackId="a" fill={colors['0-30 days']} />
          <Bar dataKey="31-60 days" stackId="a" fill={colors['31-60 days']} />
          <Bar dataKey="61-90 days" stackId="a" fill={colors['61-90 days']} />
          <Bar dataKey="91-180 days" stackId="a" fill={colors['91-180 days']} />
          <Bar dataKey="181-365 days" stackId="a" fill={colors['181-365 days']} />
          <Bar dataKey="Over 365 days" stackId="a" fill={colors['Over 365 days']} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
