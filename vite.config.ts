import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Expose environment variables to the client
      define: {
        'import.meta.env.VITE_PUBLIC_SUPABASE_URL': JSON.stringify(env.VITE_PUBLIC_SUPABASE_URL),
        'import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_PUBLIC_SUPABASE_ANON_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.VITE_SUPABASE_SERVICE_ROLE_KEY),
      },
      preview: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: [
          'leadmachine-production.up.railway.app',
          'leads.imaginecapital.ai',
          '.railway.app',
          '.imaginecapital.ai',
          'localhost'
        ]
      },
      server: {
        host: '0.0.0.0',
        port: 5174
      }
    };
});
