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

| File                                                    | Purpose                                                                                                                                                                                                                                                                                                                                                                                                    | Reversible?                                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `20260501000000_backup_guest_submissions.sql`           | Snapshots current `guest_submissions` into `guest_submissions_backup_20260501` (data only, no FKs).                                                                                                                                                                                                                                                                                                        | Yes — `DROP TABLE guest_submissions_backup_20260501;`                                            |
| `20260501000002_add_workflow_columns.sql`               | Adds nullable money + workflow columns (`booking_rate`, `down_payment`, `balance`, `security_deposit`, `parking_rate_guest`, `parking_rate_paid`, `parking_endorsement_url`, `parking_owner_email`, `pet_fee`, `sd_additional_expenses NUMERIC[]`, `sd_additional_profits NUMERIC[]`, `sd_refund_amount`, `sd_refund_receipt_url`, `status_updated_at`, `settled_at`). No default writes on existing rows. | Yes — `ALTER TABLE … DROP COLUMN …` for each.                                                    |
| `20260501000003_add_approved_pdf_columns.sql`           | Adds nullable `approved_gaf_pdf_url`, `approved_pet_pdf_url`.                                                                                                                                                                                                                                                                                                                                              | Yes.                                                                                             |
| `20260501000004_add_is_test_booking.sql`                | Adds `is_test_booking BOOLEAN DEFAULT FALSE NOT NULL`. Backfills `false` for existing rows. Does **not** alter existing `[TEST]` / `TEST_` prefix behavior.                                                                                                                                                                                                                                                | Yes — `ALTER TABLE … DROP COLUMN is_test_booking;`                                               |
| `20260501000005_create_processed_emails_table.sql`      | Creates `processed_emails` table for Gmail listener idempotency.                                                                                                                                                                                                                                                                                                                                           | Yes — `DROP TABLE processed_emails;`                                                             |
| `20260501000006_create_parking_endorsements_bucket.sql` | New public bucket + RLS.                                                                                                                                                                                                                                                                                                                                                                                   | Yes — `DELETE FROM storage.buckets WHERE id = 'parking-endorsements';` (after deleting objects). |
| `20260501000007_create_approved_gafs_bucket.sql`        | New **private** bucket for approved GAF + pet-form PDFs + RLS.                                                                                                                                                                                                                                                                                                                                             | Yes.                                                                                             |
| `20260501000008_create_sd_refund_receipts_bucket.sql`   | New **private** bucket for SD refund receipts + RLS.                                                                                                                                                                                                                                                                                                                                                       | Yes.                                                                                             |
| `20260501000009_create_gmail_listener_state.sql`        | Creates `gmail_listener_state` (single-row `historyId` cursor).                                                                                                                                                                                                                                                                                                                                            | Yes — `DROP TABLE gmail_listener_state;`                                                         |

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

## 3.5 Develop against **local** Supabase (env + optional prod data)

Use this when you want the UI and edge functions to hit **Docker Postgres on port 54322**, not the hosted project. `docs/MIGRATION_RUNBOOK.md` §7.4 historically assumed `.env.development` pointed at prod — switch the vars below when testing migrations and copied prod rows locally.

### 3.5.1 Start the stack and read keys

```bash
# From repo root
supabase start
supabase status
```

Note:

- **API (REST + Auth):** `http://127.0.0.1:54321` (no trailing slash).
- **Edge Functions base URL:** `http://127.0.0.1:54321/functions/v1`.
- **anon key** and **service_role key** — copy from `supabase status` output.

Keep edge secrets in **`supabase/.env.local`** (see `supabase/.env.example`). `./dev.sh` runs **`supabase start`** only (functions run in that stack). If you use **`supabase functions serve`** separately, add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (see example file). Never commit real secrets.

### 3.5.2 `ui/.env.development` — point Vite at local

Set or replace these (see template in [`ui/.env.example`](../ui/.env.example)):

| Variable                    | Local value                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `VITE_NODE_ENV`             | `development`                                                   |
| `VITE_SUPABASE_URL`         | `http://127.0.0.1:54321/functions/v1`                           |
| `VITE_API_URL`              | Same as `VITE_SUPABASE_URL`                                     |
| `VITE_SUPABASE_ANON_KEY`    | **anon** `eyJ…` from `supabase status`                          |
| `VITE_SUPABASE_PROJECT_URL` | Optional but clear: `http://127.0.0.1:54321`                    |
| `VITE_ADMIN_ALLOWED_EMAILS` | Same comma-separated emails you use for `/sign-in`              |
| `GOOGLE_CLIENT_ID`          | OAuth **Web** client ID (not `VITE_*`; not sent to the browser) |
| `GOOGLE_CLIENT_SECRET`      | Same client’s secret — used by local GoTrue only                |

**Admin Google sign-in (local):** `supabase/config.toml` enables `[auth.external.google]`. Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in this same file; `dev.sh` and `npm run start:supabase` run [`scripts/run-with-ui-dev-env.sh`](../scripts/run-with-ui-dev-env.sh) so those vars are in the environment when the CLI starts Docker. In Google Cloud, add redirect URIs `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:54321/auth/v1/callback` (hosted projects still use the dashboard + `https://<ref>.supabase.co/auth/v1/callback`).

Restart after changing env files (`supabase stop` / `start` if you changed `GOOGLE_*`).

### 3.5.3 Copy **production Postgres data** into local (public schema)

Script: [`scripts/sync-prod-public-data-to-local.sh`](../scripts/sync-prod-public-data-to-local.sh).

1. In the Supabase dashboard: **Connect** → copy a URI that works from your machine. Direct `db.<ref>.supabase.co` is often **IPv6-only**; on IPv4 networks use the **Session pooler** string (host like `…pooler.supabase.com`). URL-encode special characters in the password.
2. Local DB must already reflect your branch migrations (`supabase start` or `supabase db reset`).
3. Run:

   ```bash
   export PROD_DB_URL='postgresql://postgres.<ref>:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres'
   ./scripts/sync-prod-public-data-to-local.sh
   ```

This dumps **`public` data only** into `supabase/.temp/` (gitignored). It does **not** copy Storage objects — file URLs in rows may still point at production buckets.

The script **drops `guest_submissions` CHECK constraints** that prod data may violate (`guest_submissions_status_check`, `valid_dates`, `valid_times`), loads the dump, then runs [`scripts/sql/after-prod-data-restore.sql`](../scripts/sql/after-prod-data-restore.sql): legacy `booked`/`canceled` → new status enum, then re-adds the status CHECK. `valid_dates` / `valid_times` are re-added **`NOT VALID`** so historical bad rows (e.g. check-out before check-in) still load; new/updated rows must pass.

Treat the dump as **PII**; delete it when finished.

### 3.5.4 End-to-end local dev (typical order)

1. **`npm run start:supabase`** or **`./dev.sh`** (loads `ui/.env.development` for `GOOGLE_*` and runs **`npx supabase@latest start`**). Avoid a global `supabase start` if your installed CLI is old (see `storage.buckets` row). For a clean DB only: `npm run db:reset`.
2. Update `ui/.env.development` and `supabase/.env.local` as above.
3. Optional: `./scripts/sync-prod-public-data-to-local.sh` with `PROD_DB_URL`.
4. From repo root: `./dev.sh` **or** `./scripts/run-with-ui-dev-env.sh supabase start` then `cd ui && npm run dev`. Avoid running **`supabase functions serve`** at the same time as `supabase start` (duplicate edge-runtime container / name conflict). If you use `functions serve` alone for hot reload, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `supabase/.env.local` (see `supabase/.env.example`).

### 3.5.5 Troubleshooting `supabase start` (local Postgres unhealthy)

| Symptom                                                                                                          | What to try                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `could not open configuration directory "/etc/postgresql-custom/conf.d"` + `postgresql.conf contains errors`     | Stale Docker volumes vs newer images. From repo root: `supabase stop`, then `docker rm -f supabase_db_guest-form-management` (if present), then `docker volume rm supabase_db_guest-form-management supabase_config_guest-form-management`, then `supabase start` again. **This wipes local DB data.**                                                                                                                                         |
| `failed to resolve reference "…/storage-api:buckets-objects-grants-postgres"`                                    | `supabase/.temp/storage-version` has an invalid tag (sometimes after `supabase link`). Replace with a real image tag (see CLI warning when you run `supabase start`, e.g. `v1.54.0`) or delete the file and re-link.                                                                                                                                                                                                                           |
| `must be owner of table objects` on `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`                      | RLS is already enabled on `storage.objects`; remove that `ALTER` from any migration (see [supabase/cli#4114](https://github.com/supabase/cli/issues/4114)). This repo’s storage migrations follow that rule.                                                                                                                                                                                                                                   |
| `relation "guest_submissions" does not exist` mid-migrate                                                        | Migration filename order: status DDL must run **after** `create_guest_submissions_table`. This repo uses `20250213043909_add_booking_status.sql` for the real `ALTER`; `20250113000000_add_booking_status.sql` is a no-op for legacy history.                                                                                                                                                                                                  |
| `relation "storage.objects" does not exist` on `20240213_storage_policies.sql`                                   | User migrations can run before Storage creates `storage.objects`. That migration is a no-op; policies are in `20250213045323_create_storage_buckets.sql`.                                                                                                                                                                                                                                                                                      |
| `relation "storage.buckets" does not exist` on `20250213045323_*` or later bucket migrations                     | **Old global Supabase CLI** (e.g. v2.40.x) with **Postgres 17** runs user migrations before the platform creates `storage.buckets`. Use **`npm run start:supabase`** / **`./dev.sh`** (`npx supabase@latest`) or `brew upgrade supabase`. Avoid raw `supabase start` if `supabase -v` is far below **~2.80**.                                                                                                                                  |
| `pg_dump` / sync script: `Connection refused` or DNS `Errno 8` for `db.*.supabase.co`                            | Direct DB host is often **IPv6-only**; macOS/Python DNS may differ from `dig`. The sync script resolves via **socket then `dig` fallback**, then adds `hostaddr` (IPv4 or IPv6). **Best:** use the **Session pooler** URI from Connect (IPv4-friendly). Single-line `PROD_DB_URL`; URL-encode special characters in the password.                                                                                                              |
| `supabase_storage_*` unhealthy; logs show `duplicate key value violates unique constraint "migrations_name_key"` | Storage’s **internal** migration ledger in Postgres is corrupt. If `supabase start` logs **`Starting database from backup...`**, a normal stop/start keeps restoring that state — run **`npm run stop:supabase:clean`** (`supabase stop --no-backup --yes`, deletes local data volumes), then **`npm run start:supabase`**. Alternative: `npm run db:reset` from a clean stop. **Wipes local Postgres** — re-run prod data sync if you use it. |
| Edge logs: `Database error: { message: "name resolution failed" }` on `get-booked-dates`                         | Usually `supabase functions serve` with an `--env-file` that omits `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, so `createClient` gets an empty host. Add both from `supabase status`, or use `./dev.sh` (functions run inside `supabase start` with auto-injected vars).                                                                                                                                                                     |
| `failed to create docker container` … `supabase_edge_runtime_…` already in use                                   | Don’t run `supabase start` and `supabase functions serve` together. `docker rm -f supabase_edge_runtime_<project-id>` then `supabase start` again; prefer `./dev.sh` which only starts the stack once.                                                                                                                                                                                                                                         |
| `failed to create docker container` … `supabase_storage_…` already in use                                        | Stale Storage container (crash or partial stop). `npm run stop:supabase`, then `docker rm -f supabase_storage_guest-form-management` (replace suffix with your `project_id` from `supabase/config.toml`), then `npm run start:supabase`. Repeat for any other orphaned `supabase_*_guest-form-management` name the error mentions.                                                                                                             |

**CLI drift:** Root **`package.json`** uses **`npx supabase@latest`** for `start` / `stop` / `status` / `db:reset` so Postgres 17 + Storage ordering stays correct even when `supabase -v` on your PATH is outdated. Upgrade the global CLI with Homebrew when you want `supabase` in the shell to match.

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

You do **not** need to change any Supabase _database_ setting for Phase 1.

### 7.2 Env vars

Added to **`ui/.env.development` only** (safe — the prod file was intentionally not touched):

- `VITE_ADMIN_ALLOWED_EMAILS` — comma-separated list of Google emails allowed to access `/bookings`. Default in dev: `kamehome.azurenorth@gmail.com`.
- `VITE_SUPABASE_PROJECT_URL` — optional override. Unset, the client derives the project URL by stripping `/functions/v1` from `VITE_SUPABASE_URL`.

**For production,** add `VITE_ADMIN_ALLOWED_EMAILS` in the Vercel project env (or wherever the prod UI is built) when you're ready to roll out Phase 1 to production. If the var is missing, the UI allow list is empty and every email is rejected — failing closed is the right default.

**Reference:** a fully documented, placeholder-only template of every UI env var lives at [`ui/.env.example`](../ui/.env.example). The equivalent for edge functions — including variables that land in later phases — is at [`supabase/.env.example`](../supabase/.env.example). Both files are committed; never put real secrets in them.

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
3. Signed in with an allow-listed email → lands on `/bookings`; sees rows from whichever project `VITE_SUPABASE_*` points at (prod by default, or local if you followed §3.5).
4. Signed in with a non-allowed email → generic "access restricted" message with a sign-out CTA (no disclosure of allow-listed addresses).
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
