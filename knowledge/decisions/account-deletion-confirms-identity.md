---
type: Decision
title: Deleting an account always confirms who you are first
description: Account deletion shows a can't-be-undone dialog, then always re-confirms identity (password, or a Google redirect followed by a final tap) before anything is deleted; there's no typed confirmation.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:38:06Z }
---

# Deleting an account always confirms who you are first

## Context

Firebase refuses to delete a user who hasn't signed in recently. With
[Google sign-in by redirect](google-sign-in-redirect.md), re-confirming a Google user leaves the page.
[Account deletion and export](../requirements/account-deletion-and-export.md) asks for a confirmation that says the
deletion can't be undone.

## Decision

On `/profile`, Delete account opens a dialog saying the deletion can't be undone. Continuing always re-confirms
identity before anything is deleted:

- Email and password users type their password in the dialog, then delete.
- Google users are redirected to Google. The intent to delete is kept in `sessionStorage` (this tab only). Back on
  `/profile`, the dialog reopens with a final Delete my account button. Nothing is deleted on page load alone.

There is no typed confirmation such as `DELETE`: a fresh sign-in already proves intent. The developer chose this
on 2026-11-04, over trying the deletion first and re-confirming only when Firebase demands it (two paths, and a
deletion that can stop halfway).

## Consequences

- Someone holding an unlocked phone can't delete the account without the password or the Google account.
- Deletion removes the user's data, then the Auth user
  ([every collection](../requirements/account-deletion-covers-every-collection.md)), straight after the
  re-confirmation, so Firebase's recent-sign-in check passes.
