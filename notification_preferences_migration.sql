-- Add notification preferences to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'immediate'; -- 'immediate', 'hourly', 'daily', 'disabled'
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"new_message": true, "lead_updates": true, "system_alerts": true}';

-- Add last sync tracking to companies table for incremental sync
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_conversation_id TEXT;