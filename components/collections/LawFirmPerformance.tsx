/**
 * Law Firm Performance Component
 * Table showing top law firms by collection performance
 */

'use client';

import { useState } from 'react';
import { formatCurrency, formatPercentageWhole } from '@/lib/formatters';
import { ArrowUpDown } from 'lucide-react';

interface LawFirmData {
  lawFirm: string;
  invoiceCount: number;
  caseCount: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOpen: number;
  collectionRate: number;
}

interface LawFirmPerformanceProps {
  data: LawFirmData[];
  loading?: boolean;
}

export function LawFirmPerformance({ data, loading }: LawFirmPerformanceProps) {
  const [sortBy, setSortBy] = useState<'collected' | 'rate' | 'open'>('collected');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Law Firm Performance</h2>
        <div className="text-center py-12 text-gray-500">No law firm data available</div>
      </div>
    );
  }

  // Sort data based on selected criterion
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'collected') return b.totalCollected - a.totalCollected;
    if (sortBy === 'rate') return b.collectionRate - a.collectionRate;
    if (sortBy === 'open') return b.totalOpen - a.totalOpen;
    return 0;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Law Firm Performance</h2>
        <p className="text-sm text-gray-600 mt-1">Top 10 law firms by total collections (amount deposited)</p>
      </div>

      {/* Sort Buttons */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex gap-2">
        <button
          onClick={() => setSortBy('collected')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'collected'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Sort by Collected
        </button>
        <button
          onClick={() => setSortBy('rate')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'rate'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Sort by Rate
        </button>
        <button
          onClick={() => setSortBy('open')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            sortBy === 'open'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Sort by Open Balance
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Law Firm
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cases
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoiced
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collected
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open Balance
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.slice(0, 10).map((firm, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <div className="max-w-xs truncate" title={firm.lawFirm}>
                    {firm.lawFirm}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {firm.caseCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(firm.totalInvoiced)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                  {formatCurrency(firm.totalCollected)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">
                  {formatCurrency(firm.totalOpen)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold">
                    {formatPercentageWhole(firm.collectionRate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
