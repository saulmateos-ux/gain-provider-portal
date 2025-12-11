import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

/**
 * GET /api/law-firms/trends
 * Returns monthly performance trends for law firms
 * Query params:
 *   - lawFirmId: specific law firm (optional, if omitted returns all firms)
 *   - months: number of months to return (default: 12)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lawFirmId = searchParams.get('lawFirmId');
    const months = parseInt(searchParams.get('months') || '12');

    let sql = `
      SELECT
        law_firm_id,
        law_firm_name,
        collection_month,
        cases_collected,
        invoiced_amount,
        collected_amount,
        collection_rate,
        avg_days_to_collection,
        median_days_to_collection,
        settled_collections,
        litigation_collections,
        negotiated_collections
      FROM law_firm_monthly_trends_mv
      WHERE collection_month >= CURRENT_DATE - INTERVAL '${months} months'
    `;

    if (lawFirmId) {
      sql += ` AND law_firm_id = $1`;
    }

    sql += ` ORDER BY law_firm_id, collection_month DESC`;

    const result = lawFirmId
      ? await query(sql, [lawFirmId])
      : await query(sql);

    // Format data for frontend
    const trends = result.rows.map((row: any) => ({
      lawFirmId: row.law_firm_id,
      lawFirmName: row.law_firm_name,
      month: row.collection_month,

      // Volume
      casesCollected: parseInt(row.cases_collected || 0),
      invoicedAmount: parseFloat(row.invoiced_amount || 0),
      collectedAmount: parseFloat(row.collected_amount || 0),

      // Performance
      collectionRate: parseFloat(row.collection_rate || 0),

      // Velocity
      avgDaysToCollection: parseFloat(row.avg_days_to_collection || 0),
      medianDaysToCollection: parseFloat(row.median_days_to_collection || 0),

      // Case Status Mix
      settledCollections: parseInt(row.settled_collections || 0),
      litigationCollections: parseInt(row.litigation_collections || 0),
      negotiatedCollections: parseInt(row.negotiated_collections || 0),
    }));

    // Group by law firm if returning multiple firms
    let groupedData = trends;
    if (!lawFirmId) {
      const firmMap = new Map();
      trends.forEach((trend: any) => {
        if (!firmMap.has(trend.lawFirmId)) {
          firmMap.set(trend.lawFirmId, {
            lawFirmId: trend.lawFirmId,
            lawFirmName: trend.lawFirmName,
            trends: [],
          });
        }
        firmMap.get(trend.lawFirmId).trends.push(trend);
      });
      groupedData = Array.from(firmMap.values());
    }

    return NextResponse.json({
      data: lawFirmId ? trends : groupedData,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'law_firm_monthly_trends_mv',
        calculationsInDatabase: true,
        lawFirmId: lawFirmId || 'all',
        monthsReturned: months,
      },
    });
  } catch (error) {
    console.error('Error fetching law firm trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch law firm trends data' },
      { status: 500 }
    );
  }
}
