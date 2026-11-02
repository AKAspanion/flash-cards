---
type: Requirement
title: Verify email addresses by link
description: New email-and-password accounts must verify their address through a link sent by email.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
---

# Verify email addresses by link

## Requirement

When someone signs up with email and password, send them a verification link, and treat the address as verified
only once they open it. Today sign-up (`signUpWithEmail` in `src/services/firebase.ts`) sends nothing. Asked for
by the developer on 2026-11-03.

## Acceptance

- A verification email is sent on sign-up, and the user can ask for it again.
- What an unverified user may do before verifying (use the app freely, see a reminder, or be blocked) is decided
  when this is designed.
- Google sign-ins already come with a verified address, and are not asked to verify again.
- Covered by an e2e test against the Auth emulator.

## Sources

- `src/services/firebase.ts`
- `src/views/Login.vue`
- `src/router/index.ts`
