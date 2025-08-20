// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',            // ルート配信（相対'./'は不要）
  build: { outDir: 'dist' }, // Vercel は dist を出力にするのが一般的
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UPDRS Part III（簡易版）',
        short_name: 'UPDRS3',
        start_url: '/',          // ルートでOK（相対'.'でなくて良い）
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})