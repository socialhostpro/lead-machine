# LEAD MACHINE DEPLOYMENT GUIDE

## Step 1: Database Setup
1. Open your browser and go to: https://supabase.com/dashboard/project/xxjpzdmatqcgjxsdokou/sql/new
2. Copy the entire contents of `SUPABASE_SETUP.sql` and paste it into the SQL editor
3. Click "Run" to execute the setup script
4. You should see: "Lead Machine database setup completed successfully!"

## Step 2: Deploy Edge Functions

### Function 1: elevenlabs-conversations
1. Go to: https://supabase.com/dashboard/project/xxjpzdmatqcgjxsdokou/functions
2. Click "Create Function"
3. Name: `elevenlabs-conversations`
4. Copy the contents of `elevenlabs-conversations-function.ts` and paste it
5. Click "Deploy Function"

### Function 2: sync-leads  
1. Click "Create Function" again
2. Name: `sync-leads`
3. Copy the contents of `sync-leads-function.ts` and paste it
4. Click "Deploy Function"

### Function 3: send-webhook
1. Click "Create Function" again  
2. Name: `send-webhook`
3. Copy the contents of `send-webhook-function.ts` and paste it
4. Click "Deploy Function"

## Step 3: Verify API Key
The ElevenLabs API key should already be set in your secrets. You can verify at:
https://supabase.com/dashboard/project/xxjpzdmatqcgjxsdokou/settings/secrets

Key name: `ELEVEN_LABS_API_KEY`
Should show: `8e0100cc23a87c4fcb652f369a451c419eefd21ccf91`

## Step 4: Start Development Server
```powershell
cd "z:\geminiCliApps\lead-machine"
npm run dev
```

Your application should now be running at: http://localhost:5173

## Edge Function URLs
After deployment, your functions will be available at:
- https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/elevenlabs-conversations
- https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sync-leads  
- https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/send-webhook

## Database Tables Created
✅ companies - Company information and webhook settings
✅ profiles - User profiles linked to companies  
✅ leads - Lead data with AI insights and notes
✅ forms - Custom lead capture forms
✅ Row Level Security policies for multi-tenant access
✅ Helper functions for role/company access
✅ Trigger for automatic user setup on signup

## Notes
- The lint errors in the function files are normal - they're designed for Deno runtime in Supabase
- Your ElevenLabs API key is securely stored in Supabase secrets
- All API calls now go through secure Edge Functions instead of exposing keys in the frontend
- Database uses proper Row Level Security for multi-tenant isolation