---
type: Requirement
title: Password reset
description: Users who signed up with email and password must be able to reset a forgotten password from the login screen.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
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

## How it is met

- `sendPasswordReset` (`src/services/firebase.ts`) sends Firebase's reset email and resolves for an unknown or
  disabled account, so the reply is the same. Its link opens Firebase's action page
  ([decision](../decisions/password-reset-uses-firebase-action-page.md)).
- The reset mode of `src/views/Login.vue` ([sign in](../features/sign-in.md)) asks for the address and shows one
  snack for any address; `tests/e2e/password-reset.spec.ts` covers it against the Auth emulator.
- Whether the reply is also the same on the wire depends on the Firebase project's Email Enumeration Protection:
  [an open question](../questions/email-enumeration-protection.md).

## History

- 2026-11-05: the flow was only asked for; now it is built, because of the password reset plan.

## Sources

- `src/views/Login.vue`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `tests/unit/passwordReset.spec.ts`
- `tests/e2e/password-reset.spec.ts`
