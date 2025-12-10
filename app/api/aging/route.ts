import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

/**
 * Aging Analysis Endpoint (Public - No Auth Required)
 *
 * CRITICAL RULE #1: NO frontend calculations
 * This endpoint ONLY fetches pre-calculated aging buckets from materialized view
 */

const QuerySchema = z.object({
  providerId: z.string().optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = QuerySchema.parse({
      providerId: searchParams.get('providerId') || undefined,
    });

    // Fetch from materialized view (pre-calculated)
    let sql = 'SELECT * FROM aging_analysis_mv';
    const queryParams: string[] = [];

    if (params.providerId) {
      sql += ' WHERE provider_id = $1';
      queryParams.push(params.providerId);
    }

    sql += ' ORDER BY provider_name';

    const result = await query(sql, queryParams);

    // Return with metadata
    return NextResponse.json({
      data: result.rows,
      metadata: {
        count: result.rowCount,
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL_MaterializedView',
        calculationsInDatabase: true,
        apiPassthroughOnly: true,
      },
    });
  } catch (error) {
    console.error('Aging API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
