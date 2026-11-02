# AI Features (Pro plan) — Spec

**Date:** 2026-11-02 · **Owner:** ankitp@geekyants.com · **Status:** approved 2026-11-03; build deferred

The plans in `docs/plans/2026-11-02-ai-*.md` implement this spec. Each plan
quotes the sections it builds; when a plan and this spec disagree, this spec
wins.

## 1. Goal and scope

§1.1 Add AI features to the Flashcards PWA (Vue 3 + Vuetify 4 + Pinia + Vite,
Firebase Auth + Firestore, also shipped on Google Play as a TWA). Most of them
are sold on a **Pro** plan; free users get a small monthly allowance of light
features.

§1.2 Decided with the owner on 2026-11-02:

- "Billing is deferred: Pro is granted by hand with an admin script until a separate payments plan is approved."
- "Free users get 20 light AI actions a month and no heavy ones."

§1.3 In scope: the AI backend and plan/limit system (§3–§6), and these
features:

| # | Feature | Plan file | Tier | Cost |
|---|---|---|---|---|
| F1 | Make a deck from notes, a PDF or a photo | ai-create | Pro | heavy |
| F2 | Suggested card back | ai-create | Free + Pro | light |
| F3 | Suggested title, labels and color | ai-create | Free + Pro | light |
| F4 | Card quality check | ai-create | Free + Pro | light |
| F5 | Smart review scheduling (FSRS) + review log | ai-study | Pro | none (on device) |
| F6 | Typed answers graded by AI | ai-study | Pro | light per answer |
| F7 | "Explain this card" chat | ai-study | Pro | light per message |
| F8 | Weak-spot summary after a session | ai-study | Pro | heavy |
| F9 | Practice modes: multiple choice, fill-in-the-blank | ai-practice | Pro | heavy per generation |
| F10 | Practice mode: reversed cards | ai-practice | Free + Pro | none |
| F11 | Translate a set (English ↔ Hindi and 10 more languages) | ai-practice | Pro | heavy |
| F12 | Search by meaning across all sets | ai-search | Pro | light per search |
| F13 | Duplicate card detection | ai-search | Pro | light per check |
| F14 | Read cards aloud: device voice | ai-voice | Free + Pro | none |
| F15 | Read cards aloud: natural voice | ai-voice | Pro | light per card |

§1.4 Out of scope: taking payments (Stripe, Razorpay, Google Play Billing),
App Check, an admin web dashboard, and team/shared decks.

## 2. Plans and order

§2.1 Plans run in this order; each needs the one before it merged:
`ai-foundation` → `ai-create` → `ai-study` → `ai-practice` → `ai-search` →
`ai-voice`. `ai-create` onward only need `ai-foundation`, so their order may
change, but they share `shared/ai-contracts.ts` and the locale files, so they
are built one plan at a time.

## 3. Architecture

§3.1 "The Anthropic API key never reaches the browser. Every AI call goes through a Firebase callable Cloud Function (2nd gen) in `functions/`."

§3.2 The functions codebase is a separate npm package in `functions/`
(TypeScript, Node.js runtime `nodejs22`, `firebase-functions` v2 API,
`firebase-admin`, `@anthropic-ai/sdk`, `@google/genai`, `zod`), deployed with
`firebase deploy --only functions`. The Firebase project must be on the Blaze
plan.

§3.3 Request and response types that both the app and the functions use live
in one file, `shared/ai-contracts.ts`, which both TypeScript projects include.
It holds types and constants only, never runtime code that imports Firebase.

§3.4 "Functions run in the region set by `VUE_APP_FUNCTIONS_REGION` (app) and `FUNCTIONS_REGION` (functions), which must be the Firestore database's region. Default: `us-central1`."

§3.5 Secrets: `ANTHROPIC_API_KEY` is a Firebase secret
(`firebase functions:secrets:set ANTHROPIC_API_KEY`), bound to every function
that uses a text model, so switching provider needs no rebinding. It is never in `.env*` files committed to git.

§3.6 Emulator and tests: "When `AI_FAKE=1` is set (emulator and e2e only), the AI client returns fixed fixture output and never calls Anthropic." The
functions emulator runs on port `5001`; the app connects to it when
`VUE_APP_USE_EMULATORS=true`.

§3.7 The hosting Content-Security-Policy `connect-src` adds
`https://*.cloudfunctions.net https://*.run.app` (callable functions), and
F15 adds `media-src 'self' blob:` so cached voice clips can play.

## 4. Models and providers

§4.0 In this spec, "Claude" and "the model" mean whichever text model the
provider setting (§4.6) selects.

§4.1 "Every model call goes through one provider interface and one routing table, `functions/src/ai/models.ts`, that maps each feature to a model and an effort level per provider. No other file names a model or imports a provider SDK."

§4.2 Default routing (decided with the owner on 2026-11-03: Claude Haiku for
now, Gemini ready to switch to):

| Feature | `anthropic` model | `gemini` model | Effort |
|---|---|---|---|
| F1, F8, F9, F11 | `claude-haiku-5-5` | `gemini-3.1-flash-lite` | `medium` |
| F2, F3, F4, F6, F7 | `claude-haiku-5-5` | `gemini-3.1-flash-lite` | `low` |

F5, F10, F12–F15 don't use a text model, so they have no row; the routing
table covers text-model features only. A route may name a different provider than
the default for one feature (e.g. F1 on `claude-sonnet-5-5` if Haiku misses
content in PDFs).

§4.3 Every request, whatever the provider: thinking on at the route's effort
(each adapter maps `low`/`medium` to its own setting), a check of the
provider's stop or block reason before reading content (a refusal or safety
block → §6.6), structured output against a Zod schema for every feature
except F7 (validated again with the same schema after parsing), and caching
of the fixed system prompt where the provider supports it (Anthropic:
`cache_control` on a system prompt of at least 512 tokens; Gemini: implicit
caching). No server-side model fallbacks: Claude Haiku 5.5 has none.

§4.4 "User content is wrapped in `<user_content>` tags and the system prompt tells Claude to treat it as material to study, never as instructions."

§4.5 Embeddings (F12, F13) and natural voice (F15) use Google Cloud in the
same project: Vertex AI text embeddings (model id in
`functions/src/config.ts`, default `gemini-embedding-001` at 768 dimensions)
and Cloud Text-to-Speech. Anthropic has no embeddings or speech API.

§4.6 "The provider is a deploy-time setting: `AI_PROVIDER` (`anthropic` | `gemini`, default `anthropic`) in the functions' parameters. Switching is changing that value and redeploying; no code changes."

§4.7 Gemini is called through Vertex AI (Google Cloud's paid Gemini API) with
the `@google/genai` SDK, using the functions' service account (no API key),
location `GEMINI_LOCATION` (default `global`). Never the free Gemini tier:
Google uses free-tier data to improve its products, which §7.3 promises
doesn't happen. The owner enables the Vertex AI API and grants the functions'
service account `roles/aiplatform.user`.

§4.8 "Both providers pass one shared conformance test suite: the same requests, mocked SDK responses and expected results, including every §6.2 error row."

§4.9 Every model response reports `provider`, `model`, `inputTokens` and
`outputTokens` for the §6.5 log line.

## 5. Plans, limits and usage

§5.1 Plans: `free` (default for every user) and `pro`.

§5.2 "Monthly allowance — Free: 20 light, 0 heavy. Pro: 300 light, 50 heavy. Months are calendar months in UTC; usage resets at 00:00 UTC on the 1st."

§5.3 The allowances live in `shared/ai-contracts.ts` as `AI_LIMITS`; the
functions enforce them and the app only displays them.

§5.4 Which features each plan may use is `FEATURE_ACCESS` in
`shared/ai-contracts.ts`, matching the Tier column of §1.3.

§5.5 "Rate limit: at most 10 AI requests per user per rolling 60 seconds, across all AI functions."

§5.6 "An action's allowance is reserved before Claude is called and refunded if the call fails, times out or is refused. A user never pays for an error."
A heavy action that produces nothing (F1 returns 0 cards) is also refunded.

§5.7 Usage is stored in `ai-usage/{uid}/months/{yyyy-mm}` as
`{ light: number, heavy: number, updatedAt }`, written only by functions in a
Firestore transaction.

## 6. Shared backend behavior

§6.1 Every AI callable: requires a signed-in user; requires recorded AI
consent (§7.3); checks `FEATURE_ACCESS` for the user's plan; checks the rate
limit; reserves usage; calls the model; refunds on failure; returns.

§6.2 Error codes, as `HttpsError` code + `details.reason`:

| Condition | code | reason |
|---|---|---|
| Not signed in | `unauthenticated` | — |
| No AI consent recorded | `failed-precondition` | `consent-required` |
| Feature not in the user's plan | `permission-denied` | `pro-required` |
| Monthly allowance used up | `resource-exhausted` | `quota-exceeded` |
| Rate limit hit | `resource-exhausted` | `rate-limited` |
| Input fails validation | `invalid-argument` | `invalid-input` |
| Input over a size limit | `invalid-argument` | `too-large` |
| Provider timeout, 429 or 5xx | `unavailable` | `ai-busy` |
| Model refused or the provider blocked the content | `failed-precondition` | `ai-refused` |
| Model output fails schema validation | `internal` | `ai-bad-output` |

§6.3 Timeouts: heavy functions `timeoutSeconds: 120`, Anthropic client
`timeout: 90_000` ms; light functions `timeoutSeconds: 30`, client
`timeout: 20_000` ms; `maxRetries: 1` everywhere.

§6.4 Input limits (checked before any usage is reserved; a check that needs stored data may read Firestore first):

| Input | Limit |
|---|---|
| F1 pasted text | 20,000 characters |
| F1 file | one file, PDF/JPEG/PNG/WebP, ≤ 5 MB before base64 |
| F1 number of cards | 10, 20 or 30 (default 20) |
| Any single card side sent to AI | 1,000 characters |
| F6 typed answer | 1,000 characters |
| F7 user message | 500 characters; 6 user messages per conversation |
| F8 session reviews sent | last 200 reviews of the set |
| F3, F4, F9, F11 cards sent | 1–200 cards |
| F3 labels sent | up to 100 of the user's labels |
| F13 cards checked | up to 300; up to 50 pairs returned |
| F12 query | 1–200 characters |
| F15 text | 500 characters |

§6.5 Logging: functions log `uid`, feature, model, input/output token counts,
latency and outcome. They never log card text, notes, files or answers.

§6.6 A refusal is reported to the app as `ai-refused` and refunded (§5.6).

## 7. App-wide behavior

§7.1 "Every AI entry point in the app shows a small sparkle icon (`mdi-creation`) and, for free users on a Pro feature, a `PRO` chip. Tapping a Pro feature as a free user opens the upgrade dialog instead of calling the function."

§7.2 Upgrade dialog and the `/pro` screen: compare Free and Pro (the §1.3
table, grouped), show this month's usage, and say: "Pro is invite-only for
now. We'll let you know when you can upgrade." No purchase button.

§7.3 AI consent: the first time a user starts any AI feature, a dialog says:
"To do this, the text or file you choose is sent to Anthropic (Claude) and,
for search and voice, to Google Cloud. It isn't used to train their models. Continue?"
with Cancel and Continue. Continue records consent on the server
(`recordAiConsent`), then runs the action. Consent is per account.

§7.4 Error copy shown in a snackbar (English; every key also has Hindi in
`src/locales/hi.json`):

| reason | Message |
|---|---|
| `quota-exceeded` | "You've used this month's AI actions. They reset on the 1st." |
| `rate-limited` | "Too many requests. Try again in a minute." |
| `too-large` | "That's too long for AI. Try something shorter." |
| `ai-busy` | "AI is busy right now. Please try again." |
| `ai-refused` | "AI couldn't help with this content." |
| `ai-bad-output` | "AI gave an unexpected answer. Please try again." |
| offline | "You're offline. AI needs a connection." |
| `invalid-input` (F1 file type) | "Use a PDF, JPEG, PNG or WebP file." |

§7.5 "Every AI result shown to the user has a Report button (flag icon) that sends the result to `reportAiOutput`, as Google Play's AI-generated content policy requires." Reported outputs are stored in `ai-reports` (server-only) with
`{ uid, feature, output (≤ 4,000 characters), reason, createdAt }`. Confirmation: "Thanks — we'll review it."

§7.6 AI never changes a saved set by itself: generated, suggested, translated
or checked content is shown as a preview the user accepts, edits or discards.
A new set made by AI (F8 practice cards, F11 translation) opens in the Add
screen as an unsaved draft; leaving without tapping Save asks "Discard this
draft?" instead of saving it.

## 8. Data model

§8.1 `users/{uid}`: `{ plan: 'free' | 'pro', planSource: 'manual', planUpdatedAt, aiConsentAt? }`. "Clients can neither read nor write `users/{uid}`; the app gets plan and usage from `getAiStatus`."

§8.2 `ai-usage/{uid}/months/{yyyy-mm}` and `ai-rate/{uid}`: server-only.

§8.3 `ai-reports/{id}`: server-only.

§8.4 F5 card state: `FlashCard` gains an optional
`srs?: { due: string; stability: number; difficulty: number; reps: number; lapses: number; state: 0 | 1 | 2 | 3; lastReview?: string }`
inside the existing `cards` JSON string, plus `learningSteps?: number` for
`ts-fsrs` short-term steps. "Cards without `srs` are new cards; existing data keeps working and older app versions ignore the field."

§8.5 F5 review log `reviews/{id}`:
`{ uid, setDocId, cardId, rating: 1 | 2 | 3 | 4, reviewedAt: Timestamp, typed: boolean, correct?: boolean }`.
Owner may create, read and delete; nobody may update.

§8.6 F9 practice sets `practice/{setDocId}`:
`{ uid, cardsHash, items: string (JSON), createdAt }`. Written only by
functions; the owner may read and delete. "A practice set is reused while the set's cards are unchanged (same `cardsHash`); any change makes the next practice start generate a new one."

§8.7 F12/F13 `card-embeddings/{setDocId}__{cardId}`:
`{ uid, setDocId, cardId, text, embedding: vector(768), updatedAt }`.
Server-only. Written by a Firestore trigger on `flash-card-sets` writes, only
for Pro users, and deleted when the card or set is deleted or trashed.

## 9. Features

### F1 Make a deck

§9.1 Entry: on the Add screen's options panel, "Generate with AI". A dialog
offers three tabs: Paste text, Upload PDF, Take/choose photo; a card-count
choice (10/20/30); and a Generate button.

§9.2 "Generated cards appear as a preview list; each can be removed or edited before 'Add N cards' appends them to the draft set." Nothing is saved until
the user saves the set as usual.

§9.3 Each card: front ≤ 200 characters, back ≤ 500 characters. If the source
has too little material, fewer cards are returned and the dialog says
"Only N cards could be made from this." With none, it says "No cards could
be made from this. Try more detailed notes."

### F2 Suggested back

§9.4 When a card's front has text and its back is empty, the back editor
shows "Suggest answer". The suggestion fills the back field as an editable
draft.

### F3 Suggested title, labels and color

§9.5 On the Add screen, once the draft has ≥ 3 cards and an empty title, the
title area shows "Suggest title". It returns a title (≤ 40 characters), up to
3 labels chosen **only from the user's existing labels**, and one color from
`ColorPalette`'s list. The user applies or dismisses each.

### F4 Card quality check

§9.6 The options panel's "Check cards" returns, per problem card, one issue
from: `too-long`, `ambiguous`, `multiple-facts`, `answer-in-question`,
`typo`, plus a suggested rewrite (which may split one card into two). Results
show in a list; "Apply" replaces that card in the draft.

### F5 Smart review scheduling

§9.7 Pro users see a "Review due (N)" button on each set and in View; it
studies only due cards, ordered by due date. After revealing the answer the
user rates Again / Hard / Good / Easy (1–4); the card's `srs` updates with
the FSRS algorithm (`ts-fsrs`, default parameters, desired retention 0.9) and
a review is logged (§8.5).

§9.8 Free users keep today's learned/unlearned flow. Rating buttons are
hidden for them.

### F6 Typed answers

§9.9 On the review screen (`/:id/review`, opened from "Review due"), Pro
users can switch on "Type answers". They type, submit, and
see: verdict (`correct`, `partly`, `incorrect`), one-sentence feedback, and
the card's answer. "Grading is lenient on wording, spelling and word order, strict on meaning." The verdict pre-selects a rating (correct → Good,
partly → Hard, incorrect → Again) the user can change.

### F7 Explain this card

§9.10 An "Explain" button on a revealed card on the review screen opens a
bottom sheet chat. The
first message is an explanation with one example and one memory tip. The user
can ask up to 6 follow-up questions (§6.4). Replies stream in. The chat is not
saved.

### F8 Weak-spot summary

§9.11 Every review session with ≥ 1 review ends on a summary screen with the
number of cards reviewed and the count of each rating. When a Pro user's
session has ≥ 5 reviews, the same `weakSpots` call also returns: up to 3 weak
topics (each with the card fronts that show it), a one-paragraph study tip,
and up to 5 practice cards; "Make 5 practice cards" opens those cards as a
new draft set titled "<title> (practice)" (§7.6). It costs one heavy action.

### F9 Practice modes

§9.12 A set's menu gets "Practice". Modes: Multiple choice (4 options, 3
AI-written distractors that are plausible but clearly wrong), Fill in the
blank (one key term blanked from the back; the user types it; matched
case-insensitively, ignoring surrounding punctuation), Reversed (F10: shows
the back, asks for the front; free, no AI).

### F11 Translate

§9.13 The options panel's "Translate set" picks a target language from:
English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean,
Chinese (Simplified), Arabic, Bengali, Tamil. It translates fronts and backs
into a **new** draft set titled "<title> (<language>)", opened in the Add
screen for review. "Both sides" or "Back only" is a choice (back only suits
language-learning decks).

### F12 Search by meaning

§9.14 Home's search field gets a "Search by meaning" toggle for Pro users.
Results list matching cards (front, back, set title) ranked by similarity,
up to 20, each opening its set in View at that card.

### F13 Duplicate detection

§9.15 When a Pro user who has already given AI consent saves a set whose card
text changed, cards whose embedding similarity to another
card of theirs is ≥ 0.92 are listed in a snackbar action "N possible
duplicates" that opens a list; nothing is removed automatically.

### F14/F15 Read aloud

§9.16 A speaker button on each card side reads it. Free users hear the
device voice (`speechSynthesis`), in the app's language. Pro users get the
natural voice (Cloud Text-to-Speech, MP3), cached on the device by
text + language + voice so repeats are free. The voice follows the app's language (English or Hindi);
sides over 500 characters use the device voice. Voice clips need no Report
button: they only read the user's own text.

## 10. Privacy and policy

§10.1 The Info page and the Play listing's privacy policy must say that AI
features send chosen content to Anthropic and Google Cloud. The plan adds the
in-app text; updating the Play Data safety form is the owner's job.

§10.2 Deleting a set deletes its `practice` doc and its `card-embeddings`
docs (trigger). Reviews for deleted sets are deleted by the app with the set.

## 11. Testing

§11.1 Functions: unit tests with Vitest in `functions/`, Anthropic and Google
clients mocked; one test per §6.2 row for the shared gateway.
§11.2 Rules: `tests/unit/firestore.rules.spec.ts` covers every new
collection.
§11.3 App: Vitest unit tests for stores/utils; Playwright e2e against the
emulators with `AI_FAKE=1` for each feature's main flow.

## 12. Open questions

- Q2: Pro light allowance of 300 means ~10 graded 30-card sessions a month (F6 counts per answer). Raise it, or count a graded session once?
- Q3: Payments provider, prices and Play Billing — separate plan later.
- Q4: Should each set choose its own voice language (a Spanish deck read in Spanish)? Today the voice follows the app's language.
- Q5: Sets edited while a user was free aren't indexed for search when they become Pro again after the one-time backfill. Re-run the backfill on every plan change?
