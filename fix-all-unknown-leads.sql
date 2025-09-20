-- PRODUCTION FIX: Update all "Unknown Call" leads with proper names
-- This script will extract names from issue_description for existing leads
-- Run this in Supabase SQL Editor

-- First, let's see how many leads need fixing
SELECT 
    COUNT(*) as total_unknown_leads,
    COUNT(CASE WHEN issue_description IS NOT NULL THEN 1 END) as with_descriptions
FROM leads 
WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call';

-- Show sample data to verify the pattern
SELECT 
    id,
    first_name,
    last_name,
    phone,
    LEFT(issue_description, 100) as description_sample,
    created_at
FROM leads 
WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call'
    AND issue_description IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Pattern 1: "First Last, an existing client, called" or "First Last called"
WITH name_extracts AS (
  SELECT 
    id,
    (regexp_match(issue_description, '^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:,\s+an?\s+existing\s+client)?,?\s+called', 'i'))[1] as extracted_first,
    (regexp_match(issue_description, '^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:,\s+an?\s+existing\s+client)?,?\s+called', 'i'))[2] as extracted_last
  FROM leads 
  WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call'
    AND issue_description ~ '^[A-Z][a-z]+\s+[A-Z][a-z]+.*called'
)
UPDATE leads 
SET 
    first_name = name_extracts.extracted_first,
    last_name = name_extracts.extracted_last
FROM name_extracts 
WHERE leads.id = name_extracts.id
    AND name_extracts.extracted_first IS NOT NULL
    AND name_extracts.extracted_last IS NOT NULL;

-- Pattern 2: "First Last provided/stated/mentioned/gave"
WITH name_extracts AS (
  SELECT 
    id,
    (regexp_match(issue_description, '([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:provided|stated|mentioned|gave)', 'i'))[1] as extracted_first,
    (regexp_match(issue_description, '([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:provided|stated|mentioned|gave)', 'i'))[2] as extracted_last
  FROM leads 
  WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call'
    AND issue_description ~ '[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:provided|stated|mentioned|gave)'
)
UPDATE leads 
SET 
    first_name = name_extracts.extracted_first,
    last_name = name_extracts.extracted_last
FROM name_extracts 
WHERE leads.id = name_extracts.id
    AND name_extracts.extracted_first IS NOT NULL
    AND name_extracts.extracted_last IS NOT NULL;

-- Pattern 3: Single name "Robin called" -> "Robin Caller"
WITH name_extracts AS (
  SELECT 
    id,
    (regexp_match(issue_description, '^([A-Z][a-z]+)\s+called', 'i'))[1] as extracted_first
  FROM leads 
  WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call'
    AND issue_description ~ '^[A-Z][a-z]+\s+called'
)
UPDATE leads 
SET 
    first_name = name_extracts.extracted_first,
    last_name = 'Caller'
FROM name_extracts 
WHERE leads.id = name_extracts.id
    AND name_extracts.extracted_first IS NOT NULL;

-- Show results after update
SELECT 
    COUNT(*) as remaining_unknown_leads
FROM leads 
WHERE first_name = 'Unknown' 
    AND last_name LIKE '%Call%'
    AND source = 'Incoming Call';

-- Show successfully updated leads
SELECT 
    id,
    first_name,
    last_name,
    phone,
    LEFT(issue_description, 100) as description_sample,
    created_at
FROM leads 
WHERE source = 'Incoming Call'
    AND first_name != 'Unknown'
    AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;