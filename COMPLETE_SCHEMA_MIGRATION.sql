-- COMPLETE SCHEMA MIGRATION FOR LEAD MACHINE
-- Apply all email settings and notification preferences in one go
-- Date: 2025-09-19

-- =================================================================
-- EMAIL SETTINGS FOR COMPANIES TABLE
-- =================================================================

-- Add email configuration columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_reply_to_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sendgrid_dns_verified BOOLEAN DEFAULT FALSE;

-- Set default values for existing companies
UPDATE companies 
SET 
  email_from_address = COALESCE(email_from_address, 'notifications@imaginecapital.ai'),
  email_reply_to_address = COALESCE(email_reply_to_address, 'notifications@imaginecapital.ai'),
  email_from_name = COALESCE(email_from_name, 'Lead Machine Notifications'),
  sendgrid_dns_verified = COALESCE(sendgrid_dns_verified, FALSE);

-- =================================================================
-- NOTIFICATION PREFERENCES FOR USERS TABLE  
-- =================================================================

-- Add notification preference columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'immediate';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}';

-- Set default values for existing users
UPDATE users 
SET 
  email_notifications_enabled = COALESCE(email_notifications_enabled, TRUE),
  notification_frequency = COALESCE(notification_frequency, 'immediate'),
  notification_types = COALESCE(notification_types, '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}'::jsonb);

-- =================================================================
-- SYNC OPTIMIZATION COLUMNS FOR COMPANIES
-- =================================================================

-- Add columns for incremental sync optimization
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_conversation_id TEXT;

-- =================================================================
-- VERIFY SCHEMA CHANGES
-- =================================================================

-- Show companies table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show users table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data to verify updates
SELECT 
  id, 
  name,
  email_from_address,
  email_reply_to_address, 
  email_from_name,
  sendgrid_dns_verified,
  last_sync_timestamp,
  last_conversation_id
FROM companies 
LIMIT 3;

SELECT 
  id,
  name, 
  email,
  email_notifications_enabled,
  notification_frequency,
  notification_types
FROM users 
LIMIT 3;