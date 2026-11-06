---
type: Finding
title: Add card repeats GroupCardFlash's insert logic, and scrollToCard is left unused
description: addCard in Add.vue repeats the insert-after-focused logic of GroupCardFlash.onAddAfter, and scrollToCard is no longer used outside GroupCardFlash, so a later change to one copy can miss the other.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-06T12:00:00Z }
---

# Add card repeats GroupCardFlash's insert logic, and scrollToCard is left unused

## Finding

Add card now inserts after the focused card in `addCard` (`src/views/Add.vue`), which duplicates what
`GroupCardFlash.onAddAfter` does for "Save and add next"; `scrollToCard` is no longer called from outside
`GroupCardFlash`. The two paths behave the same today; a fix to one may miss the other.

## Evidence

- Final review of `2026-11-06-bug-batch`, ledger line: `Final review: minor (deferred): addCard repeats
  GroupCardFlash.onAddAfter's insert logic; scrollToCard no longer used outside GroupCardFlash`
  (`src/views/Add.vue:427`, `src/components/GroupCardFlash.vue:198,244`).

## Status

Open. One way: have `addCard` call a single insert-and-focus method of `GroupCardFlash`, and drop `scrollToCard`
from its public surface.

## Sources

- `src/views/Add.vue`
- `src/components/GroupCardFlash.vue`
