# Flashcards

A learning and memorization PWA: create flashcard sets, review them, and track what you've learned.
Live at https://flashcards.spanion.in (also served at https://spanion-flash-cards.web.app).

**Stack:** Vue 3, Vuetify 4, Vite 8, Pinia, Vue Router, vue-i18n (English and Hindi), Firebase 13 (Auth + Firestore), TypeScript.

## Setup

Requires Node 24 (see `.nvmrc`; 20.19+ works) and, for the emulators, Java 21.

```bash
npm install
cp .env.example .env.local   # then fill in the Firebase web app config
```

All configuration comes from environment variables (`VUE_APP_*`, listed in `.env.example`); nothing is
hard-coded. The Firebase web config is public by design, but keep `.env.local` out of git (it is ignored).
With the Firebase CLI logged in you can print the config with
`npx firebase-tools apps:sdkconfig WEB --project spanion-flash-cards`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run serve` | Dev server on http://localhost:8080 against the Firebase project in `.env.local` |
| `npm run emulators` | Local Auth + Firestore emulators |
| `npm run dev:emulator` | Dev server against the emulators; no real accounts or data are touched |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` / `npm run type-check` | ESLint / `vue-tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore security-rules tests on the emulator |
| `npm run test:e2e` | Playwright end-to-end + accessibility tests (desktop and mobile) on a production build against the emulators |
| `npm run deploy` | Build and deploy hosting from your machine |

The Firebase CLI is run with `npx` at a pinned version, so it is not a project dependency.

## CI/CD

| Workflow | When | What |
| --- | --- | --- |
| `ci.yml` | Every pull request | Lint, type-check, unit tests, security-rules tests, build, `npm audit` of shipped deps, and the Playwright e2e/a11y suite |
| `preview.yml` | Every pull request from this repo | Deploys a temporary preview channel (7 days) and comments the URL |
| `deploy.yml` | Push to `master` | Runs CI, then deploys hosting. Run it by hand with **deploy_rules** ticked to also deploy `firestore.rules` |
| `codeql.yml` | PRs, pushes, weekly | CodeQL security analysis of the app and the workflows |
| `dependabot.yml` | Weekly | Grouped dependency and GitHub Actions updates |

Actions are pinned to commit SHAs; Dependabot keeps them current.

### One-time setup for deploys

In **Settings > Secrets and variables > Actions**:

- **Secret** `FIREBASE_SERVICE_ACCOUNT`: JSON key of a Google Cloud service account with the
  *Firebase Hosting Admin* role (plus *Firebase Rules Admin* if you deploy rules from CI).
  `npx firebase-tools init hosting:github` can create it and add the secret for you.
- **Variables** `FIREBASE_PROJECT_ID` and the `VUE_APP_*` values from `.env.example`; optionally `APP_URL`
  (the address shown on deploys, e.g. `https://flashcards.spanion.in`).
- The service account needs *Firebase Hosting Admin* and *Service Usage Consumer*
  (the CLI checks that the Hosting API is enabled before deploying).

Until these exist, `deploy.yml` fails with a message naming what is missing and `preview.yml` is skipped.

### Domains

Both addresses serve the same deploy. Each one the app is opened from must be listed in
Firebase console > Authentication > Settings > **Authorized domains**, or Google sign-in fails there
(email/password works everywhere). If you restrict the web API key by HTTP referrer, list both domains there too.

## Security

- `firestore.rules` limits every document to its owner (`uid`) and checks the stored shape; tested in `tests/unit/firestore.rules.spec.ts`.
- Hosting sends a Content-Security-Policy and other security headers (`firebase.json`).
- Report vulnerabilities privately through GitHub's **Security > Report a vulnerability**.

## Data model

Firestore collections are unchanged from the original app, so existing data keeps working:

- `flash-card-sets`: `{ id, uid, title, color, date (Timestamp), trashed, fav, labels: string[], cards: JSON string }`
- `labels`: `{ uid, label }`
