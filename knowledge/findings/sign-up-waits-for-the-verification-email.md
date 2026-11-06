---
type: Finding
title: Sign-up waits for the verification email before navigating
description: signUpWithEmail awaits the email send after the account exists, so on a slow link the Sign up button keeps spinning although the user is already signed in.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# Sign-up waits for the verification email before navigating

## Finding

`Login.vue` awaits `signUpWithEmail`, which awaits `sendEmailVerification` after the account already exists
([sign in](../features/sign-in.md)). On a slow connection the button spins until the SDK's own request deadline, though
the user is already signed in. The plan's interface asked for this and the SDK has a deadline, so it is slow, not stuck.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-reviewer.md`, Minor 3: "Sign-up now waits on the email send
  before it navigates" (`src/views/Login.vue:198-201`, `src/services/firebase.ts:140-143`).
- Ledger: `Final review: minor (deferred): sign-up waits for the email send before navigating`.

## Status

Open. If it matters, navigate first and show the send result in the snack afterwards.

## Sources

- `src/views/Login.vue`
- `src/services/firebase.ts`
