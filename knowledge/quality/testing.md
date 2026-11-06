---
type: Test Strategy
title: Testing
description: Vitest unit tests for logic and stores, emulator tests for the Firestore rules, and Playwright end-to-end and accessibility tests on a production build against the emulators, on desktop and mobile.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Testing

## What is tested

- **Unit** (`tests/unit/*.spec.ts`, Vitest with jsdom, configured in the `test` block of `vite.config.ts`): the
  card mapper, set filtering and sorting, colour shading, auth error mapping, the router's redirect logic, the
  library and prefs stores, the study queue, the keyboard shortcut composable and the card components (mounted with `@vue/test-utils`), card import, export and backup files, duplicating cards, the set size check, relative-time text (`tests/unit/relativeTime.spec.ts`), the SM-2 scheduler and due queue (`tests/unit/srs.spec.ts`), the card rating row (`tests/unit/CardFlash.spec.ts`), that the two locale files match, and the kill switch's logic.
- **Security rules** (`tests/unit/firestore.rules.spec.ts`): owner-only access and the stored shape, run on the
  Firestore emulator with `@firebase/rules-unit-testing`.
- **End-to-end** (`tests/e2e/*.spec.ts`, Playwright): sign-in redirects and sign-up validation, creating,
  studying (study modes in `tests/e2e/study-modes.spec.ts`), editing and binning sets, search and label filters, settings persistence, authoring, quick entry and backup (`tests/e2e/authoring.spec.ts`, `quick-entry.spec.ts`, `backup.spec.ts`), library search and sort (`tests/e2e/library-search.spec.ts`, `library-sort.spec.ts`), rating and the due review (`tests/e2e/srs-review.spec.ts`, `due-review.spec.ts`), and axe accessibility scans
  ([accessibility](../design-system/accessibility.md)). They run on a production build in `emulator` mode against
  the Auth and Firestore emulators, in a desktop and a mobile project, with the service worker blocked and reduced
  motion on (`playwright.config.ts`).
- Writing review e2e tests: wait for the card to show before pressing Space, wait for the flip animation to finish before clicking a rating (a click mid-flip lets Playwright's scroll-into-view move the slider), and leave `/due` on the last card through the summary's Back to home, since Done opens the summary.
- Writing library e2e tests: Home's search toggle and field share the "Search" label, so use the textbox role; open the Vuetify order select by clicking `.settings__select .v-field`; set titles look uppercase only through CSS, so assert on the real text.
- `tests/e2e/password-reset.spec.ts` reads reset codes from the Auth emulator's `oobCodes` endpoint and aborts `accounts:sendOobCode` to test a failed request.
- E2E accounts exist only in the Auth emulator for one run; `tests/e2e/helpers.ts` holds their shared password and
  makes unique emails. That password and `.env.emulator` are test values, not secrets.
- The emulators must be started from the branch being tested, because they load that checkout's `firestore.rules`:
  emulators left running from `master` have no `user-stats` or `shared-sets` block, so stats and sharing tests fail
  against them. Ports come from `DEV_PORTS` in `dev-ports.ts`.
- Offline saves no longer fail, so a test that needs a failed save uses a set over the size limit (which `saveSet`
  refuses before any write), not going offline.
- New unit specs: `stats`, `streaks`, `statsMapper`, `StatsView`, `markdown`, `speech`, `ics`, `appBadge`, `localCache`,
  `freshLoad`, `signOutAndClear`, `account`, `sharedSets`; the rules spec also covers `user-stats` and `shared-sets`.
  New e2e specs: `stats`, `review-counts`, `rich-cards`, `read-aloud-language`, `reminders`, `offline`,
  `offline-signout`, `share`, `shared-link` (`tests/e2e/stats-helpers.ts` seeds stats).
- The offline e2e tests wait for a write to reach the emulator before reloading: Firestore saves an offline write to
  IndexedDB a moment after the UI shows it, so an immediate reload could lose it (the label test flaked 8 of 30 runs
  before the wait, 0 of 30 after).
- Nothing tests against the live Firebase project; that is left to the developer.

## How to run it

- `npm test` (unit), `npm run test:rules` (rules), `npm run test:e2e` (builds `dist-e2e/`, then starts the
  emulators and Playwright, whose preview runs on `DEV_PORTS.e2ePreview`, `2108`, from `dev-ports.ts`). The rules and e2e scripts need Java for the emulators. Scripts are in `package.json`.

## History

- 2026-11-05: an offline label test reloaded at once and could lose its write; now the offline e2e tests wait for the write to reach the emulator first, because the label test flaked 8 of 30 runs.
- 2026-11-05: no tests covered stats, Markdown, read aloud, reminders, the offline cache, sign-out or sharing; now the specs listed above do, because of the progress-habits, rich-cards, reminders, offline-study and sharing plans.
- 2026-11-05: library search and sort had no tests; now `relativeTime.spec.ts`, `library-search.spec.ts` and `library-sort.spec.ts` cover them.
- 2026-11-05: no tests covered scheduling or rating; now `srs.spec.ts`, `CardFlash.spec.ts`, `srs-review.spec.ts` and `due-review.spec.ts` do, for spaced repetition.
- 2026-11-05: component tests were absent; now `@vue/test-utils` is a dev dependency for mounting card components, for study modes.

## Sources

- `dev-ports.ts`
- `vite.config.ts`
- `playwright.config.ts`
- `package.json`
- `tests/e2e/study-modes.spec.ts`
- `tests/e2e/password-reset.spec.ts`
- `tests/e2e/authoring.spec.ts`
- `tests/e2e/quick-entry.spec.ts`
- `tests/e2e/backup.spec.ts`
- `tests/unit/srs.spec.ts`
- `tests/unit/CardFlash.spec.ts`
- `tests/e2e/srs-review.spec.ts`
- `tests/e2e/due-review.spec.ts`
- `tests/unit/relativeTime.spec.ts`
- `tests/e2e/library-search.spec.ts`
- `tests/e2e/library-sort.spec.ts`
- `tests/unit/stats.spec.ts`
- `tests/unit/markdown.spec.ts`
- `tests/unit/sharedSets.spec.ts`
- `tests/unit/signOutAndClear.spec.ts`
- `tests/e2e/stats.spec.ts`
- `tests/e2e/stats-helpers.ts`
- `tests/e2e/review-counts.spec.ts`
- `tests/e2e/rich-cards.spec.ts`
- `tests/e2e/reminders.spec.ts`
- `tests/e2e/offline.spec.ts`
- `tests/e2e/share.spec.ts`
- `tests/e2e/shared-link.spec.ts`
- `tests/unit/setSize.spec.ts`
- `tests/unit/cardImport.spec.ts`
- `tests/unit/cardExport.spec.ts`
- `tests/unit/duplicateCards.spec.ts`
- `tests/unit/firestore.rules.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/a11y.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/sets.spec.ts`
- `.env.emulator`

## History

- 2026-11-05: the shared helper in `tests/e2e/helpers.ts` located Save by name; now it is exact, because "Save and add next" stays in the DOM while the text dialog closes.
- 2026-11-05: the e2e preview ran on the tool's default port; now `DEV_PORTS.e2ePreview` (`2108`), because every local port moved into one block. See [ports](../decisions/local-ports-2100-block.md).
