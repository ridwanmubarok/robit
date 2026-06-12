import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],

  // Vite dev server proxy — forwards all API calls to the Python backend
  // This way you DON'T need to build the frontend every time during development.
  // Just run: python3 robit.py serve (backend) + npm run dev (frontend) simultaneously.
  vite: {
    server: {
      watch: {
        ignored: ['**/src-tauri/**']
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          ws: true,
        },
        '/v1': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  },
});
