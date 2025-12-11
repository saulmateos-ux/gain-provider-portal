import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Collections by Law Firm API
 * Returns top/bottom law firms by collection performance
 */

export const revalidate = 60;

function getDateFilter(period: string): string {
  // Filter by collection_date (when money was deposited) for the Collections page
  switch (period) {
    case '3m':
      return "AND collection_date >= CURRENT_DATE - INTERVAL '3 months'";
    case '6m':
      return "AND collection_date >= CURRENT_DATE - INTERVAL '6 months'";
    case '12m':
      return "AND collection_date >= CURRENT_DATE - INTERVAL '12 months'";
    case 'ytd':
      return "AND collection_date >= DATE_TRUNC('year', CURRENT_DATE)";
    case 'all':
      return ''; // No date filter
    default:
      return "AND collection_date >= CURRENT_DATE - INTERVAL '12 months'";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'collected'; // collected, rate, open
    const period = searchParams.get('period') || '12m';
    const dateFilter = getDateFilter(period);

    let orderByClause = 'total_collected DESC';
    if (sortBy === 'rate') {
      orderByClause = 'collection_rate DESC';
    } else if (sortBy === 'open') {
      orderByClause = 'total_open DESC';
    }

    const result = await query(`
      SELECT
        COALESCE(law_firm_name, 'Unknown') as law_firm,
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
        AND law_firm_name IS NOT NULL
        AND collection_date IS NOT NULL
        AND collected_amount > 0
        ${dateFilter}
      GROUP BY law_firm_name
      HAVING SUM(collected_amount) > 0
      ORDER BY ${orderByClause}
      LIMIT $1
    `, [limit]);

    return NextResponse.json({
      data: result.rows.map(row => ({
        lawFirm: row.law_firm,
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
        sortedBy: sortBy,
      },
    });
  } catch (error) {
    console.error('Collections by law firm API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch law firm performance' },
      { status: 500 }
    );
  }
}
