# Migration Runbook — New Booking Flow

> Step-by-step apply + rollback instructions for the redesign in `docs/NEW_FLOW_PLAN.md`.
> Every step is **additive and reversible** on Phase 0. Later phases (1–6) introduce behavior change and must be deployed in order.
>
> **⚠ Production safety.** The migration files in `supabase/migrations/` **do not run automatically**. They only execute when you:
>
> - run `supabase start` / `supabase db reset` (local Postgres on port **54322** only), **or**
> - explicitly run `supabase db push --linked` / `supabase db push --db-url <…>` (remote).
>
> **Never** run `supabase db push` against prod until §5 ("Applying to production") has been read end-to-end and a backup is confirmed.
>
> The UI `.env.development` currently points at the prod Supabase URL — so be extra careful: `npm run dev:ui` already hits prod Edge Functions. Nothing in Phase 0 changes Edge Function behavior, but do not casually trigger new flows from `/form` until Phase 5.

---

## 1. What Phase 0 changes

Phase 0 is **schema-only + buckets**. No Edge Function, UI, or env change.

Migrations added (all under `supabase/migrations/`):

| File | Purpose | Reversible? |
| ---- | ------- | ----------- |
| `20260501000000_backup_guest_submissions.sql` | Snapshots current `guest_submissions` into `guest_submissions_backup_20260501` (data only, no FKs). | Yes — `DROP TABLE guest_submissions_backup_20260501;` |
| `20260501000002_add_workflow_columns.sql` | Adds nullable money + workflow columns (`booking_rate`, `down_payment`, `balance`, `security_deposit`, `parking_rate_guest`, `parking_rate_paid`, `parking_endorsement_url`, `parking_owner_email`, `pet_fee`, `sd_additional_expenses NUMERIC[]`, `sd_additional_profits NUMERIC[]`, `sd_refund_amount`, `sd_refund_receipt_url`, `status_updated_at`, `settled_at`). No default writes on existing rows. | Yes — `ALTER TABLE … DROP COLUMN …` for each. |
| `20260501000003_add_approved_pdf_columns.sql` | Adds nullable `approved_gaf_pdf_url`, `approved_pet_pdf_url`. | Yes. |
| `20260501000004_add_is_test_booking.sql` | Adds `is_test_booking BOOLEAN DEFAULT FALSE NOT NULL`. Backfills `false` for existing rows. Does **not** alter existing `[TEST]` / `TEST_` prefix behavior. | Yes — `ALTER TABLE … DROP COLUMN is_test_booking;` |
| `20260501000005_create_processed_emails_table.sql` | Creates `processed_emails` table for Gmail listener idempotency. | Yes — `DROP TABLE processed_emails;` |
| `20260501000006_create_parking_endorsements_bucket.sql` | New public bucket + RLS. | Yes — `DELETE FROM storage.buckets WHERE id = 'parking-endorsements';` (after deleting objects). |
| `20260501000007_create_approved_gafs_bucket.sql` | New **private** bucket for approved GAF + pet-form PDFs + RLS. | Yes. |
| `20260501000008_create_sd_refund_receipts_bucket.sql` | New **private** bucket for SD refund receipts + RLS. | Yes. |
| `20260501000009_create_gmail_listener_state.sql` | Creates `gmail_listener_state` (single-row `historyId` cursor). | Yes — `DROP TABLE gmail_listener_state;` |

**Not** in Phase 0 (on purpose):

- The `status` column is **not** widened or back-filled yet. Existing rows keep `status = 'booked' | 'canceled'`. The state-machine migration (Phase 2) is a separate file (`20260501000001_add_booking_status_enum.sql` — to be authored then).
- No Edge Function changes.
- No UI changes.

---

## 2. Pre-flight checklist (local first)

1. Confirm you are on the `guest-form-management` repo branch you intend to ship from.
2. Stop any running local Supabase: `npm run stop:supabase`.
3. (Optional) Wipe local DB to start clean: `supabase db reset` — this **only** affects the local container, never prod.
4. Inspect the new files:

   ```bash
   ls supabase/migrations/ | tail -n 20
   ```

5. Dry-read each migration (they're vanilla SQL). Make sure no `DROP TABLE guest_submissions` or `ALTER COLUMN status` appears anywhere in Phase 0 — there should be none.

---

## 3. Apply locally (safe)

```bash
# Starts local Postgres + Storage + edge runtime and applies ALL migrations.
supabase start
```

Verify:

```sql
-- Expected columns exist, nullable, no rows rewritten:
\d guest_submissions
-- Expected backup table exists with same row count:
SELECT count(*) FROM guest_submissions_backup_20260501;
SELECT count(*) FROM guest_submissions;
-- Expected new bucket rows:
SELECT id, public FROM storage.buckets WHERE id IN
  ('parking-endorsements','approved-gafs','approved-pet-forms','sd-refund-receipts');
-- Expected empty tracking tables:
SELECT * FROM processed_emails;
SELECT * FROM gmail_listener_state;
```

---

## 4. Staging (if available)

This project doesn't have a dedicated staging Supabase project today. If you spin one up:

1. Link: `supabase link --project-ref <staging-ref>`.
2. Push: `supabase db push`.
3. Repeat the verification queries from §3.

---

## 5. Applying to production

**Do not skip any step.**

1. Backup the DB from the Supabase dashboard (**Database → Backups → Create backup**) and note the backup ID / timestamp.
2. Confirm the linked project ref:

   ```bash
   supabase projects list
   supabase link --project-ref <prod-ref>   # only if not already linked
   ```

3. Show what will run:

   ```bash
   supabase db diff --linked --schema public
   ```

4. Apply:

   ```bash
   supabase db push
   ```

5. Re-run the verification queries from §3 against prod (Dashboard → SQL Editor).
6. Sanity check existing `/form` still works end-to-end on a **dev / test** submit (do **not** use real guest data). The Edge Functions haven't changed, so this should be identical behavior.

---

## 6. Rollback

Phase 0 migrations are additive. Rollback order (opposite of apply):

```sql
-- Run each as its own statement, only the ones you actually applied.
DROP TABLE IF EXISTS gmail_listener_state;
DELETE FROM storage.buckets WHERE id IN
  ('parking-endorsements','approved-gafs','approved-pet-forms','sd-refund-receipts');
DROP TABLE IF EXISTS processed_emails;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS is_test_booking;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS approved_pet_pdf_url;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS approved_gaf_pdf_url;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS settled_at;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS status_updated_at;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS sd_refund_receipt_url;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS sd_refund_amount;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS sd_additional_profits;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS sd_additional_expenses;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS pet_fee;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS parking_owner_email;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS parking_endorsement_url;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS parking_rate_paid;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS parking_rate_guest;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS security_deposit;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS balance;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS down_payment;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS booking_rate;
-- The backup table can stay — it's only a snapshot and doesn't affect behavior.
DROP TABLE IF EXISTS guest_submissions_backup_20260501;
```

The backup table from step 1 is your insurance — it contains a copy of every `guest_submissions` row as of Phase 0 apply time.

---

## 7. Phase 1 — Admin auth + read-only `/bookings`

Phase 1 is **client-only** — no DB migration, no Edge Function change. It adds:

- `@supabase/supabase-js` + `@tanstack/react-query` to `ui/package.json`.
- Shared client at `ui/src/lib/supabaseClient.ts`.
- Admin feature folder at `ui/src/features/admin/` (pages, components, hooks, lib).
- New UI routes: `/sign-in` (Google OAuth) and `/bookings` (read-only list, guarded by `RequireAdmin`).

### 7.1 One-time Supabase configuration (required for sign-in to work)

**You must do this in the Supabase dashboard before `/sign-in` works.** The code is ready; the provider is not.

1. Create a Google OAuth **Web** client in Google Cloud Console (Authentication → Credentials → "Create Credentials" → OAuth Client ID → Web application).
   - **Authorized JavaScript origins:** your local URL (e.g. `http://localhost:5173`) and your production URL (e.g. the Vercel domain).
   - **Authorized redirect URIs:** `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (get the exact value from the Supabase dashboard).
2. In the Supabase dashboard → **Authentication → Providers → Google** → enable, paste the client ID + client secret, save.
3. Under **Authentication → URL Configuration**: set **Site URL** to your primary app URL (production), and add **Additional Redirect URLs** for `http://localhost:5173` / any preview domains.

You do **not** need to change any Supabase *database* setting for Phase 1.

### 7.2 Env vars

Added to **`ui/.env.development` only** (safe — the prod file was intentionally not touched):

- `VITE_ADMIN_ALLOWED_EMAILS` — comma-separated list of Google emails allowed to access `/bookings`. Default in dev: `kamehome.azurenorth@gmail.com`.
- `VITE_SUPABASE_PROJECT_URL` — optional override. Unset, the client derives the project URL by stripping `/functions/v1` from `VITE_SUPABASE_URL`.

**For production,** add `VITE_ADMIN_ALLOWED_EMAILS` in the Vercel project env (or wherever the prod UI is built) when you're ready to roll out Phase 1 to production. If the var is missing, the UI allow list is empty and every email is rejected — failing closed is the right default.

### 7.3 Allow-list philosophy (important)

The UI check is **UX-only**. It prevents an unauthorized user from seeing the dashboard shell, but it does not secure data — any authenticated Supabase user can read `guest_submissions` today (existing RLS policy). The real gate is the server-side allow list that lands in **Phase 3** with the admin edge functions (`list-bookings`, `transition-booking`, `upload-booking-asset`, `parking-broadcast-email` — each calls `verifyAdminJwt` from `_shared/auth.ts`).

Do not expose `/bookings` on an untrusted network before Phase 3 — or tighten RLS first (out of scope for Phase 1 to keep the existing `/form` flow untouched).

### 7.4 Verify locally

```bash
cd ui
npm install           # picks up new deps
npm run dev
```

1. Visit `http://localhost:5173/bookings` → should redirect to `/sign-in?redirect=%2Fbookings`.
2. Click **Continue with Google** → OAuth round-trip.
3. Signed in with an allow-listed email → lands on `/bookings`; sees existing prod rows (the local UI reads from prod Supabase because `.env.development` points there).
4. Signed in with a non-allowed email → "Not authorized" card with a sign-out CTA.
5. Hard-refresh `/bookings` while signed in → should load the table without bouncing to `/sign-in`.

### 7.5 Rollback

Phase 1 is pure UI / dependency change. Revert the commit(s) that added `ui/src/features/admin/`, `ui/src/lib/supabaseClient.ts`, `ui/src/App.tsx` (QueryClientProvider wrap), and the `ui/src/routes/index.tsx` merge. The added env var and npm dependencies are safe to leave if you want to roll forward again later.

No DB or storage rollback is needed.

---

## 8. Later phases (to be runbook'd when authored)

- **Phase 2** — `20260501000001_add_booking_status_enum.sql` (widen `status` + seed new values via `CHECK` + backfill legacy `booked` rows per §6.1 Q1.1). Updates `get-booked-dates` to treat non-`CANCELLED` as blocking.
- **Phase 3** — Admin edge functions (`list-bookings`, `transition-booking`, `upload-booking-asset`, `parking-broadcast-email`), `_shared/auth.ts` server-side allow list, `/bookings/:bookingId` detail view, transition UI, guest acknowledgement + ready-for-check-in emails.
- **Phase 4** — Gmail listener + cron deployment (requires Google OAuth secrets configured; see `.cursor/skills/gmail-listener/SKILL.md`).
- **Phase 5** — `submit-form` side-effect cleanup + UI query-flag retirement.
- **Phase 6** — One-shot calendar + sheet backfill script.

Each phase adds its own section to this runbook before it ships.
