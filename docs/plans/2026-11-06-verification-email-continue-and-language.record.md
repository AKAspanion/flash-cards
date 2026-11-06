# SDD ledger — plan: docs/plans/2026-11-06-verification-email-continue-and-language.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: ff0039e4ea96a51f5d6906efb1d0357b1b5957e1
Provisional: plan approved on settled facts — both changes are the two the developer said yes to on 2026-11-06; the design follows sendPasswordReset's continue URL pattern — the developer confirms the plan
Note: no spec — one task the developer asked for directly
Pre-flight: Task 1: one task, no shared interfaces; files and tests agree
Task 1: started 2026-11-06 10:30
Task 1: agent implementer a5bed79d54ef3e605
Task 1: complete (commits ff0039e..59bbdee, review at end of plan)
Final review: started 2026-11-06 10:35
Note: End checks on 59bbdee: typecheck pass, lint pass (pre-existing GroupCardFlash warning), unit 559 passed, smoke see next line
Note: Final review: 2 Important (Google page language not set; continue-URL rejection shows password-reset copy), 3 Minor; security: approve, 2 Minor
Final review: Ruling: Google's sign-in page language is out of scope: drop the claim from comments and knowledge, no hl parameter — the developer asked only for emails in the app's language; the plan over-claimed — Google's page stays in the browser's language
Final review: Ruling: A continue-URL rejection (auth/unauthorized-continue-uri, auth/invalid-continue-uri) retries the verification send once without a continue URL — the email then still goes out, never worse than before this change, and no wrong error copy can show — an email from an unauthorised host has no Continue button
Final review: Ruling: Promoted to the fix: prefs catch logs code ?? name and the two specs mock setAuthLanguage; prefs.spec asserts the message isn't logged; one continue-URL helper shared with sendPasswordReset — small, same files, removes test noise — minutes
Final review: minor (deferred): per-language email templates claim unchecked; check a real Hindi email in production before recording it
Final review: minor (deferred): StatsView.spec.ts is order-dependent (pre-existing): its Hindi test's prefs.lang='hi' leaks through the shared i18n instance, so a shuffled run can fail the singular-form test
Note: e2e on 13d2027: verify-email, password-reset and auth specs 24/24 pass; unit 566 passed, typecheck and lint pass (fixer)
Final review: minor (deferred): auth/quota-exceeded maps to the password-reset message, so a quota failure on Resend verification shows reset copy (pre-existing in authErrors.ts)
Final review: complete (7 findings, 5 fixed, 0 parked)
Note: Open finding: [findings/quota-error-on-resend-shows-reset-copy](../../knowledge/findings/quota-error-on-resend-shows-reset-copy.md) — a quota failure on Resend email shows the password-reset message
Note: Open question: [questions/email-action-url-refused](../../knowledge/questions/email-action-url-refused.md) — Firebase refuses this project's email template updates
Run: finished 2026-11-06 10:48
