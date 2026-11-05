# Faster Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill a set quickly and move cards in and out of the app: bulk import, CSV/JSON export, backup and restore, duplicate, reorder, and faster card entry.

**Architecture:** Parsing, serializing and the size check are pure functions in `src/utils/` with their own unit tests. The editor (`Add.vue`) gets new options that open two new dialog components. Settings gets backup and restore. The card text dialog in `CardFlash.vue` gets the faster-entry controls, and `GroupCardFlash.vue` inserts the next card. The library store refuses a save that breaks the size limit, so every save path is covered.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, vue-i18n (en, hi), Firebase 13 Firestore, Vitest (jsdom), Playwright against the Auth/Firestore emulators, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (§2, §5)

## Global Constraints

- §2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader to check.
- §2.2: "The Firestore schema stays readable by the version of the app that is live today."
- §2.3: "No new paid Firebase product."
- §2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`." Every new control has an accessible name.
- §2.6: "A set's serialized `cards` must stay at or under 900,000 bytes of UTF-8." Above that, the save is refused with: "This set is too big to save. Split it into smaller sets."
- §2.7: unit tests in `tests/unit/<name>.spec.ts` (Vitest); end-to-end tests in `tests/e2e/<flow>.spec.ts` (Playwright, emulators, `npm run test:e2e`).
- §2.9: "Every string with a count uses vue-i18n plural forms, singular | plural." Locale values below are written `singular | plural`, and the code passes the count (`t(key, { n }, n)`).
- §2.10: an online-only action, offline, shows the existing `toast.offline-save` message "You're offline. Connect to the internet to save."
- No new dependency: CSV parsing, CSV writing and file download are written in `src/utils/`.
- The study-modes plan is merged (#39): `CardFlash.vue` already takes `reverse` and exposes `flip()`, and `GroupCardFlash.vue` exposes `scrollToCard`, `next`, `prev`, `goTo` and `flipFocused`. Task 4 adds to these and keeps every one (spec 13: later plans add to these components rather than replacing them). Amended 2026-11-05.

## Checkpoints

None: the policy's `run.checkpoints` is `none`, and no task here is tagged `security`.

---

### Task 1: Import parsing, size limit and the copy

**Files:**
- Create: `src/utils/setSize.ts`
- Create: `src/utils/cardImport.ts`
- Modify: `src/stores/library.ts` (`createSet`, `saveSet`)
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/setSize.spec.ts`
- Test: `tests/unit/cardImport.spec.ts`
- Test: `tests/unit/library.spec.ts`

**Interfaces:**
- Consumes: existing `FlashCard`, `CardSet` (`src/types.ts`); existing `useLibraryStore().createSet/saveSet` and the app's snack (`showSnack`).
- Produces (Tasks 3, 4, 5 rely on these):

```ts
// src/utils/setSize.ts
export const MAX_CARDS_BYTES = 900_000;
export function cardsByteSize(cards: FlashCard[]): number;   // UTF-8 bytes of JSON.stringify(cards)
export function fitsSizeLimit(cards: FlashCard[]): boolean;  // cardsByteSize(cards) <= MAX_CARDS_BYTES

// src/utils/cardImport.ts
export const MAX_IMPORT_CARDS = 1000;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export type ImportFormat = 'csv' | 'lines';                  // 'csv' for .csv files; 'lines' for pasted text, .tsv and .txt
export interface ImportResult {
  cards: { front: string; back: string }[];
  skippedLines: number[];                                    // 1-based source line numbers
  tooMany: boolean;                                          // cards.length > MAX_IMPORT_CARDS
}
export function parseImport(text: string, format: ImportFormat): ImportResult;
export function importFormatFor(fileName: string): ImportFormat;   // '.csv' (any case) → 'csv', otherwise 'lines'
export function skippedLinesText(lines: number[]): string;         // '3, 7, 9' — at most 10 numbers, then ', …'
```

Library store: `createSet` resolves to `null` and `saveSet` to `false`, without calling the api, when `fitsSizeLimit(set.cards)` is false. Both show the snack `toast.error.too-big`.

New locale keys, en copy (add every one to `hi.json` too):

| Key | English |
|---|---|
| `add.import.title` | Import cards |
| `add.import.paste` | Paste cards, one per line |
| `add.import.file` | Choose a file |
| `add.import.confirm` | Add cards |
| `add.import.ready` | 1 card ready to add \| {n} cards ready to add |
| `add.import.skipped` | {k} line skipped (no back side): line {list} \| {k} lines skipped (no back side): lines {list} |
| `add.import.too-many` | You can import up to 1,000 cards at a time. |
| `add.import.too-big` | That file is too big. The limit is 2 MB. |
| `add.export.csv` | Export as CSV |
| `add.export.json` | Export as JSON |
| `add.duplicate.action` | Duplicate set |
| `add.duplicate.title` | {title} (copy) |
| `add.reorder.title` | Reorder cards |
| `add.reorder.up` | Move up |
| `add.reorder.down` | Move down |
| `card.next-side` | Next: back side |
| `card.save-next` | Save and add next |
| `settings.backup.title` | Back up all sets |
| `settings.backup.desc` | Download every set and label as one file. |
| `settings.restore.title` | Restore from backup |
| `settings.restore.desc` | Add the sets from a backup file. Nothing you have is overwritten. |
| `toast.restored` | Restored 1 set. \| Restored {n} sets. |
| `toast.error.not-backup` | That file isn't a flashcards backup. |
| `toast.error.too-big` | This set is too big to save. Split it into smaller sets. |

**Spec:**
- §2.6: "A set's serialized `cards` must stay at or under 900,000 bytes of UTF-8." … "This set is too big to save. Split it into smaller sets."
- §5.1: "Front and back are split at the first tab; a line with no tab is split at the first `;`, and a line with neither is skipped."
- §5.1: "CSV files are read with RFC 4180 quoting and the first two columns are used; a first row that is exactly `front,back` or `front,back,learned` (any case) is a header and is not imported, so this app's own export imports cleanly. Blank lines are ignored."
- §2.9: "Every string with a count uses vue-i18n plural forms, singular | plural."
- §5.1: "{k} lines skipped (no back side): lines {list}". The list shows at most 10 line numbers, then "…".
- §5.1: "At most 1,000 cards per import: "You can import up to 1,000 cards at a time." Over that, nothing is imported."
- §5.1: "That file is too big. The limit is 2 MB."
- §5.3: "Download every set and label as one file."
- §5.3: "Add the sets from a backup file. Nothing you have is overwritten."

**Acceptance:**
- Given cards whose JSON is exactly 900,000 UTF-8 bytes, `fitsSizeLimit` is true; at 900,001 bytes it is false.
- Given a card whose front is `नमस्ते` (6 code points), `cardsByteSize` counts each Devanagari code point as 3 bytes, so it exceeds the same card in ASCII by 12 bytes.
- Given `saveSet` with cards over the limit, the api's `updateCardSet` is not called, it resolves `false`, and the snack reads "This set is too big to save. Split it into smaller sets."; `createSet` resolves `null` the same way.
- Given lines `hola\thello` and `adiós;goodbye`, `parseImport(…, 'lines')` gives fronts `hola`, `adiós` and backs `hello`, `goodbye`.
- Given `a;b\tc`, the split is at the tab: front `a;b`, back `c`.
- Given `a\tb\tc`, front `a`, back `b\tc` (split at the first tab only).
- Given `just a word` on line 2 and `front\t   ` on line 4, both are skipped and `skippedLines` is `[2, 4]`.
- Given blank and whitespace-only lines, they are neither cards nor skipped, and later line numbers still count them.
- Given Windows line endings (`\r\n`), no front or back ends with `\r`.
- Given `parseImport(…, 'csv')` on `"Paris, France","capital, of ""France"""`, front is `Paris, France` and back is `capital, of "France"`.
- Given a quoted CSV field with a line break inside, it stays one card, and a skipped row after it reports its own starting line number.
- Given a CSV row `a,b,c,d`, only the first two columns are used.
- Given a CSV whose first row is `front,back` or `front,back,learned` (any case), that row is treated as a header: not a card and not skipped.
- Given 1,001 valid lines, `tooMany` is true; given 1,000, it is false.
- Given `importFormatFor('Cards.CSV')` → `'csv'`; `'list.tsv'` and `'list.txt'` → `'lines'`.
- Given 12 skipped lines `[1..12]`, `skippedLinesText` returns `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, …`.
- Given `t('add.import.ready', { n: 1 }, 1)`, the English text is `1 card ready to add`; with 2 it is `2 cards ready to add`.
- Given `t('add.import.skipped', { k: 1, list: '4' }, 1)`, the English text is `1 line skipped (no back side): line 4`.
- Given `t('toast.restored', { n: 1 }, 1)`, the English text is `Restored 1 set.`; with 3 it is `Restored 3 sets.`.
- Every new key exists in both locale files (`tests/unit/locales.spec.ts` passes unchanged).

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/setSize.spec.ts`, `tests/unit/cardImport.spec.ts` and `tests/unit/library.spec.ts`, with the functions created first with their real signatures

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions, not on missing modules

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, add the locale keys to both files, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/setSize.ts src/utils/cardImport.ts src/stores/library.ts src/locales/en.json src/locales/hi.json tests/unit/setSize.spec.ts tests/unit/cardImport.spec.ts tests/unit/library.spec.ts
git commit -m "feat(authoring): parse card imports and refuse sets over the size limit"
```

---

### Task 2: Export, backup files and download

**Files:**
- Create: `src/utils/cardExport.ts`
- Create: `src/utils/download.ts`
- Test: `tests/unit/cardExport.spec.ts`

**Interfaces:**
- Consumes: existing `CardSet`, `FlashCard`, `Label` (`src/types.ts`).
- Produces (Tasks 3 and 5 rely on these; the reminders plan reuses `downloadText`):

```ts
// src/utils/cardExport.ts
export function setToCsv(set: CardSet): string;      // '﻿' + 'front,back,learned' + rows, CRLF line ends
export function setToJson(set: CardSet): string;     // JSON of SetExport, 2-space indent
export function exportFileName(title: string, extension: 'csv' | 'json'): string;
export function backupFileName(today: Date): string; // 'flashcards-backup-YYYY-MM-DD.json', local date

export interface SetExport { format: 'flashcards-set'; version: 1; title: string; color: string; cards: FlashCard[] }
export interface BackupSet { title: string; color: string; fav: boolean; labels: string[]; date: string; cards: FlashCard[] }
export interface Backup { format: 'flashcards-backup'; version: 1; exportedAt: string; labels: Label[]; sets: BackupSet[] }
export function buildBackup(sets: CardSet[], labels: Label[], now: Date): Backup;  // skips sets with trashed: true
export function parseBackup(text: string): Backup | null;                          // null when not a valid backup

// src/utils/download.ts — spec §13; the reminders plan reuses it, so the signature is fixed
export function downloadText(fileName: string, content: string, mimeType: string): void; // Blob + object URL + <a download>, URL revoked after
```

`parseBackup` accepts only `format: 'flashcards-backup'`, `version: 1`, a `sets` array whose items have a string `title` and a `cards` array of objects with string `front` and `back`, and a `labels` array of `{ docId: string, label: string }`. Anything else returns `null`. Unknown card fields are kept as they are.

**Spec:**
- §5.2: "columns `front,back,learned`, RFC 4180 quoting, UTF-8 with BOM so Excel opens Hindi text correctly"
- §5.2: "The file is named after the set title, with characters that are not Unicode letters (with their combining marks, so Hindi vowel signs stay), digits, `-` or `_` replaced by `-`, or `flashcards-set` when untitled or when no letter or digit is left."
- §5.2: "Downloads go through one helper, `downloadText()` (section 13), which other plans reuse."
- §5.3: "downloads `flashcards-backup-YYYY-MM-DD.json` with every set that is not in the bin and every label."
- §5.3: "A file that is not a backup: "That file isn't a flashcards backup.""

**Acceptance:**
- Given a set with one card `hola` / `hello`, not learned, `setToCsv` returns `﻿front,back,learned\r\nhola,hello,false\r\n`.
- Given a front `Paris, France`, a back `say "hi"` and a back with a line break, each is wrapped in double quotes, inner quotes are doubled, and the line break is kept inside the quotes.
- Given a Hindi card `नमस्ते` / `hello`, the CSV text contains `नमस्ते` unchanged after the BOM.
- Given `setToJson`, `JSON.parse` of it has `format: 'flashcards-set'`, `version: 1`, the title, colour and every card field, unknown card fields included.
- Given `exportFileName('Spanish verbs', 'csv')` → `Spanish-verbs.csv`; `exportFileName('a/b:c', 'json')` → `a-b-c.json`; `exportFileName('हिंदी शब्द', 'csv')` keeps the Devanagari letters and their vowel signs and replaces only the space: `हिंदी-शब्द.csv`.
- Given `exportFileName('', 'csv')` or `exportFileName('!!!', 'csv')` (no letter or digit left), the name is `flashcards-set.csv`.
- Given 2026-11-02 local time, `backupFileName` → `flashcards-backup-2026-11-02.json`.
- Given three sets, one in the bin, `buildBackup` has two sets and every label.
- Given `parseBackup(JSON.stringify(buildBackup(…)))`, it round-trips the sets and labels.
- Given `parseBackup` of `not json`, of `{}`, of a `SetExport`, of `format: 'flashcards-backup'` with `version: 2`, or of a set whose `cards` holds a number, it returns `null`.
- Given `downloadText`, an anchor with `download` set to the file name is clicked once and the object URL is revoked afterwards.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/cardExport.spec.ts`, with the functions created first with their real signatures

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/cardExport.ts src/utils/download.ts tests/unit/cardExport.spec.ts
git commit -m "feat(authoring): export sets as CSV or JSON and build backups"
```

---

### Task 3: Editor options: import, export, duplicate, reorder

**Files:**
- Create: `src/components/ImportCardsDialog.vue`
- Create: `src/components/ReorderCardsDialog.vue`
- Modify: `src/views/Add.vue`
- Test: `tests/e2e/authoring.spec.ts`

**Interfaces:**
- Consumes: `parseImport`, `importFormatFor`, `skippedLinesText`, `MAX_IMPORT_FILE_BYTES` (Task 1); `setToCsv`, `setToJson`, `exportFileName`, `downloadText` (Task 2); the locale keys (Task 1); the size check inside `createSet`/`saveSet` (Task 1); existing `uid()` (`src/utils/cardSets.ts`), `useLibraryStore().createSet`, `OptionPanel`, `createSet`/`setCard` e2e helpers (`tests/e2e/helpers.ts`).
- Produces:

```ts
// ImportCardsDialog.vue
defineProps<{ modelValue: boolean; color: string }>();
defineEmits<{ 'update:modelValue': [open: boolean]; import: [cards: { front: string; back: string }[]] }>();

// ReorderCardsDialog.vue
defineProps<{ modelValue: boolean; cards: FlashCard[]; color: string }>();
defineEmits<{ 'update:modelValue': [open: boolean]; reorder: [cards: FlashCard[]] }>();
```

`Add.vue` options panel, in this order after the existing rows: Import cards, Export as CSV, Export as JSON, Reorder cards, Duplicate set (only when the set has a `docId`). "Add cards" is disabled while the preview has 0 cards or more than 1,000. Imported cards become `FlashCard`s with a new `uid()`, `learned: false` and the current date, added after the existing cards. Duplicate first commits pending edits, then calls `createSet` with a new `id`, no `docId`, the date now, `fav: false`, `trashed: false`, no `shareId`, no `studiedAt`, the same colour and labels, and every card copied with a new id, `learned: false` and no `srs`; on success it navigates to `/{copy.id}/edit`.

**Spec:**
- §5.1: "The editor's options get "Import cards", which opens a dialog with a text box ("Paste cards, one per line"), a file picker ("Choose a file"; `.csv`, `.tsv`, `.txt`, max 2 MB) and an "Add cards" button."
- §5.1: "Imported cards go after the existing ones."
- §5.1: "Preview before adding: "{n} cards ready to add""
- §5.1: "At most 1,000 cards per import: "You can import up to 1,000 cards at a time." Over that, nothing is imported."
- §5.2: "The editor's options get "Export as CSV" … and "Export as JSON"."
- §5.4: "The editor's options get "Duplicate set" (only for a saved set), which creates "{title} (copy)" ("untitled set (copy)" when untitled) with the same cards, colour and labels, progress cleared, not a favourite and not shared, and opens the copy in the editor."
- §5.5: "The editor's options get "Reorder cards", a dialog listing the cards by front text with "Move up" and "Move down" buttons on each row. Changes apply when the dialog closes and are saved like any other edit."

**Tags:** `screen`, `failure-paths`

**Acceptance:**
- Given a set with one card, when `hola\thello` and `gato;cat` are pasted into "Paste cards, one per line", the dialog says "2 cards ready to add"; after "Add cards" the set has 3 cards with the imported ones last, and after Save and a reload Home shows `0 / 3`.
- Given a paste of only `hola\thello`, the dialog says "1 card ready to add".
- Given a paste with `no separator` on line 2, the dialog says "1 line skipped (no back side): line 2" and "Add cards" adds only the valid cards; with lines 2 and 5 skipped it says "2 lines skipped (no back side): lines 2, 5".
- Given a paste with no valid line, "Add cards" is disabled.
- Given a paste of 1,001 valid lines, the dialog says "You can import up to 1,000 cards at a time.", "Add cards" is disabled, and no card is added.
- Given a 2 MB + 1 byte file chosen, the dialog says "That file is too big. The limit is 2 MB." and nothing is read.
- Given a `.csv` file with a `FRONT,BACK` header and two quoted rows, the dialog says "2 cards ready to add".
- Given this set's own "Export as CSV" file imported into another set, every card arrives and no `front` / `back` card is created.
- Given an import that makes the set too big, Save is refused with "This set is too big to save. Split it into smaller sets." and the editor stays open with the cards.
- Given a saved set titled `Spanish verbs`, "Export as CSV" downloads `Spanish-verbs.csv` starting with the BOM and `front,back,learned`, and "Export as JSON" downloads `Spanish-verbs.json`.
- Given a new set never saved, "Duplicate set" is not shown.
- Given a saved favourite set `Spanish verbs` with one learned card, "Duplicate set" opens `/…/edit` for `Spanish verbs (copy)`; back on Home both sets exist, the copy shows `0 / 1` and has no star.
- Given an untitled saved set, the copy is titled `untitled set (copy)`.
- Given the duplicate's `createSet` fails, the existing save error snack shows and the editor stays on the original set.
- Given three cards A, B, C, when "Move down" is pressed on A and the dialog is closed, the editor shows B, A, C, and after Save and reload the review screen shows that order.
- Given the first row, its "Move up" is disabled; the last row's "Move down" is disabled.
- Given "Reorder cards" opened and closed with no moves, the set is not marked as changed.
- Given the editor with a dialog open, at 390 px wide, the axe scan finds no violations.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/authoring.spec.ts`, using `page.waitForEvent('download')` and `setInputFiles` for files

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the missing options and dialogs

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ImportCardsDialog.vue src/components/ReorderCardsDialog.vue src/views/Add.vue tests/e2e/authoring.spec.ts
git commit -m "feat(authoring): import, export, duplicate and reorder in the editor"
```

---

### Task 4: Faster card entry

**Files:**
- Modify: `src/components/CardFlash.vue`
- Modify: `src/components/GroupCardFlash.vue`
- Test: `tests/e2e/quick-entry.spec.ts`

**Interfaces:**
- Consumes: the locale keys `card.next-side`, `card.save-next` (Task 1); existing `uid()` (`src/utils/cardSets.ts`) and the account helper in `tests/e2e/helpers.ts`.
- Produces:

```ts
// CardFlash.vue — additions
defineEmits<{ 'add-after': [card: FlashCard] }>();      // only in edit mode (browse false)
defineExpose({ flip, edit: (side: 'front' | 'back') => void }); // edit flips to that side and opens the text dialog; flip is plan 1's

// GroupCardFlash.vue — on 'add-after' it inserts a blank card
// { id: uid(), front: '', back: '', learned: false, date: now ISO } right after that card,
// emits update:modelValue, scrolls to it and calls its edit('front').
```

**Spec:**
- §5.6: "In the card text dialog: on the front side, a "Next: back side" button (and Tab) switch to editing the back. On the back side, "Save and add next" (and Ctrl+Enter or ⌘+Enter) closes the dialog, adds a new card right after this one, and opens its front for editing."

**Tags:** `screen`

**Acceptance:**
- Given the front text dialog open, when "Next: back side" is pressed, the card shows its back and the dialog's text box edits the back, focused.
- Given the front text dialog with the caret in the text box, when Tab is pressed (no Shift), the same happens; Shift+Tab still moves focus normally.
- Given the back text dialog, "Next: back side" is not shown and "Save and add next" is.
- Given two cards and the back dialog of card 1 open, when Ctrl+Enter is pressed (⌘+Enter on macOS), the dialog closes, a blank card 2 is inserted (the old card 2 becomes card 3), and card 2's front dialog opens, focused.
- Given typing `uno`, Tab, `one`, Ctrl+Enter, `dos`, Tab, `two`, then Save, a reload shows 2 cards in that order with those sides.
- Given the review screen (browse mode), neither button shows and Ctrl+Enter does nothing.
- Given the dialog with the new buttons, the axe scan finds no violations.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/quick-entry.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the missing buttons

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CardFlash.vue src/components/GroupCardFlash.vue tests/e2e/quick-entry.spec.ts
git commit -m "feat(authoring): move to the back side and add the next card from the text dialog"
```

---

### Task 5: Backup and restore in Settings

**Files:**
- Modify: `src/views/Settings.vue`
- Test: `tests/e2e/backup.spec.ts`

**Interfaces:**
- Consumes: `buildBackup`, `parseBackup`, `backupFileName`, `downloadText` (Task 2); the locale keys (Task 1); the size check inside `createSet` (Task 1); existing `useLibraryStore().sets/labels/createSet/createLabel`, `uid()`, and the helpers in `tests/e2e/helpers.ts`.
- Produces: two Settings rows, "Back up all sets" and "Restore from backup", each with an icon, the title, its description under the title (`settings.backup.desc`, `settings.restore.desc`, in the `text-body-small` line the existing rows use) and a button whose accessible name is the row title, in the existing `settings__row` layout.

Restore matches each backup label to an existing label with the same text, creates the ones that are missing, and remaps every set's label ids to them. Restore is online-only: offline, the button shows the `toast.offline-save` snack and reads nothing. Each set is created as a new set (new `id`, no `docId`, `trashed: false`) with its cards as they are in the backup. The snack counts only the sets that were created.

**Spec:**
- §5.3: "Settings gets "Back up all sets", which downloads `flashcards-backup-YYYY-MM-DD.json` with every set that is not in the bin and every label. It also gets "Restore from backup", which adds the backup's sets as new sets, never overwriting one, and reports "Restored {n} sets."."
- §5.3: "A backup's labels are matched to existing labels by their text; missing ones are created, and the restored sets point at the matching labels. A file that is not a backup: "That file isn't a flashcards backup." Restore is online-only (rule 2.10)."
- §5.3: "Download every set and label as one file."
- §5.3: "Add the sets from a backup file. Nothing you have is overwritten."
- §2.10: "Every online-only action, when offline, shows the existing message "You're offline. Connect to the internet to save." unless this spec gives another one."

**Tags:** `screen`, `failure-paths`

**Acceptance:**
- Given the Settings page, the backup row says "Download every set and label as one file." under its title, and the restore row says "Add the sets from a backup file. Nothing you have is overwritten."
- Given two sets and one in the bin, "Back up all sets" downloads `flashcards-backup-<today>.json` holding the two sets and every label.
- Given that file restored into a new account, the snack says "Restored 2 sets." and Home shows both sets with their cards, progress and labels.
- Given the same file restored into the account it came from, the snack says "Restored 2 sets." and Home now shows each set twice; no existing set changed.
- Given a backup whose label `Languages` already exists, no second `Languages` label is created and the restored set carries the existing one.
- Given a `.json` file that is a set export, or a `.txt` file, the snack says "That file isn't a flashcards backup." and nothing is created.
- Given one set in the backup fails to save (over the size limit), the others are still created and the snack counts only those: with one created, "Restored 1 set."
- Given the browser offline (`context.setOffline(true)`), "Restore from backup" shows "You're offline. Connect to the internet to save." and creates nothing; "Back up all sets" still downloads the file.
- Given the Settings page at 390 px wide, the axe scan finds no violations.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/backup.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the missing rows

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Run the end checks**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/views/Settings.vue tests/e2e/backup.spec.ts
git commit -m "feat(authoring): back up and restore every set from Settings"
```
