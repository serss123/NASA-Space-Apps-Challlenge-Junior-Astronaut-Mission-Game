import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, /api va al servidor Express (puerto 3001). En producción, Express sirve este cliente compilado.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) }
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 }
});
