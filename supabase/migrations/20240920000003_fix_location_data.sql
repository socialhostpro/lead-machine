-- Migration to fix location data for leads based on area codes
-- This will update caller coordinates for leads where area code doesn't match location

-- Create or replace function to extract area code from phone number
CREATE OR REPLACE FUNCTION extract_area_code(phone_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- Remove all non-digits
    phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');
    
    -- Handle different phone formats
    IF length(phone_number) = 11 AND left(phone_number, 1) = '1' THEN
        -- US format with country code: 1xxxxxxxxxx
        RETURN substring(phone_number from 2 for 3);
    ELSIF length(phone_number) = 10 THEN
        -- US format without country code: xxxxxxxxxx
        RETURN left(phone_number, 3);
    ELSE
        -- Unable to determine area code
        RETURN NULL;
    END IF;
END;
$$;

-- Create temporary table with area code mappings (key Florida and Kentucky codes)
CREATE TEMP TABLE area_code_locations AS
SELECT * FROM (VALUES
    ('850', 'Tallahassee', 'FL', 30.4518, -84.2807),
    ('502', 'Louisville', 'KY', 38.2527, -85.7585),
    ('859', 'Lexington', 'KY', 38.0406, -84.5037),
    ('270', 'Bowling Green', 'KY', 36.9685, -86.4808),
    ('364', 'Bowling Green', 'KY', 36.9685, -86.4808),
    ('786', 'Miami', 'FL', 25.7617, -80.1918),
    ('305', 'Miami', 'FL', 25.7617, -80.1918),
    ('954', 'Fort Lauderdale', 'FL', 26.1224, -80.1373),
    ('561', 'West Palm Beach', 'FL', 26.7153, -80.0534),
    ('407', 'Orlando', 'FL', 28.5383, -81.3792),
    ('321', 'Orlando', 'FL', 28.5383, -81.3792),
    ('813', 'Tampa', 'FL', 27.9506, -82.4572),
    ('727', 'St. Petersburg', 'FL', 27.7676, -82.6403),
    ('239', 'Fort Myers', 'FL', 26.6406, -81.8723),
    ('941', 'Sarasota', 'FL', 27.3364, -82.5307),
    ('352', 'Gainesville', 'FL', 29.6516, -82.3248),
    ('386', 'Daytona Beach', 'FL', 29.2108, -81.0228),
    ('904', 'Jacksonville', 'FL', 30.3322, -81.6557)
) AS t(area_code, city, state, latitude, longitude);

-- Update leads with 850 area code to have correct Tallahassee, FL coordinates
UPDATE leads 
SET 
    caller_latitude = acl.latitude,
    caller_longitude = acl.longitude
FROM area_code_locations acl
WHERE extract_area_code(leads.phone) = acl.area_code
  AND extract_area_code(leads.phone) = '850'
  AND (leads.caller_latitude IS NULL OR leads.caller_longitude IS NULL 
       OR leads.caller_latitude != acl.latitude OR leads.caller_longitude != acl.longitude);

-- Log the update
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % leads with area code 850 to Tallahassee, FL coordinates', update_count;
END
$$;

-- Show leads that were updated
SELECT 
    id,
    first_name,
    last_name,
    phone,
    extract_area_code(phone) as area_code,
    caller_latitude,
    caller_longitude,
    'Tallahassee, FL' as corrected_location
FROM leads 
WHERE extract_area_code(phone) = '850'
ORDER BY created_at DESC
LIMIT 10;

-- Clean up
DROP FUNCTION IF EXISTS extract_area_code(TEXT);