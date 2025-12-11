import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Receivables by Case Status API
 * Returns open AR grouped by litigation stage (PI-specific)
 */

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT
        provider_name,

        -- Still Treating
        COALESCE(still_treating_ar, 0) as still_treating_ar,
        COALESCE(still_treating_cases, 0) as still_treating_cases,
        COALESCE(still_treating_invoices, 0) as still_treating_invoices,

        -- Gathering Bills
        COALESCE(gathering_bills_ar, 0) as gathering_bills_ar,
        COALESCE(gathering_bills_cases, 0) as gathering_bills_cases,
        COALESCE(gathering_bills_invoices, 0) as gathering_bills_invoices,

        -- Demand Sent
        COALESCE(demand_sent_ar, 0) as demand_sent_ar,
        COALESCE(demand_sent_cases, 0) as demand_sent_cases,
        COALESCE(demand_sent_invoices, 0) as demand_sent_invoices,

        -- Pending
        COALESCE(pending_ar, 0) as pending_ar,
        COALESCE(pending_cases, 0) as pending_cases,
        COALESCE(pending_invoices, 0) as pending_invoices,

        -- Negotiation
        COALESCE(negotiation_ar, 0) as negotiation_ar,
        COALESCE(negotiation_cases, 0) as negotiation_cases,
        COALESCE(negotiation_invoices, 0) as negotiation_invoices,

        -- In Litigation
        COALESCE(in_litigation_ar, 0) as in_litigation_ar,
        COALESCE(in_litigation_cases, 0) as in_litigation_cases,
        COALESCE(in_litigation_invoices, 0) as in_litigation_invoices,

        -- Settled - Not Yet Disbursed (MONEY WON!)
        COALESCE(settled_pending_ar, 0) as settled_pending_ar,
        COALESCE(settled_pending_cases, 0) as settled_pending_cases,
        COALESCE(settled_pending_invoices, 0) as settled_pending_invoices,

        -- No Longer Represent (AT RISK)
        COALESCE(no_longer_represent_ar, 0) as no_longer_represent_ar,
        COALESCE(no_longer_represent_cases, 0) as no_longer_represent_cases,
        COALESCE(no_longer_represent_invoices, 0) as no_longer_represent_invoices,

        -- Aggregates
        COALESCE(total_open_ar, 0) as total_open_ar,
        COALESCE(total_open_cases, 0) as total_open_cases,
        COALESCE(active_litigation_ar, 0) as active_litigation_ar,
        COALESCE(active_litigation_cases, 0) as active_litigation_cases,
        COALESCE(at_risk_ar, 0) as at_risk_ar,
        COALESCE(at_risk_cases, 0) as at_risk_cases,

        calculated_at

      FROM receivables_by_case_status_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({
        data: null,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'PostgreSQL_MaterializedView',
          calculationsInDatabase: true,
        },
      });
    }

    const data = result.rows[0];

    // Calculate percentages
    const total = parseFloat(data.total_open_ar || 0);

    return NextResponse.json({
      data: {
        // Case statuses with percentages
        stages: [
          {
            name: 'Still Treating',
            ar: parseFloat(data.still_treating_ar || 0),
            cases: parseInt(data.still_treating_cases || 0),
            invoices: parseInt(data.still_treating_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.still_treating_ar || 0) / total * 100) : 0,
            color: '#FCD34D', // yellow
            category: 'early_stage',
          },
          {
            name: 'Gathering Bills',
            ar: parseFloat(data.gathering_bills_ar || 0),
            cases: parseInt(data.gathering_bills_cases || 0),
            invoices: parseInt(data.gathering_bills_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.gathering_bills_ar || 0) / total * 100) : 0,
            color: '#FCD34D', // yellow
            category: 'early_stage',
          },
          {
            name: 'Demand Sent',
            ar: parseFloat(data.demand_sent_ar || 0),
            cases: parseInt(data.demand_sent_cases || 0),
            invoices: parseInt(data.demand_sent_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.demand_sent_ar || 0) / total * 100) : 0,
            color: '#60A5FA', // blue
            category: 'active',
          },
          {
            name: 'Negotiation',
            ar: parseFloat(data.negotiation_ar || 0),
            cases: parseInt(data.negotiation_cases || 0),
            invoices: parseInt(data.negotiation_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.negotiation_ar || 0) / total * 100) : 0,
            color: '#60A5FA', // blue
            category: 'active',
          },
          {
            name: 'In Litigation',
            ar: parseFloat(data.in_litigation_ar || 0),
            cases: parseInt(data.in_litigation_cases || 0),
            invoices: parseInt(data.in_litigation_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.in_litigation_ar || 0) / total * 100) : 0,
            color: '#60A5FA', // blue
            category: 'active',
          },
          {
            name: 'Settled - Awaiting Payment',
            ar: parseFloat(data.settled_pending_ar || 0),
            cases: parseInt(data.settled_pending_cases || 0),
            invoices: parseInt(data.settled_pending_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.settled_pending_ar || 0) / total * 100) : 0,
            color: '#10B981', // green - money won!
            category: 'won',
          },
          {
            name: 'Pending',
            ar: parseFloat(data.pending_ar || 0),
            cases: parseInt(data.pending_cases || 0),
            invoices: parseInt(data.pending_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.pending_ar || 0) / total * 100) : 0,
            color: '#F59E0B', // amber - ambiguous
            category: 'at_risk',
          },
          {
            name: 'No Longer Represent',
            ar: parseFloat(data.no_longer_represent_ar || 0),
            cases: parseInt(data.no_longer_represent_cases || 0),
            invoices: parseInt(data.no_longer_represent_invoices || 0),
            percentage: total > 0 ? (parseFloat(data.no_longer_represent_ar || 0) / total * 100) : 0,
            color: '#EF4444', // red - at risk
            category: 'at_risk',
          },
        ],

        // Aggregates
        totals: {
          total_open_ar: parseFloat(data.total_open_ar || 0),
          total_open_cases: parseInt(data.total_open_cases || 0),
          active_litigation_ar: parseFloat(data.active_litigation_ar || 0),
          active_litigation_cases: parseInt(data.active_litigation_cases || 0),
          at_risk_ar: parseFloat(data.at_risk_ar || 0),
          at_risk_cases: parseInt(data.at_risk_cases || 0),
          settled_pending_ar: parseFloat(data.settled_pending_ar || 0),
          settled_pending_cases: parseInt(data.settled_pending_cases || 0),
        },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'receivables_by_case_status_mv',
        calculationsInDatabase: true,
        apiPassthroughOnly: true,
      },
    });
  } catch (error) {
    console.error('Receivables by case status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receivables by case status' },
      { status: 500 }
    );
  }
}
