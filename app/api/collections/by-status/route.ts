import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Collections by Case Status API
 * Returns collection metrics broken down by case status
 */

export const revalidate = 60;

function getDateFilter(period: string): string {
  // Filter by invoice_date (when issued), NOT collection_date (when paid)
  switch (period) {
    case '3m':
      return "AND invoice_date >= CURRENT_DATE - INTERVAL '3 months'";
    case '6m':
      return "AND invoice_date >= CURRENT_DATE - INTERVAL '6 months'";
    case '12m':
      return "AND invoice_date >= CURRENT_DATE - INTERVAL '12 months'";
    case 'ytd':
      return "AND invoice_date >= DATE_TRUNC('year', CURRENT_DATE)";
    case 'all':
      return ''; // No date filter
    default:
      return "AND invoice_date >= CURRENT_DATE - INTERVAL '12 months'";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '12m';
    const dateFilter = getDateFilter(period);

    const result = await query(`
      SELECT
        COALESCE(case_status, 'Unknown') as status,
        COUNT(*) as invoice_count,
        COUNT(DISTINCT opportunity_name) as case_count,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open,
        ROUND(
          CASE
            WHEN SUM(invoice_amount) > 0
            THEN (SUM(collected_amount) / SUM(invoice_amount) * 100)
            ELSE 0
          END,
          1
        ) as collection_rate
      FROM provider_master_data
      WHERE provider_name = 'Therapy Partners Group - Parent'
        ${dateFilter}
      GROUP BY case_status
      HAVING SUM(invoice_amount) > 0
      ORDER BY total_collected DESC
      LIMIT 10
    `);

    return NextResponse.json({
      data: result.rows.map(row => ({
        status: row.status,
        invoiceCount: parseInt(row.invoice_count),
        caseCount: parseInt(row.case_count),
        totalInvoiced: parseFloat(row.total_invoiced),
        totalCollected: parseFloat(row.total_collected),
        totalOpen: parseFloat(row.total_open),
        collectionRate: parseFloat(row.collection_rate),
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
      },
    });
  } catch (error) {
    console.error('Collections by status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections by status' },
      { status: 500 }
    );
  }
}
