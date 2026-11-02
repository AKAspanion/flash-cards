---
type: Security
title: Authentication
description: Firebase Auth (email/password and Google) holds the session; a router guard sends signed-out users to /login, and a watcher follows sign-in changes from other tabs.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Authentication

## How users sign in

Through Firebase Auth, from the [sign-in feature](../features/sign-in.md): `signInWithEmail`, `signUpWithEmail` and
`signInWithGoogle` in `src/services/firebase.ts`. Which providers are enabled is set in the Firebase console, not in
this repository.

## Tokens and sessions

- Firebase's web SDK stores and refreshes the session itself; the app never handles tokens. Firestore calls carry
  the user's ID token automatically, and [the rules](roles.md) check `request.auth.uid`.
- `router.beforeEach` (`src/router/index.ts`) waits for the saved session to be restored (`getAuthUser`, which awaits
  `authStateReady`) before every navigation, then applies `authRedirect`: a route with `meta.requireAuth` sends a
  signed-out user to `/login?redirect=<path>`, and `/login` sends a signed-in user on.
- Every route except `/login` has `meta.requireAuth` (the `routes` array in the same file). The guard only hides
  screens; the data is protected by the Firestore rules.
- `watchAuthChanges` reacts to sign-in or sign-out outside navigation (another tab, a revoked token): it swaps the
  loaded library and moves to `/login` or `/home`.
- Service calls fail with "You are signed out" when there is no current user (`requireUid`).

## Sources

- `src/services/firebase.ts`
- `src/router/index.ts`
- `src/stores/session.ts`
- `tests/unit/router.spec.ts`
- `tests/e2e/auth.spec.ts`
