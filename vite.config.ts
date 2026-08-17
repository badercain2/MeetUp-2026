import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/*.svg'],
      manifest: {
        name: 'MeetUP 2026 Check-in',
        short_name: 'MeetUP Check-in',
        description: 'Registro rápido de llegada para MeetUP 2026',
        theme_color: '#0c2535',
        background_color: '#0c2535',
        display: 'standalone',
        start_url: '/login',
        icons: [
          { src: '/assets/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/assets/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,webp}'] }
    })
  ]
})
