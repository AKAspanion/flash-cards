---
type: Feature
title: Sign in and sign up
description: Email/password sign-in and sign-up, or Google sign-in by redirect, then a return to the page the user first asked for.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Sign in and sign up

## What it does

A visitor who is not signed in lands on `/login`. They can sign in with email and password, switch to sign-up
(email, password, repeat password), or sign in with Google, which leaves the page for Google and comes back to `/login`, whose guard sends the user on. On success they go to the page they first asked for, or
`/home`. Session handling is in [auth](../security/auth.md).

## Screens and routes

- `/login`: `src/views/Login.vue`. It is the only route that is neither `meta.requireAuth` nor `meta.public`; a signed-in
  user who opens it is sent on by `authRedirect` in `src/router/index.ts`. It links to the public
  [privacy and deletion pages](privacy-and-deletion-pages.md).

## Rules

- The return address comes from the `redirect` query and must pass `safeRedirect`: only same-app paths (starting
  with `/` but not `//`), otherwise `/home`. Tested in `tests/unit/router.spec.ts`.
- Sign-up needs a password of at least `MIN_PASSWORD = 6` characters with no spaces, entered twice the same.
- The form validates on submit instead of disabling the button, because password-manager autofill often doesn't fire
  input events (comment in `Login.vue`).
- Firebase errors are shown as translated messages through `authErrorMessage` (`src/services/authErrors.ts`);
  a failed Google redirect's error is read at start-up and shown on `/login`.
- Google sign-in is a redirect: see [Google sign-in uses a same-origin redirect](../decisions/google-sign-in-redirect.md).
- The email field auto-focuses only when `(pointer: coarse)` doesn't match: a touch keyboard opening over the screen hides it.
- Signing in and signing up need the device online ([offline study](offline-study.md)), but `Login.vue` has no
  offline check: offline, the user sees Firebase's network error through `authErrorMessage`, not the offline-save
  snack. A visitor who pressed Add to my library on a shared link while signed out
  comes back through `/login?redirect=/s/<id>` and the copy finishes once ([sharing](sharing.md)).
- A third mode, reset, opens from "Forgot password?" and sends a reset link ([requirement](../requirements/password-reset.md),
  [decision](../decisions/password-reset-uses-firebase-action-page.md)). Any address gets the same snack, then the
  screen returns to sign-in with the email kept. It checks only the address's shape with a loose one-`@` pattern
  (`rules.emailShape`), because the Auth emulator answers a malformed address as unknown. While a request is in
  flight the mode links are disabled, so the mode can't change under it. Errors a user can't fix (the project's
  setup or sending quota) show `auth.error.reset-unavailable`; a missing email shows `email.enter`.
- When Firebase refuses the reset email's continue link (`auth/unauthorized-continue-uri`, `auth/invalid-continue-uri`),
  the email is sent again without it, so it still arrives, only with no Continue button back to `/login`. The reply
  stays the same for every address, and the fallback logs nothing (the app has no remote logging, so a line would
  reach only the user's own browser). Verification and reset share one helper, `withContinueFallback`
  (`src/services/firebase.ts`).
- Emails are trimmed before they are sent to Firebase (`signInWithEmail`, `signUpWithEmail`).
- Email sign-up sends a verification email (`signUpWithEmail`); a failed send never fails the sign-up and is logged by
  error code only, since the error's data can carry the address. The success snack tells the user to check their
  inbox, or says only that the account was created when the email didn't send. The reminder is
  [email verification](email-verification.md).

## History

- 2026-11-06: a refused continue link made the reset email fail; now it is sent again without the link, because of the password reset continue-fallback plan.
- 2026-11-05: sign-up sent no email and the snack only said the account was created; now it sends a verification email and the snack says to check the inbox, because of the email-verification plan.
- 2026-11-05: this concept said sign-in refuses offline with the offline-save snack, which `Login.vue` never did; corrected to say it shows Firebase's network error. Also gained the reset mode, because of the password reset plan.
- 2026-11-05: sign-in had no offline rule and no shared-link return; now it is online-only and a signed-out Add to my library returns through it, because of the offline-study and sharing plans.
- 2026-11-04: the email field always auto-focused; now only with a fine pointer, because a phone's keyboard hid the screen.
- 2026-11-04: Google sign-in was a popup; now a same-origin redirect, because a popup isn't dependable in the Android TWA. See [the decision](../decisions/google-sign-in-redirect.md).

## Sources

- `src/views/Login.vue`
- `src/router/index.ts`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `tests/unit/emailVerification.spec.ts`
- `tests/unit/router.spec.ts`
- `tests/unit/authErrors.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/password-reset.spec.ts`
- `tests/unit/passwordReset.spec.ts`
