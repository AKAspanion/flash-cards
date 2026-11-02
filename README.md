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
| `npm run deploy:functions` | Build and deploy the Cloud Functions in `functions/` (the budget kill switch) |

The Firebase CLI is run with `npx` at a pinned version, so it is not a project dependency.

## CI/CD

| Workflow | When | What |
| --- | --- | --- |
| `ci.yml` | Every pull request | Lint, type-check, unit tests, security-rules tests, build, `npm audit` of shipped deps, a build and audit of `functions/`, and the Playwright e2e/a11y suite |
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

Until these exist, `deploy.yml` fails with a message naming what is missing.

### Domains

Both addresses serve the same deploy. Each one the app is opened from must be listed in
Firebase console > Authentication > Settings > **Authorized domains**, or Google sign-in fails there
(email/password works everywhere). If you restrict the web API key by HTTP referrer, list both domains there too.

Google's sign-in window shows the **auth domain** (`VUE_APP_AUTH_DOMAIN`). It is set to `flashcards.spanion.in`
rather than the default `spanion-flash-cards.firebaseapp.com`; Firebase Hosting serves the `/__/auth/*` helper
pages on any connected domain. Using a custom auth domain needs, in Google Cloud console > APIs & Services >
Credentials > the *Web client (auto created by Google Service)*:
- Authorized JavaScript origins: `https://flashcards.spanion.in`
- Authorized redirect URIs: `https://flashcards.spanion.in/__/auth/handler`

`firebase.json` allows that domain in the CSP `frame-src`, so sign-in also works when the app is opened on the
`.web.app` address.

### Budget kill switch

The project is on the Blaze plan, which has no spending cap. `functions/` holds `billingKillSwitch`, a Cloud
Function that listens to the monthly budget's notifications and **unlinks the billing account** once actual spend
reaches the budget. Without billing the project falls back to the free Spark limits: Hosting, Auth and Firestore
keep working within the free quota, and anything beyond it stops instead of being charged. Forecast alerts don't
trigger it.

Cloud Billing reports spend several hours late, so the final bill can end up a little over the budget.

One-time setup in the Google Cloud console for `spanion-flash-cards`, signed in as the project owner:

1. **Service account:** IAM & Admin > Service accounts > **Create service account** with ID
   `billing-kill-switch`, and give it the **Project Billing Manager** role. That role is all it needs to turn
   billing off for this project, and it can't touch the billing account or other projects.
2. **API:** enable the [Cloud Billing API](https://console.cloud.google.com/apis/library/cloudbilling.googleapis.com?project=spanion-flash-cards).
3. **Deploy:** `npm run deploy:functions`. This creates the function and its Pub/Sub topic `budget-alerts`.
   The first deploy may stop with a cleanup-policy error after the function is created; run
   `npx --yes firebase-tools@15.34.2 functions:artifacts:setpolicy --location us-east1 --force` once.
4. **Let the trigger call the function:** Cloud Run > `billingkillswitch` > **Security** (or Permissions) >
   **Add principal** `billing-kill-switch@spanion-flash-cards.iam.gserviceaccount.com` with the
   **Cloud Run Invoker** role. Pub/Sub messages are delivered as that account, and the Firebase CLI only grants
   invoke rights for HTTP and scheduled functions. Without the role, the logs show `lacks {run.routes.invoke}`.
5. **Connect the budget:** Billing > Budgets & alerts > the monthly budget > Edit > Actions >
   **Connect a Pub/Sub topic to this budget** > project `spanion-flash-cards`, topic `budget-alerts` > Save.
6. **Check the wiring:** Pub/Sub > Topics > `budget-alerts` > Messages > **Publish message** with the body
   `{"costAmount": 0.5, "budgetAmount": 5, "currencyCode": "USD"}`. The function's logs should show
   `Budget check: under-budget`. Never publish a `costAmount` at or above `budgetAmount`: that really turns
   billing off.

To turn billing back on after it fires, raise the budget first. Then link the billing account again in Billing >
Account management, or in Firebase console > Usage and billing > Modify plan > Blaze. If you re-link while the
month's spend is still over the budget, the next notification turns billing off again.

## Security

- `firestore.rules` limits every document to its owner (`uid`) and checks the stored shape; tested in `tests/unit/firestore.rules.spec.ts`.
- Hosting sends a Content-Security-Policy and other security headers (`firebase.json`).
- Report vulnerabilities privately through GitHub's **Security > Report a vulnerability**.

## Data model

Firestore collections are unchanged from the original app, so existing data keeps working:

- `flash-card-sets`: `{ id, uid, title, color, date (Timestamp), trashed, fav, labels: string[], cards: JSON string }`
- `labels`: `{ uid, label }`
