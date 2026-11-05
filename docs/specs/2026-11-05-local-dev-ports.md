# Local Dev Ports Spec

**Date:** 2026-11-05
**Status:** Draft, for the developer's review
**Scope:** Every port the project opens on the developer's machine moves into one block, `2100`–`2108`, so local
development never collides with the developer's other projects.

## 1. Why

The ports are scattered today: the dev server on `8080`, Auth on `9099`, Firestore on `8085`, Hosting on `5050`,
the emulator hub and logging on Firebase's defaults (`4400`, `4500`), `npm run preview` on Vite's default `4173`,
and the e2e preview on `4317`. Several have already clashed with other projects (Expo on `8081`, another project's
`vite preview` on `4173`). One block, used by nothing else, lets this project run beside anything.

## 2. The port map

| Port | What | Set in |
| --- | --- | --- |
| `2100` | Vite dev server (`dev`, `serve`, `dev:emulator`) | `vite.config.ts` `server.port` |
| `2101` | Emulator hub | `firebase.json` `emulators.hub.port` |
| `2102` | Auth emulator | `firebase.json` `emulators.auth.port` |
| `2103` | Firestore emulator | `firebase.json` `emulators.firestore.port` |
| `2104` | Firestore emulator websocket | `firebase.json` `emulators.firestore.websocketPort` |
| `2105` | Emulator logging | `firebase.json` `emulators.logging.port` |
| `2106` | Hosting emulator | `firebase.json` `emulators.hosting.port` |
| `2107` | `npm run preview` | `vite.config.ts` `preview.port` |
| `2108` | e2e preview (Playwright `webServer`) | `playwright.config.ts` |

- 2.1 Every port is fixed, with `strictPort` where the tool has it, so a taken port fails loudly instead of moving.
- 2.2 The emulator UI stays disabled, as today.
- 2.3 A port added later (for example the functions or Pub/Sub emulator, which no script starts today) takes the
  next free number, `2109` on.

## 3. One source for the TypeScript side

- 3.1 A new root module, `dev-ports.ts`, exports `DEV_PORTS`: the map above, one named entry per row.
- 3.2 `vite.config.ts`, `playwright.config.ts` and `src/services/firebase.ts` read their ports from `DEV_PORTS`
  instead of literals. `src/services/firebase.ts` connects the Auth and Firestore emulators on `127.0.0.1` at
  `DEV_PORTS.auth` and `DEV_PORTS.firestore`.
- 3.3 `firebase.json` is plain JSON the Firebase CLI reads, so it keeps literal numbers. A unit test,
  `tests/unit/devPorts.spec.ts`, fails when they differ from `DEV_PORTS`, and when the ports in `DEV_PORTS` are not
  unique, contiguous and starting at `2100`.
- 3.4 `tsconfig.json` includes `dev-ports.ts`.

## 4. Google sign-in on the real project

- 4.1 `npm run serve` now runs on `http://localhost:2100`. Google sign-in there needs, on the OAuth web client
  (Google Cloud console > APIs & Services > Credentials):
  - Authorized JavaScript origin `http://localhost:2100`
  - Authorized redirect URI `http://localhost:2100/__/auth/handler`
- 4.2 The developer adds these by hand. The `8080` entries can stay until they're no longer needed.
- 4.3 Emulator sign-in (`npm run dev:emulator`) needs nothing.

## 5. Documents that name the old ports

- 5.1 `README.md`: the Scripts table and the OAuth client list.
- 5.2 Knowledge: `operations/run-locally`, `operations/android-release`, `decisions/google-sign-in-redirect`, and a
  new decision recording the port block and why.
- 5.3 The deferred AI plans (`docs/plans/2026-11-02-ai-*.md`) say the Firestore emulator "stays `8085`" and the
  functions emulator uses `5001`. Those lines change to point at `dev-ports.ts` and §2.3.
- 5.4 Older specs and plans that were already built (the Android TWA ones) stay as they are: they record what was
  true then.

## 6. Out of scope

- No functions or Pub/Sub emulator config (§2.3 covers them when they're needed).
- No change to the hosting CSP or to production.

## 7. Testing

- 7.1 Test first: `tests/unit/devPorts.spec.ts` (§3.3), watched failing before `dev-ports.ts` and `firebase.json`
  change.
- 7.2 By hand: `npm run emulators` and `npm run dev:emulator` start, each port in §2 answers, and an email sign-up
  and sign-in work against the emulators on `http://localhost:2100`.
- 7.3 At the end: smoke, typecheck and lint for what the branch changed. `npm run test:e2e` and
  `npm run test:rules` only if the developer asks.
