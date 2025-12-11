import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Collections Summary API
 * Returns KPI metrics for collections dashboard
 */

export const revalidate = 60;

function getCollectionDateFilter(period: string): string {
  // Filter for cases that were COLLECTED within the period
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
    const collectionDateFilter = getCollectionDateFilter(period);

    // Get collection metrics for cases COLLECTED within the period
    // Plus overall portfolio metrics for context
    const result = await query(`
      WITH collected_in_period AS (
        -- Cases that were collected within the selected period
        SELECT
          SUM(collected_amount) as period_collected,
          SUM(invoice_amount) as period_invoiced,
          COUNT(*) as period_cases,
          COUNT(*) FILTER (WHERE collected_amount >= invoice_amount AND invoice_amount > 0) as fully_collected,
          ROUND(
            AVG(
              CASE
                WHEN invoice_date IS NOT NULL
                THEN (collection_date - invoice_date)
                ELSE NULL
              END
            ),
            1
          ) as avg_days_to_collect
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND collection_date IS NOT NULL
          AND ${collectionDateFilter}
      ),
      total_portfolio AS (
        -- Overall portfolio metrics (for context)
        SELECT
          SUM(invoice_amount) as total_invoiced,
          SUM(collected_amount) as total_collected,
          SUM(open_balance) as total_open_balance,
          SUM(write_off_amount) as total_write_offs,
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE collected_amount > 0) as invoices_with_collections,
          COUNT(*) FILTER (WHERE write_off_amount > 0) as write_off_count
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
      )
      SELECT
        -- Collections in this period
        COALESCE(cip.period_collected, 0) as total_collected,
        COALESCE(cip.period_invoiced, 0) as total_invoiced,
        -- Collection rate for cases collected in this period
        ROUND(
          CASE
            WHEN COALESCE(cip.period_invoiced, 0) > 0
            THEN (COALESCE(cip.period_collected, 0) / cip.period_invoiced * 100)
            ELSE 0
          END,
          2
        ) as collection_rate,
        -- Open balance from total portfolio
        tp.total_open_balance,
        -- Invoice counts
        COALESCE(cip.period_cases, 0) as invoices_with_collections,
        tp.total_invoices,
        COALESCE(cip.fully_collected, 0) as fully_collected_invoices,
        COALESCE(cip.avg_days_to_collect, 0) as avg_days_to_collect,
        -- Write-offs from total portfolio
        tp.total_write_offs,
        tp.write_off_count
      FROM collected_in_period cip
      CROSS JOIN total_portfolio tp
    `);

    const data = result.rows[0];

    // Get portfolio totals for the waterfall (must be consistent data context)
    const portfolioResult = await query(`
      SELECT
        SUM(invoice_amount) as gross_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as open_balance,
        SUM(write_off_amount) as write_offs
      FROM provider_master_data
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    const portfolio = portfolioResult.rows[0];

    return NextResponse.json({
      data: {
        // Period-based metrics (for KPIs and trends)
        totalCollected: parseFloat(data.total_collected || 0),
        totalInvoiced: parseFloat(data.total_invoiced || 0),
        collectionRate: parseFloat(data.collection_rate || 0),
        totalOpenBalance: parseFloat(data.total_open_balance || 0),
        totalInvoices: parseInt(data.total_invoices || 0),
        invoicesWithCollections: parseInt(data.invoices_with_collections || 0),
        fullyCollectedInvoices: parseInt(data.fully_collected_invoices || 0),
        avgDaysToCollect: parseFloat(data.avg_days_to_collect || 0),
        totalWriteOffs: parseFloat(data.total_write_offs || 0),
        writeOffCount: parseInt(data.write_off_count || 0),
        // Portfolio totals for waterfall (consistent data context)
        portfolioGrossInvoiced: parseFloat(portfolio.gross_invoiced || 0),
        portfolioCollected: parseFloat(portfolio.total_collected || 0),
        portfolioOpenBalance: parseFloat(portfolio.open_balance || 0),
        portfolioWriteOffs: parseFloat(portfolio.write_offs || 0),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
      },
    });
  } catch (error) {
    console.error('Collections summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections summary' },
      { status: 500 }
    );
  }
}
