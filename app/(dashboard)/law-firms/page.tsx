'use client';

import { useEffect, useState } from 'react';
import { LawFirmKPIs } from '@/components/law-firms/LawFirmKPIs';
import { LawFirmPerformanceCards } from '@/components/law-firms/LawFirmPerformanceCards';
import { RiskAnalysisCard } from '@/components/law-firms/RiskAnalysisCard';
import { TopLawFirmsChart } from '@/components/law-firms/TopLawFirmsChart';

// Type definitions based on API responses
interface LawFirmPerformance {
  lawFirmId: string;
  lawFirmName: string;
  totalCases: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOpenAR: number;
  collectionRate: number;
  caseStatusBreakdown: any;
  activeLitigationCases: number;
  activeLitigationAR: number;
  atRiskCases: number;
  atRiskAR: number;
  avgCaseAgeDays: number;
  avgDaysSinceSettlement: number;
  avgDaysToCollection: number;
  performanceGrade: string;
}

interface RiskData {
  lawFirmId: string;
  lawFirmName: string;
  noLongerRepresent: { cases: number; ar: number };
  stalePending: { cases: number; ar: number };
  veryOld: { cases: number; ar: number };
  totalAtRiskCases: number;
  totalAtRiskAR: number;
  atRiskPct: number;
  delayedDisbursementCases: number;
  delayedDisbursementAR: number;
  avgDisbursementDelayDays: number;
  riskScore: number;
  riskLevel: string;
  color: string;
}

export default function LawFirmsPage() {
  const [performanceData, setPerformanceData] = useState<LawFirmPerformance[]>([]);
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/law-firms/performance').then((res) => res.json()),
      fetch('/api/law-firms/risk').then((res) => res.json()),
    ])
      .then(([performanceResult, riskResult]) => {
        setPerformanceData(performanceResult.data || []);
        setRiskData(riskResult.data || []);
        setLoading(false);
      })
      .catch((err) => {
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
          <h2 className="text-red-800 font-semibold">Error Loading Law Firms</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate summary KPIs
  const totalLawFirms = performanceData.length;
  const totalOpenAR = performanceData.reduce((sum, f) => sum + f.totalOpenAR, 0);
  const totalCases = performanceData.reduce((sum, f) => sum + f.totalCases, 0);
  const avgCollectionRate =
    performanceData.reduce((sum, f) => sum + f.collectionRate, 0) / performanceData.length;
  const totalAtRiskAR = performanceData.reduce((sum, f) => sum + f.atRiskAR, 0);
  const totalActiveLitigationAR = performanceData.reduce(
    (sum, f) => sum + f.activeLitigationAR,
    0
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Law Firm Performance</h1>
        <p className="text-gray-600 mt-1">
          PI-specific performance analysis - litigation pipeline and risk assessment by law firm
        </p>
      </div>

      {/* PI-Specific Summary KPI Cards */}
      <LawFirmKPIs
        totalLawFirms={totalLawFirms}
        totalOpenAR={totalOpenAR}
        totalCases={totalCases}
        avgCollectionRate={avgCollectionRate}
        totalAtRiskAR={totalAtRiskAR}
        totalActiveLitigationAR={totalActiveLitigationAR}
        loading={loading}
      />

      {/* Top 10 Law Firms by Collections Chart */}
      <TopLawFirmsChart lawFirms={performanceData} loading={loading} />

      {/* Law Firm Performance Cards (PRIMARY VISUALIZATION) */}
      <LawFirmPerformanceCards lawFirms={performanceData} loading={loading} />

      {/* Risk Analysis Card */}
      {riskData.length > 0 && <RiskAnalysisCard riskData={riskData} loading={loading} />}

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        <p className="font-medium text-blue-900 mb-2">⚖️ Personal Injury Law Firm Performance</p>
        <p>
          For PI law firms, performance depends on <strong>litigation outcomes</strong> and{' '}
          <strong>case pipeline composition</strong>, not just collection rate. A firm with many
          active litigation cases may have lower current collection rates but higher future
          potential. The <strong>performance grade</strong> considers collection rate, at-risk
          percentage, and average case age to provide a holistic PI-specific assessment.
        </p>
      </div>
    </div>
  );
}
