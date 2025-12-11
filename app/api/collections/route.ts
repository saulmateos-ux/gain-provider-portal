import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

function getDateFilter(period: string): string {
  // For trend chart: filter by collection_date to show cash flow (when money came in)
  switch (period) {
    case '3m':
      return "collection_date >= CURRENT_DATE - INTERVAL '3 months'";
    case '6m':
      return "collection_date >= CURRENT_DATE - INTERVAL '6 months'";
    case '12m':
      return "collection_date >= CURRENT_DATE - INTERVAL '12 months'";
    case 'ytd':
      return "collection_date >= DATE_TRUNC('year', CURRENT_DATE)";
    case 'all':
      return '1=1'; // No date filter
    default:
      return "collection_date >= CURRENT_DATE - INTERVAL '12 months'";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '12m';
    const dateFilter = getDateFilter(period);

    // Get collection trends showing:
    // - CASH FLOW (bars): How much money came in each month (by collection_date)
    // - COLLECTION RATE (line): Recovery rate for cases collected that month
    //   "Of the cases that paid this month, what % of their invoice value was recovered?"
    //
    // This shows monthly collection efficiency, which will vary based on
    // the mix of cases that settled each month.
    const result = await query(`
      WITH monthly_metrics AS (
        -- For each month, calculate metrics from cases that were COLLECTED in that month
        SELECT
          DATE_TRUNC('month', collection_date) as month,
          COUNT(*) as cases_collected,
          SUM(invoice_amount) as invoiced_for_collected_cases,
          SUM(collected_amount) as cash_collected
        FROM provider_master_data
        WHERE ${dateFilter}
          AND collection_date IS NOT NULL
          AND provider_name = 'Therapy Partners Group - Parent'
        GROUP BY DATE_TRUNC('month', collection_date)
      )
      SELECT
        month,
        cases_collected as invoice_count,
        cash_collected as total_collected,
        invoiced_for_collected_cases as total_invoiced,
        0 as total_open,
        0 as total_write_offs,
        -- Collection rate: what % of invoice value was recovered for cases collected this month
        ROUND(
          CASE
            WHEN invoiced_for_collected_cases > 0
            THEN (cash_collected / invoiced_for_collected_cases * 100)
            ELSE 0
          END,
        2) as collection_rate,
        -- MoM change in collections
        ROUND(
          ((cash_collected - LAG(cash_collected) OVER (ORDER BY month)) /
          NULLIF(LAG(cash_collected) OVER (ORDER BY month), 0) * 100),
          1
        ) as mom_change_collected,
        NULL as mom_change_rate
      FROM monthly_metrics
      ORDER BY month ASC
    `);

    return NextResponse.json({
      data: result.rows,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true
      }
    });
  } catch (error) {
    console.error('Collections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections data' },
      { status: 500 }
    );
  }
}
