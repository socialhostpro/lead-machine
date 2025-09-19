Write-Host "Railway Deployment for Lead Machine"
Write-Host "====================================="
Write-Host ""

Write-Host "✅ Railway CLI found: npx @railway/cli --version"
Write-Host ""

Write-Host "Next steps to deploy:"
Write-Host ""
Write-Host "1. Login to Railway:"
Write-Host "   npx @railway/cli login"
Write-Host ""
Write-Host "2. Initialize project:"
Write-Host "   npx @railway/cli init"
Write-Host ""
Write-Host "3. Set environment variables (copy each line):"
Write-Host 'npx @railway/cli variables set VITE_GEMINI_API_KEY="AIzaSyAwq9uY0eLXN9ce8iiv1h19K9uJhU0QiqU"'
Write-Host 'npx @railway/cli variables set VITE_PUBLIC_SUPABASE_URL="https://xxjpzdmatqcgjxsdokou.supabase.co"'
Write-Host 'npx @railway/cli variables set VITE_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw"'
Write-Host 'npx @railway/cli variables set VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"'
Write-Host ""
Write-Host "4. Deploy:"
Write-Host "   npx @railway/cli up"
Write-Host ""
Write-Host "Your app will be live at: https://your-app-name.railway.app"
Write-Host ""
Write-Host "Ready features:"
Write-Host "- AI lead insights"
Write-Host "- ElevenLabs integration" 
Write-Host "- Multi-tenant database"
Write-Host "- User authentication"
Write-Host "- Webhook support"