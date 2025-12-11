/**
 * Top Open Balances Table Component
 * Displays the largest outstanding receivables
 */

'use client';

import { formatCurrency } from '@/lib/formatters';
import { AlertTriangle, Building2, User, FileText } from 'lucide-react';

interface BalanceItem {
  rank: number;
  name: string;
  type: string;
  patientName?: string;
  lawFirmName?: string;
  caseStatus?: string;
  invoiceCount: number;
  caseCount: number;
  totalOpen: number;
  totalInvoiced: number;
  oldestInvoice: string;
  avgDaysOld: number;
}

interface TopBalancesTableProps {
  data: BalanceItem[];
  loading?: boolean;
  groupBy?: 'case' | 'law_firm' | 'patient';
  onGroupByChange?: (groupBy: 'case' | 'law_firm' | 'patient') => void;
}

export function TopBalancesTable({ data, loading, groupBy = 'case', onGroupByChange }: TopBalancesTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
        <div className="p-6 animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getAgeIndicator = (days: number) => {
    if (days <= 90) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Current' };
    if (days <= 180) return { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Aging' };
    if (days <= 365) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Past Due' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Critical' };
  };

  const getIcon = () => {
    switch (groupBy) {
      case 'law_firm':
        return Building2;
      case 'patient':
        return User;
      default:
        return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Top Open Balances</h2>
            <p className="text-sm text-gray-600 mt-1">Largest outstanding receivables requiring attention</p>
          </div>
          {onGroupByChange && (
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value as 'case' | 'law_firm' | 'patient')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="case">By Case</option>
              <option value="law_firm">By Law Firm</option>
              <option value="patient">By Patient</option>
            </select>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          No open balances found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {groupBy === 'case' ? 'Case' : groupBy === 'law_firm' ? 'Law Firm' : 'Patient'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Balance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Age
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => {
                const ageInfo = getAgeIndicator(item.avgDaysOld);
                return (
                  <tr key={`${item.type}-${item.rank}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={item.name}>
                            {item.name}
                          </p>
                          {groupBy === 'case' && item.lawFirmName && (
                            <p className="text-xs text-gray-500 truncate max-w-xs" title={item.lawFirmName}>
                              {item.lawFirmName}
                            </p>
                          )}
                          {item.caseStatus && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mt-1">
                              {item.caseStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.totalOpen)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {item.invoiceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      {item.avgDaysOld} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ageInfo.bg} ${ageInfo.color}`}>
                        {item.avgDaysOld > 180 && <AlertTriangle className="w-3 h-3" />}
                        {ageInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
