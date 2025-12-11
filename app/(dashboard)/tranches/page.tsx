'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters';

interface Tranche {
  tranche_name: string;
  case_count: number;
  total_deployed: string;
  total_collected: string;
  open_balance: string;
  collection_rate: string;
}

export default function TranchesPage() {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tranches')
      .then(res => res.json())
      .then(result => {
        setTranches(result.data || []);
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
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Tranches</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totals = tranches.reduce((acc, t) => ({
    cases: acc.cases + t.case_count,
    deployed: acc.deployed + parseFloat(t.total_deployed),
    collected: acc.collected + parseFloat(t.total_collected),
    open: acc.open + parseFloat(t.open_balance)
  }), { cases: 0, deployed: 0, collected: 0, open: 0 });

  const overallCollectionRate = totals.deployed > 0 ? (totals.collected / totals.deployed * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tranche Performance</h1>
        <p className="text-gray-600 mt-2">Performance tracking for partial advance tranches</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Tranches</p>
          <p className="text-2xl font-bold text-gray-900">{tranches.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Deployed</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.deployed)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.collected)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Overall Collection Rate</p>
          <p className={`text-2xl font-bold ${overallCollectionRate >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
            {formatPercentage(overallCollectionRate / 100)}
          </p>
        </div>
      </div>

      {/* Tranches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tranche
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cases
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deployed
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collected
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collection Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tranches.map((tranche, index) => {
              const collectionRate = parseFloat(tranche.collection_rate);
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tranche.tranche_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(tranche.case_count)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(parseFloat(tranche.total_deployed))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                    {formatCurrency(parseFloat(tranche.total_collected))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                    {formatCurrency(parseFloat(tranche.open_balance))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-semibold ${
                      collectionRate >= 80 ? 'text-green-600' :
                      collectionRate >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {formatPercentage(collectionRate / 100)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tranches.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg mt-4">
          <p className="text-gray-500">No tranche data available</p>
        </div>
      )}
    </div>
  );
}
