---
name: gmail-listener
description: Gmail OAuth + incremental history polling for Azure approval emails (GAF + pet), attachment download, idempotency, and booking auto-transitions. Use when implementing `gmail-listener`, Gmail secrets, `processed_emails`, or `gmail_listener_state`.
---

# Gmail listener skill

This skill translates the **proven Gmail automation** from `pay-credit-cards` into the **`gmail-listener` Supabase Edge Function** for `guest-form-management`.

## Canonical reference repo (read before coding)

**Path:** `/Users/michaelmanlulu/Projects/personal-projects/automated-tasks/pay-credit-cards/`

**Docs:** `pay-credit-cards/docs/SETUP.md` (OAuth + poller setup)

**Code map (what to copy conceptually, not line-for-line):**

| File | What it proves |
| ---- | -------------- |
| `src/gmail-auth.ts` | Desktop OAuth client (`configs/credentials.json`), `access_type=offline`, `prompt=consent`, writes **`configs/token.json`** containing a **refresh token**. |
| `src/gmail.ts#getGmailClient` | Loads creds + token, calls `oauth2Client.getAccessToken()`, maps `invalid_grant` to a human-readable “re-run gmail-auth” error. |
| `src/gmail-history.ts` | `users.getProfile` → `historyId`; `users.history.list` with `historyTypes: ['messageAdded']` → **incremental** new message ids since last `startHistoryId`. Handles **404 history expired** via `historyExpired` flag. |
| `src/gmail-poll-new-soa.ts` | Persists **watch state** (`historyId` + ring buffer of processed ids), `--init` behavior (no backlog), fetches each message with `users.messages.get({ format: 'full' })` before inspecting attachments. |

> pay-credit-cards also adds Calendar scopes in `gmail-auth.ts`. **Do not copy that part** for guest-form-management — the listener should be **Gmail read-only**; calendar writes stay in `workflowOrchestrator`.

## What we are building in guest-form-management

**Function:** `supabase/functions/gmail-listener/index.ts` (scheduled every ~5 minutes)

**Goal:** detect Azure’s approval emails for:

1. **GAF approval** while booking is `PENDING_GAF`
2. **Pet approval** while booking is `PENDING_PET_REQUEST`

…then download `APPROVED GAF.pdf`, upload to Supabase Storage, set `approved_*_pdf_url`, and call `transition-booking` → `workflowOrchestrator`.

**Matching rules** are already locked in `docs/NEW_FLOW_PLAN.md` §6.1 **Q6.3/Q6.4** (subjects mirror `supabase/functions/_shared/emailService.ts`).

## Deno / Edge differences vs pay-credit-cards (Node)

pay-credit-cards uses **`googleapis` on Node + local JSON files**.

`gmail-listener` runs on **Deno** with **Supabase secrets** — same OAuth *flow*, different storage:

- Store `credentials.json` contents as **`GMAIL_OAUTH_CLIENT_JSON`** (string secret).
- Store `token.json` contents as **`GMAIL_OAUTH_TOKEN_JSON`** (string secret) after one-time auth.
- Persist `historyId` in Postgres (`gmail_listener_state`) instead of `data/soa-gmail-watch-state.json`.

You may either:

- **A (recommended):** vendor `googleapis` for Deno (`npm:googleapis@…`) and keep code close to `src/gmail.ts`, or
- **B:** call Gmail REST directly with `fetch` + OAuth access token (more boilerplate).

Pick one approach in the first PR and stick to it.

## Database tables

### `gmail_listener_state`

Single-row table (or keyed by inbox email if you ever add more):

- `inbox_email TEXT PRIMARY KEY` (default `'me'` semantics — usually store the actual Gmail address as metadata only)
- `history_id TEXT NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Initialize like pay-credit `--init`: set `historyId` to **current profile `historyId`** so the first deploy processes **no backlog**.

### `processed_emails`

Already planned in `docs/NEW_FLOW_PLAN.md` — keep it:

- `message_id TEXT PRIMARY KEY`
- `kind TEXT` (`gaf` | `pet`)
- `status TEXT` (`applied` | `skipped` | `failed`)
- `reason TEXT NULL`
- `booking_id UUID NULL`

Use this as the **durable** dedupe layer across function deploys. The in-memory ring buffer from pay-credit-cards is **not enough** on Supabase.

## Algorithm (happy path)

1. Load OAuth creds from secrets → get access token.
2. Load `gmail_listener_state.history_id` → `startHistoryId`.
3. Call `users.history.list` (`messageAdded`) → `addedMessageIds[]` + `newHistoryId`.
4. For each id:
   - If exists in `processed_emails` → skip.
   - `users.messages.get({ format: 'full' })` → read `Subject`, detect approval kind, parse date range.
   - Find booking row matching dates + expected `status`.
   - Walk MIME parts → find attachment named **`APPROVED GAF.pdf`** → `attachments.get` → decode base64url → upload bytes to Storage → update URLs.
   - `workflowOrchestrator.transition(…)`.
   - Insert `processed_emails` `applied`.
5. Persist `gmail_listener_state.history_id = newHistoryId` **even on no-op polls** (same as pay-credit-cards).

## Failure modes (copy pay-credit-cards behavior)

- **`invalid_grant`:** stop the world — log + surface “re-auth needed” (admin banner / ops runbook). Same as `formatGmailAuthError` in `src/gmail.ts`.
- **History 404 / expired cursor:** reset `historyId` to current profile id (pay-credit resets on `historyExpired`). Log loudly; optionally enqueue a “missed approvals” admin task.
- **Transient 5xx:** throw so Supabase retries next schedule tick **without** writing `processed_emails`.
- **Permanent parse/skip:** write `processed_emails` with `skipped` + reason so we never spin on the same bad message forever.

## Don'ts

- Don’t request `gmail.modify` scope — read-only is enough.
- Don’t run attachment logic on `users.messages.get({ format: 'metadata' })` — pay-credit-cards comment explains **`full` is required** to see `payload.parts`.
- Don’t bypass `workflowOrchestrator` from the listener.
- Don’t rely only on `historyId` without `processed_emails` — you need both: history can rewind/replay during edge cases.

## Resolved listener decisions

**Q6.2** (inbox), **Q6.5** (multi-match), and **Q6.6** (retries + admin manual triggers) are **locked in `docs/NEW_FLOW_PLAN.md` §6.1**. Only **§6.2** refinement (**Q7.4** surprise field) is unrelated to Gmail unless we add new product rules.
