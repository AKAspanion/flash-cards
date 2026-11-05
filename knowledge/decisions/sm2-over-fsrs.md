---
type: Decision
title: Spaced repetition uses SM-2, not FSRS
description: Cards are scheduled with an SM-2 variant because it is simpler to test and needs no per-user tuning; FSRS can replace schedule() later.
status: draft
work_item: tmp-spaced-repetition
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T13:00:00Z }
---

# Spaced repetition uses SM-2, not FSRS

## Context

[Spaced repetition](../features/spaced-repetition.md) needs a scheduler for each card. The spec (14.2 in
`docs/specs/2026-11-02-usability-features.md`) chose between SM-2 and FSRS.

## Decision

Use an SM-2 variant, `schedule()` in `src/utils/srs.ts`. It is simpler to test, and it needs no per-user tuning.

## Consequences

FSRS can replace `schedule()` later without a data change beyond the `srs` object on each card
([data](../data/flash-card-sets.md)); the rest of the app only calls `schedule()` and reads `srs.due`.

## Sources

- `src/utils/srs.ts`
- `docs/specs/2026-11-02-usability-features.md`
