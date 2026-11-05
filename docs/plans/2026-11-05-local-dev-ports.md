# Local Dev Ports Implementation Plan

**Status:** complete, commits 97eba9a..3e8e8f9, 2026-11-05; record in [2026-11-05-local-dev-ports.record.md](2026-11-05-local-dev-ports.record.md)

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Every port the project opens on the developer's machine is fixed in the block `2100`–`2108`.

**Architecture:** A root module, `dev-ports.ts`, holds the port map as `DEV_PORTS`. The Vite config, the Playwright
config and the app's emulator connection read it; `firebase.json` repeats the emulator ports as literals, and a unit
test keeps the two in step. The README and the deferred AI plans stop naming the old ports.

**Tech Stack:** Vue 3, Vite 8 (`vite.config.ts`), Vitest (`tests/unit`), Playwright (`playwright.config.ts`), the
Firebase emulators run by `npx --yes firebase-tools@15.34.2` (`firebase.json`), pnpm.

**Spec:** [docs/specs/2026-11-05-local-dev-ports.md](../specs/2026-11-05-local-dev-ports.md)

## Global Constraints

- The port map (spec §2): dev server `2100`, emulator hub `2101`, Auth emulator `2102`, Firestore emulator `2103`,
  Firestore websocket `2104`, emulator logging `2105`, Hosting emulator `2106`, `npm run preview` `2107`, e2e
  preview `2108`.
- "Every port is fixed, with `strictPort` where the tool has it, so a taken port fails loudly instead of moving."
  (spec §2.1)
- "The emulator UI stays disabled, as today." (spec §2.2)
- No functions or Pub/Sub emulator config (spec §6).
- No change to the hosting CSP or to production (spec §6).
- Never read or print `.env.emulator` or `.env.local`.
- No task edits `knowledge/`: the after-finish job writes the concepts each task lists.

## Checkpoints

None. After the last task, the session starts the emulators and `npm run dev:emulator`, checks each port answers,
and signs up and in with email against the emulators on `http://localhost:2100` (spec §7.2).

---

### Task 1: The port map and its guard

**Files:**
- Create: `dev-ports.ts`
- Modify: `firebase.json` (the `emulators` block)
- Modify: `tsconfig.json` (`include`)
- Test: `tests/unit/devPorts.spec.ts`

**Interfaces:**
- Consumes: existing `firebase.json`
- Produces: `DEV_PORTS`, consumed by Task 2.

```ts
// dev-ports.ts — one entry per row of spec §2, in port order.
export const DEV_PORTS = {
  devServer: 2100,
  hub: 2101,
  auth: 2102,
  firestore: 2103,
  firestoreWebsocket: 2104,
  logging: 2105,
  hosting: 2106,
  preview: 2107,
  e2ePreview: 2108,
} as const;
export type DevPort = keyof typeof DEV_PORTS;
```

`firebase.json` `emulators` after this task (the UI and `singleProjectMode` entries unchanged):

```json
{
  "hub": { "port": 2101 },
  "auth": { "port": 2102 },
  "firestore": { "port": 2103, "websocketPort": 2104 },
  "logging": { "port": 2105 },
  "hosting": { "port": 2106 },
  "ui": { "enabled": false },
  "singleProjectMode": true
}
```

**Spec:**
- §3.1: "A new root module, `dev-ports.ts`, exports `DEV_PORTS`: the map above, one named entry per row."
- §3.3: "`firebase.json` is plain JSON the Firebase CLI reads, so it keeps literal numbers. A unit test,
  `tests/unit/devPorts.spec.ts`, fails when they differ from `DEV_PORTS`, and when the ports in `DEV_PORTS` are not
  unique, contiguous and starting at `2100`."
- §3.4: "`tsconfig.json` includes `dev-ports.ts`."

**Tags:** `security` (sets the Auth emulator's port)

**Knowledge:**
- `decisions/local-ports-2100-block`: the map is `DEV_PORTS` in `dev-ports.ts`, mirrored in `firebase.json` and
  guarded by `tests/unit/devPorts.spec.ts`.
- `operations/run-locally`: emulator ports are `DEV_PORTS` in `dev-ports.ts`, mirrored in `firebase.json`.

**Acceptance:**
- Given `DEV_PORTS`, when its values are sorted, then they are `2100` to `2108` with no gap and no repeat.
- Given `firebase.json`, then `emulators.hub.port` is `DEV_PORTS.hub` (`2101`).
- Given `firebase.json`, then `emulators.auth.port` is `DEV_PORTS.auth` (`2102`).
- Given `firebase.json`, then `emulators.firestore.port` is `DEV_PORTS.firestore` (`2103`) and
  `emulators.firestore.websocketPort` is `DEV_PORTS.firestoreWebsocket` (`2104`).
- Given `firebase.json`, then `emulators.logging.port` is `DEV_PORTS.logging` (`2105`).
- Given `firebase.json`, then `emulators.hosting.port` is `DEV_PORTS.hosting` (`2106`).
- Given `firebase.json`, then `emulators.ui.enabled` is `false`.

- [x] **Step 1: Create `dev-ports.ts`** with the `DEV_PORTS` contract above, so the tests fail on behaviour rather
  than on a missing module. Add `dev-ports.ts` to `include` in `tsconfig.json`.

- [x] **Step 2: Write the failing tests** for each Acceptance case, in `tests/unit/devPorts.spec.ts`, reading
  `firebase.json` as JSON.

- [x] **Step 3: Run them to verify they fail**

Run: `pnpm exec vitest run tests/unit/devPorts.spec.ts`
Expected: FAIL on the `firebase.json` cases (hub, auth, firestore, logging and hosting still hold the old ports).

- [x] **Step 4: Change the `emulators` block of `firebase.json`** to the contract above.

- [x] **Step 5: Run them to verify they pass**

Run: `pnpm exec vitest run tests/unit/devPorts.spec.ts`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add dev-ports.ts firebase.json tsconfig.json tests/unit/devPorts.spec.ts
git commit -m "Keep every local port in DEV_PORTS from 2100, mirrored and checked in firebase.json."
```

### Task 2: The dev server, previews and emulator connection read DEV_PORTS

**Files:**
- Modify: `vite.config.ts` (`server`, a new `preview` block)
- Modify: `playwright.config.ts` (`PORT`)
- Modify: `src/services/firebase.ts:79-82` (the emulator connection in `getServices`)

**Interfaces:**
- Consumes: `DEV_PORTS` from `dev-ports.ts` (Task 1).
- Produces: nothing new.

```ts
// vite.config.ts
server: { port: DEV_PORTS.devServer, strictPort: true, proxy: authProxy },
preview: { port: DEV_PORTS.preview, strictPort: true },
// playwright.config.ts
const PORT = DEV_PORTS.e2ePreview;
// src/services/firebase.ts, in getServices when useEmulators
connectAuthEmulator(auth, `http://127.0.0.1:${DEV_PORTS.auth}`, { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', DEV_PORTS.firestore);
```

`src/services/firebase.ts` imports `DEV_PORTS` by relative path (`../../dev-ports`); the `@/` alias covers `src/`
only.

**Spec:**
- §3.2: "`vite.config.ts`, `playwright.config.ts` and `src/services/firebase.ts` read their ports from `DEV_PORTS`
  instead of literals. `src/services/firebase.ts` connects the Auth and Firestore emulators on `127.0.0.1` at
  `DEV_PORTS.auth` and `DEV_PORTS.firestore`."
- §2.1: "Every port is fixed, with `strictPort` where the tool has it, so a taken port fails loudly instead of moving."

**Tags:** `security` (changes where the app's Auth connects under the emulators, and the dev origin Google sign-in
  uses)

**Knowledge:**
- `operations/run-locally`: `npm run serve` and `npm run dev:emulator` run on `DEV_PORTS.devServer`, and
  `npm run preview` on `DEV_PORTS.preview`, both with `strictPort`.
- `decisions/google-sign-in-redirect`: dev-server sign-in on the real project needs
  `http://localhost:2100/__/auth/handler` on the OAuth web client.
- `operations/android-release`: the dev redirect URI is `http://localhost:2100/__/auth/handler`.
- `quality/testing`: the e2e preview runs on `DEV_PORTS.e2ePreview`.

**Acceptance:**
- Given the emulators are running, when `npm run dev:emulator` starts, then Vite serves `http://localhost:2100`.
- Given another process holds `2100`, when `npm run dev` starts, then Vite exits with a port-in-use error instead of
  choosing another port.
- Given a build in `dist/`, when `npm run preview` starts, then it serves `http://localhost:2107`.
- Given the app runs with `VUE_APP_USE_EMULATORS=true`, when it loads, then its Auth requests go to
  `127.0.0.1:2102` and its Firestore requests to `127.0.0.1:2103`.
- Given `playwright.config.ts`, then its `baseURL` and `webServer.url` are `http://localhost:2108`, and the
  `webServer.command` passes `--port 2108 --strictPort`.

- [x] **Step 1: Check the current behaviour fails the cases.** With nothing on `2100`, run `npm run dev:emulator`
  and confirm it serves on `8080`, not `2100`; stop it.

- [x] **Step 2: Change `vite.config.ts`** to the `server` and `preview` contracts above, importing `DEV_PORTS` from
  `./dev-ports`.

- [x] **Step 3: Change `playwright.config.ts`** so `PORT` is `DEV_PORTS.e2ePreview`.

- [x] **Step 4: Change `src/services/firebase.ts`** to connect the emulators at `DEV_PORTS.auth` and
  `DEV_PORTS.firestore`.

- [x] **Step 5: Verify the cases.** Run `npm run dev:emulator` and confirm it serves `http://localhost:2100`; with
  `2100` held by another process, confirm `npm run dev` exits with a port-in-use error. Run
  `pnpm exec vite build` then `npm run preview` and confirm it serves `http://localhost:2107`. Stop each server you
  started, and only those.

- [x] **Step 6: Commit**

```bash
git add vite.config.ts playwright.config.ts src/services/firebase.ts
git commit -m "Run the dev server, previews and emulator connection on the ports in DEV_PORTS."
```

### Task 3: README and the deferred AI plans name the new ports

**Files:**
- Modify: `README.md` (the Scripts table, and the OAuth web client list under "Domains")
- Modify: `docs/plans/2026-11-02-ai-foundation.md` (lines 22, 39, 127 and 418)
- Modify: `docs/plans/2026-11-02-ai-study.md:25`
- Modify: `docs/plans/2026-11-02-ai-create.md:23`

**Interfaces:**
- Consumes: `DEV_PORTS` in `dev-ports.ts` (Task 1), named by path only.
- Produces: nothing.

**Spec:**
- §4.1: "`npm run serve` now runs on `http://localhost:2100`."
- §4.1: "Authorized JavaScript origin `http://localhost:2100`"
- §4.1: "Authorized redirect URI `http://localhost:2100/__/auth/handler`"
- §2.3: "A port added later (for example the functions or Pub/Sub emulator, which no script starts today) takes the
  next free number, `2109` on."
- §4.2: "The developer adds these by hand. The `8080` entries can stay until they're no longer needed."
- §5.1: "`README.md`: the Scripts table and the OAuth client list."
- §5.3: "The deferred AI plans (`docs/plans/2026-11-02-ai-*.md`) say the Firestore emulator "stays `8085`" and the
  functions emulator uses `5001`. Those lines change to point at `dev-ports.ts` and §2.3."
- §5.4: "Older specs and plans that were already built (the Android TWA ones) stay as they are"

**Tags:** `security` (documents the OAuth web client's origins and redirect URIs)

**Knowledge:** none.

**Acceptance:**
- Given `README.md`, then the `npm run serve` row says the dev server is on `http://localhost:2100`, and the Scripts
  section has a line saying every local port is in `dev-ports.ts`, from `2100`.
- Given `README.md`, then the OAuth web client list names `http://localhost:2100` as a JavaScript origin and
  `http://localhost:2100/__/auth/handler` as a redirect URI, and no longer `localhost:8080`.
- Given each of the three AI plans, then its Global Constraints port line says the emulator ports are `DEV_PORTS` in
  `dev-ports.ts`, and that the functions emulator takes `2109` (spec §2.3), added to `DEV_PORTS` as `functions` and
  to `firebase.json` as `emulators.functions.port`.
- Given `docs/plans/2026-11-02-ai-foundation.md`, then its Files line, its acceptance case and its
  `src/services/firebase.ts` step name the functions emulator on `2109` (`DEV_PORTS.functions`), not `5001`.
- Given the three AI plans, then none of them says `8085` or `5001`.
- Given `docs/specs/2026-11-04-android-twa.md` and `docs/plans/2026-11-04-android-twa.md`, then they are unchanged.

- [x] **Step 1: Confirm the old ports are there.** Run
  `grep -nE "8080|8085|5001" README.md docs/plans/2026-11-02-ai-foundation.md docs/plans/2026-11-02-ai-study.md docs/plans/2026-11-02-ai-create.md`
  and see the lines listed in **Files**.

- [x] **Step 2: Edit `README.md`** to the README cases.

- [x] **Step 3: Edit the three AI plans** to the AI plan cases.

- [x] **Step 4: Verify.** Run the Step 1 command again: no match. Run
  `git diff --stat -- docs/specs/2026-11-04-android-twa.md docs/plans/2026-11-04-android-twa.md`: empty.

- [x] **Step 5: Commit**

```bash
git add README.md docs/plans/2026-11-02-ai-foundation.md docs/plans/2026-11-02-ai-study.md docs/plans/2026-11-02-ai-create.md
git commit -m "Name the 2100 port block in the README and the deferred AI plans."
```
