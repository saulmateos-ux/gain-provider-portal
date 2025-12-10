/**
 * Provider Master Data Table
 *
 * This is the SINGLE SOURCE OF TRUTH for all financial data
 * All metrics derive from this table via materialized views
 *
 * CRITICAL RULE #2: Database-first architecture
 */

-- Drop existing table if recreating
DROP TABLE IF EXISTS provider_master_data CASCADE;

CREATE TABLE provider_master_data (
  -- Primary Key
  id BIGSERIAL PRIMARY KEY,

  -- Salesforce IDs
  salesforce_id VARCHAR(255) NOT NULL,
  funding_id VARCHAR(255),

  -- Patient Information
  patient_name VARCHAR(500),
  patient_dob DATE,

  -- Case/Opportunity Information
  opportunity_id VARCHAR(255) NOT NULL,
  opportunity_name VARCHAR(500) NOT NULL,
  date_of_accident DATE,

  -- Law Firm Information
  law_firm_id VARCHAR(255),
  law_firm_name VARCHAR(500),
  attorney_name VARCHAR(500),

  -- Provider Information
  provider_id VARCHAR(255) NOT NULL,
  provider_name VARCHAR(500) NOT NULL,
  location_id VARCHAR(255),
  location_name VARCHAR(500),
  region VARCHAR(255),
  state VARCHAR(10),

  -- Financial Data (CRITICAL: Source of all calculations)
  invoice_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  collected_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  write_off_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  open_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Key Dates
  invoice_date DATE NOT NULL,
  origination_date DATE,
  settlement_date DATE,
  collection_date DATE,
  cap_date DATE,

  -- Status Fields
  funding_stage VARCHAR(255),
  funding_sub_stage VARCHAR(255),
  case_status VARCHAR(255),
  payoff_status VARCHAR(255),

  -- Write-off Management
  is_write_off BOOLEAN DEFAULT FALSE,
  write_off_reason VARCHAR(500),

  -- Tranche/AR Book Classification
  tranche_id VARCHAR(255),
  tranche_name VARCHAR(255),
  ar_book_id VARCHAR(255),
  ar_book_name VARCHAR(255),
  ar_type VARCHAR(255),

  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments for documentation
COMMENT ON TABLE provider_master_data IS 'Single source of truth for all provider financial data';
COMMENT ON COLUMN provider_master_data.invoice_amount IS 'Total invoice amount (always positive)';
COMMENT ON COLUMN provider_master_data.collected_amount IS 'Total amount collected to date';
COMMENT ON COLUMN provider_master_data.write_off_amount IS 'Total written off';
COMMENT ON COLUMN provider_master_data.open_balance IS 'Current open balance (can be negative if overpaid)';
COMMENT ON COLUMN provider_master_data.case_status IS 'Case lifecycle status (e.g., In Litigation, Settled, Closed)';
