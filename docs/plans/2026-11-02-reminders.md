# Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete (built 2026-11-05 on feat/usability-plans-5-9)

**Goal:** People can add a daily "Study flashcards" event to their own calendar, and the installed app's icon shows how many cards are due.

**Architecture:** A pure function builds an RFC 5545 calendar file for a daily event at a chosen local time. Settings stores the time on the device and downloads the file through `downloadText()` (existing, from the faster-authoring plan). A small composable, mounted once in `App.vue`, watches the library and sets the app badge to the due count (existing, from the spaced-repetition plan) through the Badging API, doing nothing where the browser doesn't support it. No server, no push (spec 12.3, rule 2.3).

**Tech Stack:** Vue 3, Vuetify 4, Pinia, vue-i18n, TypeScript, Vitest (jsdom), Playwright with the Auth + Firestore emulators, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (section 12; rules 2.1, 2.3, 2.4, 2.7; contracts 13)

## Global Constraints

- Rule 2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader to check.
- Rule 2.3: "No new paid Firebase product." No Cloud Functions or Cloud Messaging; push reminders are out of scope (spec 12.3, 14.1).
- Rule 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`." Every new control has an accessible name.
- Rule 2.7: unit tests are Vitest in `tests/unit/<name>.spec.ts`; end-to-end tests are Playwright in `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`.
- This plan lands after the faster-authoring and spaced-repetition plans (spec section 1). It uses `downloadText()` from `src/utils/download.ts` (existing, from the faster-authoring plan), `dueCount()` from `src/utils/srs.ts` (existing, from the spaced-repetition plan; `dueQueue(sets, today).length`) and `localDate()` from `src/utils/dates.ts` (existing, from the study-modes plan), with the spec section 13 signatures.

## Checkpoints

None. The policy sets `run.checkpoints: none`.

---

### Task 1: Calendar file builder

**Files:**
- Create: `src/utils/ics.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/ics.spec.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 2):

```ts
// src/utils/ics.ts
export const REMINDER_FILE_NAME = 'flashcards-reminder.ics';
export const DEFAULT_REMINDER_TIME = '19:00';
export function isReminderTime(value: unknown): value is string; // 'HH:MM', 00:00–23:59
export interface DailyReminder {
  time: string;    // 'HH:MM', local
  summary: string; // event title, already translated
  url: string;     // the app's address
  now: Date;       // gives the first day (local date) and DTSTAMP
  uid: string;     // unique id for the event
}
export function buildDailyReminderIcs(reminder: DailyReminder): string;
```

File shape. A `VCALENDAR` with `VERSION:2.0`, a `PRODID`, `CALSCALE:GREGORIAN` and `METHOD:PUBLISH` holds one `VEVENT`:
- `UID:<uid>`
- `DTSTAMP` in UTC (`YYYYMMDDTHHMMSSZ`, from `now`)
- `DTSTART:YYYYMMDDTHHMM00` as floating local time, with no `TZID` and no `Z`; the date is `now`'s local date and the time is `time`
- `RRULE:FREQ=DAILY`
- `SUMMARY`
- `DESCRIPTION` holding the URL
- `URL`
- a `VALARM` with `ACTION:DISPLAY`, `TRIGGER:PT0M` and `DESCRIPTION` set to the summary: the alert at the event's start (§12.1)

Every line ends in CRLF, the last one included. A content line longer than 75 octets is folded: CRLF plus one space, with no line over 75 octets and no UTF-8 character split across lines. TEXT values (`SUMMARY`, `DESCRIPTION`) escape `\` as `\\`, `;` as `\;`, `,` as `\,`, and line breaks as `\n`. `URL` is not escaped. `buildDailyReminderIcs` throws when `isReminderTime(time)` is false.

New locale keys, with the spec's copy:
- `settings.reminder.title` "Daily reminder" (also the time field's label)
- `settings.reminder.desc` "Add a daily study reminder to your calendar."
- `settings.reminder.add` "Add to calendar"
- `reminder.summary` "Study flashcards"

**Spec:**
- §12.1: "Settings gets "Daily reminder": a time (default 19:00) and "Add to calendar", which downloads `flashcards-reminder.ics`, a daily repeating event at that local time called "Study flashcards" with the app's address in it, and an alert at the event's start. The row's description is "Add a daily study reminder to your calendar." The time is remembered on this device (localStorage key `reminder-time`). The file is downloaded through `downloadText()` (section 13)."

**Tags:** none

**Acceptance:**
- `isReminderTime` accepts `'00:00'`, `'07:30'` and `'23:59'`. It refuses `'24:00'`, `'7:30'`, `'07:60'`, `'07:30:00'`, `''`, `null` and `730`.
- Given time `'07:30'`, `now` = 2 November 2026 22:15 local, uid `'abc@flashcards'`, summary "Study flashcards" and url `https://flashcards.spanion.in/`, the output starts with `BEGIN:VCALENDAR\r\n`, ends with `END:VCALENDAR\r\n`, and has the lines `DTSTART:20261102T073000`, `RRULE:FREQ=DAILY`, `SUMMARY:Study flashcards`, `UID:abc@flashcards` and `URL:https://flashcards.spanion.in/`.
- Its `DTSTART` line has no `TZID` and no trailing `Z`. Its `DTSTAMP` line matches `^DTSTAMP:\d{8}T\d{6}Z$` and equals `now` in UTC.
- Splitting the output on `\r\n` leaves no bare `\n` inside any line.
- Given summary `Study, review; repeat\ now`, the `SUMMARY` line reads `SUMMARY:Study\, review\; repeat\\ now`.
- Given a summary of 60 Devanagari characters (180 UTF-8 bytes), every physical line is at most 75 octets. Each folded continuation line starts with one space. Every physical line decodes as valid UTF-8 (no character split). Unfolding (removing each CRLF followed by a space) gives back `SUMMARY:` plus the summary exactly.
- Given a 120-character ASCII URL, the `URL` line is folded at 75 octets and unfolds to the original URL.
- The `VALARM` block has `ACTION:DISPLAY` and `TRIGGER:PT0M`.
- Given time `'25:00'`, `buildDailyReminderIcs` throws.
- Given the locales test, the four new keys exist in both locale files.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/ics.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create `src/utils/ics.ts` with the real signatures first, so the tests fail on behaviour

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass. Add the locale keys.

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/ics.ts src/locales/en.json src/locales/hi.json tests/unit/ics.spec.ts
git commit -m "feat(reminders): build a daily reminder calendar file"
```

### Task 2: Daily reminder setting

**Files:**
- Modify: `src/stores/prefs.ts`
- Modify: `src/views/Settings.vue`
- Test: `tests/unit/prefs.spec.ts`
- Test: `tests/e2e/reminders.spec.ts`

**Interfaces:**
- Consumes: `buildDailyReminderIcs`, `isReminderTime`, `REMINDER_FILE_NAME`, `DEFAULT_REMINDER_TIME` and the `settings.reminder.*` / `reminder.summary` locale keys (Task 1); `downloadText(fileName: string, content: string, mimeType: string): void` (existing, from the faster-authoring plan; `src/utils/download.ts`); existing `usePrefsStore()` and its `read`/`persist` helpers.
- Produces:

```ts
// src/stores/prefs.ts — added
reminderTime: Ref<string>; // localStorage key 'reminder-time'; falls back to DEFAULT_REMINDER_TIME
```

Settings gets a "Daily reminder" row, described "Add a daily study reminder to your calendar.", with a time field (`type="time"`, labelled "Daily reminder") bound to `reminderTime`, and an "Add to calendar" button. The button builds the file with `t('reminder.summary')`, `window.location.origin + '/'`, `new Date()` and `crypto.randomUUID() + '@flashcards'`. It downloads the file with `downloadText(REMINDER_FILE_NAME, ics, 'text/calendar;charset=utf-8')`; this plan adds no download code of its own. A field value that fails `isReminderTime` isn't stored, and the button is disabled while it is invalid.

**Spec:**
- §12.1: "Settings gets "Daily reminder": a time (default 19:00) and "Add to calendar", which downloads `flashcards-reminder.ics`, a daily repeating event at that local time called "Study flashcards" with the app's address in it, and an alert at the event's start. The row's description is "Add a daily study reminder to your calendar." The time is remembered on this device (localStorage key `reminder-time`). The file is downloaded through `downloadText()` (section 13)."
- Rule 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."

**Tags:** `screen`, not security: `crypto.randomUUID` only makes a calendar event id

**Acceptance:**
- Given no `reminder-time` in localStorage, `reminderTime` is `'19:00'`. Given `'07:30'`, it is `'07:30'`. Given `'garbage'`, it is `'19:00'`.
- Given `reminderTime` changes to `'06:45'`, localStorage `reminder-time` becomes `'06:45'`.
- E2E: given a signed-in person on `/settings`, the "Daily reminder" row shows the description "Add a daily study reminder to your calendar." and its field shows `19:00`.
- E2E: given they set it to `07:30` and press "Add to calendar", the download is named `flashcards-reminder.ics`, and its text has `RRULE:FREQ=DAILY`, `SUMMARY:Study flashcards`, a `DTSTART:` line ending in `T073000`, and `URL:` followed by the app's base URL with a trailing `/`.
- E2E: given they set `07:30` and reload, the field still shows `07:30`.
- E2E: given the language is Hindi, the downloaded file's `SUMMARY` is the Hindi `reminder.summary` string.
- `/settings` passes the axe scan (rule 2.4) with the new row, at 390 px and desktop width.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/prefs.spec.ts` and `tests/e2e/reminders.spec.ts`

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: FAIL on the `reminderTime` assertions

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until the tests pass

- [x] **Step 4: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Run the e2e tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS, `a11y.spec.ts` included

- [x] **Step 6: Commit**

```bash
git add src/stores/prefs.ts src/views/Settings.vue tests/unit/prefs.spec.ts tests/e2e/reminders.spec.ts
git commit -m "feat(reminders): daily reminder time and add-to-calendar in settings"
```

### Task 3: App icon badge with the due count

**Files:**
- Create: `src/services/appBadge.ts`
- Create: `src/composables/useAppBadge.ts`
- Modify: `src/App.vue`
- Test: `tests/unit/appBadge.spec.ts`

**Interfaces:**
- Consumes: `dueCount(sets: CardSet[], today: string): number` (existing, from the spaced-repetition plan; `src/utils/srs.ts`, equal to `dueQueue(sets, today).length`); `localDate(date?: Date): string` (existing, from the study-modes plan; `src/utils/dates.ts`); existing `useLibraryStore()` (`sets`, `status`).
- Produces:

```ts
// src/services/appBadge.ts
export interface BadgeTarget { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
export function updateAppBadge(count: number, target?: BadgeTarget): Promise<void>; // target defaults to navigator

// src/composables/useAppBadge.ts
export function useAppBadge(): void; // call once, from App.vue's setup
```

`updateAppBadge` calls `setAppBadge(count)` when count > 0 and `clearAppBadge()` at 0. It does nothing when the target lacks those functions, and swallows a rejected promise: an unsupported or refused badge never shows an error snack. `useAppBadge` watches `library.status` and `library.sets`. Whenever the status is `ready`, it updates the badge with `dueCount(library.sets, localDate())`, and whenever the status is `idle` (signed out), it clears the badge. Because a saved review replaces the set in `library.sets`, the badge refreshes after every review.

**Spec:**
- §12.2: "When installed as an app, the icon shows the number of cards due (plan 3), and no badge at 0, through the Badging API where the browser has it. It updates on load and after each review session."

**Tags:** `failure-paths`, `security` (the checker counts "review session" in the quoted spec; the task clears the badge on sign-out so a signed-out device shows no one's count)

**Acceptance:**
- Given a target with both functions, `updateAppBadge(5, target)` calls `setAppBadge(5)` once and not `clearAppBadge`.
- Given the same target, `updateAppBadge(0, target)` calls `clearAppBadge()` once and not `setAppBadge`.
- Given a target with neither function (`{}`), `updateAppBadge(3, target)` resolves without throwing.
- Given `setAppBadge` rejects with a `NotAllowedError`, `updateAppBadge(3, target)` resolves, and `console.error` and the session snack are not called.
- Given a mounted component using `useAppBadge` and a library that becomes `ready` with sets holding 4 cards whose `srs.due` is today or earlier and no new cards ("today" from a mocked clock), the badge is set to 4.
- Given a library whose only cards are 30 new cards (no `srs`), the badge is set to 20, the length of the due queue (`NEW_CARDS_PER_REVIEW`), not 30.
- Given that, when a set is replaced so 1 card is due, the badge is set to 1. When none are due, it is cleared.
- Given the library resets to `idle` (sign-out), the badge is cleared.
- Given a set in the bin with 10 due cards and no other due cards, the badge is cleared (bin sets don't count).

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/appBadge.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create `updateAppBadge` and `useAppBadge` with their real signatures first, so the tests fail on behaviour

- [x] **Step 3: Write the minimal implementation** to the Interfaces, and call `useAppBadge()` in `App.vue`, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/services/appBadge.ts src/composables/useAppBadge.ts src/App.vue tests/unit/appBadge.spec.ts
git commit -m "feat(reminders): show the due count on the app icon badge"
```
