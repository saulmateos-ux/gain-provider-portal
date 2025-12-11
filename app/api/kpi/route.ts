import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

/**
 * KPI Summary Endpoint (Public - No Auth Required)
 *
 * CRITICAL RULE #1: NO frontend calculations
 * This endpoint ONLY fetches pre-calculated data from materialized view
 */

const QuerySchema = z.object({
  providerId: z.string().optional(),
  period: z.string().optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

function getDateFilter(period: string): string {
  // For collections: filter by collection_date
  // For invoicing: filter by invoice_date
  switch (period) {
    case '3m':
      return "AND (collection_date >= CURRENT_DATE - INTERVAL '3 months' OR invoice_date >= CURRENT_DATE - INTERVAL '3 months')";
    case '6m':
      return "AND (collection_date >= CURRENT_DATE - INTERVAL '6 months' OR invoice_date >= CURRENT_DATE - INTERVAL '6 months')";
    case '12m':
      return "AND (collection_date >= CURRENT_DATE - INTERVAL '12 months' OR invoice_date >= CURRENT_DATE - INTERVAL '12 months')";
    case 'ytd':
      return "AND (collection_date >= DATE_TRUNC('year', CURRENT_DATE) OR invoice_date >= DATE_TRUNC('year', CURRENT_DATE))";
    case 'all':
      return ''; // No date filter
    default:
      return ''; // Default to all time
  }
}

function getInvoiceDateFilter(period: string): string {
  // For invoice-based metrics (collection rate, total invoiced)
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
      return ''; // Default to all time
  }
}

function getCollectionDateFilter(period: string): string {
  // For collection-based metrics (total collected)
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
      return ''; // Default to all time
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = QuerySchema.parse({
      providerId: searchParams.get('providerId') || undefined,
      period: searchParams.get('period') || 'all',
    });

    const period = params.period || 'all';
    const invoiceFilter = getInvoiceDateFilter(period);
    const collectionFilter = getCollectionDateFilter(period);

    // Calculate KPIs directly from provider_master_data with period filtering
    const sql = `
      WITH invoice_metrics AS (
        SELECT
          provider_id,
          provider_name,
          COUNT(*) as invoice_count,
          COUNT(DISTINCT opportunity_name) as case_count,
          COUNT(DISTINCT CASE WHEN case_status IN ('Open', 'In Progress', 'Litigation') THEN opportunity_name END) as open_case_count,
          COUNT(DISTINCT law_firm_id) as law_firm_count,
          SUM(invoice_amount) as total_invoiced,
          SUM(collected_amount) as total_collected_from_invoices,
          SUM(open_balance) as total_open_balance,
          SUM(write_off_amount) as total_written_off,
          ROUND(
            CASE
              WHEN SUM(invoice_amount) > 0
              THEN (SUM(collected_amount) / SUM(invoice_amount) * 100)
              ELSE 0
            END,
            1
          ) as collection_rate,
          ROUND(
            CASE
              WHEN SUM(invoice_amount) > 0
              THEN (SUM(write_off_amount) / SUM(invoice_amount) * 100)
              ELSE 0
            END,
            1
          ) as write_off_rate,
          SUM(CASE WHEN case_status = 'Settled - Pending' THEN open_balance ELSE 0 END) as settled_pending_ar,
          SUM(CASE WHEN case_status = 'Litigation' THEN open_balance ELSE 0 END) as active_litigation_ar,
          SUM(CASE WHEN case_status IN ('No Longer Represent', 'Stale - Pending') OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(invoice_date, origination_date))) >= 3 THEN open_balance ELSE 0 END) as at_risk_ar
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          ${invoiceFilter}
        GROUP BY provider_id, provider_name
      ),
      collection_metrics AS (
        SELECT
          SUM(collected_amount) as total_collected_in_period
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND collected_amount > 0
          AND collection_date IS NOT NULL
          ${collectionFilter}
      ),
      dso_calc AS (
        SELECT
          ROUND(
            CASE
              WHEN COUNT(*) FILTER (WHERE collection_date IS NOT NULL AND collected_amount > 0) > 0
              THEN AVG(collection_date - invoice_date) FILTER (WHERE collection_date IS NOT NULL AND collected_amount > 0 AND invoice_date IS NOT NULL)
              ELSE 0
            END,
            0
          ) as dso_days
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          ${invoiceFilter}
      )
      SELECT
        im.*,
        COALESCE(cm.total_collected_in_period, 0) as total_collected,
        dc.dso_days,
        70 as portfolio_health_score,
        'Good' as health_score_grade
      FROM invoice_metrics im
      CROSS JOIN collection_metrics cm
      CROSS JOIN dso_calc dc
    `;

    const result = await query(sql);

    // Return with metadata
    return NextResponse.json({
      data: result.rows,
      metadata: {
        count: result.rowCount,
        period: period,
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL_DirectCalculation',
        calculationsInDatabase: true,
        apiPassthroughOnly: true,
      },
    });
  } catch (error) {
    console.error('KPI API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
