---
type: Security
title: Data protection
description: What personal data the app holds and where, and the protections around it — owner-only rules, hosting security headers, local env files out of git, and a pinned, audited CI.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Data protection

## Sensitive data

- In Firebase Auth: the user's email, display name, photo URL and account dates, shown on the profile screen.
- In Firestore: the user's own sets, cards and labels.
- In the browser: settings in localStorage ([settings](../features/settings-and-about.md)), nothing personal.
- The Firebase web config (`VUE_APP_*`) is public by design (README); the deploy service account key is the
  GitHub secret `FIREBASE_SERVICE_ACCOUNT`.

## Protections

- A user can delete all their data from the app, and nothing is kept: see [account deletion](../features/account-deletion.md)
  and [deleted data is gone at once](../decisions/deletion-is-permanent.md). The privacy policy is public at `/privacy`
  ([pages](../features/privacy-and-deletion-pages.md)).

- Owner-only access in `firestore.rules` ([roles](roles.md)).
- Firebase Hosting sends a Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` on every path (`firebase.json`). The CSP
  allows Google's ad and consent domains in `script-src`, `frame-src` and `connect-src`, and `public/ads.txt` names the
  publisher ([one AdSense banner](../decisions/adsense-banner-ads.md)).
- Google's ad script (`adsbygoogle.js`) runs in the app's own origin once Home or Info loads it; this is accepted as
  the cost of AdSense, and nothing loads without both AdSense env vars ([Google AdSense](../integrations/google-adsense.md)).
- `.env.local` and other local env files are ignored by `.gitignore`. The committed `.env.emulator` and the e2e
  password in `tests/e2e/helpers.ts` are emulator-only test values ([testing](../quality/testing.md)).
- The service worker never answers Firebase's reserved `/__/` paths with the app shell (`navigateFallbackDenylist`
  in `vite.config.ts`).
- CI: workflows default to `contents: read` (CodeQL adds `security-events: write`), check out without persisted credentials, pin actions to commit SHAs, run
  `pnpm audit --prod` on shipped dependencies and on `functions/`, and CodeQL scans the code ([CI](../quality/ci.md)).
- Vulnerabilities are reported privately through GitHub (README, "Security").

## History

- 2026-11-04: CI audited shipped dependencies with `npm audit`; now `pnpm audit --prod`, because the web app and `functions/` moved to pnpm. See [pnpm](../decisions/pnpm-package-manager.md).
- 2026-11-04: no third-party ad code in the page; now Google's ad script runs in the app's origin on Home and Info and the CSP allows Google's ad domains, because of the AdSense banner. See [the decision](../decisions/adsense-banner-ads.md).
- 2026-11-04: users could not remove their data; now they can delete their account and everything in it.

## Sources

- `firestore.rules`
- `firebase.json`
- `public/ads.txt`
- `.gitignore`
- `.env.emulator`
- `tests/e2e/helpers.ts`
- `vite.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `README.md`
