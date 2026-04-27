# Scheduled jobs (cron) and how to test them

This document explains **how automation is scheduled** for the new booking flow (Phase 4), what each job does at a low level, and **how to test** everything safely on **local Supabase** and on **Supabase Cloud**.

Related canonical references:

- `docs/NEW_FLOW_PLAN.md` — product intent, Phase 4 notes, Q6.6 manual triggers
- `.cursor/rules/booking-workflow.mdc` — status machine and side-effect matrix
- `supabase/config.toml` — `verify_jwt` and why `schedule` is not committed for local CLI
- Implementations: `supabase/functions/gmail-listener/index.ts`, `supabase/functions/sd-refund-cron/index.ts`
- Admin manual triggers: `ui/src/features/admin/hooks/useTransitionBooking.ts` (`useRunGmailPoll`, `useRunSdRefundCron`) and `ui/src/features/admin/components/WorkflowPanel.tsx`

---

## 1. What is scheduled in this project?

There are **two** Edge Functions meant to run on a **recurring schedule** (every ~5 minutes in production):

| Job                         | Edge function    | Purpose                                                                                                                                                                                                                                                                                          |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gmail approval listener** | `gmail-listener` | Poll Gmail for Azure replies that contain **`APPROVED GAF.pdf`**, match them to a booking in **`PENDING_GAF`** or **`PENDING_PET_REQUEST`**, upload the PDF to Storage, then call **`WorkflowOrchestrator.transition()`** (same path as admin transitions).                                      |
| **SD refund cron**          | `sd-refund-cron` | Find bookings in **`READY_FOR_CHECKIN`** whose **check-out date + time + grace period** (default **15 minutes**, Asia/Manila) is already in the past, then transition each to **`PENDING_SD_REFUND`** via the orchestrator (calendar + sheet updates; **no** outbound email on this transition). |

Neither job reimplements workflow rules in isolation: both defer to **`WorkflowOrchestrator`** so calendar, sheet, and email behavior stay consistent with `transition-booking` and the status machine.

---

## 2. How Supabase scheduling works (hosted platform)

On **Supabase Cloud**, recurring invocations are implemented with **Postgres extensions**, not by “magic” inside the Edge runtime:

1. **`pg_cron`** — runs a SQL snippet on a cron expression (e.g. `*/5 * * * *` = every 5 minutes).
2. **`pg_net`** — performs an **HTTP POST** from the database to your Edge Function URL.
3. **Vault (recommended)** — stores secrets such as project URL and the key used in the `Authorization` header for the HTTP call.

Official guide: [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Typical pattern (simplified from Supabase docs):

- Store `https://<project-ref>.supabase.co` and your **`anon` key** (or another key your gateway accepts) in Vault.
- Schedule a job that runs:

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
         || '/functions/v1/sd-refund-cron',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
  ),
  body := '{}'::jsonb
);
```

Repeat with `/functions/v1/gmail-listener` for the second job (either two `cron.schedule` names or one job that calls both sequentially—your choice).

**Important:** The HTTP call is a **normal** request to the **public** Functions URL. Security is layered as:

- Kong / Edge gateway **`verify_jwt`** setting for that function (see §4).
- Optional **custom checks** inside the function body (this repo’s scheduled functions **do not** call `verifyAdminJwt`; see §4).

---

## 3. Why `config.toml` does not define `schedule` locally

In **`supabase/config.toml`** you will see:

```toml
[functions.gmail-listener]
verify_jwt = false

[functions.sd-refund-cron]
verify_jwt = false
# Cloud-only schedule — set in Supabase Dashboard / SQL (pg_cron), NOT here
```

Reasons:

1. **Local Supabase CLI** historically **rejects** or mishandles a `[functions.*] schedule = "..."` key depending on CLI version; the repo keeps schedules **out of** `config.toml` so `supabase start` stays reliable.
2. **Hosted** schedules are owned by the **project database** (`pg_cron`), not the repo file—so production schedule is created **once** in the cloud (SQL Editor or migration), not only by git push.

**Local dev:** nothing fires every 5 minutes automatically. You **manually** invoke the functions (§6–§7).

---

## 4. Authentication and `verify_jwt` for these two functions

Current repo behavior:

| Function         | `[functions.*] verify_jwt` in `config.toml` | Handler calls `verifyAdminJwt`? |
| ---------------- | ------------------------------------------- | ------------------------------- |
| `gmail-listener` | `false`                                     | **No**                          |
| `sd-refund-cron` | `false`                                     | **No**                          |

Effects:

- **Scheduled `pg_net` POST** can use the **`anon` JWT** in `Authorization` (as in Supabase’s scheduling doc) and still reach the handler, because Kong is not enforcing JWT for these functions.
- **Admin UI “Run … now”** sends the **signed-in admin’s** `access_token` (`useTransitionBooking.ts`), but the handler **does not validate** it today—those buttons are for **trusted operators** only; the real production boundary is that only your project’s cron SQL + keys should call these endpoints routinely.

**Operational implication:** Treat the function URLs like **semi-internal** APIs: configure cron in Vault, avoid sharing keys, and rely on Supabase project isolation.

---

## 5. Environment variables and secrets

### 5.1 Shared (all Edge Functions on Supabase)

Automatically provided in hosted Edge runtime (and in local serve when linked to local stack):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Both jobs use the **service role** client inside the handler for DB + Storage (see `createClient` in each `index.ts`).

### 5.2 `sd-refund-cron` only

| Variable                       | Default | Purpose                                                                                                                      |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `SD_REFUND_CRON_GRACE_MINUTES` | `15`    | Minutes **after** parsed check-out (Manila) before the booking becomes eligible for `READY_FOR_CHECKIN → PENDING_SD_REFUND`. |

### 5.3 `gmail-listener` only

| Variable                  | Purpose                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GMAIL_OAUTH_CLIENT_JSON` | OAuth client JSON (`installed` or `web` with `client_id` / `client_secret`). Produced by `npm run gmail-auth` → typically written into `supabase/.env.local`. |
| `GMAIL_OAUTH_TOKEN_JSON`  | Token JSON including **`refresh_token`**. Same script flow.                                                                                                   |

If either Gmail secret is missing or `refresh_token` is revoked, the listener returns JSON with `needsReAuth: true` (and logs); see §7.3.

---

## 6. How local development runs these functions

From repo root, **`./dev.sh`** (recommended):

1. Runs **`supabase start`** (DB, Auth, Storage) with env from `ui/.env.development` where needed for `config.toml`.
2. Runs **`supabase functions serve --env-file supabase/.env.local`** so Edge code sees `ADMIN_ALLOWED_EMAILS`, Gmail JSON, Google service account, Resend, etc.
3. Starts the Vite UI.

**Functions base URL (local):**

```text
http://127.0.0.1:54321/functions/v1
```

(Use the same host your `ui/.env.development` `VITE_SUPABASE_URL` points at; it must end with `/functions/v1` for this project’s admin hooks.)

**There is no local pg_cron** hitting these URLs unless you add one yourself—use **curl** or the **admin Workflow panel** buttons (“Run Gmail poll now”, “Run SD refund cron now”).

---

## 7. Testing `sd-refund-cron` (step by step)

### 7.1 Preconditions

- Local stack up (`./dev.sh` or `supabase start` + `functions serve` with `supabase/.env.local`).
- A row in **`guest_submissions`** you can edit (SQL Editor in Studio, or seed data).
- Optional: set `SD_REFUND_CRON_GRACE_MINUTES=0` in `supabase/.env.local` during testing to avoid waiting 15 minutes (restart `functions serve` after changing env).

### 7.2 Prepare a booking that should transition

1. Set **`status`** = **`READY_FOR_CHECKIN`**.
2. Set **`check_out_date`** in **`MM-DD-YYYY`** form (this is what the cron parser expects first—see `parseCheckoutManila` in `sd-refund-cron/index.ts`).
3. Set **`check_out_time`** to something clearly in the **past** today in Manila, e.g. `12:00 AM` or `6:00 AM`, **or** set checkout **date** to **yesterday** with any valid time.
4. Ensure **`check_out_time`** is not empty; if empty, the code falls back to **`11:00 AM`** which can make “past checkout” harder to hit on the same calendar day.

### 7.3 Invoke the function

**Option A — Admin UI (recommended)**

1. Sign in to admin, open any booking (or the one you edited).
2. In **Workflow panel**, use **“Run SD refund cron now”**.
3. Expect a toast summarizing `transitioned` / `scanned`; list invalidates.

**Option B — curl (local)**

```bash
curl -sS -X POST \
  "http://127.0.0.1:54321/functions/v1/sd-refund-cron" \
  -H "Authorization: Bearer $(grep '^SUPABASE_ANON_KEY=' supabase/.env.local | cut -d= -f2- | tr -d '\"')" \
  -H "Content-Type: application/json" \
  -d '{}'
```

(Use the **anon** key from local Supabase status output or `.env.local`; with `verify_jwt = false` the header may still be required by some gateways—if a bare POST works locally, that matches your CLI version.)

### 7.4 Assert results

- **HTTP 200** and JSON roughly:  
  `{ "success": true, "scanned": N, "transitioned": 1, "skipped": ..., "results": [ ... ] }`
- DB: that booking’s **`status`** is now **`PENDING_SD_REFUND`**.
- If Google env vars are configured: **Calendar** event color/summary and **Sheet** row updated per workflow matrix (orchestrator).
- Re-run the same cron: booking should appear **only** in `scanned` if still `READY_FOR_CHECKIN` for others; the already-moved row is no longer a candidate—**idempotent** for the same booking.

### 7.5 Negative / edge cases to try

| Scenario                                                     | Expected                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Checkout + grace **still in the future**                     | `skipped` with reason like `not_yet_due_Xmin` in `results`.                             |
| **`READY_FOR_CHECKIN`** but **unparseable** `check_out_date` | `skipped`, `unparseable_checkout_datetime`.                                             |
| **No** rows in `READY_FOR_CHECKIN`                           | `scanned: 0`, `transitioned: 0`.                                                        |
| Orchestrator throws (e.g. misconfigured Google)              | That booking `action: 'failed'` in `results`, run still **200** with partial successes. |

---

## 8. Testing `gmail-listener` (step by step)

This path is **longer** because it touches **Gmail OAuth**, **Gmail history IDs**, **Storage**, and **workflow transitions**.

### 8.1 Preconditions

- `GMAIL_OAUTH_CLIENT_JSON` and `GMAIL_OAUTH_TOKEN_JSON` set in **`supabase/.env.local`** (from `npm run gmail-auth` per `admin-auth.mdc`).
- Migrations applied so tables exist: **`gmail_listener_state`**, **`processed_emails`** (see project migrations).
- Storage bucket **`approved-gafs`** / **`approved-pet-forms`** available (declared in `config.toml` + migrations).
- A booking row in **`PENDING_GAF`** (for GAF approval) or **`PENDING_PET_REQUEST`** (for pet approval) with **`check_in_date` / `check_out_date`** matching the **subject line** you will use in the test email.

### 8.2 Subject and attachment contract

The listener parses subjects of the form (after optional prefixes like test/urgent/update — see code `parseApprovalSubject`):

- `Monaco 2604 - GAF Request (MM-DD-YYYY to MM-DD-YYYY)`
- `Monaco 2604 - Pet Request (MM-DD-YYYY to MM-DD-YYYY)`

Attachment filename must match (case-insensitive): **`APPROVED GAF.pdf`**.

If multiple bookings match the same dates + expected status, the listener **skips** and records **`ambiguous_multiple_bookings`** (per Q6.5).

### 8.3 First run — history cursor initialization

On a **fresh** DB (no row in `gmail_listener_state` or null `history_id`):

1. POST `gmail-listener` once.
2. Expected JSON: **`"initialized": true`**, **`historyId`** set.
3. **No backlog** is processed on purpose: the cursor is set to **current** mailbox `historyId` so old inbox mail does not mass-transition production by accident.

**Test implication:** After first init, you must **receive a new message** (or advance history) for the listener to see `messageAdded` entries.

### 8.4 Second run — happy path (GAF)

1. Ensure exactly **one** booking in **`PENDING_GAF`** with dates matching your planned subject.
2. From the monitored mailbox, ensure an inbound email (or send yourself a thread) with the **exact** subject pattern and **`APPROVED GAF.pdf`**.
3. POST `gmail-listener` again (admin button or curl).
4. Expect JSON with **`messagesScanned` > 0**, **`applied` ≥ 1** if a message matched.
5. Verify:
   - **`processed_emails`** has the Gmail **`message_id`** with status `applied` (or `skipped` / `failed`).
   - **`gmail_listener_state`** updated `history_id` / `last_poll_at`.
   - Booking **`status`** advanced per flags (`need_parking` / `has_pets` → parking, pet, or ready).
   - **`approved_gaf_pdf_url`** (or pet URL) set; file in Storage.

### 8.5 Pet approval path

Same as GAF but:

- Booking must be in **`PENDING_PET_REQUEST`**.
- Subject uses **`Pet Request`**.
- Transition should land in **`READY_FOR_CHECKIN`** with pet PDF URL and optional ready-for-check-in email when orchestrator says so.

### 8.6 Gmail history expiry (404)

If Gmail returns **404** on `users.history.list` (cursor too old):

- Listener **resets** cursor to current profile `historyId`, returns JSON like **`historyReset: true`**.
- **Mail between old cursor and reset can be missed** — documented in logs; recover with **manual upload** + admin transition per workflow panel.

### 8.7 OAuth failure

If token exchange fails (`invalid_grant`):

- Response **`success: false`**, **`needsReAuth: true`** for invalid grant; fix by re-running **`npm run gmail-auth`** and updating secrets.

### 8.8 Idempotency

- **`processed_emails`** prevents double-applying the same **`message_id`**.
- Re-posting the listener for the same Gmail message should **skip** as already processed.

---

## 9. Hosted (production / staging) testing checklist

1. **Deploy** Edge Functions (`gmail-listener`, `sd-refund-cron`) to the project.
2. **Set secrets** in Supabase Dashboard (same names as local `.env.local` for Gmail, grace minutes, Google, etc.).
3. **Create pg_cron jobs** via SQL (Vault + `net.http_post`) for each function on `*/5 * * * *` or your preferred cadence.
4. Confirm **first** `gmail-listener` run in a new environment: expect **`initialized: true`**; plan a **test mail** after.
5. Use **Dashboard → Edge Functions → Logs** (or Log Explorer) to watch `[gmail-listener]` / `[sd-refund-cron]` log lines.
6. Use **admin manual buttons** on a real booking if cron delay makes iteration slow—same HTTP handlers as cron.

---

## 10. Quick reference — URLs and files

| Item                          | Location                                                               |
| ----------------------------- | ---------------------------------------------------------------------- |
| SD cron logic                 | `supabase/functions/sd-refund-cron/index.ts`                           |
| Gmail listener logic          | `supabase/functions/gmail-listener/index.ts`                           |
| Orchestrator (single fan-out) | `supabase/functions/_shared/workflowOrchestrator.ts`                   |
| Status rules                  | `supabase/functions/_shared/statusMachine.ts`                          |
| Manual HTTP from UI           | `ui/src/features/admin/hooks/useTransitionBooking.ts`                  |
| Local functions + env         | `./dev.sh` → `supabase functions serve --env-file supabase/.env.local` |
| Supabase scheduling doc       | https://supabase.com/docs/guides/functions/schedule-functions          |

---

## 11. FAQ

**Q: Does my laptop need to stay on for cron to run?**  
**A:** No. On Supabase Cloud, **`pg_cron`** runs in the **hosted database**. Your machine only matters for **local** testing.

**Q: Why does the admin UI send a JWT if the function doesn’t verify it?**  
**A:** The UI reuses the same **`FUNCTIONS_URL`** pattern as other admin mutations; scheduled jobs use **`anon`** (or your chosen Vault secret). Tightening auth (e.g. `verifyAdminJwt` for non-cron requests only) would be a future hardening pass.

**Q: Can I test SD cron without touching Gmail?**  
**A:** Yes. SD cron has **no** Gmail dependency—only DB dates + orchestrator + Google Calendar/Sheet if enabled.

---

_Last updated to match repo behavior as of the Phase 4 `gmail-listener` + `sd-refund-cron` implementation and `supabase/config.toml` (`verify_jwt = false` for both)._
