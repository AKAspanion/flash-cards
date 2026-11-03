---
type: Decision
title: Compatibility with the original app is no longer required
description: The code still keeps the original app's Firestore schema, localStorage keys, VUE_APP_ env names and service-worker file name, but the original app is no longer in use, so those shapes may change.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Compatibility with the original app is no longer required

## Context

This app replaced an earlier version of Flashcards (a Vue CLI build). The rewrite kept every interface the old app
left behind, and comments in the code give that as the reason:

- **Firestore schema:** `cards` is stored as a JSON string and `date` as a `Timestamp`
  (`src/services/cardSetMapper.ts`). The rules require `cards` to be a string because "older app versions" parse it
  (`firestore.rules`).
- **localStorage keys:** the old app's keys, so saved settings carry over (`KEYS` in `src/stores/prefs.ts`).
- **Env prefix:** `VUE_APP_`, so existing `.env.local` files keep working (`envPrefix` in `vite.config.ts`).
- **Service worker file name:** `service-worker.js`, the name the Vue CLI build registered, so installed copies
  update (`vite.config.ts`).

## Decision

The original app is no longer in use, and the project's data is fresh. The developer stated this on 2026-11-03. None
of the shapes above has to be kept for the old app's sake.

## Consequences

- The schema, keys, prefix and file name may change when there's a reason to. A change still has to keep working
  for the version that is live at the time: the usability spec's rule 2.2
  (`docs/specs/2026-11-02-usability-features.md`).
- The comments that give the old app as the reason are out of date ([technical debt](../risks/debt.md)).
- The reader (`cardSetFromDoc`) still tolerates missing and malformed fields, which costs little and protects
  against partial writes.

## History

- 2026-11-03: was "stay compatible with the original app", to keep existing data, settings and installed copies
  working; now not required, because the original app is no longer in use and the data is fresh (stated by the
  developer).

## Sources

- `src/services/cardSetMapper.ts`
- `firestore.rules`
- `src/stores/prefs.ts`
- `vite.config.ts`
- `README.md`
- `docs/specs/2026-11-02-usability-features.md`
