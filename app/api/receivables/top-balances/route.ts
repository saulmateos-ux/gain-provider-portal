import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Top Open Balances API
 * Returns the largest outstanding receivables
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const groupBy = searchParams.get('groupBy') || 'case'; // case, law_firm, patient

    let queryStr = '';

    if (groupBy === 'law_firm') {
      queryStr = `
        SELECT
          COALESCE(law_firm_name, 'Unknown') as name,
          'law_firm' as type,
          COUNT(*) as invoice_count,
          COUNT(DISTINCT opportunity_name) as case_count,
          SUM(open_balance) as total_open,
          SUM(invoice_amount) as total_invoiced,
          MIN(invoice_date) as oldest_invoice,
          ROUND(AVG(CURRENT_DATE - invoice_date)::numeric, 0) as avg_days_old
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND open_balance > 0
        GROUP BY law_firm_name
        ORDER BY total_open DESC
        LIMIT $1
      `;
    } else if (groupBy === 'patient') {
      queryStr = `
        SELECT
          COALESCE(patient_name, 'Unknown') as name,
          'patient' as type,
          COUNT(*) as invoice_count,
          COUNT(DISTINCT opportunity_name) as case_count,
          SUM(open_balance) as total_open,
          SUM(invoice_amount) as total_invoiced,
          MIN(invoice_date) as oldest_invoice,
          ROUND(AVG(CURRENT_DATE - invoice_date)::numeric, 0) as avg_days_old
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND open_balance > 0
        GROUP BY patient_name
        ORDER BY total_open DESC
        LIMIT $1
      `;
    } else {
      // Default: group by case (opportunity)
      queryStr = `
        SELECT
          COALESCE(opportunity_name, 'Unknown') as name,
          'case' as type,
          patient_name,
          law_firm_name,
          COUNT(*) as invoice_count,
          SUM(open_balance) as total_open,
          SUM(invoice_amount) as total_invoiced,
          MIN(invoice_date) as oldest_invoice,
          ROUND(AVG(CURRENT_DATE - invoice_date)::numeric, 0) as avg_days_old,
          case_status
        FROM provider_master_data
        WHERE provider_name = 'Therapy Partners Group - Parent'
          AND open_balance > 0
        GROUP BY opportunity_name, patient_name, law_firm_name, case_status
        ORDER BY total_open DESC
        LIMIT $1
      `;
    }

    const result = await query(queryStr, [limit]);

    return NextResponse.json({
      data: result.rows.map((row, index) => ({
        rank: index + 1,
        name: row.name,
        type: row.type,
        patientName: row.patient_name || null,
        lawFirmName: row.law_firm_name || null,
        caseStatus: row.case_status || null,
        invoiceCount: parseInt(row.invoice_count),
        caseCount: row.case_count ? parseInt(row.case_count) : 1,
        totalOpen: parseFloat(row.total_open),
        totalInvoiced: parseFloat(row.total_invoiced),
        oldestInvoice: row.oldest_invoice,
        avgDaysOld: parseInt(row.avg_days_old || 0),
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
        groupedBy: groupBy,
      },
    });
  } catch (error) {
    console.error('Top balances API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top balances' },
      { status: 500 }
    );
  }
}
