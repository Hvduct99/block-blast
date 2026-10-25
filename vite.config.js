import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// base './' -> chay duoc o moi duong dan (GitHub Pages /<repo>/, ten mien rieng, mo file dist)
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  // npm run dev: chuyen api/*.php sang may chu Node (npm run dev:server, cong 3000)
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        play: resolve(import.meta.dirname, 'play.html'),
      },
    },
  },
});
