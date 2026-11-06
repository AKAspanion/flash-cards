---
type: Finding
title: Home's open Menu panel overlaps the top bar on a landscape phone
description: On a phone held sideways (about 390 px tall), Home's open Menu panel reaches over the top bar and its Search button, more so for unverified users, whose top bar the verify banner pushes down.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T13:20:00Z }
---

# Home's open Menu panel overlaps the top bar on a landscape phone

## Finding

`OptionPanel` is fixed to the bottom of the screen and is about 390 px tall when open. On a landscape phone, about
390 px tall, Home's open Menu panel covers the top bar and its Search button. The verify banner
([email verification](../features/email-verification.md)) pushes Home's top bar further down for unverified users.
A tap outside the panel still closes it. The panel's height predates the banner.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-r1-reviewer.md`, out of scope: "In a landscape phone (about
  390px tall), Home's open Menu panel overlaps the banner-shifted top bar and its Search button"
  (`src/components/OptionPanel.vue:152-153`, `src/views/Home.vue:206`).
- Ledger: `Final review: minor (deferred): landscape phone: Home's open Menu panel overlaps the banner-shifted top bar`.

## Status

Open. One way: cap the panel's height to the viewport and let it scroll.

## Sources

- `src/components/OptionPanel.vue`
- `src/views/Home.vue`
- `src/components/BannerVerifyEmail.vue`
