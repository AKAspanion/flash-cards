# TWA Splash Spec

**Date:** 2026-11-04
**Status:** Draft, for the developer's review
**Scope:** The Android app's cold launch shows one splash, held until the first screen is ready, then one fade.

This replaces the investigation in [the TWA polish spec](2026-11-04-twa-polish.md) §5.3, and continues its §5.1.

## 1. What a cold launch shows today

Recorded on a Galaxy SM-S731B (Android 17, Chrome `156.0.8078.79`), 20 frames a second:

1. The native splash: the splash image on `#ECECEC`.
2. About 350 ms of black. Chrome's window slides in from the right, dark because the phone is in dark mode.
3. The web page's boot logo: `android-chrome-192x192.png` at `96px`, a third of the native icon's size.
4. About 350 ms of near-blank white. Vue replaces the boot logo as soon as it mounts.
5. The first screen.

### Causes

- **Steps 2 and the slide.** Since Chrome 152, Chrome's `receiveFile` refuses the splash image unless the calling app
  holds a read grant on the URI. The app owns the FileProvider, so it never holds one. The library logs
  `Failed to transfer splash image.`, skips the splash parameters and the no-animation transition, and Chrome opens
  with its default slide and its own window.
  - Upstream: [GoogleChrome/android-browser-helper#623](https://github.com/GoogleChrome/android-browser-helper/issues/623).
  - Still open on Chrome 154, and seen here on 156.
- **Step 3.** The web page draws a different image, at a different size, from the native splash.
- **Step 4.** The boot logo is inside `#app`, so mounting Vue removes it before the first screen has rendered.

## 2. Android: hand the splash to Chrome again

- 2.1 `android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java` grants the app itself read permission
  on the library's splash file before `super.onCreate()` starts the launch.
  - The URI: the FileProvider authority `@string/providerAuthority` and the file `twa_splash/splash_image.png` under
    `getFilesDir()`. These are the library's folder and file names.
  - The flags: `FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_PERSISTABLE_URI_PERMISSION`. Android ignores a read-only
    grant to the provider's own app, and the persistable flag makes it record one. Nothing calls
    `takePersistableUriPermission`, so nothing is stored across restarts.
  - The file need not exist yet. The grant is on the URI.
  - Any exception is logged with `Log.w` and the launch goes on, without a splash, as today.
- 2.2 With the grant, Chrome shows the same splash image on `#ECECEC` until the page's first paint, then fades it out
  over `splashScreenFadeOutDuration` (`300` ms). The black window and the slide are gone.
- 2.3 Bubblewrap rewrites `LauncherActivity.java` whenever it regenerates `android/`. So that the grant can't be lost
  silently:
  - `tests/unit/twa.spec.ts` fails when the grant is missing or comes after `super.onCreate(`;
  - the [release runbook](../../knowledge/operations/android-release.md) says to re-apply it after regenerating.
- 2.4 The grant is removed once Chrome or `androidbrowserhelper` ships a fix for #623. The runbook says how to check.

## 3. Web: the same splash, held until the first screen is ready

- 3.1 `index.html` has a splash overlay, `#boot-splash`, beside `#app` rather than inside it, so mounting Vue doesn't
  remove it.
  - It covers the viewport, on `#ECECEC` whatever the dark setting, as the native and Chrome splashes are.
  - It shows the native splash image, copied from the `xxhdpi` drawable to `public/img/splash.png`, centred at
    `300px` × `300px`. One CSS pixel is one dp in Chrome, so it matches the native splash's size and position.
  - It is `aria-hidden="true"`.
  - Under `<noscript>`, a style hides it, so the "needs JavaScript" message shows.
  - It replaces the boot logo inside `#app`.
- 3.2 `src/main.ts` hides the splash once `router.isReady()` has resolved and the first screen has painted (the next
  animation frame after mount).
  - `router.isReady()` waits for the first navigation's guard, which reads the signed-in user, and for the first
    screen's code.
  - There is no minimum time: a fast launch hides it sooner.
  - If the first navigation fails, the splash still hides, so an error can be seen.
- 3.3 Hiding fades the overlay's opacity to 0 over `300` ms, with `pointer-events: none` from the start, then removes it
  from the page. It is removed after `400` ms even if the fade's end is never reported. Hiding twice, or with no
  overlay, does nothing.
- 3.4 The dark-aware page background from `public/early-paint.js` stays: it is what shows as the overlay fades, so a
  user who chose dark sees grey fade to dark.

## 4. What a cold launch shows after this

The native splash, Chrome's identical splash, the page's identical splash, then one fade to the first screen. No black
window, no slide, no change in the icon's size, and no blank frame.

## 5. Testing

- Unit:
  - `tests/unit/twa.spec.ts`: `LauncherActivity.java` grants `FLAG_GRANT_PERSISTABLE_URI_PERMISSION` on
    `twa_splash/splash_image.png`, before `super.onCreate(`.
  - The hide helper: fades, then removes, the overlay; removes it after `400` ms without a fade's end; does nothing
    when called twice or with no overlay.
- E2e: on `/login`, once the login form shows, `#boot-splash` is gone and the form takes clicks.
- On the phone: a cold-launch recording before and after. After:
  - logcat has no `Failed to transfer splash image.`;
  - no black frame;
  - the icon keeps its size and position until the fade.
- The existing e2e and axe scans keep passing; the overlay is gone before they act.

## 6. Knowledge

- `findings/twa-splash-image-not-transferred` becomes Fixed, with the cause.
- `apps/android` and `operations/android-release` describe the grant and how to re-apply it.
- A decision records why the splash is held until the first screen is ready, with no minimum time.

## 7. Out of scope

- The splash image itself.
- The warm-start path, where Chrome is already showing the app.
- The in-app dark setting's colour on the splash.
