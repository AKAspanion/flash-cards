---
type: Decision
title: Review counts are written after the set save
description: When the user leaves a review, the set saves first and the day's review count is written only if that save succeeded (or there was nothing to save), so a refused save never counts reviews that were lost.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Review counts are written after the set save

## Context

A review changes the cards in a set, which are saved when the user leaves the screen
([study a set](../features/study-set.md)), and also raises the day's count in `user-stats`
([progress and habits](../features/progress-habits.md)). The two writes are separate documents.

## Decision

Leave runs the set save first and calls `stats.recordReviews` only after it succeeded. A visit with nothing to save
(re-marking a learned card) still writes its count. A visit whose save fails writes no count, because the reviews were
not kept. Counts are once per card per visit (spec 8.1), not once per rating.

## Consequences

- A save refused for a reason other than being offline (for example a set over the size limit) records nothing;
  `tests/e2e/review-counts.spec.ts` forces that with an oversized set, since an offline save now counts as done.
- A count can be missing when the set saved but the stats write then failed; the user sees `toast.error.stats`.

## Sources

- `src/views/View.vue`
- `src/views/Due.vue`
- `src/stores/stats.ts`
- `tests/e2e/review-counts.spec.ts`
- `docs/plans/2026-11-02-progress-habits.md`
