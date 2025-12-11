-- Law Firm Case Pipeline Composition
-- Shows distribution of cases across litigation stages by law firm

DROP MATERIALIZED VIEW IF EXISTS law_firm_case_pipeline_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_case_pipeline_mv AS
SELECT
  law_firm_id,
  law_firm_name,
  case_status,

  -- Case Volume
  COUNT(DISTINCT opportunity_name) AS case_count,
  SUM(open_balance) AS open_ar,
  SUM(invoice_amount) AS total_invoiced,

  -- Average Case Characteristics
  AVG(CURRENT_DATE - origination_date) AS avg_case_age_days,
  AVG(open_balance) AS avg_ar_per_case,

  -- Percentage of Firm's Total
  (COUNT(DISTINCT opportunity_name) * 100.0 /
   SUM(COUNT(DISTINCT opportunity_name)) OVER (PARTITION BY law_firm_id)) AS pct_of_firm_cases,

  (SUM(open_balance) * 100.0 /
   NULLIF(SUM(SUM(open_balance)) OVER (PARTITION BY law_firm_id), 0)) AS pct_of_firm_ar,

  -- Stage Category for Color Coding
  CASE
    WHEN case_status = 'Settled - Not Yet Disbursed' THEN 'won'
    WHEN case_status IN ('In Litigation', 'Negotiation', 'Demand Sent') THEN 'active'
    WHEN case_status IN ('Still Treating', 'Gathering Bills and Records') THEN 'early'
    WHEN case_status = 'Pending' THEN 'ambiguous'
    WHEN case_status = 'No Longer Represent' THEN 'at_risk'
    ELSE 'other'
  END AS stage_category

FROM provider_master_data
WHERE law_firm_name IS NOT NULL
  AND open_balance > 0
GROUP BY law_firm_id, law_firm_name, case_status;

-- Create composite unique index for concurrent refresh
CREATE UNIQUE INDEX idx_law_firm_case_pipeline_pk ON law_firm_case_pipeline_mv(law_firm_id, case_status);

-- Create indexes for filtering and sorting
CREATE INDEX idx_law_firm_case_pipeline_firm ON law_firm_case_pipeline_mv(law_firm_id);
CREATE INDEX idx_law_firm_case_pipeline_category ON law_firm_case_pipeline_mv(stage_category);
CREATE INDEX idx_law_firm_case_pipeline_ar ON law_firm_case_pipeline_mv(open_ar DESC);
