---
type: Decision
title: Card text is rendered only through renderCardText
description: Card text, which a shared set can take from a stranger, becomes HTML only in src/utils/markdown.ts, through markdown-it with raw HTML off and a private DOMPurify allowlist; links are http, https or mailto and images are https.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Card text is rendered only through renderCardText

## Context

Cards accept Markdown ([rich cards](../features/rich-cards.md)), and a [shared set](../features/sharing.md) puts another
person's text into a visitor's page, so card text is untrusted and rendering it is an injection risk.

## Decision

`renderCardText` in `src/utils/markdown.ts` is the only function that turns card text into HTML; every `v-html` that shows
card text (`CardFlash.vue`, `Shared.vue`) takes its value from it. markdown-it runs with `html: false`, then a
DOMPurify instance used by that module alone filters the result: an allowlist of tags (no tables, no scripts) and of
attributes (`href`, `src`, `alt`, `title`; no data or aria attributes). A link needs an absolute `http`, `https` or
`mailto` address and opens with `target=_blank` and `rel="noopener noreferrer"`; an image needs an absolute `https`
address, loads lazily with `referrerpolicy=no-referrer`, and is removed otherwise. Dependencies: `markdown-it` and
`dompurify` (`package.json`).

## Consequences

- The CSP already allows `img-src https:` (`firebase.json`); an image is a request to a third party, which the
  no-referrer policy limits.
- Add any new place that shows card text to this function, not around it.

## Sources

- `src/utils/markdown.ts`
- `package.json`
- `firebase.json`
- `tests/unit/markdown.spec.ts`
