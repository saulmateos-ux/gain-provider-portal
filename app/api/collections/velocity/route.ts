import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Collection Velocity API
 * Returns distribution of how long it takes to collect - histogram of collection aging
 */

export const revalidate = 60;

function getDateFilter(period: string): string {
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
    const period = searchParams.get('period') || '12m';
    const dateFilter = getDateFilter(period);

    // Get distribution of collection times by aging buckets
    const result = await query(`
      WITH collection_aging AS (
        SELECT
          CASE
            WHEN (collection_date - invoice_date) <= 90 THEN '0-3 months'
            WHEN (collection_date - invoice_date) <= 180 THEN '3-6 months'
            WHEN (collection_date - invoice_date) <= 365 THEN '6-12 months'
            WHEN (collection_date - invoice_date) <= 540 THEN '12-18 months'
            WHEN (collection_date - invoice_date) <= 730 THEN '18-24 months'
            ELSE '24+ months'
          END as aging_bucket,
          CASE
            WHEN (collection_date - invoice_date) <= 90 THEN 1
            WHEN (collection_date - invoice_date) <= 180 THEN 2
            WHEN (collection_date - invoice_date) <= 365 THEN 3
            WHEN (collection_date - invoice_date) <= 540 THEN 4
            WHEN (collection_date - invoice_date) <= 730 THEN 5
            ELSE 6
          END as bucket_order,
          collected_amount,
          (collection_date - invoice_date) as days_to_collect
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND collection_date IS NOT NULL
          AND invoice_date IS NOT NULL
          AND collected_amount > 0
          ${dateFilter}
      )
      SELECT
        aging_bucket,
        bucket_order,
        COUNT(*) as case_count,
        SUM(collected_amount) as total_collected,
        ROUND(AVG(days_to_collect)::numeric, 0) as avg_days
      FROM collection_aging
      GROUP BY aging_bucket, bucket_order
      ORDER BY bucket_order ASC
    `);

    // Get totals for percentage calculation
    const totals = await query(`
      SELECT
        COUNT(*) as total_cases,
        SUM(collected_amount) as total_collected,
        ROUND(AVG(collection_date - invoice_date)::numeric, 0) as overall_avg_days,
        MIN(collection_date - invoice_date) as min_days,
        MAX(collection_date - invoice_date) as max_days
      FROM provider_master_data
      WHERE provider_name = 'Therapy Partners Group - Parent'
        AND collection_date IS NOT NULL
        AND invoice_date IS NOT NULL
        AND collected_amount > 0
        ${dateFilter}
    `);

    const totalCases = parseInt(totals.rows[0]?.total_cases || 0);
    const totalCollected = parseFloat(totals.rows[0]?.total_collected || 0);

    return NextResponse.json({
      data: result.rows.map(row => ({
        bucket: row.aging_bucket,
        bucketOrder: parseInt(row.bucket_order),
        caseCount: parseInt(row.case_count),
        totalCollected: parseFloat(row.total_collected || 0),
        avgDays: parseInt(row.avg_days || 0),
        percentOfCases: totalCases > 0 ? ((parseInt(row.case_count) / totalCases) * 100) : 0,
        percentOfAmount: totalCollected > 0 ? ((parseFloat(row.total_collected) / totalCollected) * 100) : 0,
      })),
      summary: {
        totalCases,
        totalCollected,
        overallAvgDays: parseInt(totals.rows[0]?.overall_avg_days || 0),
        minDays: parseInt(totals.rows[0]?.min_days || 0),
        maxDays: parseInt(totals.rows[0]?.max_days || 0),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
      },
    });
  } catch (error) {
    console.error('Collection velocity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection velocity data' },
      { status: 500 }
    );
  }
}
