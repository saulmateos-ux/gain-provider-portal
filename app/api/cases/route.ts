import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get paginated cases
    const result = await query(`
      SELECT
        id,
        salesforce_id,
        patient_name,
        opportunity_name,
        law_firm_name,
        attorney_name,
        invoice_amount,
        collected_amount,
        open_balance,
        invoice_date,
        case_status,
        payoff_status,
        ROUND((collected_amount / NULLIF(invoice_amount, 0) * 100), 2) as collection_rate
      FROM provider_master_data
      ORDER BY invoice_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM provider_master_data');
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL'
      }
    });
  } catch (error) {
    console.error('Cases API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cases data' },
      { status: 500 }
    );
  }
}
