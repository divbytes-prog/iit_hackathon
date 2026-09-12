import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Fail loudly rather than silently moving to 5174, which would then not
    // match the API's CORS allow-list.
    strictPort: true,
  },

  preview: {
    port: 4173,
  },

  build: {
    target: 'es2020',
    sourcemap: false,
    // The brief is judged partly on load time, so keep the vendor libraries in
    // their own chunk: they change far less often than app code and stay
    // cached across deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
