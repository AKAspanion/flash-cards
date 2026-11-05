---
type: Finding
title: The verify banner shifts the page that is sliding out
description: Moving between Home and a full-height screen, the banner appears or disappears at once while the out-in slide still shows the old page, so that page jumps by the banner's height for 0.2 s.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T13:20:00Z }
---

# The verify banner shifts the page that is sliding out

## Finding

`BannerVerifyEmail` reads the current route, which changes as soon as navigation starts, while `App.vue`'s
`out-in` slide keeps the leaving page on screen for 0.2 s. Going from Home to a full-height screen (where the banner
is hidden, see [email verification](../features/email-verification.md)), the leaving page jumps up by the banner's
height; coming back, it is pushed down. Only unverified users see it, and it is cosmetic.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-r1-reviewer.md`, new Minor 1: the banner "follows the new
  route at once, while the out-in slide keeps the old page on screen" (`src/components/BannerVerifyEmail.vue:74-76`,
  `src/App.vue:40-50`).
- Ledger: `Final review: minor (deferred): banner follows the new route at once while the out-in slide keeps the old
  page for 0.2s`.

## Status

Open. One way: put the banner inside the transition with the page, or animate its height.

## Sources

- `src/components/BannerVerifyEmail.vue`
- `src/App.vue`
