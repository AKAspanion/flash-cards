---
type: Decision
title: Labels cannot be deleted
description: Users create and rename labels but never delete them, so a set never points at a label that no longer exists.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
superseded_by: decisions/labels-deleted-only-with-account
status: superseded
---

# Labels cannot be deleted

## Context

`firestore.rules` allowed the owner to delete a label, but the app had no delete call or screen for it, and sets
refer to labels by document id (`CardSet.labels`). This was the open question
[label deletion](../questions/label-deletion.md).

## Decision

Deleting labels is not possible. The developer decided this on 2026-11-03. Labels can be created and renamed only.

## Consequences

- No delete function or screen is added for labels.
- Sets can't end up holding the ids of deleted labels, so no cleanup is needed.
- `firestore.rules` still has `allow read, delete` on `labels/{labelId}`, so a client calling Firestore
  directly could still delete one. Removing `delete` there would make the rules match this decision.

## Sources

- `firestore.rules`
- `src/services/firebase.ts`
- `src/views/Profile.vue`
- `src/types.ts`
