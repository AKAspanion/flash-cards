---
type: Application
title: flash-cards web app
description: The Vue 3 + Vuetify PWA at the repository root, built by Vite and served by Firebase Hosting; every screen except login and the two public pages needs a signed-in user.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# flash-cards web app

## Role

The whole product a person uses: sign in, manage and study flashcard sets. It has no server of its own and talks
directly to Firebase (see [architecture](../project/architecture.md)).

## Stack

Vue 3, Vuetify, Pinia, Vue Router, vue-i18n and the Firebase web SDK, in TypeScript, built with Vite and
`vite-plugin-pwa`; versions are in `package.json`. The Node version is in `.nvmrc`.

## Entry points

- `index.html` loads `src/main.ts`, which mounts `src/App.vue` (bottom navigation `BarNav`, the global snack bar,
  online/offline tracking and the leave-page warning).
- `public/early-paint.js`: loaded from `index.html` before the app (a file, because the CSP blocks inline scripts); it paints `#ECECEC`, or `#121212` when `localStorage` `dark` is `true`, so there is no white flash. Until the first screen is ready, `index.html` shows `#boot-splash` (the native splash image on `#ECECEC`) beside `#app`; `src/main.ts` fades it out through `hideBootSplash()` ([why](../decisions/splash-held-until-ready.md)).
- `pwa-manifest.ts`: the web manifest, kept apart so a unit test can compare it with the [Android app](android.md).
- `vite.config.ts`: the dev server port (`server.port`), the `VUE_APP_` env prefix (`envPrefix`), the PWA manifest
  and service worker, vendor chunk splitting, and the Vitest setup.
- `src/plugins/vuetify.ts` and `src/plugins/i18n.ts`: theme and translations.

## Screens and routes

The routes are the `routes` array in `src/router/index.ts`; each loads a view from `src/views/` lazily. Every route
has `meta.requireAuth` except `/login` and the routes with `meta.public` (`/privacy`, `/delete-account`), which are open to everyone; unknown paths redirect to `/home`. The guard is described in
[auth](../security/auth.md). Each screen is a feature:

- `/home`: [library](../features/library.md)
- `/add`, `/:id/edit`: [edit a set](../features/edit-set.md)
- `/:id/view`: [study a set](../features/study-set.md)
- `/bin`: [bin](../features/bin.md)
- `/profile`: [profile and labels](../features/profile-and-labels.md)
- `/settings`, `/info`: [settings and about](../features/settings-and-about.md)
- `/login`: [sign-in](../features/sign-in.md)
- `/privacy`, `/delete-account`: [privacy and deletion pages](../features/privacy-and-deletion-pages.md)
- `/profile` also hosts [account deletion](../features/account-deletion.md)

## Also built from this repository

- [Android app](android.md): the Trusted Web Activity in `android/` that wraps this site for Google Play.

## Depends on

- [Firebase](../integrations/firebase.md) Auth and Firestore, configured from `VUE_APP_*` variables
  ([environment](../operations/environment.md)).
- Firebase Hosting for serving, headers and the CSP (`firebase.json`).
- [Google AdSense](../integrations/google-adsense.md) for the banner on Home and Info, loaded only from `src/services/ads.ts`.

## History

- 2026-11-04: no outside services beyond Firebase; now Google AdSense shows one banner on Home and Info. See [one AdSense banner](../decisions/adsense-banner-ads.md).
- 2026-11-04: a small `img.boot-logo` showed until Vue mounted; now `#boot-splash` shows until the first route is ready, then fades, because the launch showed five different screens. See [the decision](../decisions/splash-held-until-ready.md).
- 2026-11-04: the page was blank white until the app mounted; now an early background and a logo show first, because the Android launch showed a white flash.
- 2026-11-04: every route but `/login` needed sign-in; now `/privacy` and `/delete-account` are public, for Google Play's listing. See [privacy and deletion pages](../features/privacy-and-deletion-pages.md).

## Sources

- `index.html`
- `public/early-paint.js`
- `package.json`
- `.nvmrc`
- `vite.config.ts`
- `src/main.ts`
- `src/services/ads.ts`
- `src/utils/bootSplash.ts`
- `src/App.vue`
- `src/router/index.ts`
- `pwa-manifest.ts`
- `src/plugins/vuetify.ts`
- `src/plugins/i18n.ts`
- `firebase.json`
