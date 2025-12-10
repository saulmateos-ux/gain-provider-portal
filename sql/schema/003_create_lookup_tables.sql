/**
 * Lookup/Reference Tables
 *
 * Normalized entities for providers, law firms, locations, and tranches
 * These can be populated from master_data or managed separately
 */

-- ==================== Providers ====================
DROP TABLE IF EXISTS providers CASCADE;

CREATE TABLE providers (
  id SERIAL PRIMARY KEY,
  provider_id VARCHAR(255) UNIQUE NOT NULL,
  provider_name VARCHAR(500) NOT NULL,
  provider_type VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_providers_name ON providers(provider_name);
CREATE INDEX idx_providers_active ON providers(is_active) WHERE is_active = TRUE;

-- ==================== Locations ====================
DROP TABLE IF EXISTS locations CASCADE;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(255) UNIQUE NOT NULL,
  location_name VARCHAR(500) NOT NULL,
  provider_id VARCHAR(255) REFERENCES providers(provider_id),
  parent_location_id VARCHAR(255) REFERENCES locations(location_id),
  region VARCHAR(255),
  state VARCHAR(10),
  city VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_provider ON locations(provider_id);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);
CREATE INDEX idx_locations_region ON locations(region);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE is_active = TRUE;

-- ==================== Law Firms ====================
DROP TABLE IF EXISTS law_firms CASCADE;

CREATE TABLE law_firms (
  id SERIAL PRIMARY KEY,
  law_firm_id VARCHAR(255) UNIQUE NOT NULL,
  law_firm_name VARCHAR(500) NOT NULL,
  state VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_law_firms_name ON law_firms(law_firm_name);
CREATE INDEX idx_law_firms_active ON law_firms(is_active) WHERE is_active = TRUE;

-- ==================== Tranches ====================
DROP TABLE IF EXISTS tranches CASCADE;

CREATE TABLE tranches (
  id SERIAL PRIMARY KEY,
  tranche_id VARCHAR(255) UNIQUE NOT NULL,
  tranche_name VARCHAR(255) NOT NULL,
  provider_id VARCHAR(255) REFERENCES providers(provider_id),
  total_advanced DECIMAL(15, 2) NOT NULL DEFAULT 0,
  threshold_1_1x DECIMAL(15, 2),
  threshold_1_5x DECIMAL(15, 2),
  origination_date DATE,
  maturity_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tranches_provider ON tranches(provider_id);
CREATE INDEX idx_tranches_active ON tranches(is_active) WHERE is_active = TRUE;

-- ==================== Case Status Definitions ====================
DROP TABLE IF EXISTS case_status_definitions CASCADE;

CREATE TABLE case_status_definitions (
  id SERIAL PRIMARY KEY,
  status_code VARCHAR(100) UNIQUE NOT NULL,
  status_display_name VARCHAR(255) NOT NULL,
  status_category VARCHAR(100),
  status_order INTEGER NOT NULL,
  color_hex VARCHAR(7),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Populate with standard statuses
INSERT INTO case_status_definitions (status_code, status_display_name, status_category, status_order, color_hex) VALUES
  ('still_treating', 'Still Treating', 'active', 1, '#6B7280'),
  ('gathering_bills', 'Gathering Bills', 'active', 2, '#6B7280'),
  ('demand_sent', 'Demand Sent', 'negotiation', 3, '#3B82F6'),
  ('pending', 'Pending', 'negotiation', 4, '#F59E0B'),
  ('negotiation', 'Negotiation', 'negotiation', 5, '#3B82F6'),
  ('in_litigation', 'In Litigation', 'litigation', 6, '#F59E0B'),
  ('settled_pending', 'Settled - Pending', 'closing', 7, '#1E8E8E'),
  ('closed_paid', 'Closed - Paid', 'completed', 8, '#10B981'),
  ('no_longer_represent', 'No Longer Represent', 'closed', 9, '#EF4444');

-- ==================== AR Books ====================
DROP TABLE IF EXISTS ar_books CASCADE;

CREATE TABLE ar_books (
  id SERIAL PRIMARY KEY,
  ar_book_id VARCHAR(255) UNIQUE NOT NULL,
  ar_book_name VARCHAR(255) NOT NULL,
  ar_type VARCHAR(100),
  provider_id VARCHAR(255) REFERENCES providers(provider_id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_books_provider ON ar_books(provider_id);
CREATE INDEX idx_ar_books_type ON ar_books(ar_type);

-- ==================== Comments ====================
COMMENT ON TABLE providers IS 'Provider organizations';
COMMENT ON TABLE locations IS 'Provider locations with hierarchical support';
COMMENT ON TABLE law_firms IS 'Law firms handling cases';
COMMENT ON TABLE tranches IS 'Partial advance tranches with thresholds';
COMMENT ON TABLE case_status_definitions IS 'Standardized case status codes and display names';
COMMENT ON TABLE ar_books IS 'AR book classifications';
