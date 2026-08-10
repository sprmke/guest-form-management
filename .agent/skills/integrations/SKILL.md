---
name: integrations
description: Google (Gmail), Telegram crons, Meta inbox, Resend. Use when connecting OAuth, webhooks, scheduled jobs, or integration settings UI.
---

# Integrations (GFM)

## Google (per property)

- OAuth: Settings → Connect Google — `google-mail-oauth-*` functions (Gmail `readonly` scope)
- Stored: `gmail_mail_integration` encrypted refresh token
- Skills: `gmail-listener` | Rules: `booking-workflow.mdc`

Env: `GMAIL_API_WEB_CLIENT_JSON`, `GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY`, `GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS`

## Telegram (per property)

- Five modules: marketing, staff, admin, finance, maintenance
- Settings UI: `/notifications` (property) — bot token + chat id encrypted in DB
- Crons: `telegram-*-cron` + `docs/archive/operations/scheduled-jobs-and-testing.md`
- Reference: `docs/archive/reference/telegram-marketing-reminders.md`

## Meta Guest Inbox (org)

- Skills: `social-inbox`, `meta-messaging`
- Rule: `social-inbox.mdc`
- Runbook: `docs/archive/operations/inbox-e2e-runbook.md`

## Resend

- Skill: `emails`
- `RESEND_API_KEY` edge secret

## AI (receipt validation)

- `GEMINI_API_KEYS` / `GROQ_API_KEY` — `docs/archive/reference/ai-payment-receipt-validation.md`

## Local scripts

- `bun run gmail-auth` → `scripts/integrations/gmail-auth.mjs` (legacy Desktop OAuth for listener)

## Don'ts

- Store refresh tokens in UI env
- Add integration side effects outside `workflowOrchestrator` for booking transitions
