# SendGrid Setup Instructions

## Environment Variables Required

Set in Supabase Dashboard:
```
SENDGRID_API_KEY=your_actual_sendgrid_api_key_here
```

This API key is used by the sendgrid-notifications Edge Function to send emails.

## DNS Verification
1. Go to SendGrid dashboard
2. Verify your domain for sender authentication
3. Update the `sendgrid_dns_verified` column in companies table when complete

## Test Email
Use the test email button in the Settings modal to verify the configuration works.