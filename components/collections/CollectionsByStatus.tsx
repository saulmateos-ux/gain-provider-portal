/**
 * Collections by Status Component
 * Horizontal bar chart showing collection rate by case status
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, formatPercentageWhole } from '@/lib/formatters';
import { COLORS } from '@/lib/design-tokens';

interface StatusData {
  status: string;
  invoiceCount: number;
  caseCount: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOpen: number;
  collectionRate: number;
}

interface CollectionsByStatusProps {
  data: StatusData[];
  loading?: boolean;
}

export function CollectionsByStatus({ data, loading }: CollectionsByStatusProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Collections by Case Status</h2>
        <div className="h-96 flex items-center justify-center text-gray-500">
          No status data available
        </div>
      </div>
    );
  }

  // Transform and sort data by collection rate
  const chartData = [...data]
    .sort((a, b) => b.collectionRate - a.collectionRate)
    .slice(0, 8) // Top 8 statuses
    .map(item => ({
      status: item.status.length > 30 ? item.status.substring(0, 27) + '...' : item.status,
      rate: item.collectionRate,
      collected: item.totalCollected,
      invoiced: item.totalInvoiced,
      cases: item.caseCount,
    }));

  // Color based on collection rate
  const getBarColor = (rate: number) => {
    if (rate >= 70) return COLORS.semantic.success;
    if (rate >= 50) return COLORS.brand.teal;
    if (rate >= 30) return COLORS.semantic.warning;
    return COLORS.semantic.danger;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{data.status}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Collection Rate:</span>
              <span className="font-medium">{data.rate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Collected:</span>
              <span className="font-medium text-green-600">{formatCurrency(data.collected)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Invoiced:</span>
              <span className="font-medium">{formatCurrency(data.invoiced)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Cases:</span>
              <span className="font-medium">{data.cases}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Collections by Case Status</h2>
        <p className="text-sm text-gray-600 mt-1">
          Collection performance varies significantly by case status
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="category"
            dataKey="status"
            width={140}
            stroke="#6B7280"
            style={{ fontSize: '11px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.semantic.success }}></div>
          <span className="text-gray-600">70%+ (Excellent)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.brand.teal }}></div>
          <span className="text-gray-600">50-69% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.semantic.warning }}></div>
          <span className="text-gray-600">30-49% (Fair)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.semantic.danger }}></div>
          <span className="text-gray-600">&lt;30% (Poor)</span>
        </div>
      </div>
    </div>
  );
}
