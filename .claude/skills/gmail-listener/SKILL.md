---
name: gmail-listener
description: Gmail OAuth + idempotent email polling skill for detecting Azure GAF and pet approval emails and auto-transitioning bookings. Use when implementing the gmail-listener edge function, Gmail auth, attachment download, or the processed_emails table.
---

# Gmail listener skill

Implements the "Azure approval detected → booking auto-advances" capability described in `docs/NEW FLOW.md` and `docs/NEW_FLOW_PLAN.md §3.4`.

## Required context

- `docs/NEW_FLOW_PLAN.md` §3.4 — design overview and open questions (Q6.1–Q6.6).
- `.cursor/rules/booking-workflow.mdc` — what status to transition to.
- **Reference repo** (to be shared by user per Q6.1): `pay-credit-card`. Do not start full implementation until that repo is available — the OAuth token management pattern should mirror it.

## Goals

1. Poll Gmail every 5 minutes for **new** messages in INBOX matching Azure's GAF and pet approval patterns.
2. For each match, identify the booking (by date range + unit).
3. Download the approved PDF attachment, store it in Supabase Storage, set the URL on the booking.
4. Call `workflowOrchestrator.transition()` with the right target status.
5. Mark the Gmail `message.id` as processed so it never runs twice.

## OAuth model (plan)

- Account: the unit owner inbox (likely `kamehome.azurenorth@gmail.com`, confirm Q6.2).
- Use **OAuth refresh token** stored as a Supabase edge function secret:
  - `GMAIL_OAUTH_CLIENT_ID`
  - `GMAIL_OAUTH_CLIENT_SECRET`
  - `GMAIL_OAUTH_REFRESH_TOKEN`
- Scope: `https://www.googleapis.com/auth/gmail.readonly` (read + attachments). Do **not** request `gmail.modify`; we don't need to star or label.
- On every run, exchange refresh token → access token (~1h lifetime). Reuse the calendar service's JWT helper pattern for the HTTP calls.

One-time setup (document in `docs/MIGRATION_RUNBOOK.md`):

1. Create OAuth 2.0 Web Client in GCP console.
2. Authorize the unit owner account via a one-shot script that prints `refresh_token`.
3. Paste into Supabase dashboard env secrets.

## Email matching

Patterns (confirm exact values via Q6.3 / Q6.4):

| Kind         | Target status transition                     | Subject pattern                                          | Attachment filename match |
| ------------ | -------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| GAF approval | `PENDING_GAF → next (PARKING / PET / READY)` | `Monaco 2604 - GAF Request (MM-DD-YYYY to MM-DD-YYYY)` … | `APPROVED GAF.pdf`        |
| Pet approval | `PENDING_PET_REQUEST → READY_FOR_CHECKIN`    | `Monaco 2604 - Pet Request (MM-DD-YYYY to MM-DD-YYYY)`   | `APPROVED GAF.pdf`        |

Match rules:

- Sender must include Azure's domain (confirm via Q6.3).
- Parse the date range from subject into `(checkInDate, checkOutDate)` in `MM-DD-YYYY`.
- Find matching booking: exact date match **and** current status is the one expected for that kind (e.g. pet-approval emails only advance `PENDING_PET_REQUEST`, not `READY_FOR_CHECKIN`).
- If multiple bookings match the date range (shouldn't happen with single-unit), log and fall back to rule in Q6.5.

## Idempotency

Required migration:

```sql
CREATE TABLE IF NOT EXISTS processed_emails (
  message_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  booking_id UUID REFERENCES guest_submissions(id),
  kind TEXT NOT NULL,  -- 'gaf' | 'pet'
  status TEXT NOT NULL -- 'applied' | 'skipped' | 'failed'
);
```

Pseudocode:

```
for message in gmail.listNewSince(lastCursor):
  if processed_emails has message.id: continue
  if !matchesAzurePattern(message): mark processed 'skipped'; continue
  booking = findBookingForRange(subject)
  if !booking: mark 'skipped' with reason; log; continue
  attachment = gmail.getAttachment(message, 'APPROVED GAF.pdf')
  url = storage.upload(bucket, attachment, path)
  db.update(booking, { approved_gaf_pdf_url: url })
  orchestrator.transition(booking.id, nextStatus(booking))
  mark processed 'applied'
```

## Failure modes

- **Transient**: Gmail API 5xx, Supabase 5xx → throw, let Supabase cron retry next tick. Do **not** write to `processed_emails` yet.
- **Permanent**: attachment filename mismatch, booking not found, date parse fails → write `processed_emails` row with `status='skipped'` and a short `reason`; surface in an admin UI table later.
- **After N retries**: per Q6.6, either alert via an admin-visible "needs attention" flag on the booking or a Slack hook — confirm with user.

## Don'ts

- Don't use `gmail.modify` or move/label messages. Read-only is enough and safer.
- Don't hardcode the inbox email; put in env.
- Don't use an app password — use OAuth.
- Don't skip the `processed_emails` table — dupes will email Azure, charge parking owners twice, corrupt sheet rows.

## Open questions to resolve before coding

See `docs/NEW_FLOW_PLAN.md §6` Group 6. Specifically:

- **Q6.1** share `pay-credit-card` reference repo.
- **Q6.3 / Q6.4** confirm exact subject + sender patterns.
- **Q6.2** confirm which Gmail account to monitor.
