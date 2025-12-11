-- Law Firm Risk Analysis
-- Identifies at-risk cases and performance red flags by law firm

DROP MATERIALIZED VIEW IF EXISTS law_firm_risk_analysis_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_risk_analysis_mv AS
SELECT
  law_firm_id,
  law_firm_name,

  -- At-Risk Cases
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'No Longer Represent') AS no_longer_represent_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent') AS no_longer_represent_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) AS stale_pending_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) AS stale_pending_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE CURRENT_DATE - origination_date > 1095 AND open_balance > 0) AS very_old_cases,
  SUM(open_balance) FILTER (WHERE CURRENT_DATE - origination_date > 1095) AS very_old_ar,

  -- Total At-Risk
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE (case_status = 'No Longer Represent' OR
           (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
           (CURRENT_DATE - origination_date > 1095))
    AND open_balance > 0
  ) AS total_at_risk_cases,

  SUM(open_balance) FILTER (
    WHERE case_status = 'No Longer Represent' OR
          (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
          (CURRENT_DATE - origination_date > 1095)
  ) AS total_at_risk_ar,

  -- At-Risk Percentage
  (SUM(open_balance) FILTER (
    WHERE case_status = 'No Longer Represent' OR
          (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
          (CURRENT_DATE - origination_date > 1095)
  ) * 100.0 / NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)) AS at_risk_pct,

  -- Settled but Delayed Disbursements
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Settled - Not Yet Disbursed'
    AND CURRENT_DATE - settlement_date > 90
  ) AS delayed_disbursement_cases,

  SUM(open_balance) FILTER (
    WHERE case_status = 'Settled - Not Yet Disbursed'
    AND CURRENT_DATE - settlement_date > 90
  ) AS delayed_disbursement_ar,

  AVG(CURRENT_DATE - settlement_date) FILTER (
    WHERE case_status = 'Settled - Not Yet Disbursed'
  ) AS avg_disbursement_delay_days,

  -- Risk Score (0-100, higher = more risk)
  LEAST(100, ROUND(
    -- 40% weight: At-risk percentage
    (SUM(open_balance) FILTER (
      WHERE case_status = 'No Longer Represent' OR
            (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
            (CURRENT_DATE - origination_date > 1095)
    ) * 100.0 / NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)) * 0.4 +

    -- 30% weight: Average case age (normalized to 0-100, capped at 36 months)
    (LEAST(1095, AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0)) / 1095.0 * 100) * 0.3 +

    -- 20% weight: Collection rate deficit (100 - collection_rate)
    (100 - (SUM(collected_amount) * 100.0 / NULLIF(SUM(invoice_amount), 0))) * 0.2 +

    -- 10% weight: Disbursement delay
    (LEAST(180, AVG(CURRENT_DATE - settlement_date) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed')) / 180.0 * 100) * 0.1
  )) AS risk_score,

  -- Risk Level
  CASE
    WHEN LEAST(100, ROUND(
      (SUM(open_balance) FILTER (
        WHERE case_status = 'No Longer Represent' OR
              (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
              (CURRENT_DATE - origination_date > 1095)
      ) * 100.0 / NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)) * 0.4 +
      (LEAST(1095, AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0)) / 1095.0 * 100) * 0.3 +
      (100 - (SUM(collected_amount) * 100.0 / NULLIF(SUM(invoice_amount), 0))) * 0.2 +
      (LEAST(180, AVG(CURRENT_DATE - settlement_date) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed')) / 180.0 * 100) * 0.1
    )) >= 70 THEN 'Critical'
    WHEN LEAST(100, ROUND(
      (SUM(open_balance) FILTER (
        WHERE case_status = 'No Longer Represent' OR
              (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
              (CURRENT_DATE - origination_date > 1095)
      ) * 100.0 / NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)) * 0.4 +
      (LEAST(1095, AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0)) / 1095.0 * 100) * 0.3 +
      (100 - (SUM(collected_amount) * 100.0 / NULLIF(SUM(invoice_amount), 0))) * 0.2 +
      (LEAST(180, AVG(CURRENT_DATE - settlement_date) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed')) / 180.0 * 100) * 0.1
    )) >= 50 THEN 'High'
    WHEN LEAST(100, ROUND(
      (SUM(open_balance) FILTER (
        WHERE case_status = 'No Longer Represent' OR
              (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540) OR
              (CURRENT_DATE - origination_date > 1095)
      ) * 100.0 / NULLIF(SUM(open_balance) FILTER (WHERE open_balance > 0), 0)) * 0.4 +
      (LEAST(1095, AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0)) / 1095.0 * 100) * 0.3 +
      (100 - (SUM(collected_amount) * 100.0 / NULLIF(SUM(invoice_amount), 0))) * 0.2 +
      (LEAST(180, AVG(CURRENT_DATE - settlement_date) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed')) / 180.0 * 100) * 0.1
    )) >= 30 THEN 'Medium'
    ELSE 'Low'
  END AS risk_level

FROM provider_master_data
WHERE law_firm_name IS NOT NULL
GROUP BY law_firm_id, law_firm_name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_law_firm_risk_analysis_pk ON law_firm_risk_analysis_mv(law_firm_id);

-- Create indexes for filtering by risk
CREATE INDEX idx_law_firm_risk_analysis_score ON law_firm_risk_analysis_mv(risk_score DESC);
CREATE INDEX idx_law_firm_risk_analysis_level ON law_firm_risk_analysis_mv(risk_level);
CREATE INDEX idx_law_firm_risk_analysis_at_risk_pct ON law_firm_risk_analysis_mv(at_risk_pct DESC);
