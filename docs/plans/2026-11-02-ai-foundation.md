# AI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Cloud Functions backend, a switchable Claude/Gemini model layer, the plan/allowance system, consent, reporting and Pro screen that every AI feature builds on.

**Architecture:** A new `functions/` package (Firebase callable functions, 2nd gen) wraps every AI call in one gateway (`aiCallable`) that checks sign-in, consent, plan, rate limit and monthly allowance, and refunds on failure. Feature code calls the model only through `aiJson` / `aiStream`, which route each feature to a provider adapter (Claude Haiku 5.5 by default, Gemini 3.1 Flash-Lite on Vertex AI when `AI_PROVIDER=gemini`); both adapters pass one conformance test suite. Shared request/response types and limits live in `shared/ai-contracts.ts`, used by both the app and the functions. The app gets one Pinia store (`useAiStore`) that runs any AI action through consent → plan → call → error snack.

**Tech Stack:** App: Vue 3.5, Vuetify 4, Pinia 4, vue-i18n 11, Vite 8, Firebase JS SDK 13 (`firebase/functions`), Vitest 5, Playwright 1.64. Functions: Node.js `nodejs22`, `firebase-functions` (v2 API), `firebase-admin`, `@anthropic-ai/sdk`, `@google/genai` (Vertex AI), `zod`, Vitest. Emulators via `npx --yes firebase-tools@15.34.2`. CI: GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`).

**Spec:** `docs/specs/2026-11-02-ai-features.md`

## Global Constraints

- §3.1: "The Anthropic API key never reaches the browser. Every AI call goes through a Firebase callable Cloud Function (2nd gen) in `functions/`."
- §3.4: "Functions run in the region set by `VUE_APP_FUNCTIONS_REGION` (app) and `FUNCTIONS_REGION` (functions), which must be the Firestore database's region. Default: `us-central1`."
- §3.6: "When `AI_FAKE=1` is set (emulator and e2e only), the AI client returns fixed fixture output and never calls Anthropic."
- §4.1: "Every model call goes through one provider interface and one routing table, `functions/src/ai/models.ts`, that maps each feature to a model and an effort level per provider. No other file names a model or imports a provider SDK."
- §5.6: "An action's allowance is reserved before Claude is called and refunded if the call fails, times out or is refused. A user never pays for an error."
- §6.5: functions never log card text, notes, files or answers.
- Every new UI string is added to both `src/locales/en.json` and `src/locales/hi.json` (`tests/unit/locales.spec.ts` fails otherwise).
- Firestore emulator port stays `8085`; functions emulator uses `5001`.
- `firebase-tools` is never added as a dependency; scripts use `npx --yes firebase-tools@15.34.2`.
- Branch: `feat/ai-foundation` off `master` (this repo's default branch).
- Another worktree (`.claude/worktrees/google-play-policy-fixes-6f0029`) has uncommitted edits to `src/App.vue`; expect a merge conflict there and keep both changes.

## Checkpoints

- None (policy `run.checkpoints: none`). Suggested for the developer to add: after Task 3 (`security`), to read the gateway and providers before features build on them.

---

### Task 1: Functions package, shared contracts, rules and CI

**Files:**
- Create: `functions/package.json`, `functions/package-lock.json`, `functions/tsconfig.json`, `functions/vitest.config.ts`, `functions/.gitignore`, `functions/src/index.ts`, `functions/src/config.ts`
- Create: `shared/ai-contracts.ts`
- Create: `tests/unit/aiContracts.spec.ts`
- Modify: `firebase.json` (functions codebase, functions emulator `5001`, CSP `connect-src`)
- Modify: `firestore.rules` (deny-all blocks for `users`, `ai-usage`, `ai-rate`, `ai-reports`)
- Modify: `tests/unit/firestore.rules.spec.ts`
- Modify: `package.json` (scripts), `tsconfig.json` (include `shared/**/*.ts`)
- Modify: `.env.example`, `.env.emulator` (`VUE_APP_FUNCTIONS_REGION`)
- Modify: `.github/workflows/ci.yml` (functions install, lint, test, build), `.github/workflows/deploy.yml` (`deploy_functions` input)
- Modify: `.gitignore` (`functions/lib/`)

**Interfaces:**
- Consumes: existing `firestore.rules` helpers `signedIn()`, `ownsStored()`.
- Produces (used by every later task and plan):

```ts
// shared/ai-contracts.ts — types and constants only, no imports from firebase
export type AiPlan = 'free' | 'pro';
export type AiCost = 'light' | 'heavy' | 'none';
export type AiFeature =
  | 'generateCards' | 'suggestBack' | 'suggestSetDetails' | 'checkCardQuality'
  | 'srs' | 'gradeAnswer' | 'explainCard' | 'weakSpots'
  | 'practiceAi' | 'practiceReverse' | 'translateSet'
  | 'searchCards' | 'findDuplicates'
  | 'speakDevice' | 'speakNatural';
/** Features that call a text model (Claude or Gemini); the only keys of the routing table. */
export type ModelFeature =
  | 'generateCards' | 'suggestBack' | 'suggestSetDetails' | 'checkCardQuality'
  | 'gradeAnswer' | 'explainCard' | 'weakSpots' | 'practiceAi' | 'translateSet';
export type AiErrorReason =
  | 'consent-required' | 'pro-required' | 'quota-exceeded' | 'rate-limited'
  | 'invalid-input' | 'too-large' | 'ai-busy' | 'ai-refused' | 'ai-bad-output';
export interface AiAllowance { light: number; heavy: number }
export const AI_LIMITS: Record<AiPlan, AiAllowance>;        // free {20,0}, pro {300,50}
export const FEATURE_COST: Record<AiFeature, AiCost>;      // spec §1.3 Cost column
export const FEATURE_ACCESS: Record<AiPlan, readonly AiFeature[]>; // spec §1.3 Tier column
export const RATE_LIMIT: { readonly requests: 10; readonly windowMs: 60_000 };
export const AI_FUNCTION_NAMES: readonly ['getAiStatus', 'recordAiConsent', 'reportAiOutput'];
export interface AiStatus {
  plan: AiPlan; consented: boolean;
  month: string;            // 'yyyy-mm' UTC
  used: AiAllowance; limits: AiAllowance;
  resetsAt: string;         // ISO, 00:00 UTC on the 1st of next month
}
export interface ReportAiOutputRequest { feature: AiFeature; output: string; reason: string }
export function monthKey(date: Date): string;              // 'yyyy-mm' in UTC
export function nextReset(date: Date): string;             // ISO string
```

```ts
// functions/src/config.ts
export const REGION: string;          // process.env.FUNCTIONS_REGION ?? 'us-central1'
export const ANTHROPIC_API_KEY: SecretParam; // defineSecret('ANTHROPIC_API_KEY')
export const AI_PROVIDER: StringParam;        // defineString('AI_PROVIDER', { default: 'anthropic' }); 'anthropic' | 'gemini'
export const GEMINI_LOCATION: StringParam;    // defineString('GEMINI_LOCATION', { default: 'global' })
export function aiFake(): boolean;    // true only when AI_FAKE === '1' and FUNCTIONS_EMULATOR === 'true'
```

Root `package.json` scripts added/changed:

| Script | Command |
|---|---|
| `functions:build` | `npm --prefix functions run build` |
| `test:functions` | `npm --prefix functions test` |
| `emulators` | starts `auth,firestore,functions` with `AI_FAKE=1`, after `functions:build` |
| `test:e2e` | as today, plus `functions:build` first and `functions` in `--only`, with `AI_FAKE=1` |

`firestore.rules`: `users/{uid}`, `ai-usage/{uid}/months/{month}`, `ai-rate/{uid}`, `ai-reports/{id}` → `allow read, write: if false`.

**Spec:**
- §3.2: "The functions codebase is a separate npm package in `functions/` (TypeScript, Node.js runtime `nodejs22`, `firebase-functions` v2 API, `firebase-admin`, `@anthropic-ai/sdk`, `@google/genai`, `zod`), deployed with `firebase deploy --only functions`."
- §3.3: "Request and response types that both the app and the functions use live in one file, `shared/ai-contracts.ts`, which both TypeScript projects include. It holds types and constants only, never runtime code that imports Firebase."
- §3.5: "`ANTHROPIC_API_KEY` is a Firebase secret (`firebase functions:secrets:set ANTHROPIC_API_KEY`), bound to every function that uses a text model, so switching provider needs no rebinding. It is never in `.env*` files committed to git."
- §3.7: "The hosting Content-Security-Policy `connect-src` adds `https://*.cloudfunctions.net https://*.run.app` (callable functions)"
- §5.2: "Monthly allowance — Free: 20 light, 0 heavy. Pro: 300 light, 50 heavy. Months are calendar months in UTC; usage resets at 00:00 UTC on the 1st."
- §5.5: "Rate limit: at most 10 AI requests per user per rolling 60 seconds, across all AI functions."
- §8.1: "Clients can neither read nor write `users/{uid}`; the app gets plan and usage from `getAiStatus`."
- §8.2: "`ai-usage/{uid}/months/{yyyy-mm}` and `ai-rate/{uid}`: server-only."
- §8.3: "`ai-reports/{id}`: server-only."

**Tags:** `security` (secrets, Firestore rules, CSP)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:**
- Given `AI_LIMITS`, then `free` is `{ light: 20, heavy: 0 }` and `pro` is `{ light: 300, heavy: 50 }`.
- Given `FEATURE_ACCESS.free`, then it is exactly `suggestBack`, `suggestSetDetails`, `checkCardQuality`, `practiceReverse`, `speakDevice`; `FEATURE_ACCESS.pro` contains all 15 features.
- Given `FEATURE_COST`, then `generateCards`, `weakSpots`, `practiceAi`, `translateSet` are `heavy`; `srs`, `practiceReverse`, `speakDevice` are `none`; every other feature is `light`.
- Given `2026-11-30T23:59:59Z`, `monthKey` returns `2026-11` and `nextReset` returns `2026-12-01T00:00:00.000Z`; given `2026-12-31T23:00:00Z`, `nextReset` returns `2027-01-01T00:00:00.000Z`.
- Given a signed-in user, when they read or write `users/{theirUid}`, `ai-usage/{theirUid}/months/2026-11`, `ai-rate/{theirUid}` or `ai-reports/x`, then the rules deny it.
- Given the existing rules tests, then they still pass.
- Given `firebase.json`, then the hosting CSP `connect-src` contains `https://*.cloudfunctions.net` and `https://*.run.app`, and `emulators.functions.port` is `5001`.
- Given `npm run test:functions` in a fresh checkout after `npm --prefix functions ci`, then it runs (zero tests is a pass at this point) and `npm run functions:build` emits `functions/lib/index.js`.

- [ ] **Step 1: Write the failing tests** for the contract and rules cases, in `tests/unit/aiContracts.spec.ts` and `tests/unit/firestore.rules.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test` and `npm run test:rules`
Expected: FAIL on assertions. Create `shared/ai-contracts.ts` with the real exported names first so the failure is about values, not a missing module.

- [ ] **Step 3: Scaffold `functions/`** (package with `build`, `test`, `lint` scripts; `tsconfig` that includes `../shared/ai-contracts.ts` and emits to `lib/`; `src/index.ts` exporting nothing yet; `src/config.ts`), add the dependencies with `npm --prefix functions install firebase-functions firebase-admin @anthropic-ai/sdk @google/genai zod` and `npm --prefix functions install -D typescript vitest`

- [ ] **Step 4: Fill in `shared/ai-contracts.ts`, the rules, `firebase.json`, root scripts, env files and the two workflows** until the tests pass. In `ci.yml`, add to the `checks` job: `npm --prefix functions ci`, `npm --prefix functions run lint`, `npm run test:functions`, `npm run functions:build`; and `npm --prefix functions ci` before e2e. In `deploy.yml`, add a `deploy_functions` boolean input (default false) and a step that runs `npx --yes firebase-tools@15.34.2 deploy --only functions --project "$PROJECT_ID" --non-interactive` the same way the rules step does.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test` and `npm run test:rules` and `npm run test:functions`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared/ai-contracts.ts tests/unit/aiContracts.spec.ts tests/unit/firestore.rules.spec.ts firestore.rules firebase.json package.json tsconfig.json .env.example .env.emulator .gitignore .github/workflows/ci.yml .github/workflows/deploy.yml functions/package.json functions/package-lock.json functions/tsconfig.json functions/vitest.config.ts functions/.gitignore functions/src/index.ts functions/src/config.ts
git commit -m "feat(ai): add functions package, shared AI contracts and server-only rules"
```

---

### Task 2: AI gateway, status/consent/report functions, set-plan script

**Files:**
- Create: `functions/src/gateway/errors.ts`, `functions/src/gateway/usage.ts`, `functions/src/gateway/rateLimit.ts`, `functions/src/gateway/callScope.ts`, `functions/src/gateway/aiCallable.ts`
- Create: `functions/src/callables/status.ts`, `functions/src/callables/report.ts`
- Modify: `functions/src/index.ts` (export `getAiStatus`, `recordAiConsent`, `reportAiOutput`)
- Create: `functions/scripts/set-plan.mjs`
- Test: `functions/test/gateway.spec.ts`, `functions/test/status.spec.ts`

**Interfaces:**
- Consumes: `shared/ai-contracts.ts`, `functions/src/config.ts` (Task 1).
- Produces (used by Task 3 and every feature plan):

```ts
// functions/src/gateway/errors.ts
export class AiError extends Error {
  constructor(reason: AiErrorReason, message?: string);
  readonly reason: AiErrorReason;
}
export function toHttpsError(err: unknown): HttpsError;   // spec §6.2 table; non-AiError → internal

// functions/src/gateway/callScope.ts — per-call scope (AsyncLocalStorage) the gateway opens around each handler
export interface ModelUsage { provider: 'anthropic' | 'gemini' | 'fake'; model: string; inputTokens: number; outputTokens: number }
export function recordModelUsage(usage: ModelUsage): void;   // no-op outside a scope

// functions/src/gateway/aiCallable.ts
export interface AiContext {
  uid: string; plan: AiPlan; feature: AiFeature;
  /** Gives back this call's reserved action although the handler succeeded (spec §5.6: a heavy action that produces nothing). Idempotent. */
  refund(): Promise<void>;
}
export interface AiCallableOptions<Req> {
  timeoutSeconds: 30 | 120;
  /** Runs before usage is reserved; may read Firestore (e.g. the caller's own set). Throws AiError('invalid-input' | 'too-large'). */
  validate: (data: unknown, uid: string) => Req | Promise<Req>;
  /** 'model': binds ANTHROPIC_API_KEY whatever AI_PROVIDER is, so switching provider needs no rebinding. */
  secrets?: 'model' | 'none';        // default 'model'
}
export function aiCallable<Req, Res>(
  feature: AiFeature,
  options: AiCallableOptions<Req>,
  handler: (req: Req, ctx: AiContext, stream: (chunk: string) => void) => Promise<Res>,
): CallableFunction<Req, Promise<Res>, string>;

// functions/src/gateway/usage.ts
export function getPlan(uid: string): Promise<AiPlan>;                 // missing users doc → 'free'
export function reserve(uid: string, plan: AiPlan, cost: AiCost, now: Date): Promise<() => Promise<void>>; // returns refund
export function readUsage(uid: string, now: Date): Promise<AiAllowance>;

// functions/src/gateway/rateLimit.ts
export function checkRate(uid: string, now: Date): Promise<void>;     // throws AiError('rate-limited')
```

| Callable | Request | Response | Errors |
|---|---|---|---|
| `getAiStatus` | `{}` | `AiStatus` | `unauthenticated` |
| `recordAiConsent` | `{}` | `{ consented: true }` | `unauthenticated` |
| `reportAiOutput` | `ReportAiOutputRequest` | `{ ok: true }` | `unauthenticated`, `invalid-argument/invalid-input` (unknown feature, empty reason), `invalid-argument/too-large` (output > 4,000 or reason > 500 chars), `resource-exhausted/rate-limited` |

`functions/scripts/set-plan.mjs`: `node functions/scripts/set-plan.mjs <email> <free|pro>` — looks the user up by email with the Admin SDK (credentials from `GOOGLE_APPLICATION_CREDENTIALS`), writes `users/{uid}` `{ plan, planSource: 'manual', planUpdatedAt: serverTimestamp() }` with merge, prints `uid → plan`. Exits 1 with a message for an unknown email or plan.

**Spec:**
- §6.1: "Every AI callable: requires a signed-in user; requires recorded AI consent (§7.3); checks `FEATURE_ACCESS` for the user's plan; checks the rate limit; reserves usage; calls the model; refunds on failure; returns."
- §6.2: "Error codes, as `HttpsError` code + `details.reason`:" (the table's rows are the Acceptance cases below)
- §6.5: "Logging: functions log `uid`, feature, model, input/output token counts, latency and outcome. They never log card text, notes, files or answers."
- §7.5: "Reported outputs are stored in `ai-reports` (server-only) with `{ uid, feature, output (≤ 4,000 characters), reason, createdAt }`."
- §8.1: "`users/{uid}`: `{ plan: 'free' | 'pro', planSource: 'manual', planUpdatedAt, aiConsentAt? }`."

**Tags:** `security` (auth, secrets, rate limits, quotas, server-written plan), `failure-paths` (refunds, error mapping)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:** (Firestore mocked or the emulator; handlers are test stubs registered on one `light` and one `heavy` feature)
- Given no auth, when any `aiCallable` runs, then it throws `unauthenticated` and the handler is not called.
- Given a user with no `aiConsentAt`, then `failed-precondition` with `details.reason: 'consent-required'`, and no usage is reserved.
- Given a free user calling a Pro-only feature (`generateCards`), then `permission-denied` / `pro-required`, no usage reserved.
- Given a free user with 20 light actions used in `2026-11`, when they call a light feature on `2026-11-15`, then `resource-exhausted` / `quota-exceeded`; on `2026-12-01T00:00:00Z` the same call succeeds and `ai-usage/{uid}/months/2026-12` has `light: 1`.
- Given a Pro user with 50 heavy used, then a heavy call is `quota-exceeded` while a light call still succeeds.
- Given 10 calls within 60 s, then the 11th is `resource-exhausted` / `rate-limited`; a call 61 s after the first succeeds.
- Given two concurrent calls with 1 light action left, then exactly one succeeds and the other is `quota-exceeded` (transaction).
- Given `validate` throws `too-large`, then `invalid-argument` / `too-large` and no usage reserved.
- Given an async `validate` that rejects with `AiError('invalid-input')`, then `invalid-argument` / `invalid-input` and no usage is reserved.
- Given the handler throws `AiError('ai-busy')`, then `unavailable` / `ai-busy` and usage is back to its prior value; `AiError('ai-refused')` → `failed-precondition` / `ai-refused`, refunded; `AiError('ai-bad-output')` → `internal` / `ai-bad-output`, refunded; a plain `Error` → `internal`, refunded.
- Given a handler that calls `ctx.refund()` (twice) and then returns normally, then the call succeeds and usage is back to its value before the call (refunded once).
- Given a handler that calls `recordModelUsage({ provider: 'anthropic', model: 'claude-haiku-5-5', inputTokens: 900, outputTokens: 120 })` and succeeds, then exactly one log line is written with `uid`, `feature`, `provider`, `model`, `inputTokens: 900`, `outputTokens: 120`, `ms`, `outcome: 'ok'`, and no request text; with no recorded usage, `provider` and `model` are `'none'` and the token counts are `0`; two recorded usages are summed.
- Given a Pro user with 3 light and 1 heavy used in `2026-11`, when `getAiStatus` runs on `2026-11-20`, then it returns `{ plan: 'pro', consented, month: '2026-11', used: { light: 3, heavy: 1 }, limits: { light: 300, heavy: 50 }, resetsAt: '2026-12-01T00:00:00.000Z' }`.
- Given no `users/{uid}` doc, then `getAiStatus` returns `plan: 'free'`, `consented: false`.
- Given `recordAiConsent`, then `users/{uid}.aiConsentAt` is a server timestamp and `plan` is not changed or created as `pro`.
- Given `reportAiOutput` with a 4,001-character `output`, then `invalid-argument` / `too-large`; with 4,000 characters, then an `ai-reports` doc with `uid`, `feature`, `output`, `reason`, `createdAt` is written. `reportAiOutput` does not need consent and does not use allowance, but does count toward the rate limit.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/test/gateway.spec.ts` and `functions/test/status.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:functions`
Expected: FAIL on assertions (create each module with its real exported signatures first).

- [ ] **Step 3: Implement `errors.ts`, `usage.ts`, `rateLimit.ts`, `callScope.ts`, `aiCallable.ts`** to the Interfaces. Usage reserve/refund and the rate window each run in one Firestore transaction. Streaming uses the callable's `response.sendChunk` when `request.acceptsStreaming`.

- [ ] **Step 4: Implement `status.ts`, `report.ts`, export them from `index.ts`, and write `scripts/set-plan.mjs`**

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:functions`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/src/gateway/errors.ts functions/src/gateway/usage.ts functions/src/gateway/rateLimit.ts functions/src/gateway/callScope.ts functions/src/gateway/aiCallable.ts functions/src/callables/status.ts functions/src/callables/report.ts functions/src/index.ts functions/scripts/set-plan.mjs functions/test/gateway.spec.ts functions/test/status.spec.ts
git commit -m "feat(ai): add AI gateway with consent, plan, rate and allowance checks"
```

---

### Task 3: Model providers (Claude and Gemini) behind one interface

**Files:**
- Create: `functions/src/ai/types.ts`, `functions/src/ai/models.ts`, `functions/src/ai/prompt.ts`
- Create: `functions/src/ai/providers/anthropic.ts`, `functions/src/ai/providers/gemini.ts`, `functions/src/ai/providers/fake.ts`
- Create: `functions/src/ai/index.ts`
- Test: `functions/test/providers.conformance.spec.ts`, `functions/test/models.spec.ts`, `functions/test/prompt.spec.ts`

**Interfaces:**
- Consumes: `ModelFeature`, `FEATURE_COST` (Task 1); `AI_PROVIDER`, `GEMINI_LOCATION`, `ANTHROPIC_API_KEY`, `aiFake()` from `functions/src/config.ts` (Task 1); `AiError`, `recordModelUsage`, `ModelUsage` (Task 2).
- Produces (the only model API feature plans use; nothing outside `functions/src/ai/` imports `@anthropic-ai/sdk` or `@google/genai` for text generation):

```ts
// functions/src/ai/types.ts — provider-neutral shapes
export type ProviderName = 'anthropic' | 'gemini';
export type AiPart =
  | { type: 'text'; text: string }
  | { type: 'file'; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };
export interface AiTurn { role: 'user' | 'assistant'; text: string }
export interface ProviderJsonRequest<T> {
  model: string; effort: 'low' | 'medium'; timeoutMs: 20_000 | 90_000;
  system: string; parts: AiPart[]; schema: z.ZodType<T>; maxTokens: number;
}
export interface ProviderStreamRequest {
  model: string; effort: 'low' | 'medium'; timeoutMs: 20_000 | 90_000;
  system: string; turns: AiTurn[]; maxTokens: number; onText: (text: string) => void;
}
export interface ProviderResult<T> { value: T; usage: ModelUsage }
/** Every adapter maps its SDK's errors and stop/block reasons to AiError reasons (spec §6.2). */
export interface AiProvider {
  readonly name: ProviderName | 'fake';
  generateJson<T>(req: ProviderJsonRequest<T>): Promise<ProviderResult<T>>;
  streamText(req: ProviderStreamRequest): Promise<ProviderResult<string>>;
}

// functions/src/ai/models.ts
export interface ModelRoute { provider: ProviderName; model: string; effort: 'low' | 'medium' }
/** Spec §4.2: per provider, the model and effort for each text-model feature. */
export const MODEL_TABLE: Record<ProviderName, Record<ModelFeature, Omit<ModelRoute, 'provider'>>>;
/** Optional per-feature pin to another provider/model, e.g. generateCards → claude-sonnet-5-5. Empty by default. */
export const ROUTE_OVERRIDES: Partial<Record<ModelFeature, ModelRoute>>;
export function routeFor(feature: ModelFeature, provider?: ProviderName): ModelRoute;  // provider defaults to AI_PROVIDER

// functions/src/ai/prompt.ts
export function wrapUserContent(text: string): string;   // '<user_content>…</user_content>', escapes '</user_content>'

// functions/src/ai/index.ts — what feature handlers call
export interface AiJsonRequest<T> {
  feature: ModelFeature;
  system: string;            // fixed text; ≥ 512 tokens so Anthropic can cache it
  parts: AiPart[];           // user turn; text parts go through wrapUserContent
  schema: z.ZodType<T>;
  maxTokens: number;
  fixture: () => T;          // returned when aiFake()
}
export function aiJson<T>(req: AiJsonRequest<T>): Promise<T>;
export interface AiStreamRequest {
  feature: ModelFeature;
  system: string;
  turns: AiTurn[];
  maxTokens: number;
  onText: (text: string) => void;
  fixture: () => string;
}
export function aiStream(req: AiStreamRequest): Promise<string>;
export function getProvider(name: ProviderName): AiProvider;   // fake provider when aiFake()
```

How each adapter meets the interface:

| Concern | `anthropic` (`@anthropic-ai/sdk`) | `gemini` (`@google/genai`, `vertexai: true`) |
|---|---|---|
| Auth | `ANTHROPIC_API_KEY` secret | functions' service account, project from the runtime, location `GEMINI_LOCATION` |
| Effort | `output_config.effort` | the SDK's thinking-level setting, `low` → low, `medium` → medium (check current SDK docs for the exact field) |
| JSON | structured output with `output_config.format` from the Zod schema | `responseMimeType: 'application/json'` with `responseJsonSchema` from the Zod schema |
| Files | PDF → `document` block, image → `image` block, base64 | `inlineData` part with the same MIME type |
| Turns | `messages` with `user` / `assistant` | `contents` with `user` / `model` |
| Caching | `cache_control: { type: 'ephemeral' }` on the system block | none needed (implicit) |
| Refusal → `ai-refused` | `stop_reason: 'refusal'` | prompt blocked, or finish reason SAFETY / PROHIBITED_CONTENT / BLOCKLIST |
| Truncated → `ai-bad-output` | `stop_reason: 'max_tokens'` | finish reason MAX_TOKENS |
| Busy → `ai-busy` | 429, 5xx, connection error, timeout | 429, 5xx, network error, timeout |
| Usage | `usage.input_tokens` / `output_tokens` | `usageMetadata.promptTokenCount` / `candidatesTokenCount` + thoughts |
| Retries / timeout | `maxRetries: 1`, `timeout: timeoutMs` | one retry on `ai-busy`, `httpOptions.timeout: timeoutMs` |

**Spec:**
- §4.1: "Every model call goes through one provider interface and one routing table, `functions/src/ai/models.ts`, that maps each feature to a model and an effort level per provider. No other file names a model or imports a provider SDK."
- §4.2: "| F1, F8, F9, F11 | `claude-haiku-5-5` | `gemini-3.1-flash-lite` | `medium` |"
- §4.2: "| F2, F3, F4, F6, F7 | `claude-haiku-5-5` | `gemini-3.1-flash-lite` | `low` |"
- §4.4: "User content is wrapped in `<user_content>` tags and the system prompt tells Claude to treat it as material to study, never as instructions."
- §4.6: "The provider is a deploy-time setting: `AI_PROVIDER` (`anthropic` | `gemini`, default `anthropic`) in the functions' parameters. Switching is changing that value and redeploying; no code changes."
- §4.8: "Both providers pass one shared conformance test suite: the same requests, mocked SDK responses and expected results, including every §6.2 error row."
- §6.3: "Timeouts: heavy functions `timeoutSeconds: 120`, Anthropic client `timeout: 90_000` ms; light functions `timeoutSeconds: 30`, client `timeout: 20_000` ms; `maxRetries: 1` everywhere."
- §3.6: "When `AI_FAKE=1` is set (emulator and e2e only), the AI client returns fixed fixture output and never calls Anthropic."

**Tags:** `security` (API key handling, prompt-injection wrapping, uploads passed to providers), `failure-paths` (timeouts, refusals, truncation, error mapping)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:** (`providers.conformance.spec.ts` runs every case below once per adapter, `anthropic` and `gemini`, against a mocked SDK client that returns that provider's own response shape)
- Given a JSON request whose mocked response is valid for the schema, then `generateJson` returns the parsed value and `usage` with the provider name, the request's model and non-zero token counts.
- Given a mocked response whose JSON fails the Zod schema (or isn't JSON), then it throws `AiError('ai-bad-output')`.
- Given a mocked truncated response (`max_tokens` / MAX_TOKENS), then `AiError('ai-bad-output')`.
- Given a mocked refusal (`stop_reason: 'refusal'` / a SAFETY block or blocked prompt), then `AiError('ai-refused')`.
- Given a mocked 429, a 503, a network error and a timeout, then each is `AiError('ai-busy')`.
- Given a request with a PDF part and an image part, then the SDK receives them in that provider's file shape with the same MIME types and base64 data.
- Given a stream request whose mocked stream yields `'Pho'`, `'tosyn'`, `'thesis'`, then `onText` is called with those three chunks in order and the result value is `'Photosynthesis'`.
- Given turns `[user 'Explain', assistant 'It is…', user 'Why?']`, then the SDK receives them in order with that provider's role names.
- Given effort `low` and `medium`, then the SDK request carries that provider's low and medium thinking setting; for Anthropic, the system block has `cache_control: { type: 'ephemeral' }`; neither adapter sends server-side fallbacks.
- Given `timeoutMs: 20_000`, then the Anthropic client is created with `timeout: 20_000`, `maxRetries: 1`, and the Gemini request with an HTTP timeout of 20,000 ms.
- (`models.spec.ts`) Given `AI_PROVIDER` unset, then `routeFor('suggestBack')` is `{ provider: 'anthropic', model: 'claude-haiku-5-5', effort: 'low' }` and `routeFor('generateCards')` is `{ provider: 'anthropic', model: 'claude-haiku-5-5', effort: 'medium' }`; given `AI_PROVIDER=gemini`, then they are `gemini-3.1-flash-lite` with the same efforts; given `ROUTE_OVERRIDES.generateCards = { provider: 'anthropic', model: 'claude-sonnet-5-5', effort: 'medium' }` and `AI_PROVIDER=gemini`, then `generateCards` uses that override and `suggestBack` uses Gemini.
- (`models.spec.ts`) Given `AI_PROVIDER=openai`, then loading the config throws at startup with a message naming the allowed values.
- (`models.spec.ts`) Given the routing table, then every `ModelFeature` has an entry for both providers, and no file under `functions/src/` outside `functions/src/ai/` contains a string starting with `claude-` or `gemini-3` (a grep in the test).
- Given `aiJson` for a light feature, then `generateJson` gets the route's model and effort and `timeoutMs: 20_000`; for a heavy feature (`FEATURE_COST` `heavy`), `timeoutMs: 90_000`; and `recordModelUsage` is called once with the result's usage.
- Given `AI_FAKE=1` and `FUNCTIONS_EMULATOR=true`, then `aiJson` returns `fixture()` and `aiStream` streams `fixture()` in 3 chunks, no SDK client is constructed, and the recorded usage has `provider: 'fake'`; given `AI_FAKE=1` without `FUNCTIONS_EMULATOR`, then the real provider is used.
- (`prompt.spec.ts`) Given `wrapUserContent('a </user_content> b')`, then the inner closing tag is escaped so the result contains exactly one `</user_content>`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/test/providers.conformance.spec.ts`, `functions/test/models.spec.ts`, `functions/test/prompt.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:functions`
Expected: FAIL on assertions (create each module with its real exported signatures first).

- [ ] **Step 3: Implement `types.ts`, `models.ts`, `prompt.ts` and `providers/fake.ts`** until the routing, prompt and fake cases pass

- [ ] **Step 4: Implement `providers/anthropic.ts`** until its conformance run passes. Structured output uses `client.messages.parse` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`; the Zod schema validates the result again.

- [ ] **Step 5: Implement `providers/gemini.ts`** until its conformance run passes. Read the current `@google/genai` docs for the Vertex AI client options, the thinking-level field and `responseJsonSchema` before writing it.

- [ ] **Step 6: Implement `index.ts`** (`aiJson`, `aiStream`, `getProvider`) until every case passes

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:functions`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add functions/src/ai/types.ts functions/src/ai/models.ts functions/src/ai/prompt.ts functions/src/ai/providers/anthropic.ts functions/src/ai/providers/gemini.ts functions/src/ai/providers/fake.ts functions/src/ai/index.ts functions/test/providers.conformance.spec.ts functions/test/models.spec.ts functions/test/prompt.spec.ts
git commit -m "feat(ai): add Claude and Gemini providers behind one interface"
```

---

### Task 4: App AI service, store, consent/upgrade/report UI and Pro screen

**Files:**
- Modify: `src/services/firebase.ts` (export `getFunctionsInstance()`; connect the functions emulator at `127.0.0.1:5001` when `VUE_APP_USE_EMULATORS=true`)
- Create: `src/services/ai.ts`
- Create: `src/stores/ai.ts`
- Create: `src/components/AiConsentDialog.vue`, `src/components/AiUpgradeDialog.vue`, `src/components/AiReportButton.vue`, `src/components/AiProChip.vue`, `src/components/AiUsageMeter.vue`
- Create: `src/views/Pro.vue`
- Modify: `src/router/index.ts` (route `/pro`, `requireAuth`)
- Modify: `src/App.vue` (mount `AiConsentDialog` and `AiUpgradeDialog` once)
- Modify: `src/views/Settings.vue` (a "Pro & AI" row linking to `/pro`)
- Modify: `src/views/Info.vue` (privacy line, spec §10.1)
- Modify: `src/env.d.ts` (`VUE_APP_FUNCTIONS_REGION`)
- Modify: `src/locales/en.json`, `src/locales/hi.json`
- Create: `tests/e2e/ai.ts` (shared e2e helpers for every AI plan)
- Test: `tests/unit/aiStore.spec.ts`, `tests/unit/aiService.spec.ts`, `tests/e2e/pro.spec.ts`

**Interfaces:**
- Consumes: `shared/ai-contracts.ts` (Task 1); callables `getAiStatus`, `recordAiConsent`, `reportAiOutput` (Task 2); existing `useSessionStore().showSnack(text, action?)`, `session.online`.
- Produces (used by every feature plan's web tasks):

```ts
// src/services/ai.ts
export type AiCallReason = AiErrorReason | 'offline' | 'unknown';
export class AiCallError extends Error { readonly reason: AiCallReason }
export function callAi<Req, Res>(name: string, data: Req): Promise<Res>;          // maps FunctionsError details.reason → AiCallError
export function streamAi<Req, Res>(name: string, data: Req, onChunk: (text: string) => void): Promise<Res>;

// src/stores/ai.ts  (Pinia, id 'ai')
export interface AiStore {
  status: Ref<AiStatus | null>;
  loading: Ref<boolean>;
  load(force?: boolean): Promise<void>;           // getAiStatus; cleared on sign-out
  isPro: ComputedRef<boolean>;
  canUse(feature: AiFeature): boolean;            // FEATURE_ACCESS for current plan
  remaining(cost: AiCost): number;
  /** consent → plan → offline → run fn → refresh usage; shows snack and returns null on any AiCallError */
  run<T>(feature: AiFeature, fn: () => Promise<T>): Promise<T | null>;
  upgradeOpen: Ref<boolean>;
  consentOpen: Ref<boolean>;
}
export const useAiStore: () => AiStore;
```

```ts
// tests/e2e/ai.ts — Auth + Firestore emulator REST with `Authorization: Bearer owner` (bypasses rules)
export function grantPro(email: string): Promise<string>;        // users/{uid} { plan: 'pro', planSource: 'manual' }; returns uid
export function grantConsent(email: string): Promise<string>;    // users/{uid}.aiConsentAt = now; returns uid
export function acceptAiConsent(page: Page): Promise<void>;      // clicks Continue on the consent dialog if it is shown
```

Components:

| Component | Props | Emits / behaviour |
|---|---|---|
| `AiProChip` | `feature: AiFeature` | renders `PRO` chip only when `!canUse(feature)` |
| `AiReportButton` | `feature: AiFeature; output: string` | flag icon button; asks for a reason (radio: Offensive, Wrong, Other) and calls `reportAiOutput`; snack "Thanks — we'll review it." |
| `AiUsageMeter` | none | "Light actions: X of Y" and "Heavy actions: X of Y", plus "Resets on <date>" |
| `AiConsentDialog` | none (store-driven) | Cancel → `run` resolves `null`; Continue → `recordAiConsent` then the action runs |
| `AiUpgradeDialog` | none (store-driven) | Free vs Pro table, usage meter, invite-only text, "See details" → `/pro` |

**Spec:**
- §7.1: "Every AI entry point in the app shows a small sparkle icon (`mdi-creation`) and, for free users on a Pro feature, a `PRO` chip. Tapping a Pro feature as a free user opens the upgrade dialog instead of calling the function."
- §7.2: "Pro is invite-only for now. We'll let you know when you can upgrade."
- §7.2: "No purchase button."
- §7.3: "To do this, the text or file you choose is sent to Anthropic (Claude) and, for search and voice, to Google Cloud. It isn't used to train their models. Continue?"
- §7.3: "Consent is per account."
- §7.4: "Error copy shown in a snackbar" (the table's rows are the Acceptance cases below)
- §7.5: "Every AI result shown to the user has a Report button (flag icon) that sends the result to `reportAiOutput`, as Google Play's AI-generated content policy requires."
- §7.5: "Thanks — we'll review it."
- §10.1: "The Info page and the Play listing's privacy policy must say that AI features send chosen content to Anthropic and Google Cloud. The plan adds the in-app text"

**Tags:** `screen`, `failure-paths`, `security` (consent gate, clears AI status on sign-out)

**Knowledge:** none — this repository has no knowledge base.

**Acceptance:**
- Given a callable rejects with `FunctionsError` whose `details.reason` is `quota-exceeded`, then `callAi` rejects with `AiCallError` reason `quota-exceeded`; with no `details.reason`, reason `unknown`.
- Given `session.online` is false, when `run` is called, then no callable is invoked and the snack says "You're offline. AI needs a connection."
- Given a free user, when `run('generateCards', fn)` is called, then `fn` is not called, `upgradeOpen` becomes true, and `run` resolves `null`.
- Given `status.consented` is false, when `run('suggestBack', fn)` is called and the user presses Continue, then `recordAiConsent` is called once, then `fn` runs; when they press Cancel, `fn` never runs and `run` resolves `null`.
- Given `fn` rejects with each reason, then the snack shows exactly: `quota-exceeded` → "You've used this month's AI actions. They reset on the 1st."; `rate-limited` → "Too many requests. Try again in a minute."; `too-large` → "That's too long for AI. Try something shorter."; `ai-busy` → "AI is busy right now. Please try again."; `ai-refused` → "AI couldn't help with this content."; `ai-bad-output` → "AI gave an unexpected answer. Please try again."; `pro-required` → opens the upgrade dialog instead of a snack; `consent-required` → opens the consent dialog.
- Given `fn` resolves, then `getAiStatus` is called again so the usage meter updates.
- Given `getAiStatus` fails when `/pro` loads, then the screen says "Couldn't load your plan." with a Try again button that calls `load(true)`.
- Given sign-out, then `status` is reset to `null`.
- Given every new string, then `tests/unit/locales.spec.ts` passes (Hindi added for each key).
- E2E (`tests/e2e/pro.spec.ts`): after `grantPro(email)` and a reload, `/pro` shows "Pro" and "Light actions: 0 of 300".
- E2E (`tests/e2e/pro.spec.ts`, emulators, `AI_FAKE=1`): a new user opens Settings → "Pro & AI", sees "Free", "Light actions: 0 of 20", "Heavy actions: 0 of 0", the invite-only sentence, and no purchase button; the page passes the axe scan used in `tests/e2e/a11y.spec.ts`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/aiService.spec.ts`, `tests/unit/aiStore.spec.ts`, `tests/e2e/pro.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on assertions (create the modules with their real signatures first).

- [ ] **Step 3: Implement `firebase.ts` changes, `ai.ts` service and the `ai` store** until the unit tests pass

- [ ] **Step 4: Build the five components, `Pro.vue`, the route, the Settings row, the Info text, and both locale files**

- [ ] **Step 5: Run the unit and e2e tests to verify they pass**

Run: `npm test` and `npm run test:e2e`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/firebase.ts src/services/ai.ts src/stores/ai.ts src/components/AiConsentDialog.vue src/components/AiUpgradeDialog.vue src/components/AiReportButton.vue src/components/AiProChip.vue src/components/AiUsageMeter.vue src/views/Pro.vue src/router/index.ts src/App.vue src/views/Settings.vue src/views/Info.vue src/env.d.ts src/locales/en.json src/locales/hi.json tests/unit/aiStore.spec.ts tests/unit/aiService.spec.ts tests/e2e/ai.ts tests/e2e/pro.spec.ts
git commit -m "feat(ai): add AI store, consent and upgrade dialogs, and Pro screen"
```

---

## After this plan (owner, not the executor)

1. Upgrade the Firebase project to Blaze.
2. `npx --yes firebase-tools@15.34.2 functions:secrets:set ANTHROPIC_API_KEY --project spanion-flash-cards`
3. For Gemini (only when switching): enable the Vertex AI API and grant the functions' service account `roles/aiplatform.user`; then set `AI_PROVIDER=gemini` in `functions/.env.spanion-flash-cards` and redeploy functions.
4. Run the Deploy workflow by hand with `deploy_rules` and `deploy_functions` ticked.
5. Grant yourself Pro: `node functions/scripts/set-plan.mjs <your email> pro`.
