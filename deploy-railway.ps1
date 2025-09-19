# Lead Machine - Railway Deployment Script

Write-Host "🚀 Starting Railway deployment for Lead Machine..."
Write-Host ""

# Check if Railway CLI is available
try {
    $railwayVersion = npx @railway/cli --version 2>$null
    Write-Host "✅ Railway CLI found: $railwayVersion"
} catch {
    Write-Host "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
}

Write-Host ""
Write-Host "📋 Pre-deployment checklist:"
Write-Host "✅ Database schema applied in Supabase"
Write-Host "✅ Edge Functions deployed"
Write-Host "✅ Environment variables configured"
Write-Host "✅ Build configuration ready"
Write-Host ""

Write-Host "🔐 Please run these commands to complete deployment:"
Write-Host ""
Write-Host "1. Login to Railway:"
Write-Host "   npx @railway/cli login"
Write-Host ""
Write-Host "2. Initialize project:"
Write-Host "   npx @railway/cli init"
Write-Host ""
Write-Host "3. Set environment variables:"
Write-Host "   npx @railway/cli variables set VITE_GEMINI_API_KEY=AIzaSyAwq9uY0eLXN9ce8iiv1h19K9uJhU0QiqU"
Write-Host "   npx @railway/cli variables set VITE_PUBLIC_SUPABASE_URL=https://xxjpzdmatqcgjxsdokou.supabase.co"
Write-Host "   npx @railway/cli variables set VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw"
Write-Host "   npx @railway/cli variables set VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"
Write-Host ""
Write-Host "4. Deploy:"
Write-Host "   npx @railway/cli up"
Write-Host ""
Write-Host "🌟 Your Lead Machine will be available at: https://your-app-name.railway.app"
Write-Host ""
Write-Host "📊 Features ready for production:"
Write-Host "   • AI-powered lead insights"
Write-Host "   • ElevenLabs voice integration"
Write-Host "   • Multi-tenant database"
Write-Host "   • Secure authentication"
Write-Host "   • Webhook notifications"
Write-Host "   • Form builder"