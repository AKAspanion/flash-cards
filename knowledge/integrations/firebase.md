---
type: Integration
title: Firebase (Auth, Firestore, Hosting)
description: The app's whole backend — Auth for sign-in, Firestore for data, Hosting for serving — configured from VUE_APP_* variables, with local emulators for development and tests.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Firebase (Auth, Firestore, Hosting)

## What it is used for

- **Auth**: sign-in and the session ([auth](../security/auth.md)).
- **Firestore**: all user data ([data model](../data/model.md)), guarded by `firestore.rules`.
- **Hosting**: serves `dist/`, rewrites every path to /index.html, and sets the cache and security headers
  (`firebase.json`). The default project is in `.firebaserc`.

## Configuration

- `getServices` in `src/services/firebase.ts` builds the SDK config from the `VUE_APP_*` variables and initialises
  Firebase lazily on first use. It throws `FirebaseConfigError`, naming the missing keys, if required ones are
  empty. See [environment](../operations/environment.md).
- With `VUE_APP_USE_EMULATORS=true` it connects to the Auth and Firestore emulators at the ports in `DEV_PORTS`
  (`dev-ports.ts`, mirrored in the `emulators` block of `firebase.json`). The host is `emulatorHostFor` in
  `src/services/emulatorHost.ts`: the page's own hostname when it is `localhost` or `127.0.0.1`, else `127.0.0.1`.
  It has to match the page's hostname because Google sign-in is a redirect: the SDK reads the result through an
  iframe on the Auth emulator's origin, and on a different hostname the browser partitions that iframe's storage,
  so the sign-in comes back with no result and no error.
- The Firebase CLI is not a dependency: scripts run it with `npx` at a pinned version (`package.json`).

## Failure modes

- Missing config: `FirebaseConfigError` is shown in the snack bar by the router guard.
- Slow network: `session.track` shows a warning after `SLOW_NETWORK_MS`.
- Failed loads or writes: the library store shows a translated error and leaves the in-memory list unchanged.
- Offline: Firestore uses a persistent IndexedDB cache (memory where unavailable), so saves count as done once cached
  and sync later; delete forever, profile changes, Delete account, sharing and restore refuse offline
  ([offline study](../features/offline-study.md)). Sign-out waits at most `SIGN_OUT_DEADLINE_MS` for unsynced writes.
- Two collections are written only after a rules deploy: `user-stats` and `shared-sets`
  ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)).
- Google sign-in fails on a domain not listed under Authorized domains in Firebase Auth, or whose `/__/auth/handler`
  isn't a redirect URI on the OAuth web client (README, "Domains"; [decision](../decisions/google-sign-in-redirect.md)).
- The password reset email's continue URL is the serving host's `/login`, so that host must also be an authorised
  domain, or the request fails with `auth/unauthorized-continue-uri`
  ([decision](../decisions/password-reset-uses-firebase-action-page.md)).
- Account deletion batches Firestore deletes of 500 per commit, then deletes the Auth user
  ([Delete account](../features/account-deletion.md)).

## Email settings as read on 2026-11-06

Read from the project's Identity Toolkit config, not held in this repository, so they may have changed since:

- The email action URL (`callbackUri`) is the default `https://spanion-flash-cards.firebaseapp.com/__/auth/action`.
- The console shows the custom sender domain in use: templates send from `noreply@flashcards.spanion.in` with sender
  name `FlashCards`. The API reads `useCustomDomain: true` but `customDomainState: NOT_STARTED`; the two disagree and
  nothing is inferred from the API field.
- Setting the action URL to `https://flashcards.spanion.in/__/auth/action` was refused with
  EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED, in the console and through the admin API; so was a PATCH setting
  `useCustomDomain: false` with `callbackUri`. Why is
  [an open question](../questions/email-action-url-refused.md).

## History

- 2026-11-06: recorded the project's email action URL and sender-domain settings, as read that day.
- 2026-11-05: the offline list named sign-in as refused offline, which the code never did (it shows Firebase's network error); removed. The authorised-domain rule now also covers the password reset link, because of the password reset plan.
- 2026-11-05: offline saves were refused and nothing was queued; now a persistent cache keeps them and they sync later, because of the offline-study plan. See [offline study](../features/offline-study.md).
- 2026-11-05: the emulators were always reached at `127.0.0.1`; now at the page's own loopback hostname, because Google sign-in on the Auth emulator failed silently from `localhost`.
- 2026-11-04: Google sign-in failed on unlisted domains; now it also needs the redirect URI, because sign-in is a redirect.

## Sources

- `src/services/firebase.ts`
- `src/services/emulatorHost.ts`
- `src/services/localCache.ts`
- `dev-ports.ts`
- `src/stores/session.ts`
- `src/stores/library.ts`
- `firebase.json`
- `.firebaserc`
- `package.json`
- `README.md`
