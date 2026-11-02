# Usability Features Spec

**Date:** 2026-11-02
**Status:** Approved 2026-11-03, with its nine plans; to be built later
**Scope:** Nine feature areas that make the flashcards PWA faster to fill and better to study with. Each area has
its own plan in `docs/plans/`; this spec is what all nine quote.

## 1. Roadmap

Build the plans in this order. A plan may start once the plans it depends on are merged to `master`.

| # | Plan | Depends on | Why that order |
|---|---|---|---|
| 1 | `2026-11-02-study-modes.md` | none | Changes the review screen and the card mapper everyone else builds on |
| 2 | `2026-11-02-faster-authoring.md` | none | Editor only; can run beside plan 1 |
| 3 | `2026-11-02-spaced-repetition.md` | 1 | Extends the review screen and the study queue |
| 4 | `2026-11-02-library-search-sort.md` | 1 | Sorts by `studiedAt`, which plan 1 writes |
| 5 | `2026-11-02-progress-habits.md` | 1, 3 | Counts reviews on the review screen (plan 1) and on `/due` (plan 3) |
| 6 | `2026-11-02-rich-cards.md` | 1 | Renders card text in the components plan 1 changes |
| 7 | `2026-11-02-offline-study.md` | 1–6 | Changes every save path; lands after the features that add save paths |
| 8 | `2026-11-02-sharing.md` | 6, 7 | Writes a second document on save (plan 7's save path); previews with plan 6's renderer |
| 9 | `2026-11-02-reminders.md` | 2, 3 | Downloads through plan 2's `downloadText()`; badges plan 3's due count |

## 2. Global rules (every plan)

- 2.1 "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The
  English copy is the copy given in this spec, word for word. The implementer writes the Hindi strings, and the PR
  lists them for a Hindi reader to check.
- 2.2 "The Firestore schema stays readable by the version of the app that is live today." New fields are optional,
  and `cards` stays a JSON string (the rules require it).
- 2.3 "No new paid Firebase product." The project is on the Blaze plan, but these nine plans use only Hosting, Auth
  and Firestore within their free quotas: no Cloud Functions, no Cloud Storage, no Cloud Messaging. Features that
  would cost money are kept for a later pro plan (section 15).
- 2.4 "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
  Every new control has an accessible name.
- 2.5 "Keyboard shortcuts never fire while a text field, textarea or dialog has focus, or while Ctrl, Alt or Meta
  is held."
- 2.6 "A set's serialized `cards` must stay at or under 900,000 bytes of UTF-8." Above that, the save is refused
  with: "This set is too big to save. Split it into smaller sets." (Firestore's document limit is 1 MiB.)
- 2.7 Unit tests are Vitest in `tests/unit/<name>.spec.ts`. End-to-end tests are Playwright in
  `tests/e2e/<flow>.spec.ts`, against the emulators through `npm run test:e2e`. Rules tests go in
  `tests/unit/firestore.rules.spec.ts`.
- 2.8 A `firestore.rules` change only takes effect once someone runs `deploy.yml` by hand with **deploy_rules** ticked.
  A plan that changes the rules says so in its last task.
- 2.9 "Every string with a count uses vue-i18n plural forms, singular | plural." This spec writes the plural form;
  the singular is the same sentence with the singular noun ("1 card due", "Matches in 1 card", "1 line skipped (no
  back side): line 4", "Restored 1 set.", "You knew 1 of 1 card.").
- 2.10 Every online-only action, when offline, shows the existing message "You're offline. Connect to the internet
  to save." unless this spec gives another one.

## 3. Data model changes

### 3.1 Card fields survive round trips

"`parseCards` keeps every field of a stored card, including ones this version does not know, so a newer version's
fields are not lost when an older version saves." (Plan 1, first.) Today `parseCards` rebuilds each card from the
five known fields and drops the rest.

### 3.2 New fields

| Where | Field | Type | Plan | Meaning |
|---|---|---|---|---|
| set doc | `studiedAt` | Timestamp, optional | 1 | When a review session of this set last saved |
| card (inside `cards`) | `srs` | `{ due: string; interval: number; ease: number; reps: number; lapses: number }`, optional | 3 | Spaced-repetition state; `due` is a `YYYY-MM-DD` local date |
| set doc | `speech` | `{ front?: string; back?: string }`, optional | 6 | BCP 47 language for reading each side aloud |
| set doc | `shareId` | string, optional | 8 | Id of this set's public copy in `shared-sets` |
| new collection | `user-stats/{uid}` | `{ uid, goal: number, days: map<'YYYY-MM-DD', number> }` | 5 | Daily review counts and the daily goal |
| new collection | `shared-sets/{shareId}` | `{ ownerUid, title, color, cards: string, updatedAt }` | 8 | Public, read-only copy of a set |

`updateDoc` leaves top-level fields it is not given alone, so set-level fields need no extra care. `learned` stays
on every card, and every plan keeps it correct, because the live app reads only `learned`.

## 4. Study modes (plan 1)

- 4.1 Keyboard shortcuts on the review screen: "Space flips the card. Right arrow goes to the next card and Left
  arrow to the previous one. K marks the card as learned and J as not learned. ? opens the list of shortcuts."
  K and J set the value; they do not toggle it. After K, the screen moves to the next card, as the tick button does
  today. The list is a dialog titled "Keyboard shortcuts" with one row per key: "Flip the card", "Next card",
  "Previous card", "Mark as learned", "Mark as not learned", "Show keyboard shortcuts". Plan 3 adds "Rate the card
  (Again, Hard, Good, Easy)" for 1–4, and plan 6 adds "Read aloud" for R.
- 4.2 Study options, in an option panel titled "Study options" on the review screen:
  - "Shuffle": cards in random order. Off by default.
  - "Unlearned only": only cards not marked learned. Off by default.
  - "Back first": each card starts on its back side. Off by default.
  - "Reset progress": asks "Reset progress for this set? All cards will be marked as not learned.", buttons
    "Cancel" and "Reset". Clears `learned` (and `srs`, once plan 3 is in) on every card.
  - "Keyboard shortcuts": opens the same list as `?`.
  The three toggles are remembered on this device (localStorage keys `study-shuffle`, `study-unlearned-only`,
  `study-reverse`).
- 4.3 Unlearned only with nothing to show: title "All cards learned", subtitle "Turn off “Unlearned only” or reset
  progress to study again."
- 4.4 Session summary. When the person marks the last card in the queue, or presses Done on it, a dialog shows
  "Session complete" and "You knew {known} of {total} cards." with buttons "Review {missed} missed" (hidden when
  nothing was missed) and "Back to home". "Review missed" restarts the session with only the cards not learned,
  in the same order.
- 4.5 "Peeking at the answer marks the card as not yet learned" stays as it is in plan 1. Plan 3 replaces it.
- 4.6 Saving a review session also sets the set's `studiedAt` to now.
- 4.7 Progress counts in the top bar (`learned/total`) always count the whole set, not the filtered queue.

## 5. Faster authoring (plan 2)

- 5.1 Bulk import. The editor's options get "Import cards", which opens a dialog with a text box ("Paste cards, one
  per line"), a file picker ("Choose a file"; `.csv`, `.tsv`, `.txt`, max 2 MB) and an "Add cards" button. One card
  per line. Front and back are split at the first tab; a line with no tab is split at the first `;`, and a line with
  neither is skipped. CSV files are read with RFC 4180 quoting and the first two columns are used; a first row that
  is exactly `front,back` or `front,back,learned` (any case) is a header and is not imported, so this app's own
  export imports cleanly. Blank lines are ignored. Imported cards go after the existing ones.
  - Preview before adding: "{n} cards ready to add", and when lines were skipped, "{k} lines skipped (no back side):
    lines {list}". The list shows at most 10 line numbers, then "…".
  - At most 1,000 cards per import: "You can import up to 1,000 cards at a time." Over that, nothing is imported.
  - A file over 2 MB: "That file is too big. The limit is 2 MB."
  - Then rule 2.6 applies on save.
- 5.2 Export. The editor's options get "Export as CSV" (columns `front,back,learned`, RFC 4180 quoting, UTF-8 with BOM
  so Excel opens Hindi text correctly) and "Export as JSON". The file is named after the set title, with characters
  that are not Unicode letters (with their combining marks, so Hindi vowel signs stay), digits, `-` or `_` replaced
  by `-`, or `flashcards-set` when untitled or when no letter or digit is left. Downloads go through one helper,
  `downloadText()` (section 13), which other plans reuse.
- 5.3 Backup. Settings gets "Back up all sets", which downloads `flashcards-backup-YYYY-MM-DD.json` with every set
  that is not in the bin and every label. It also gets "Restore from backup", which adds the backup's sets as new
  sets, never overwriting one, and reports "Restored {n} sets.". A backup's labels are matched to existing labels by
  their text; missing ones are created, and the restored sets point at the matching labels. A file that is not a
  backup: "That file isn't a flashcards backup." Restore is online-only (rule 2.10). Like the other Settings rows,
  each has a description: "Download every set and label as one file." and "Add the sets from a backup file. Nothing
  you have is overwritten."
- 5.4 Duplicate. The editor's options get "Duplicate set" (only for a saved set), which creates
  "{title} (copy)" ("untitled set (copy)" when untitled) with the same cards, colour and labels, progress cleared,
  not a favourite and not shared, and opens the copy in the editor.
- 5.5 Reorder. The editor's options get "Reorder cards", a dialog listing the cards by front text with "Move up" and
  "Move down" buttons on each row. Changes apply when the dialog closes and are saved like any other edit.
- 5.6 Faster entry. In the card text dialog: on the front side, a "Next: back side" button (and Tab) switch to
  editing the back. On the back side, "Save and add next" (and Ctrl+Enter or ⌘+Enter) closes the dialog, adds a new
  card right after this one, and opens its front for editing.

## 6. Spaced repetition (plan 3)

- 6.1 After the card is flipped, the review screen shows four buttons: "Again", "Hard", "Good", "Easy". The keys
  1–4 press them. Rating moves to the next card.
- 6.2 Scheduling is SM-2 style, in whole days, on the device's local date:
  - A new card has no `srs`. Its first rating starts it with ease 2.5, reps 0, lapses 0, interval 0.
  - Again: reps 0, lapses + 1, ease − 0.20, interval 0 (due today; it comes back at the end of this session once).
  - Hard: interval max(1, round(interval × 1.2)), ease − 0.15, reps + 1.
  - Good: interval 1 when reps is 0, 3 when reps is 1, otherwise round(interval × ease); reps + 1.
  - Easy: the Good interval × 1.3, rounded, at least 4; ease + 0.15; reps + 1.
  - Ease never goes below 1.3. `due` is today + interval days.
- 6.3 `learned` stays in step: "Again" sets `learned` to false; the other three set it to true.
- 6.4 "Flipping a card no longer marks it as not learned." The rating buttons replace that rule.
- 6.5 A card is due when it has no `srs` (a new card) or its `srs.due` is today or earlier.
- 6.6 The study queue across all non-bin sets is: started cards that are due, oldest `due` first, then at most 20
  new cards, taking sets by title (as the "Alphabetically" order sorts them) and cards in their stored order. Home
  shows "{n} cards due" with a "Study now" button when that queue is not empty, where {n} is the queue's length.
  "Study now" opens `/due`, which reviews that queue. Each set touched is saved when the session ends, through the
  same leave-guard rules as the review screen. When the queue runs out, the session summary of 4.4 shows.
- 6.7 With nothing due, `/due` shows title "Nothing due", subtitle "You're all caught up. Come back tomorrow."
- 6.8 Each set card on Home shows "{n} due" for its started cards that are due, and "{m} new" for its cards never
  studied, each hidden at 0. These count the whole set, so they can add up to more than the Home banner, which caps
  new cards at 20.
- 6.9 Reset progress (4.2) also clears `srs`.

## 7. Library search and sort (plan 4)

- 7.1 Search matches a set when the text appears in its title or in any card's front or back, ignoring case.
- 7.2 A set that matches only through its cards shows "Matches in {n} cards" on its Home card.
- 7.3 New sort orders in Settings: "Least learned first" (by learned percentage, lowest first; ties by title) and
  "Recently studied" (by `studiedAt`, newest first; never-studied sets last, by title). Stored values `Progress`
  and `Recently studied`.
- 7.4 Each set card shows "Studied {relative time}", for example "Studied 3 days ago", or "Not studied yet".

## 8. Progress and habits (plan 5)

- 8.1 A review counts once per card per session, on the review screen and on `/due`: marking, unmarking or rating
  the same card again in one session does not count twice. Counts are written when the session saves.
- 8.2 Streak: the number of consecutive local days with at least one review, ending today, or ending yesterday when
  nothing is reviewed yet today.
- 8.3 Daily goal: 10, 20, 50 or 100 cards, set in Settings ("Daily goal"), default 20, stored in `user-stats`.
- 8.4 Home shows "{n}-day streak" (hidden at 0) and "{done}/{goal} today".
- 8.5 A Stats page (`/stats`, in the Home menu as "Stats") shows the last 30 days as bars, plus "Cards reviewed",
  "Current streak", "Longest streak" and "Sets mastered" (sets 100% learned). Each bar's accessible name is
  "{n} cards on {date}", with the date in the app language's medium format. If the stats fail to load, the page
  shows the existing load-error state with "Retry".
- 8.6 `user-stats/{uid}` is readable and writable only by that user, and the document id must equal their uid.
- 8.7 If the stats write fails, the review progress is still saved and the error snack says "Couldn't update your
  stats. Your progress is saved."

## 9. Rich cards (plan 6)

- 9.1 Card text is Markdown: bold, italic, lists, inline code, code blocks, links and images. Raw HTML is shown as
  text, never run.
- 9.2 Rendered HTML is sanitized before it reaches the page. Links open in a new tab with `rel="noopener noreferrer"`.
  Only `https:` images and `http:`/`https:`/`mailto:` links are kept; relative and protocol-relative (`//host/…`)
  addresses are dropped. Every place that shows card text (review, editor, share preview) renders it through
  `renderCardText()` (section 13).
- 9.3 Images are added by URL. The card text dialog gets "Insert image", which opens a small dialog with an
  "Image address" field and an "Insert" button, and inserts `![](url)`. A non-`https` address: "Use an image address that starts with https://". Images are at most 40% of the
  card's height. (No uploads, rule 2.3.)
- 9.4 Read aloud: on the review screen each face has a "Read aloud" button, and R reads the visible side. It speaks
  the card's text without Markdown, in the side's `speech` language, or the browser default when none is set. The
  button is hidden when the browser has no speech synthesis.
- 9.5 The editor's options get "Read-aloud language" with two selects, "Front" and "Back", listing the languages of
  the voices the browser has, plus "Browser default".

## 10. Offline study (plan 7)

- 10.1 Firestore uses its persistent local cache (IndexedDB, shared across tabs), falling back to memory when
  IndexedDB is not available.
- 10.2 "Reviewing, editing, creating, favouriting and moving sets to the bin work offline and sync when the
  connection is back." Creating and renaming labels work offline too. The controls that are disabled offline today
  are enabled.
- 10.3 Offline, a save counts as done once it is in the local cache; the app does not wait for the server. The first
  offline save after going offline shows: "Saved on this device. It will sync when you're back online."
- 10.4 A write the server later refuses shows the existing save error snack.
- 10.5 Deleting forever from the bin, sign-in, profile changes, sharing (plan 8) and restore from backup stay
  online-only. Offline, delete forever says "You're offline. Connect to the internet to delete this set."; the
  others use rule 2.10's message.
- 10.6 Signing out clears the local cache, so the next person on the device does not see the last user's sets.
  Offline, sign-out is refused with "You're offline. Connect to the internet to sign out, so your changes aren't
  lost." because unsynced changes would be cleared with the cache.
- 10.7 Known limit: on a connection that is up but not working, the app thinks it is online, and saves wait for the
  server as they do today. The existing slow-network snack still shows after 8 seconds.

## 11. Sharing (plan 8)

- 11.1 The editor's options get "Share set", which creates a public copy and shows a dialog: "Anyone with the link
  can view this set and copy it into their own library. Your progress is not shared.", with "Copy link" ("Link
  copied") and "Stop sharing".
- 11.2 The link is `/s/{shareId}`, where `shareId` is a random Firestore document id.
- 11.3 The public copy holds only `ownerUid`, `title`, `color`, `cards` (with `learned` false and no `srs`) and
  `updatedAt`. No name, email, photo or labels.
- 11.4 While a set is shared, every save of it also updates its public copy. Moving a shared set to the bin keeps
  it shared; deleting it forever also deletes its public copy. Duplicates, restores from backup and copies made
  from a share are never shared. If the public copy is gone when a save tries to update it, the set's `shareId`
  is cleared and the public copy is not recreated.
- 11.5 "Stop sharing" deletes the public copy and clears `shareId`, then says "Stopped sharing. The old link no
  longer works."
- 11.6 `/s/{shareId}` works signed in or out. It shows the title, the card count ("{n} cards") and the first 5
  cards rendered as Markdown through `renderCardText()`, and "Add to my library". Signed out, that button goes through sign-in and comes back to finish the copy. The copy is a new set
  with the shared title, colour and cards, and no labels; then "Added to your library" and the copy opens.
- 11.7 A missing or stopped link: title "This link doesn't work", subtitle "The owner may have stopped sharing it."
- 11.8 Rules: anyone may `get` a `shared-sets` document; nobody may `list` them. Only a signed-in user may create one,
  with `ownerUid` equal to their uid, only the five fields of 11.3, `title` a string of at most 200 characters, and
  `cards` a string of at most 900,000 characters. Only the owner may update (keeping `ownerUid`) or delete.

## 12. Reminders (plan 9)

- 12.1 Settings gets "Daily reminder": a time (default 19:00) and "Add to calendar", which downloads
  `flashcards-reminder.ics`, a daily repeating event at that local time called "Study flashcards" with the app's
  address in it, and an alert at the event's start. The row's description is "Add a daily study reminder to your
  calendar." The time is remembered on this device (localStorage key `reminder-time`). The file is downloaded
  through `downloadText()` (section 13).
- 12.2 When installed as an app, the icon shows the number of cards due (plan 3), and no badge at 0, through the
  Badging API where the browser has it. It updates on load and after each review session.
- 12.3 Out of scope: push notifications. They need Firebase Cloud Messaging plus a scheduled Cloud Function, which
  is billed usage (rule 2.3). They are a pro plan feature (section 15).

## 13. Cross-plan contracts

These names are shared between plans. A plan that produces one uses exactly this signature, and a plan that
consumes one says which plan built it.

```ts
// Plan 1 — src/utils/dates.ts
export function localDate(date?: Date): string;            // 'YYYY-MM-DD' in the device's time zone
export function addDays(day: string, days: number): string; // 'YYYY-MM-DD' ± days

// Plan 1 — src/utils/studyQueue.ts
export interface StudyOptions { shuffle: boolean; unlearnedOnly: boolean }
export function buildQueue(cards: FlashCard[], options: StudyOptions, random?: () => number): string[]; // card ids
export function summarize(cards: FlashCard[], queue: string[]): { known: number; total: number; missed: string[] };

// Plan 1 — src/composables/useStudyShortcuts.ts
// Keys are KeyboardEvent.key values (' ', 'ArrowRight', 'k', '?', '1', 'r', …). Rule 2.5 applies.
export function useStudyShortcuts(bindings: () => Record<string, () => void>): void;

// Plan 1 — src/types.ts
interface CardSet { studiedAt?: Date }

// Plan 3 — src/utils/srs.ts
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface SrsState { due: string; interval: number; ease: number; reps: number; lapses: number }
export function schedule(srs: SrsState | undefined, rating: Rating, today: string): SrsState;
export function isDue(card: FlashCard, today: string): boolean;
export const NEW_CARDS_PER_REVIEW = 20;
export interface DueEntry { setId: string; cardId: string }   // CardSet.id, FlashCard.id
export function dueQueue(sets: CardSet[], today: string): DueEntry[]; // the queue of 6.6, non-bin sets only
export function dueCount(sets: CardSet[], today: string): number;     // dueQueue(sets, today).length
export function setDueCounts(set: CardSet, today: string): { due: number; new: number }; // the 6.8 counts

// Plan 5 — src/stores/stats.ts
export interface StatsStore {
  goal: number; todayCount: number; streak: number; longestStreak: number;
  days: Record<string, number>; status: 'idle' | 'loading' | 'ready' | 'error';
  load(): Promise<void>; recordReviews(count: number): Promise<boolean>; setGoal(goal: number): Promise<boolean>;
  reset(): void;
}
export const useStatsStore: () => StatsStore;

// Plan 2 — src/utils/download.ts
export function downloadText(fileName: string, content: string, mimeType: string): void;

// Plan 6 — src/utils/markdown.ts
export function renderCardText(text: string): string; // sanitized HTML (9.1, 9.2), safe for v-html
export function cardPlainText(text: string): string;  // the text without Markdown, for reading aloud
```

`GroupCardFlash` (plan 1) exposes `next()`, `prev()`, `goTo(index: number)` and `flipFocused()`; `CardFlash` takes
a `reverse` prop and exposes `flip()`. Plans 3 and 6 add to these components rather than replacing them.

## 14. Open decisions

- 14.1 Push reminders and image uploads are billed usage (Cloud Functions + Cloud Messaging; Cloud Storage). This
  spec leaves both out; they are in the pro plan (section 15).
- 14.2 Spaced repetition uses SM-2 (6.2), not FSRS: it is simpler to test and needs no per-user tuning. FSRS can
  replace `schedule()` later without a data change beyond `srs`.

## 15. Pro plan (later)

Not built by these nine plans. Each item costs money in Firebase or another service once usage passes the free
quotas, so it is kept for a paid pro plan with its own spec. Prices are approximate list prices for US regions at
the time of writing; check the Firebase and Google Cloud pricing pages before deciding.

| Feature | Services | What drives the cost |
|---|---|---|
| Image uploads (instead of image addresses, 9.3) | Cloud Storage | Grows with users × images. Free up to about 5 GB stored and 1 GB downloaded a day; then about $0.026/GB a month stored and $0.12/GB downloaded. The largest cost risk. |
| Push reminders (instead of the calendar file, 12.1) | Cloud Functions, Cloud Scheduler, Cloud Messaging | Messaging is free; one daily scheduled function stays inside the free 2M calls a month for a long time. Mostly cents for Scheduler jobs past 3 and stored function builds. Adds server code to maintain. |
| Generate cards with AI (from notes, a PDF or a topic) | An LLM API | Every generation is a paid API call. |
| Natural voices for read aloud (instead of the browser's, 9.4) | Cloud Text-to-Speech | Billed per character spoken. |
| Backup history (daily snapshots to roll back to) | Cloud Storage, a scheduled Cloud Function | Storage grows with users × days kept. |

- 15.1 Sharing (section 11) stays in the free plans. It is the one free feature whose cost is driven by people who
  are not users: every view of a shared link is a Firestore read. If a link spreads widely, revisit it here.
- 15.2 A pro plan also needs payments (the Stripe extension for Firebase is the usual route), a pro flag per user,
  and Firestore and Storage rules that enforce it. Hiding buttons in the app is not enough.
- 15.3 Before any of this ships, set a budget alert in Google Cloud Billing. Blaze has no spending cap.
