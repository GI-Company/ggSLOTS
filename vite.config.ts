import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { stripeDevMiddleware } from './server/devApi.mjs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const read = (...keys: string[]) => keys.map(key => process.env[key] || env[key] || '').find(Boolean) || '';
    const supabaseUrl = read('VITE_SUPABASE_URL', 'STORAGE_SUPABASE_URL', 'NEXT_PUBLIC_STORAGE_SUPABASE_URL', 'SUPABASE_URL');
    const supabaseAnon = read(
        'VITE_SUPABASE_ANON_KEY',
        'STORAGE_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY',
        'STORAGE_SUPABASE_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_STORAGE_SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_ANON_KEY'
    );
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        { name: 'stripe-dev-api', configureServer(server) { server.middlewares.use(stripeDevMiddleware()); } }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
