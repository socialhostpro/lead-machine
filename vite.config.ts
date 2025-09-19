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
