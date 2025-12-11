/**
 * Receivables Summary KPIs Component
 * PI-SPECIFIC metrics for Personal Injury receivables
 */

'use client';

import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Wallet, CheckCircle, Scale, AlertTriangle } from 'lucide-react';

interface ReceivablesSummary {
  // Traditional metrics
  totalOpen: number;
  openCaseCount: number;

  // PI-SPECIFIC metrics (primary KPIs)
  settledPendingAR?: number;
  settledPendingCases?: number;
  activeLitigationAR?: number;
  activeLitigationCases?: number;
  atRiskAR?: number;
  atRiskCases?: number;
}

interface ReceivablesSummaryKPIsProps {
  data: ReceivablesSummary | null;
  loading?: boolean;
}

export function ReceivablesSummaryKPIs({ data, loading }: ReceivablesSummaryKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      title: 'Total Open AR',
      value: formatCurrency(data.totalOpen),
      icon: <Wallet className="h-5 w-5" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      subtitle: `${formatNumber(data.openCaseCount)} cases`,
      description: 'All open receivables across all case stages',
    },
    {
      title: 'Settled, Awaiting Payment',
      value: formatCurrency(data.settledPendingAR || 0),
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      subtitle: `${formatNumber(data.settledPendingCases || 0)} cases`,
      description: 'Money already WON - cases settled but not yet disbursed',
      highlight: true,
    },
    {
      title: 'Active Litigation',
      value: formatCurrency(data.activeLitigationAR || 0),
      icon: <Scale className="h-5 w-5" />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      subtitle: `${formatNumber(data.activeLitigationCases || 0)} cases`,
      description: 'In Litigation + Negotiation stages',
    },
    {
      title: 'At-Risk AR',
      value: formatCurrency(data.atRiskAR || 0),
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      subtitle: `${formatNumber(data.atRiskCases || 0)} cases`,
      description: 'No Longer Represent + Pending (write-off candidates)',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg border ${kpi.highlight ? 'border-green-300 shadow-md' : 'border-gray-200'} p-6 hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
            </div>
            <div className={`${kpi.iconBg} ${kpi.iconColor} rounded-lg p-2`}>
              {kpi.icon}
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</p>
            <p className="text-xs text-gray-500 mb-2">{kpi.subtitle}</p>
            {kpi.description && (
              <p className="text-xs text-gray-400 italic">{kpi.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
