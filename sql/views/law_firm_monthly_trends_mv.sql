-- Law Firm Monthly Performance Trends
-- Tracks collection rate, case volume, and velocity trends over time

DROP MATERIALIZED VIEW IF EXISTS law_firm_monthly_trends_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_monthly_trends_mv AS
SELECT
  law_firm_id,
  law_firm_name,
  DATE_TRUNC('month', collection_date)::date AS collection_month,

  -- Collection Volume
  COUNT(DISTINCT opportunity_name) AS cases_collected,
  SUM(invoice_amount) AS invoiced_amount,
  SUM(collected_amount) AS collected_amount,

  -- Collection Rate
  CASE
    WHEN SUM(invoice_amount) > 0
    THEN (SUM(collected_amount) / SUM(invoice_amount) * 100)
    ELSE 0
  END AS collection_rate,

  -- Collection Velocity
  AVG(collection_date - invoice_date) AS avg_days_to_collection,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY collection_date - invoice_date) AS median_days_to_collection,

  -- Case Status at Collection
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed') AS settled_collections,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'In Litigation') AS litigation_collections,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status IN ('Negotiation', 'Demand Sent')) AS negotiated_collections

FROM provider_master_data
WHERE collection_date IS NOT NULL
  AND law_firm_name IS NOT NULL
GROUP BY law_firm_id, law_firm_name, DATE_TRUNC('month', collection_date)::date;

-- Create composite unique index for concurrent refresh
CREATE UNIQUE INDEX idx_law_firm_monthly_trends_pk ON law_firm_monthly_trends_mv(law_firm_id, collection_month);

-- Create index for time-based queries
CREATE INDEX idx_law_firm_monthly_trends_date ON law_firm_monthly_trends_mv(collection_month DESC);
CREATE INDEX idx_law_firm_monthly_trends_firm_date ON law_firm_monthly_trends_mv(law_firm_id, collection_month DESC);
