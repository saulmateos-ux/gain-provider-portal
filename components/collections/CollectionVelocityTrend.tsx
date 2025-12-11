/**
 * Collection Velocity Distribution Component
 * Shows histogram of how long it takes to collect cases
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { COLORS } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/formatters';
import { Clock } from 'lucide-react';

interface VelocityBucket {
  bucket: string;
  bucketOrder: number;
  caseCount: number;
  totalCollected: number;
  avgDays: number;
  percentOfCases: number;
  percentOfAmount: number;
}

interface VelocitySummary {
  totalCases: number;
  totalCollected: number;
  overallAvgDays: number;
  minDays: number;
  maxDays: number;
}

interface CollectionVelocityTrendProps {
  data: VelocityBucket[];
  summary?: VelocitySummary;
  loading?: boolean;
}

// Color scale from green (fast) to red (slow)
const BUCKET_COLORS = [
  '#10B981', // 0-3 months - green
  '#34D399', // 3-6 months - light green
  '#FBBF24', // 6-12 months - yellow
  '#F59E0B', // 12-18 months - orange
  '#EF4444', // 18-24 months - red
  '#DC2626', // 24+ months - dark red
];

export function CollectionVelocityTrend({ data, summary, loading }: CollectionVelocityTrendProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection Time Distribution</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No velocity data available
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{item.bucket}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Cases:</span>
              <span className="font-medium">{item.caseCount} ({item.percentOfCases.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Collected:</span>
              <span className="font-medium">{formatCurrency(item.totalCollected)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Avg Days:</span>
              <span className="font-medium">{item.avgDays} days</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Convert overall avg days to months for display
  const avgMonths = summary ? Math.round(summary.overallAvgDays / 30) : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Collection Time Distribution</h2>
          <p className="text-sm text-gray-600 mt-1">
            How long it takes to collect cases during this period
          </p>
        </div>

        {/* Average indicator */}
        {summary && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            <Clock className="w-4 h-4" />
            <span>Avg: {avgMonths} months</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="caseCount"
            radius={[0, 4, 4, 0]}
            maxBarSize={35}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BUCKET_COLORS[entry.bucketOrder - 1] || BUCKET_COLORS[5]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BUCKET_COLORS[0] }}></div>
            <span className="text-gray-600">Fast (0-3m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BUCKET_COLORS[2] }}></div>
            <span className="text-gray-600">Normal (6-12m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: BUCKET_COLORS[4] }}></div>
            <span className="text-gray-600">Slow (18m+)</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cases</p>
            <p className="text-lg font-semibold text-gray-900">
              {summary.totalCases.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {avgMonths} months
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Collected</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(summary.totalCollected)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
