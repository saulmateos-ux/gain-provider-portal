import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

/**
 * Law Firm Performance Endpoint (Public - No Auth Required)
 *
 * CRITICAL RULE #1: NO frontend calculations
 * Returns pre-calculated law firm performance metrics
 */

const QuerySchema = z.object({
  providerId: z.string().optional(),
  lawFirmId: z.string().optional(),
  minCases: z.coerce.number().int().positive().optional().default(3),
});

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = QuerySchema.parse({
      providerId: searchParams.get('providerId') || undefined,
      lawFirmId: searchParams.get('lawFirmId') || undefined,
      minCases: searchParams.get('minCases') || undefined,
    });

    // Build query - simplified for real data
    let sql = 'SELECT * FROM law_firm_performance_mv WHERE case_count >= $1';
    const queryParams: any[] = [params.minCases];

    if (params.lawFirmId) {
      sql += ` AND law_firm_id = $2`;
      queryParams.push(params.lawFirmId);
    }

    sql += ' ORDER BY total_invoice DESC';

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
    console.error('Law Firms API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
