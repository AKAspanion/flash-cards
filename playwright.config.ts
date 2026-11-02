import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run a production build (mode "emulator") against the local
// Auth/Firestore emulators: `npm run test:e2e` starts both.
const PORT = 4317;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  timeout: 60_000,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The app's own service worker would cache builds between test runs.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    // Also exercises the app's reduced-motion styles; keeps a11y scans off mid-animation frames.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --mode emulator --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
