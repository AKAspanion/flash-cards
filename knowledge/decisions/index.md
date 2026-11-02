# Decisions

<!-- GA-GENERATED:index -->

- [The bin keeps sets until the user deletes them](bin-keeps-sets-indefinitely.md) - Sets moved to the bin stay there indefinitely; nothing purges them automatically.
- [Unlink billing when the monthly budget is spent](budget-kill-switch.md) - Because the Blaze plan has no spending cap, a Cloud Function unlinks the billing account once actual spend reaches the budget, dropping the project to the free Spark limits.
- [This repository's code is continued, not rewritten](codebase-is-continued.md) - The flash-cards code at the repository root is the project's own live codebase, adopted into ga on 2026-11-03; work builds on it in place rather than replacing or migrating it.
- [Google sign-in uses a popup, not a redirect](google-sign-in-popup.md) - signInWithPopup is used because browsers that partition third-party storage break signInWithRedirect when the app isn't served from the auth domain.
- [Labels cannot be deleted](labels-cannot-be-deleted.md) - Users create and rename labels but never delete them, so a set never points at a label that no longer exists.
- [Rules and functions are deployed by hand](manual-rules-and-functions-deploy.md) - A push to master deploys hosting only; firestore.rules and the Cloud Functions are deployed deliberately by hand.
- [No analytics for now](no-analytics-yet.md) - The app collects no analytics; VUE_APP_MEASUREMENT_ID is passed to the Firebase config, but Analytics is never started.
- [Compatibility with the original app is no longer required](original-app-compatibility.md) - The code still keeps the original app's Firestore schema, localStorage keys, VUE_APP_ env names and service-worker file name, but the original app is no longer in use, so those shapes may change.
- [Every pull request is reviewed, Hindi included](pr-review.md) - The developer reviews every pull request before it merges, including every new or changed Hindi string.

<!-- GA-GENERATED:END -->
