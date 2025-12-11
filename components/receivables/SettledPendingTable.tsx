'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { CheckCircle, Clock, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';

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

interface SettledPendingTableProps {
  cases: SettledCase[];
  summary: SettledPendingSummary;
  loading?: boolean;
}

export function SettledPendingTable({ cases, summary, loading }: SettledPendingTableProps) {
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Settled - Awaiting Payment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Cases that have SETTLED and are awaiting collection.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Always Visible */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total AR Won</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalAR)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{summary.totalCases} cases</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Avg Wait Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.avgDaysSinceSettlement} days
            </p>
            <p className="text-xs text-gray-500 mt-1">Since settlement</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Settled Cases</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalCases}
            </p>
            <p className="text-xs text-gray-500 mt-1">Awaiting disbursement</p>
          </div>
        </div>
      </div>

      {/* Collapsible Table Section */}
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open Balance
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payoff Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Since Settlement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Settlement Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No settled cases awaiting payment
                </td>
              </tr>
            ) : (
              cases.map((caseData, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{caseData.caseName}</p>
                      <p className="text-xs text-gray-500">{caseData.patientName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {caseData.lawFirm}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(caseData.openBalance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      caseData.payoffStatus?.includes('Cap')
                        ? 'bg-blue-100 text-blue-800'
                        : caseData.payoffStatus?.includes('Reduction')
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {caseData.payoffStatus || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-medium ${
                      caseData.daysSinceSettlement > 180
                        ? 'text-red-600'
                        : caseData.daysSinceSettlement > 90
                        ? 'text-amber-600'
                        : 'text-gray-900'
                    }`}>
                      {caseData.daysSinceSettlement} days
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {caseData.settlementDate
                      ? new Date(caseData.settlementDate).toLocaleDateString()
                      : '-'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
