---
type: Open Question
title: Why does Firebase refuse this project's email template updates?
description: Setting the email action URL to https://flashcards.spanion.in/__/auth/action fails with EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED in the console and the admin API, and the cause is unknown.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-06T12:00:00Z }
---

# Why does Firebase refuse this project's email template updates?

## Question

Why are this project's email template updates, at least the action URL, refused with
EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED? Setting it to `https://flashcards.spanion.in/__/auth/action` was refused in the
Firebase console and through the admin API. On 2026-11-06 a PATCH that set `dnsInfo.useCustomDomain: false` together
with `callbackUri` was refused the same way and nothing changed, so the refusal is not caused by the custom domain's
state: it looks like a project-level restriction whose cause is unknown.

## Why it matters

The verification and password-reset emails open Firebase's page on the default `spanion-flash-cards.firebaseapp.com`
host, not the app's own domain ([email verification](../features/email-verification.md),
[decision](../decisions/password-reset-uses-firebase-action-page.md)). The project's settings as read are in
[Firebase](../integrations/firebase.md).

## Ways forward

- Test whether any template edit (for example a subject change, then reverting it) is refused too.
- Ask Firebase support.
- Send the emails ourselves: Admin SDK action links plus an email provider. Declined on 2026-11-06, see
  [auth emails are sent by Firebase](../decisions/auth-emails-sent-by-firebase.md).

## Status

Open

## Sources

- `src/services/firebase.ts`
