---
type: Decision
title: Email verification is a reminder, not a gate
description: An unverified user uses the whole app and sees a reminder banner; nothing reads emailVerified to allow or refuse anything, and the banner stays off the full-height study and editor routes.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T13:15:00Z }
---

# Email verification is a reminder, not a gate

## Context

[Verify email addresses by link](../requirements/email-verification.md) left open what an unverified user may do:
use the app freely, see a reminder, or be blocked.

## Decision

- An unverified user uses the app freely and sees a reminder banner on signed-in screens
  ([email verification reminder](../features/email-verification.md)).
- Verification gates nothing: no Firestore rule, route or Cloud Function reads `emailVerified`
  ([authentication](../security/auth.md)).
- The banner is kept off the routes with `meta.fullHeight` (`/add`, `/:id/edit`, `/:id/view`, `/due`), whose layouts
  assume the top bar starts at the top of the screen.

## Consequences

- Reasons: it mirrors the splitify app's verify-email banner, as the developer asked on 2026-11-05; and blocking
  would lock out every existing email account that never verified.
- Verification is a nudge only. If something later has to depend on it, that is a new decision, with its rules and
  a way for existing unverified accounts to get through.

## Assumed

Recorded from the approved plan and the run's rulings, not from a quoted statement of the developer; it stays a
draft until `/ga:knowledge-review` confirms it.

## Sources

- `docs/plans/2026-11-05-email-verification.md`
- `src/router/index.ts`
- `src/App.vue`
