---
type: Decision
title: Stay compatible with the original app
description: The rewrite keeps the original app's Firestore schema, localStorage keys, VUE_APP_ env names and service-worker file name, so existing data, settings, .env files and installed copies keep working.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Stay compatible with the original app

## Context

This app replaced an earlier version of Flashcards (a Vue CLI build) that already had users, data in Firestore,
settings in their browsers and installed PWA copies. Comments in the code give the reason at each point.

## Decision

Keep every interface the old app left behind:

- **Firestore schema** unchanged: `cards` stored as a JSON string and `date` as a `Timestamp`
  (`src/services/cardSetMapper.ts`); the rules require `cards` to stay a string because older app versions
  `JSON.parse` it (`firestore.rules`).
- **localStorage keys** unchanged, so saved settings carry over (`KEYS` in `src/stores/prefs.ts`).
- **Env prefix** `VUE_APP_` kept, so existing `.env.local` files keep working (`envPrefix` in `vite.config.ts`).
- **Service worker file name** `service-worker.js`, the name the Vue CLI build registered, so installed copies pick
  up the new worker as an update instead of staying stale (`vite.config.ts`).

## Consequences

- New Firestore fields must be optional and readable by the version live today; the approved usability spec repeats
  this as a global rule (`docs/specs/2026-11-02-usability-features.md`, rule 2.2).
- Cards can't be queried individually, and every save rewrites the whole set.
- The reader (`cardSetFromDoc`) tolerates missing and malformed fields.

## Sources

- `src/services/cardSetMapper.ts`
- `firestore.rules`
- `src/stores/prefs.ts`
- `vite.config.ts`
- `README.md`
- `docs/specs/2026-11-02-usability-features.md`
