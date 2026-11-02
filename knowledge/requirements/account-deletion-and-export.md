---
type: Requirement
title: Account deletion and data export
description: Users must be able to download all their data and to delete their account along with everything stored for it.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
---

# Account deletion and data export

## Requirement

Add two account actions, likely on the profile screen (`src/views/Profile.vue`). Asked for by the developer on
2026-11-03.

- **Export:** download all the user's sets, cards and labels in a file.
- **Delete account:** remove the user's Firebase Auth account and every Firestore document whose `uid` is theirs
  (`flash-card-sets` and `labels`).

## Acceptance

- Deleting asks for confirmation, and says that it can't be undone.
- After deletion, none of the user's documents remain, and the user is signed out.
- Firebase may ask a user to sign in again before deleting their account; the flow handles that.
- The file format for export is decided when this is designed.
- Both actions work in English and Hindi, and are covered by e2e tests against the emulators.
- Google Play expects apps with accounts to offer account deletion, which matters for the
  [Android TWA](android-twa.md).

## Sources

- `src/views/Profile.vue`
- `src/services/firebase.ts`
- `firestore.rules`
