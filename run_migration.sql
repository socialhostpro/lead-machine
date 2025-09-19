-- EMAIL SETTINGS FOR COMPANIES TABLE
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

-- NOTIFICATION PREFERENCES FOR USERS TABLE  
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'immediate';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}';

-- Set default values for existing users
UPDATE users 
SET 
  email_notifications_enabled = COALESCE(email_notifications_enabled, TRUE),
  notification_frequency = COALESCE(notification_frequency, 'immediate'),
  notification_types = COALESCE(notification_types, '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}'::jsonb);

-- SYNC OPTIMIZATION COLUMNS FOR COMPANIES
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_conversation_id TEXT;