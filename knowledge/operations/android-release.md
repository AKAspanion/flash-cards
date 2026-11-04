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

## The upload key

- The upload keystore, its password, the public certificate, the signed release files and the Play store graphics
  live outside the repository, in `~/keys/flashcards/` on the developer's machine; its `README.txt` lists each file.
  The keystore and the password are never committed.
- The upload key's SHA-256 is in `public/.well-known/assetlinks.json`. Play's app-signing key SHA-256 joins it once
  the app exists in Play Console with Play App Signing.
- `signingKey.path` in `android/twa-manifest.json` is that keystore's absolute path, because Bubblewrap passes the path
  to the shell in quotes and a `~` there doesn't expand. On another machine, change the path before `npm run twa:build`.

## Before you build

- the Bubblewrap config file, ~/.bubblewrap/config.json, must point `jdkPath` at a JDK (JDK 21 worked) and `androidSdkPath` at
  `~/Library/Android/sdk`.
- Bubblewrap downloads the icons from the URLs in `android/twa-manifest.json`, so they must be live. If they aren't,
  serve `public/` locally and swap the URLs for the run.

## A test build

- A debug APK needs no keystore: from `android/`, `ANDROID_HOME=~/Library/Android/sdk ./gradlew assembleDebug`
  writes `android/app/build/outputs/apk/debug/app-debug.apk`, signed with the machine's Android debug key. Install it
  with `adb install -r` on that path.
- If the Gradle wrapper's download of its distribution times out, as it did on this machine on 2026-11-04 (the zip is
  served from GitHub's release-assets host), run any cached Gradle 8.11.1 or later from `~/.gradle/wrapper/dists/`
  with the same task.
- The debug key isn't in `public/.well-known/assetlinks.json`, so a debug build opens with a browser bar. To test the
  full-screen launch, add the debug key's SHA-256 (`apksigner verify --print-certs` on the APK) to the file, deploy
  hosting, and remove it before release.

## Device checks

- Also cold-launch the app (force-stop it and Chrome first) and watch for the splash: a black gap before the site, or "Failed to transfer splash image." in logcat, means the splash grant is missing ([fixed finding](../findings/twa-splash-image-not-transferred.md)).

## Each release

- After Bubblewrap regenerates `android/` (`npm run twa:update`), re-apply the self-grant of read access to the splash URI in
  `LauncherActivity.java` before `super.onCreate()`; `tests/unit/twa.spec.ts` fails without it. Remove it once
  [android-browser-helper#623](https://github.com/GoogleChrome/android-browser-helper/issues/623) is fixed
  ([why](../decisions/splash-held-until-ready.md)).
- Raise `appVersionCode` in `android/twa-manifest.json` by hand.
- After every `npm run twa:update`, check `compileSdkVersion` and `targetSdkVersion` in `android/app/build.gradle` are
  still at least 36, which Play requires ([why](../decisions/play-compliance-in-twa-work.md)).
- `android/manifest-checksum.txt` is committed; keep it with the regenerated project.
- Google sign-in needs `https://spanion-flash-cards.web.app/__/auth/handler` and
  `http://localhost:8080/__/auth/handler` as redirect URIs on the OAuth web client, besides the production host
  ([decision](../decisions/google-sign-in-redirect.md)). Try sign-in on a real device before each submission.

## History

- 2026-11-04: the black gap on cold launch was a known open finding; now the runbook says to re-apply the splash self-grant after regeneration, because the grant fixed it.
- 2026-11-04: the signed bundle, APK and feature graphic in `~/keys/flashcards/` were rebuilt for the FlashCards rename, because the name is in the artifacts. See [the decision](../decisions/app-name-flashcards.md).
- 2026-11-04: the upload key didn't exist yet; now it is in `~/keys/flashcards/` and its fingerprint is in
  `assetlinks.json`, because the developer asked for the signing key and store assets.

## Sources

- `docs/specs/2026-11-04-android-twa.md`
- `android/twa-manifest.json`
- `android/app/build.gradle`
- `android/manifest-checksum.txt`
- `android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java`
- `tests/unit/twa.spec.ts`
- `package.json`
