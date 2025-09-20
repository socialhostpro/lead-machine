-- Migration: Add Google AdWords and Location Support
-- Date: 2025-09-20
-- Description: Add multi-tenant Google AdWords configuration and enhanced location tracking

-- Add Google AdWords configuration to companies table
ALTER TABLE companies 
ADD COLUMN google_ads_conversion_id TEXT,
ADD COLUMN google_ads_conversion_label TEXT,
ADD COLUMN google_analytics_id TEXT,
ADD COLUMN google_ads_access_token TEXT,
ADD COLUMN google_ads_refresh_token TEXT,
ADD COLUMN google_ads_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN google_ads_account_id TEXT,
ADD COLUMN business_latitude DECIMAL(10, 8),
ADD COLUMN business_longitude DECIMAL(11, 8);

-- Add enhanced location tracking to leads table
ALTER TABLE leads
ADD COLUMN geocoded_latitude DECIMAL(10, 8),
ADD COLUMN geocoded_longitude DECIMAL(11, 8),
ADD COLUMN parsed_address TEXT,
ADD COLUMN distance_from_user DECIMAL(10, 2);

-- Create index for distance-based queries
CREATE INDEX idx_leads_geocoded_location ON leads(geocoded_latitude, geocoded_longitude);
CREATE INDEX idx_leads_distance_from_user ON leads(distance_from_user);

-- Create index for company Google Ads configuration
CREATE INDEX idx_companies_google_ads ON companies(google_ads_connected, google_ads_conversion_id);

-- Comments for documentation
COMMENT ON COLUMN companies.google_ads_conversion_id IS 'Google Ads conversion tracking ID for this company';
COMMENT ON COLUMN companies.google_ads_conversion_label IS 'Google Ads conversion label for this company';
COMMENT ON COLUMN companies.google_analytics_id IS 'Google Analytics (GA4) measurement ID for this company';
COMMENT ON COLUMN companies.google_ads_access_token IS 'OAuth access token for Google Ads API';
COMMENT ON COLUMN companies.google_ads_refresh_token IS 'OAuth refresh token for Google Ads API';
COMMENT ON COLUMN companies.google_ads_connected IS 'Whether Google Ads is connected and configured';
COMMENT ON COLUMN companies.google_ads_account_id IS 'Google Ads account ID';
COMMENT ON COLUMN companies.business_latitude IS 'Business location latitude for distance calculations';
COMMENT ON COLUMN companies.business_longitude IS 'Business location longitude for distance calculations';

COMMENT ON COLUMN leads.geocoded_latitude IS 'Geocoded latitude from parsed address';
COMMENT ON COLUMN leads.geocoded_longitude IS 'Geocoded longitude from parsed address';
COMMENT ON COLUMN leads.parsed_address IS 'Parsed address string used for geocoding';
COMMENT ON COLUMN leads.distance_from_user IS 'Distance from current user location in miles';