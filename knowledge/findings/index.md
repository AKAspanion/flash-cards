# Findings

<!-- GA-GENERATED:index -->

- [Account-store auth errors are logged whole and can carry the user's address](auth-errors-logged-whole-can-carry-the-address.md) - showAuthError in the account store logs the whole Firebase error, whose customData can hold the user's email address, while the newer sign-up and token-refresh paths log only the error code.
- [Home's open Menu panel overlaps the top bar on a landscape phone](home-menu-panel-overlaps-top-bar-in-landscape.md) - On a phone held sideways (about 390 px tall), Home's open Menu panel reaches over the top bar and its Search button, more so for unverified users, whose top bar the verify banner pushes down.
- [No App Check in front of sign-up and verification emails](no-app-check-before-verification-sends.md) - Anyone with the public web API key can script sign-ups and verification sends to addresses they don't own; only Firebase's own throttling bounds it, and a drained email quota would make legitimate sends fail.
- [Resend email right after sign-up can hit Firebase's throttle](resend-right-after-sign-up-can-be-throttled.md) - The 60 s resend cooldown starts only after a banner Resend, not after the sign-up's own email, so pressing Resend within seconds of signing up can show "Too many attempts".
- [Sign-up waits for the verification email before navigating](sign-up-waits-for-the-verification-email.md) - signUpWithEmail awaits the email send after the account exists, so on a slow link the Sign up button keeps spinning although the user is already signed in.
- [Fixed: The Android splash image wasn't handed to Chrome](twa-splash-image-not-transferred.md) - On Chrome 152+ the app's splash image transfer failed, so a cold start showed about 0.6 s of black before the site; the app now grants itself read access to its splash URI.
- [Unmapped Firebase auth errors show the raw SDK message](unmapped-auth-errors-show-the-raw-firebase-message.md) - authErrorMessage falls back to the error's own English message for codes it doesn't map, so some failures reach the snack untranslated; it predates the email-verification work, which adds two more paths into it.
- [The verify banner shifts the page that is sliding out](verify-banner-shifts-the-leaving-page.md) - Moving between Home and a full-height screen, the banner appears or disappears at once while the out-in slide still shows the old page, so that page jumps by the banner's height for 0.2 s.

<!-- GA-GENERATED:END -->
