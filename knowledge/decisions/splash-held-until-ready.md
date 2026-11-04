---
type: Decision
title: One splash, held until the first screen is ready
description: A cold launch shows the native splash image throughout (Android, Chrome, then the web page), and the page hides it with one fade once the first screen has rendered, with no minimum time; the Android app self-grants its splash URI so Chrome 152+ accepts the handover.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T11:38:32Z }
---

# One splash, held until the first screen is ready

## Context

The developer found the Android app's launch jittery. A recording showed five different screens in about a second.

- The native splash.
- Chrome's black window sliding in. Since Chrome 152, Chrome refuses the splash handover unless the app holds a read
  grant on its own splash URI ([GoogleChrome/android-browser-helper#623](https://github.com/GoogleChrome/android-browser-helper/issues/623)).
- A smaller boot logo on the web page.
- A blank frame when Vue mounted.
- The first screen.

The developer asked for the splash to stay until the app is ready, then the app to show.

## Decision

- The same image shows at each stage of a cold launch:
  - the native splash;
  - Chrome's splash, handed over again because `LauncherActivity` grants itself
    `FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_PERSISTABLE_URI_PERMISSION` on the splash URI before `super.onCreate()`;
  - the page's own splash overlay, `#boot-splash`, at the same size and position.
- The page hides it with one fade once the first route has resolved and painted.
- No minimum time is added: the splash lasts as long as loading does.
- The splash's background is `#ECECEC` whatever the in-app dark setting, matching the native and Chrome splashes.

## Consequences

- Bubblewrap rewrites `LauncherActivity.java` when it regenerates `android/`, so the grant has to be re-applied. A unit
  test fails without it.
- The grant is a workaround: remove it once Chrome or `androidbrowserhelper` fixes #623.
- Every e2e test starts behind the overlay. It is removed once the first screen is ready, and Playwright waits for it.

## Sources

- [TWA splash spec](../../docs/specs/2026-11-04-twa-splash.md)
- `android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java`
- `index.html`
- `src/main.ts`
- `src/utils/bootSplash.ts`
