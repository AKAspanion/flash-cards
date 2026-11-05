# Features

<!-- GA-GENERATED:index -->

- [Delete account](account-deletion.md) - Delete account on the profile screen re-confirms the user's identity, then removes every document they own and their Firebase Auth user.
- [Bin](bin.md) - Sets moved to the bin are only flagged trashed; from the bin the user restores them or deletes them permanently after confirming.
- [Daily reminder and app badge](daily-reminder.md) - Settings downloads a daily reminder .ics at a time kept on the device, and the installed app's icon badge shows the number of due cards, cleared on sign-out.
- [Create and edit a set](edit-set.md) - The set editor — title, colour, labels and cards — which saves when the user leaves it, and never saves an empty new set.
- [Email verification reminder](email-verification.md) - Email sign-up sends a verification email, and a banner on signed-in screens reminds unverified users with Resend email and I've verified actions; it gates nothing.
- [Library (home)](library.md) - The home screen listing the user's sets, with search, label and favourite filters, the saved sort order, swipe gestures, and move to bin with undo.
- [Offline study](offline-study.md) - Firestore keeps a persistent IndexedDB cache, so sets open and saves work offline and sync later; a few actions stay online-only, and sign-out clears the cache within a bounded time.
- [Privacy policy and delete-account pages](privacy-and-deletion-pages.md) - Two public pages, /privacy and /delete-account, that Google Play's listing points at; anyone can open them without signing in.
- [Profile and labels](profile-and-labels.md) - The profile screen — display name and photo URL, account dates, sign out — which is also where labels are created and renamed.
- [Progress and habits](progress-habits.md) - Reviews are counted per day in the user's user-stats document; Home shows the streak and today's count, /stats shows the history, and Settings sets a daily goal of 10, 20, 50 or 100.
- [Rich cards and read aloud](rich-cards.md) - Card text is Markdown, shown only through renderCardText; the editor can insert an image; the review screen and /due read a card aloud (R), with a language per side stored on the set.
- [Settings and about](settings-and-about.md) - Device-local settings (language, dark mode, set order, favourites on top) and the about screen with the app version and share links.
- [Sharing a set](sharing.md) - The owner shares a set through a public link; anyone opens it at /s/:shareId and may add a copy to their own library; the public copy follows the owner's saves until they stop sharing.
- [Sign in and sign up](sign-in.md) - Email/password sign-in and sign-up, or Google sign-in by redirect, then a return to the page the user first asked for.
- [Spaced repetition](spaced-repetition.md) - Every card is scheduled with SM-2 in whole local days; the review screen and /due rate cards Again, Hard, Good or Easy, and Home shows what is due.
- [Study a set](study-set.md) - Review a set card by card with study options and keyboard shortcuts, flip to see the answer, mark cards learned, reset progress and see a session summary; progress is saved when the user leaves.

<!-- GA-GENERATED:END -->
