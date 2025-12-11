/**
 * Settled Pending Detail Materialized View
 *
 * Cases that have SETTLED but payment not yet disbursed
 * This is UNIQUE to PI - money you've already won!
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS settled_pending_detail_mv CASCADE;

CREATE MATERIALIZED VIEW settled_pending_detail_mv AS
SELECT
  provider_id,
  provider_name,
  opportunity_name AS case_name,
  patient_name,
  law_firm_name,
  attorney_name,

  -- Financial details
  SUM(open_balance) AS open_balance,
  SUM(invoice_amount) AS total_invoiced,
  COUNT(*) AS invoice_count,

  -- Settlement details
  MIN(settlement_date) AS settlement_date,
  CURRENT_DATE - MIN(settlement_date) AS days_since_settlement,

  -- Payoff status (Cap, Reduction Accepted, Full, etc.)
  MAX(payoff_status) AS payoff_status,

  -- Case details
  MIN(date_of_accident) AS date_of_accident,
  MIN(origination_date) AS origination_date,

  -- Tranche info
  MAX(tranche_name) AS tranche_name,
  MAX(ar_book_name) AS ar_book_name,

  -- Location
  MAX(location_name) AS location_name,
  MAX(state) AS state

FROM provider_master_data
WHERE case_status = 'Settled - Not Yet Disbursed'
  AND open_balance > 0

GROUP BY
  provider_id,
  provider_name,
  opportunity_name,
  patient_name,
  law_firm_name,
  attorney_name

ORDER BY open_balance DESC;

-- Indexes
CREATE INDEX idx_settled_pending_provider
  ON settled_pending_detail_mv(provider_id);

CREATE INDEX idx_settled_pending_law_firm
  ON settled_pending_detail_mv(law_firm_name);

CREATE INDEX idx_settled_pending_balance
  ON settled_pending_detail_mv(open_balance DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW settled_pending_detail_mv IS 'Cases that have settled but payment not yet disbursed - money already won';
COMMENT ON COLUMN settled_pending_detail_mv.days_since_settlement IS 'Days waiting for payment after settlement';
COMMENT ON COLUMN settled_pending_detail_mv.payoff_status IS 'Settlement type: Cap, Reduction Accepted, Full, etc.';
