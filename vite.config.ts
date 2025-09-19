import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // AGGRESSIVE CACHE BUSTING - NO CACHING ALLOWED
        manifest: false,
        rollupOptions: {
          output: {
            // Force unique file names every build
            entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
            // Create separate chunks for better caching
            manualChunks: {
              vendor: ['react', 'react-dom'],
              supabase: ['@supabase/supabase-js'],
              utils: ['./utils/supabase', './utils/notifications', './utils/toast']
            }
          }
        },
        // Enable source maps for better debugging in production
        sourcemap: true,
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
