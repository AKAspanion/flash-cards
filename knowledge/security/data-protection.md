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

- Owner-only access in `firestore.rules` ([roles](roles.md)).
- Firebase Hosting sends a Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` on every path (`firebase.json`).
- `.env.local` and other local env files are ignored by `.gitignore`. The committed `.env.emulator` and the e2e
  password in `tests/e2e/helpers.ts` are emulator-only test values ([testing](../quality/testing.md)).
- The service worker never answers Firebase's reserved `/__/` paths with the app shell (`navigateFallbackDenylist`
  in `vite.config.ts`).
- CI: workflows default to `contents: read` (CodeQL adds `security-events: write`), check out without persisted credentials, pin actions to commit SHAs, run
  `npm audit` on shipped dependencies, and CodeQL scans the code ([CI](../quality/ci.md)).
- Vulnerabilities are reported privately through GitHub (README, "Security").

## Sources

- `firestore.rules`
- `firebase.json`
- `.gitignore`
- `.env.emulator`
- `tests/e2e/helpers.ts`
- `vite.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `README.md`
