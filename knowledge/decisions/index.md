# Decisions

<!-- GA-GENERATED:index -->

- [Unlink billing when the monthly budget is spent](budget-kill-switch.md) - Because the Blaze plan has no spending cap, a Cloud Function unlinks the billing account once actual spend reaches the budget, dropping the project to the free Spark limits.
- [This repository's code is continued, not rewritten](codebase-is-continued.md) - The flash-cards code at the repository root is the project's own live codebase, adopted into ga on 2026-11-03; work builds on it in place rather than replacing or migrating it.
- [Google sign-in uses a popup, not a redirect](google-sign-in-popup.md) - signInWithPopup is used because browsers that partition third-party storage break signInWithRedirect when the app isn't served from the auth domain.
- [Stay compatible with the original app](original-app-compatibility.md) - The rewrite keeps the original app's Firestore schema, localStorage keys, VUE_APP_ env names and service-worker file name, so existing data, settings, .env files and installed copies keep working.

<!-- GA-GENERATED:END -->
