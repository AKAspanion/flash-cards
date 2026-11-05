---
type: Security
title: Authentication
description: Firebase Auth (email/password and Google) holds the session; a router guard sends signed-out users to /login, and a watcher follows sign-in changes from other tabs.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Authentication

## How users sign in

Through Firebase Auth, from the [sign-in feature](../features/sign-in.md): `signInWithEmail`, `signUpWithEmail` and
`signInWithGoogle` in `src/services/firebase.ts`. The Firebase auth domain is the host serving the app
(`authDomainFor` in `src/services/authDomain.ts`), so Google's redirect returns to the same origin; emulators and
non-browser runs use the configured one ([decision](../decisions/google-sign-in-redirect.md)). Which providers are enabled is set in the Firebase console, not in
this repository.

## Tokens and sessions

- Firebase's web SDK stores and refreshes the session itself; the app never handles tokens. Firestore calls carry
  the user's ID token automatically, and [the rules](roles.md) check `request.auth.uid`.
- `router.beforeEach` (`src/router/index.ts`) waits for the saved session to be restored (`getAuthUser`, which awaits
  `authStateReady`) before every navigation, then applies `authRedirect`: a route with `meta.requireAuth` sends a
  signed-out user to `/login?redirect=<path>`, and `/login` sends a signed-in user on.
- Every route except `/login` has `meta.requireAuth`, apart from the routes with `meta.public` (`/privacy`,
  `/delete-account`, `/s/:shareId`), which anyone can open (the `routes` array in the same file). The guard only hides
  screens; the data is protected by the Firestore rules.
- `watchAuthChanges` reacts to sign-in or sign-out outside navigation (another tab, a revoked token): it swaps the
  loaded library and moves to `/login` or `/home`; a tab that sees the user signed out elsewhere loads `/login` as a
  new page.
- Sign-out (`signOutAndClear`) waits up to `SIGN_OUT_DEADLINE_MS` for unsynced writes, clears the device cache, then
  signs out; past the deadline the user stays signed in and is told to connect
  ([offline study](../features/offline-study.md)). Signing in, up, or changing the profile needs the device online.
- `getRedirectResult` runs once at start-up, through `session.loadRedirectOutcome` called from `src/main.ts`, before
  the first navigation settles on `/login`.
- `sendPasswordReset` sends Firebase's reset email with `<origin>/login` as the continue URL and resolves on
  `auth/user-not-found` and `auth/user-disabled`, so the screen doesn't reveal who is registered. Against a network
  observer that holds only while the project's Email Enumeration Protection is on:
  [open question](../questions/email-enumeration-protection.md).
- Service calls fail with "You are signed out" when there is no current user (`requireUid`).

## History

- 2026-11-05: there was no password reset; now `sendPasswordReset` sends one with the same reply for every address, because of the password reset plan. See [the decision](../decisions/password-reset-uses-firebase-action-page.md).
- 2026-11-05: sign-out ended at once and left the cache; now it waits for unsynced writes (15 s at most), clears the device cache and stays signed in past the deadline, and `/s/:shareId` is a third public route, because of the offline-study and sharing plans.
- 2026-11-04: Google sign-in used a popup and every route but `/login` needed sign-in; now a redirect on the app's own host, with two public routes. See [the decision](../decisions/google-sign-in-redirect.md).

## Sources

- `src/services/firebase.ts`
- `src/router/index.ts`
- `src/stores/session.ts`
- `src/services/authDomain.ts`
- `src/main.ts`
- `tests/unit/router.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/unit/passwordReset.spec.ts`
