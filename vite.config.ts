import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // Keep the VUE_APP_* names so existing .env.local files keep working.
  envPrefix: 'VUE_APP_',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      // src/pwa.ts applies updates once no edits are pending, instead of reloading mid-edit.
      registerType: 'prompt',
      // Same file name the Vue CLI build registered, so installed copies of
      // the old app pick up this worker as an update instead of staying stale.
      filename: 'service-worker.js',
      includeAssets: ['favicon.ico', 'images/flash-cards-logo.png', 'img/icons/*.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // Firebase reserves /__/ (auth handler, init.js); never answer those with the app shell.
        navigateFallbackDenylist: [/^\/__\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Flashcards - Learn & Memorize',
        short_name: 'Flashcards',
        description: 'A learning and memorization helper app',
        theme_color: '#E91E63',
        background_color: '#ECECEC',
        display: 'fullscreen',
        start_url: '/',
        icons: [
          { src: 'img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'img/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'img/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The Firebase SDK chunk is ~570 kB raw (~170 kB gzip) on its own; warn only above that.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: an app-only deploy leaves these cached in returning browsers.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase|@grpc|idb)[\\/]/ },
            { name: 'vue', test: /node_modules[\\/](vue|@vue|vue-router|pinia|vue-i18n|@intlify)[\\/]/ },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    // Vuetify 4 note: avoids duplicate overlay stacks in dev (dialogs behind overlays).
    include: [
      'vuetify/components/VOverlay',
      'vuetify/components/VDialog',
      'vuetify/components/VMenu',
      'vuetify/components/VSelect',
      'vuetify/components/VTooltip',
    ],
  },
  server: {
    port: 8080,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
    server: { deps: { inline: ['vuetify'] } },
  },
});
