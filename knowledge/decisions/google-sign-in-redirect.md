---
type: Decision
title: Google sign-in uses a same-origin redirect
description: Google sign-in uses signInWithRedirect with the auth domain set to the host serving the app, so it needs neither popups nor cross-site storage and works inside the Android TWA.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:33:32Z }
---

# Google sign-in uses a same-origin redirect

## Context

[Google sign-in uses a popup](google-sign-in-popup.md) chose `signInWithPopup` because `signInWithRedirect` breaks
in browsers that partition third-party storage when the app isn't served from the auth domain. The app is also
going to ship as an [Android TWA](../requirements/android-twa.md). Inside a TWA a popup can open as a separate tab
that never reports back to the app, so popup sign-in isn't dependable there. The developer asked for a method that
works inside the TWA.

## Decision

Google sign-in uses `signInWithRedirect` everywhere, with the auth domain chosen at runtime as the host serving the
app. Firebase Hosting serves its `/__/auth/*` helper pages on every connected domain, so Google returns to the same
origin, and no popup or cross-site storage is involved. This is the approach Firebase documents for redirect sign-in.
The developer chose it on 2026-11-04, over keeping the popup in browsers with a redirect only inside the TWA (two code
paths, and the TWA can only be detected reliably on its first page) and over native Android sign-in (custom Kotlin
that Bubblewrap overwrites on every regeneration).

## Consequences

- The app calls `getRedirectResult` when it loads, to show a failed sign-in's error; the session itself arrives
  through the usual auth listener.
- Local development against the real project (the developer chose to keep Google sign-in working there) proxies `/__/auth` from the Vite dev server to the project's
  `firebaseapp.com` helper, and needs `http://localhost:8080/__/auth/handler` as a redirect URI on the OAuth web
  client.
- Every host the app is served from must be an authorised redirect URI on the Google OAuth web client
  (`https://<host>/__/auth/handler`) and an authorised domain in Firebase Auth.
- Inside the TWA, Google's sign-in page shows with a browser bar while it's open, because it is off the verified
  origin.
- Popup errors no longer arise.
- Sign-in still has to be tried on a real Android device before each Play submission.
