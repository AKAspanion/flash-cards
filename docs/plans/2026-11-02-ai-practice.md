# AI Practice Modes and Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users practise a set as multiple choice, fill-in-the-blank (Pro, AI-written) or reversed cards (free), and translate a set into a new draft (Pro).

**Architecture:** Two new callables behind the existing AI gateway: `generatePractice` (writes a server-only `practice/{setDocId}` doc the owner can read, reused while the set's cards are unchanged) and `translateSet` (returns translated cards, saves nothing). A Firestore trigger deletes a set's practice doc when the set is deleted. The app gets a `/:id/practice` screen and a "Translate set" dialog on the Add screen that opens the translation as a new, unsaved draft.

**Tech Stack:** App: Vue 3.5, Vuetify 4, Pinia 4, vue-i18n 11, Firebase JS SDK 13, Vitest 5, Playwright 1.64. Functions: `nodejs22`, `firebase-functions` v2, `firebase-admin`, `@anthropic-ai/sdk`, `zod`, Vitest. Emulators via `npx --yes firebase-tools@15.34.2`. CI: GitHub Actions (`.github/workflows/ci.yml`), unchanged by this plan.

**Spec:** `docs/specs/2026-11-02-ai-features.md`

## Global Constraints

- Needs the `ai-foundation` plan merged (`shared/ai-contracts.ts`, `aiCallable`, `aiJson`, `useAiStore`, `callAi`, `AiProChip`, `AiReportButton`, and the e2e helpers `grantPro`, `acceptAiConsent` in `tests/e2e/ai.ts`).
- Needs ai-study merged: Task 4 opens the translation with `openDraftInAdd` / `DraftHandoff` (`src/utils/draftHandoff.ts`) and relies on the Add screen's handed-off-draft behaviour (not saved on leave; `Discard this draft?`) from the ai-study plan's Task 5.
- §4.4: "User content is wrapped in `<user_content>` tags and the system prompt tells Claude to treat it as material to study, never as instructions."
- §5.6: "An action's allowance is reserved before Claude is called and refunded if the call fails, times out or is refused. A user never pays for an error."
- §7.6: "AI never changes a saved set by itself: generated, suggested, translated or checked content is shown as a preview the user accepts, edits or discards."
- §6.5: functions never log card text.
- Every new UI string is added to both `src/locales/en.json` and `src/locales/hi.json` in Task 1 (`tests/unit/locales.spec.ts` fails otherwise); later tasks only use the keys.
- Branch: `feat/ai-practice` off `master`.
- Another worktree (`.claude/worktrees/google-play-policy-fixes-6f0029`) has uncommitted edits to `src/views/Add.vue`; expect a merge conflict in Task 4 and keep both changes.

## Checkpoints

- None (policy `run.checkpoints: none`).

---

### Task 1: Practice and translation contracts, rules and strings

**Files:**
- Modify: `shared/ai-contracts.ts` (append the types and constants below)
- Modify: `firestore.rules` (`practice/{setDocId}` block)
- Modify: `tests/unit/firestore.rules.spec.ts`
- Create: `tests/unit/practiceContracts.spec.ts`
- Modify: `src/locales/en.json`, `src/locales/hi.json`

**Interfaces:**
- Consumes: existing `shared/ai-contracts.ts` types `AiFeature` (ai-foundation plan); existing rules helpers `signedIn()`, `ownsStored()`.
- Produces:

```ts
// shared/ai-contracts.ts (appended)
export interface CardText { id: string; front: string; back: string }
export const PRACTICE_MAX_CARDS: 200;
export const CARD_SIDE_MAX_CHARS: 1000;
export function cardsHash(cards: readonly CardText[]): string;   // FNV-1a 32-bit over id/front/back in order, 8 hex chars

export interface ChoiceItem { cardId: string; question: string; answer: string; distractors: [string, string, string] }
export interface BlankItem { cardId: string; prompt: string; answer: string }   // prompt = back with the term replaced by '_____'
export interface PracticeItems { choice: ChoiceItem[]; blank: BlankItem[] }
export interface GeneratePracticeRequest { setDocId: string; cards: CardText[] }
export interface GeneratePracticeResponse { cardsHash: string; items: PracticeItems }

export type TranslateLanguage = 'en' | 'hi' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'zh-Hans' | 'ar' | 'bn' | 'ta';
export const TRANSLATE_LANGUAGES: readonly { code: TranslateLanguage; english: string }[];  // the 12 in spec §9.13 order
export type TranslateSides = 'both' | 'back';
export interface TranslateSetRequest { cards: CardText[]; target: TranslateLanguage; sides: TranslateSides }
export interface TranslateSetResponse { cards: CardText[] }   // same ids, same order
```

`firestore.rules`: `match /practice/{setDocId} { allow read, delete: if ownsStored(); allow create, update: if false; }`

New strings (key → English; Hindi written for each):

| Key | English |
|---|---|
| `practice.title` | Practice |
| `practice.open` | Practice |
| `practice.mode.choice` | Multiple choice |
| `practice.mode.blank` | Fill in the blank |
| `practice.mode.reverse` | Reversed |
| `practice.making` | Making practice questions… |
| `practice.correct` | Correct! |
| `practice.wrong` | Not quite. The answer is: {answer} |
| `practice.check` | Check |
| `practice.next` | Next |
| `practice.finish` | Finish |
| `practice.score` | You got {score} of {total} |
| `practice.again` | Practice again |
| `practice.blank-placeholder` | Type the missing word |
| `practice.no-blank` | No fill-in-the-blank questions could be made from this set. |
| `practice.show-front` | Show front |
| `practice.empty` | Add cards to this set to practise. |
| `practice.load-error` | Couldn't load practice. |
| `translate.title` | Translate set |
| `translate.language` | Language |
| `translate.sides.both` | Both sides |
| `translate.sides.back` | Back only |
| `translate.action` | Translate |
| `translate.working` | Translating… |
| `translate.banner` | Translated by AI. Check it before saving. |
| `translate.need-cards` | Add a card before translating. |
| `languages.en` … `languages.ta` | English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean, Chinese (Simplified), Arabic, Bengali, Tamil |

**Spec:**
- §8.6: "`{ uid, cardsHash, items: string (JSON), createdAt }`. Written only by functions; the owner may read and delete."
- §8.6: "A practice set is reused while the set's cards are unchanged (same `cardsHash`); any change makes the next practice start generate a new one."
- §9.13: "English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean, Chinese (Simplified), Arabic, Bengali, Tamil."
- §11.2: "Rules: `tests/unit/firestore.rules.spec.ts` covers every new collection."

**Tags:** `security` (Firestore rules)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:**
- Given alice owns `practice/alice-set` (`uid: 'alice'`), then alice can read and delete it; bob cannot read or delete it; a signed-out visitor cannot read it.
- Given any signed-in user, when they create or update `practice/anything` (even with their own `uid`), then the rules deny it.
- Given cards `[{id:'a',front:'x',back:'y'}]`, then `cardsHash` returns the same 8-hex-character string on every call; changing `front`, `back`, `id` or the order changes it; adding a `learned` field to the input objects does not.
- Given `TRANSLATE_LANGUAGES`, then it has 12 entries whose `english` names are, in order, the spec §9.13 list, and whose codes match `TranslateLanguage`.
- Given the locale files, then `tests/unit/locales.spec.ts` passes.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/practiceContracts.spec.ts` and `tests/unit/firestore.rules.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test` and `npm run test:rules`
Expected: FAIL on assertions (append the exported names to `shared/ai-contracts.ts` with their real signatures first).

- [ ] **Step 3: Implement the contracts, the rules block, both locale files** until the tests pass

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test` and `npm run test:rules`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/ai-contracts.ts firestore.rules tests/unit/firestore.rules.spec.ts tests/unit/practiceContracts.spec.ts src/locales/en.json src/locales/hi.json
git commit -m "feat(ai): add practice and translation contracts, rules and strings"
```

---

### Task 2: `generatePractice`, `translateSet` and practice cleanup trigger

**Files:**
- Create: `functions/src/practice/prompts.ts`, `functions/src/practice/generatePractice.ts`, `functions/src/practice/translateSet.ts`, `functions/src/practice/cleanup.ts`
- Modify: `functions/src/index.ts` (export `generatePractice`, `translateSet`, `cleanupPractice`)
- Test: `functions/test/generatePractice.spec.ts`, `functions/test/translateSet.spec.ts`, `functions/test/practiceCleanup.spec.ts`

**Interfaces:**
- Consumes: `GeneratePracticeRequest`, `GeneratePracticeResponse`, `TranslateSetRequest`, `TranslateSetResponse`, `cardsHash`, `PRACTICE_MAX_CARDS`, `CARD_SIDE_MAX_CHARS`, `TRANSLATE_LANGUAGES` (Task 1); existing `aiCallable`, `aiJson`, `wrapUserContent`, `AiError`, `REGION` (ai-foundation plan); the routing table already covers `practiceAi` and `translateSet`.
- Produces:

| Callable | Feature / cost | Request | Response | Errors (code / reason) |
|---|---|---|---|---|
| `generatePractice` | `practiceAi` / heavy, `timeoutSeconds: 120` | `GeneratePracticeRequest` | `GeneratePracticeResponse` | `invalid-argument/invalid-input` (no cards, empty `setDocId`, set not found, set owned by someone else, sent cards' hash ≠ stored cards' hash); `invalid-argument/too-large` (> 200 cards, any side > 1,000 chars); every gateway error |
| `translateSet` | `translateSet` / heavy, `timeoutSeconds: 120` | `TranslateSetRequest` | `TranslateSetResponse` | `invalid-argument/invalid-input` (no cards, unknown `target` or `sides`); `invalid-argument/too-large` (> 200 cards, any side > 1,000 chars); `internal/ai-bad-output` (ids or count differ from the request); every gateway error |

`cleanupPractice`: `onDocumentDeleted('flash-card-sets/{setId}')` in `REGION` → deletes `practice/{setId}` if present.

Model output schemas (Zod, in `generatePractice.ts` / `translateSet.ts`):
- Practice, per chunk of up to 50 cards: `{ choice: { cardId: string; distractors: string[] }[]; blank: { cardId: string; term: string }[] }`.
- Translate, per chunk of up to 25 cards: `{ cards: { id: string; front: string; back: string }[] }`. With `sides: 'back'` the function keeps each card's original `front` whatever the model returns.

**Spec:**
- §9.12: "Modes: Multiple choice (4 options, 3 AI-written distractors that are plausible but clearly wrong), Fill in the blank (one key term blanked from the back; the user types it; matched case-insensitively, ignoring surrounding punctuation)"
- §9.13: "It translates fronts and backs into a **new** draft set"
- §6.4: "Input limits (checked before any usage is reserved; a check that needs stored data may read Firestore first):" (rows used here: F3, F4, F9, F11 cards sent 1–200 cards; any single card side sent to AI 1,000 characters)
- §8.6: "Written only by functions; the owner may read and delete."
- §10.2: "Deleting a set deletes its `practice` doc and its `card-embeddings` docs (trigger)."
- §3.6: "When `AI_FAKE=1` is set (emulator and e2e only), the AI client returns fixed fixture output and never calls Anthropic."

**Tags:** `security` (reads another collection by id and checks ownership; server-written doc), `failure-paths` (chunked calls, bad output, refunds)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:** (`aiJson` and Firestore mocked)
- Given alice's stored set with cards A, B and a request with the same cards, when `generatePractice` runs, then `practice/{setDocId}` is written with `uid: 'alice'`, `cardsHash` equal to `cardsHash` of the stored cards, `items` as a JSON string, and `createdAt`; the response holds the same `cardsHash` and `items`.
- Given the request's cards differ from the stored set's cards (unsaved edits), then `invalid-argument` / `invalid-input`, nothing written, and the reserved heavy action is refunded.
- Given `setDocId` of bob's set called by alice, then `invalid-argument` / `invalid-input`, nothing written, refunded; given a `setDocId` that doesn't exist, the same.
- Given 201 cards, then `invalid-argument` / `too-large` before any usage is reserved; given a back of 1,001 characters, the same; given 200 cards of 1,000-character sides, accepted.
- Given 120 cards, then `aiJson` is called 3 times (chunks of 50, 50, 20) and items from all chunks are merged in card order.
- Given the model returns distractors for card A of `['Paris', 'paris', 'Rome']` where the answer is `Paris`, then card A has no choice item (a distractor equals the answer case-insensitively); given 2 distractors instead of 3, no choice item; given 3 distinct distractors none equal to the answer, then `ChoiceItem` with `question` = front, `answer` = back, `distractors` as returned.
- Given a blank term `Mitochondria` and back `The mitochondria makes energy.`, then `BlankItem.prompt` is `The _____ makes energy.` and `answer` is `mitochondria` (the text as it appears in the back); given a term not found in the back, or equal to the whole back, no blank item.
- Given every chunk yields zero valid choice items, then `internal` / `ai-bad-output`, refunded, nothing written.
- Given `translateSet` with `sides: 'back'`, then every returned card's `front` equals the request's `front`, and `back` is the model's text.
- Given the model returns a card id not in the chunk, or fewer cards than sent, then `internal` / `ai-bad-output`, refunded.
- Given `target: 'xx'`, then `invalid-argument` / `invalid-input` before usage is reserved.
- Given 60 cards, then `translateSet` calls `aiJson` 3 times (25, 25, 10) and returns 60 cards in request order.
- Given one chunk's `aiJson` call rejects with `ai-busy`, then the whole call fails with `unavailable` / `ai-busy` and is refunded.
- Given every prompt sent to the model, then card text appears only inside `wrapUserContent(...)`, and the system prompt is a fixed string with no card text.
- Given `AI_FAKE=1` in the emulator, then `generatePractice` returns, for each card, distractors `Not <back> 1`, `Not <back> 2`, `Not <back> 3` and a blank on the first word of 4+ letters in the back; `translateSet` returns `[<code>] <text>` for each translated side (for example `[hi] hablar`).
- Given a `flash-card-sets/s1` delete event, then `cleanupPractice` deletes `practice/s1`; given no practice doc, it completes without error.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/test/generatePractice.spec.ts`, `functions/test/translateSet.spec.ts`, `functions/test/practiceCleanup.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:functions`
Expected: FAIL on assertions (create the modules with their real exports first).

- [ ] **Step 3: Write `prompts.ts`** (fixed system prompts: practice asks for plausible-but-wrong distractors of similar length and one key term per back; translate asks for natural, faithful translation that keeps ids, numbers, names and formatting)

- [ ] **Step 4: Implement `generatePractice.ts`, `translateSet.ts`, `cleanup.ts` and the exports** until the tests pass. Chunks run at most 4 at a time.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:functions`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/src/practice/prompts.ts functions/src/practice/generatePractice.ts functions/src/practice/translateSet.ts functions/src/practice/cleanup.ts functions/src/index.ts functions/test/generatePractice.spec.ts functions/test/translateSet.spec.ts functions/test/practiceCleanup.spec.ts
git commit -m "feat(ai): add practice generation, set translation and practice cleanup"
```

---

### Task 3: Practice screen

**Files:**
- Create: `src/views/Practice.vue`
- Create: `src/utils/practice.ts`
- Create: `src/services/practice.ts`
- Modify: `src/router/index.ts` (route `/:id/practice`, name `practice`, `requireAuth`)
- Modify: `src/components/CardFlashSet.vue` (a "Practice" chip before the Browse/Review chip, opening `/${card.id}/practice`)
- Test: `tests/unit/practice.spec.ts`, `tests/e2e/practice.spec.ts`

**Interfaces:**
- Consumes: `generatePractice` (Task 2); `PracticeItems`, `GeneratePracticeResponse`, `cardsHash` (Task 1); `grantPro`, `acceptAiConsent` from `tests/e2e/ai.ts` (ai-foundation plan); existing `useAiStore().run`, `useAiStore().canUse`, `callAi`, `AiProChip`, `AiReportButton` (ai-foundation plan); existing `useLibraryStore().findSet`, `BarTop`.
- Produces:

```ts
// src/utils/practice.ts
export function blankMatches(typed: string, answer: string): boolean;   // case-insensitive, trims whitespace and surrounding punctuation on both
export function shuffled<T>(items: readonly T[], random?: () => number): T[];
export type PracticeQuestion =
  | { mode: 'choice'; cardId: string; question: string; options: string[]; answer: string }
  | { mode: 'blank'; cardId: string; prompt: string; answer: string }
  | { mode: 'reverse'; cardId: string; shown: string; hidden: string };
export function buildQuestions(mode: 'choice' | 'blank', items: PracticeItems, random?: () => number): PracticeQuestion[];
export function reverseQuestions(cards: readonly FlashCard[]): PracticeQuestion[];   // skips cards with an empty front or back

// src/services/practice.ts
/** Reads practice/{setDocId}; returns its items when its cardsHash equals cardsHash(cards), else null. */
export function readFreshPractice(setDocId: string, cards: readonly CardText[]): Promise<PracticeItems | null>;
```

Screen states (`/:id/practice`):

| State | Shows |
|---|---|
| Mode picker | Three rows: Multiple choice (sparkle icon, `AiProChip feature="practiceAi"`), Fill in the blank (same), Reversed |
| Making | Spinner and "Making practice questions…" |
| Question (choice) | Front as the question, 4 shuffled option buttons; after a tap: the chosen button green if right, red if wrong plus the right one green; "Correct!" or "Not quite. The answer is: {answer}"; Next / Finish; `AiReportButton` for the item |
| Question (blank) | Prompt with `_____`, text field "Type the missing word", Check; then the same result line; Next / Finish; `AiReportButton` |
| Question (reverse) | The back; "Show front" reveals the front; Next / Finish |
| Done | "You got {score} of {total}" (choice/blank) or the card count (reverse), "Practice again" (back to the picker) |
| Empty set | "Add cards to this set to practise." |
| No blanks | "No fill-in-the-blank questions could be made from this set." |
| Load error | "Couldn't load practice." with Retry |

**Spec:**
- §9.12: "A set's menu gets"
- §9.12: "Modes: Multiple choice (4 options, 3 AI-written distractors that are plausible but clearly wrong), Fill in the blank (one key term blanked from the back; the user types it; matched case-insensitively, ignoring surrounding punctuation), Reversed (F10: shows the back, asks for the front; free, no AI)."
- §8.6: "A practice set is reused while the set's cards are unchanged (same `cardsHash`); any change makes the next practice start generate a new one."
- §7.1: "Every AI entry point in the app shows a small sparkle icon (`mdi-creation`) and, for free users on a Pro feature, a `PRO` chip. Tapping a Pro feature as a free user opens the upgrade dialog instead of calling the function."
- §7.5: "Every AI result shown to the user has a Report button (flag icon) that sends the result to `reportAiOutput`, as Google Play's AI-generated content policy requires."

**Tags:** `screen`, `failure-paths`, `security` (new signed-in-only route)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:**
- Given a signed-out visitor opens `/s1/practice`, then they are sent to `/login?redirect=/s1/practice` (existing `authRedirect`).
- Given `blankMatches('  Mitochondria! ', 'mitochondria')`, then true; `blankMatches('"energy."', 'Energy')` true; `blankMatches('mitochondrion', 'mitochondria')` false; `blankMatches('', 'x')` false.
- Given a choice item, then `buildQuestions('choice', …)` yields 4 options containing the answer and the 3 distractors exactly once each; with a fixed `random`, the order is stable.
- Given cards where one has an empty back, then `reverseQuestions` skips it.
- Given a practice doc whose `cardsHash` equals the set's cards hash, when Multiple choice is chosen, then `generatePractice` is not called and questions come from the doc; given a stale hash or no doc, then `useAiStore().run('practiceAi', …)` calls `generatePractice` with `{ setDocId, cards }` (cards as `{ id, front, back }` only).
- Given a free user, when they tap Multiple choice or Fill in the blank, then the upgrade dialog opens and `generatePractice` is not called; when they tap Reversed, the first question shows the back.
- Given `run` resolves `null` (any AI error, already shown as a snack by the store), then the screen returns to the mode picker.
- Given reading the practice doc fails (not a missing doc), then the screen shows "Couldn't load practice." and Retry runs the read again.
- Given an unknown set id in the URL, then the snack "set not found" shows and the app goes to `/home` (same as View).
- Given 0 blank items, then choosing Fill in the blank shows "No fill-in-the-blank questions could be made from this set."
- E2E (`tests/e2e/practice.spec.ts`, emulators, `AI_FAKE=1`): a Pro user (via `grantPro`) creates a set with card `hablar` / `to speak`, taps Practice → Multiple choice, accepts consent, sees `hablar` and the options `to speak`, `Not to speak 1`, `Not to speak 2`, `Not to speak 3`; taps `to speak`, sees "Correct!", taps Finish, sees "You got 1 of 1". Going back and choosing Multiple choice again makes no new `generatePractice` request. A free user sees the `PRO` chip on Multiple choice, and Reversed shows `to speak`, then `hablar` after "Show front". The screen passes the axe scan used in `tests/e2e/a11y.spec.ts`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/practice.spec.ts` and `tests/e2e/practice.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on assertions (create `src/utils/practice.ts` and `src/services/practice.ts` with their real exports first).

- [ ] **Step 3: Implement `src/utils/practice.ts` and `src/services/practice.ts`** until the unit tests pass

- [ ] **Step 4: Build `Practice.vue`, add the route and the CardFlashSet chip**

- [ ] **Step 5: Run the unit and e2e tests to verify they pass**

Run: `npm test` and `npm run test:e2e`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/views/Practice.vue src/utils/practice.ts src/services/practice.ts src/router/index.ts src/components/CardFlashSet.vue tests/unit/practice.spec.ts tests/e2e/practice.spec.ts
git commit -m "feat(ai): add practice screen with multiple choice, fill-in-the-blank and reversed modes"
```

---

### Task 4: Translate set dialog and translated draft

**Files:**
- Create: `src/components/TranslateDialog.vue`
- Modify: `src/views/Add.vue` (options-panel row "Translate set"; open the dialog; AI banner on a translated draft)
- Test: `tests/unit/translateDialog.spec.ts`, `tests/e2e/translate.spec.ts`

**Interfaces:**
- Consumes: `translateSet` (Task 2); `TranslateSetRequest`, `TranslateSetResponse`, `TRANSLATE_LANGUAGES`, `TranslateLanguage`, `TranslateSides` (Task 1); existing `openDraftInAdd`, `DraftHandoff` from `src/utils/draftHandoff.ts` and Add.vue's local `handoff` ref (ai-study plan, Task 5); existing `grantPro`, `acceptAiConsent` from `tests/e2e/ai.ts` (ai-foundation plan); existing `useAiStore().run`, `callAi`, `AiProChip`, `AiReportButton` (ai-foundation plan); existing `OptionPanel`.
- Produces:

```ts
// src/components/TranslateDialog.vue
// props: { modelValue: boolean; cards: FlashCard[] }
// emits: 'update:modelValue', 'translated'(cards: CardText[], target: TranslateLanguage)
```

Flow: Add screen → options → "Translate set" (sparkle icon, `AiProChip feature="translateSet"`) → dialog with a Language select (12 languages, names from `languages.*`), a Both sides / Back only radio (default Both sides), Translate. While running: "Translating…" and the button disabled. On success, Add.vue calls `openDraftInAdd(router, { origin: 'translate', title: '<title> (<language>)', color, labels, cards })` (an empty title uses the untitled text; translated cards keep front/back only). There is no separate save step: leaving the current screen goes through the Add screen's existing leave guard, which saves a set that needs saving exactly as today. The new draft opens in `/add` as a handed-off draft, so it follows the ai-study plan's rules (Save saves it; leaving any other way asks `Discard this draft?`). When `handoff.origin === 'translate'`, a banner above the cards says "Translated by AI. Check it before saving." with `AiReportButton feature="translateSet"` (output: the translated cards as JSON, first 4,000 characters).

**Spec:**
- §9.13: "The options panel's"
- §9.13: "picks a target language from: English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean, Chinese (Simplified), Arabic, Bengali, Tamil."
- §9.13: "opened in the Add screen for review."
- §9.13: "(back only suits language-learning decks)."
- §7.6: "AI never changes a saved set by itself: generated, suggested, translated or checked content is shown as a preview the user accepts, edits or discards."
- §7.6: "A new set made by AI (F8 practice cards, F11 translation) opens in the Add screen as an unsaved draft; leaving without tapping Save asks"
- §6.4: "| F3, F4, F9, F11 cards sent | 1–200 cards |"
- §7.5: "Every AI result shown to the user has a Report button (flag icon) that sends the result to `reportAiOutput`, as Google Play's AI-generated content policy requires."

**Tags:** `screen`, `failure-paths`

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:**
- Given a draft with no cards, then the Translate set row is disabled and shows "Add a card before translating."
- Given a free user, when they tap Translate set, then the upgrade dialog opens and the dialog does not.
- Given Back only, then the request has `sides: 'back'`; given Both sides, `sides: 'both'`.
- Given `run` resolves `null` (AI error), then the dialog stays open with the Translate button enabled and `openDraftInAdd` is not called.
- Given a Pro user on `/:id/edit` of set "Verbs" with unsaved edits, when translation to Hindi succeeds, then `openDraftInAdd` is called once with origin `translate`, title "Verbs (Hindi)", the set's color and labels and the translated cards; the existing leave guard saves the edits; the app is on `/add` showing the translated cards, the banner and its Report button.
- Given the leave guard's save fails, then the existing discard confirm shows; Cancel keeps the user on `/:id/edit` with the edits.
- Given the translated draft on `/add` and the user leaves without Save and confirms `Discard this draft?`, then no set "Verbs (Hindi)" is created.
- Given a handed-off draft whose origin is `weak-spots`, then no translation banner shows.
- E2E (`tests/e2e/translate.spec.ts`, emulators, `AI_FAKE=1`): a Pro user creates set "Verbs" with `hablar` / `to speak`, opens Edit → Options → Translate set, accepts consent, picks Hindi and Both sides, taps Translate; the title reads "VERBS (HINDI)" in the top bar style the app uses, the card shows `[hi] hablar`, and the banner is visible; tapping Save returns Home with both sets listed.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/translateDialog.spec.ts` and `tests/e2e/translate.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on assertions (create `TranslateDialog.vue` with its real props and emits first).

- [ ] **Step 3: Build `TranslateDialog.vue`** until its unit tests pass

- [ ] **Step 4: Wire it into `Add.vue`** (row, dialog, `openDraftInAdd` with origin `translate`, banner when `handoff.origin === 'translate'`)

- [ ] **Step 5: Run the unit and e2e tests to verify they pass**

Run: `npm test` and `npm run test:e2e`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/TranslateDialog.vue src/views/Add.vue tests/unit/translateDialog.spec.ts tests/e2e/translate.spec.ts
git commit -m "feat(ai): translate a set into a new draft for review"
```
