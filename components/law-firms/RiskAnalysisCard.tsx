'use client';

import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatters';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

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

interface RiskAnalysisCardProps {
  riskData: RiskData[];
  loading?: boolean;
}

export function RiskAnalysisCard({ riskData, loading }: RiskAnalysisCardProps) {
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

  // Sort by risk score descending
  const sortedRiskData = [...riskData].sort((a, b) => b.riskScore - a.riskScore);
  const highRiskFirms = sortedRiskData.filter((f) => f.riskLevel === 'Critical' || f.riskLevel === 'High');

  // Calculate totals
  const totalAtRiskAR = sortedRiskData.reduce((sum, f) => sum + f.totalAtRiskAR, 0);
  const totalAtRiskCases = sortedRiskData.reduce((sum, f) => sum + f.totalAtRiskCases, 0);

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'High':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'Medium':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
      <div className="px-6 py-4 bg-red-50 border-b border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Law Firm Risk Analysis</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Firms with high write-off risk or performance concerns
        </p>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-500">Total At-Risk AR</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalAtRiskAR)}</p>
            <p className="text-xs text-gray-500 mt-1">{formatNumber(totalAtRiskCases)} cases</p>
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-500">High-Risk Firms</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{highRiskFirms.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(highRiskFirms.reduce((sum, f) => sum + f.totalAtRiskAR, 0))} at risk
            </p>
          </div>

          <div className="bg-white border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-gray-500">Avg Risk Score</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {Math.round(
                sortedRiskData.reduce((sum, f) => sum + f.riskScore, 0) / sortedRiskData.length
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">out of 100</p>
          </div>
        </div>

        {/* Risk Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Law Firm</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Risk Level</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Risk Score</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">At-Risk AR</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">At-Risk %</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">No Longer Rep</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Stale Pending</th>
              </tr>
            </thead>
            <tbody>
              {sortedRiskData.map((firm) => (
                <tr key={firm.lawFirmId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(firm.riskLevel)}
                      <span className="font-medium text-gray-900">{firm.lawFirmName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(
                        firm.riskLevel
                      )}`}
                    >
                      {firm.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div
                      className={`font-medium ${
                        firm.riskScore >= 70
                          ? 'text-red-600'
                          : firm.riskScore >= 50
                          ? 'text-amber-600'
                          : firm.riskScore >= 30
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {Math.round(firm.riskScore)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-red-600">
                    {formatCurrency(firm.totalAtRiskAR)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {formatPercentage(firm.atRiskPct / 100)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    <div className="text-xs text-gray-500">
                      {formatCurrency(firm.noLongerRepresent.ar)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {firm.noLongerRepresent.cases} cases
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    <div className="text-xs text-gray-500">
                      {formatCurrency(firm.stalePending.ar)}
                    </div>
                    <div className="text-xs text-gray-400">{firm.stalePending.cases} cases</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk Category Breakdown */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Risk Category Breakdown</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">No Longer Represent</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(
                  sortedRiskData.reduce((sum, f) => sum + f.noLongerRepresent.ar, 0)
                )}
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(
                  sortedRiskData.reduce((sum, f) => sum + f.noLongerRepresent.cases, 0)
                )}{' '}
                cases
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Stale Pending (18+ mo)</p>
              <p className="text-lg font-bold text-amber-600">
                {formatCurrency(sortedRiskData.reduce((sum, f) => sum + f.stalePending.ar, 0))}
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(sortedRiskData.reduce((sum, f) => sum + f.stalePending.cases, 0))}{' '}
                cases
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Very Old Cases (36+ mo)</p>
              <p className="text-lg font-bold text-yellow-600">
                {formatCurrency(sortedRiskData.reduce((sum, f) => sum + f.veryOld.ar, 0))}
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(sortedRiskData.reduce((sum, f) => sum + f.veryOld.cases, 0))} cases
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
