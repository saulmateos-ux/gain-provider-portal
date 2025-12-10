/**
 * Main Dashboard Page
 *
 * CRITICAL RULE #1: NO calculations - only display pre-calculated data
 * Data flows: Database → Materialized View → API → Component
 */

'use client';

import { useEffect, useState } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { AgingChart } from '@/components/charts/AgingChart';
import { formatCurrency, formatPercentageWhole, formatDaysSimple } from '@/lib/formatters';
import { DollarSign, TrendingUp, FileText, Briefcase, PiggyBank } from 'lucide-react';

interface KPIData {
  total_invoiced: number;
  total_collected: number;
  total_open_balance: number;
  collection_rate: number;
  dso_days: number;
  case_count: number;
  open_case_count: number;
}

interface AgingData {
  current_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_180: number;
  days_181_365: number;
  days_over_365: number;
  total_open: number;
}

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch KPI data
        const kpiResponse = await fetch('/api/kpi');
        if (!kpiResponse.ok) {
          throw new Error('Failed to fetch KPI data');
        }
        const kpiResult = await kpiResponse.json();

        // Fetch aging data
        const agingResponse = await fetch('/api/aging');
        if (!agingResponse.ok) {
          throw new Error('Failed to fetch aging data');
        }
        const agingResult = await agingResponse.json();

        // Use first result (for now - will add provider selection later)
        if (kpiResult.data && kpiResult.data.length > 0) {
          setKpiData(kpiResult.data[0]);
        }
        if (agingResult.data && agingResult.data.length > 0) {
          setAgingData(agingResult.data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your portfolio performance</p>
      </div>

      {/* KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
        <KPIGrid columns={5}>
          <KPICard
            title="Open Balance"
            value={kpiData ? formatCurrency(kpiData.total_open_balance) : '-'}
            icon={<DollarSign className="h-5 w-5" />}
            loading={loading}
          />
          <KPICard
            title="Days Sales Outstanding"
            value={kpiData ? formatDaysSimple(kpiData.dso_days) : '-'}
            icon={<FileText className="h-5 w-5" />}
            isUpGood={false}
            loading={loading}
          />
          <KPICard
            title="Collection Rate"
            value={kpiData ? formatPercentageWhole(kpiData.collection_rate) : '-'}
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
          />
          <KPICard
            title="Open Cases"
            value={kpiData ? kpiData.open_case_count.toString() : '-'}
            icon={<Briefcase className="h-5 w-5" />}
            loading={loading}
          />
          <KPICard
            title="Total Collected"
            value={kpiData ? formatCurrency(kpiData.total_collected) : '-'}
            icon={<PiggyBank className="h-5 w-5" />}
            loading={loading}
          />
        </KPIGrid>
      </section>

      {/* Aging Analysis Chart */}
      <section>
        {agingData ? (
          <AgingChart data={agingData} loading={loading} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            {loading ? 'Loading aging analysis...' : 'No aging data available'}
          </div>
        )}
      </section>

      {/* Summary Stats */}
      {kpiData && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Invoiced</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpiData.total_invoiced)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Cases</h3>
            <p className="text-2xl font-bold text-gray-900">{kpiData.case_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Invoice</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpiData.total_invoiced / kpiData.case_count)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
