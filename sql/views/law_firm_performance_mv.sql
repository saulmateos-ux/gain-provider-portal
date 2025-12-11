/**
 * Law Firm Performance Materialized View
 *
 * Pre-computed law firm analytics including:
 * - Collection rates and efficiency
 * - Case counts and status distribution
 * - Average case duration and time to payment
 * - Performance rankings
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS law_firm_performance_mv CASCADE;

CREATE MATERIALIZED VIEW law_firm_performance_mv AS
SELECT
  provider_id,
  COALESCE(law_firm_id, 'UNKNOWN') AS law_firm_id,
  COALESCE(law_firm_name, 'Unknown Law Firm') AS law_firm_name,

  -- Case and Invoice Counts
  COUNT(DISTINCT opportunity_name) AS case_count,
  COUNT(*) AS invoice_count,

  -- Financial Metrics
  SUM(invoice_amount) AS total_invoiced,
  SUM(collected_amount) AS total_collected,
  SUM(write_off_amount) AS total_written_off,
  SUM(open_balance) AS total_open,

  -- Collection Rate = Collected / Invoice Amount (for transactions with deposits only)
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

  -- Average Case Duration (days from origination to settlement)
  ROUND(AVG(
    CASE
      WHEN settlement_date IS NOT NULL AND origination_date IS NOT NULL THEN
        settlement_date - origination_date
      ELSE NULL
    END
  )::NUMERIC, 1) AS avg_case_duration_days,

  -- Average Time to Payment (days from invoice to collection)
  ROUND(AVG(
    CASE
      WHEN collection_date IS NOT NULL AND invoice_date IS NOT NULL THEN
        collection_date - invoice_date
      ELSE NULL
    END
  )::NUMERIC, 1) AS avg_time_to_payment_days,

  -- Case Status Breakdown
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status IN ('Still Treating', 'Gathering Bills')
  ) AS early_stage_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status IN ('Demand Sent', 'Pending', 'Negotiation')
  ) AS negotiation_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'In Litigation'
  ) AS in_litigation_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Settled - Pending'
  ) AS settled_pending_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Closed - Paid'
  ) AS closed_paid_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'No Longer Represent'
  ) AS no_longer_represent_count,

  -- Open Cases
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE open_balance > 0
  ) AS open_case_count,

  -- Average Open Balance per Case
  CASE
    WHEN COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0) > 0 THEN
      ROUND(
        SUM(open_balance) FILTER (WHERE open_balance > 0)::DECIMAL /
        COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0)::DECIMAL,
        2
      )
    ELSE 0
  END AS avg_open_balance_per_case,

  -- Performance Tier (A/B/C/D/E based on collection rate)
  CASE
    WHEN SUM(invoice_amount) FILTER (WHERE collected_amount > 0) > 0 THEN
      CASE
        WHEN (SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
              SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) >= 0.80 THEN 'A'
        WHEN (SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
              SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) >= 0.65 THEN 'B'
        WHEN (SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
              SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) >= 0.50 THEN 'C'
        WHEN (SUM(collected_amount) FILTER (WHERE collected_amount > 0)::DECIMAL /
              SUM(invoice_amount) FILTER (WHERE collected_amount > 0)::DECIMAL) >= 0.35 THEN 'D'
        ELSE 'E'
      END
    ELSE 'E'
  END AS performance_tier,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data

GROUP BY provider_id, COALESCE(law_firm_id, 'UNKNOWN'), COALESCE(law_firm_name, 'Unknown Law Firm')

-- Only include law firms with at least 3 cases
HAVING COUNT(DISTINCT opportunity_name) >= 3;

-- Indexes
CREATE INDEX idx_law_firm_perf_provider
  ON law_firm_performance_mv(provider_id);

CREATE INDEX idx_law_firm_perf_law_firm
  ON law_firm_performance_mv(law_firm_id);

CREATE INDEX idx_law_firm_perf_collection_rate
  ON law_firm_performance_mv(collection_rate DESC);

CREATE INDEX idx_law_firm_perf_tier
  ON law_firm_performance_mv(performance_tier);

CREATE INDEX idx_law_firm_perf_provider_lawfirm
  ON law_firm_performance_mv(provider_id, law_firm_id);

-- Comments
COMMENT ON MATERIALIZED VIEW law_firm_performance_mv IS 'Pre-computed law firm performance metrics';
COMMENT ON COLUMN law_firm_performance_mv.collection_rate IS 'Collection rate = amount deposited / invoice amount (only for transactions that had deposits)';
COMMENT ON COLUMN law_firm_performance_mv.avg_case_duration_days IS 'Average days from origination to settlement';
COMMENT ON COLUMN law_firm_performance_mv.performance_tier IS 'A=80%+, B=65%+, C=50%+, D=35%+, E=<35%';
