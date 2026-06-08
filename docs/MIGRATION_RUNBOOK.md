# Migration Runbook — New Booking Flow

> **Production cutover (ordered backups → migrations → functions → secrets → Google → UI → cron):** see **[`docs/production-deployment.md`](./production-deployment.md)** for a single checklist with exact commands.
>
> Step-by-step apply + rollback instructions for the redesign in `docs/NEW_FLOW_PLAN.md`.
> Every step is **additive and reversible** on Phase 0. Later phases (1–6) introduce behavior change and must be deployed in order.
>
> **⚠ Production safety.** The migration files in `supabase/migrations/` **do not run automatically**. They only execute when you:
>
> - run `supabase start` / `supabase db reset` (local Postgres on port **54322** only), **or**
> - explicitly run `supabase db push --linked` / `supabase db push --db-url <…>` (remote).
>
> **Never** run `supabase db push` against prod until §5 ("Applying to production") has been read end-to-end and a backup is confirmed. After migrations and function deploy, complete **§11** for Dashboard auth, Edge secrets, Google Cloud, UI env, and **`pg_cron`** scheduling.
>
> The UI `.env.development` may point at hosted Supabase — treat prod-linked URLs as sensitive. Phase 0 migrations are additive SQL only; full stack behavior also depends on shipped Edge Functions and UI (see `docs/TODOS.md`).

---

## 1. What Phase 0 changes

Phase 0 is the **`20260501000000`–`20260501000010`** batch: **backup snapshot**, **nullable columns** on `guest_submissions`, **`processed_emails` + `gmail_listener_state`**, and **four storage buckets**. No application code deploy is required for these files alone — but **nothing in production should rely on new workflow columns until Edge/UI for later phases is deployed**.

### 1.0 How files run

`supabase start`, `supabase db reset`, and `supabase db push` apply **every** file under `supabase/migrations/` in **lexicographic order** by filename. Besides Phase 0, your repo includes **older** baseline migrations (`202402*`, `202502*`, …) and **newer** Phase 2+ migrations (`202604*`, `20260502*`, …). A greenfield local reset therefore installs **the whole chain**, not “Phase 0 only.”

### 1.1 Phase 0 batch (execute-ready)

| File                                                    | Purpose                                                                                                                                                                    | Rollback hint                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `20260501000000_backup_guest_submissions.sql`           | **Idempotent:** creates `guest_submissions_backup_20260501` as `CREATE TABLE … AS TABLE guest_submissions` if missing (data-only copy; comment on table).                  | `DROP TABLE IF EXISTS guest_submissions_backup_20260501;`                                                |
| `20260501000002_add_workflow_columns.sql`               | Nullable pricing/parking/pet/SD arrays + `status_updated_at`, `settled_at`; partial index on `status_updated_at`.                                                          | Drop columns + index (see §6).                                                                           |
| `20260501000003_add_approved_pdf_columns.sql`           | Nullable `approved_gaf_pdf_url`, `approved_pet_pdf_url`.                                                                                                                   | `DROP COLUMN …`                                                                                          |
| `20260501000004_add_is_test_booking.sql`                | **`is_test_booking`** + partial index (historical). **Superseded** by `20260608120000_drop_is_test_booking.sql` on current branch — new installs add then drop the column. | N/A if drop migration applied; else `DROP COLUMN IF EXISTS is_test_booking` (+ index drops with column). |
| `20260501000005_create_processed_emails_table.sql`      | `processed_emails` for Gmail listener dedupe.                                                                                                                              | `DROP TABLE IF EXISTS processed_emails;`                                                                 |
| `20260501000006_create_parking_endorsements_bucket.sql` | Public bucket **`parking-endorsements`** (+ RLS policies).                                                                                                                 | Delete objects, then `DELETE FROM storage.buckets WHERE id = 'parking-endorsements';`                    |
| `20260501000007_create_approved_gafs_bucket.sql`        | Private buckets **`approved-gafs`**, **`approved-pet-forms`** (+ service_role policies).                                                                                   | Delete objects; remove bucket rows + policies.                                                           |
| `20260501000008_create_sd_refund_receipts_bucket.sql`   | Private bucket **`sd-refund-receipts`** (+ policies).                                                                                                                      | Same pattern.                                                                                            |
| `20260501000009_create_gmail_listener_state.sql`        | Table **`gmail_listener_state`** (`historyId` cursor).                                                                                                                     | `DROP TABLE IF EXISTS gmail_listener_state;`                                                             |
| `20260501000010_gaf_pet_request_pdf_urls.sql`           | Nullable **`gaf_request_pdf_url`**, **`pet_request_pdf_url`** (filled PDFs from admin transition; distinct from approved URLs).                                            | `DROP COLUMN IF EXISTS …`                                                                                |

### 1.2 Out of scope for Phase 0 (different files)

- **`status` widen + legacy backfill** → **`20260502000000_widen_status_enum.sql`** (Phase 2 in `docs/NEW_FLOW_PLAN.md` §5).
- **Test-booking column removal** → **`20260608120000_drop_is_test_booking.sql`** (ships **after** `20260501000004` on a full migrate; safe `DROP COLUMN IF EXISTS`).
- **All other `202605*` / `202606*` migrations** (SD refund columns, `PENDING_DOCUMENTS`, vouchers, Gmail OAuth table, etc.) → **§1.3**.

### 1.3 Booking-flow migrations outside the Phase 0 batch

Supabase applies migrations in **filename sort order**. Among workflow redesign files:

1. **`20260428120000_add_pending_documents_parent_status.sql`** runs **before** `20260501000000_backup_guest_submissions.sql` (lexicographically: `20260428…` sorts before `20260501…`).
2. The **Phase 0 batch** (`20260501000000`–`20260501000010`) runs next — see **§1.1**.
3. Everything below runs **after** `20260501000010_*`:

| File                                                                      | Purpose (short)                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `20260502000000_widen_status_enum.sql`                                    | New workflow `status` literals + legacy row backfill  |
| `20260503000000_add_sd_refund_details_status.sql`                         | Guest SD form columns + `READY_FOR_CHECKOUT`          |
| `20260504000000_sd_settlement_line_items.sql`                             | JSONB line items + sync from numeric arrays           |
| `20260530120000_guest_additional_fee.sql`                                 | `guest_additional_fee` column                         |
| `20260531120000_fix_guest_submissions_status_check_pending_documents.sql` | Status CHECK allows `PENDING_DOCUMENTS`               |
| `20260527120000_finance_line_items.sql`                                   | `finance_line_items` operating expense/income table   |
| `20260601120000_finance_line_items_recurrence.sql`                        | Recurrence columns (local / fresh reset order)        |
| `20260601130000_gmail_mail_oauth_integration.sql`                         | `gmail_mail_integration` + OAuth state                |
| `20260708120000_finance_line_items_recurrence.sql`                        | Recurrence catch-up for hosted DBs that already applied `20260601120000` as Gmail |
| `20260602120000_document_substep_manual_incomplete.sql`                   | Manual incomplete flags / doc pipeline                |
| `20260603120000_guest_balance_settlement.sql`                             | Guest balance settlement columns                      |
| `20260604140000_parking_owner.sql`                                        | `parking_owner` display name                          |
| `20260605120000_rename_status_to_ready_for_checkout.sql`                  | Rename intermediate status to `READY_FOR_CHECKOUT`    |
| `20260606120000_next_stay_voucher.sql`                                    | Next-stay voucher columns                             |
| `20260607120000_drop_sd_refund_cash_pickup_note.sql`                      | Drops legacy cash pickup note column                  |
| `20260607130000_sd_refund_bank_gotyme.sql`                                | SD refund bank allow-list (GCash / GoTyme / Maribank) |
| `20260608120000_drop_is_test_booking.sql`                                 | Drops `is_test_booking`                               |

See also **§9** for SD bank allow-list rollback notes.

---

## 2. Pre-flight checklist (local first)

1. Confirm you are on the `guest-form-management` repo branch you intend to ship from.
2. Stop any running local Supabase: `npm run stop:supabase`.
3. (Optional) Wipe local DB to start clean: `supabase db reset` — this **only** affects the local container, never prod.
4. Inspect the new files:

   ```bash
   ls supabase/migrations/ | tail -n 20
   ```

5. Dry-read Phase 0 SQL (**§1.1**): no `DROP TABLE guest_submissions`, no raw `ALTER` on legacy `status` (that lives in **`20260502000000_widen_status_enum.sql`**).

---

## 3. Apply locally (safe)

```bash
# Starts local Postgres + Storage + edge runtime and applies ALL migrations.
supabase start
```

Verify:

```sql
-- Expected Phase 0 columns (nullable): booking_rate, down_payment, approved_*_pdf_url,
-- gaf_request_pdf_url, pet_request_pdf_url, status_updated_at, settled_at, …
\d guest_submissions
-- Expected backup table exists with same row count at snapshot time:
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
   npm run sync:prod-data
   ```

   Or add `PROD_DB_URL=…` to `supabase/.env.local` (see `supabase/.env.example`). After `db:reset`, re-apply a cached dump without prod access: **`npm run sync:prod-data:restore`** (`RESTORE_ONLY=1`, uses `supabase/.temp/prod_public_data.sql`).

This dumps **`public` data only** into `supabase/.temp/` (gitignored). It does **not** copy Storage objects — file URLs in rows may still point at production buckets.

The script **drops `guest_submissions` CHECK constraints** that prod data may violate (`guest_submissions_status_check`, `valid_dates`, `valid_times`), loads the dump, then runs [`scripts/sql/after-prod-data-restore.sql`](../scripts/sql/after-prod-data-restore.sql): legacy `booked`/`canceled` → new status enum, then re-adds the status CHECK. `valid_dates` / `valid_times` are re-added **`NOT VALID`** so historical bad rows (e.g. check-out before check-in) still load; new/updated rows must pass. After migration `20260623120000_normalize_time_columns_to_24h`, `valid_times` expects **24-hour `HH:MM`** (e.g. `14:00`), not AM/PM — see `20260625130000_valid_times_24h_constraint.sql`.

Treat the dump as **PII**; delete it when finished.

### 3.5.4 End-to-end local dev (typical order)

1. **`npm run start:supabase`** or **`./dev.sh`** (loads `ui/.env.development` for `GOOGLE_*` and runs **`npx supabase@latest start`**). Avoid a global `supabase start` if your installed CLI is old (see `storage.buckets` row). For a clean DB only: `npm run db:reset`.
2. Update `ui/.env.development` and `supabase/.env.local` as above.
3. Optional: `npm run sync:prod-data` (or `sync:prod-data:restore` after a prior dump).
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
| `pg_dump`: `tenant/user postgres.<ref> not found` on `*.pooler.supabase.com`                                     | Pooler reached the server but **host or username does not match your project**. In Dashboard → **Connect**, choose **Session** (not Transaction), copy the full URI (host may be `aws-1-…` not `aws-0-…`; port **5432** not **6543**). Username must be `postgres.<reference-id>` from **Project Settings → General**. Reset DB password on **Database → Settings** if needed; URL-encode special chars in `PROD_DB_URL`. |
| `duplicate key` on `gmail_mail_oauth_state_pkey` during restore                                                  | Re-run sync (script truncates `gmail_mail_oauth_state` before restore). Or `TRUNCATE gmail_mail_oauth_state;` then `npm run sync:prod-data:restore`. OAuth state rows are ephemeral CSRF tokens — safe to clear locally.                                                                                                                                                                                                                        |
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

Follow **`docs/production-deployment.md`** for the full production checklist (backups, CLI, secrets, Google, hosting, `pg_cron`). The steps below are the **database push** slice.

**Do not skip any step.**

1. Backup the DB: **Pro+** Dashboard → Database → Backups; **Free** → **`pg_dump`** (pooler URI from **Connect** — **§3.5.3** URI guidance) **and/or** **`npx supabase@latest db dump --linked --data-only`**; keep dumps **off git** (**PII**).
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
6. Smoke-test **`/form`** submit/update and admin **`/bookings`** flows against staging/prod expectations (workflow emails and transitions ship with Edge Functions + migrations — regression testing advised).
7. **Production integrations:** deploy Edge Functions if needed, then set **Supabase Edge secrets**, **Authentication → Google**, **UI (Vercel) env**, **Google service account / Gmail OAuth**, and **`pg_cron`** per **§11** below.

### 5.1 `db push`: “Remote migration versions not found in local migrations directory”

The linked database’s **`supabase_migrations.schema_migrations`** lists a **version** with **no matching file** `supabase/migrations/<VERSION>_*.sql` in your repo.

1. Inspect: **`npx supabase@latest migration list`** — note orphan **Remote** versions.
2. **Preferred:** Recover the SQL that actually ran remotely (branch, teammate, Dashboard SQL history) and add **`supabase/migrations/<VERSION>_short_name.sql`** with that DDL; **`db push`** again.
3. **If the history row is wrong** but live schema matches your committed migrations (**`supabase db diff --linked`**): **`npx supabase@latest migration repair <VERSION> --status reverted`** then **`db push`**. **`repair`** only adjusts the history table — it **does not** roll back DDL; if that migration created objects your chain would recreate, you may hit **already exists**.
4. **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` warnings** from the CLI during push/dump: harmless if OAuth is configured in Dashboard for hosted projects.

After **`repair --status reverted`**, if **`db push`** says **found local migrations to insert before the last migration on remote** — run **`npx supabase@latest db push --include-all`**, or **`migration repair <MISSING_VERSION> --status applied`** when live schema already matches that file (**`migration list`** to see gaps). Prefer eyeballing the SQL (**`IF NOT EXISTS`** migrations are safest to replay).

---

## 6. Rollback

This section reverses **only** the Phase 0 batch artifacts from **§1.1** (backup snapshot table, Phase 0 columns, buckets, `processed_emails`, `gmail_listener_state`). It does **not** undo **`status` enum widening**, SD refund columns, or other migrations listed in **§1.3** — for those, use a **dashboard backup restore** or author inverse migrations.

`DROP COLUMN IF EXISTS is_test_booking` is a no-op if **`20260608120000_drop_is_test_booking.sql`** already ran.

Rollback order (opposite of apply) for Phase 0 schema:

```sql
-- Run each as its own statement, only the ones you actually applied.
DROP INDEX IF EXISTS idx_guest_submissions_status_updated_at;
DROP TABLE IF EXISTS gmail_listener_state;
DELETE FROM storage.buckets WHERE id IN
  ('parking-endorsements','approved-gafs','approved-pet-forms','sd-refund-receipts');
DROP TABLE IF EXISTS processed_emails;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS is_test_booking;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS pet_request_pdf_url;
ALTER TABLE guest_submissions DROP COLUMN IF EXISTS gaf_request_pdf_url;
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

## 7. ✅ Phase 1 — Admin auth + read-only `/bookings` (shipped)

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

The UI allow list (`VITE_ADMIN_ALLOWED_EMAILS`) is **UX-only**. **Authoritative enforcement** is **`ADMIN_ALLOWED_EMAILS`** on Edge Functions via **`verifyAdminJwt`** (`list-bookings`, `transition-booking`, `upload-booking-asset`, `parking-broadcast-email`, etc.). Existing **`guest_submissions` RLS** may still allow broad read for authenticated users depending on project policies — treat **`ADMIN_ALLOWED_EMAILS`** + JWT as the gate for **mutating** admin APIs; tighten RLS separately if you require stronger isolation at the PostgREST layer.

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

## 8. Phase 2–6 status (this repo)

| Phase | Scope                                            | Runbook / detail                                                                                    |
| ----- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **2** | `status` widen + backfill                        | **`20260502000000_widen_status_enum.sql`** — see **`docs/NEW_FLOW_PLAN.md` §5** and **§1.3** above. |
| **3** | Admin edge functions + transition UI             | Shipped — verify **`supabase/config.toml`** + **`docs/PROJECT.md` §8**.                             |
| **4** | `gmail-listener`, `sd-refund-cron`               | Shipped — **`docs/SCHEDULED_JOBS_AND_TESTING.md`**.                                                 |
| **5** | `submit-form` cleanup + no test-booking pipeline | Shipped — includes **`20260608120000_drop_is_test_booking.sql`**.                                   |
| **6** | Calendar + Sheet backfill script                 | **Not shipped** as a dedicated migration yet — still planned in **`docs/NEW_FLOW_PLAN.md` §5**.     |

Incremental schema after Phase 0 is enumerated in **§1.3** (filenames + purposes). **Production** Dashboard secrets, Google OAuth, Vercel `VITE_*`, and **`pg_cron`**: **§11**.

---

## 9. Additive: `sd_refund_bank` allow-list (June 2026)

| File                                       | Purpose                                                                                                                                                                                            | Reversible?                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `20260607130000_sd_refund_bank_gotyme.sql` | Sets **`sd_refund_bank`** to **NULL** where it was **`BDO`** or **`BPI`**, then replaces **`guest_submissions_sd_refund_bank_check`** with **`GCash` \| `GoTyme` \| `Maribank`** only (plus NULL). | Yes — reinstate the old `IN (...)` list only after fixing any disallowed rows. |

---

## 11. Production configuration & secrets (Supabase, Google, hosting)

Use this **after** migrations (**§5**) and Edge Function deploys. Canonical env templates: **[`supabase/.env.example`](../supabase/.env.example)** (Edge secrets — mirror into Dashboard) and **[`ui/.env.example`](../ui/.env.example)** (Vite / SPA). Full narrative also lives in **`docs/PROJECT.md` §11–§12**.

### 11.1 Recommended order

1. Run **`supabase db push`** (or CI equivalent) — **§5**.
2. Deploy functions: e.g. **`supabase functions deploy`** (or your pipeline) so hosted code matches `supabase/config.toml` (`verify_jwt`, **`static_files`** for HTML templates / inline email assets such as **`email-assets/*.jpg`**).
3. **Supabase Dashboard → Project Settings → Edge Functions → Secrets** — set every secret in **§11.5** you need (hosted injects `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` automatically).
4. **Supabase Dashboard → Authentication** — Google provider + URL configuration — **§11.2**.
5. **Google Cloud** — OAuth clients (**§11.3**) and service account (**§11.4**).
6. **UI host (e.g. Vercel)** — production **`VITE_*`** vars — **§11.6**.
7. **Database → Extensions / SQL** — enable **`pg_cron`** + **`pg_net`**, store Vault secrets, schedule **`gmail-listener`** and **`sd-refund-cron`** — **§11.8** (detail: **`docs/SCHEDULED_JOBS_AND_TESTING.md`**).

### 11.2 Supabase Dashboard — Authentication (Google sign-in for `/sign-in`)

Hosted projects **do not** read `supabase/config.toml` `[auth.external.google]` from your laptop — configure in the **Dashboard**.

1. Google Cloud Console → **APIs & Services → Credentials** → **OAuth 2.0 Client IDs** → **Web application** (see **§11.3 Client A**).
2. Supabase → **Authentication → Providers → Google** → enable; paste **Client ID** and **Client secret**.
3. **Authentication → URL Configuration**:
   - **Site URL:** primary production SPA origin (e.g. `https://kamehomes.space`).
   - **Additional Redirect URLs:** every origin that must complete OAuth (`http://localhost:5173`, preview URLs, `www` vs apex, etc.).
4. Google Cloud → **Authorized redirect URIs** must include **`https://<project-ref>.supabase.co/auth/v1/callback`** (exact string from Supabase **Authentication → Providers** helper text).

### 11.3 Google Cloud — two OAuth “Web” clients (do not confuse them)

| Client                | Purpose                                                              | Redirect URI(s)                                                             | Where the secret lives                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — Supabase Auth** | Admin (and any) **Google sign-in** via Supabase GoTrue               | `https://<project-ref>.supabase.co/auth/v1/callback`                        | Supabase Dashboard → Auth → Google provider                                                                                                                              |
| **B — Gmail API**     | **`gmail-listener`** + optional **Connect Gmail** on **`/settings`** | `https://<project-ref>.supabase.co/functions/v1/google-mail-oauth-callback` | Edge secret **`GMAIL_API_WEB_CLIENT_JSON`** (+ encryption key); **or** legacy **`GMAIL_OAUTH_CLIENT_JSON`** / **`GMAIL_OAUTH_TOKEN_JSON`** from **`npm run gmail-auth`** |

Use **separate** OAuth clients for A vs B so redirect URIs and rotation policies stay clear.

For **Client B**, add **Authorized JavaScript origins** matching your production SPA origin(s) (used during OAuth start). Set **`GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS`** (Edge secret) to the same origins (comma-separated).

### 11.4 Google Cloud — Service account (Calendar + Sheets)

1. Create a **service account**; enable **Google Calendar API** and **Google Sheets API** on the GCP project.
2. Create a JSON key; stringify as **one line** for Edge secret **`GOOGLE_SERVICE_ACCOUNT`** (escape newlines in `private_key` as `\n` — see **`supabase/.env.example`**).
3. **`GOOGLE_CALENDAR_ID`** — calendar ID or owner email the SA can write (share the calendar with the SA **`client_email`**).
4. **`GOOGLE_SPREADSHEET_ID`** — ID from the Sheet URL; share the spreadsheet with the SA **`client_email`** (**Editor**).

### 11.5 Edge Function secrets (Supabase Dashboard)

Copy names from **`supabase/.env.example`**. Typical production set:

| Group                              | Variables                                                                                                                       | Notes                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin / workflow**               | **`ADMIN_ALLOWED_EMAILS`**                                                                                                      | Comma-separated; **authoritative** allow list for **`verifyAdminJwt`**. Must align operationally with **`VITE_ADMIN_ALLOWED_EMAILS`**.                                            |
|                                    | **`PARKING_OWNER_EMAILS`**                                                                                                      | BCC list for parking broadcast — **`docs/NEW_FLOW_PLAN.md` §6.1 Q4.1** seed; rotate via env only.                                                                                 |
| **Email (Resend)**                 | **`RESEND_API_KEY`**, **`EMAIL_TO`**, **`EMAIL_REPLY_TO`**                                                                      | Production vs dev routing — see **`.env.example`**. **`EMAIL_REPLY_TO`** is also the **To:** address for **New Booking Request** (`submit-form` → `sendNewBookingRequestNotify`). |
|                                    | **`EMAIL_LOGO_URL`**, **`PUBLIC_GUEST_APP_ORIGIN`**, **`FACEBOOK_REVIEWS_URL`**                                                 | Optional guest links / branding (`docs/PROJECT.md` §11).                                                                                                                          |
| **Google APIs**                    | **`GOOGLE_SERVICE_ACCOUNT`**, **`GOOGLE_CALENDAR_ID`**, **`GOOGLE_SPREADSHEET_ID`**                                             | **§11.4**.                                                                                                                                                                        |
| **Gmail listener / Connect Gmail** | **`EMAIL_TO`** (Documents Approver in Settings) — allowed **From** on GAF/Pet approval replies when set; blank = permissive |
|                                    | **Option 1:** **`GMAIL_API_WEB_CLIENT_JSON`**, **`GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY`**, **`GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS`** | In-app Connect Gmail + encrypted refresh token in DB.                                                                                                                             |
|                                    | **Option 2:** **`GMAIL_OAUTH_CLIENT_JSON`**, **`GMAIL_OAUTH_TOKEN_JSON`**                                                       | Legacy **`npm run gmail-auth`** refresh token in secrets.                                                                                                                         |
|                                    | **`SUPABASE_PUBLIC_URL`** _(optional)_                                                                                          | Public API origin if Edge-internal `SUPABASE_URL` breaks Gmail redirect URI construction — see **`docs/PROJECT.md` §11**.                                                         |
| **SD refund cron**                 | **`SD_REFUND_CRON_EMAIL_LEAD_MINUTES`**, **`SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS`**                                             | Defaults **120** / **21** — **`.cursor/rules/admin-auth.mdc` §7**.                                                                                                                |
| **Dev-only softness**              | **`ENVIRONMENT`**, **`DENO_ENV`**                                                                                               | Usually **omit** in prod so **`isDevelopment()`** stays false; **`DENO_DEPLOYMENT_ID`** is set automatically on hosted Edge.                                                      |

### 11.6 UI production env (e.g. Vercel)

Set in the **production** build environment (`npm run build` reads **`ui/.env.production`** locally; Vercel uses project **Environment Variables**):

| Variable                        | Purpose                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| **`VITE_NODE_ENV`**             | **`production`** — guest form production behavior.                                                |
| **`VITE_SUPABASE_URL`**         | `https://<ref>.supabase.co/functions/v1`                                                          |
| **`VITE_API_URL`**              | Same as **`VITE_SUPABASE_URL`**.                                                                  |
| **`VITE_SUPABASE_ANON_KEY`**    | Dashboard → **Project Settings → API** → anon **public** key.                                     |
| **`VITE_ADMIN_ALLOWED_EMAILS`** | Same comma-separated list as **`ADMIN_ALLOWED_EMAILS`** (UX gate). Empty ⇒ everyone denied at UI. |
| **`VITE_SUPABASE_PROJECT_URL`** | Optional; default derives from **`VITE_SUPABASE_URL`**.                                           |

**Note:** **`GOOGLE_CLIENT_ID`** / **`GOOGLE_CLIENT_SECRET`** in **`ui/.env.development`** exist for **local** `supabase start` + **`config.toml`** substitution only. **Hosted** Auth uses **Dashboard** credentials (**§11.2**), not Vite env.

### 11.7 Deploy Edge Functions

From repo root (linked project):

```bash
supabase functions deploy
```

Or deploy named functions only if your pipeline splits bundles. Ensure **`supabase/config.toml`** lists **`static_files`** for every function that sends email (templates + **`email-assets`** JPEG for ready-for-check-in QR CID) — mismatches cause **`ENOENT`** at runtime.

### 11.8 Scheduled jobs (`pg_cron` + Vault)

Hosted schedules are **not** defined in **`config.toml`** (local CLI limitation). On Supabase Cloud:

1. Enable **`pg_cron`** and **`pg_net`** (SQL Editor or Dashboard → **Database → Extensions**).
2. Store **`project_url`** (e.g. `https://<ref>.supabase.co`) and the **`anon`** JWT (**Dashboard → Project Settings → API**) in **Vault** — same pattern as Supabase’s scheduling guide.
3. Schedule **`net.http_post`** to **`/functions/v1/gmail-listener`** and **`/functions/v1/sd-refund-cron`** with **`Authorization: Bearer <anon_key>`** and body **`{}`** (both functions use **`verify_jwt = false`**; **`anon`** matches \*\*`docs/SCHEDULED_JOBS_AND_TESTING.md` §2–§4).

Full SQL patterns, security notes, and local curl testing: **`docs/SCHEDULED_JOBS_AND_TESTING.md`**.

### 11.9 Post-deploy smoke checklist

- [ ] **`/sign-in`** → Google OAuth → **`/bookings`** loads for allow-listed email.
- [ ] **`/form`** guest submit + **`/sd-form`** when eligible (status + emailed-at gates).
- [ ] Admin **transition** on a test booking (calendar color/title + sheet row if toggles on).
- [ ] Outbound **email** received (Resend dashboard / inbox).
- [ ] **Run Gmail poll now** / **Run SD refund cron now** from booking detail (scoped JWT) succeeds.
- [ ] After **`pg_cron`** is live, confirm **`gmail-listener`** / **`sd-refund-cron`** invocations in **Edge Logs** on schedule.

**Templates:** [`supabase/.env.example`](../supabase/.env.example) · [`ui/.env.example`](../ui/.env.example) · **`docs/PROJECT.md` §11** · **`docs/SCHEDULED_JOBS_AND_TESTING.md`**
