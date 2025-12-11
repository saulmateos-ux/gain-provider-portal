'use client';

import { formatCurrency, formatPercentage } from '@/lib/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyTrend {
  month: string;
  collectionRate: number;
  casesCollected: number;
  collectedAmount: number;
}

interface CollectionRateTrendsProps {
  lawFirmName: string;
  trends: MonthlyTrend[];
  loading?: boolean;
}

export function CollectionRateTrends({ lawFirmName, trends, loading }: CollectionRateTrendsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Sort trends by month ascending (oldest to newest left-to-right)
  const sortedTrends = [...trends].sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  // Format month labels
  const chartData = sortedTrends.map((trend) => ({
    ...trend,
    monthLabel: new Date(trend.month).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
  }));

  // Calculate summary stats
  const avgCollectionRate =
    sortedTrends.reduce((sum, t) => sum + t.collectionRate, 0) / sortedTrends.length;
  const totalCollected = sortedTrends.reduce((sum, t) => sum + t.collectedAmount, 0);
  const totalCases = sortedTrends.reduce((sum, t) => sum + t.casesCollected, 0);
  const latestRate = sortedTrends[sortedTrends.length - 1]?.collectionRate || 0;
  const trend = latestRate > avgCollectionRate ? 'improving' : 'declining';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.monthLabel}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Collection Rate:</span>{' '}
              {formatPercentage(data.collectionRate / 100)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Amount Collected:</span>{' '}
              {formatCurrency(data.collectedAmount)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Cases Collected:</span> {data.casesCollected}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {lawFirmName} - Collection Rate Trends
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Monthly collection performance over time
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Latest vs Avg</p>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  trend === 'improving' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatPercentage(latestRate / 100)}
              </span>
              <span className="text-sm text-gray-400">vs</span>
              <span className="text-lg text-gray-600">
                {formatPercentage(avgCollectionRate / 100)}
              </span>
            </div>
            <p
              className={`text-xs font-medium ${
                trend === 'improving' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend === 'improving' ? '↗ Improving' : '↘ Declining'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="collectionRate"
              name="Collection Rate (%)"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Period Average Rate</p>
              <p className="text-sm font-medium text-gray-900">
                {formatPercentage(avgCollectionRate / 100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Collected</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(totalCollected)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Cases</p>
              <p className="text-sm font-medium text-gray-900">{totalCases}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
