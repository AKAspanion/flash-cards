# Requirements

<!-- GA-GENERATED:index -->

- [Users can export their data](account-data-export.md) - Users must be able to download all their sets, cards and labels in a file; account deletion, the other half of the earlier requirement, is built.
- [Account deletion and data export](account-deletion-and-export.md) - Users must be able to download all their data and to delete their account along with everything stored for it.
- [Account deletion covers every collection a user owns](account-deletion-covers-every-collection.md) - Deleting an account must remove the user's documents from every Firestore collection they own, including collections added later; the list lives in one constant that a unit test checks.
- [Publish on Android as a Trusted Web Activity](android-twa.md) - The PWA will be published on Google Play as a Trusted Web Activity, so it must keep meeting the PWA requirements a TWA depends on.
- [Verify email addresses by link](email-verification.md) - New email-and-password accounts must verify their address through a link sent by email.
- [Password reset](password-reset.md) - Users who signed up with email and password must be able to reset a forgotten password from the login screen.
- [Who the app is for](personas.md) - Anyone in India who would like to learn with flashcards — which is why the app is in English and Hindi and must work well on phones.
- [Limit the size of a set](set-size-limit.md) - A set must be capped at a size that always saves and stays fast, instead of failing at Firestore's document size limit.

<!-- GA-GENERATED:END -->
