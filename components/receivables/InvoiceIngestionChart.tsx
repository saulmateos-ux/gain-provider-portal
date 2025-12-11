/**
 * Invoice Ingestion Chart Component
 * Displays monthly new invoice volume as a bar chart
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
  ReferenceLine,
  Legend,
} from 'recharts';
import { ChevronDown, ChevronRight, Table, TrendingUp, FileText, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface MonthlyData {
  month: string;
  monthLabel: string;
  invoiceCount: number;
  caseCount: number;
  totalInvoiced: number;
  avgInvoiceAmount: number;
}

interface IngestionSummary {
  totalInvoices: number;
  totalCases: number;
  totalInvoiced: number;
  avgInvoiceAmount: number;
  avgMonthlyIngestion: number;
}

interface InvoiceIngestionChartProps {
  data: MonthlyData[];
  summary: IngestionSummary;
  loading?: boolean;
}

export function InvoiceIngestionChart({ data, summary, loading }: InvoiceIngestionChartProps) {
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'count' | 'amount'>('count');

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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Ingestions</h2>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No ingestion data available
        </div>
      </div>
    );
  }

  // Transform data for chart with shortened labels
  const chartData = data.map((item) => ({
    ...item,
    shortLabel: item.monthLabel.replace(' 20', "'"), // "Jan 2024" -> "Jan '24"
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as MonthlyData;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{item.monthLabel}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">New Invoices:</span>
              <span className="font-medium">{item.invoiceCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Cases:</span>
              <span className="font-medium">{item.caseCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Total Invoiced:</span>
              <span className="font-medium">{formatCurrency(item.totalInvoiced)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Avg per Invoice:</span>
              <span className="font-medium">{formatCurrency(item.avgInvoiceAmount)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Invoice Ingestions</h2>
          <p className="text-sm text-gray-600 mt-1">
            New invoices added per month (last 24 months)
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('count')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'count'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Count
          </button>
          <button
            onClick={() => setViewMode('amount')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'amount'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 inline mr-1" />
            Amount
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            Avg Monthly Invoices
          </div>
          <div className="text-xl font-bold text-gray-900">
            {summary.avgMonthlyIngestion.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Total (24 mo)
          </div>
          <div className="text-xl font-bold text-gray-900">
            {summary.totalInvoices.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Invoiced (24 mo)
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.totalInvoiced)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            stroke="#6B7280"
            style={{ fontSize: '10px' }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) =>
              viewMode === 'count'
                ? value.toLocaleString()
                : `$${(value / 1000).toFixed(0)}K`
            }
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {viewMode === 'count' && (
            <ReferenceLine
              y={summary.avgMonthlyIngestion}
              stroke="#1E8E8E"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Avg: ${summary.avgMonthlyIngestion}`,
                position: 'right',
                fill: '#1E8E8E',
                fontSize: 11,
              }}
            />
          )}
          <Bar
            dataKey={viewMode === 'count' ? 'invoiceCount' : 'totalInvoiced'}
            fill="#1E8E8E"
            radius={[4, 4, 0, 0]}
            name={viewMode === 'count' ? 'Invoice Count' : 'Total Invoiced'}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Collapsible Table */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Monthly Breakdown</span>
            <span className="text-xs text-gray-500">
              ({data.length} months)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">
              {isTableExpanded ? 'Hide' : 'Show'} details
            </span>
            {isTableExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </div>
        </button>

        {isTableExpanded && (
          <div className="overflow-x-auto mt-3 max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Month</th>
                  <th className="text-right py-2 font-medium text-gray-600">Invoices</th>
                  <th className="text-right py-2 font-medium text-gray-600">Cases</th>
                  <th className="text-right py-2 font-medium text-gray-600">Total Invoiced</th>
                  <th className="text-right py-2 font-medium text-gray-600">Avg Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((item) => (
                  <tr key={item.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 text-gray-900">{item.monthLabel}</td>
                    <td className="text-right py-2 font-medium text-gray-900">
                      {item.invoiceCount.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-gray-700">
                      {item.caseCount.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-gray-700">
                      {formatCurrency(item.totalInvoiced)}
                    </td>
                    <td className="text-right py-2 text-gray-700">
                      {formatCurrency(item.avgInvoiceAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold sticky bottom-0 bg-white">
                  <td className="py-2 text-gray-900">Total / Avg</td>
                  <td className="text-right py-2 text-gray-900">
                    {summary.totalInvoices.toLocaleString()}
                  </td>
                  <td className="text-right py-2 text-gray-900">
                    {summary.totalCases.toLocaleString()}
                  </td>
                  <td className="text-right py-2 text-gray-900">
                    {formatCurrency(summary.totalInvoiced)}
                  </td>
                  <td className="text-right py-2 text-gray-900">
                    {formatCurrency(summary.avgInvoiceAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
