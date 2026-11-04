---
type: Feature
title: Profile and labels
description: The profile screen — display name and photo URL, account dates, sign out — which is also where labels are created and renamed.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Profile and labels

## What it does

`/profile` shows the user's photo, name, email, when they joined and last signed in. They can edit their display
name and photo URL, create a label, select a label to rename it, sign out, and [delete their account](account-deletion.md).

## Screens and routes

- `/profile`: `src/views/Profile.vue`, reached from the home top bar and from the menu's "Labels" entry.

## Rules

- Profile changes go to Firebase Auth through `updateUserProfile`, which sends only changed fields and clears a
  field left empty.
- Labels are created with `library.createLabel` and renamed with `library.renameLabel`; labels are never deleted
  ([labels cannot be deleted](../decisions/labels-cannot-be-deleted.md)).
- Signing out goes to `/login`; the router's auth watcher clears the loaded library
  ([auth](../security/auth.md)).

## History

- 2026-11-04: gained a Delete account action. See [Delete account](account-deletion.md).
- 2026-11-03: label deletion was an open question; now decided against. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md).

## Sources

- `src/views/Profile.vue`
- `src/services/firebase.ts`
- `src/stores/library.ts`
- `src/stores/session.ts`
