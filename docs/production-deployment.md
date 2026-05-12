# Production deployment — checkout checklist

Ship **migrations**, **Edge Functions**, **Secrets**, **Google integrations**, **UI env**, then **scheduled jobs** in a safe order.

| Use this doc for…                                          | Jump to **`docs/MIGRATION_RUNBOOK.md`** for…                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ordered cutover + copy-paste commands + compact env tables | Step-by-step **§11** narratives, GCP screenshots-level detail, **`pg_cron`** SQL bodies, Phase history |
| Cron HTTP examples                                         | **`docs/SCHEDULED_JOBS_AND_TESTING.md`** §2–§4                                                         |

**Templates (names + placeholders only):** [`ui/.env.example`](../ui/.env.example) · [`supabase/.env.example`](../supabase/.env.example).

---

## 0. Preconditions

| Requirement    | Notes                                                                |
| -------------- | -------------------------------------------------------------------- |
| Supabase CLI   | Prefer **`npx supabase@latest`**. **`supabase login`**.              |
| Linked project | From repo root: **`supabase link --project-ref <prod-ref>`**.        |
| Dashboard      | Database, Edge Functions → **Secrets**, **Authentication**, Storage. |

Have **production URL(s)** ready for Redirect URIs (**Google A/B**, **`GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS`**) and **Site URL** (Supabase Auth).

Do not **`supabase db push`** until **§1** backup + **§2** preview feel right.

---

## 1. Back up production **before** `db push`

| Plan     | Action                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| **Pro+** | Dashboard → **Database → Backups** — create or confirm a snapshot; note id / time. |
| **Free** | Take a logical **data** snapshot (scheduled backups are absent on Free tier).      |

**Patterns (pick one or both — treat output as PII):**

```bash
# With pooler/direct URI from Dashboard → Connect (URL-encode password; IPv4-only networks often need the pooler host).
# See MIGRATION_RUNBOOK §3.5.3 for URI host notes.
pg_dump "$PROD_DB_URL" --schema=public --no-owner --format=custom -f "${HOME}/Backups/supabase_$(date +%Y%m%d_%H%M).dump"

# Linked project via CLI — include --data-only for rows (schema-only “Dumped schema” is structure only).
npx supabase@latest db dump --linked --data-only -s public --file="${HOME}/backup_data_$(date +%Y%m%d_%H%M).sql"
```

**If `pg_dump` is missing (macOS):** `brew install libpq`, then ensure **`libpq`** `bin/` is on `PATH`; if Homebrew ownership errors, **`sudo chown -R "$(whoami)" /opt/homebrew`**, or use **`db dump`** / a **`postgres`** Docker image to run **`pg_dump`**.

**Optional:** Export Supabase Storage objects if receipts/PDFs must be restorable independently of Postgres.

Never commit dumps; **`supabase_backup_*.sql` / `*.dump`** stay outside git (`~/Backups/` or similar).

_In-repo snapshot table from Phase 0 (`guest_submissions_backup_20260501`) is supplementary — not a substitute for §1._

---

## 2. Preview what will hit the remote

```bash
supabase projects list
supabase link --project-ref <prod-ref>
supabase db diff --linked --schema public
```

Migration filenames shipped in order: **`MIGRATION_RUNBOOK.md` §1.3**. Legacy **`booked` / `canceled`** semantics: **`docs/NEW_FLOW_PLAN.md`** Q1.1 (also embedded in widening / early migrations).

---

## 3. Apply migrations

```bash
supabase db push
```

### Common `db push` issues

| Symptom                                                             | What to try                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Remote migration versions not found in local migrations directory_ | **`npx supabase@latest migration list`**. Recover lost SQL → add **`supabase/migrations/<VERSION>_*.sql`**, **or** **`migration repair <VERSION> --status reverted`** only if schema already matches repo (**`risk:`** removes history row, does not revert DDL — see **`MIGRATION_RUNBOOK.md` §5.1**). |
| _Found local migrations to insert before the last migration…_       | **`npx supabase@latest db push --include-all`**, **or** **`migration repair <VERSION> --status applied`** when live DB already matches that file (**`IF NOT EXISTS`** migrations are safest to replay).                                                                                                 |

**Harmless CLI noise:** **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` unset** while pushing locally — Dashboard Auth carries production Google; local `config.toml` vars are optional for **`db push`**.

### Fast verification after push (Dashboard → SQL Editor)

```sql
SELECT status, count(*) FROM guest_submissions GROUP BY 1 ORDER BY 2 DESC;

SELECT count(*) FROM processed_emails;

SELECT count(*) FROM gmail_listener_state;

-- Optional sanity: confirm new-ish columns appear (adapt to your shipped batch)
\d guest_submissions
```

Full query set / edge cases: **`MIGRATION_RUNBOOK.md` §3** · **§5** step 6.

---

## 4. Deploy Edge Functions

```bash
supabase functions deploy
```

**`supabase/config.toml`** **`static_files`** must bundle email HTML / inline assets for workflow senders (orchestrator **`ENOENT`** if missing — see **`docs/PROJECT.md`** deploy notes).

---

## 5. Dashboard → Edge Function **Secrets**

Mirror **names** into **Project Settings → Edge Functions → Secrets** from **`supabase/.env.example`**. Hosted injects **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** — **do not** duplicate unless you intend to override.

Condensed checklist (duplicate detail in **`MIGRATION_RUNBOOK.md` §11.5**):

| Group                | Must-have names (examples)                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin gate           | **`ADMIN_ALLOWED_EMAILS`** · **`PARKING_OWNER_EMAILS`**                                                                                                                                                  |
| Resend               | **`RESEND_API_KEY`**, **`EMAIL_TO`**, **`EMAIL_REPLY_TO`** ( **`EMAIL_REPLY_TO`** = **New Booking Request** target from **`submit-form`**)                                                               |
| Calendar / Sheets SA | **`GOOGLE_SERVICE_ACCOUNT`**, **`GOOGLE_CALENDAR_ID`**, **`GOOGLE_SPREADSHEET_ID`**                                                                                                                      |
| Gmail                | **`PERMIT_APPROVER_EMAIL`** + **either** (**`GMAIL_API_WEB_CLIENT_JSON`** + **`GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY`** + **`GMAIL_OAUTH_ALLOWED_RETURN_ORIGINS`**) **or** legacy **`GMAIL_OAUTH_*`** secrets |
| SD cron knobs        | **`SD_REFUND_CRON_EMAIL_LEAD_MINUTES`**, **`SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS`** (omit → defaults apply)                                                                                              |

**Omit** **`ENVIRONMENT=development`** style env in prod so Edge softening stays off.

---

## 6. Google Cloud — two OAuth Web clients (+ service account)

| Client                | Role                               | Redirect URI you must whitelist                                         |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| **A — Supabase Auth** | **`/sign-in`** Google OAuth        | **`https://<ref>.supabase.co/auth/v1/callback`**                        |
| **B — Gmail**         | Listener + **`/settings`** Connect | **`https://<ref>.supabase.co/functions/v1/google-mail-oauth-callback`** |

**Service account:** one JSON (**`GOOGLE_SERVICE_ACCOUNT`**), share calendar + spreadsheet with **`client_email`**; enable **Calendar API** + **Sheets API** on the GCP project.

Step-by-step: **`MIGRATION_RUNBOOK.md` §11.3–§11.4**.

---

## 7. Dashboard → Authentication (Google provider)

Hosted projects **ignore** `[auth.external.google]` in `config.toml`; configure here:

1. **Authentication → Providers → Google:** Client **A** id + secret.
2. **URL Configuration → Site URL:** production SPA origin.
3. **Additional Redirect URLs:** localhost, previews, apex/`www`.
4. GCP **Authorized JavaScript origins** must match every SPA origin users sign in from.

---

## 8. UI production environment (hosting build)

| Variable                        | Purpose                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| **`VITE_NODE_ENV`**             | **`production`**                                                               |
| **`VITE_SUPABASE_URL`**         | `https://<ref>.supabase.co/functions/v1`                                       |
| **`VITE_API_URL`**              | Same as **`VITE_SUPABASE_URL`**                                                |
| **`VITE_SUPABASE_ANON_KEY`**    | Dashboard → **Project Settings → API**                                         |
| **`VITE_ADMIN_ALLOWED_EMAILS`** | Same comma list as **`ADMIN_ALLOWED_EMAILS`** (**empty ⇒ UI denies everyone**) |

**Not for Vercel prod:** **`GOOGLE_CLIENT_*`** — those power **local** `supabase start` only.

Rebuild / redeploy the SPA after env changes.

---

## 9. Scheduled jobs (**`pg_cron`** + **`pg_net`** + Vault)

**What **`pg_net`** is:** A Postgres extension ([Supabase: pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)) that adds schema **`net`** and **`net.http_post(url, headers, body, …)`**. The database uses it to **`POST`** to HTTPS—including your **`/functions/v1/…`** URLs. **`pg_cron`** only runs SQL on a schedule; **`pg_net`** is what actually performs the HTTP call.

**Finding it in Dashboard:** **Database → Extensions**, search **`pg_net`** (underscore between `pg` and `net`; not “pgnet”). Still missing → **SQL Editor**:

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;
```

Sanity check: `select extname from pg_extension where extname in ('pg_cron', 'pg_net');`

**Easier UI path:** **Integrations → Cron → Jobs** → Create job → pick **Supabase Edge Function** / HTTP as offered; schedules still assume **`pg_net`** is enabled under the hood ([Cron quickstart](https://supabase.com/docs/guides/cron/quickstart), [Schedule Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)).

**Manual pattern:** Store **`project_url`** + **`anon`** (or **`publishable_key`**) in **Vault**, then **`cron.schedule`** bodies that **`select net.http_post(...)`** with **`Authorization: Bearer …`** and **`body := '{}'::jsonb`** for **`gmail-listener`** and **`sd-refund-cron`**.

Copy-paste SQL + auth notes: **`SCHEDULED_JOBS_AND_TESTING.md`** §2–§4 · **`MIGRATION_RUNBOOK.md` §11.8**.

---

## 10. Gmail workflow (recommended first prod sequence)

1. Confirm Gmail secrets (§5) — **Option A** (encrypt token) **or** **Option B** (legacy secrets).
2. Trigger **`gmail-listener`** once (admin UI or **`curl`**) — initializes **`gmail_listener_state`** at current **`historyId`**.
3. **Optional historical approvals:** **`gmail-backfill-approvals`** with **`dryRun`**, then real batches (**`SCHEDULED_JOBS_AND_TESTING.md` §1.1**).
4. Enable **`pg_cron`** for recurring polls (§9).

---

## 11. Smoke tests (minimal)

Before calling it done:

- [ ] **`/sign-in`** · allow-listed user reaches **`/bookings`**.
- [ ] **`/form`** submits; **`submit-form`** path works; **New Booking Request** hits **`EMAIL_REPLY_TO`** when enabled.
- [ ] **`/sd-form`** when status / gates allow (**`PROJECT.md`** / edge contracts).
- [ ] **`/settings`** Gmail connect (if Option A) succeeds.
- [ ] **`transition-booking`** + integrations (calendar / sheet toggles behave).
- [ ] Cron fires show up in Edge Logs after **`pg_cron`** is live.

Longer checklist: **`MIGRATION_RUNBOOK.md` §11.9**.

---

## 12. Rollback / incidents

Prefer **fix-forward** (correct data SQL + re-**`push`**) unless you staged a downtime restore window.

**Postgres logical restore caveats:** data dump column lists must align with restored schema migrations — mismatched eras break **`INSERT`** / **`COPY`**.

Phase 0 **schema** rollback DDL only (**not** full rewind of every later migration): **`MIGRATION_RUNBOOK.md` §6**.

Migration history repair / **`--include-all`**: **§5.1** ibid., **§3** above table.

---

## Quick command reference

```bash
supabase login
supabase link --project-ref <prod-ref>

supabase db diff --linked --schema public

supabase db push
# …if prompted for include-all during history repair workflows:
# supabase db push --include-all

supabase functions deploy

cd ui && npm ci && npm run build
```

Then finish **Dashboard Secrets (§5)**, **GCP + Auth (§6–§7)**, **UI env (§8)**, **`pg_cron` (§9)**.
