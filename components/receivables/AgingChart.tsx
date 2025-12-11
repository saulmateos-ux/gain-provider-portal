/**
 * Aging Analysis Chart Component
 * Displays AR aging buckets as a horizontal bar visualization
 * With collapsible breakdown table
 */

'use client';

import { useState } from 'react';
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
import { ChevronDown, ChevronRight, Table } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface AgingData {
  bucket: string;
  invoiceCount: number;
  caseCount: number;
  totalOpen: number;
  totalInvoiced: number;
  avgDaysOld: number;
  percentOfTotal: number;
}

interface AgingChartProps {
  data: AgingData[];
  loading?: boolean;
}

// Color scheme for new buckets
const BUCKET_COLORS: Record<string, string> = {
  '0-180': '#10B981',      // Green - under 6 months
  '181-365': '#3B82F6',    // Blue - 6 months to 1 year
  '1-1.5 years': '#8B5CF6', // Purple - 1 to 1.5 years
  '1.5-2 years': '#F59E0B', // Amber - 1.5 to 2 years
  '2-3 years': '#F97316',  // Orange - 2 to 3 years
  '3+ years': '#EF4444',   // Red - over 3 years
};

const BUCKET_LABELS: Record<string, string> = {
  '0-180': '0-180 days',
  '181-365': '181-365 days',
  '1-1.5 years': '1-1.5 years',
  '1.5-2 years': '1.5-2 years',
  '2-3 years': '2-3 years',
  '3+ years': '3+ years',
};

export function AgingChart({ data, loading }: AgingChartProps) {
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AR Aging Analysis</h2>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No open receivables
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((item) => ({
    bucket: BUCKET_LABELS[item.bucket] || item.bucket,
    rawBucket: item.bucket,
    amount: item.totalOpen,
    invoices: item.invoiceCount,
    cases: item.caseCount,
    percent: item.percentOfTotal,
    avgDays: item.avgDaysOld,
  }));

  // Calculate totals
  const totalOpen = data.reduce((sum, d) => sum + d.totalOpen, 0);
  const totalInvoices = data.reduce((sum, d) => sum + d.invoiceCount, 0);
  const totalCases = data.reduce((sum, d) => sum + d.caseCount, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{item.bucket}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Open Balance:</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">% of Total:</span>
              <span className="font-medium">{item.percent}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Invoices:</span>
              <span className="font-medium">{item.invoices.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Cases:</span>
              <span className="font-medium">{item.cases.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Avg Age:</span>
              <span className="font-medium">{item.avgDays} days</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AR Aging Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">
            Open receivables by invoice age
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.rawBucket] || '#6B7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          {Object.entries(BUCKET_COLORS).map(([bucket, color]) => (
            <div key={bucket} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-gray-600">{BUCKET_LABELS[bucket]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Breakdown Table */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Breakdown by Age</span>
            <span className="text-xs text-gray-500">
              ({data.length} buckets, {formatCurrency(totalOpen)} total)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">
              {isTableExpanded ? 'Hide' : 'Show'} details
            </span>
            {isTableExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {isTableExpanded && (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Age Bucket</th>
                  <th className="text-right py-2 font-medium text-gray-600">Open AR</th>
                  <th className="text-right py-2 font-medium text-gray-600">% of Total</th>
                  <th className="text-right py-2 font-medium text-gray-600">Cases</th>
                  <th className="text-right py-2 font-medium text-gray-600">Invoices</th>
                  <th className="text-right py-2 font-medium text-gray-600">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item) => (
                  <tr key={item.rawBucket} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: BUCKET_COLORS[item.rawBucket] || '#6B7280' }}></div>
                        <span className="text-gray-900">{item.bucket}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="text-right py-2 text-gray-700">{item.percent}%</td>
                    <td className="text-right py-2 text-gray-700">{item.cases.toLocaleString()}</td>
                    <td className="text-right py-2 text-gray-700">{item.invoices.toLocaleString()}</td>
                    <td className="text-right py-2 text-gray-700">{item.avgDays.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-2 text-gray-900">Total</td>
                  <td className="text-right py-2 text-gray-900">{formatCurrency(totalOpen)}</td>
                  <td className="text-right py-2 text-gray-900">100%</td>
                  <td className="text-right py-2 text-gray-900">{totalCases.toLocaleString()}</td>
                  <td className="text-right py-2 text-gray-900">{totalInvoices.toLocaleString()}</td>
                  <td className="text-right py-2 text-gray-900"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
