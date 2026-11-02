---
type: Feature
title: Settings and about
description: Device-local settings (language, dark mode, set order, favourites on top) and the about screen with the app version and share links.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Settings and about

## What it does

`/settings` sets the language (English or Hindi), dark mode, how sets are ordered on the home screen, and whether
favourites go on top. `/info` shows the app version and lets the user copy or open the web link and, when one is
configured, the Google Play listing.

## Screens and routes

- `/settings`: `src/views/Settings.vue`.
- `/info`: `src/views/Info.vue`.

## Rules

- Settings live in `usePrefsStore` (`src/stores/prefs.ts`) and are saved to localStorage on this device only,
  under the keys the original app used ([original app compatibility](../decisions/original-app-compatibility.md)).
  Tested in `tests/unit/prefs.spec.ts`.
- `App.vue` applies the language to vue-i18n and `<html lang>`, and the dark setting to the Vuetify theme.
- The version is `__APP_VERSION__`, taken from `package.json` by `vite.config.ts`.
- The Play Store entries show only when `VUE_APP_PLAY_STORE_URL` is set.

## Sources

- `src/views/Settings.vue`
- `src/views/Info.vue`
- `src/stores/prefs.ts`
- `src/App.vue`
- `vite.config.ts`
- `tests/unit/prefs.spec.ts`
