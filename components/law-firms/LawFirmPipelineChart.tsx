'use client';

import { formatCurrency, formatNumber } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface PipelineStage {
  caseStatus: string;
  caseCount: number;
  openAR: number;
  pctOfFirmAR: number;
  stageCategory: string;
  color: string;
}

interface LawFirmPipelineChartProps {
  lawFirmName: string;
  stages: PipelineStage[];
  loading?: boolean;
}

export function LawFirmPipelineChart({ lawFirmName, stages, loading }: LawFirmPipelineChartProps) {
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
  const sortedStages = [...stages].sort((a, b) => b.openAR - a.openAR);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.caseStatus}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Open AR:</span> {formatCurrency(data.openAR)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Cases:</span> {formatNumber(data.caseCount)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">% of Firm AR:</span> {data.pctOfFirmAR.toFixed(1)}%
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Avg AR/Case:</span>{' '}
              {formatCurrency(data.openAR / data.caseCount)}
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
        <h2 className="text-lg font-semibold text-gray-900">
          {lawFirmName} - Case Pipeline Composition
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Open AR distribution across litigation stages
        </p>
      </div>

      <div className="p-6">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={sortedStages}
            layout="vertical"
            margin={{ top: 5, right: 120, left: 20, bottom: 5 }}
          >
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis dataKey="caseStatus" type="category" width={180} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="openAR"
              radius={[0, 8, 8, 0]}
              label={({ x, y, width, height, value, index }: any) => {
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
                    {formatCurrency(value)} ({stage.pctOfFirmAR.toFixed(1)}%)
                  </text>
                );
              }}
            >
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

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Stages</p>
              <p className="text-sm font-medium text-gray-900">{sortedStages.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Open AR</p>
              <p className="text-sm font-medium text-gray-900">
                {formatCurrency(sortedStages.reduce((sum, s) => sum + s.openAR, 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Cases</p>
              <p className="text-sm font-medium text-gray-900">
                {formatNumber(sortedStages.reduce((sum, s) => sum + s.caseCount, 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Largest Stage</p>
              <p className="text-sm font-medium text-gray-900">
                {sortedStages[0]?.caseStatus || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
