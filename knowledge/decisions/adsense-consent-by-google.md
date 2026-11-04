---
type: Decision
title: Ad consent is AdSense's own Privacy & messaging banner
description: Consent for ads in the EEA, the UK and Switzerland comes from AdSense's own GDPR message, configured in the AdSense dashboard; the app ships no consent code of its own.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T12:34:10Z }
verified: human:panditankit1995@gmail.com
---

# Ad consent is AdSense's own Privacy & messaging banner

## Context

Google requires a Google-certified consent tool before serving ads to people in the EEA, the UK and Switzerland. The
app shows ads ([banner ads](adsense-banner-ads.md)).

## Decision

Use AdSense's own "Privacy & messaging" GDPR message, set up and published in the AdSense dashboard. It is served by
the same AdSense script, so the app has no consent screen, store or setting of its own. Decided by the developer on
2026-11-04, over not serving ads in those regions.

## Consequences

- The hosting Content-Security-Policy also allows the consent message's domain (`fundingchoicesmessages.google.com`).
- What the message says, and who sees it, is changed in the AdSense dashboard, not in the code.
- The privacy policy says people in those regions are asked for consent first.

## Sources

- `docs/specs/2026-11-04-adsense.md`
