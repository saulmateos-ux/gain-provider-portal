/**
 * Receivables by Case Status Materialized View
 *
 * PI-specific view showing open AR grouped by litigation stage
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS receivables_by_case_status_mv CASCADE;

CREATE MATERIALIZED VIEW receivables_by_case_status_mv AS
SELECT
  provider_id,
  provider_name,

  -- Still Treating
  SUM(open_balance) FILTER (WHERE case_status = 'Still Treating') AS still_treating_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Still Treating' AND open_balance > 0) AS still_treating_cases,
  COUNT(*) FILTER (WHERE case_status = 'Still Treating' AND open_balance > 0) AS still_treating_invoices,

  -- Gathering Bills and Records
  SUM(open_balance) FILTER (WHERE case_status = 'Gathering Bills and Records') AS gathering_bills_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Gathering Bills and Records' AND open_balance > 0) AS gathering_bills_cases,
  COUNT(*) FILTER (WHERE case_status = 'Gathering Bills and Records' AND open_balance > 0) AS gathering_bills_invoices,

  -- Demand Sent
  SUM(open_balance) FILTER (WHERE case_status = 'Demand Sent') AS demand_sent_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Demand Sent' AND open_balance > 0) AS demand_sent_cases,
  COUNT(*) FILTER (WHERE case_status = 'Demand Sent' AND open_balance > 0) AS demand_sent_invoices,

  -- Pending
  SUM(open_balance) FILTER (WHERE case_status = 'Pending') AS pending_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Pending' AND open_balance > 0) AS pending_cases,
  COUNT(*) FILTER (WHERE case_status = 'Pending' AND open_balance > 0) AS pending_invoices,

  -- Negotiation
  SUM(open_balance) FILTER (WHERE case_status = 'Negotiation') AS negotiation_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Negotiation' AND open_balance > 0) AS negotiation_cases,
  COUNT(*) FILTER (WHERE case_status = 'Negotiation' AND open_balance > 0) AS negotiation_invoices,

  -- In Litigation
  SUM(open_balance) FILTER (WHERE case_status = 'In Litigation') AS in_litigation_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'In Litigation' AND open_balance > 0) AS in_litigation_cases,
  COUNT(*) FILTER (WHERE case_status = 'In Litigation' AND open_balance > 0) AS in_litigation_invoices,

  -- Settled - Not Yet Disbursed (MONEY WON!)
  SUM(open_balance) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed') AS settled_pending_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed' AND open_balance > 0) AS settled_pending_cases,
  COUNT(*) FILTER (WHERE case_status = 'Settled - Not Yet Disbursed' AND open_balance > 0) AS settled_pending_invoices,

  -- Case Closed Payment Disbursed (should be zero open balance)
  SUM(open_balance) FILTER (WHERE case_status = 'Case Closed Payment Disbursed') AS closed_paid_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'Case Closed Payment Disbursed' AND open_balance > 0) AS closed_paid_cases,

  -- No Longer Represent (AT RISK - likely write-off)
  SUM(open_balance) FILTER (WHERE case_status = 'No Longer Represent') AS no_longer_represent_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status = 'No Longer Represent' AND open_balance > 0) AS no_longer_represent_cases,
  COUNT(*) FILTER (WHERE case_status = 'No Longer Represent' AND open_balance > 0) AS no_longer_represent_invoices,

  -- Total open AR
  SUM(open_balance) AS total_open_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE open_balance > 0) AS total_open_cases,

  -- Active litigation (In Litigation + Negotiation)
  SUM(open_balance) FILTER (WHERE case_status IN ('In Litigation', 'Negotiation')) AS active_litigation_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status IN ('In Litigation', 'Negotiation') AND open_balance > 0) AS active_litigation_cases,

  -- At risk (No Longer Represent + Pending with ambiguous status)
  SUM(open_balance) FILTER (WHERE case_status IN ('No Longer Represent', 'Pending')) AS at_risk_ar,
  COUNT(DISTINCT opportunity_name) FILTER (WHERE case_status IN ('No Longer Represent', 'Pending') AND open_balance > 0) AS at_risk_cases,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data
WHERE open_balance > 0

GROUP BY provider_id, provider_name;

-- Indexes
CREATE UNIQUE INDEX idx_receivables_status_provider
  ON receivables_by_case_status_mv(provider_id);

-- Comments
COMMENT ON MATERIALIZED VIEW receivables_by_case_status_mv IS 'PI-specific open AR grouped by case litigation stage';
COMMENT ON COLUMN receivables_by_case_status_mv.settled_pending_ar IS 'Money already won but awaiting disbursement';
COMMENT ON COLUMN receivables_by_case_status_mv.at_risk_ar IS 'AR in No Longer Represent or ambiguous Pending status';
