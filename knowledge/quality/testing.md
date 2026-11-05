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
  library and prefs stores, the study queue, the keyboard shortcut composable and the card components (mounted with `@vue/test-utils`), that the two locale files match, and the kill switch's logic.
- **Security rules** (`tests/unit/firestore.rules.spec.ts`): owner-only access and the stored shape, run on the
  Firestore emulator with `@firebase/rules-unit-testing`.
- **End-to-end** (`tests/e2e/*.spec.ts`, Playwright): sign-in redirects and sign-up validation, creating,
  studying (study modes in `tests/e2e/study-modes.spec.ts`), editing and binning sets, search and label filters, settings persistence, and axe accessibility scans
  ([accessibility](../design-system/accessibility.md)). They run on a production build in `emulator` mode against
  the Auth and Firestore emulators, in a desktop and a mobile project, with the service worker blocked and reduced
  motion on (`playwright.config.ts`).
- E2E accounts exist only in the Auth emulator for one run; `tests/e2e/helpers.ts` holds their shared password and
  makes unique emails. That password and `.env.emulator` are test values, not secrets.
- Nothing tests against the live Firebase project; that is left to the developer.

## How to run it

- `npm test` (unit), `npm run test:rules` (rules), `npm run test:e2e` (builds `dist-e2e/`, then starts the
  emulators and Playwright, whose preview runs on `DEV_PORTS.e2ePreview`, `2108`, from `dev-ports.ts`). The rules and e2e scripts need Java for the emulators. Scripts are in `package.json`.

## History

- 2026-11-05: component tests were absent; now `@vue/test-utils` is a dev dependency for mounting card components, for study modes.

## Sources

- `dev-ports.ts`
- `vite.config.ts`
- `playwright.config.ts`
- `package.json`
- `tests/e2e/study-modes.spec.ts`
- `tests/unit/firestore.rules.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/a11y.spec.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/sets.spec.ts`
- `.env.emulator`

## History

- 2026-11-05: the e2e preview ran on the tool's default port; now `DEV_PORTS.e2ePreview` (`2108`), because every local port moved into one block. See [ports](../decisions/local-ports-2100-block.md).
