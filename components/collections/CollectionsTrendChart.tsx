/**
 * Collections Trend Chart Component
 * Displays collected amounts with Collection Rate line overlay
 */

'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { COLORS } from '@/lib/design-tokens';

interface CollectionTrendData {
  month: string;
  total_collected: string | number;
  total_open: string | number;
  collection_rate: string | number;
  total_write_offs?: string | number;
}

interface CollectionsTrendChartProps {
  data: CollectionTrendData[];
  loading?: boolean;
}

export function CollectionsTrendChart({ data, loading }: CollectionsTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection Trends</h2>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No trend data available
        </div>
      </div>
    );
  }

  // Transform data for chart (already sorted oldest to newest from API)
  const chartData = data.map((item) => {
    // Parse month without timezone conversion to avoid label shifts
    const date = new Date(item.month);
    const month = date.toLocaleString('en-US', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC' // Force UTC to prevent timezone shifts
    });

    return {
      month,
      collected: parseFloat(item.total_collected.toString()),
      openBalance: parseFloat(item.total_open.toString()),
      collectionRate: parseFloat(item.collection_rate.toString()),
      writeOffs: item.total_write_offs ? parseFloat(item.total_write_offs.toString()) : 0,
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">
                {entry.name === 'Collection Rate'
                  ? `${entry.value.toFixed(1)}%`
                  : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Collection Trends</h2>
        <p className="text-sm text-gray-600 mt-1">
          Monthly collection performance and collection rate trend
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#1E8E8E"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            label={{ value: 'Collection Rate (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />

          {/* Collected Amounts Bar */}
          <Bar
            yAxisId="left"
            dataKey="collected"
            fill={COLORS.semantic.success}
            name="Collected"
            radius={[4, 4, 0, 0]}
          />

          {/* Collection Rate Line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="collectionRate"
            stroke={COLORS.brand.teal}
            strokeWidth={2}
            dot={{ fill: COLORS.brand.teal, r: 4 }}
            activeDot={{ r: 6 }}
            name="Collection Rate"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
