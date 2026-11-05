import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaManifest } from './pwa-manifest.ts';
import { DEV_PORTS } from './dev-ports.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig(({ mode }) => {
  // Firebase's auth helper pages (/__/auth/*) live on the project's firebaseapp.com; the dev server
  // forwards them so Google sign-in works on localhost, where the auth domain is the dev host.
  const projectId = loadEnv(mode, process.cwd(), 'VUE_APP_').VUE_APP_PROJECT_ID;
  const authProxy = projectId
    ? { '/__': { target: `https://${projectId}.firebaseapp.com`, changeOrigin: true } }
    : undefined;

  return {
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
        manifest: pwaManifest,
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
      port: DEV_PORTS.devServer,
      strictPort: true,
      proxy: authProxy,
    },
    preview: {
      port: DEV_PORTS.preview,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.spec.ts'],
      server: { deps: { inline: ['vuetify'] } },
    },
  };
});
