---
type: Application
title: Cloud Functions
description: The functions/ codebase deployed to Firebase, holding one Pub/Sub-triggered function, billingKillSwitch, that unlinks billing when the monthly budget is spent.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Cloud Functions

## Role

Protects the Firebase project (on the pay-as-you-go Blaze plan) from runaway cost. Why it exists and what it does
on firing is in [budget kill switch](../decisions/budget-kill-switch.md).

## Stack

TypeScript compiled by `tsc` to `functions/lib/`, using `firebase-functions` (v2 Pub/Sub trigger) and
`@google-cloud/billing`; versions and the Node runtime are in `functions/package.json`. It installs with pnpm on
its own, with its own `pnpm-lock.yaml` and `pnpm-workspace.yaml`
([pnpm](../decisions/pnpm-package-manager.md)), and is built and audited separately in CI ([CI](../quality/ci.md)).

## Entry points

- `functions/src/index.ts` exports `billingKillSwitch`: `onMessagePublished` on topic `budget-alerts`, with its
  region, service account and `maxInstances` set in the same call.
- `functions/src/killSwitch.ts` holds the decision logic (`parseNotification`, `enforceBudget`), free of SDK
  imports so `tests/unit/killSwitch.spec.ts` tests it from the root.
- `firebase.json` `functions` block: the source folder and the `predeploy` build.

## Screens and routes

None: the function is triggered by Pub/Sub, not HTTP.

## Depends on

- [Cloud Billing](../integrations/cloud-billing.md) API and the `budget-alerts` Pub/Sub topic.
- A dedicated service account, `billing-kill-switch@`, set up by hand as the README's "Budget kill switch" section
  describes.

## History

- 2026-11-04: installed with npm from its own `package-lock.json`; now pnpm with its own `pnpm-lock.yaml`, as the developer switched. See [pnpm](../decisions/pnpm-package-manager.md).

## Sources

- `functions/src/index.ts`
- `functions/src/killSwitch.ts`
- `functions/package.json`
- `functions/tsconfig.json`
- `firebase.json`
- `tests/unit/killSwitch.spec.ts`
- `README.md`
