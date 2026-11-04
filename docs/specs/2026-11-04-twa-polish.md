# TWA Polish Spec

**Date:** 2026-11-04
**Status:** Draft, for the developer's review
**Scope:** Five follow-ups found by installing the Android app:
- the deletion screens match the app's list-and-icon style
- cancelling the Google re-confirmation no longer leaves the dialog stuck
- the app is renamed "FlashCards"
- the launch no longer jitters
- the login screen loses its Delete account link

Builds on [the Android TWA spec](2026-11-04-android-twa.md).

## 1. Rules

- 1.1 Every new user-facing string is in both `src/locales/en.json` and `src/locales/hi.json`. The English is this
  spec's copy, word for word; the Hindi is listed in the PR for a Hindi reader to check.
- 1.2 Screens follow the info screen's pattern (`src/views/Info.vue`): a `BarTop`, then a `surface-light` card of
  rows, each with an icon, a `text-title-small` title and a `text-body-small` description.
- 1.3 No change to what deletion does ([account-deletion](../../knowledge/features/account-deletion.md),
  [account-deletion-confirms-identity](../../knowledge/decisions/account-deletion-confirms-identity.md)), only how it looks and
  how it recovers from a cancelled redirect.

## 2. Deletion screens in the list-and-icons style

- 2.1 `/profile`: the red "Delete account" text button is replaced by a row at the end of the profile card's list,
  after "Your Labels":
  - icon `mdi-account-remove-outline` in the error colour
  - title "Delete account" (`account.delete.button`)
  - description "Remove your account and everything in it"
  - The whole row is one button that opens the dialog.
- 2.2 `/delete-account` (`src/views/Deletion.vue`):
  - A heading block with the title "Delete your FlashCards account" and the intro, then a card of three rows:
    - `mdi-delete-forever-outline`, "What's deleted": the intro text.
    - `mdi-cellphone`, "In the app": the in-app steps, and below them the existing button ("Sign in to delete" or
      "Go to profile").
    - `mdi-email-outline`, "Can't sign in?": the email text, with the address as a `mailto:` link.
  - Signed-in and signed-out behaviour is unchanged.
- 2.3 `/privacy` (`src/views/Privacy.vue`): the title and "Last updated" at the top, then a card with one row per
  section, keeping the current copy:
  - `mdi-database-outline`: What we store, with the three items as lines
  - `mdi-cog-outline`: How it is used
  - `mdi-cloud-lock-outline`: Where it is kept
  - `mdi-delete-outline`: Deleting your data, linking to `/delete-account`
  - `mdi-account-child-outline`: Children
  - `mdi-email-outline`: Contact, with the `mailto:` link

  The closing line ("If this policy changes…") sits under the card.
- 2.4 The deletion dialog keeps the bin's dialog look (`src/views/Bin.vue`).

## 3. Cancelling the Google re-confirmation

- 3.1 The dialog is `persistent`, and Cancel disabled, only while the deletion request itself runs. They are not
  locked while waiting for the Google redirect to start.
- 3.2 When the page is shown again from the back/forward cache (`pageshow` with `persisted`), the dialog's busy state
  resets. The login screen already does this for its Google button.
- 3.3 After coming back from Google without a re-confirmation (Back, or closing Google's page), the dialog stays at its
  first step with Cancel enabled. `flashcards.pendingDelete` is cleared as today, and nothing is deleted.

## 4. The name "FlashCards"

Per [decisions/app-name-flashcards](../../knowledge/decisions/app-name-flashcards.md):
- 4.1 `pwa-manifest.ts`: `name` "FlashCards - Learn & Memorize", `short_name` "FlashCards".
- 4.2 `android/twa-manifest.json`: `name` "FlashCards - Learn & Memorize", `launcherName` "FlashCards". `android/` is
  regenerated with Bubblewrap.
- 4.3 `index.html`: title "FlashCards"; description "FlashCards: a learning and memorization helper app."; noscript
  "FlashCards needs JavaScript to work. Please enable it to continue."
- 4.4 `en.json`: `common.flashcards` and `info.tagline.title` become "FlashCards", `empty.bin.title` "FlashCards trash
  bin", and `privacy.intro`, `privacy.children.body` and `deletion.title` say "FlashCards". Hindi is unchanged.
- 4.5 Outside the repo: the signed AAB and APK in `~/keys/flashcards/` are rebuilt and re-signed (still `1.0.0`, code
  `1`, since nothing is uploaded), and `store/feature_graphic.png` is redrawn with the new name.

## 5. Launch without jitter

- 5.1 `index.html` paints the app's background before any script runs: `#ECECEC`, or the dark theme's background when
  the saved dark setting is on (read from the same localStorage key `usePrefsStore` uses). The app's icon is centred,
  inside `#app`, so it is replaced when Vue mounts. This continues the Android splash (icon on `#ECECEC`) without a
  white flash.
- 5.2 The login screen's email field doesn't auto-focus on touch devices (`(pointer: coarse)`), so the keyboard
  doesn't open and shift the layout on launch. Desktop keeps the auto-focus.
- 5.3 The TWA splash handover to Chrome fails on every cold start ("SplashScreenStrategy: Failed to transfer splash
  image.", Chrome `156.0.8078.79`, Android 17), which leaves a black gap. The build investigates the cause, time-boxed,
  checking with launch recordings on the developer's phone. If it can't be fixed from this project, the build reports
  what it found instead of changing anything for it.

## 6. Login

- 6.1 The login screen no longer links to `/delete-account`; it keeps "Privacy policy".

## 7. Testing

- E2e:
  - the profile row opens the deletion dialog
  - after starting the Google re-confirmation and going back, Cancel closes the dialog
  - `/delete-account` and `/privacy` show their rows and links, signed in and out
  - the login screen has "Privacy policy" and no "Delete account"
- Unit:
  - the router and locale tests stay green
  - `tests/unit/twa.spec.ts` checks the new names agree between the web manifest and the TWA config
- The axe scans of `/privacy` and `/delete-account` keep passing.
- On the phone: a cold-launch recording before and after.

## 8. Out of scope

Changing the deletion flow's steps, the dialog's look, and the Hindi name.
