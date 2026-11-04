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
- Emails are trimmed before they are sent to Firebase (`signInWithEmail`, `signUpWithEmail`).

## History

- 2026-11-04: Google sign-in was a popup; now a same-origin redirect, because a popup isn't dependable in the Android TWA. See [the decision](../decisions/google-sign-in-redirect.md).

## Sources

- `src/views/Login.vue`
- `src/router/index.ts`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `tests/unit/router.spec.ts`
- `tests/unit/authErrors.spec.ts`
- `tests/e2e/auth.spec.ts`
