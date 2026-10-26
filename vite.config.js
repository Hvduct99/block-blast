import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// base './' -> chay duoc o moi duong dan (GitHub Pages /<repo>/, ten mien rieng, mo file dist)
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
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
