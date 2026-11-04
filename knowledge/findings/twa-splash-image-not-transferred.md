---
type: Finding
title: The Android splash image is not handed to Chrome
description: On Chrome 156 and Android 17 the app's splash image transfer fails, so a cold start shows about 0.6 s of black before the site.
status: draft
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-04T15:00:00Z }
---

# The Android splash image is not handed to Chrome

## Finding

On a cold start of the [Android app](../apps/android.md), the splash image never reaches Chrome, so users see about
0.6 s of black before the site paints. The app still opens full screen and works.

## Evidence

- Task 3 of the twa-polish run installed the rebuilt APK on a Galaxy phone with Chrome 156.0.8078.79 on Android 17.
  Three cold launches, with Chrome and the app force-stopped, each logged `SplashScreenStrategy: Failed to transfer
  splash image.` about 50 ms after Chrome logged a new Custom Tab session from `in.spanion.flashcards.twa`.
- `androidbrowserhelper` 2.7.4 logs that line only when Chrome's `receiveFile` returns false. Its other failures were
  ruled out: no "Failed to create a directory", no `IllegalArgumentException` (the FileProvider authority
  `in.spanion.flashcards.twa.fileprovider` is registered), no permission denial or avc line in logcat. Chrome logs
  no reason.
- Ledger note: "No project-side fix found in the 30-minute box." Warm starts could not be tested.

## Status

Open. Cause undetermined, likely a Chrome behaviour on this version; nothing in `android/` changed for it. Try another
device and Chrome version, and re-check after Chrome updates.

## Sources

- `android/app/src/main/AndroidManifest.xml`
- `android/twa-manifest.json`
