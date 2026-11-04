---
type: Decision
title: The Android app is portrait on phones, any orientation on large screens
description: The TWA declares portrait orientation; Android 16 ignores orientation locks on screens 600dp and wider for apps targeting API 36, so tablets and unfolded foldables rotate freely.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:38:06Z }
verified: human:panditankit1995@gmail.com
---

# The Android app is portrait on phones, any orientation on large screens

## Context

Google Play's large-screen quality checks flag apps that lock tablets and foldables to portrait, while flashcards
read best upright on a phone.

## Decision

Phones stay in portrait, and tablets and foldables rotate freely. The developer chose this on 2026-11-04. The TWA
declares `orientation: portrait`. Android 16 ignores orientation locks on displays at least 600dp wide for apps
that target API 36, which gives the split without device checks in the app.

## Consequences

- The generated Android project must target API 36 or later for the split to hold. On large screens running
  Android 15 or earlier, the app stays in portrait.
- The lock is only in the Android app's config (`android/twa-manifest.json`). The web manifest sets no orientation,
  so installed copies of the web app rotate freely. The developer chose this on 2026-11-04.
