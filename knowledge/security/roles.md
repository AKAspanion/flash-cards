---
type: Security
title: Roles and access
description: There is one role, the signed-in owner; firestore.rules lets each user read and write only their own documents and checks the stored shape; the one public read is a shared set's copy, by its id.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Roles and access

## Roles

One: a signed-in user, who owns their own documents. There are no admins. The one public data is a set's shared copy,
which anyone, signed in or not, may read by its id ([sharing](../features/sharing.md)).

## What each may do

Enforced by `firestore.rules`, the only server-side check:

- `flash-card-sets/{setId}`: read and delete only if the stored `uid` is the caller's (`ownsStored`); create only if
  the new `uid` is the caller's and the shape is valid (`ownsIncoming`, `validSet`); update needs both, and may not
  change `id`.
- `labels/{labelId}`: the same ownership checks, and `label` must be a string. The rules allow `delete`, although
  labels are never deleted ([labels cannot be deleted](../decisions/labels-cannot-be-deleted.md)).
- `user-stats/{uid}`: only the user whose uid is the document id may `get`, `delete`, `create` or `update`, with only
  the keys `uid`, `goal`, `days`; `list` only for a query limited to their own uid ([data](../data/user-stats.md)).
- `shared-sets/{shareId}`: `get` by anyone; `list` only the owner's own filtered query; `create`, `update` and `delete`
  by the owner (`ownerUid`), exactly five fields, title at most 200 and cards at most 900,000 characters, `updatedAt`
  the server time; an update or delete of a missing copy is allowed for a signed-in caller
  ([data](../data/shared-sets.md), [why list is owner-filtered](../decisions/owned-collections-owner-list.md)).
- Anything else in the database is denied, since no other path is matched.
- A signed-out caller can do nothing (`signedIn`).

The app's own queries filter by `uid` (`fetchCardSets`, `fetchLabels`), which the rules require for a list query to
be allowed. Tested on the emulator by `tests/unit/firestore.rules.spec.ts`.

Rules are deployed only by hand, by decision ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)):
`deploy.yml` deploys them when run manually with `deploy_rules` ticked
([CI](../quality/ci.md)). The `user-stats` and `shared-sets` rules take effect only after that deploy; until then
stats writes and sharing are refused by the live rules.

## History

- 2026-11-05: there was no public data and two collections; now `user-stats` and `shared-sets` have rules and a shared copy is public by id, because of the progress-habits and sharing plans.

## Sources

- `firestore.rules`
- `src/services/firebase.ts`
- `tests/unit/firestore.rules.spec.ts`
- `.github/workflows/deploy.yml`
