---
type: Business Rule
title: Unsaved changes are saved on leave, never lost to an update
description: Screens with edits save when the user navigates away, warn before the tab closes, and hold back a new app version until nothing is unsaved.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Unsaved changes are saved on leave, never lost to an update

## Rule

- A screen that holds edits sets `session.unsavedChanges` while they are unsaved.
- Leaving it by any route saves first. If the save fails, the user confirms before the edits are discarded; while a
  save is running, navigation waits.
- Closing or reloading the tab while there are unsaved changes, or a write in flight, triggers the browser's leave
  warning, because closing skips the router's save-on-leave (comment in `App.vue`).
- A newly deployed version is applied as soon as nothing is unsaved: immediately when idle, otherwise once the user
  has saved or left (`setupPwaUpdates`, `registerType: 'prompt'` in `vite.config.ts`).
- When the user signs out, from any tab, `unsavedChanges` is cleared and the user is sent to `/login`.

## History

- 2026-11-05: only the editor and the set review screen held unsaved edits; now `/due` does too, saving each rated set on leave, for [spaced repetition](../features/spaced-repetition.md).

## Where it is enforced

- `onBeforeRouteLeave` in `src/views/Add.vue`, `src/views/View.vue` and `src/views/Due.vue` (which saves every set rated in the session).
- `warnBeforeUnload` in `src/App.vue`.
- `setupPwaUpdates` in `src/pwa.ts`.
- `watchAuthChanges` in `src/router/index.ts`.

## Sources

- `src/views/Add.vue`
- `src/views/View.vue`
- `src/views/Due.vue`
- `src/App.vue`
- `src/pwa.ts`
- `src/stores/session.ts`
- `src/router/index.ts`
- `vite.config.ts`
