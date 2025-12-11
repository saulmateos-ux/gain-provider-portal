import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Invoice Ingestions API
 * Returns monthly invoice ingestion data (new invoices created per month)
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Get monthly ingestions for the last 24 months
    const result = await query(`
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') as month,
        TO_CHAR(invoice_date, 'Mon YYYY') as month_label,
        COUNT(*) as invoice_count,
        COUNT(DISTINCT opportunity_name) as case_count,
        COALESCE(SUM(invoice_amount), 0) as total_invoiced,
        COALESCE(ROUND(AVG(invoice_amount)::numeric, 2), 0) as avg_invoice_amount
      FROM provider_master_data
      WHERE
        provider_name = 'Therapy Partners Group - Parent'
        AND invoice_date IS NOT NULL
        AND invoice_date >= CURRENT_DATE - INTERVAL '24 months'
      GROUP BY
        TO_CHAR(invoice_date, 'YYYY-MM'),
        TO_CHAR(invoice_date, 'Mon YYYY')
      ORDER BY TO_CHAR(invoice_date, 'YYYY-MM') ASC
    `);

    // Get summary stats (simplified query)
    const summaryResult = await query(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(DISTINCT opportunity_name) as total_cases,
        COALESCE(SUM(invoice_amount), 0) as total_invoiced,
        COALESCE(ROUND(AVG(invoice_amount)::numeric, 2), 0) as avg_invoice_amount
      FROM provider_master_data
      WHERE
        provider_name = 'Therapy Partners Group - Parent'
        AND invoice_date IS NOT NULL
        AND invoice_date >= CURRENT_DATE - INTERVAL '24 months'
    `);

    // Calculate average monthly ingestion
    const monthlyData = result.rows;
    const avgMonthly = monthlyData.length > 0
      ? Math.round(monthlyData.reduce((sum, row) => sum + parseInt(row.invoice_count), 0) / monthlyData.length)
      : 0;

    const summary = summaryResult.rows[0] || {};

    return NextResponse.json({
      data: {
        monthly: monthlyData.map(row => ({
          month: row.month,
          monthLabel: row.month_label,
          invoiceCount: parseInt(row.invoice_count),
          caseCount: parseInt(row.case_count),
          totalInvoiced: parseFloat(row.total_invoiced),
          avgInvoiceAmount: parseFloat(row.avg_invoice_amount),
        })),
        summary: {
          totalInvoices: parseInt(summary.total_invoices || 0),
          totalCases: parseInt(summary.total_cases || 0),
          totalInvoiced: parseFloat(summary.total_invoiced || 0),
          avgInvoiceAmount: parseFloat(summary.avg_invoice_amount || 0),
          avgMonthlyIngestion: avgMonthly,
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'PostgreSQL',
        calculationsInDatabase: true,
        periodMonths: 24,
      },
    });
  } catch (error) {
    console.error('Invoice ingestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice ingestions' },
      { status: 500 }
    );
  }
}
