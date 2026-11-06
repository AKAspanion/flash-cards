---
type: Open Question
title: Is Email Enumeration Protection on in the live Firebase project?
description: The password reset screen answers the same for every address, but a network observer only sees the same answer from Firebase when the project's Email Enumeration Protection is on; only the developer can check it in the console.
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T15:00:00Z }
---

# Is Email Enumeration Protection on in the live Firebase project?

## Question

Is Email Enumeration Protection turned on for the live Firebase project (Firebase console > Authentication >
Settings > User actions)? It is a project setting, not something this repository holds.

## Why it matters

[Password reset](../requirements/password-reset.md) asks that the screen doesn't reveal who is registered.
`sendPasswordReset` in `src/services/firebase.ts` swallows `auth/user-not-found` and `auth/user-disabled`, so the
screen is the same for every address. With protection off, Firebase's own response to `accounts:sendOobCode`
still differs for an unknown address, so someone reading the network traffic can tell. See
[the decision](../decisions/password-reset-uses-firebase-action-page.md) and [auth](../security/auth.md).

The same reply on an unauthorised origin (where the email is sent again without its continue link) also assumes
that Firebase checks the continue URL before it looks up the account. That order is undocumented.

## Status

Open

## Sources

- `src/services/firebase.ts`
