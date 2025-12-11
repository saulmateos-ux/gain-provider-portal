import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Settled Pending Cases API
 * Returns cases that have SETTLED but payment not yet disbursed
 * This is money you've already WON - unique to PI receivables!
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await query(`
      SELECT
        case_name,
        patient_name,
        law_firm_name,
        attorney_name,
        open_balance,
        total_invoiced,
        invoice_count,
        settlement_date,
        days_since_settlement,
        payoff_status,
        date_of_accident,
        origination_date,
        tranche_name,
        ar_book_name,
        location_name,
        state

      FROM settled_pending_detail_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
      ORDER BY open_balance DESC
      LIMIT $1
    `, [limit]);

    // Calculate summary statistics
    const summaryResult = await query(`
      SELECT
        COUNT(*) as total_cases,
        SUM(open_balance) as total_ar,
        SUM(invoice_count) as total_invoices,
        AVG(days_since_settlement) as avg_days_since_settlement,
        MIN(days_since_settlement) as min_days_since_settlement,
        MAX(days_since_settlement) as max_days_since_settlement,

        -- Count by payoff status
        COUNT(*) FILTER (WHERE payoff_status LIKE '%Cap%') as cap_count,
        COUNT(*) FILTER (WHERE payoff_status LIKE '%Reduction%') as reduction_count,
        COUNT(*) FILTER (WHERE payoff_status IS NULL OR payoff_status = '') as unknown_status_count,

        -- AR by payoff status
        SUM(open_balance) FILTER (WHERE payoff_status LIKE '%Cap%') as cap_ar,
        SUM(open_balance) FILTER (WHERE payoff_status LIKE '%Reduction%') as reduction_ar

      FROM settled_pending_detail_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    const summary = summaryResult.rows[0];

    return NextResponse.json({
      data: {
        cases: result.rows.map(row => ({
          caseName: row.case_name,
          patientName: row.patient_name,
          lawFirm: row.law_firm_name,
          attorney: row.attorney_name,
          openBalance: parseFloat(row.open_balance || 0),
          totalInvoiced: parseFloat(row.total_invoiced || 0),
          invoiceCount: parseInt(row.invoice_count || 0),
          settlementDate: row.settlement_date,
          daysSinceSettlement: parseInt(row.days_since_settlement || 0),
          payoffStatus: row.payoff_status || 'Unknown',
          dateOfAccident: row.date_of_accident,
          originationDate: row.origination_date,
          trancheName: row.tranche_name,
          arBookName: row.ar_book_name,
          locationName: row.location_name,
          state: row.state,
        })),

        summary: {
          totalCases: parseInt(summary.total_cases || 0),
          totalAR: parseFloat(summary.total_ar || 0),
          totalInvoices: parseInt(summary.total_invoices || 0),
          avgDaysSinceSettlement: Math.round(parseFloat(summary.avg_days_since_settlement || 0)),
          minDaysSinceSettlement: parseInt(summary.min_days_since_settlement || 0),
          maxDaysSinceSettlement: parseInt(summary.max_days_since_settlement || 0),

          byPayoffStatus: {
            cap: {
              count: parseInt(summary.cap_count || 0),
              ar: parseFloat(summary.cap_ar || 0),
            },
            reduction: {
              count: parseInt(summary.reduction_count || 0),
              ar: parseFloat(summary.reduction_ar || 0),
            },
            unknown: {
              count: parseInt(summary.unknown_status_count || 0),
              ar: parseFloat(summary.total_ar || 0) - parseFloat(summary.cap_ar || 0) - parseFloat(summary.reduction_ar || 0),
            },
          },
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'settled_pending_detail_mv',
        calculationsInDatabase: true,
        apiPassthroughOnly: true,
      },
    });
  } catch (error) {
    console.error('Settled pending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settled pending cases' },
      { status: 500 }
    );
  }
}
