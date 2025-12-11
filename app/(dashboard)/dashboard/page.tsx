/**
 * Enhanced Main Dashboard Page
 *
 * Redesigned with clear visual hierarchy:
 * - Period filter dropdown
 * - Hero KPIs: The 3 metrics that matter most
 * - Top 3 Law Firms by collections
 * - Secondary metrics: Supporting context
 * - Portfolio summary: Overview stats
 *
 * CRITICAL RULE #1: NO calculations - only display pre-calculated data
 */

'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Scale,
  Briefcase,
  Users,
  FileText,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface EnhancedKPIData {
  total_invoiced: number;
  total_collected: number;
  total_open_balance: number;
  total_written_off: number;
  collection_rate: number;
  dso_days: number;
  write_off_rate: number;
  portfolio_health_score: number;
  health_score_grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  at_risk_ar: number;
  settled_pending_ar: number;
  active_litigation_ar: number;
  case_count: number;
  open_case_count: number;
  invoice_count: number;
  law_firm_count: number;
}

interface LawFirmData {
  lawFirm: string;
  totalCollected: number;
  collectionRate: number;
  caseCount: number;
}

const PERIOD_OPTIONS = [
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '12m', label: 'Last 12 Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all', label: 'All Time' },
];

// Format currency with proper $ and commas
function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '$0';
  const num = Number(value);
  if (num >= 1000000) {
    return '$' + (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return '$' + (num / 1000).toFixed(0) + 'K';
  }
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Format full currency (no abbreviation)
function formatFullMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '$0';
  return '$' + Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Format percentage
function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '0%';
  return Number(value).toFixed(1) + '%';
}

// Format days
function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '0';
  return Math.round(Number(value)).toString();
}

// Get collection rate color
function getCollectionRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600';
  if (rate >= 60) return 'text-amber-600';
  return 'text-red-600';
}

// Get DSO color (lower is better)
function getDSOColor(days: number): string {
  if (days <= 90) return 'text-emerald-600';
  if (days <= 180) return 'text-amber-600';
  return 'text-red-600';
}

// Truncate long law firm names
function truncateName(name: string, maxLength: number = 30): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function DashboardPage() {
  const [kpiData, setKpiData] = useState<EnhancedKPIData | null>(null);
  const [topFirms, setTopFirms] = useState<LawFirmData[]>([]);
  const [loading, setLoading] = useState(true);
  const [firmsLoading, setFirmsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('12m');

  // Fetch KPI data (updates with period changes)
  useEffect(() => {
    async function fetchKPIData() {
      try {
        setLoading(true);
        setError(null);

        const kpiResponse = await fetch(`/api/kpi?period=${period}`);
        if (!kpiResponse.ok) throw new Error('Failed to fetch KPI data');
        const kpiResult = await kpiResponse.json();

        if (kpiResult.data && kpiResult.data.length > 0) {
          const tpgData = kpiResult.data.find(
            (provider: any) => provider.provider_name === 'Therapy Partners Group - Parent'
          );
          setKpiData(tpgData || kpiResult.data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchKPIData();
  }, [period]);

  // Fetch top law firms (changes with period)
  useEffect(() => {
    async function fetchTopFirms() {
      try {
        setFirmsLoading(true);
        const response = await fetch(`/api/collections/by-law-firm?limit=3&period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch law firms');
        const result = await response.json();
        setTopFirms(result.data || []);
      } catch (err) {
        console.error('Error fetching top firms:', err);
        setTopFirms([]);
      } finally {
        setFirmsLoading(false);
      }
    }
    fetchTopFirms();
  }, [period]);

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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-8 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-12 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const collectionRate = Number(kpiData?.collection_rate || 0);
  const dsoDays = Number(kpiData?.dso_days || 0);

  return (
    <div className="space-y-8">
      {/* Page Header with Period Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Portfolio performance overview</p>
        </div>

        {/* Period Dropdown */}
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* COLLECTIONS SECTION */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Collected */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-emerald-200" />
              <span className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
                Total Collected
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatMoney(kpiData?.total_collected)}
            </div>
            <div className="text-xs text-emerald-100">
              Cumulative collections
            </div>
          </div>

          {/* Collection Rate */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Collection Rate
              </span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getCollectionRateColor(collectionRate)}`}>
              {formatPct(collectionRate)}
            </div>
            <div className="text-xs text-gray-500">
              {collectionRate >= 80 ? 'Excellent' : collectionRate >= 60 ? 'Good' : 'Needs attention'}
            </div>
          </div>

          {/* Days to Collect (DSO) */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Days to Collect
              </span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getDSOColor(dsoDays)}`}>
              {formatDays(dsoDays)}
              <span className="text-lg font-normal text-gray-400 ml-1">days</span>
            </div>
            <div className="text-xs text-gray-500">
              Average DSO
            </div>
          </div>

          {/* Write-off Rate */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Write-off Rate
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-900">
              {formatPct(kpiData?.write_off_rate || 0)}
            </div>
            <div className="text-xs text-gray-500">
              {formatMoney(kpiData?.total_written_off)} written off
            </div>
          </div>
        </div>
      </div>

      {/* BALANCE SECTION */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Open Receivables */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-slate-400" />
              <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                Open Balance
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatMoney(kpiData?.total_open_balance)}
            </div>
            <div className="text-xs text-slate-400">
              To be collected
            </div>
          </div>

          {/* Total Invoiced */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Invoiced
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-900">
              {formatMoney(kpiData?.total_invoiced)}
            </div>
            <div className="text-xs text-gray-500">
              All-time invoiced
            </div>
          </div>

          {/* Settled Pending - Money coming in */}
          <div className="bg-emerald-50 rounded-lg p-5 border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide">
                Settled Pending
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-emerald-700">
              {formatMoney(kpiData?.settled_pending_ar)}
            </div>
            <div className="text-xs text-emerald-600">Awaiting payment</div>
          </div>

          {/* Active Litigation */}
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">
                In Litigation
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-blue-700">
              {formatMoney(kpiData?.active_litigation_ar)}
            </div>
            <div className="text-xs text-blue-600">In legal process</div>
          </div>

          {/* At-Risk AR */}
          <div className="bg-amber-50 rounded-lg p-5 border border-amber-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                At Risk
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-amber-700">
              {formatMoney(kpiData?.at_risk_ar)}
            </div>
            <div className="text-xs text-amber-600">Needs attention</div>
          </div>
        </div>
      </div>

      {/* LAW FIRMS SECTION */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Law Firms</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* Number of Law Firms */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-teal-200" />
              <span className="text-xs font-medium text-teal-100 uppercase tracking-wide">
                Law Firms
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {kpiData?.law_firm_count?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-teal-100">
              Active firms
            </div>
          </div>

          {/* Total Cases */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Cases
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-900">
              {kpiData?.case_count?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500">
              {kpiData?.open_case_count?.toLocaleString() || 0} open
            </div>
          </div>

          {/* Average Collection Rate */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Avg Firm Rate
              </span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${getCollectionRateColor(collectionRate)}`}>
              {formatPct(collectionRate)}
            </div>
            <div className="text-xs text-gray-500">
              Collection rate
            </div>
          </div>

          {/* Total Invoices */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Invoices
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-900">
              {kpiData?.invoice_count?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500">
              Total invoices
            </div>
          </div>

          {/* Open AR (for context) */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Firm AR Total
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 text-gray-900">
              {formatMoney(kpiData?.total_open_balance)}
            </div>
            <div className="text-xs text-gray-500">
              Open balance
            </div>
          </div>
        </div>

        {/* Top 3 Law Firms */}
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            Top Performing Firms
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({PERIOD_OPTIONS.find(o => o.value === period)?.label})
            </span>
          </h3>

          {firmsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg p-5 border border-gray-200 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : topFirms.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              No collection data available for this period
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topFirms.map((firm, index) => (
                <div
                  key={firm.lawFirm}
                  className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-700'}
                    `}>
                      {index + 1}
                    </div>
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 truncate" title={firm.lawFirm}>
                      {truncateName(firm.lawFirm)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatMoney(firm.totalCollected)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{firm.caseCount} cases</span>
                    <span className={getCollectionRateColor(firm.collectionRate)}>
                      {formatPct(firm.collectionRate)} rate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
