/**
 * AR Waterfall Component
 * TRUE waterfall chart showing how gross invoices resolve through collections
 * Flow: Gross Invoiced → Collections → Reductions → Write-offs
 */

'use client';

import { formatCurrency } from '@/lib/formatters';

interface CollectionsFunnelProps {
  totalInvoiced: number;
  totalCollected: number;
  totalOpen: number;
  totalWriteOffs: number; // This is actually "Reductions" (negotiated settlements)
  loading?: boolean;
}

export function CollectionsFunnel({
  totalInvoiced,
  totalCollected,
  totalWriteOffs, // Rename conceptually: this = Reductions
  loading,
}: CollectionsFunnelProps) {
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

  // Calculate the waterfall values:
  // - Reductions = Gross - Collections - Write-offs (the negotiated/adjusted amount)
  // - Write-offs = true bad debt from DB (currently $0 assumption, using totalWriteOffs as placeholder)
  const trueWriteOffs = 0; // True bad debt - $0 for now

  // Reductions = everything that's not collected and not written off
  // This is the negotiated/adjusted amount (settlements, discounts, etc.)
  const afterCollections = totalInvoiced - totalCollected;
  const reductions = Math.max(0, afterCollections - trueWriteOffs);
  const afterReductions = afterCollections - reductions;

  // Max value for scaling (gross invoiced)
  const maxValue = totalInvoiced;
  const chartHeight = 280;
  const barWidth = 80;
  const gap = 40;

  // Helper to convert value to pixel height
  const toHeight = (val: number) => (val / maxValue) * (chartHeight - 40);
  const toY = (val: number) => chartHeight - 20 - toHeight(val);

  // Waterfall data (no Open Balance)
  const bars = [
    {
      label: 'Gross Invoiced',
      value: totalInvoiced,
      startY: toY(totalInvoiced),
      height: toHeight(totalInvoiced),
      color: '#475569', // slate-600
      isStart: true,
      delta: totalInvoiced,
    },
    {
      label: 'Collections',
      value: totalCollected,
      startY: toY(totalInvoiced), // starts at top of gross
      height: toHeight(totalCollected),
      color: '#10b981', // emerald-500
      isDecrease: true,
      delta: -totalCollected,
      runningTotal: afterCollections,
    },
    {
      label: 'Reductions',
      value: reductions,
      startY: toY(afterCollections), // starts at remaining after collections
      height: toHeight(reductions),
      color: '#f97316', // orange-500
      isDecrease: true,
      delta: -reductions,
      runningTotal: afterReductions,
    },
    {
      label: 'Write-offs',
      value: trueWriteOffs,
      startY: toY(afterReductions),
      height: Math.max(toHeight(trueWriteOffs), 2), // min 2px to show
      color: '#ef4444', // red-500
      isDecrease: true,
      delta: -trueWriteOffs,
      runningTotal: afterReductions - trueWriteOffs,
    },
  ];

  // Calculate x positions
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap;
  const startX = 60;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Collections Waterfall</h2>
        <p className="text-sm text-gray-600 mt-1">
          How gross invoices are resolved through collections and adjustments
        </p>
      </div>

      {/* SVG Waterfall Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${startX + totalWidth + 20} ${chartHeight + 60}`}
          className="w-full h-auto"
          style={{ maxHeight: '340px' }}
        >
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = chartHeight - 20 - (chartHeight - 40) * pct;
            const value = maxValue * pct;
            return (
              <g key={pct}>
                <line
                  x1={startX - 5}
                  y1={y}
                  x2={startX + totalWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4,4"
                />
                <text
                  x={startX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                  style={{ fontSize: '10px' }}
                >
                  ${(value / 1000000).toFixed(1)}M
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={startX}
            y1={chartHeight - 20}
            x2={startX + totalWidth}
            y2={chartHeight - 20}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Bars and connectors */}
          {bars.map((bar, index) => {
            const x = startX + index * (barWidth + gap);
            const nextBar = bars[index + 1];

            return (
              <g key={bar.label}>
                {/* Connector line to next bar */}
                {nextBar && !bar.isStart && (
                  <line
                    x1={x + barWidth}
                    y1={bar.startY + bar.height}
                    x2={x + barWidth + gap}
                    y2={bar.startY + bar.height}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeDasharray="4,2"
                  />
                )}

                {/* Connector from start bar */}
                {bar.isStart && nextBar && (
                  <line
                    x1={x + barWidth}
                    y1={bar.startY}
                    x2={x + barWidth + gap}
                    y2={bar.startY}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeDasharray="4,2"
                  />
                )}

                {/* The bar itself */}
                <rect
                  x={x}
                  y={bar.startY}
                  width={barWidth}
                  height={Math.max(bar.height, 2)}
                  fill={bar.color}
                  rx="4"
                  className="transition-all duration-300"
                />

                {/* Value label on bar */}
                {bar.height > 25 && (
                  <text
                    x={x + barWidth / 2}
                    y={bar.startY + bar.height / 2 + 4}
                    textAnchor="middle"
                    className="fill-white font-semibold"
                    style={{ fontSize: '11px' }}
                  >
                    {bar.value >= 1000000
                      ? `$${(bar.value / 1000000).toFixed(2)}M`
                      : `$${(bar.value / 1000).toFixed(0)}K`}
                  </text>
                )}

                {/* Value label outside bar if too small */}
                {bar.height <= 25 && bar.value > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={bar.startY - 5}
                    textAnchor="middle"
                    className="fill-gray-700 font-semibold"
                    style={{ fontSize: '10px' }}
                  >
                    {formatCurrency(bar.value)}
                  </text>
                )}

                {/* Delta indicator for decrease bars */}
                {bar.isDecrease && bar.value > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={bar.startY - 8}
                    textAnchor="middle"
                    className="fill-gray-500"
                    style={{ fontSize: '9px' }}
                  >
                    {bar.value >= 1000000
                      ? `-$${(bar.value / 1000000).toFixed(2)}M`
                      : `-$${(bar.value / 1000).toFixed(0)}K`}
                  </text>
                )}

                {/* X-axis label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 5}
                  textAnchor="middle"
                  className="fill-gray-700 font-medium"
                  style={{ fontSize: '10px' }}
                >
                  {bar.label.split(' ').map((word, i) => (
                    <tspan
                      key={i}
                      x={x + barWidth / 2}
                      dy={i === 0 ? 0 : 12}
                    >
                      {word}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-600"></div>
          <span className="text-gray-600">Gross Invoiced</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-gray-600">Collections (Cash In)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500"></div>
          <span className="text-gray-600">Reductions (Negotiated)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600">Write-offs (Bad Debt)</span>
        </div>
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <div className="font-bold text-gray-900">{formatCurrency(totalInvoiced)}</div>
            <div className="text-gray-500">Gross Invoiced</div>
          </div>
          <div>
            <div className="font-bold text-emerald-600">{formatCurrency(totalCollected)}</div>
            <div className="text-gray-500">Collected</div>
          </div>
          <div>
            <div className="font-bold text-orange-600">{formatCurrency(reductions)}</div>
            <div className="text-gray-500">Reductions</div>
          </div>
          <div>
            <div className="font-bold text-red-600">{formatCurrency(trueWriteOffs)}</div>
            <div className="text-gray-500">Write-offs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
