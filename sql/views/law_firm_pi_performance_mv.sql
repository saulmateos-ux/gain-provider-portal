-- Law Firm PI-Specific Performance Metrics
-- Tracks litigation pipeline composition and case status breakdown by law firm

DROP MATERIALIZED VIEW IF EXISTS law_firm_pi_performance_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_pi_performance_mv AS
SELECT
  law_firm_id,
  law_firm_name,

  -- Overall Portfolio Metrics
  COUNT(DISTINCT opportunity_name) AS total_cases,
  SUM(invoice_amount) AS total_invoiced,
  SUM(collected_amount) AS total_collected,
  SUM(open_balance) AS total_open_ar,

  -- Collection Performance (only for transactions with deposits)
  CASE
    WHEN SUM(invoice_amount) FILTER (WHERE collected_amount > 0) > 0
    THEN ROUND((SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
                SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) * 100, 2)
    ELSE 0
  END AS collection_rate,

  -- Case Status Breakdown (PI-Specific)
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Still Treating' AND open_balance > 0) AS still_treating_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Still Treating') AS still_treating_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Gathering Bills and Records' AND open_balance > 0) AS gathering_bills_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Gathering Bills and Records') AS gathering_bills_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Demand Sent' AND open_balance > 0) AS demand_sent_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Demand Sent') AS demand_sent_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Pending' AND open_balance > 0) AS pending_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Pending') AS pending_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Negotiation' AND open_balance > 0) AS negotiation_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Negotiation') AS negotiation_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'In Litigation' AND open_balance > 0) AS in_litigation_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'In Litigation') AS in_litigation_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed' AND open_balance > 0) AS settled_pending_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed') AS settled_pending_ar,

  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'No Longer Represent' AND open_balance > 0) AS no_longer_represent_cases,
  SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent') AS no_longer_represent_ar,

  -- Active Litigation (Negotiation + In Litigation)
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status IN ('Negotiation', 'In Litigation') AND open_balance > 0) AS active_litigation_cases,
  SUM(open_balance) FILTER (WHERE case_status IN ('Negotiation', 'In Litigation')) AS active_litigation_ar,

  -- At-Risk AR (No Longer Represent + Old Pending)
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE (case_status = 'No Longer Represent' OR
           (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540))
    AND open_balance > 0
  ) AS at_risk_cases,
  SUM(open_balance) FILTER (
    WHERE case_status = 'No Longer Represent' OR
          (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540)
  ) AS at_risk_ar,

  -- Timing Metrics (PI-Specific)
  AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0) AS avg_case_age_days,
  AVG(CURRENT_DATE - settlement_date) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed') AS avg_days_since_settlement,
  AVG(collection_date - invoice_date) FILTER (WHERE collection_date IS NOT NULL) AS avg_days_to_collection,

  -- Performance Grade (PI-Specific Criteria)
  CASE
    -- Grade A: >70% collection rate, <10% at-risk, avg case age <18 months
    WHEN (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100) > 70
         AND (SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent' OR (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540)) / NULLIF(SUM(open_balance), 0) * 100) < 10
         AND AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0) < 540
    THEN 'A'

    -- Grade B: >60% collection rate, <20% at-risk, avg case age <24 months
    WHEN (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100) > 60
         AND (SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent' OR (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540)) / NULLIF(SUM(open_balance), 0) * 100) < 20
         AND AVG(CURRENT_DATE - origination_date) FILTER (WHERE open_balance > 0) < 730
    THEN 'B'

    -- Grade C: >50% collection rate, <30% at-risk
    WHEN (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100) > 50
         AND (SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent' OR (case_status = 'Pending' AND CURRENT_DATE - origination_date > 540)) / NULLIF(SUM(open_balance), 0) * 100) < 30
    THEN 'C'

    -- Grade D: >40% collection rate
    WHEN (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100) > 40
    THEN 'D'

    -- Grade F: Everything else
    ELSE 'F'
  END AS performance_grade

FROM provider_master_data
WHERE law_firm_name IS NOT NULL
GROUP BY law_firm_id, law_firm_name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_law_firm_pi_performance_pk ON law_firm_pi_performance_mv(law_firm_id);

-- Create additional indexes for common queries
CREATE INDEX idx_law_firm_pi_performance_grade ON law_firm_pi_performance_mv(performance_grade);
CREATE INDEX idx_law_firm_pi_performance_collection_rate ON law_firm_pi_performance_mv(collection_rate DESC);
CREATE INDEX idx_law_firm_pi_performance_open_ar ON law_firm_pi_performance_mv(total_open_ar DESC);
