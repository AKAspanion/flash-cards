---
type: Feature
title: Sharing a set
description: The owner shares a set through a public link; anyone opens it at /s/:shareId and may add a copy to their own library; the public copy follows the owner's saves until they stop sharing.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Sharing a set

## What it does

In the editor's options panel, Share set makes a public copy in [shared-sets](../data/shared-sets.md) (`DialogShare.vue`,
`shareSet` in the library store), and shows a link, `/s/:shareId`, to copy. Stop sharing deletes the copy. Both, like
every sharing step, need the device to be online (the offline message of [offline study](offline-study.md)).

`/s/:shareId` (`src/views/Shared.vue`, public: signed in or out) shows the title, the card count and the first 5
cards through `renderCardText` ([rich cards](rich-cards.md)). Add to my library copies the set, without labels, and
opens its review. A malformed, missing or stopped link says the link doesn't work; a failed load offers Retry.

## Rules

- The copy holds only what [the collection](../data/shared-sets.md) lists, so no progress, labels or profile data are
  public. A new set is never shared; Duplicate does not copy `shareId`.
- Saving a shared set also updates its public copy (`syncSharedCopy`). If the copy is gone (not-found), the set's
  `shareId` is cleared. Any other failure, or a copy that would be over the rules' size cap (`fitsSharedLimit`),
  shows "Couldn't update the shared link. Your set is saved." (`share.sync-failed`) instead of a save error, because the
  set did save. Share itself refuses an oversized copy with the too-big message before writing anything.
- Add to my library rebuilds each card as `{ id, front, back, learned: false, date }` with a new id rather than copying
  the stored cards: a stranger's public copy could otherwise plant `srs`, extra fields or duplicate ids in the visitor's
  library. A copied card loses any field a newer version adds.
- Signed out, Add to my library stores the `shareId` in sessionStorage (`pending-share-add`), goes through sign-in, and
  finishes the copy once on return.

## Sources

- `src/views/Shared.vue`
- `src/components/DialogShare.vue`
- `src/stores/library.ts`
- `src/services/firebase.ts`
- `src/services/cardSetMapper.ts`
- `src/router/index.ts`
- `tests/e2e/share.spec.ts`
- `tests/e2e/shared-link.spec.ts`
- `docs/plans/2026-11-02-sharing.md`
