/**
 * Provider KPI Summary Materialized View
 *
 * Pre-computed dashboard KPIs including:
 * - Total invoiced, collected, written off, open balance
 * - Collection rate (weighted average)
 * - DSO (Days Sales Outstanding)
 * - Invoice and case counts
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 * Frontend ONLY displays these pre-calculated values
 */

DROP MATERIALIZED VIEW IF EXISTS provider_kpi_summary_mv CASCADE;

CREATE MATERIALIZED VIEW provider_kpi_summary_mv AS
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
      ROUND((SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
             SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) * 100, 2)
    ELSE 0
  END AS collection_rate,

  -- Write-off Rate
  CASE
    WHEN SUM(invoice_amount) > 0 THEN
      ROUND((SUM(write_off_amount)::DECIMAL / SUM(invoice_amount)::DECIMAL) * 100, 2)
    ELSE 0
  END AS write_off_rate,

  -- DSO Calculation (Days Sales Outstanding)
  -- DSO = (Open Balance / Total Invoiced) * Days in Period
  -- Using 365 days for annual calculation
  CASE
    WHEN SUM(invoice_amount) > 0 THEN
      ROUND((SUM(open_balance)::DECIMAL / (SUM(invoice_amount)::DECIMAL / 365)) ::NUMERIC, 1)
    ELSE 0
  END AS dso_days,

  -- Average Invoice Amount
  ROUND(AVG(invoice_amount)::NUMERIC, 2) AS avg_invoice_amount,

  -- Open Cases (cases with open balance > 0)
  COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0) AS open_case_count,

  -- Timestamp for cache validation
  NOW() AS calculated_at

FROM provider_master_data

GROUP BY provider_id, provider_name;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_kpi_summary_provider_id
  ON provider_kpi_summary_mv(provider_id);

CREATE INDEX idx_kpi_summary_provider_name
  ON provider_kpi_summary_mv(provider_name);

-- Comments
COMMENT ON MATERIALIZED VIEW provider_kpi_summary_mv IS 'Pre-computed provider KPIs for dashboard - refresh after data changes';
COMMENT ON COLUMN provider_kpi_summary_mv.collection_rate IS 'Collection rate = amount deposited / invoice amount (only for transactions that had deposits)';
COMMENT ON COLUMN provider_kpi_summary_mv.dso_days IS 'Days Sales Outstanding - measures collection efficiency';
COMMENT ON COLUMN provider_kpi_summary_mv.calculated_at IS 'Timestamp when view was last refreshed';
