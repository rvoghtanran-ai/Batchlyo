import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/',
    plugins: [react()],
    define: {
      'process.env': {},
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.CLOUDFLARE_API_KEY': JSON.stringify(env.CLOUDFLARE_API_KEY),
      'process.env.CLOUDFLARE_ACCOUNT_ID': JSON.stringify(env.CLOUDFLARE_ACCOUNT_ID),
    }
  };
});