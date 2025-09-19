-- Add email configuration columns to companies and profiles tables
-- Date: 2025-09-19

-- EMAIL SETTINGS FOR COMPANIES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email_from_address') THEN
        ALTER TABLE companies ADD COLUMN email_from_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email_reply_to_address') THEN
        ALTER TABLE companies ADD COLUMN email_reply_to_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email_from_name') THEN
        ALTER TABLE companies ADD COLUMN email_from_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sendgrid_dns_verified') THEN
        ALTER TABLE companies ADD COLUMN sendgrid_dns_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Set default values for existing companies
UPDATE companies 
SET 
  email_from_address = COALESCE(email_from_address, 'notifications@imaginecapital.ai'),
  email_reply_to_address = COALESCE(email_reply_to_address, 'notifications@imaginecapital.ai'),
  email_from_name = COALESCE(email_from_name, 'Lead Machine Notifications'),
  sendgrid_dns_verified = COALESCE(sendgrid_dns_verified, FALSE);

-- NOTIFICATION PREFERENCES FOR PROFILES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_notifications_enabled') THEN
        ALTER TABLE profiles ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_frequency') THEN
        ALTER TABLE profiles ADD COLUMN notification_frequency TEXT DEFAULT 'immediate';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_types') THEN
        ALTER TABLE profiles ADD COLUMN notification_types JSONB DEFAULT '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}';
    END IF;
END $$;

-- Set default values for existing profiles
UPDATE profiles 
SET 
  email_notifications_enabled = COALESCE(email_notifications_enabled, TRUE),
  notification_frequency = COALESCE(notification_frequency, 'immediate'),
  notification_types = COALESCE(notification_types, '{"newMessage": true, "leadUpdates": true, "systemAlerts": true}'::jsonb);

-- SYNC OPTIMIZATION COLUMNS FOR COMPANIES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'last_sync_timestamp') THEN
        ALTER TABLE companies ADD COLUMN last_sync_timestamp TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'last_conversation_id') THEN
        ALTER TABLE companies ADD COLUMN last_conversation_id TEXT;
    END IF;
END $$;