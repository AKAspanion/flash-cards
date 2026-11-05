---
type: Finding
title: Switching to or from reset on the login screen drops keyboard focus
description: Forgot password? and Back to login remove themselves when pressed, so keyboard focus falls to the page body and a keyboard or screen-reader user starts tabbing from the top again.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T13:30:00Z }
---

# Switching to or from reset on the login screen drops keyboard focus

## Finding

On `/login`, the `Forgot password?` and `Back to login` link buttons are each shown with `v-if` for one mode only
([sign-in](../features/sign-in.md)). Pressing one switches the mode and removes the button that had focus, so focus
falls to `<body>`. A keyboard or screen-reader user has to tab from the top of the page again to reach the email
field. The sign-up toggle keeps its button across modes, so it doesn't have the problem.

## Evidence

- Final review of the password reset run, `.ga/runs/2026-11-05-password-reset/reviews/final-final-reviewer.md`,
  Minor 1: "`Forgot password?` and `Back to login` remove themselves with `v-if` when pressed, so focus falls to
  `<body>`" (`src/views/Login.vue:77-100`).
- Deferred as a Minor in the run's ledger, kept in
  [the run's record](../../docs/plans/2026-11-05-password-reset.record.md), because the fix wave was kept to the
  Important findings and the guards.

## Status

Open. The reviewer's suggestion: after a click, focus the email field in `setMode` once `nextTick` has run.
[Accessibility](../design-system/accessibility.md) rules apply.

## Sources

- `src/views/Login.vue`
