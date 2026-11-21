import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app. The service worker only precaches the built static
    // files: API responses (financial data, tokens) are never cached, and in
    // production the API lives on another origin the worker doesn't touch.
    VitePWA({
      // A new version waits until the user accepts the "reload" toast
      // (components/PwaUpdatePrompt.jsx) instead of swapping mid-session.
      registerType: 'prompt',
      injectRegister: false,
      // globPatterns below already precaches the icons.
      includeManifestIcons: false,
      manifest: {
        name: 'Goals',
        short_name: 'Goals',
        description: 'Tus finanzas personales: gastos, presupuestos, ahorro e inversiones.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#047857',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        // The main bundle is above workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5173,
    hmr: {
      port: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
