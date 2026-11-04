---
type: Decision
title: Google holds the app-signing key; we keep only the upload key
description: The Android app uses Play App Signing with the Google-generated app-signing key; the developer keeps only the upload key, and no key upgrade to a self-supplied key is planned.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T14:29:57Z }
---

# Google holds the app-signing key; we keep only the upload key

## Context

The first internal-test release of the [Android app](../apps/android.md) went to Play on 2026-11-04 with Play App
Signing and a key Google generated. The developer asked whether to sign with their own key instead.

Play App Signing is mandatory for new apps, and Google holds a copy of the app-signing key either way. Supplying an own
key after a release has gone out is a one-time key upgrade. It only applies on Android 13 and later, so the old key
stays in use on older phones.

## Decision

- Keep the Google-generated app-signing key. No key upgrade.
- The developer holds only the upload key (`~/keys/flashcards/upload.keystore`), which signs every bundle uploaded to
  Play and any APK installed by hand.
- `public/.well-known/assetlinks.json` lists the upload key and Play's signing certificates, so both kinds of install
  open full screen. The [release runbook](../operations/android-release.md) says how to read Play's certificates.

## Consequences

- A lost or leaked upload key is reset through Play Console support, and users are unaffected. The public certificate
  that needs, `upload_certificate.pem`, is in the same folder.
- Builds for other stores, or for direct download, are signed with the upload key, which the site already trusts.
- Revisit this only if the key must be shared with another app, or a policy requires a self-held key.

## Sources

- `public/.well-known/assetlinks.json`
- `android/twa-manifest.json`
- [Release the Android app](../operations/android-release.md)
