/**
 * Aging Analysis Materialized View
 *
 * Breaks down open receivables into aging buckets:
 * - 0-30 days (Current)
 * - 31-60 days
 * - 61-90 days
 * - 91-180 days
 * - 181-365 days
 * - Over 365 days (high risk)
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS aging_analysis_mv CASCADE;

CREATE MATERIALIZED VIEW aging_analysis_mv AS
SELECT
  provider_id,
  provider_name,

  -- Aging Buckets (based on days since invoice_date)
  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date BETWEEN 0 AND 30
    THEN open_balance
    ELSE 0
  END) AS current_0_30,

  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date BETWEEN 31 AND 60
    THEN open_balance
    ELSE 0
  END) AS days_31_60,

  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date BETWEEN 61 AND 90
    THEN open_balance
    ELSE 0
  END) AS days_61_90,

  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date BETWEEN 91 AND 180
    THEN open_balance
    ELSE 0
  END) AS days_91_180,

  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date BETWEEN 181 AND 365
    THEN open_balance
    ELSE 0
  END) AS days_181_365,

  SUM(CASE
    WHEN open_balance > 0 AND
         CURRENT_DATE - invoice_date > 365
    THEN open_balance
    ELSE 0
  END) AS days_over_365,

  -- Total open balance (should equal sum of buckets)
  SUM(CASE WHEN open_balance > 0 THEN open_balance ELSE 0 END) AS total_open,

  -- Invoice counts per bucket
  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date BETWEEN 0 AND 30
  ) AS count_0_30,

  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date BETWEEN 31 AND 60
  ) AS count_31_60,

  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date BETWEEN 61 AND 90
  ) AS count_61_90,

  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date BETWEEN 91 AND 180
  ) AS count_91_180,

  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date BETWEEN 181 AND 365
  ) AS count_181_365,

  COUNT(*) FILTER (
    WHERE open_balance > 0 AND
          CURRENT_DATE - invoice_date > 365
  ) AS count_over_365,

  -- Total open invoice count
  COUNT(*) FILTER (WHERE open_balance > 0) AS open_invoice_count,

  -- Risk percentage (% of total in high-risk buckets: 180+ days)
  CASE
    WHEN SUM(CASE WHEN open_balance > 0 THEN open_balance ELSE 0 END) > 0 THEN
      ROUND(
        (SUM(CASE WHEN open_balance > 0 AND CURRENT_DATE - invoice_date > 180 THEN open_balance ELSE 0 END)::DECIMAL /
         SUM(CASE WHEN open_balance > 0 THEN open_balance ELSE 0 END)::DECIMAL) * 100,
        2
      )
    ELSE 0
  END AS high_risk_percentage,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data

GROUP BY provider_id, provider_name;

-- Indexes
CREATE UNIQUE INDEX idx_aging_provider_id
  ON aging_analysis_mv(provider_id);

CREATE INDEX idx_aging_high_risk
  ON aging_analysis_mv(high_risk_percentage DESC)
  WHERE high_risk_percentage > 0;

-- Comments
COMMENT ON MATERIALIZED VIEW aging_analysis_mv IS 'Aging analysis of open receivables by provider';
COMMENT ON COLUMN aging_analysis_mv.current_0_30 IS 'Open balance aged 0-30 days';
COMMENT ON COLUMN aging_analysis_mv.days_over_365 IS 'High risk - over 1 year old';
COMMENT ON COLUMN aging_analysis_mv.high_risk_percentage IS 'Percentage of open balance aged > 180 days';
