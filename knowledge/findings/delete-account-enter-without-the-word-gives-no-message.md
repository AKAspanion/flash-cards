---
type: Finding
title: Pressing Enter in the delete dialog without the word gives no message
description: With DELETE not typed, Enter in the delete-account dialog does nothing and says nothing, and a password manager may fill the email into the DELETE field; the Delete button stays off in both cases.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-06T12:00:00Z }
---

# Pressing Enter in the delete dialog without the word gives no message

## Finding

In `DialogDeleteAccount.vue`, Enter before `DELETE` is typed is ignored silently, so a user who presses Enter sees
nothing happen. Separately, a password manager may fill the account email into the DELETE field; the button stays
off, so it is not a bypass, only a confusing state. No one loses data either way.

## Evidence

- Final review of `2026-11-06-bug-batch`, two ledger lines: `Final review: minor (deferred): Enter with no word typed
  gives no message (button stays off)` and `Final review: minor (deferred): password manager may fill the email into
  the DELETE field (button stays off; not a bypass)`. Both are about the same field in
  `src/components/DialogDeleteAccount.vue`.

## Status

Open. One way: show the hint as an error on Enter, and mark the field `autocomplete="off"`.

## Sources

- `src/components/DialogDeleteAccount.vue`
