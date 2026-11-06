# SDD ledger — plan: docs/plans/2026-11-05-email-verification.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: 3ff327af1f95cc5e5f93639172d7851d7a28c20e
Note: no spec — the policy suggests a spec only for large work; the plan rests on splitify's banner as its reference
Pre-flight: Task 1 -> Task 2: Task 2 consumes signUpWithEmail's {verificationSent}, resendVerification(), checkVerified(), SessionUser.emailVerified and the seven i18n keys, all produced by Task 1 with matching names; no shared files
Pre-flight: Task 1: files and tests agree; locales.spec covers both locale files
Pre-flight: Task 2: files and tests agree; its e2e builds and runs alone against the emulators
Task 1: started 2026-11-05 18:04
Task 1: agent implementer a08b22080bc73914a
Task 1: complete (commits 3ff327a..b1dff03, review at end of plan)
Progress: 1/2 tasks — Task 1 Verification calls, session field and account-store actions — 1/2 tasks — Task 1 Verification calls — sign-up sends the verification email; resend and check actions in the account store
Task 2: started 2026-11-05 18:14
Task 2: agent implementer ae9f83fccaf9187f2
Task 2: agent implementer ae9f83fccaf9187f2
Task 2: complete (commits b1dff03..eab2c14, review at end of plan)
Progress: 2/2 tasks — Task 2 Verify-email banner and sign-up message — 2/2 tasks — Task 2 Verify-email banner — banner on signed-in screens with resend cooldown and check; sign-up snack says to check the inbox
Note: Outside the plan, at the developer's request: 326fd15 fixes the flaky offline label e2e (reload raced Firestore's IndexedDB save); 30/30 after, 8/30 failing before
Note: Task 2's e2e (verify-email.spec.ts) and a11y.spec.ts run by the controller on eab2c14: 10/10 pass, desktop and mobile
Final review: started 2026-11-05 18:25
Final review: agent final-reviewer a3adb7b760c9cef33
Final review: agent security-reviewer a3a74c7b30153f23d
Note: End checks on 326fd15: typecheck pass, lint pass (1 pre-existing warning in GroupCardFlash.vue, untouched), smoke pass
Note: Final security review: approve; 3 Minor (uid-switch race in checkVerified/resend snack; no App Check in front of verification sends; unmapped auth codes show raw Firebase message)
Note: Final review: 2 Important (banner breaks full-height layouts; resend countdown inside role=status), 5 Minor; security: 3 Minor
Final review: Ruling: Banner hidden on full-height screens (study, editor and any view built on the viewport-sized layouts), not every signed-in screen as the plan said — those layouts are sized to 100vh from y=0, so the banner pushes rating buttons and the options panel under the bars; matches the existing no-ads-while-studying rule — if the developer wants it everywhere, the layouts must subtract the banner height instead
Final review: Ruling: Banner carries no live region (role=status dropped), departing from the plan's acceptance line — its text never changes and the countdown button inside a live region is re-announced every second; result messages already reach screen readers through the snack — a screen-reader user isn't told the banner appeared until they reach it
Final review: Ruling: Promoted to the fix wave: security Minor 1 (checkVerified/resend act on a user switched mid-call) and final Minor 1 (reload ok but token refresh fails shows an error) — both give a wrong result, and the fixes are small in files the wave already changes — a few minutes of fixer time
Final review: minor (deferred): sign-up's own email isn't covered by the resend cooldown; Resend right after sign-up can hit too-many-requests
Final review: minor (deferred): sign-up waits for the email send before navigating
Final review: minor (deferred): banner wraps to two lines at 1280 where one would fit
Final review: minor (deferred): no tests for cooldown surviving navigation or interval cleared on unmount
Final review: minor (deferred): no App Check in front of verification sends; Firebase throttling caps abuse (follow-up: App Check, email quota alert)
Final review: minor (deferred): authErrorMessage falls back to raw Firebase message for unmapped codes (pre-existing)
Final fixes: agent final-fixer a933d5d6a217b8156
Note: e2e on 22eb9ef: verify-email.spec.ts and a11y.spec.ts 10/10 pass, desktop and mobile
Final review: agent final-r1-reviewer aef4e4dc9438e4437
Final review: minor (deferred): banner follows the new route at once while the out-in slide keeps the old page for 0.2s, so the leaving page jumps by the banner's height (cosmetic, unverified users only)
Final review: minor (deferred): landscape phone: Home's open Menu panel overlaps the banner-shifted top bar (pre-existing panel height; outside tap closes it)
Final review: minor (deferred): showAuthError logs the whole error object, which can carry the address in customData (pre-existing)
Final review: complete (11 findings, 4 fixed, 0 parked)
Note: Open finding: [findings/resend-right-after-sign-up-can-be-throttled](../../knowledge/findings/resend-right-after-sign-up-can-be-throttled.md) — The 60 s resend cooldown starts only after a banner Resend, not after the sign-up's own email, so pressing Res
Note: Open finding: [findings/sign-up-waits-for-the-verification-email](../../knowledge/findings/sign-up-waits-for-the-verification-email.md) — signUpWithEmail awaits the email send after the account exists, so on a slow link the Sign up button keeps spi
Note: Open finding: [findings/no-app-check-before-verification-sends](../../knowledge/findings/no-app-check-before-verification-sends.md) — Anyone with the public web API key can script sign-ups and verification sends to addresses they don't own; onl
Note: Open finding: [findings/unmapped-auth-errors-show-the-raw-firebase-message](../../knowledge/findings/unmapped-auth-errors-show-the-raw-firebase-message.md) — authErrorMessage falls back to the error's own English message for codes it doesn't map, so some failures reac
Note: Open finding: [findings/verify-banner-shifts-the-leaving-page](../../knowledge/findings/verify-banner-shifts-the-leaving-page.md) — Moving between Home and a full-height screen, the banner appears or disappears at once while the out-in slide 
Note: Open finding: [findings/home-menu-panel-overlaps-top-bar-in-landscape](../../knowledge/findings/home-menu-panel-overlaps-top-bar-in-landscape.md) — On a phone held sideways (about 390 px tall), Home's open Menu panel reaches over the top bar and its Search b
Note: Open finding: [findings/auth-errors-logged-whole-can-carry-the-address](../../knowledge/findings/auth-errors-logged-whole-can-carry-the-address.md) — showAuthError in the account store logs the whole Firebase error, whose customData can hold the user's email a
Run: finished 2026-11-05 18:46
