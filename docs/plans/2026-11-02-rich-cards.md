# Rich Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete (built 2026-11-05 on feat/usability-plans-5-9)

**Goal:** Cards can hold formatted text, links and images, and the review screen can read each side aloud in the set's chosen language.

**Architecture:** One renderer, `src/utils/markdown.ts`, turns card text into sanitized HTML. It uses markdown-it with raw HTML off, then a dedicated DOMPurify instance with an allowlist and URL hooks. Every place that shows card text uses it. A small `src/utils/speech.ts` wraps the browser's speech synthesis. The set gets an optional `speech` field holding a language per side, chosen in the editor's options; the review screen speaks the visible side through a button or the `r` key.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, vue-i18n (en, hi), Firebase 13 Firestore, markdown-it 14, DOMPurify 3, Web Speech API (`speechSynthesis`), Vitest (jsdom), Playwright against the Auth/Firestore emulators, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (§2, §3.2, §9)

## Global Constraints

- Depends on the study-modes plan (`docs/plans/2026-11-02-study-modes.md`) being merged: it adds `CardFlash`'s `reverse` prop and `flip()`, `GroupCardFlash`'s `next()`, `prev()`, `goTo()`, `flipFocused()`, and `useStudyShortcuts(bindings)` (spec §13). This plan adds to those components; it does not replace them.
- §2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader to check.
- §2.2: "The Firestore schema stays readable by the version of the app that is live today." `speech` is optional; card text stays plain text in `cards`, so the live app shows the Markdown source.
- §2.3: "No new paid Firebase product." Images are added by URL only.
- §2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`." Every new control has an accessible name.
- §2.5: "Keyboard shortcuts never fire while a text field, textarea or dialog has focus, or while Ctrl, Alt or Meta is held."
- Card text from another person (the sharing plan's public sets) goes through the same renderer, so the sanitizer is the only guard between stored text and the page.
- No Content-Security-Policy change: `img-src` in `firebase.json` already allows `https:`.
- New dependencies: `markdown-it@^14`, `dompurify@^3` (ships its own types) and the dev dependency `@types/markdown-it@^14`, all added in Task 1.

## Checkpoints

None: the policy's `run.checkpoints` is `none`. Task 2 is tagged `security`; add a stop after it if you want to read the sanitizer before the screens use it.

---

### Task 1: Dependencies, the `speech` field and the copy

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/types.ts` (`CardSet`)
- Modify: `src/services/cardSetMapper.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/cardSetMapper.spec.ts`
- Test: `tests/unit/firestore.rules.spec.ts`

**Interfaces:**
- Consumes: existing `cardSetFromDoc`, `cardSetToDoc` (`src/services/cardSetMapper.ts`), as the study-modes plan left them (existing, from the study-modes plan).
- Produces (Tasks 2, 3, 4 rely on these):

```ts
// src/types.ts
export interface SpeechLanguages { front?: string; back?: string } // BCP 47 tags
interface CardSet { speech?: SpeechLanguages }

// src/services/cardSetMapper.ts
// cardSetFromDoc keeps a side only when it is a string of at most 35 characters matching
//   /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/ ; otherwise that side is dropped.
// cardSetToDoc writes `speech` only when set.speech is defined, and never writes an undefined value inside it.
// Amended 2026-11-05: saves merge (updateDoc), so a key left out is never cleared in Firestore. When both sides go back
// to Browser default, Add.vue keeps `speech: {}`; it never deletes the `speech` key. Duplicate set keeps `speech`.
```

Dependencies: `markdown-it` `^14` and `dompurify` `^3` in `dependencies`; `@types/markdown-it` `^14` in `devDependencies`; `pnpm-lock.yaml` from `pnpm add`.

Rules: `firestore.rules` needs no change. `validSet()` checks only `cards` and `labels`, so a set with `speech` is already accepted. The rules test pins that.

New locale keys, en copy (add every one to `hi.json` too):

| Key | English |
|---|---|
| `card.read-aloud` | Read aloud |
| `card.image.insert` | Insert image |
| `card.image.url` | Image address |
| `card.image.confirm` | Insert |
| `card.image.https` | Use an image address that starts with https:// |
| `add.speech.title` | Read-aloud language |
| `add.speech.front` | Front |
| `add.speech.back` | Back |
| `add.speech.default` | Browser default |
| `study.shortcuts.read-aloud` | Read aloud |

**Spec:**
- §3.2: "| set doc | `speech` | `{ front?: string; back?: string }`, optional | 6 | BCP 47 language for reading each side aloud |"
- §9.3: "Use an image address that starts with https://"
- §9.3: "The card text dialog gets "Insert image", which opens a small dialog with an "Image address" field and an "Insert" button, and inserts `![](url)`."
- §9.5: "The editor's options get "Read-aloud language" with two selects, "Front" and "Back", listing the languages of the voices the browser has, plus "Browser default"."

**Tags:** not security: adds two dependencies and a set field; the sanitizing is Task 2

**Acceptance:**
- Given a stored set with `speech: { front: 'es-ES', back: 'en' }`, `cardSetFromDoc` returns that `speech`.
- Given `speech: { front: 'not a tag!', back: 42 }`, both sides are dropped and `speech` is `{}`.
- Given a 36-character tag, it is dropped.
- Given a stored set with no `speech`, `cardSetFromDoc` has no `speech` key, and `cardSetToDoc` of it has no `speech` key.
- Given a set with `speech: { front: 'hi-IN' }`, `cardSetToDoc` writes `speech: { front: 'hi-IN' }` with no `back` key.
- Given the rules emulator, the owner can create and update a set that has `speech: { front: 'es-ES' }`.
- Given `pnpm ls markdown-it dompurify`, both resolve to the major versions above.
- Every new key exists in both locale files (`tests/unit/locales.spec.ts` passes unchanged).

- [x] **Step 1: Add the dependencies**

Run: `pnpm add markdown-it@^14 dompurify@^3 && pnpm add -D @types/markdown-it@^14`
Expected: `package.json` and `pnpm-lock.yaml` change; `pnpm audit --prod --audit-level moderate` reports no new advisories

- [x] **Step 2: Write the failing tests** for each Acceptance case, in `tests/unit/cardSetMapper.spec.ts` and `tests/unit/firestore.rules.spec.ts`

- [x] **Step 3: Run the unit tests to verify they fail**

Run: `npm test`
Expected: FAIL on the `speech` assertions

- [x] **Step 4: Write the minimal implementation** to the Interfaces, add the locale keys to both files, until they pass

- [x] **Step 5: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 6: Run the rules tests**

Run: `npm run test:rules`
Expected: PASS, including the new `speech` cases

- [x] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/types.ts src/services/cardSetMapper.ts src/locales/en.json src/locales/hi.json tests/unit/cardSetMapper.spec.ts tests/unit/firestore.rules.spec.ts
git commit -m "feat(cards): add Markdown dependencies and the read-aloud language field"
```

---

### Task 2: Sanitized Markdown renderer

**Files:**
- Create: `src/utils/markdown.ts`
- Test: `tests/unit/markdown.spec.ts`

**Interfaces:**
- Consumes: `markdown-it` and `dompurify` (Task 1).
- Produces (Tasks 3 and 4 rely on these):

```ts
// src/utils/markdown.ts — spec §13; the sharing plan's preview consumes both, so the signatures are fixed
export function renderCardText(text: string): string; // sanitized HTML (9.1, 9.2), safe for v-html
export function cardPlainText(text: string): string;  // the text without Markdown, for reading aloud: rendered text, images as their alt text, link text without URLs, whitespace collapsed, trimmed
```

How it works:
- markdown-it with `html: false`, `linkify: true`, `breaks: true`, tables off.
- The output goes through a DOMPurify instance created for this module only, so its hooks never touch other code. Allowed tags: `p`, `br`, `strong`, `em`, `del`, `ul`, `ol`, `li`, `code`, `pre`, `blockquote`, `h1`–`h6`, `hr`, `a`, `img`. Allowed attributes: `href`, `src`, `alt`, `title`, plus the ones the hooks add.
- Link hook: an `a` keeps `href` only when it parses as an absolute URL with protocol `http:`, `https:` or `mailto:`. Otherwise the `href` is removed and the text stays. Every kept link gets `target="_blank"` and `rel="noopener noreferrer"`.
- Image hook: an `img` is removed entirely unless its `src` parses as an absolute `https:` URL. Kept images get `referrerpolicy="no-referrer"` and `loading="lazy"`.

**Spec:**
- §9.1: "Card text is Markdown: bold, italic, lists, inline code, code blocks, links and images. Raw HTML is shown as text, never run."
- §9.2: "Rendered HTML is sanitized before it reaches the page. Links open in a new tab with `rel="noopener noreferrer"`. Only `https:` images and `http:`/`https:`/`mailto:` links are kept; relative and protocol-relative (`//host/…`) addresses are dropped."
- §9.2: "Every place that shows card text (review, editor, share preview) renders it through `renderCardText()` (section 13)."

**Tags:** `security`

**Acceptance:**
- Given `**bold** _it_ \`code\``, the HTML has `<strong>bold</strong>`, `<em>it</em>` and `<code>code</code>`.
- Given `- one\n- two`, the HTML has a `ul` with two `li`.
- Given `line one\nline two`, the HTML has a `<br>` between them.
- Given a fenced code block holding `<b>x</b>`, it renders inside `pre > code` as the text `<b>x</b>`, with no `b` element.
- Given `<script>alert(1)</script>`, the parsed HTML has no `script` element and its text content contains `<script>alert(1)</script>`.
- Given `<img src=x onerror="alert(1)">`, there is no `img` element, and no element anywhere has an `onerror` attribute.
- Given `<svg onload=alert(1)>` and `<a href="https://example.com" onclick="alert(1)">x</a>`, there is no `svg` and no `a` element; both show as text.
- Given `[click](javascript:alert(1))`, `[click](JaVaScRiPt:alert(1))`, `[click]( javascript:alert(1))` and `[click](javascript&#58;alert(1))`, no element has an `href` that starts with `javascript:` in any case, and the text `click` (or the source text) is shown.
- Given `[x](vbscript:msgbox(1))`, `[x](ftp://example.com/a)`, `[x](/bin)` (relative) and `[x](//example.com)` (protocol-relative), no `href` is kept.
- Given `![a](data:image/png;base64,AAAA)` and `![a](http://example.com/a.png)`, there is no `img` element.
- Given `![a](//example.com/a.png)` (no scheme), there is no `img` element.
- Given `![cat](https://example.com/cat.png)`, there is one `img` with `src` `https://example.com/cat.png`, `alt` `cat`, `referrerpolicy` `no-referrer` and `loading` `lazy`.
- Given `[docs](https://example.com)` and the bare text `https://example.com`, each becomes an `a` with `target` `_blank` and `rel` `noopener noreferrer`.
- Given `[mail](mailto:a@example.com)`, the `href` is kept.
- Given 1,000 nested `>` blockquote markers, or 50,000 characters of text, `renderCardText` returns without throwing.
- Given `renderCardText` is called, `DOMPurify.sanitize` from the default `dompurify` import still has no hooks afterwards (the module's instance is its own).
- Given `cardPlainText('**Hola** _mundo_\n![gato](https://example.com/g.png) [docs](https://example.com)')`, it returns `Hola mundo gato docs`.
- Given `cardPlainText('<b>x</b>')`, it returns `<b>x</b>` (raw HTML is text).

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/markdown.spec.ts`, parsing the output with `DOMParser` to assert on elements and attributes, with the functions created first with their real signatures

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions, not on a missing module

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/markdown.ts tests/unit/markdown.spec.ts
git commit -m "feat(cards): render card Markdown through a strict sanitizer"
```

---

### Task 3: Speech helper and the read-aloud language option

**Files:**
- Create: `src/utils/speech.ts`
- Modify: `src/views/Add.vue` (options panel)
- Test: `tests/unit/speech.spec.ts`
- Test: `tests/e2e/read-aloud-language.spec.ts`

**Interfaces:**
- Consumes: `CardSet.speech`, `SpeechLanguages` (Task 1); the locale keys `add.speech.*` (Task 1); existing `OptionPanel`, `usePrefsStore().lang`, and the helpers in `tests/e2e/helpers.ts`.
- Produces (Task 4 relies on these):

```ts
// src/utils/speech.ts
export function speechAvailable(): boolean;                       // 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
export function speak(text: string, lang?: string): void;         // cancels current speech, then speaks; lang unset → browser default; empty text → no-op
export function voiceLanguages(): Promise<string[]>;              // unique voice langs, sorted; waits up to 1,000 ms for 'voiceschanged' when the list starts empty
export function languageName(tag: string, uiLocale: string): string; // Intl.DisplayNames(uiLocale, { type: 'language' }); falls back to the tag
```

`Add.vue` gets an options row titled "Read-aloud language" with two selects, labelled "Front" and "Back". Each lists "Browser default" first, then `voiceLanguages()` by `languageName` in the app language. Picking "Browser default" removes that side from `draft.speech`. When both sides are removed, `draft.speech` stays `{}` (never deleted, since saves merge). `duplicateSet` in Add.vue copies `speech` to the copy (amended 2026-11-05: read-aloud languages are a set setting, not progress). The row is hidden when `speechAvailable()` is false. The choice is saved with the set like any other edit.

**Spec:**
- §9.4: "It speaks the card's text without Markdown, in the side's `speech` language, or the browser default when none is set. The button is hidden when the browser has no speech synthesis."
- §9.5: "The editor's options get "Read-aloud language" with two selects, "Front" and "Back", listing the languages of the voices the browser has, plus "Browser default"."

**Tags:** `screen`, `failure-paths`

**Acceptance:**
- Given a fake `speechSynthesis`, `speak('hola', 'es-ES')` cancels first, then speaks one utterance with text `hola` and `lang` `es-ES`.
- Given `speak('hola')`, the utterance's `lang` is left at the browser default (empty).
- Given `speak('   ')`, nothing is spoken and nothing is cancelled.
- Given voices `en-US`, `es-ES`, `en-US`, `voiceLanguages()` resolves `['en-US', 'es-ES']`.
- Given no voices at first and `voiceschanged` firing after 200 ms with `hi-IN`, it resolves `['hi-IN']`; given it never fires, it resolves `[]` after 1,000 ms.
- Given no `speechSynthesis` on `window`, `speechAvailable()` is false and `speak` does nothing and does not throw.
- Given `languageName('es-ES', 'en')`, the result is the English display name Intl gives (for example `Spanish (Spain)`); given `languageName('zz-ZZ', 'en')` where Intl throws or echoes, it returns `zz-ZZ`.
- Given the editor in a browser with fake voices `es-ES` and `en-US`, when the Front select is set to Spanish (Spain) and the set saved, a reload of the editor shows Spanish (Spain) on Front and "Browser default" on Back.
- Given Front set back to "Browser default" and saved, a reload shows "Browser default".
- Given a browser with no `speechSynthesis`, the editor's options show no "Read-aloud language" row.
- Given the save after a language change fails, the existing save error snack shows and the choice stays in the editor.
- Given the options panel open at 390 px wide, the axe scan finds no violations.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/speech.spec.ts` and `tests/e2e/read-aloud-language.spec.ts` (fake voices through `page.addInitScript`)

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: FAIL on the speech assertions

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until the unit tests pass

- [x] **Step 4: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Run the end-to-end tests**

Run: `npm run test:e2e`
Expected: PASS, including `read-aloud-language.spec.ts`

- [x] **Step 6: Commit**

```bash
git add src/utils/speech.ts src/views/Add.vue tests/unit/speech.spec.ts tests/e2e/read-aloud-language.spec.ts
git commit -m "feat(cards): choose a read-aloud language for each side"
```

---

### Task 4: Rendered cards, image insertion and read aloud

**Files:**
- Modify: `src/components/CardFlash.vue`
- Modify: `src/components/GroupCardFlash.vue`
- Modify: `src/views/View.vue`
- Modify: `src/views/Due.vue`
- Modify: `src/components/StudyShortcutsDialog.vue`
- Test: `tests/e2e/rich-cards.spec.ts`

**Interfaces:**
- Consumes: `renderCardText`, `cardPlainText` (Task 2); `speechAvailable`, `speak` (Task 3); `SpeechLanguages`, the locale keys `card.read-aloud`, `card.image.*` (Task 1); `CardFlash`'s `reverse` prop and `flip()`, `GroupCardFlash`'s `next()/prev()/goTo()/flipFocused()`, `useStudyShortcuts(bindings: () => Record<string, () => void>)` (existing, from the study-modes plan; spec §13); the helpers in `tests/e2e/helpers.ts`.
- Produces:

```ts
// CardFlash.vue — additions
defineProps<{ speech?: SpeechLanguages }>();        // alongside the existing props
defineExpose({ readAloud: () => void });            // speaks the side now showing

// GroupCardFlash.vue — additions
defineProps<{ speech?: SpeechLanguages }>();        // passed down to each CardFlash
defineExpose({ readFocused: () => void });          // readAloud() on the focused card

// View.vue — passes set.speech to GroupCardFlash and adds bindings 'r' and 'R' → readFocused()
// Due.vue — passes the current entry's set.speech to its CardFlash and binds 'r'/'R' → readAloud() (/due is a review screen too, spec 9.4)
// StudyShortcutsDialog.vue — a row "R" with study.shortcuts.read-aloud (Task 1)
```

- Amended 2026-11-05 (the code since the plan was written): CardFlash already has `reverse`, `rating`, emits `rate` and `add-after`, and exposes `{ flip, edit, rate }` (add `readAloud`); GroupCardFlash exposes `{ scrollToCard, next, prev, goTo, flipFocused, rateFocused }` (add `readFocused`) and has a `CardHandle` type to extend; View.vue's `slider` ref type gets `readFocused`; Due.vue's `cardRef` type (`{ flip, rate }`) gets `readAloud`. The faces render `{{ modelValue.front || t('card.example.front') }}`; styles are scoped, so rules for the rendered `img`, `a`, `pre` and `code` need `:deep()`. The text dialog's textarea ref is typed `{ focus }`: reach the inner `<textarea>` for `selectionStart`.
- Each face shows `renderCardText` of its side through `v-html`, with an `eslint-disable-next-line vue/no-v-html` comment that names `renderCardText` as the sanitizer. The `white-space: pre-wrap` rule is removed, since `breaks: true` makes the line breaks. The example placeholder text stays plain text.
- Images inside a face are at most 40% of that face's height, and never wider than the face.
- A click on a link opens it and does not open the text dialog.
- In edit mode, the text dialog gets "Insert image". It opens a small dialog with an "Image address" field and an "Insert" button. A valid address inserts `![](url)` at the caret in the current side, or at the end when there is no caret. An address that is not absolute `https:` shows "Use an image address that starts with https://" under the field and inserts nothing.
- In review mode (`browse`), each face shows a "Read aloud" icon button when `speechAvailable()`. It calls `speak(cardPlainText(text), speech[side])` for that face's side.

**Spec:**
- §9.1: "Card text is Markdown: bold, italic, lists, inline code, code blocks, links and images. Raw HTML is shown as text, never run."
- §9.3: "Images are added by URL. The card text dialog gets "Insert image", which opens a small dialog with an "Image address" field and an "Insert" button, and inserts `![](url)`."
- §9.3: "A non-`https` address: "Use an image address that starts with https://". Images are at most 40% of the card's height."
- §9.2: "Every place that shows card text (review, editor, share preview) renders it through `renderCardText()` (section 13)."
- §9.4: "Read aloud: on the review screen each face has a "Read aloud" button, and R reads the visible side. It speaks the card's text without Markdown, in the side's `speech` language, or the browser default when none is set. The button is hidden when the browser has no speech synthesis."

**Tags:** `screen`, `security`

**Acceptance:**
- Given a card front `**Hola** _mundo_`, the review screen shows `Hola` in a `strong` and `mundo` in an `em`, with no asterisks or underscores.
- Given a card front `<img src=x onerror="window.__xss=1">`, the review screen shows that text literally, there is no `img` in the card, and `window.__xss` is undefined.
- Given a card back `[docs](javascript:window.__xss=1)`, clicking `docs` leaves `window.__xss` undefined.
- Given a card front `[docs](https://example.com)` in the editor, clicking `docs` opens a new page and the text dialog does not open.
- Given a card front `**Hola**` in the editor (not review), the face shows `Hola` in a `strong` too.
- Given the text dialog, "Insert image" opens a dialog with an "Image address" field; entering `https://example.com/cat.png` and pressing "Insert" inserts `![](https://example.com/cat.png)` at the caret, and after Done the face shows an `img` whose height is at most 40% of the face's height (at 1280×720 and at 390 px wide).
- Given "Insert image" with `http://example.com/cat.png`, `//example.com/cat.png` or `cat.png`, the field says "Use an image address that starts with https://" and the text is unchanged.
- Given a set with `speech.front` `es-ES` and a fake `speechSynthesis` recording utterances, pressing "Read aloud" on the front of `**Hola** _mundo_` speaks `Hola mundo` with `lang` `es-ES`.
- Given the card flipped, pressing `r` speaks the back's text with `speech.back`, or with no `lang` when `speech.back` is unset.
- Given "Back first" on (existing, from the study-modes plan), `r` on a fresh card speaks the back.
- Given focus in a text field, or Ctrl held, `r` speaks nothing.
- Given a browser with no `speechSynthesis`, no "Read aloud" button shows and `r` does nothing.
- Given the editor (not review), no "Read aloud" button shows.
- Given an existing card with two lines and no Markdown, it still shows on two lines.
- Given the review screen and the text dialog with "Insert image" open, at 390 px wide, the axe scan finds no violations.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/rich-cards.spec.ts` (fake `speechSynthesis` through `page.addInitScript`)

- [x] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the rendering and read-aloud cases

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: no errors

- [x] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors, and no `vue/no-v-html` warning without its justification comment

- [x] **Step 7: Commit**

```bash
git add src/components/CardFlash.vue src/components/GroupCardFlash.vue src/views/View.vue tests/e2e/rich-cards.spec.ts
git commit -m "feat(cards): show formatted cards, insert images by URL and read cards aloud"
```
