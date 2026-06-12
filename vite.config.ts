import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // GitHub Actions setzt GITHUB_ACTIONS=true → Basis-Pfad für Pages
  base: process.env.GITHUB_ACTIONS ? '/grow-guide-app/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // TFLite models live in public/models and are copied as-is.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5180,
  },
});
