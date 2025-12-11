import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * At-Risk AR API
 * Returns cases at high risk of not paying (write-off candidates)
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const riskCategory = searchParams.get('category'); // filter by specific risk category

    let categoryFilter = '';
    if (riskCategory) {
      categoryFilter = `AND risk_category = $2`;
    }

    const result = await query(`
      SELECT
        case_name,
        patient_name,
        law_firm_name,
        attorney_name,
        case_status,
        risk_category,
        open_balance,
        total_invoiced,
        write_off_amount,
        invoice_count,
        oldest_invoice_date,
        days_since_oldest_invoice,
        origination_date,
        days_since_origination,
        has_write_off,
        write_off_reason,
        payoff_status,
        location_name,
        state,
        tranche_name

      FROM at_risk_ar_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
      ${categoryFilter}
      ORDER BY open_balance DESC
      LIMIT $1
    `, riskCategory ? [limit, riskCategory] : [limit]);

    // Calculate summary by risk category
    const summaryResult = await query(`
      SELECT
        risk_category,
        COUNT(*) as case_count,
        SUM(open_balance) as total_ar,
        SUM(invoice_count) as invoice_count,
        AVG(days_since_origination) as avg_age_days,
        SUM(write_off_amount) as total_write_offs

      FROM at_risk_ar_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
      GROUP BY risk_category
      ORDER BY total_ar DESC
    `);

    return NextResponse.json({
      data: {
        cases: result.rows.map(row => ({
          caseName: row.case_name,
          patientName: row.patient_name,
          lawFirm: row.law_firm_name,
          attorney: row.attorney_name,
          caseStatus: row.case_status,
          riskCategory: row.risk_category,
          openBalance: parseFloat(row.open_balance || 0),
          totalInvoiced: parseFloat(row.total_invoiced || 0),
          writeOffAmount: parseFloat(row.write_off_amount || 0),
          invoiceCount: parseInt(row.invoice_count || 0),
          oldestInvoiceDate: row.oldest_invoice_date,
          daysSinceOldestInvoice: parseInt(row.days_since_oldest_invoice || 0),
          originationDate: row.origination_date,
          daysSinceOrigination: parseInt(row.days_since_origination || 0),
          hasWriteOff: row.has_write_off,
          writeOffReason: row.write_off_reason,
          payoffStatus: row.payoff_status,
          locationName: row.location_name,
          state: row.state,
          trancheName: row.tranche_name,
        })),

        summary: summaryResult.rows.map(row => ({
          riskCategory: row.risk_category,
          caseCount: parseInt(row.case_count || 0),
          totalAR: parseFloat(row.total_ar || 0),
          invoiceCount: parseInt(row.invoice_count || 0),
          avgAgeDays: Math.round(parseFloat(row.avg_age_days || 0)),
          totalWriteOffs: parseFloat(row.total_write_offs || 0),
        })),

        totals: {
          totalCases: result.rows.length,
          totalAR: result.rows.reduce((sum, row) => sum + parseFloat(row.open_balance || 0), 0),
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'at_risk_ar_mv',
        calculationsInDatabase: true,
        apiPassthroughOnly: true,
      },
    });
  } catch (error) {
    console.error('At-risk AR API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch at-risk AR' },
      { status: 500 }
    );
  }
}
