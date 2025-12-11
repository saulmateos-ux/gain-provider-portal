import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Receivables Summary API
 * Returns KPI metrics for receivables dashboard
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Get traditional metrics
    const traditionalResult = await query(`
      SELECT
        -- Total open balance
        SUM(open_balance) as total_open,

        -- Count of invoices with open balance
        COUNT(*) FILTER (WHERE open_balance > 0) as open_invoice_count,

        -- Count of unique cases with open balance
        COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0) as open_case_count,

        -- Average days outstanding (for open invoices)
        ROUND(
          AVG(CURRENT_DATE - invoice_date) FILTER (WHERE open_balance > 0)::numeric,
          0
        ) as avg_days_outstanding,

        -- Total invoiced (for open invoices only)
        SUM(invoice_amount) FILTER (WHERE open_balance > 0) as total_invoiced_open,

        -- Weighted average days (by amount)
        ROUND(
          SUM((CURRENT_DATE - invoice_date) * open_balance) FILTER (WHERE open_balance > 0) /
          NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)::numeric,
          0
        ) as weighted_avg_days,

        -- Count by age brackets for quick reference
        COUNT(*) FILTER (WHERE open_balance > 0 AND CURRENT_DATE - invoice_date <= 90) as current_count,
        COUNT(*) FILTER (WHERE open_balance > 0 AND CURRENT_DATE - invoice_date > 90 AND CURRENT_DATE - invoice_date <= 180) as aging_count,
        COUNT(*) FILTER (WHERE open_balance > 0 AND CURRENT_DATE - invoice_date > 180) as past_due_count,

        -- Amount by age brackets
        SUM(open_balance) FILTER (WHERE CURRENT_DATE - invoice_date <= 90) as current_amount,
        SUM(open_balance) FILTER (WHERE CURRENT_DATE - invoice_date > 90 AND CURRENT_DATE - invoice_date <= 180) as aging_amount,
        SUM(open_balance) FILTER (WHERE CURRENT_DATE - invoice_date > 180) as past_due_amount

      FROM provider_master_data
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    // Get PI-specific metrics from materialized view
    const piMetricsResult = await query(`
      SELECT
        settled_pending_ar,
        settled_pending_cases,
        active_litigation_ar,
        active_litigation_cases,
        at_risk_ar,
        at_risk_cases
      FROM receivables_by_case_status_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    const data = traditionalResult.rows[0];
    const piData = piMetricsResult.rows[0] || {};

    return NextResponse.json({
      data: {
        // Traditional metrics (still useful for some contexts)
        totalOpen: parseFloat(data.total_open || 0),
        openInvoiceCount: parseInt(data.open_invoice_count || 0),
        openCaseCount: parseInt(data.open_case_count || 0),
        avgDaysOutstanding: parseInt(data.avg_days_outstanding || 0),
        weightedAvgDays: parseInt(data.weighted_avg_days || 0),
        totalInvoicedOpen: parseFloat(data.total_invoiced_open || 0),

        // Age distribution (traditional - less relevant for PI)
        currentCount: parseInt(data.current_count || 0),
        agingCount: parseInt(data.aging_count || 0),
        pastDueCount: parseInt(data.past_due_count || 0),
        currentAmount: parseFloat(data.current_amount || 0),
        agingAmount: parseFloat(data.aging_amount || 0),
        pastDueAmount: parseFloat(data.past_due_amount || 0),

        // PI-SPECIFIC METRICS (primary KPIs for PI receivables)
        settledPendingAR: parseFloat(piData.settled_pending_ar || 0),
        settledPendingCases: parseInt(piData.settled_pending_cases || 0),
        activeLitigationAR: parseFloat(piData.active_litigation_ar || 0),
        activeLitigationCases: parseInt(piData.active_litigation_cases || 0),
        atRiskAR: parseFloat(piData.at_risk_ar || 0),
        atRiskCases: parseInt(piData.at_risk_cases || 0),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
      },
    });
  } catch (error) {
    console.error('Receivables summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receivables summary' },
      { status: 500 }
    );
  }
}
