import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

/**
 * GET /api/law-firms/risk
 * Returns risk analysis for law firms
 * Query params:
 *   - lawFirmId: specific law firm (optional)
 *   - minRiskScore: minimum risk score to filter (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lawFirmId = searchParams.get('lawFirmId');
    const minRiskScore = searchParams.get('minRiskScore');

    let sql = `
      SELECT
        law_firm_id,
        law_firm_name,
        no_longer_represent_cases,
        no_longer_represent_ar,
        stale_pending_cases,
        stale_pending_ar,
        very_old_cases,
        very_old_ar,
        total_at_risk_cases,
        total_at_risk_ar,
        at_risk_pct,
        delayed_disbursement_cases,
        delayed_disbursement_ar,
        avg_disbursement_delay_days,
        risk_score,
        risk_level
      FROM law_firm_risk_analysis_mv
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (lawFirmId) {
      sql += ` AND law_firm_id = $${paramIndex}`;
      params.push(lawFirmId);
      paramIndex++;
    }

    if (minRiskScore) {
      sql += ` AND risk_score >= $${paramIndex}`;
      params.push(parseFloat(minRiskScore));
      paramIndex++;
    }

    sql += ` ORDER BY risk_score DESC`;

    const result = params.length > 0 ? await query(sql, params) : await query(sql);

    // Format data for frontend
    const riskData = result.rows.map((row: any, index: number) => ({
      // Generate unique ID if law_firm_id is null (use slugified name or index as fallback)
      lawFirmId: row.law_firm_id || `lf-${(row.law_firm_name || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${index}`,
      lawFirmName: row.law_firm_name,

      // At-Risk Breakdown
      noLongerRepresent: {
        cases: parseInt(row.no_longer_represent_cases || 0),
        ar: parseFloat(row.no_longer_represent_ar || 0),
      },
      stalePending: {
        cases: parseInt(row.stale_pending_cases || 0),
        ar: parseFloat(row.stale_pending_ar || 0),
      },
      veryOld: {
        cases: parseInt(row.very_old_cases || 0),
        ar: parseFloat(row.very_old_ar || 0),
      },

      // Total At-Risk
      totalAtRiskCases: parseInt(row.total_at_risk_cases || 0),
      totalAtRiskAR: parseFloat(row.total_at_risk_ar || 0),
      atRiskPct: parseFloat(row.at_risk_pct || 0),

      // Disbursement Issues
      delayedDisbursementCases: parseInt(row.delayed_disbursement_cases || 0),
      delayedDisbursementAR: parseFloat(row.delayed_disbursement_ar || 0),
      avgDisbursementDelayDays: parseFloat(row.avg_disbursement_delay_days || 0),

      // Risk Score and Level
      riskScore: parseFloat(row.risk_score || 0),
      riskLevel: row.risk_level || 'Low',

      // Color coding based on risk level
      color:
        row.risk_level === 'Critical'
          ? '#DC2626' // red-600
          : row.risk_level === 'High'
          ? '#F59E0B' // amber-500
          : row.risk_level === 'Medium'
          ? '#FBBF24' // yellow-400
          : '#10B981', // green-500
    }));

    return NextResponse.json({
      data: riskData,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'law_firm_risk_analysis_mv',
        calculationsInDatabase: true,
        totalFirms: riskData.length,
        filters: {
          lawFirmId: lawFirmId || 'all',
          minRiskScore: minRiskScore || 'none',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching law firm risk data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch law firm risk data' },
      { status: 500 }
    );
  }
}
