---
type: Feature
title: Daily reminder and app badge
description: Settings downloads a daily reminder .ics at a time kept on the device, and the installed app's icon badge shows the number of due cards, cleared on sign-out.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Daily reminder and app badge

## What it does

- Settings has a reminder time and an Add to calendar button, which downloads `flashcards-reminder.ics` (a daily
  event that links to the app) through `downloadText()`. The time is a device-local preference, `reminder-time` in
  localStorage (`src/stores/prefs.ts`), default `DEFAULT_REMINDER_TIME` (19:00); a stored value that isn't `HH:MM` reads
  as the default, and the button is disabled for an invalid field. The file is built by `src/utils/ics.ts`; nothing is
  sent to a server.
- Where the browser has the Badging API, the installed app's icon shows the due-card count (`useAppBadge`, called from
  `App.vue`, through `updateAppBadge`); no support or a refusal is ignored.

## Rules

- The badge is cleared when the library returns to `idle` (signed out), so no one's count is left on the device.

## Sources

- `src/utils/ics.ts`
- `src/stores/prefs.ts`
- `src/views/Settings.vue`
- `src/composables/useAppBadge.ts`
- `src/services/appBadge.ts`
- `src/App.vue`
- `tests/unit/ics.spec.ts`
- `tests/unit/appBadge.spec.ts`
- `tests/e2e/reminders.spec.ts`
- `docs/plans/2026-11-02-reminders.md`
