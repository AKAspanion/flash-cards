---
type: Decision
title: Labels are deleted only with the account
description: The app never deletes a single label, but firestore.rules keeps the owner's delete on labels so that deleting an account can remove its labels from the browser.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:41:08Z }
---

# Labels are deleted only with the account

## Context

[Labels cannot be deleted](labels-cannot-be-deleted.md) settled that users create and rename labels but never
delete them, and suggested removing `delete` from the `labels/{labelId}` rule to match. But
[account deletion](../requirements/account-deletion-and-export.md) must remove every document whose `uid` is the
user's, labels included, and the app talks to Firestore straight from the browser. Without `delete` in the rule,
labels could only be removed on the server, by a second Cloud Function.

## Decision

The app offers no way to delete a single label. `firestore.rules` keeps `allow read, delete: if ownsStored();` on
`labels/{labelId}`, so account deletion can remove the user's labels from the browser. The developer chose this on
2026-11-03, over removing `delete` and clearing labels in a Cloud Function.

## Consequences

- Only the owner can delete a label, so the most anyone can do is delete their own label with their own tools. A
  set that still carries a deleted label's id doesn't show it, because screens only show labels that exist
  (`setLabels` in `src/views/Add.vue` and `src/views/View.vue`, `labels` in `src/components/CardFlashSet.vue`).
- Account deletion needs no server code for labels.
- `delete` in the labels rule is intended, not debt.

## Sources

- `firestore.rules`
- `src/services/firebase.ts`
- `src/views/Add.vue`
- `src/views/View.vue`
- `src/components/CardFlashSet.vue`
