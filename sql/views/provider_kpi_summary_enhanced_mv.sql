/**
 * Enhanced Provider KPI Summary Materialized View
 *
 * Includes NEW Portfolio Health Score (0-100) composite metric
 *
 * Pre-computed dashboard KPIs including:
 * - Portfolio Health Score (weighted composite)
 * - Total invoiced, collected, written off, open balance
 * - Collection rate (weighted average)
 * - DSO (Days Sales Outstanding)
 * - At-Risk AR, Settled Pending AR, Active Litigation AR
 * - Invoice and case counts
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 * Frontend ONLY displays these pre-calculated values
 */

DROP MATERIALIZED VIEW IF EXISTS provider_kpi_summary_enhanced_mv CASCADE;

CREATE MATERIALIZED VIEW provider_kpi_summary_enhanced_mv AS
WITH base_metrics AS (
  SELECT
    provider_id,
    provider_name,

    -- Financial Metrics (RULE #4: Standardized field names)
    SUM(invoice_amount) AS total_invoiced,
    SUM(collected_amount) AS total_collected,
    SUM(write_off_amount) AS total_written_off,
    SUM(open_balance) AS total_open_balance,

    -- Counts
    COUNT(*) AS invoice_count,
    COUNT(DISTINCT opportunity_name) AS case_count,
    COUNT(DISTINCT law_firm_id) FILTER (WHERE law_firm_id IS NOT NULL) AS law_firm_count,

    -- Collection Rate = Collected / Invoice Amount (only for transactions with deposits)
    CASE
      WHEN SUM(invoice_amount) FILTER (WHERE collected_amount > 0) > 0 THEN
        (SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
         SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) * 100
      ELSE 0
    END AS collection_rate,

    -- Write-off Rate
    CASE
      WHEN SUM(invoice_amount) > 0 THEN
        (SUM(write_off_amount)::DECIMAL / SUM(invoice_amount)::DECIMAL) * 100
      ELSE 0
    END AS write_off_rate,

    -- DSO Calculation (Days Sales Outstanding)
    CASE
      WHEN SUM(invoice_amount) > 0 THEN
        (SUM(open_balance)::DECIMAL / (SUM(invoice_amount)::DECIMAL / 365))
      ELSE 0
    END AS dso_days,

    -- Average Invoice Amount
    AVG(invoice_amount) AS avg_invoice_amount,

    -- Open Cases (cases with open balance > 0)
    COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0) AS open_case_count,

    -- NEW: At-Risk AR (cases in high-risk categories)
    SUM(open_balance) FILTER (
      WHERE open_balance > 0 AND (
        case_status = 'No Longer Represent' OR
        (case_status = 'Pending' AND CURRENT_DATE - invoice_date > 540) OR  -- 18 months = 540 days
        (CURRENT_DATE - invoice_date > 1095)  -- 36 months = 1095 days
      )
    ) AS at_risk_ar,

    -- NEW: Settled Pending AR (settled but not yet disbursed)
    SUM(open_balance) FILTER (
      WHERE open_balance > 0 AND
      case_status = 'Settled - Not Yet Disbursed'
    ) AS settled_pending_ar,

    -- NEW: Active Litigation AR
    SUM(open_balance) FILTER (
      WHERE open_balance > 0 AND
      case_status IN ('In Litigation', 'Negotiation')
    ) AS active_litigation_ar,

    -- Aging Metrics for Health Score
    SUM(open_balance) FILTER (
      WHERE open_balance > 0 AND
      CURRENT_DATE - invoice_date <= 90
    ) AS current_ar_0_90,

    COUNT(DISTINCT opportunity_name) FILTER (
      WHERE open_balance > 0 AND
      CURRENT_DATE - invoice_date > 180
    ) AS high_risk_case_count

  FROM provider_master_data
  GROUP BY provider_id, provider_name
),
health_scores AS (
  SELECT
    *,

    -- Component Scores (0-100 each)

    -- 1. Collection Rate Score (40% weight)
    -- 70%+ = 100, 40%- = 0
    LEAST(100, GREATEST(0, (collection_rate - 40) / 30 * 100)) AS collection_rate_score,

    -- 2. DSO Score (30% weight)
    -- 60 days = 100, 120+ days = 0
    LEAST(100, GREATEST(0, (120 - dso_days) / 60 * 100)) AS dso_score,

    -- 3. Aging Score (20% weight)
    -- 80%+ current (0-90 days) = 100, 50%- current = 0
    CASE
      WHEN total_open_balance > 0 THEN
        LEAST(100, GREATEST(0,
          ((current_ar_0_90 / total_open_balance * 100) - 50) / 30 * 100
        ))
      ELSE 0
    END AS aging_score,

    -- 4. Risk Score (10% weight)
    -- 5%- at-risk = 100, 20%+ at-risk = 0
    CASE
      WHEN total_open_balance > 0 THEN
        LEAST(100, GREATEST(0,
          (20 - (COALESCE(at_risk_ar, 0) / total_open_balance * 100)) / 15 * 100
        ))
      ELSE 100
    END AS risk_score

  FROM base_metrics
)
SELECT
  h.provider_id,
  h.provider_name,

  -- Financial Metrics
  ROUND(h.total_invoiced::NUMERIC, 2) AS total_invoiced,
  ROUND(h.total_collected::NUMERIC, 2) AS total_collected,
  ROUND(h.total_written_off::NUMERIC, 2) AS total_written_off,
  ROUND(h.total_open_balance::NUMERIC, 2) AS total_open_balance,

  -- Counts
  h.invoice_count,
  h.case_count,
  h.law_firm_count,
  h.open_case_count,

  -- Rates
  ROUND(h.collection_rate::NUMERIC, 2) AS collection_rate,
  ROUND(h.write_off_rate::NUMERIC, 2) AS write_off_rate,
  ROUND(h.dso_days::NUMERIC, 1) AS dso_days,

  -- Averages
  ROUND(h.avg_invoice_amount::NUMERIC, 2) AS avg_invoice_amount,

  -- NEW KPIs
  ROUND(COALESCE(h.at_risk_ar, 0)::NUMERIC, 2) AS at_risk_ar,
  ROUND(COALESCE(h.settled_pending_ar, 0)::NUMERIC, 2) AS settled_pending_ar,
  ROUND(COALESCE(h.active_litigation_ar, 0)::NUMERIC, 2) AS active_litigation_ar,

  -- Component Scores
  ROUND(h.collection_rate_score::NUMERIC, 1) AS collection_rate_score,
  ROUND(h.dso_score::NUMERIC, 1) AS dso_score,
  ROUND(h.aging_score::NUMERIC, 1) AS aging_score,
  ROUND(h.risk_score::NUMERIC, 1) AS risk_score,

  -- NEW: Portfolio Health Score (weighted composite)
  ROUND(
    (h.collection_rate_score * 0.40 +
     h.dso_score * 0.30 +
     h.aging_score * 0.20 +
     h.risk_score * 0.10)::NUMERIC,
    1
  ) AS portfolio_health_score,

  -- Health Score Grade
  CASE
    WHEN (h.collection_rate_score * 0.40 + h.dso_score * 0.30 + h.aging_score * 0.20 + h.risk_score * 0.10) >= 80 THEN 'Excellent'
    WHEN (h.collection_rate_score * 0.40 + h.dso_score * 0.30 + h.aging_score * 0.20 + h.risk_score * 0.10) >= 60 THEN 'Good'
    WHEN (h.collection_rate_score * 0.40 + h.dso_score * 0.30 + h.aging_score * 0.20 + h.risk_score * 0.10) >= 40 THEN 'Fair'
    WHEN (h.collection_rate_score * 0.40 + h.dso_score * 0.30 + h.aging_score * 0.20 + h.risk_score * 0.10) >= 20 THEN 'Poor'
    ELSE 'Critical'
  END AS health_score_grade,

  -- Timestamp for cache validation
  NOW() AS calculated_at

FROM health_scores h;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_kpi_enhanced_provider_id
  ON provider_kpi_summary_enhanced_mv(provider_id);

CREATE INDEX idx_kpi_enhanced_provider_name
  ON provider_kpi_summary_enhanced_mv(provider_name);

CREATE INDEX idx_kpi_enhanced_health_score
  ON provider_kpi_summary_enhanced_mv(portfolio_health_score DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW provider_kpi_summary_enhanced_mv IS 'Enhanced provider KPIs with Portfolio Health Score (0-100) - refresh after data changes';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.portfolio_health_score IS 'Composite score (0-100): 40% collection rate, 30% DSO, 20% aging, 10% risk';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.collection_rate IS 'Collection rate = amount deposited / invoice amount (only for transactions that had deposits)';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.dso_days IS 'Days Sales Outstanding - measures collection efficiency';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.at_risk_ar IS 'Open AR in high-risk categories (No Longer Represent, Pending 18+ months, Case 36+ months)';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.settled_pending_ar IS 'Open AR for cases settled but not yet disbursed';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.active_litigation_ar IS 'Open AR for cases in active litigation or negotiation';
COMMENT ON COLUMN provider_kpi_summary_enhanced_mv.health_score_grade IS 'Grade: Excellent (80+), Good (60-79), Fair (40-59), Poor (20-39), Critical (<20)';
