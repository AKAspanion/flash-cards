---
type: Requirement
title: Users can export their data
description: Users must be able to download all their sets, cards and labels in a file; account deletion, the other half of the earlier requirement, is built.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
---

# Users can export their data

## Requirement

A user can download all their sets, cards and labels in a file, from the profile screen (`src/views/Profile.vue`).
This is the half of [account deletion and data export](account-deletion-and-export.md) still to build; deletion is
met by [Delete account](../features/account-deletion.md).

## Acceptance

- The file format is decided when this is designed.
- It works in English and Hindi, and is covered by an e2e test against the emulators.

## Sources

- `src/views/Profile.vue`
- `src/services/firebase.ts`
