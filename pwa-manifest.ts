import type { ManifestOptions } from 'vite-plugin-pwa';

// The web app manifest. Kept apart from vite.config.ts so the Android TWA project can read the same values.
export const pwaManifest: Partial<ManifestOptions> = {
  id: '/',
  scope: '/',
  name: 'Flashcards - Learn & Memorize',
  short_name: 'Flashcards',
  description: 'A learning and memorization helper app',
  theme_color: '#E91E63',
  background_color: '#ECECEC',
  display: 'standalone',
  start_url: '/',
  icons: [
    { src: 'img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'img/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
    { src: 'img/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'img/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
