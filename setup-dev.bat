@echo off
REM Lead Machine Development Setup Script for Windows
REM This script sets up the complete development environment

echo 🚀 Setting up Lead Machine Development Environment...

REM Step 1: Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Supabase CLI...
    npm install -g supabase@latest
)

REM Step 2: Initialize Supabase (if not already done)
echo 🏗️ Initializing Supabase project...
supabase init --force

REM Step 3: Start Supabase local development
echo 🔧 Starting Supabase local services...
supabase start

REM Step 4: Run database migrations
echo 🗃️ Running database migrations...
supabase db reset

REM Step 5: Deploy Edge Functions
echo ⚡ Deploying Edge Functions...
supabase functions deploy elevenlabs-conversations
supabase functions deploy sync-leads
supabase functions deploy send-webhook

REM Step 6: Set Edge Function secrets reminder
echo 🔑 Setting up Edge Function secrets...
echo Please set your ElevenLabs API key:
echo supabase secrets set ELEVEN_LABS_API_KEY=your_actual_key_here

REM Step 7: Start the frontend development server
echo 🌐 Starting frontend development server...
start cmd /k "npm run dev"

echo ✅ Development environment is ready!
echo.
echo 🔗 Useful URLs:
echo   Frontend: http://localhost:5173
echo   Supabase Studio: http://localhost:54323
echo   Supabase API: http://localhost:54321
echo.
echo 🔧 Next steps:
echo   1. Set your ElevenLabs API key with: supabase secrets set ELEVEN_LABS_API_KEY=your_key
echo   2. Visit http://localhost:5173 to test the application
echo   3. Create a test account and configure your company settings

pause