# Flashcards

A learning and memorization PWA: create flashcard sets, review them, and track what you've learned.
Live at https://spanion-flash-cards.web.app.

**Stack:** Vue 3, Vuetify 4, Vite 8, Pinia, Vue Router, vue-i18n (English and Hindi), Firebase 13 (Auth + Firestore), TypeScript.

## Setup

Requires Node 20.19 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the Firebase web app config
```

The config comes from Firebase console > Project settings > Your apps. With the Firebase CLI logged in, you can print it with
`npx firebase-tools apps:sdkconfig WEB --project spanion-flash-cards`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run serve` | Dev server on http://localhost:8080 against the Firebase project in `.env.local` |
| `npm run emulators` | Local Auth + Firestore emulators (needs Java) |
| `npm run dev:emulator` | Dev server against the emulators; no real accounts or data are touched |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore security-rules tests on the emulator |

## Deploy

```bash
npm run build && npx firebase-tools deploy --only hosting
```

Security rules live in `firestore.rules` and deploy separately with `npx firebase-tools deploy --only firestore:rules`.

## Data model

Firestore collections are unchanged from the original app, so existing data keeps working:

- `flash-card-sets`: `{ id, uid, title, color, date (Timestamp), trashed, fav, labels: string[], cards: JSON string }`
- `labels`: `{ uid, label }`
