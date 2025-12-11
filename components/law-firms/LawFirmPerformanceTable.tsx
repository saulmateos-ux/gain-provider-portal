'use client';

import { useState } from 'react';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters';
import { ChevronDown, ChevronUp, Award, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface LawFirmPerformance {
  lawFirmId: string;
  lawFirmName: string;
  totalCases: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOpenAR: number;
  collectionRate: number;
  activeLitigationCases: number;
  activeLitigationAR: number;
  atRiskCases: number;
  atRiskAR: number;
  avgCaseAgeDays: number;
  avgDaysToCollection: number;
  performanceGrade: string;
}

interface LawFirmPerformanceTableProps {
  lawFirms: LawFirmPerformance[];
  loading?: boolean;
}

// Grade colors (consistent with design tokens)
const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  C: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
  D: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  F: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

type SortField = 'name' | 'cases' | 'openAR' | 'collectionRate' | 'grade' | 'atRiskPct';
type SortDirection = 'asc' | 'desc';

export function LawFirmPerformanceTable({ lawFirms, loading }: LawFirmPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('openAR');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedFirm, setExpandedFirm] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedLawFirms = [...lawFirms].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortField) {
      case 'name':
        aVal = a.lawFirmName;
        bVal = b.lawFirmName;
        break;
      case 'cases':
        aVal = a.totalCases;
        bVal = b.totalCases;
        break;
      case 'openAR':
        aVal = a.totalOpenAR;
        bVal = b.totalOpenAR;
        break;
      case 'collectionRate':
        aVal = a.collectionRate;
        bVal = b.collectionRate;
        break;
      case 'grade':
        aVal = a.performanceGrade;
        bVal = b.performanceGrade;
        break;
      case 'atRiskPct':
        aVal = a.totalOpenAR > 0 ? (a.atRiskAR / a.totalOpenAR) * 100 : 0;
        bVal = b.totalOpenAR > 0 ? (b.atRiskAR / b.totalOpenAR) * 100 : 0;
        break;
      default:
        aVal = a.totalOpenAR;
        bVal = b.totalOpenAR;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Law Firm Performance Summary</h2>
        <p className="text-sm text-gray-600 mt-1">
          PI-specific performance metrics ranked by open AR
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="text-left py-3 px-6 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-64"
                onClick={() => handleSort('name')}
              >
                Law Firm <SortIcon field="name" />
              </th>
              <th
                className="text-center py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-20"
                onClick={() => handleSort('grade')}
              >
                Grade <SortIcon field="grade" />
              </th>
              <th
                className="text-right py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-32"
                onClick={() => handleSort('openAR')}
              >
                Open AR <SortIcon field="openAR" />
              </th>
              <th
                className="text-right py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-20"
                onClick={() => handleSort('cases')}
              >
                Cases <SortIcon field="cases" />
              </th>
              <th
                className="text-right py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-28"
                onClick={() => handleSort('collectionRate')}
              >
                Coll. Rate <SortIcon field="collectionRate" />
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600 w-32">Active Litigation</th>
              <th
                className="text-right py-3 px-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-24"
                onClick={() => handleSort('atRiskPct')}
              >
                At-Risk % <SortIcon field="atRiskPct" />
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600 w-24">Avg Age</th>
            </tr>
          </thead>
          <tbody>
            {sortedLawFirms.map((firm) => {
              const atRiskPct =
                firm.totalOpenAR > 0 ? (firm.atRiskAR / firm.totalOpenAR) * 100 : 0;
              const gradeStyle = GRADE_COLORS[firm.performanceGrade] || GRADE_COLORS.C;
              const isExpanded = expandedFirm === firm.lawFirmId;

              return (
                <>
                  <tr
                    key={firm.lawFirmId}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedFirm(isExpanded ? null : firm.lawFirmId)
                    }
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{firm.lawFirmName}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border}`}
                      >
                        {firm.performanceGrade === 'A' && <Award className="w-3 h-3 mr-1" />}
                        {firm.performanceGrade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(firm.totalOpenAR)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatNumber(firm.totalCases)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatPercentage(firm.collectionRate / 100)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      <div>{formatCurrency(firm.activeLitigationAR)}</div>
                      <div className="text-xs text-gray-400">
                        {formatNumber(firm.activeLitigationCases)} cases
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {atRiskPct > 30 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        <span
                          className={
                            atRiskPct > 30
                              ? 'text-red-600 font-medium'
                              : atRiskPct > 20
                              ? 'text-amber-600'
                              : 'text-gray-700'
                          }
                        >
                          {formatPercentage(atRiskPct / 100)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {Math.round(firm.avgCaseAgeDays / 30)} mo
                    </td>
                  </tr>

                  {/* Expanded Row with Additional Details */}
                  {isExpanded && (
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={8} className="py-3 px-6">
                        <div className="grid grid-cols-4 gap-6">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Total Invoiced</span>
                            <span className="text-sm font-semibold text-gray-900 mt-1">
                              {formatCurrency(firm.totalInvoiced)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Total Collected</span>
                            <span className="text-sm font-semibold text-gray-900 mt-1">
                              {formatCurrency(firm.totalCollected)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Avg Days to Collection</span>
                            <span className="text-sm font-semibold text-gray-900 mt-1">
                              {Math.round(firm.avgDaysToCollection)} days
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">At-Risk AR</span>
                            <span className="text-sm font-semibold text-red-600 mt-1">
                              {formatCurrency(firm.atRiskAR)}
                              <span className="text-xs text-gray-500 font-normal ml-1">
                                ({formatNumber(firm.atRiskCases)} cases)
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <tr>
              <td className="py-3 px-6 text-gray-900">Total ({lawFirms.length} firms)</td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 text-right text-gray-900">
                {formatCurrency(lawFirms.reduce((sum, f) => sum + f.totalOpenAR, 0))}
              </td>
              <td className="py-3 px-4 text-right text-gray-900">
                {formatNumber(lawFirms.reduce((sum, f) => sum + f.totalCases, 0))}
              </td>
              <td className="py-3 px-4 text-right text-gray-900">
                {formatPercentage(
                  lawFirms.reduce((sum, f) => sum + f.totalCollected, 0) /
                    lawFirms.reduce((sum, f) => sum + f.totalInvoiced, 0)
                )}
              </td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
