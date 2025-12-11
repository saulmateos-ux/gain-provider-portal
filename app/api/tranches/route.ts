import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Get tranche performance from materialized view
    const result = await query(`
      SELECT
        tranche_name,
        case_count,
        total_invoiced as total_deployed,
        total_collected,
        total_open as open_balance,
        collection_rate
      FROM tranche_performance_mv
      ORDER BY total_invoiced DESC
    `);

    return NextResponse.json({
      data: result.rows,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL_MaterializedView',
        viewName: 'tranche_performance_mv'
      }
    });
  } catch (error) {
    console.error('Tranches API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tranches data' },
      { status: 500 }
    );
  }
}
