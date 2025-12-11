'use client';

import { formatCurrency, formatPercentage } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface LawFirmData {
  lawFirmId: string;
  lawFirmName: string;
  totalCollected: number;
  collectionRate: number;
  totalCases: number;
  totalOpenAR: number;
}

interface TopLawFirmsChartProps {
  lawFirms: LawFirmData[];
  loading?: boolean;
}

export function TopLawFirmsChart({ lawFirms, loading }: TopLawFirmsChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-56 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-72"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded w-32"></div>
                <div className="h-8 bg-gray-200 rounded flex-1" style={{ width: `${90 - i * 8}%` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sort by total collected and take top 10
  const top10 = [...lawFirms]
    .sort((a, b) => b.totalCollected - a.totalCollected)
    .slice(0, 10)
    .map((firm) => ({
      ...firm,
      // Truncate long names for chart display
      shortName: firm.lawFirmName.length > 25
        ? firm.lawFirmName.substring(0, 22) + '...'
        : firm.lawFirmName,
    }));

  // Get max collected for scale
  const maxCollected = Math.max(...top10.map((f) => f.totalCollected));

  // Color based on collection rate
  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#10B981'; // green
    if (rate >= 60) return '#3B82F6'; // blue
    if (rate >= 40) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900 mb-3 text-sm">{data.lawFirmName}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Collected:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(data.totalCollected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Collection Rate:</span>
              <span className={`font-semibold ${data.collectionRate >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(data.collectionRate / 100)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Open AR:</span>
              <span className="font-medium text-gray-900">{formatCurrency(data.totalOpenAR)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Cases:</span>
              <span className="font-medium text-gray-900">{data.totalCases}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate totals for summary
  const totalCollected = top10.reduce((sum, f) => sum + f.totalCollected, 0);
  const avgRate = top10.reduce((sum, f) => sum + f.collectionRate, 0) / top10.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Top 10 Law Firms by Collections</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ranked by total amount collected with collection rate indicators
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Top 10 Total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
            <p className="text-xs text-gray-500">Avg Rate: {formatPercentage(avgRate / 100)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={top10}
            layout="vertical"
            margin={{ top: 5, right: 100, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 11 }}
              stroke="#9CA3AF"
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fontSize: 11 }}
              stroke="#9CA3AF"
              width={140}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
            <Bar dataKey="totalCollected" radius={[0, 4, 4, 0]} barSize={28}>
              {top10.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.collectionRate)} />
              ))}
              {/* Collection amount inside bar */}
              <LabelList
                dataKey="totalCollected"
                position="insideRight"
                formatter={(value: number) => formatCurrency(value)}
                style={{ fontSize: 11, fill: '#FFFFFF', fontWeight: 600 }}
                offset={10}
              />
              {/* Collection rate percentage to the right */}
              <LabelList
                dataKey="collectionRate"
                position="right"
                formatter={(value: number) => `${value.toFixed(1)}%`}
                style={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
                offset={5}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">80%+ Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">60-79% Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-gray-600">40-59% Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600">&lt;40% Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
