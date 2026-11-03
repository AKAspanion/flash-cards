---
type: Security
title: Roles and access
description: There is one role, the signed-in owner; firestore.rules lets each user read and write only documents whose uid is theirs, and checks the stored shape.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Roles and access

## Roles

One: a signed-in user, who owns their own documents. There are no admins, sharing or public data in the app.

## What each may do

Enforced by `firestore.rules`, the only server-side check:

- `flash-card-sets/{setId}`: read and delete only if the stored `uid` is the caller's (`ownsStored`); create only if
  the new `uid` is the caller's and the shape is valid (`ownsIncoming`, `validSet`); update needs both, and may not
  change `id`.
- `labels/{labelId}`: the same ownership checks, and `label` must be a string. The rules allow `delete`, although
  labels are never deleted ([labels cannot be deleted](../decisions/labels-cannot-be-deleted.md)).
- Anything else in the database is denied, since no other path is matched.
- A signed-out caller can do nothing (`signedIn`).

The app's own queries filter by `uid` (`fetchCardSets`, `fetchLabels`), which the rules require for a list query to
be allowed. Tested on the emulator by `tests/unit/firestore.rules.spec.ts`.

Rules are deployed only by hand, by decision ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)):
`deploy.yml` deploys them when run manually with `deploy_rules` ticked
([CI](../quality/ci.md)).

## Sources

- `firestore.rules`
- `src/services/firebase.ts`
- `tests/unit/firestore.rules.spec.ts`
- `.github/workflows/deploy.yml`
