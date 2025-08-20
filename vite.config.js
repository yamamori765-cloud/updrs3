// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // main/docs公開ならリポジトリ名指定は不要で ./ が安全
  build: {
    outDir: 'docs' // ← dist ではなく docs に出力
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UPDRS Part III（簡易版）',
        short_name: 'UPDRS3',
        start_url: '.',
        display: 'standalone',
        background_color: '#f9fafb',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});