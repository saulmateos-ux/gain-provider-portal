'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { CollectionsSummaryKPIs } from '@/components/collections/CollectionsSummaryKPIs';
import { CollectionsTrendChart } from '@/components/collections/CollectionsTrendChart';
import { CollectionsFunnel } from '@/components/collections/CollectionsFunnel';
import { CollectionVelocityTrend } from '@/components/collections/CollectionVelocityTrend';
import { LawFirmPerformance } from '@/components/collections/LawFirmPerformance';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

type PeriodOption = '3m' | '6m' | '12m' | 'ytd' | 'all';

interface CollectionData {
  month: string;
  invoice_count: number;
  total_invoiced: string;
  total_collected: string;
  total_open: string;
  total_write_offs?: string;
  collection_rate: string;
  mom_change_collected?: string | null;
  mom_change_rate?: string | null;
}

interface CollectionsSummary {
  totalCollected: number;
  totalInvoiced: number;
  collectionRate: number;
  totalOpenBalance: number;
  totalInvoices: number;
  invoicesWithCollections: number;
  fullyCollectedInvoices: number;
  avgDaysToCollect: number;
  totalWriteOffs: number;
  // Portfolio totals for waterfall (consistent data)
  portfolioGrossInvoiced: number;
  portfolioCollected: number;
  portfolioOpenBalance: number;
  portfolioWriteOffs: number;
}

interface VelocityBucket {
  bucket: string;
  bucketOrder: number;
  caseCount: number;
  totalCollected: number;
  avgDays: number;
  percentOfCases: number;
  percentOfAmount: number;
}

interface VelocitySummary {
  totalCases: number;
  totalCollected: number;
  overallAvgDays: number;
  minDays: number;
  maxDays: number;
}

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

export default function CollectionsPage() {
  const [trendData, setTrendData] = useState<CollectionData[]>([]);
  const [summaryData, setSummaryData] = useState<CollectionsSummary | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityBucket[]>([]);
  const [velocitySummary, setVelocitySummary] = useState<VelocitySummary | null>(null);
  const [lawFirmData, setLawFirmData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('12m');

  useEffect(() => {
    setLoading(true);
    // Fetch all endpoints in parallel with period parameter
    Promise.all([
      fetch(`/api/collections?period=${period}`).then(res => res.json()),
      fetch(`/api/collections/summary?period=${period}`).then(res => res.json()),
      fetch(`/api/collections/velocity?period=${period}`).then(res => res.json()),
      fetch(`/api/collections/by-law-firm?limit=10&period=${period}`).then(res => res.json()),
    ])
      .then(([trendsResult, summaryResult, velocityResult, lawFirmResult]) => {
        setTrendData(trendsResult.data || []);
        setSummaryData(summaryResult.data || null);
        setVelocityData(velocityResult.data || []);
        setVelocitySummary(velocityResult.summary || null);
        setLawFirmData(lawFirmResult.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [period]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Collections</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600 mt-1">Comprehensive collection performance analytics and trends</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
            className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <CollectionsSummaryKPIs data={summaryData} loading={loading} />

      {/* Collection Trend Chart */}
      <CollectionsTrendChart data={trendData} loading={loading} />

      {/* Two Column Layout for Funnel and Velocity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AR Waterfall (uses period-filtered data to match KPIs) */}
        {summaryData && (
          <CollectionsFunnel
            totalInvoiced={summaryData.totalInvoiced}
            totalCollected={summaryData.totalCollected}
            totalOpen={summaryData.totalOpenBalance}
            totalWriteOffs={summaryData.totalWriteOffs || 0}
            loading={loading}
          />
        )}

        {/* Collection Velocity Distribution */}
        <CollectionVelocityTrend data={velocityData} summary={velocitySummary || undefined} loading={loading} />
      </div>

      {/* Law Firm Performance */}
      <LawFirmPerformance data={lawFirmData} loading={loading} />

      {/* Enhanced Monthly Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Performance Details</h2>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown with month-over-month changes</p>
        </div>

        {loading ? (
          <div className="p-6 animate-pulse">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoices
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Invoiced
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Collected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MoM Change
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trendData.map((row, index) => {
                  const momChange = row.mom_change_collected ? parseFloat(row.mom_change_collected) : null;
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {row.invoice_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(parseFloat(row.total_invoiced))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(parseFloat(row.total_collected))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {momChange !== null ? (
                          <div className={`flex items-center justify-end gap-1 ${momChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {momChange >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="font-medium">{Math.abs(momChange).toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">
                        {formatCurrency(parseFloat(row.total_open))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={`${parseFloat(row.collection_rate) >= 60 ? 'text-green-600' : parseFloat(row.collection_rate) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {formatPercentage(parseFloat(row.collection_rate) / 100)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {trendData.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50">
            <p className="text-gray-500">No collection data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
