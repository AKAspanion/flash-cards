---
type: Decision
title: Every pull request is reviewed, Hindi included
description: The developer reviews every pull request before it merges, including every new or changed Hindi string.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Every pull request is reviewed, Hindi included

## Context

The app is translated into English and Hindi (`src/locales/en.json`, `src/locales/hi.json`), and the usability
spec has implementers write the Hindi strings themselves (`docs/specs/2026-11-02-usability-features.md`, rule 2.1).

## Decision

Every pull request is reviewed by the developer before it merges, and that review covers the Hindi strings. Decided
on 2026-11-03.

## Consequences

- A pull request that adds or changes user-facing text lists the new Hindi strings in its description, so they can
  be checked.
- Nothing merges to `master` without that review.

## Sources

- `src/locales/en.json`
- `src/locales/hi.json`
- `docs/specs/2026-11-02-usability-features.md`
