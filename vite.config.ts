import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isGitHubPagesBuild = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_ACTIONS === 'true'
const publicBase = isGitHubPagesBuild ? '/MeetUp-2026/' : '/'

export default defineConfig({
  base: publicBase,
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
         start_url: publicBase,
         icons: [
          { src: `${publicBase}assets/icon-192.svg`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `${publicBase}assets/icon-512.svg`, sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,webp}'] }
    })
  ]
})
