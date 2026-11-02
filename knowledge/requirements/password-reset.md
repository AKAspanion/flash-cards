---
type: Requirement
title: Password reset
description: Users who signed up with email and password must be able to reset a forgotten password from the login screen.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
---

# Password reset

## Requirement

Add a "forgot password" flow for email-and-password accounts. Today `src/views/Login.vue` offers sign-in and
sign-up only. Asked for by the developer on 2026-11-03.

## Acceptance

- From `/login`, a user enters their email address and receives a link to reset their password.
- The screen gives the same reply whether or not the address has an account, so it doesn't reveal who is
  registered.
- Errors are shown through the auth error mapping (`src/services/authErrors.ts`), in English and Hindi.
- Covered by an e2e test against the Auth emulator.

## Sources

- `src/views/Login.vue`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
