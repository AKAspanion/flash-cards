# Terms of Service Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public terms of service page at `/terms`, linked from login, Info and the privacy policy, and agreed to by a line under sign-up.

**Architecture:** A new view, `src/views/Terms.vue`, built like `src/views/Privacy.vue` (a top bar with Back, a heading, a dated intro, then a card of icon rows), registered in `src/router/index.ts` with `meta: { public: true }` so `authRedirect` lets signed-in and signed-out visitors in. Hosting already rewrites every path to `index.html` (`firebase.json`), and the PWA's navigation fallback covers it (`vite.config.ts`), so no hosting change is needed. Every string is an i18n key in `src/locales/en.json` and `src/locales/hi.json`.

**Tech Stack:** Vue 3, Vuetify, vue-router, vue-i18n, Vite; Vitest with jsdom for unit tests, Playwright against the emulators for e2e (`package.json`).

**Spec:** none: a small feature at the fast pace. Its content is the developer's decision [decisions/terms-of-service-content](../../knowledge/decisions/terms-of-service-content.md), stated on 2026-11-17.

## Global Constraints

- Every user-facing string is an i18n key present in both `src/locales/en.json` and `src/locales/hi.json`; `tests/unit/locales.spec.ts` checks they match.
- Links inside a sentence use the pattern `Privacy.vue` already uses (`i18n-t` slots, or splitting the translated sentence on the link text), so each language places the link where its words put it.
- Who makes the app and the contact address come from `CONTACT_EMAIL` in `src/utils/contact.ts` and the [privacy contact](../../knowledge/decisions/privacy-contact.md) decision; never hard-code the address in the view.
- The terms page shows no ad ([one AdSense banner](../../knowledge/decisions/adsense-banner-ads.md): never on the public policy pages).

## Checkpoints

None (`run.checkpoints: none`).

## Review Focus

- A signed-in user who opens `/terms` must stay on it (not be redirected home) and Back must take them to `/home`; signed out, Back goes to `/login`.
- Hindi: every terms key has a Hindi string, and the in-sentence links still render when the Hindi sentence orders its words differently.
- The sign-up line shows only in sign-up mode, not on sign-in or password reset.
- Opening `/terms` directly (a fresh load, not an in-app navigation) shows the page, since that is how Google Play and search engines reach it.
- Axe finds no accessibility violation on `/terms`, and the links keep the `#ba124b` colour the other legal pages use.

---

### Task 1: Public terms page, its links and the sign-up line

**Files:**
- Create: `src/views/Terms.vue`
- Modify: `src/router/index.ts` (add the `/terms` route beside `/privacy`)
- Modify: `src/locales/en.json` (new `terms` block, `links.terms`, `login.agree`)
- Modify: `src/locales/hi.json` (the same keys, in Hindi)
- Modify: `src/views/Login.vue` (the footer link row under `.login__legal`; the agree line under the submit button)
- Modify: `src/views/Info.vue` (a Terms row after the privacy row)
- Modify: `src/views/Privacy.vue` (a link to the terms below `privacy.changes`)
- Test: `tests/unit/terms.spec.ts`
- Test: `tests/unit/router.spec.ts`
- Test: `tests/e2e/public-pages.spec.ts`
- Test: `tests/e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: existing `authRedirect(to, signedIn)` and `routes` from `src/router/index.ts`; existing `CONTACT_EMAIL` from `src/utils/contact.ts`; existing `BarTop` component; existing `useSessionStore().user`.
- Produces: the route below, and these i18n keys.

```ts
{ path: '/terms', name: 'terms', component: () => import('@/views/Terms.vue'), meta: { public: true } }
```

| Key | English |
|---|---|
| `links.terms` | `Terms of service` |
| `login.agree` | `By signing up you agree to the {terms} and {privacy}.` (`{terms}` renders `links.terms`, `{privacy}` renders `links.privacy`, each a router-link) |
| `terms.title` | `Terms of service` |
| `terms.updated` | `Last updated: 17 November 2026` |
| `terms.intro` | `FlashCards is made by Ankit Kumar Pandit. By using it, you agree to these terms.` |
| `terms.who.title` | `Who can use it` |
| `terms.who.body` | `You must be 13 or older to use FlashCards. Keep your sign-in details safe; you are responsible for what happens in your account.` |
| `terms.yours.title` | `Your sets` |
| `terms.yours.body` | `The sets, cards and labels you make are yours. We store them only to run the app for you, as the Privacy policy explains.` (`Privacy policy` is a router-link to `/privacy`) |
| `terms.sharing.title` | `Sharing` |
| `terms.sharing.body` | `When you share a set, anyone with its link can view it and add a copy to their own library, until you stop sharing. Copies already added stay with the people who added them.` |
| `terms.rules.title` | `What's not allowed` |
| `terms.rules.body` | `Only put on your cards what you have the right to use. Don't use FlashCards for anything unlawful or abusive, or that infringes someone else's rights.` |
| `terms.enforce.title` | `If the terms are broken` |
| `terms.enforce.body` | `We may remove shared content, or close an account, that breaks these terms.` |
| `terms.warranty.title` | `No warranty` |
| `terms.warranty.body` | `FlashCards is free and provided "as is", without warranties of any kind. As far as the law allows, we are not liable for any loss or damage from using it.` |
| `terms.law.title` | `Governing law` |
| `terms.law.body` | `These terms are governed by the laws of India.` |
| `terms.contact.title` | `Contact` |
| `terms.contact.body` | `Ankit Kumar Pandit, {email}` (`{email}` is `CONTACT_EMAIL`, rendered as a `mailto:` link) |
| `terms.changes` | `If these terms change, the date above changes with it.` |

Icons, one per row in this order: `mdi-account-check-outline`, `mdi-cards-outline`, `mdi-share-variant-outline`, `mdi-cancel`, `mdi-account-cancel-outline`, `mdi-alert-circle-outline`, `mdi-scale-balance`, `mdi-email-outline`. The page uses the same layout, classes and styles as `Privacy.vue`'s `.legal` block; Back reads `common.home` signed in and `login.login` signed out, and goes to `/home` or `/login` the same way.

On Login, the footer `.login__legal` row shows `links.privacy` (to `/privacy`) then `links.terms` (to `/terms`), in every mode. `login.agree` shows under the submit button only when `mode === 'signUp'`. On Info, a row with `mdi-file-document-outline` and a router-link `links.terms` to `/terms` comes right after the privacy row, styled like it (`info__link`). On Privacy, a router-link `links.terms` to `/terms` sits below the `privacy.changes` line.

The Hindi strings are written by the implementer and reviewed by the developer in the pull request ([PR review](../../knowledge/decisions/pr-review.md)).

**Spec:** none; the rules are the developer's decision, [decisions/terms-of-service-content](../../knowledge/decisions/terms-of-service-content.md):
- "the laws of India. No city's courts are named."
- "people own the sets they make."
- "sharing a set lets anyone with its link view it and add a copy to their own library, until the owner stops sharing."
- "nothing unlawful, abusive or infringing is allowed."
- "the maker may remove shared content or close an account that breaks the terms."
- "without warranty, and liability is limited as far as the law"
- "a line under the sign-up button says signing up means agreeing to the Terms and the Privacy policy, both linked. There is no checkbox, so sign-up stays one step."

The sharing row's last sentence restates how sharing works today ([sharing](../../knowledge/features/sharing.md): Add to my library makes the visitor's own copy).

**Tags:** `screen`, `security` (it changes the login screen, though only by adding links and a line of copy: no sign-in, session or password code changes)

**Knowledge:**
- `features/privacy-and-deletion-pages`: the public legal pages include `/terms` (`src/views/Terms.vue`), with `meta.public`; login links the privacy policy and the terms, Info links all three, and the privacy policy links the terms; the title and description name the terms page too.
- `features/sign-in`: in sign-up mode a line under the submit button says signing up means agreeing to the Terms of service and the Privacy policy, both linked, with no checkbox ([decision](../decisions/terms-of-service-content.md)).
- `apps/flash-cards`: the public pages are login, `/privacy`, `/delete-account`, `/terms` and shared links.

**Acceptance:**
- Given a signed-out visitor, when they open `/terms` directly, then the URL stays `/terms`, the heading `Terms of service` and `Last updated: 17 November 2026` are visible, each row title (`Who can use it`, `Your sets`, `Sharing`, `What's not allowed`, `If the terms are broken`, `No warranty`, `Governing law`, `Contact`) is visible, the text `the laws of India` is visible, a link with `href="mailto:panditankit1995@gmail.com"` is visible, a link named `Privacy policy` has `href="/privacy"`, and Back leads to `/login`. (e2e)
- Given a signed-in user, when they open `/terms`, then they stay on `/terms` and Back leads to `/home`. (e2e)
- Given `authRedirect` with the `/terms` route's meta, when called signed out, signed in, and signed in with `?redirect=/bin`, then it returns `true` each time. (unit, `router.spec.ts`)
- Given `routes`, when the `/terms` record is looked up, then its `meta.public` is `true` and it has no `requireAuth`. (unit, `router.spec.ts`)
- Given `Terms.vue` rendered in English, then it shows every English string in the table above, the mailto link to `CONTACT_EMAIL`, and the `Privacy policy` link inside the `Your sets` sentence. (unit, `terms.spec.ts`)
- Given `Terms.vue` rendered in Hindi, then it shows `hi.terms.title`, each Hindi row title, and the in-sentence privacy link with `hi.links.privacy` as its text, with no English row title left on the page. (unit, `terms.spec.ts`)
- Given `en.terms.updated`, then it matches `/^Last updated: \d{1,2} [A-Z][a-z]+ 2026$/` and equals `Last updated: 17 November 2026`. (unit, `terms.spec.ts`)
- Given the login page in sign-in mode, then a link named `Privacy policy` has `href="/privacy"`, a link named `Terms of service` has `href="/terms"`, the text `By signing up you agree` is not shown, and no link named `Delete account` exists. (e2e; replaces "the login screen links only to the privacy policy")
- Given the login page switched to sign-up mode, then `By signing up you agree to the Terms of service and Privacy policy.` is visible and its two links go to `/terms` and `/privacy`; there is no checkbox on the form. (e2e)
- Given the login page switched to password reset, then the agree line is not shown. (e2e)
- Given a signed-in user on `/info`, then links named `Privacy policy`, `Terms of service` and `Delete account` have `href` `/privacy`, `/terms` and `/delete-account`. (e2e; extends "the info screen links to both pages")
- Given a signed-out visitor on `/privacy`, then a link named `Terms of service` has `href="/terms"`. (e2e)
- Given `/terms`, when axe scans it with the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags, then it finds no violations. (e2e; add `['/terms', 'Terms of service']` to the "public pages are accessible" list in `a11y.spec.ts`)

- [ ] **Step 1: Write the failing unit tests** for the unit cases above, in `tests/unit/terms.spec.ts` (modelled on `tests/unit/privacy.spec.ts`) and `tests/unit/router.spec.ts`

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `pnpm exec vitest run tests/unit/terms.spec.ts tests/unit/router.spec.ts`
Expected: FAIL on the assertions. Create `src/views/Terms.vue` as an empty template first, so the failure is on behaviour, not a missing module

- [ ] **Step 3: Write the failing e2e tests** for the e2e cases above, in `tests/e2e/public-pages.spec.ts` and `tests/e2e/a11y.spec.ts`

- [ ] **Step 4: Run the e2e tests to verify they fail**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts --project=desktop"`
Expected: FAIL on the terms, login, info and privacy cases. If the emulators or build can't start in this environment, say so in the report and rely on the unit tests

- [ ] **Step 5: Add the route and the locale keys** to `src/router/index.ts`, `src/locales/en.json` and `src/locales/hi.json`

- [ ] **Step 6: Build `src/views/Terms.vue`** to the layout and strings above

- [ ] **Step 7: Add the links and the agree line** to `src/views/Login.vue`, `src/views/Info.vue` and `src/views/Privacy.vue`

- [ ] **Step 8: Run the unit tests to verify they pass**

Run: `pnpm exec vitest run tests/unit/terms.spec.ts tests/unit/router.spec.ts tests/unit/locales.spec.ts`
Expected: PASS

- [ ] **Step 9: Run the e2e tests to verify they pass**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts --project=desktop"`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/views/Terms.vue src/router/index.ts src/locales/en.json src/locales/hi.json src/views/Login.vue src/views/Info.vue src/views/Privacy.vue tests/unit/terms.spec.ts tests/unit/router.spec.ts tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts
git commit -m "Add a public terms of service page at /terms, linked from login, Info and the privacy policy, with an agree line under sign-up."
```
