---
type: Conventions
title: Conventions
description: How code is written in this repository — where files go, how components are named, how errors reach the user, where tests live, and which tools and policy keys govern lint, git and checks.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Conventions

## Naming

- Components are PascalCase, named kind first, then subject: `BarTop`, `BtnAction`, `CardFlashSet`,
  `GroupCardFlash` (`src/components/CardFlashSet.vue`). Single-word names are allowed
  (`vue/multi-word-component-names` is off in `./eslint.config.js`).
- Views are one word per screen: `src/views/Home.vue`, `Add.vue` (also used for edit), `View.vue`.
- Stores are `use<Name>Store`, written in setup style with `defineStore('<name>', () => …)`
  (`src/stores/library.ts`).
- Every user-facing string is an i18n key, present in both `src/locales/en.json` and `src/locales/hi.json`;
  `tests/unit/locales.spec.ts` checks they match. Strings with a count use vue-i18n plural forms (`singular | plural`, called `t(key, { n }, n)`).

## Folder layout

- `src/views/` screens, `src/components/` reusable pieces, `src/stores/` Pinia state, `src/services/` the
  Firebase boundary, `src/utils/` pure functions, `src/composables/` Vue composables that wrap browser events or reactive logic (`useStudyShortcuts.ts`), `src/plugins/` Vuetify and i18n setup, `src/types.ts` the
  shared types. Import with the `@/` alias (`vite.config.ts`).
- Only `src/services/firebase.ts` calls Firebase; views and components go through the stores.
- Cloud Functions live in `functions/src/`. Logic is kept free of SDK imports so the root unit tests can run it
  (`functions/src/killSwitch.ts`).

## Error handling

- Store write actions catch errors themselves, call `session.showError(err, '<i18n key>')`, and resolve to
  `null` or `false`; callers navigate only on success (`src/stores/library.ts`).
- Slow calls are wrapped in `session.track(...)`, which drives the loading bar and warns after
  `SLOW_NETWORK_MS` (`src/stores/session.ts`).
- Firebase Auth errors are mapped to i18n keys by `authErrorMessage` (`src/services/authErrors.ts`).

## Tests

- Unit tests: `tests/unit/<subject>.spec.ts`, Vitest with jsdom (`vite.config.ts` `test` block).
- Rules tests: `tests/unit/firestore.rules.spec.ts`, run on the Firestore emulator.
- End-to-end: `tests/e2e/*.spec.ts`, Playwright on a production build against the emulators. See
  [testing](../quality/testing.md).

## Lint and format

ESLint with the Vue and TypeScript recommended configs (`./eslint.config.js`); EditorConfig for whitespace
(`./.editorconfig`). There is no formatter.

## Git

- Commit messages are free-form: 1 of the last 100 commits is conventional, none carry a ticket. Policy:
  `git.message`, `git.ticket`.
- Work merges into `master` (16 of 16 merges), almost always squashed (15 of 16). Policy: `git.base`,
  `git.squash`.
- Branch names start with a conventional type, `feat/<topic>`, `fix/<topic>` and so on, never `claude/…`, as the
  developer set on 2026-11-03. Policy: `git.branch`.
- Every pull request is reviewed by the developer before it merges, Hindi strings included
  ([PR review](../decisions/pr-review.md)).

## Commands

From `package.json` scripts, run with pnpm (`pnpm-lock.yaml`; [pnpm](../decisions/pnpm-package-manager.md)); `functions/` too, with its own lockfile. Policy: `checks.commands.typecheck`,
`checks.commands.lint`, `checks.commands.test`, `checks.commands.e2e`. There is no lint-fix or format-check
command.

## History

- 2026-11-05: no composables folder; now `src/composables/` holds Vue composables, because `useStudyShortcuts` is neither a store nor a pure function.
- 2026-11-04: commands ran with npm (`package-lock.json`); now pnpm (`pnpm-lock.yaml`), as the developer switched. See [pnpm](../decisions/pnpm-package-manager.md).
- 2026-11-03: branch names had no convention (mostly `claude/…`); now `<type>/<topic>`, as the developer set, so the history no longer reflects the rule.

## Sources

- `./eslint.config.js`
- `./.editorconfig`
- `./package.json`
- `./pnpm-workspace.yaml`
- `package.json`
- `vite.config.ts`
- `src/components/CardFlashSet.vue`
- `src/views/Home.vue`
- `src/views/Add.vue`
- `src/views/View.vue`
- `src/stores/library.ts`
- `src/stores/session.ts`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `src/types.ts`
- `src/locales/en.json`
- `src/locales/hi.json`
- `tests/unit/locales.spec.ts`
- `tests/unit/firestore.rules.spec.ts`
- `functions/src/killSwitch.ts`
