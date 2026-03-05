import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'samples/**/*'],
      manifest: {
        name: 'Niragas - Indian Classical Music Practice',
        short_name: 'Niragas',
        description:
          'Free, open-source Indian Classical music practice companion with Tabla, Tanpura, Sur-Peti, Swar Mandal, and more.',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['music', 'education'],
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache app shell and assets
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // Cache audio samples with a CacheFirst strategy
        runtimeCaching: [
          {
            urlPattern: /\/samples\/.+\.(wav|ogg|mp3|m4a)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-samples',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Tone.js (~400KB) into its own chunk for better caching
          'tone': ['tone'],
          // Split React into its own chunk
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
