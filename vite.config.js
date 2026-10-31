import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl =
    env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    'http://localhost:4000';

  const target =
    apiUrl.replace(/\/api(\/v1)?\/?$/, '') ||
    'http://localhost:4000';

  return {
    plugins: [react()],

    server: {
      port: 5173,

      allowedHosts: ['.trycloudflare.com'],

      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },

    build: {
      chunkSizeWarningLimit: 1200,
    },
  };
});