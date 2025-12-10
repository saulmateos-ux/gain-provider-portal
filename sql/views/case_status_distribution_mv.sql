/**
 * Case Status Distribution Materialized View
 *
 * Pre-computed case counts by status for funnel visualization
 *
 * CRITICAL RULE #1: ALL calculations in PostgreSQL
 */

DROP MATERIALIZED VIEW IF EXISTS case_status_distribution_mv CASCADE;

CREATE MATERIALIZED VIEW case_status_distribution_mv AS
SELECT
  provider_id,
  provider_name,

  -- Case counts by status
  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Still Treating'
  ) AS still_treating_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Gathering Bills'
  ) AS gathering_bills_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Demand Sent'
  ) AS demand_sent_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Pending'
  ) AS pending_count,

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status = 'Negotiation'
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

  COUNT(DISTINCT opportunity_name) FILTER (
    WHERE case_status IS NULL OR case_status = ''
  ) AS unknown_status_count,

  -- Total cases
  COUNT(DISTINCT opportunity_name) AS total_case_count,

  -- Timestamp
  NOW() AS calculated_at

FROM provider_master_data

GROUP BY provider_id, provider_name;

-- Indexes
CREATE UNIQUE INDEX idx_case_status_provider
  ON case_status_distribution_mv(provider_id);

-- Comments
COMMENT ON MATERIALIZED VIEW case_status_distribution_mv IS 'Case counts by status for funnel visualization';
