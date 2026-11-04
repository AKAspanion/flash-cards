---
type: Decision
title: The Android package name is in.spanion.flashcards.twa
description: The TWA's Android application id is in.spanion.flashcards.twa, the production domain reversed plus .twa; Google Play never lets it change after the first upload.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:24:21Z }
---

# The Android package name is in.spanion.flashcards.twa

## Context

The [Android TWA](../requirements/android-twa.md) left the package name to be decided when the TWA is built. Google
Play identifies an app by its package name forever: it can't be changed after the first upload, and the Digital Asset
Links file on the site names it.

## Decision

The package name is `in.spanion.flashcards.twa`: the production domain `flashcards.spanion.in` reversed, plus `.twa`.
The developer chose it on 2026-11-04.

## Consequences

- The same id goes in the Bubblewrap config (`android/twa-manifest.json`) and in /.well-known/assetlinks.json; the
  two must match, or Android shows the browser bar over the app. `tests/unit/twa.spec.ts` checks they do.
- Publishing under another id later means a new Play listing, with no installs or reviews carried over.

## History

- 2026-11-04: was `in.spanion.flashcards`; now `in.spanion.flashcards.twa`, because the developer changed their mind
  before the first upload, while nothing outside this branch used the id.

## Sources

- [requirements/android-twa](../requirements/android-twa.md)
- `android/twa-manifest.json`
- `public/.well-known/assetlinks.json`
- `tests/unit/twa.spec.ts`
