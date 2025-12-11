/**
 * Collections Summary KPIs Component
 * Displays 4 key performance indicators at the top of collections page
 */

'use client';

import { formatCurrency, formatPercentageWhole, formatNumber } from '@/lib/formatters';
import { DollarSign, TrendingUp, FileCheck, Clock } from 'lucide-react';

interface CollectionsSummary {
  totalCollected: number;
  totalInvoiced: number;
  collectionRate: number;
  invoicesWithCollections: number;
  totalInvoices: number;
  avgDaysToCollect: number;
}

interface CollectionsSummaryKPIsProps {
  data: CollectionsSummary | null;
  loading?: boolean;
}

export function CollectionsSummaryKPIs({ data, loading }: CollectionsSummaryKPIsProps) {
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
      title: 'Total Collected',
      value: formatCurrency(data.totalCollected),
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      subtitle: `of ${formatCurrency(data.totalInvoiced)} invoiced`,
    },
    {
      title: 'Collection Rate',
      value: formatPercentageWhole(data.collectionRate),
      icon: <TrendingUp className="h-5 w-5" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      subtitle: 'Overall collection efficiency',
    },
    {
      title: 'Invoices Collected',
      value: formatNumber(data.invoicesWithCollections),
      icon: <FileCheck className="h-5 w-5" />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      subtitle: `of ${formatNumber(data.totalInvoices)} total invoices`,
    },
    {
      title: 'Avg Days to Collect',
      value: data.avgDaysToCollect > 0 ? `${Math.round(data.avgDaysToCollect)} days` : 'N/A',
      icon: <Clock className="h-5 w-5" />,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      subtitle: 'Collection cycle time',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
            <p className="text-xs text-gray-500">{kpi.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
