---
type: Application
title: flash-cards web app
description: The Vue 3 + Vuetify PWA at the repository root, built by Vite and served by Firebase Hosting; every screen except login needs a signed-in user.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
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
- `vite.config.ts`: the dev server port (`server.port`), the `VUE_APP_` env prefix (`envPrefix`), the PWA manifest
  and service worker, vendor chunk splitting, and the Vitest setup.
- `src/plugins/vuetify.ts` and `src/plugins/i18n.ts`: theme and translations.

## Screens and routes

The routes are the `routes` array in `src/router/index.ts`; each loads a view from `src/views/` lazily. Every route
has `meta.requireAuth` except `/login`; unknown paths redirect to `/home`. The guard is described in
[auth](../security/auth.md). Each screen is a feature:

- `/home`: [library](../features/library.md)
- `/add`, `/:id/edit`: [edit a set](../features/edit-set.md)
- `/:id/view`: [study a set](../features/study-set.md)
- `/bin`: [bin](../features/bin.md)
- `/profile`: [profile and labels](../features/profile-and-labels.md)
- `/settings`, `/info`: [settings and about](../features/settings-and-about.md)
- `/login`: [sign-in](../features/sign-in.md)

## Depends on

- [Firebase](../integrations/firebase.md) Auth and Firestore, configured from `VUE_APP_*` variables
  ([environment](../operations/environment.md)).
- Firebase Hosting for serving, headers and the CSP (`firebase.json`).

## Sources

- `index.html`
- `package.json`
- `.nvmrc`
- `vite.config.ts`
- `src/main.ts`
- `src/App.vue`
- `src/router/index.ts`
- `src/plugins/vuetify.ts`
- `src/plugins/i18n.ts`
- `firebase.json`
