/**
 * At-Risk AR Materialized View
 *
 * Cases at risk of not paying (likely write-off candidates)
 * - No Longer Represent (attorney dropped case)
 * - Pending status for extended periods
 * - Cases extremely old with no progress
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS at_risk_ar_mv CASCADE;

CREATE MATERIALIZED VIEW at_risk_ar_mv AS
SELECT
  provider_id,
  provider_name,
  opportunity_name AS case_name,
  patient_name,
  law_firm_name,
  attorney_name,
  case_status,

  -- Financial details
  SUM(open_balance) AS open_balance,
  SUM(invoice_amount) AS total_invoiced,
  SUM(write_off_amount) AS write_off_amount,
  COUNT(*) AS invoice_count,

  -- Time metrics
  MIN(invoice_date) AS oldest_invoice_date,
  CURRENT_DATE - MIN(invoice_date) AS days_since_oldest_invoice,
  MIN(origination_date) AS origination_date,
  CURRENT_DATE - MIN(origination_date) AS days_since_origination,

  -- Risk category
  CASE
    WHEN MAX(case_status) = 'No Longer Represent' THEN 'No Longer Represent'
    WHEN MAX(case_status) = 'Pending' AND CURRENT_DATE - MIN(origination_date) > 730 THEN 'Pending 24+ Months'
    WHEN MAX(case_status) = 'Pending' AND CURRENT_DATE - MIN(origination_date) > 540 THEN 'Pending 18+ Months'
    WHEN CURRENT_DATE - MIN(origination_date) > 1095 THEN 'Case 36+ Months Old'
    ELSE 'Other Risk'
  END AS risk_category,

  -- Write-off info
  BOOL_OR(is_write_off) AS has_write_off,
  MAX(write_off_reason) AS write_off_reason,

  -- Payoff status
  MAX(payoff_status) AS payoff_status,

  -- Location
  MAX(location_name) AS location_name,
  MAX(state) AS state,

  -- Tranche
  MAX(tranche_name) AS tranche_name

FROM provider_master_data
WHERE open_balance > 0
  AND (
    -- No Longer Represent cases
    case_status = 'No Longer Represent'
    -- OR Pending for a long time
    OR (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540)
    -- OR extremely old cases (36+ months)
    OR (CURRENT_DATE - origination_date > 1095)
  )

GROUP BY
  provider_id,
  provider_name,
  opportunity_name,
  patient_name,
  law_firm_name,
  attorney_name,
  case_status

ORDER BY open_balance DESC;

-- Indexes
CREATE INDEX idx_at_risk_provider
  ON at_risk_ar_mv(provider_id);

CREATE INDEX idx_at_risk_law_firm
  ON at_risk_ar_mv(law_firm_name);

CREATE INDEX idx_at_risk_category
  ON at_risk_ar_mv(risk_category);

CREATE INDEX idx_at_risk_balance
  ON at_risk_ar_mv(open_balance DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW at_risk_ar_mv IS 'Cases at high risk of not paying - write-off candidates';
COMMENT ON COLUMN at_risk_ar_mv.risk_category IS 'Risk classification for triage';
COMMENT ON COLUMN at_risk_ar_mv.days_since_origination IS 'Total case age from origination';
