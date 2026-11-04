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
2. Against the real project: `npm run serve` (or `npm run dev`). The dev server port is `server.port` in
   `vite.config.ts`, with `strictPort`. This uses real accounts and data. Google sign-in here needs `http://localhost:8080/__/auth/handler` as a redirect
   URI on the OAuth web client ([decision](../decisions/google-sign-in-redirect.md)).
3. Against emulators, touching nothing real: `npm run emulators` in one terminal, `npm run dev:emulator` in another.
   Emulator ports are the `emulators` block of `firebase.json`; the Firestore one is not the default, and the app's
   matching host and port are in `getServices` in `src/services/firebase.ts`.
4. Checks: `npm run lint`, `npm run type-check`, `npm test`, `npm run test:rules`, `npm run test:e2e`
   ([testing](../quality/testing.md)).
5. Cloud Functions: `pnpm --dir functions install`, then `pnpm --dir functions run build`; deploy with `npm run deploy:functions`
   ([functions](../apps/functions.md)).

## History

- 2026-11-04: setup was `npm install`; now `pnpm install` (and `pnpm --dir functions` for the functions), because the web app moved to pnpm. See [pnpm](../decisions/pnpm-package-manager.md).

## Sources

- `.nvmrc`
- `package.json`
- `vite.config.ts`
- `firebase.json`
- `src/services/firebase.ts`
- `README.md`
