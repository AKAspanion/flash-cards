---
type: Decision
title: Google sign-in uses a popup, not a redirect
description: signInWithPopup is used because browsers that partition third-party storage break signInWithRedirect when the app isn't served from the auth domain.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Google sign-in uses a popup, not a redirect

## Context

The app is served from two addresses (the custom domain and the `.web.app` one, per the README), while Google's
sign-in runs on the auth domain set in `VUE_APP_AUTH_DOMAIN`.

## Decision

`signInWithGoogle` calls `signInWithPopup`. The comment in `src/services/firebase.ts` gives the reason: browsers that
partition third-party storage break `signInWithRedirect` when the app is not served from the authDomain.

## Consequences

- A blocked popup is reported as `auth/popup-blocked`, and a closed one is ignored (`src/services/authErrors.ts`).
- The CSP's `frame-src` in `firebase.json` allows the auth domain, and `Cross-Origin-Opener-Policy` is
  `same-origin-allow-popups`, so the popup can report back.
- Each domain the app is opened from must be an authorised domain in Firebase Auth (README, "Domains").

## Sources

- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `firebase.json`
- `README.md`
