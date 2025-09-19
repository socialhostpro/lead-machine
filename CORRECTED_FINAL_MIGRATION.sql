-- CORRECTED DATABASE MIGRATION - FINAL VERSION
-- Fixed table names and TypeScript interface alignment
-- Date: 2025-09-19

-- EMAIL SETTINGS FOR COMPANIES TABLE
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_reply_to_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sendgrid_dns_verified BOOLEAN DEFAULT FALSE;

-- Set default values for existing companies
UPDATE companies 
SET 
  email_from_address = COALESCE(email_from_address, 'notifications@' || COALESCE(NULLIF(current_setting('app.email_domain', true), ''), 'imaginecapital.ai')),
  email_reply_to_address = COALESCE(email_reply_to_address, 'notifications@' || COALESCE(NULLIF(current_setting('app.email_domain', true), ''), 'imaginecapital.ai')),
  email_from_name = COALESCE(email_from_name, 'Lead Machine Notifications'),
  sendgrid_dns_verified = COALESCE(sendgrid_dns_verified, FALSE);

-- NOTIFICATION PREFERENCES FOR PROFILES TABLE (CORRECTED FROM 'users')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'immediate';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}';

-- SOUND NOTIFICATION PREFERENCES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sound_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_volume DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS new_lead_sound TEXT DEFAULT 'notification';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_sound TEXT DEFAULT 'email';

-- Set default values for existing profiles
UPDATE profiles 
SET 
  email_notifications_enabled = COALESCE(email_notifications_enabled, TRUE),
  notification_frequency = COALESCE(notification_frequency, 'immediate'),
  notification_types = COALESCE(notification_types, '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}'::jsonb),
  sound_notifications_enabled = COALESCE(sound_notifications_enabled, TRUE),
  notification_volume = COALESCE(notification_volume, 0.7),
  new_lead_sound = COALESCE(new_lead_sound, 'notification'),
  email_sound = COALESCE(email_sound, 'email');

-- SYNC OPTIMIZATION COLUMNS FOR COMPANIES
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_conversation_id TEXT;

-- VERIFICATION QUERIES
SELECT 'Companies table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
  AND table_schema = 'public'
  AND column_name LIKE '%email%' OR column_name LIKE '%sync%' OR column_name LIKE '%sendgrid%'
ORDER BY ordinal_position;

SELECT 'Profiles table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND (column_name LIKE '%notification%' OR column_name LIKE '%email%' OR column_name LIKE '%sound%')
ORDER BY ordinal_position;