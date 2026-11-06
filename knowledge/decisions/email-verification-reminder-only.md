---
type: Decision
title: Email verification is a reminder, not a gate
description: An unverified user uses the whole app and sees a reminder banner, always on /profile and on Home until dismissed for 7 days; nothing reads emailVerified to allow or refuse anything.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T13:15:00Z }
---

# Email verification is a reminder, not a gate

## Context

[Verify email addresses by link](../requirements/email-verification.md) left open what an unverified user may do:
use the app freely, see a reminder, or be blocked.

## Decision

- An unverified user uses the app freely and sees a reminder banner
  ([email verification reminder](../features/email-verification.md)), on two screens only:
  - `/profile` shows it always until the email is verified, with Resend email and I've verified, as before.
  - Home shows it with Resend email and Dismiss. Dismiss quietly checks whether the email is now verified: if it is,
    the banner is gone everywhere; if not, the dismissal time is kept in the browser's `localStorage` and Home shows
    the banner again 7 days later.
  - No other screen shows it.
- Verification gates nothing: no Firestore rule, route or Cloud Function reads `emailVerified`
  ([authentication](../security/auth.md)).

## Consequences

- Reasons: it mirrors the splitify app's verify-email banner, as the developer asked on 2026-11-05; and blocking
  would lock out every existing email account that never verified.
- Verification is a nudge only. If something later has to depend on it, that is a new decision, with its rules and
  a way for existing unverified accounts to get through.

## Assumed

Recorded from the approved plan and the run's rulings, not from a quoted statement of the developer; it stays a
draft until `/ga:knowledge-review` confirms it. The banner's placement, Dismiss and the 7-day wait are the
developer's own words of 2026-11-06 ("show a dismiss button instead of i have verified button, this persistent banner
should show up in profile alwasy but in home page show once, after dismiss show in 7 days keep dates in
localstorage"; "when dismissed is clicked, quietly check if the email is verified if yes good, if not save 7days timer
to reshow the banner in home screen. in profile page it is persistent always until verified"; screens: "Profile and
Home only"). That the gate-nothing rule still holds is assumed.

## History

- 2026-11-06: the banner showed on every signed-in screen except the full-height ones, with I've verified; now it shows
  always on `/profile` and on Home until dismissed, then again after 7 days, because the developer found it too
  persistent.

## Sources

- `docs/plans/2026-11-05-email-verification.md`
- `src/router/index.ts`
- `src/App.vue`
