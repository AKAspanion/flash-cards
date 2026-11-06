---
type: Feature
title: Email verification reminder
description: Email sign-up sends a verification email, and a banner on signed-in screens reminds unverified users with Resend email and I've verified actions; it gates nothing.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# Email verification reminder

## What it does

Signing up with email and password sends a Firebase verification email ([sign in](sign-in.md)). While the signed-in
user's email is unverified, a banner at the top of the screen says so and offers **Resend email** and **I've
verified**. It is a reminder only: no Firestore rule, route or function reads `emailVerified`
([authentication](../security/auth.md)); why it gates nothing is in
[reminder only](../decisions/email-verification-reminder-only.md).

## Rules

- The banner shows on a route only when it has `meta.requireAuth` and not `meta.fullHeight`, while
  `session.user.emailVerified` is false. It is mounted once in `App.vue`
  ([components](../design-system/components.md)).
- Routes with `meta.fullHeight` (`/add`, `/:id/edit`, `/:id/view`, `/due`) never show it. Those screens size their
  cards and editor against the viewport (`calc(100vh - …)`), assuming the top bar starts at the top of the screen, so
  a banner above them pushes the rating buttons and the Options panel under the bars. This departs from the plan's
  "every signed-in screen" (the run's ruling) and matches the rule of no ads while studying
  ([ads](../decisions/adsense-banner-ads.md)). To show it everywhere, those layouts would have to subtract the
  banner's height. What the flag means is commented on `RouteMeta` in `src/router/index.ts`.
- The email carries a continue link to `/home` on the app's own origin (`continueTo` in `src/services/firebase.ts`),
  so Firebase's page offers a Continue button back to the app. After Continue the banner stays until **I've
  verified** is pressed, because the page load keeps the cached user.
- If Firebase refuses that link (`auth/unauthorized-continue-uri`, `auth/invalid-continue-uri`, for example on an
  origin missing from the authorised domains), the send is retried once without it, so the email still goes out,
  without a Continue button. Any other send error is not retried. The password reset email uses the same helper
  (`withContinueFallback`, [sign-in](sign-in.md)).
- Resend email is followed by a cooldown of `RESEND_COOLDOWN_SECONDS = 60` seconds on the button, so presses don't
  run into Firebase's rate limit. The sign-up's own email is not counted in it.
- I've verified reloads the user from Firebase; once verified the banner goes away. Both actions need the server and
  refuse offline with the offline-save snack ([offline study](offline-study.md)); errors reach the user through
  `authErrorMessage`.
- Google users arrive verified and never see it. Email accounts that existed before this and never verified do.
- A resend or check whose signed-in user changed while it ran is dropped silently, so one user's result never marks
  another verified or says an email was sent.
- The banner is a `role="region"` named by its text and has no live region: its Resend button counts down every
  second, and a live region around it was re-announced on each tick. Results reach screen readers through the snack.

## History

- 2026-11-06: the email had no continue link; now it continues to `/home` and retries once without the link when Firebase refuses it, because Firebase's page offered no way back to the app.
- 2026-11-05: planned for every signed-in screen with a status live region; built as a region that skips the full-height screens, because the countdown was re-announced every second and the banner broke those layouts.

## Sources

- `src/components/BannerVerifyEmail.vue`
- `src/stores/account.ts`
- `src/services/firebase.ts`
- `src/router/index.ts`
- `src/App.vue`
- `tests/unit/BannerVerifyEmail.spec.ts`
- `tests/unit/account.spec.ts`
- `tests/unit/emailVerification.spec.ts`
- `tests/e2e/verify-email.spec.ts`
- `docs/plans/2026-11-05-email-verification.md`
