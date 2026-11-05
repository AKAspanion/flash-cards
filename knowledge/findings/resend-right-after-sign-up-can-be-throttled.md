---
type: Finding
title: Resend email right after sign-up can hit Firebase's throttle
description: The 60 s resend cooldown starts only after a banner Resend, not after the sign-up's own email, so pressing Resend within seconds of signing up can show "Too many attempts".
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# Resend email right after sign-up can hit Firebase's throttle

## Finding

Sign-up has already sent a verification email, but the banner's cooldown starts only after its own Resend
([email verification](../features/email-verification.md)). A user who presses Resend within seconds of signing up can
meet Firebase's per-user throttle and see "Too many attempts" where a disabled button would have said the same more
kindly. The emulator doesn't throttle, so the e2e test can't show it.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-reviewer.md`, Minor 2: "`BannerVerifyEmail.vue:71-91` starts
  the cooldown only after a banner Resend, but sign-up has just sent an email (`src/services/firebase.ts:143`)."
- Ledger: `Final review: minor (deferred): sign-up's own email isn't covered by the resend cooldown`.

## Status

Open. A fix would start the cooldown on mount when the account is under 60 s old and `verificationSent` was true.

## Sources

- `src/components/BannerVerifyEmail.vue`
- `src/services/firebase.ts`
