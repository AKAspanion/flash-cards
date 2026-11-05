---
type: Requirement
title: Users can export their data
description: Users must be able to download all their sets, cards and labels in a file; the deletion half of the earlier requirement is met by Delete account.
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
verified: human:panditankit1995@gmail.com
superseded_by: requirements/data-export-in-settings
status: superseded
---

# Users can export their data

## Requirement

A user can download all their sets, cards and labels in a file, from the profile screen (`src/views/Profile.vue`).
Data export is required; the deletion half of [account deletion and data export](account-deletion-and-export.md) is
met by [Delete account](../features/account-deletion.md).

## Acceptance

- The file format is decided when this is designed.
- It works in English and Hindi, and is covered by an e2e test against the emulators.

## Sources

- `src/views/Profile.vue`
- `src/services/firebase.ts`
