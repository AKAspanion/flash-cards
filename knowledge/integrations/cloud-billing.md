---
type: Integration
title: Cloud Billing and budget alerts
description: The kill-switch function reads budget notifications from Pub/Sub and calls the Cloud Billing API to check and unlink the project's billing account.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Cloud Billing and budget alerts

## What it is used for

[The budget kill switch](../decisions/budget-kill-switch.md): a Cloud Billing budget publishes notifications to the
Pub/Sub topic `budget-alerts`; `billingKillSwitch` reads them and, when spend reaches the budget, calls
`getProjectBillingInfo` and `updateProjectBillingInfo` through `CloudBillingClient`.

## Configuration

- Topic, region, service account and instance limit: the `onMessagePublished` options in `functions/src/index.ts`.
- The project id comes from `projectID` (Firebase params), falling back to `GCLOUD_PROJECT`.
- One-time console setup (service account with Project Billing Manager, the Billing API, the Cloud Run Invoker
  grant, connecting the budget to the topic) is the README's "Budget kill switch" section.

## Failure modes

- A message that isn't a budget notification is logged and ignored (`parseNotification` returns null).
- Without the Cloud Run Invoker grant, Pub/Sub can't call the function; the logs show `lacks {run.routes.invoke}`
  (README).
- If billing is already off, the function does nothing (`already-disabled`).
- Spend is reported hours late, so the switch can fire after the budget is passed.

## Sources

- `functions/src/index.ts`
- `functions/src/killSwitch.ts`
- `tests/unit/killSwitch.spec.ts`
- `README.md`
