'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { ChevronDown, ChevronRight, Table } from 'lucide-react';

interface StageData {
  name: string;
  ar: number;
  cases: number;
  invoices: number;
  percentage: number;
  color: string;
  category: string;
}

interface CaseStatusPipelineProps {
  stages: StageData[];
  loading?: boolean;
}

export function CaseStatusPipeline({ stages, loading }: CaseStatusPipelineProps) {
  const [isTableExpanded, setIsTableExpanded] = useState(false);

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

  // Sort stages by AR amount descending
  const sortedStages = [...stages].sort((a, b) => b.ar - a.ar);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Open AR:</span> {formatCurrency(data.ar)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Cases:</span> {data.cases.toLocaleString()}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Invoices:</span> {data.invoices.toLocaleString()}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">% of Total:</span> {data.percentage.toFixed(1)}%
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
        <h2 className="text-lg font-semibold text-gray-900">Open AR by Case Stage</h2>
        <p className="text-sm text-gray-600 mt-1">
          Personal Injury receivables grouped by litigation pipeline stage
        </p>
      </div>

      <div className="p-6">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sortedStages}
            layout="vertical"
            margin={{ top: 5, right: 120, left: 20, bottom: 5 }}
          >
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis dataKey="name" type="category" width={180} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="ar" radius={[0, 8, 8, 0]} label={({ x, y, width, height, value, index }: any) => {
              const stage = sortedStages[index];
              return (
                <text
                  x={x + width + 8}
                  y={y + height / 2}
                  fill="#374151"
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={12}
                >
                  {formatCurrency(value)} ({stage.percentage.toFixed(1)}%)
                </text>
              );
            }}>
              {sortedStages.map((stage, index) => (
                <Cell key={`cell-${index}`} fill={stage.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-700">Settled - Awaiting Payment (money won!)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-700">Active Litigation (in progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-400"></div>
            <span className="text-sm text-gray-700">Early Stage (still treating)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-700">Pending (ambiguous status)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-sm text-gray-700">No Longer Represent (at risk)</span>
          </div>
        </div>

        {/* Collapsible Summary Table */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Breakdown by Stage</span>
              <span className="text-xs text-gray-500">
                ({sortedStages.length} stages, {formatCurrency(sortedStages.reduce((sum, s) => sum + s.ar, 0))} total)
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
                    <th className="text-left py-2 font-medium text-gray-600">Stage</th>
                    <th className="text-right py-2 font-medium text-gray-600">Open AR</th>
                    <th className="text-right py-2 font-medium text-gray-600">% of Total</th>
                    <th className="text-right py-2 font-medium text-gray-600">Cases</th>
                    <th className="text-right py-2 font-medium text-gray-600">Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStages.map((stage) => (
                    <tr key={stage.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: stage.color }}></div>
                          <span className="text-gray-900">{stage.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-2 font-medium text-gray-900">{formatCurrency(stage.ar)}</td>
                      <td className="text-right py-2 text-gray-700">{stage.percentage.toFixed(1)}%</td>
                      <td className="text-right py-2 text-gray-700">{stage.cases.toLocaleString()}</td>
                      <td className="text-right py-2 text-gray-700">{stage.invoices.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 text-gray-900">Total</td>
                    <td className="text-right py-2 text-gray-900">
                      {formatCurrency(sortedStages.reduce((sum, s) => sum + s.ar, 0))}
                    </td>
                    <td className="text-right py-2 text-gray-900">100%</td>
                    <td className="text-right py-2 text-gray-900">
                      {sortedStages.reduce((sum, s) => sum + s.cases, 0).toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-gray-900">
                      {sortedStages.reduce((sum, s) => sum + s.invoices, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
