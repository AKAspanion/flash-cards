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
- Offline: saves from the editor and study screens are refused with a snack; nothing is queued.
- Google sign-in fails on a domain not listed under Authorized domains in Firebase Auth, or whose `/__/auth/handler`
  isn't a redirect URI on the OAuth web client (README, "Domains"; [decision](../decisions/google-sign-in-redirect.md)).
- Account deletion batches Firestore deletes of 500 per commit, then deletes the Auth user
  ([Delete account](../features/account-deletion.md)).

## History

- 2026-11-05: the emulators were always reached at `127.0.0.1`; now at the page's own loopback hostname, because Google sign-in on the Auth emulator failed silently from `localhost`.
- 2026-11-04: Google sign-in failed on unlisted domains; now it also needs the redirect URI, because sign-in is a redirect.

## Sources

- `src/services/firebase.ts`
- `src/services/emulatorHost.ts`
- `dev-ports.ts`
- `src/stores/session.ts`
- `src/stores/library.ts`
- `firebase.json`
- `.firebaserc`
- `package.json`
- `README.md`
