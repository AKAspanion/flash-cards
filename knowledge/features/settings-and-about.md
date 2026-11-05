---
type: Feature
title: Settings and about
description: Device-local settings (language, dark mode, set order, favourites on top) and the about screen with the app version and share links.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Settings and about

## What it does

`/settings` sets the language (English or Hindi), dark mode, how sets are ordered on the home screen (five orders: Alphabetically, New first, Old first, Progress, Recently studied; see [library](library.md)), and whether
favourites go on top. `/info` shows the app version and lets the user copy or open the web link and, when one is
configured, the Google Play listing. It also links to the [privacy policy and the delete-account
page](privacy-and-deletion-pages.md). The screen ends with the AdSense banner
(`src/components/AdBanner.vue`, [decision](../decisions/adsense-banner-ads.md)).

Settings also has "Back up all sets" and "Restore from backup". Backup downloads every set not in the bin and every
label as one JSON file (`buildBackup`, `backupFileName` in `src/utils/cardExport.ts`, saved with `downloadText()`).
Restore reads such a file (`parseBackup`) and adds its sets as new sets; labels are matched to existing ones by their
text and created when missing. Both are online-only and refuse offline with the offline-save snack. See
[export in Settings](../requirements/data-export-in-settings.md).

## Screens and routes

- `/settings`: `src/views/Settings.vue`.
- `/info`: `src/views/Info.vue`.

## Rules

- Settings live in `usePrefsStore` (`src/stores/prefs.ts`) and are saved to localStorage on this device only,
  under the keys the original app used ([original app compatibility](../decisions/original-app-compatibility.md)).
  Tested in `tests/unit/prefs.spec.ts`. The same store holds the study options (`study-shuffle`,
  `study-unlearned-only`, `study-reverse`), changed from [the study screen](study-set.md), not from Settings.
- The `card-set-order` value is one of `SET_ORDERS` (`src/utils/cardSets.ts`), including the stored values `Progress` and `Recently studied`. The order select's open list carries its own `aria-label` (list props in `Settings.vue`), because axe flagged it as an unnamed input (`aria-input-field-name`).
- `App.vue` applies the language to vue-i18n and `<html lang>`, and the dark setting to the Vuetify theme.
- The version is `__APP_VERSION__`, taken from `package.json` by `vite.config.ts`.
- The Play Store entries show only when `VUE_APP_PLAY_STORE_URL` is set.

## History

- 2026-11-05: the order list had three items; now five, adding Progress and Recently studied, and the open list is labelled for axe.
- 2026-11-05: Settings had only device-local preferences; now it also backs up and restores the user's sets, because the usability spec's 5.3 put data export there.
- 2026-11-05: the prefs store held only the Settings values; now it also holds three study options.
- 2026-11-04: `/info` showed no ads; now it ends with the AdSense banner. See [one AdSense banner](../decisions/adsense-banner-ads.md).
- 2026-11-04: `/info` gained links to `/privacy` and `/delete-account`, which Google Play requires.

## Sources

- `src/views/Settings.vue`
- `src/views/Info.vue`
- `src/utils/cardExport.ts`
- `src/utils/download.ts`
- `tests/e2e/backup.spec.ts`
- `src/components/AdBanner.vue`
- `src/stores/prefs.ts`
- `src/App.vue`
- `vite.config.ts`
- `tests/unit/prefs.spec.ts`
- `src/utils/cardSets.ts`
- `tests/e2e/library-sort.spec.ts`
