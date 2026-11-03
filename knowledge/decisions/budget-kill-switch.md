---
type: Decision
title: Unlink billing when the monthly budget is spent
description: Because the Blaze plan has no spending cap, a Cloud Function unlinks the billing account once actual spend reaches the budget, dropping the project to the free Spark limits.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Unlink billing when the monthly budget is spent

## Context

The Firebase project is on the Blaze plan, which has no spending cap (README, "Budget kill switch").

## Decision

`billingKillSwitch` listens to the monthly budget's notifications and, once actual spend (`costAmount`) reaches
`budgetAmount`, sets the project's billing account to empty, which unlinks billing (`enforceBudget` in
`functions/src/killSwitch.ts`). Forecast alerts don't trigger it. It runs as a dedicated service account that holds
only Project Billing Manager on this project.

The monthly budget is 5 USD (stated by the developer on 2026-11-03). It is set in the Cloud Billing console, not
in this repository.

## Consequences

- Without billing the project falls back to the free Spark limits: Hosting, Auth and Firestore keep working within
  the free quota, and anything beyond it stops instead of being charged.
- Cloud Billing reports spend hours late, so the bill can end slightly over the budget.
- Turning billing back on means raising the budget first, then re-linking; re-linking while still over budget turns
  it off again at the next notification.
- Setup is manual and one-time (service account, Billing API, the Cloud Run Invoker grant, connecting the budget
  to `budget-alerts`): the README's steps are the runbook. Never publish a test message with `costAmount` at or
  above `budgetAmount`.

## Sources

- `README.md`
- `functions/src/index.ts`
- `functions/src/killSwitch.ts`
- `tests/unit/killSwitch.spec.ts`
