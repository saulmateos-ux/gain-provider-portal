/**
 * Tranche Performance Materialized View
 *
 * Pre-computed tranche metrics for partial advance tracking
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS tranche_performance_mv CASCADE;

CREATE MATERIALIZED VIEW tranche_performance_mv AS
SELECT
  provider_id,
  provider_name,
  COALESCE(tranche_id, 'UNKNOWN') AS tranche_id,
  COALESCE(tranche_name, 'Unknown Tranche') AS tranche_name,

  -- Case and Invoice Counts
  COUNT(DISTINCT opportunity_name) AS case_count,
  COUNT(*) AS invoice_count,

  -- Financial Metrics
  SUM(invoice_amount) AS total_invoiced,
  SUM(collected_amount) AS total_collected,
  SUM(write_off_amount) AS total_written_off,
  SUM(open_balance) AS total_open,

  -- Collection Rate = Collected / Invoice Amount (shows reduction %)
  CASE
    WHEN SUM(invoice_amount) FILTER (WHERE collected_amount > 0) > 0 THEN
      ROUND((SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
             SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) * 100, 2)
    ELSE 0
  END AS collection_rate,

  -- Repayment Percentage (only for transactions with deposits)
  -- This is a simplified version showing collections as repayment
  CASE
    WHEN SUM(invoice_amount) FILTER (WHERE collected_amount > 0) > 0 THEN
      ROUND((SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
             SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) * 100, 2)
    ELSE 0
  END AS repayment_percentage,

  -- Open Case Count
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE open_balance > 0
  ) AS open_case_count,

  -- Closed Case Count
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Closed - Paid'
  ) AS closed_case_count,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data
WHERE tranche_id IS NOT NULL

GROUP BY provider_id, provider_name, COALESCE(tranche_id, 'UNKNOWN'), COALESCE(tranche_name, 'Unknown Tranche');

-- Indexes
CREATE INDEX idx_tranche_perf_provider
  ON tranche_performance_mv(provider_id);

CREATE INDEX idx_tranche_perf_tranche
  ON tranche_performance_mv(tranche_id);

CREATE INDEX idx_tranche_perf_provider_tranche
  ON tranche_performance_mv(provider_id, tranche_id);

-- Comments
COMMENT ON MATERIALIZED VIEW tranche_performance_mv IS 'Pre-computed tranche performance metrics for partial advances';
