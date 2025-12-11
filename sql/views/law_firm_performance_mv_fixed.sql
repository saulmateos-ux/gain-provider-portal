/**
 * Law Firm Performance Materialized View - FIXED for Real Data
 */

DROP MATERIALIZED VIEW IF EXISTS law_firm_performance_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_performance_mv AS
SELECT
  COALESCE(law_firm_id, 'UNKNOWN') AS law_firm_id,
  COALESCE(law_firm_name, 'Unknown Law Firm') AS law_firm_name,

  -- Attorney count
  COUNT(DISTINCT attorney_name) FILTER (WHERE attorney_name IS NOT NULL) AS attorney_count,

  -- Case and Invoice Counts
  COUNT(DISTINCT opportunity_name) AS case_count,
  COUNT(*) AS invoice_count,

  -- Financial Metrics
  SUM(invoice_amount) AS total_invoice,
  SUM(collected_amount) AS total_collected,
  SUM(write_off_amount) AS total_written_off,
  SUM(open_balance) AS total_open,

  -- Collection Rate (weighted average)
  CASE
    WHEN SUM(invoice_amount) > 0 THEN
      ROUND((SUM(collected_amount)::DECIMAL / SUM(invoice_amount)::DECIMAL) * 100, 2)
    ELSE 0
  END AS collection_rate,

  -- Average case value
  CASE
    WHEN COUNT(DISTINCT opportunity_name) > 0 THEN
      ROUND(SUM(invoice_amount)::DECIMAL / COUNT(DISTINCT opportunity_name)::DECIMAL, 2)
    ELSE 0
  END AS avg_case_value,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data

GROUP BY COALESCE(law_firm_id, 'UNKNOWN'), COALESCE(law_firm_name, 'Unknown Law Firm')

-- Include all law firms with at least 1 case
HAVING COUNT(DISTINCT opportunity_name) >= 1
ORDER BY SUM(invoice_amount) DESC;

-- Indexes
CREATE INDEX idx_law_firm_perf_law_firm
  ON law_firm_performance_mv(law_firm_id);

CREATE INDEX idx_law_firm_perf_collection_rate
  ON law_firm_performance_mv(collection_rate DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW law_firm_performance_mv IS 'Pre-computed law firm performance metrics';
