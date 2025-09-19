# DEPLOYMENT INSTRUCTIONS FOR SENDGRID FUNCTION

## STEP 1: Apply Database Schema

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/xxjpzdmatqcgjxsdokou/sql/new

2. Copy and paste this SQL to apply all schema changes:

```sql
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

-- Add sync optimization columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_conversation_id TEXT;
```

3. Click "RUN" to execute the migration

## STEP 2: Deploy SendGrid Edge Function

1. Open Supabase Functions: https://supabase.com/dashboard/project/xxjpzdmatqcgjxsdokou/functions

2. Create new function:
   - Click "Create Function"
   - Name: `sendgrid-notifications` (exactly this name)
   - Replace the default code with the content from `CORRECTED_SENDGRID_FUNCTION.ts`

3. Deploy the function

## STEP 3: Set Environment Variables

Make sure these environment variables are set in the Edge Functions environment:
- `SENDGRID_API_KEY` - Your SendGrid API key
- `SUPABASE_URL` - Your Supabase URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (auto-set)

## STEP 4: Test the Function

1. Open Lead Machine: https://leads.imaginecapital.ai
2. Go to Settings (SaaS Admin account required)
3. Click "Test Email" button
4. Check your email for test message

## CRITICAL FIXES APPLIED:

1. **Database Schema**: Uses snake_case column names (`email_from_address`) to match PostgreSQL conventions
2. **Test Email Type**: Uses proper `test_email` type instead of `new_message` for tests
3. **CORS Headers**: Proper CORS handling for all origins
4. **Error Handling**: Comprehensive error logging and responses
5. **Email Templates**: Enhanced HTML and text formatting for better presentation

## TROUBLESHOOTING:

- If test email fails, check browser console for specific error messages
- Verify SendGrid API key is correctly set in environment variables
- Check that DNS verification is properly configured in SendGrid
- Ensure all database migrations were applied successfully