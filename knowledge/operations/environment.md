---
type: Runbook
title: Environment variables
description: Every setting the app and its pipelines read — the VUE_APP_* Firebase web config, the emulator switch, the deploy variables and secret — and where each is read.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Environment variables

## Variables

- The app's variables are listed, with comments, in `.env.example`: the Firebase web config (`VUE_APP_API_KEY`,
  `VUE_APP_AUTH_DOMAIN`, `VUE_APP_PROJECT_ID`, `VUE_APP_APP_ID` and the rest), the optional
  `VUE_APP_PLAY_STORE_URL`, and `VUE_APP_USE_EMULATORS`. Locally they go in `.env.local`, which git ignores.
- Only names starting `VUE_APP_` reach the app (`envPrefix` in `vite.config.ts`; why is in
  [original app compatibility](../decisions/original-app-compatibility.md)).
- `.env.emulator` is committed: it is loaded in `emulator` mode (`npm run dev:emulator`, `npm run build:e2e`) and
  points the app at the emulators with demo values; no real project is touched.
- `VUE_APP_AUTH_DOMAIN` is the custom domain rather than the default `firebaseapp.com` one, so Google's sign-in
  window shows it; that needs the console settings in the README's "Domains" section.
- Deploys read the same `VUE_APP_*` values, plus `FIREBASE_PROJECT_ID` and optionally `APP_URL`, from GitHub
  repository variables, and the `FIREBASE_SERVICE_ACCOUNT` secret (`.github/workflows/deploy.yml`, README
  "One-time setup for deploys").

## Where each is read

- Firebase config and `VUE_APP_USE_EMULATORS`: `getServices` in `src/services/firebase.ts`, which names any required
  key that is missing.
- `VUE_APP_PLAY_STORE_URL`: `src/views/Info.vue`.
- `BASE_URL` (set by Vite): the router history in `src/router/index.ts`.
- `GCLOUD_PROJECT`: the fallback project id in `functions/src/index.ts`.
- `CI`: retries, workers and reporters in `playwright.config.ts`.
- `FIRESTORE_EMULATOR_HOST`: set by the emulator for `tests/unit/firestore.rules.spec.ts`.

## Sources

- `.env.example`
- `.env.emulator`
- `vite.config.ts`
- `src/services/firebase.ts`
- `src/views/Info.vue`
- `src/router/index.ts`
- `functions/src/index.ts`
- `playwright.config.ts`
- `tests/unit/firestore.rules.spec.ts`
- `.github/workflows/deploy.yml`
- `README.md`
