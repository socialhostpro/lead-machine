-- Add email configuration columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_reply_to_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_from_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sendgrid_dns_verified BOOLEAN DEFAULT FALSE;

-- Set default values for existing companies
UPDATE companies 
SET 
  email_from_address = 'noreply@imaginecapital.ai',
  email_reply_to_address = 'noreply@imaginecapital.ai',
  email_from_name = 'Lead Machine Notifications',
  sendgrid_dns_verified = FALSE
WHERE email_from_address IS NULL;