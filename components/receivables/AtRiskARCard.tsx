'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { AlertTriangle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

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

interface AtRiskARCardProps {
  cases: AtRiskCase[];
  summary: RiskSummary[];
  loading?: boolean;
}

export function AtRiskARCard({ cases, summary, loading }: AtRiskARCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const totalAtRisk = summary.reduce((sum, s) => sum + s.totalAR, 0);
  const totalCases = summary.reduce((sum, s) => sum + s.caseCount, 0);

  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">At-Risk AR</h2>
            <p className="text-sm text-gray-600 mt-1">
              Cases at high risk of not paying - potential write-off candidates
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Total At-Risk AR</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalAtRisk)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{totalCases} cases</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Risk Categories</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Types of risk identified</p>
          </div>
        </div>

        {/* Risk Category Breakdown */}
        <div className="space-y-3">
          {summary.map((risk) => (
            <div key={risk.riskCategory} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{risk.riskCategory}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {risk.caseCount} cases · Avg {Math.round(risk.avgAgeDays / 30)} months old
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{formatCurrency(risk.totalAR)}</p>
                  <p className="text-xs text-gray-500">
                    {totalAtRisk > 0 ? ((risk.totalAR / totalAtRisk) * 100).toFixed(1) : 0}% of risk
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Table Section */}
      {cases.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-6 py-3 bg-white hover:bg-gray-50 transition-colors border-b border-gray-200 flex items-center justify-between"
          >
            <span className="text-sm font-medium text-gray-700">Case Details</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {isExpanded ? 'Hide' : 'Show'} {cases.length} cases
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </button>

          {/* Table - Collapsible */}
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Law Firm
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Open Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case Age
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.slice(0, 10).map((caseData, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {caseData.caseName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {caseData.lawFirm}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          caseData.caseStatus === 'No Longer Represent'
                            ? 'bg-red-100 text-red-800'
                            : caseData.caseStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {caseData.caseStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {caseData.riskCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(caseData.openBalance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(caseData.daysSinceOrigination / 30)} months
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {cases.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">No at-risk cases identified</p>
          <p className="text-sm mt-1">All open AR is in acceptable status</p>
        </div>
      )}
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
