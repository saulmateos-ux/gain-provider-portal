import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

// Color mapping for case status categories (consistent with receivables)
const STAGE_COLORS: Record<string, string> = {
  won: '#10B981', // green - Settled - Not Yet Disbursed
  active: '#3B82F6', // blue - In Litigation, Negotiation, Demand Sent
  early: '#FBBF24', // yellow - Still Treating, Gathering Bills
  ambiguous: '#F59E0B', // amber - Pending
  at_risk: '#EF4444', // red - No Longer Represent
  other: '#6B7280', // gray - other statuses
};

/**
 * GET /api/law-firms/pipeline
 * Returns case pipeline composition by law firm
 * Query params:
 *   - lawFirmId: specific law firm (optional, if omitted returns all firms)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lawFirmId = searchParams.get('lawFirmId');

    let sql = `
      SELECT
        law_firm_id,
        law_firm_name,
        case_status,
        case_count,
        open_ar,
        total_invoiced,
        avg_case_age_days,
        avg_ar_per_case,
        pct_of_firm_cases,
        pct_of_firm_ar,
        stage_category
      FROM law_firm_case_pipeline_mv
    `;

    if (lawFirmId) {
      sql += ` WHERE law_firm_id = $1`;
    }

    sql += ` ORDER BY law_firm_id, open_ar DESC`;

    const result = lawFirmId
      ? await query(sql, [lawFirmId])
      : await query(sql);

    // Format data for frontend with color coding
    const pipelineData = result.rows.map((row: any) => ({
      lawFirmId: row.law_firm_id,
      lawFirmName: row.law_firm_name,
      caseStatus: row.case_status,

      // Metrics
      caseCount: parseInt(row.case_count || 0),
      openAR: parseFloat(row.open_ar || 0),
      totalInvoiced: parseFloat(row.total_invoiced || 0),
      avgCaseAgeDays: parseFloat(row.avg_case_age_days || 0),
      avgARPerCase: parseFloat(row.avg_ar_per_case || 0),

      // Percentages
      pctOfFirmCases: parseFloat(row.pct_of_firm_cases || 0),
      pctOfFirmAR: parseFloat(row.pct_of_firm_ar || 0),

      // Color coding
      stageCategory: row.stage_category,
      color: STAGE_COLORS[row.stage_category] || STAGE_COLORS.other,
    }));

    // Group by law firm if returning multiple firms
    if (!lawFirmId) {
      const firmMap = new Map();
      pipelineData.forEach((stage: any) => {
        if (!firmMap.has(stage.lawFirmId)) {
          firmMap.set(stage.lawFirmId, {
            lawFirmId: stage.lawFirmId,
            lawFirmName: stage.lawFirmName,
            stages: [],
          });
        }
        firmMap.get(stage.lawFirmId).stages.push(stage);
      });

      const groupedData = Array.from(firmMap.values());

      return NextResponse.json({
        data: groupedData,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'law_firm_case_pipeline_mv',
          calculationsInDatabase: true,
          totalLawFirms: groupedData.length,
        },
      });
    }

    // Single law firm - return stages array directly
    return NextResponse.json({
      data: {
        lawFirmId: pipelineData[0]?.lawFirmId,
        lawFirmName: pipelineData[0]?.lawFirmName,
        stages: pipelineData,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'law_firm_case_pipeline_mv',
        calculationsInDatabase: true,
        lawFirmId,
      },
    });
  } catch (error) {
    console.error('Error fetching law firm pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch law firm pipeline data' },
      { status: 500 }
    );
  }
}
