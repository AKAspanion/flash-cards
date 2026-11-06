---
type: Decision
title: Password reset uses Firebase's hosted action page
description: A password reset link opens Firebase's own action page to set the new password, then continues to /login, rather than an in-app reset screen.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
---

# Password reset uses Firebase's hosted action page

## Context

[Password reset](../requirements/password-reset.md) asks that a user can get a link to reset a forgotten password
from `/login`. The link can open either Firebase's hosted action page, where the user types the new password, or a
screen of the app's own that calls `confirmPasswordReset`.

## Decision

The link opens Firebase's hosted action page. The app sends the email with a continue URL of its own `/login`, so
the page's Continue button brings the user back to sign in. The developer approved this on 2026-11-05 with the
[password reset plan](../../docs/plans/2026-11-05-password-reset.md), over an in-app page.

## Consequences

- No new route, and no change to the email template's action URL in the Firebase console.
- The continue URL's host must be an authorised domain in Firebase Auth. Every host the app is served from already
  is, for [Google sign-in](google-sign-in-redirect.md).
- The page that sets the password looks like Firebase's, not the app's. An in-app page would need its own route
  and the console's action URL pointed at it.
- The same-reply promise ("sent" for every address) holds against someone watching the network only while the
  Firebase project's Email Enumeration Protection is on; without it, Firebase answers an unknown address with
  `auth/user-not-found`, which `sendPasswordReset` hides from the screen but not from the wire. Whether it is on
  is [an open question](../questions/email-enumeration-protection.md).
- On a host that isn't authorised, Firebase refuses the continue URL and the email is sent without it, so it still
  arrives but has no Continue button.

## History

- 2026-11-06: on a host that wasn't authorised the request failed with `auth/unauthorized-continue-uri`; now the email goes without a continue URL, because of the password reset continue-fallback plan.
