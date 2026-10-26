import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: { '/api': 'http://localhost:5000' }
  },
  build: { outDir: 'dist' }
});
