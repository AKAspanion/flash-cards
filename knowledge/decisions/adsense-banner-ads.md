---
type: Decision
title: One AdSense banner, on Home and Info only
description: The app shows ads through one manual, responsive AdSense display unit at the bottom of Home and of Info, never while studying; no Auto ads, and nothing loads unless both AdSense env vars are set.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T12:34:10Z }
---

# One AdSense banner, on Home and Info only

## Context

The developer wants the app to earn from ads and has an approved Google AdSense account. Until now the privacy policy
promised no ads. The app runs on the web and, through Chrome, in the Android TWA ([Android app](../apps/android.md)),
where AdSense's web ads are allowed because a TWA isn't a WebView.

## Decision

Decided by the developer on 2026-11-04:

- One manual, responsive AdSense display unit, placed at the bottom of Home and at the bottom of Info. Nowhere else:
  never on study, add/edit, login, profile, settings, bin or the public policy pages.
- Auto ads stay off in the AdSense dashboard, because Auto ads would place overlays and anchors anywhere, including
  mid-study, once Google's script is in the page.
- The ad is configured by two env vars (in `.env.example`); with either empty or malformed, no script loads and no ad
  shows, so dev, the emulators, CI and e2e run without ads.
- Manual units in fixed places were chosen over Auto ads for the same reason: study is the app's core and must not
  be interrupted.

## Consequences

- The privacy policy says the app shows Google ads ([privacy pages](../features/privacy-and-deletion-pages.md)).
- The hosting Content-Security-Policy allows Google's ad domains, and `public/ads.txt` names the publisher.
- Google's script runs in the app's own origin once loaded; this is accepted as the cost of AdSense
  ([data protection](../security/data-protection.md)).
- The Play listing declares that the app contains ads.
- Consent is handled by Google: [consent by AdSense](adsense-consent-by-google.md).
- [No analytics](no-analytics-yet.md) still holds: Firebase Analytics stays off.

## Sources

- `docs/specs/2026-11-04-adsense.md`
- `public/ads.txt`
- `src/services/ads.ts`
- `src/components/AdBanner.vue`
- `firebase.json`
