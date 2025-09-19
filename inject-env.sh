#!/bin/bash
# Railway startup script to inject environment variables

# Replace environment variables in env.js
if [ -f "/app/dist/env.js" ]; then
    # Replace the placeholder values with actual environment variables
    sed -i "s|https://xxjpzdmatqcgjxsdokou.supabase.co|${VITE_PUBLIC_SUPABASE_URL}|g" /app/dist/env.js
    sed -i "s|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw|${VITE_PUBLIC_SUPABASE_ANON_KEY}|g" /app/dist/env.js
fi

# Start the application
exec "$@"