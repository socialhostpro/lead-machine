# Deploy Edge Function Instructions

## Clean Deployment Method

### 1. Create Function
```bash
supabase functions new sendgrid-notifications
```

### 2. Deploy Function
```bash
supabase functions deploy sendgrid-notifications --use-api
```

### 3. Set Environment Variables
Go to Supabase Dashboard > Project Settings > Environment Variables

Add:
- **Name**: `SENDGRID_API_KEY`
- **Value**: `your_actual_sendgrid_api_key_here`

### 4. Test Function
Use the test email button in the Settings modal to verify deployment.

## Function Features
- Sends new message notifications
- Sends test emails for admins
- CORS headers for browser compatibility
- Error handling and logging