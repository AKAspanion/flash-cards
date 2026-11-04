---
type: Decision
title: The app is called FlashCards
description: The product name is written "FlashCards" (capital C) in English everywhere it shows, and "FlashCards - Learn & Memorize" where a full name is used; the Hindi name stays फ्लैशकार्ड.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T09:18:33Z }
verified: human:panditankit1995@gmail.com
---

# The app is called FlashCards

## Context

The app showed its name as "Flashcards" in the web manifest, the Android launcher, the page title and the in-app
copy, and the store graphics followed. The developer asked for "FlashCards" on 2026-11-04, after installing the
Android app.

## Decision

- The name is `FlashCards`, under the launcher icon and in English copy.
- The full name, in the web manifest and the Android app and store listing, is `FlashCards - Learn & Memorize`.
- The Hindi copy keeps फ्लैशकार्ड.

## Consequences

- Changing the Android name means regenerating `android/` with Bubblewrap and rebuilding the signed bundle.
- The Play listing title and feature graphic use the same spelling.

## Sources

- `pwa-manifest.ts`
- `android/twa-manifest.json`
- `src/locales/en.json`
- `index.html`
