---
type: Runbook
title: Release the Android app
description: The steps to rebuild and submit the Trusted Web Activity to Google Play, and the snags found building it the first time.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
---

# Release the Android app

The ordered steps, from the first build to the Play submission, are in section 8 of
`docs/specs/2026-11-04-android-twa.md`; follow them in that order. What the first build added:

## Before you build

- the Bubblewrap config file, ~/.bubblewrap/config.json, must point `jdkPath` at a JDK (JDK 21 worked) and `androidSdkPath` at
  `~/Library/Android/sdk`.
- Bubblewrap downloads the icons from the URLs in `android/twa-manifest.json`, so they must be live. If they aren't,
  serve `public/` locally and swap the URLs for the run.

## Each release

- Raise `appVersionCode` in `android/twa-manifest.json` by hand.
- After every `npm run twa:update`, check `compileSdkVersion` and `targetSdkVersion` in `android/app/build.gradle` are
  still at least 36, which Play requires ([why](../decisions/play-compliance-in-twa-work.md)).
- `android/manifest-checksum.txt` is committed; keep it with the regenerated project.
- Google sign-in needs `https://spanion-flash-cards.web.app/__/auth/handler` and
  `http://localhost:8080/__/auth/handler` as redirect URIs on the OAuth web client, besides the production host
  ([decision](../decisions/google-sign-in-redirect.md)). Try sign-in on a real device before each submission.

## Sources

- `docs/specs/2026-11-04-android-twa.md`
- `android/twa-manifest.json`
- `android/app/build.gradle`
- `android/manifest-checksum.txt`
- `package.json`
