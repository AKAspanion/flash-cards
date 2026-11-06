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

## Layout

The sheet is grouped under two `h2` headings: a Labels section (create and rename labels) and an Account section
(member since, last login, delete account). Sign out stays below them. The old `profile.label.title` text was removed.
The headings use the default text colour: the brand pink on the grey `surface-light` sheet is 3.29:1, below the 4.5:1
the axe scan in `tests/e2e/a11y.spec.ts` requires ([accessibility](../design-system/accessibility.md)).

## Screens and routes

- `/profile`: `src/views/Profile.vue`, reached from the home top bar and from the menu's "Labels" entry.

## Rules

- Profile changes go to Firebase Auth through `updateUserProfile`, which sends only changed fields and clears a
  field left empty.
- Labels are created with `library.createLabel` and renamed with `library.renameLabel`; labels are never deleted
  ([labels cannot be deleted](../decisions/labels-cannot-be-deleted.md)).
- Profile changes are online-only and refuse offline with the offline-save snack; creating and renaming labels work
  offline ([offline study](offline-study.md)).
- Signing out clears the device cache and loads `/login` as a new page, or stays signed in with a message when unsynced
  changes don't reach the server in time ([auth](../security/auth.md)).

## History

- 2026-11-06: the section headings were brand pink; now they use the default text colour, because pink on the grey sheet failed the a11y scan on master's deploy run.
- 2026-11-06: the sheet was one ungrouped list; now it has Labels and Account sections under their own headings, because of the bug batch.
- 2026-11-04: gained a Delete account action. See [Delete account](account-deletion.md).
- 2026-11-03: label deletion was an open question; now decided against. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md).

## Sources

- `src/views/Profile.vue`
- `tests/e2e/a11y.spec.ts`
- `src/services/firebase.ts`
- `src/stores/library.ts`
- `src/stores/session.ts`
