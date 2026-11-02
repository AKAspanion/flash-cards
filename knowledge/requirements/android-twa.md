---
type: Requirement
title: Publish on Android as a Trusted Web Activity
description: The PWA will be published on Google Play as a Trusted Web Activity, so it must keep meeting the PWA requirements a TWA depends on.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Publish on Android as a Trusted Web Activity

## Requirement

The app will be published on Android as a Trusted Web Activity (TWA) that wraps this PWA. Stated by the developer
on 2026-11-03. Until then, changes must not break what a TWA relies on: the web app manifest and service worker
built by `VitePWA` in `vite.config.ts`, and serving over HTTPS from the production domain.

## Acceptance

- The Play listing's address goes in `VUE_APP_PLAY_STORE_URL`, which makes the about screen show it
  (`src/views/Info.vue`).
- The packaging details (the TWA tool, the package name, and the Digital Asset Links file that proves the site and
  the app belong together) are decided when the TWA is built.

## Sources

- `vite.config.ts`
- `src/views/Info.vue`
- `.env.example`
- `firebase.json`
