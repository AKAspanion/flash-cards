---
type: Runbook
title: Environment variables
description: Every setting the app and its pipelines read — the VUE_APP_* Firebase web config, the emulator switch, the deploy variables and secret — and where each is read.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Environment variables

## Variables

- The app's variables are listed, with comments, in `.env.example`: the Firebase web config (`VUE_APP_API_KEY`,
  `VUE_APP_AUTH_DOMAIN`, `VUE_APP_PROJECT_ID`, `VUE_APP_APP_ID` and the rest), the optional
  `VUE_APP_PLAY_STORE_URL`, the optional AdSense pair `VUE_APP_ADSENSE_CLIENT` and `VUE_APP_ADSENSE_SLOT`, and
  `VUE_APP_USE_EMULATORS`. Locally they go in `.env.local`, which git ignores.
- Only names starting `VUE_APP_` reach the app (`envPrefix` in `vite.config.ts`; why is in
  [original app compatibility](../decisions/original-app-compatibility.md)).
- `.env.emulator` is committed: it is loaded in `emulator` mode (`npm run dev:emulator`, `npm run build:e2e`) and
  points the app at the emulators with demo values; no real project is touched.
- `VUE_APP_AUTH_DOMAIN` is only the fallback auth domain, for emulators and non-browser runs: in a browser the auth
  domain is the host serving the app ([decision](../decisions/google-sign-in-redirect.md)). Every host needs the
  console settings in the README's "Domains" section.
- With `VUE_APP_PROJECT_ID` set, the dev server proxies `/__` to the project's `firebaseapp.com`, so Google sign-in
  works locally (`vite.config.ts`).
- Deploys read the same `VUE_APP_*` values, plus `FIREBASE_PROJECT_ID` and optionally `APP_URL`, from GitHub
  repository variables, and the `FIREBASE_SERVICE_ACCOUNT` secret (`.github/workflows/deploy.yml`, README
  "One-time setup for deploys").

## Where each is read

- Firebase config and `VUE_APP_USE_EMULATORS`: `getServices` in `src/services/firebase.ts`, which names any required
  key that is missing.
- `VUE_APP_PLAY_STORE_URL`: `src/views/Info.vue`.
- `VUE_APP_ADSENSE_CLIENT` and `VUE_APP_ADSENSE_SLOT`: `adsConfig` in `src/services/ads.ts`. Both are optional: unset
  or malformed means no script loads and no ad shows ([Google AdSense](../integrations/google-adsense.md)).
- `BASE_URL` (set by Vite): the router history in `src/router/index.ts`.
- `GCLOUD_PROJECT`: the fallback project id in `functions/src/index.ts`.
- `CI`: retries, workers and reporters in `playwright.config.ts`.
- `FIRESTORE_EMULATOR_HOST`: set by the emulator for `tests/unit/firestore.rules.spec.ts`.

## History

- 2026-11-04: no ad settings; now `VUE_APP_ADSENSE_CLIENT` and `VUE_APP_ADSENSE_SLOT` are optional, because the app shows an AdSense banner. See [one AdSense banner](../decisions/adsense-banner-ads.md).
- 2026-11-04: `VUE_APP_AUTH_DOMAIN` was the auth domain shown to users; now only a fallback, because sign-in redirects through the serving host.

## Sources

- `.env.example`
- `.env.emulator`
- `vite.config.ts`
- `src/services/firebase.ts`
- `src/views/Info.vue`
- `src/services/ads.ts`
- `src/router/index.ts`
- `functions/src/index.ts`
- `playwright.config.ts`
- `tests/unit/firestore.rules.spec.ts`
- `.github/workflows/deploy.yml`
- `README.md`
