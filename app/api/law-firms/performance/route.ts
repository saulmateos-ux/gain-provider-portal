import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

/**
 * GET /api/law-firms/performance
 * Returns PI-specific performance metrics for all law firms
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT
        law_firm_id,
        law_firm_name,
        total_cases,
        total_invoiced,
        total_collected,
        total_open_ar,
        collection_rate,
        still_treating_cases,
        still_treating_ar,
        gathering_bills_cases,
        gathering_bills_ar,
        demand_sent_cases,
        demand_sent_ar,
        pending_cases,
        pending_ar,
        negotiation_cases,
        negotiation_ar,
        in_litigation_cases,
        in_litigation_ar,
        settled_pending_cases,
        settled_pending_ar,
        no_longer_represent_cases,
        no_longer_represent_ar,
        active_litigation_cases,
        active_litigation_ar,
        at_risk_cases,
        at_risk_ar,
        avg_case_age_days,
        avg_days_since_settlement,
        avg_days_to_collection,
        performance_grade
      FROM law_firm_pi_performance_mv
      ORDER BY total_open_ar DESC
    `);

    // Format data for frontend
    const lawFirms = result.rows.map((row: any, index: number) => ({
      // Generate unique ID if law_firm_id is null (use slugified name or index as fallback)
      lawFirmId: row.law_firm_id || `lf-${(row.law_firm_name || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${index}`,
      lawFirmName: row.law_firm_name,

      // Portfolio Metrics
      totalCases: parseInt(row.total_cases || 0),
      totalInvoiced: parseFloat(row.total_invoiced || 0),
      totalCollected: parseFloat(row.total_collected || 0),
      totalOpenAR: parseFloat(row.total_open_ar || 0),
      collectionRate: parseFloat(row.collection_rate || 0),

      // Case Status Breakdown
      caseStatusBreakdown: {
        stillTreating: {
          cases: parseInt(row.still_treating_cases || 0),
          ar: parseFloat(row.still_treating_ar || 0),
        },
        gatheringBills: {
          cases: parseInt(row.gathering_bills_cases || 0),
          ar: parseFloat(row.gathering_bills_ar || 0),
        },
        demandSent: {
          cases: parseInt(row.demand_sent_cases || 0),
          ar: parseFloat(row.demand_sent_ar || 0),
        },
        pending: {
          cases: parseInt(row.pending_cases || 0),
          ar: parseFloat(row.pending_ar || 0),
        },
        negotiation: {
          cases: parseInt(row.negotiation_cases || 0),
          ar: parseFloat(row.negotiation_ar || 0),
        },
        inLitigation: {
          cases: parseInt(row.in_litigation_cases || 0),
          ar: parseFloat(row.in_litigation_ar || 0),
        },
        settledPending: {
          cases: parseInt(row.settled_pending_cases || 0),
          ar: parseFloat(row.settled_pending_ar || 0),
        },
        noLongerRepresent: {
          cases: parseInt(row.no_longer_represent_cases || 0),
          ar: parseFloat(row.no_longer_represent_ar || 0),
        },
      },

      // Aggregates
      activeLitigationCases: parseInt(row.active_litigation_cases || 0),
      activeLitigationAR: parseFloat(row.active_litigation_ar || 0),
      atRiskCases: parseInt(row.at_risk_cases || 0),
      atRiskAR: parseFloat(row.at_risk_ar || 0),

      // Timing Metrics
      avgCaseAgeDays: parseFloat(row.avg_case_age_days || 0),
      avgDaysSinceSettlement: parseFloat(row.avg_days_since_settlement || 0),
      avgDaysToCollection: parseFloat(row.avg_days_to_collection || 0),

      // Performance Grade
      performanceGrade: row.performance_grade || 'N/A',
    }));

    return NextResponse.json({
      data: lawFirms,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'law_firm_pi_performance_mv',
        calculationsInDatabase: true,
        totalLawFirms: lawFirms.length,
      },
    });
  } catch (error) {
    console.error('Error fetching law firm performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch law firm performance data' },
      { status: 500 }
    );
  }
}
