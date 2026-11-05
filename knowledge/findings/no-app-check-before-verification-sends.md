---
type: Finding
title: No App Check in front of sign-up and verification emails
description: Anyone with the public web API key can script sign-ups and verification sends to addresses they don't own; only Firebase's own throttling bounds it, and a drained email quota would make legitimate sends fail.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# No App Check in front of sign-up and verification emails

## Finding

Each sign-up and each resend now sends mail from the project's sender. A script using the public web API key can call
`accounts:signUp` and `accounts:sendOobCode` directly (the banner's cooldown isn't in that path) and mail third
parties. Firebase throttles per IP and per user, not per recipient domain across accounts, so sustained abuse could
spend the daily email quota, after which real verification sends fail with `auth/quota-exceeded`, and could hurt the
sender's reputation. Nothing is gated on verification and a failed send never blocks sign-up, so users keep working
([authentication](../security/auth.md)).

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-security-reviewer.md`, Minor 2: "sign-up now sends mail to any
  address, with no App Check or CAPTCHA in front of it"; no `initializeAppCheck` anywhere in `src`.
- Ledger: `Final review: minor (deferred): no App Check in front of verification sends; Firebase throttling caps abuse`.

## Status

Open. Follow-ups: Firebase App Check (reCAPTCHA Enterprise) on Auth, and an alert on the Auth email quota.

## Sources

- `src/services/firebase.ts`
