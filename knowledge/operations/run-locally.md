---
type: Runbook
title: Run locally
description: How to run the app against the real Firebase project or against local emulators, and which ports each uses.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Run locally

## Prerequisites

- Node at the version in `.nvmrc` (the minimum is `engines.node` in `package.json`).
- Java 21 for the Firebase emulators (README, "Setup").
- For the real project: the Firebase web config in `.env.local` ([environment](environment.md)). The README shows
  how to print it with the Firebase CLI.

## Steps

1. `pnpm install` ([pnpm](../decisions/pnpm-package-manager.md)). The other scripts below also run with `pnpm run`.
2. Against the real project: `npm run serve` (or `npm run dev`). The dev server runs on `DEV_PORTS.devServer`
   (`2100`) from `dev-ports.ts`, with `strictPort`; `npm run preview` runs on `DEV_PORTS.preview` (`2107`), also
   with `strictPort` ([ports](../decisions/local-ports-2100-block.md)). This uses real accounts and data. Google
   sign-in here needs `http://localhost:2100/__/auth/handler` as a redirect
   URI on the OAuth web client ([decision](../decisions/google-sign-in-redirect.md)).
3. Against emulators, touching nothing real: `npm run emulators` in one terminal, `npm run dev:emulator` (also on
   `DEV_PORTS.devServer`, `2100`) in another. Emulator ports are `DEV_PORTS` in `dev-ports.ts`, mirrored in the
   `emulators` block of `firebase.json`. The app reaches them on the hostname it was opened on (`localhost` or
   `127.0.0.1`), so either address works, Google sign-in included
   ([Firebase](../integrations/firebase.md#configuration)).
4. Checks: `npm run lint`, `npm run type-check`, `npm test`, `npm run test:rules`, `npm run test:e2e`
   ([testing](../quality/testing.md)).
5. Cloud Functions: `pnpm --dir functions install`, then `pnpm --dir functions run build`; deploy with `npm run deploy:functions`
   ([functions](../apps/functions.md)).

## History

- 2026-11-05: Google sign-in on the emulators only worked from `127.0.0.1`; now from `localhost` too, because the app reaches the emulators on its own hostname. See [Firebase](../integrations/firebase.md).
- 2026-11-05: the dev server was on `8080`, the Firestore emulator on `8085` and the preview on the tool default; now the dev server is `2100`, the preview `2107` and the emulators in the same block, because every local port moved into one block. See [ports](../decisions/local-ports-2100-block.md).
- 2026-11-04: setup was `npm install`; now `pnpm install` (and `pnpm --dir functions` for the functions), because the web app moved to pnpm. See [pnpm](../decisions/pnpm-package-manager.md).

## Sources

- `.nvmrc`
- `package.json`
- `dev-ports.ts`
- `vite.config.ts`
- `firebase.json`
- `src/services/firebase.ts`
- `src/services/emulatorHost.ts`
- `README.md`
