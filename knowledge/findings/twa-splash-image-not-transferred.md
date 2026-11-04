---
type: Finding
title: "Fixed: The Android splash image wasn't handed to Chrome"
description: On Chrome 152+ the app's splash image transfer failed, so a cold start showed about 0.6 s of black before the site; the app now grants itself read access to its splash URI.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-04T15:00:00Z }
verified: human:panditankit1995@gmail.com
---

# Fixed: The Android splash image wasn't handed to Chrome

## Finding

On a cold start of the [Android app](../apps/android.md), the splash image never reached Chrome, so users saw about
0.6 s of black before the site painted. The app still opened full screen and worked.

## Evidence

- The twa-polish run installed the rebuilt APK on a Galaxy phone with Chrome 156.0.8078.79 on Android 17. Three cold
  launches each logged `SplashScreenStrategy: Failed to transfer splash image.` about 50 ms after Chrome logged a new
  Custom Tab session from `in.spanion.flashcards.twa`.
- `androidbrowserhelper` 2.7.4 logs that line only when Chrome's `receiveFile` returns false; the other failures were
  ruled out (no directory error, no `IllegalArgumentException`, no permission denial in logcat).
- Cause: since Chrome 152, Chrome checks that the sending app holds a read grant on its own splash URI
  ([GoogleChrome/android-browser-helper#623](https://github.com/GoogleChrome/android-browser-helper/issues/623)).

## Status

Fixed. `LauncherActivity` grants itself `FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_PERSISTABLE_URI_PERMISSION` on
the splash file under `getFilesDir()` before `super.onCreate()` ([decision](../decisions/splash-held-until-ready.md)).
Verified on 2026-11-04 on the developer's Galaxy SM-S731B (Android 17, Chrome 156.0.8078.79): no "Failed to transfer
splash image." in logcat, no dark frames, and Chrome's splash matches the native one. Remove the grant once #623 is
fixed upstream.

## History

- 2026-11-04: the finding was open with the cause undetermined; now fixed, because the cause was found (Chrome 152+
  checks the sender's own URI grant) and the self-grant restored the handover. See
  [the decision](../decisions/splash-held-until-ready.md).

## Sources

- `android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java`
- `tests/unit/twa.spec.ts`
- `android/app/src/main/AndroidManifest.xml`
- `android/twa-manifest.json`
