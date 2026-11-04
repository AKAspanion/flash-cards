---
type: Integration
title: Google AdSense
description: The one banner ad on Home and Info, loaded from Google's adsbygoogle.js only through src/services/ads.ts, with a validated publisher ID and no ads unless both env vars are set.
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T19:00:00Z }
verified: human:panditankit1995@gmail.com
---

# Google AdSense

## What it is used for

One responsive display unit at the bottom of Home and Info ([one AdSense banner](../decisions/adsense-banner-ads.md)).
Auto ads stay off in the AdSense dashboard.

## Configuration

- `VUE_APP_ADSENSE_CLIENT` and `VUE_APP_ADSENSE_SLOT`, both optional ([environment](../operations/environment.md)).
  `adsConfig` in `src/services/ads.ts` returns null unless the client matches `ca-pub-` digits and the slot is digits,
  so dev, the emulators, CI and e2e show no ads.
- The app loads `adsbygoogle.js` only from `loadAdSense` in `src/services/ads.ts`, once per page load, and refuses a
  client that fails the pattern. `AdBanner` (`src/components/AdBanner.vue`) is the only place an ad is requested.
- `public/ads.txt` names the publisher.
- Consent is AdSense's own message ([consent by AdSense](../decisions/adsense-consent-by-google.md)); the app ships no
  consent code.
- The CSP in `firebase.json` allows Google's ad and consent domains ([data protection](../security/data-protection.md)).

## Failure modes

A blocked or failed script, or a rejected ad request, is ignored and leaves nothing on screen. The banner wrapper's
8px top margin stays when the slot is unfilled.

## Sources

- `src/services/ads.ts`
- `src/components/AdBanner.vue`
- `public/ads.txt`
- `firebase.json`
- `.env.example`
- `tests/unit/ads.spec.ts`
- `tests/unit/AdBanner.spec.ts`
