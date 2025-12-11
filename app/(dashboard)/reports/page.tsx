'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

export default function ReportsPage() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [agingData, setAgingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/kpi').then(r => r.json()),
      fetch('/api/aging').then(r => r.json())
    ])
      .then(([kpi, aging]) => {
        setKpiData(kpi.data?.[0] || null);
        setAgingData(aging.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive performance reports</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium">
          Export Report
        </button>
      </div>

      {/* KPI Summary */}
      {kpiData && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(parseFloat(kpiData.total_invoice || 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(parseFloat(kpiData.total_collected || 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Open AR</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(parseFloat(kpiData.total_open || 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
              <p className="text-2xl font-bold text-teal-600">
                {formatPercentage(parseFloat(kpiData.collection_rate || 0) / 100)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aging Analysis */}
      {agingData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Aging Analysis</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agingData.map((bucket, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bucket.aging_bucket}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {bucket.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(parseFloat(bucket.total_balance))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-medium ${
                        parseFloat(bucket.percent_of_total) > 30 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {formatPercentage(parseFloat(bucket.percent_of_total) / 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white border-2 border-gray-300 hover:border-teal-600 rounded-lg p-4 text-left">
            <p className="font-semibold text-gray-900">Full Data Export</p>
            <p className="text-sm text-gray-600 mt-1">Download all data as CSV</p>
          </button>
          <button className="bg-white border-2 border-gray-300 hover:border-teal-600 rounded-lg p-4 text-left">
            <p className="font-semibold text-gray-900">PDF Summary</p>
            <p className="text-sm text-gray-600 mt-1">Generate PDF report</p>
          </button>
          <button className="bg-white border-2 border-gray-300 hover:border-teal-600 rounded-lg p-4 text-left">
            <p className="font-semibold text-gray-900">Excel Workbook</p>
            <p className="text-sm text-gray-600 mt-1">Export to Excel format</p>
          </button>
        </div>
      </div>
    </div>
  );
}
