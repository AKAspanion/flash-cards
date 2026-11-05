---
type: Requirement
title: Users can export their data from Settings
description: Users must be able to download all their sets, cards and labels in one file; the export is "Back up all sets" in Settings, beside Restore from backup.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T04:02:45Z }
---

# Users can export their data from Settings

## Requirement

A user can download all their sets, cards and labels in one file. The export is "Back up all sets" in Settings
(`src/views/Settings.vue`), beside "Restore from backup", as the usability spec's 5.3 describes it, rather than on the
profile screen. The deletion half of [account deletion and data export](account-deletion-and-export.md) is met by
[Delete account](../features/account-deletion.md). The developer chose Settings on 2026-11-05, so backup and restore
sit together.

## Acceptance

- The file is the backup format of the usability spec's 5.3 (`flashcards-backup-YYYY-MM-DD.json`, every set not in
  the bin and every label).
- It works in English and Hindi, and is covered by an e2e test against the emulators.

## Sources

- `docs/specs/2026-11-02-usability-features.md`
- `docs/plans/2026-11-02-faster-authoring.md`
- `src/views/Settings.vue`
- `tests/e2e/backup.spec.ts`

Supersedes [Users can export their data](account-data-export.md): Export is Back up all sets in Settings (spec 5.3), not on Profile; chosen 2026-11-05.
