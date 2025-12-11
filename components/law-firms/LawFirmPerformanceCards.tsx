'use client';

import { useState } from 'react';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters';
import { AlertTriangle, ChevronDown, ChevronUp, Building2, TrendingUp, TrendingDown, Search, X } from 'lucide-react';

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

interface LawFirmPerformanceCardsProps {
  lawFirms: LawFirmPerformance[];
  loading?: boolean;
}

type SortField = 'name' | 'openAR' | 'collectionRate' | 'atRiskPct';

export function LawFirmPerformanceCards({ lawFirms, loading }: LawFirmPerformanceCardsProps) {
  const [sortField, setSortField] = useState<SortField>('openAR');
  const [expandedFirm, setExpandedFirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64"></div>
          </div>
        </div>
        <div className="p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden animate-pulse">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-md"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="h-3 bg-gray-100 rounded w-12 mb-1"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div>
                      <div className="h-3 bg-gray-100 rounded w-12 mb-1"></div>
                      <div className="h-6 bg-gray-200 rounded w-10"></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-100 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-100 rounded w-28"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-100 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-14"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter by search query
  const filteredLawFirms = lawFirms.filter((firm) =>
    firm.lawFirmName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort filtered results
  const sortedLawFirms = [...filteredLawFirms].sort((a, b) => {
    switch (sortField) {
      case 'name':
        return a.lawFirmName.localeCompare(b.lawFirmName);
      case 'openAR':
        return b.totalOpenAR - a.totalOpenAR;
      case 'collectionRate':
        return b.collectionRate - a.collectionRate;
      case 'atRiskPct':
        const aPct = a.totalOpenAR > 0 ? (a.atRiskAR / a.totalOpenAR) * 100 : 0;
        const bPct = b.totalOpenAR > 0 ? (b.atRiskAR / b.totalOpenAR) * 100 : 0;
        return bPct - aPct;
      default:
        return b.totalOpenAR - a.totalOpenAR;
    }
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header with subtle background */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Law Firm Performance</h2>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? (
                  <>
                    Showing {sortedLawFirms.length} of {lawFirms.length} law firms
                  </>
                ) : (
                  <>PI-specific performance metrics for {lawFirms.length} law firms</>
                )}
              </p>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="openAR">Open AR (High to Low)</option>
                <option value="collectionRate">Collection Rate (High to Low)</option>
                <option value="atRiskPct">At-Risk % (High to Low)</option>
                <option value="name">Name (A to Z)</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search law firms by name..."
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards area with subtle background */}
      <div className="p-6 bg-gray-50/30">
        {sortedLawFirms.length === 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No law firms found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search query to find what you are looking for.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLawFirms.map((firm) => {
            const atRiskPct = firm.totalOpenAR > 0 ? (firm.atRiskAR / firm.totalOpenAR) * 100 : 0;
            const isExpanded = expandedFirm === firm.lawFirmId;

            return (
              <div
                key={firm.lawFirmId}
                className="rounded-lg transition-all duration-200 hover:shadow-md bg-white border border-gray-200/80 shadow-sm"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-gray-100">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight pt-0.5">
                      {firm.lawFirmName}
                    </h3>
                  </div>

                  {/* Primary Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Open AR</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(firm.totalOpenAR)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Cases</p>
                      <p className="text-xl font-bold text-gray-900">{formatNumber(firm.totalCases)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 bg-white">
                  {/* Collection Rate */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Collection Rate</span>
                    <div className="flex items-center gap-1.5">
                      {firm.collectionRate >= 60 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          firm.collectionRate >= 60 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatPercentage(firm.collectionRate / 100)}
                      </span>
                    </div>
                  </div>

                  {/* Active Litigation */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Litigation</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(firm.activeLitigationAR)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatNumber(firm.activeLitigationCases)} cases
                      </p>
                    </div>
                  </div>

                  {/* At-Risk AR */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {atRiskPct > 30 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <span className="text-sm text-gray-600">At-Risk AR</span>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          atRiskPct > 30
                            ? 'text-red-600'
                            : atRiskPct > 20
                            ? 'text-amber-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {formatCurrency(firm.atRiskAR)}
                      </p>
                      <p className="text-xs text-gray-500">{atRiskPct.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Avg Case Age */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Avg Case Age</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round(firm.avgCaseAgeDays / 30)} months
                    </span>
                  </div>
                </div>

                {/* Expandable Details */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setExpandedFirm(isExpanded ? null : firm.lawFirmId)}
                    className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 bg-gray-50 space-y-2.5 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Invoiced</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(firm.totalInvoiced)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Collected</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(firm.totalCollected)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Avg Days to Collection</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(firm.avgDaysToCollection)} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2.5 mt-1 border-t border-gray-200">
                        <span className="text-gray-500">At-Risk Cases</span>
                        <span className="font-medium text-red-600">
                          {formatNumber(firm.atRiskCases)} cases
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
