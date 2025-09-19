# RAILWAY DEPLOYMENT GUIDE - LEAD MACHINE

## 🚀 Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Initialize Project
```bash
cd z:\geminiCliApps\lead-machine
railway init
```

### Step 4: Set Environment Variables
```bash
# Set your environment variables in Railway
railway variables set VITE_GEMINI_API_KEY=AIzaSyAwq9uY0eLXN9ce8iiv1h19K9uJhU0QiqU
railway variables set VITE_PUBLIC_SUPABASE_URL=https://xxjpzdmatqcgjxsdokou.supabase.co
railway variables set VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw
railway variables set VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk
```

### Step 5: Deploy
```bash
railway up
```

## 🌐 Alternative: Deploy via GitHub

### Option A: Connect GitHub Repository
1. Push your code to GitHub
2. Go to https://railway.app
3. Click "Deploy from GitHub repo"
4. Select your lead-machine repository
5. Set environment variables in Railway dashboard
6. Deploy!

### Option B: Deploy from Local
```bash
# Build and deploy directly
railway up --detach
```

## 📋 Environment Variables to Set in Railway

| Variable | Value |
|----------|-------|
| `VITE_GEMINI_API_KEY` | `AIzaSyAwq9uY0eLXN9ce8iiv1h19K9uJhU0QiqU` |
| `VITE_PUBLIC_SUPABASE_URL` | `https://xxjpzdmatqcgjxsdokou.supabase.co` |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## ✅ What's Included

- **Node.js 18 Runtime**: Optimized for Railway
- **Build Pipeline**: Automated Vite build process
- **Port Configuration**: Auto-configured for Railway's port system
- **Environment Variables**: Properly configured for production
- **Health Checks**: Built-in restart policies

## 🔗 After Deployment

Your Lead Machine will be available at: `https://your-app-name.railway.app`

Features working out of the box:
- ✅ AI-powered lead insights (Gemini)
- ✅ ElevenLabs integration (via Edge Functions)
- ✅ Multi-tenant database (Supabase)
- ✅ User authentication
- ✅ Webhook notifications
- ✅ Form builder

## 📞 Support

Your application is production-ready with:
- Database: Supabase (deployed)
- Edge Functions: 3 functions active
- Frontend: React with Vite
- AI: Google Gemini integration
- Voice: ElevenLabs secure integration