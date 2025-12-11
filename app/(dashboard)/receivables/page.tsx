'use client';

import { useEffect, useState } from 'react';
import { ReceivablesSummaryKPIs } from '@/components/receivables/ReceivablesSummaryKPIs';
import { CaseStatusPipeline } from '@/components/receivables/CaseStatusPipeline';
import { AgingChart } from '@/components/receivables/AgingChart';
import { InvoiceIngestionChart } from '@/components/receivables/InvoiceIngestionChart';
import { SettledPendingTable } from '@/components/receivables/SettledPendingTable';
import { AtRiskARCard } from '@/components/receivables/AtRiskARCard';

// Type definitions
interface ReceivablesSummary {
  totalOpen: number;
  openCaseCount: number;
  settledPendingAR: number;
  settledPendingCases: number;
  activeLitigationAR: number;
  activeLitigationCases: number;
  atRiskAR: number;
  atRiskCases: number;
}

interface StageData {
  name: string;
  ar: number;
  cases: number;
  invoices: number;
  percentage: number;
  color: string;
  category: string;
}

interface CaseStatusData {
  stages: StageData[];
  totals: {
    total_open_ar: number;
    total_open_cases: number;
  };
}

interface SettledCase {
  caseName: string;
  patientName: string;
  lawFirm: string;
  openBalance: number;
  daysSinceSettlement: number;
  payoffStatus: string;
  settlementDate: string;
}

interface SettledPendingSummary {
  totalCases: number;
  totalAR: number;
  avgDaysSinceSettlement: number;
}

interface AtRiskCase {
  caseName: string;
  lawFirm: string;
  openBalance: number;
  riskCategory: string;
  daysSinceOrigination: number;
  caseStatus: string;
}

interface RiskSummary {
  riskCategory: string;
  caseCount: number;
  totalAR: number;
  avgAgeDays: number;
}

interface AgingData {
  bucket: string;
  invoiceCount: number;
  caseCount: number;
  totalOpen: number;
  totalInvoiced: number;
  avgDaysOld: number;
  percentOfTotal: number;
}

interface MonthlyIngestionData {
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

export default function ReceivablesPage() {
  const [summaryData, setSummaryData] = useState<ReceivablesSummary | null>(null);
  const [caseStatusData, setCaseStatusData] = useState<CaseStatusData | null>(null);
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [ingestionData, setIngestionData] = useState<MonthlyIngestionData[]>([]);
  const [ingestionSummary, setIngestionSummary] = useState<IngestionSummary | null>(null);
  const [settledPendingCases, setSettledPendingCases] = useState<SettledCase[]>([]);
  const [settledPendingSummary, setSettledPendingSummary] = useState<SettledPendingSummary | null>(null);
  const [atRiskCases, setAtRiskCases] = useState<AtRiskCase[]>([]);
  const [atRiskSummary, setAtRiskSummary] = useState<RiskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/receivables/summary').then(res => res.json()),
      fetch('/api/receivables/by-case-status').then(res => res.json()),
      fetch('/api/receivables/aging').then(res => res.json()),
      fetch('/api/receivables/ingestions').then(res => res.json()),
      fetch('/api/receivables/settled-pending?limit=20').then(res => res.json()),
      fetch('/api/receivables/at-risk?limit=50').then(res => res.json()),
    ])
      .then(([summaryResult, caseStatusResult, agingResult, ingestionsResult, settledResult, atRiskResult]) => {
        setSummaryData(summaryResult.data || null);
        setCaseStatusData(caseStatusResult.data || null);
        setAgingData(agingResult.data || []);
        setIngestionData(ingestionsResult.data?.monthly || []);
        setIngestionSummary(ingestionsResult.data?.summary || null);
        setSettledPendingCases(settledResult.data?.cases || []);
        setSettledPendingSummary(settledResult.data?.summary || null);
        setAtRiskCases(atRiskResult.data?.cases || []);
        setAtRiskSummary(atRiskResult.data?.summary || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
          <h2 className="text-red-800 font-semibold">Error Loading Receivables</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receivables</h1>
        <p className="text-gray-600 mt-1">
          Personal Injury receivables analysis - litigation pipeline and case status tracking
        </p>
      </div>

      {/* PI-Specific Summary KPI Cards */}
      <ReceivablesSummaryKPIs data={summaryData} loading={loading} />

      {/* Case Status Pipeline (PRIMARY VISUALIZATION) */}
      {caseStatusData && (
        <CaseStatusPipeline
          stages={caseStatusData.stages}
          loading={loading}
        />
      )}

      {/* AR Aging Analysis */}
      {agingData.length > 0 && (
        <AgingChart data={agingData} loading={loading} />
      )}

      {/* Invoice Ingestions Chart */}
      {ingestionData.length > 0 && ingestionSummary && (
        <InvoiceIngestionChart
          data={ingestionData}
          summary={ingestionSummary}
          loading={loading}
        />
      )}

      {/* Settled Pending Section (Money Already Won!) */}
      {settledPendingSummary && (
        <SettledPendingTable
          cases={settledPendingCases}
          summary={settledPendingSummary}
          loading={loading}
        />
      )}

      {/* At-Risk AR Section */}
      {atRiskSummary.length > 0 && (
        <AtRiskARCard
          cases={atRiskCases}
          summary={atRiskSummary}
          loading={loading}
        />
      )}

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-medium text-blue-900 mb-2">📊 Personal Injury Receivables</p>
        <p>
          For PI receivables, collection timing depends primarily on <strong>case settlement outcomes</strong> rather than invoice age.
          The <strong>litigation stage</strong> view above provides the most actionable insights, while the <strong>aging analysis</strong> shows
          traditional invoice age distribution for reference.
        </p>
      </div>
    </div>
  );
}
