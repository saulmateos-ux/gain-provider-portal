import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Receivables Aging API
 * Returns open AR broken down by aging buckets
 * Buckets: 0-180, 181-365, 1-2 years, 2-3 years, 3+ years
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Get aging buckets based on invoice_date (days since invoice)
    // Buckets: 0-180 days, 181-365 days, 1-1.5 years, 1.5-2 years, 2-3 years, 3+ years
    const result = await query(`
      SELECT
        CASE
          WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
          WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
          WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
          WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
          WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
          ELSE '3+ years'
        END as aging_bucket,
        COUNT(*) as invoice_count,
        COUNT(DISTINCT opportunity_name) as case_count,
        SUM(open_balance) as total_open,
        SUM(invoice_amount) as total_invoiced,
        ROUND(AVG(CURRENT_DATE - invoice_date)::numeric, 0) as avg_days_old
      FROM provider_master_data
      WHERE provider_name = 'Therapy Partners Group - Parent'
        AND open_balance > 0
      GROUP BY
        CASE
          WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
          WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
          WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
          WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
          WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
          ELSE '3+ years'
        END
      ORDER BY
        CASE
          WHEN CASE
            WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
            WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
            WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
            WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
            WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
            ELSE '3+ years'
          END = '0-180' THEN 1
          WHEN CASE
            WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
            WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
            WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
            WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
            WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
            ELSE '3+ years'
          END = '181-365' THEN 2
          WHEN CASE
            WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
            WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
            WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
            WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
            WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
            ELSE '3+ years'
          END = '1-1.5 years' THEN 3
          WHEN CASE
            WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
            WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
            WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
            WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
            WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
            ELSE '3+ years'
          END = '1.5-2 years' THEN 4
          WHEN CASE
            WHEN CURRENT_DATE - invoice_date <= 180 THEN '0-180'
            WHEN CURRENT_DATE - invoice_date <= 365 THEN '181-365'
            WHEN CURRENT_DATE - invoice_date <= 548 THEN '1-1.5 years'
            WHEN CURRENT_DATE - invoice_date <= 730 THEN '1.5-2 years'
            WHEN CURRENT_DATE - invoice_date <= 1095 THEN '2-3 years'
            ELSE '3+ years'
          END = '2-3 years' THEN 5
          ELSE 6
        END
    `);

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => ({
        totalOpen: acc.totalOpen + parseFloat(row.total_open || 0),
        totalInvoices: acc.totalInvoices + parseInt(row.invoice_count || 0),
        totalCases: acc.totalCases + parseInt(row.case_count || 0),
      }),
      { totalOpen: 0, totalInvoices: 0, totalCases: 0 }
    );

    return NextResponse.json({
      data: result.rows.map(row => ({
        bucket: row.aging_bucket,
        invoiceCount: parseInt(row.invoice_count),
        caseCount: parseInt(row.case_count),
        totalOpen: parseFloat(row.total_open),
        totalInvoiced: parseFloat(row.total_invoiced),
        avgDaysOld: parseInt(row.avg_days_old),
        percentOfTotal: totals.totalOpen > 0
          ? Math.round((parseFloat(row.total_open) / totals.totalOpen) * 100)
          : 0,
      })),
      totals,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
      },
    });
  } catch (error) {
    console.error('Receivables aging API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aging data' },
      { status: 500 }
    );
  }
}
