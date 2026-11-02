---
type: Decision
title: The bin keeps sets until the user deletes them
description: Sets moved to the bin stay there indefinitely; nothing purges them automatically.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
---

# The bin keeps sets until the user deletes them

## Context

Moving a set to the bin only sets `trashed: true`; `src/views/Bin.vue` restores it or deletes it for good.

## Decision

Sets stay in the bin indefinitely. Only the user deletes them, one at a time, after confirming. The developer decided
this on 2026-11-03.

## Consequences

- No scheduled job or expiry date is added for trashed sets.
- Trashed sets still count towards the user's stored data.

## Sources

- `src/views/Bin.vue`
- `src/stores/library.ts`
