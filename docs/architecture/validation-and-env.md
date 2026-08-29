---
title: 'Form validation and environment variables'
status: active
tags: [architecture]
updated: 2026-08-27
---

# Form validation and environment variables

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 10. Form validation (UI)

`ui/src/features/guest/form/schemas/guestFormSchema.ts` (Zod):

- **Phone**: Philippines `09` + 9 digits (11 total).
- **Address**: `City, Province` pattern.
- **Guests**: up to **4** additional guests on step 1 — each with **name**, **age**, and **valid ID** when age ≥ 18; `numberOfAdults` / `numberOfChildren` are derived (age ≤ 5 = child). Primary guest name **pre-fills from the contact name** and stays editable.
- **Parking / pets**: conditional required fields.
- **Same-day stay**: check-out time must be after check-in time when dates equal.
- **Files**: `paymentReceipt` required for Facebook bookings; `validId` / `guest2ValidId` / `guest3ValidId` / `guest4ValidId` / `guest5ValidId` required when the matching guest is 18+; pet files required when `hasPets`.

---

## 11. Environment variables

### Files (templates vs secrets)

| File                                                              | Purpose                               |
| ----------------------------------------------------------------- | ------------------------------------- |
| `ui/.env.example`                                                 | UI var inventory (placeholders)       |
| `ui/.env.development.local.example`                               | Local-stack UI-only template          |
| `ui/.env.development.dev.example`                                 | Hosted-dev UI template                |
| `supabase/.env.example`                                           | Edge secrets inventory (placeholders) |
| `supabase/.env.dev.example`                                       | Dev project deploy + `dev:remote-api` |
| `supabase/.env.prod.example`                                      | Multi-tenant prod bootstrap template  |
| Gitignored `*.local`, `.env.development`, `.env.production`, etc. | Real values — never commit            |

**Backups:** `.env-backups/<date>/` (gitignored). Re-format after edits: `bun scripts/dev/reorganize-env-files.mjs`.

**Format:** Short `# Section` headers; optional vars commented in `*.example` only. Operator settings (email, payment, Telegram) live in DB — not env.

### Secrets hygiene

| Safe in git (`*.example`, docs)                    | Never commit                                                   |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Placeholder names and fake values                  | `*.local`, real `.env.development` / `.env.production`         |
| Project ref in operator docs (semi-public in URLs) | Service role key, anon JWT (real), DB pooler URIs, API secrets |
| GitHub secret **names** in workflow docs           | GitHub secret **values**                                       |

Production hosted secrets: Supabase Dashboard → Edge Functions → Secrets. UI `VITE_*`: Vercel project env. Checklist: **`docs/archive/operations/migration-runbook.md`** §11.

---

### 11.1 UI (`ui/.env` / Vercel)

| Variable                          | Required   | Notes                                                                                               |
| --------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`               | Yes        | Edge Functions base URL **with** `/functions/v1`                                                    |
| `VITE_API_URL`                    | Yes        | Same as `VITE_SUPABASE_URL` (guest form fetchers)                                                   |
| `VITE_SUPABASE_ANON_KEY`          | Yes        | Public anon key                                                                                     |
| `VITE_NODE_ENV`                   | Yes        | `production` toggles guest-form prod behavior                                                       |
| `VITE_SUPABASE_PROJECT_URL`       | No         | Override Supabase JS project URL (hybrid `dev:remote-api`)                                          |
| `VITE_SUPER_ADMIN_EMAILS`         | No         | Comma-separated — `/admin/*` UX only; server uses `SUPER_ADMIN_EMAILS`                              |
| `VITE_GOOGLE_MAPS_API_KEY`        | No         | Property Settings location picker                                                                   |
| `VITE_INBOX_MOCK_DATA`            | No         | `true` → inbox mock mode                                                                            |
| `VITE_DISABLE_IMAGE_OPTIMIZATION` | No         | `1` → client image compression becomes a no-op (kill switch). See [`storage.md`](./storage.md) §7.1 |
| `GOOGLE_CLIENT_ID`                | Local only | GoTrue Google OAuth — **not** `VITE_*`; loaded before `supabase start`                              |
| `GOOGLE_CLIENT_SECRET`            | Local only | Pair with `GOOGLE_CLIENT_ID`                                                                        |

**Removed / unused:** `VITE_SUPABASE_DB_PASSWORD` — not read by the app.

**Local GoTrue:** After changing `GOOGLE_*` or `supabase/config.toml` `[auth.external.google]`, run `bun run stop:supabase` then `./dev.sh` so the auth container picks up `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`.

---

### 11.2 Edge secrets (`supabase/.env.local` / Dashboard)

#### Platform-injected (hosted)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — set by Supabase on deploy.
- `DENO_DEPLOYMENT_ID` — production signal (auto).

#### Local `functions serve` aliases

When invoking `supabase functions serve` manually, `./dev.sh` / `bun run dev:api` merge `API_URL` + `SERVICE_ROLE_KEY` from `supabase status` via `scripts/dev/build-local-functions-env.sh` (CLI skips `SUPABASE_*` in `--env-file`).

#### Core

| Variable                                 | Notes                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `ENVIRONMENT` / `DENO_ENV`               | `development` → `isDevelopment()` in `_shared/utils.ts`                        |
| `ADMIN_ALLOWED_EMAILS`                   | Legacy platform admin allow list (`verifyAdminJwt`)                            |
| `SUPER_ADMIN_EMAILS`                     | `/admin/*`, `serveSuperAdmin`                                                  |
| `PUBLIC_GUEST_APP_ORIGIN`                | Guest email/deep links; legacy `org_settings.public_guest_app_origin` fallback |
| `PUBLIC_API_URL` / `SUPABASE_PUBLIC_URL` | Public API base for Meta OAuth/webhooks; ngrok local dev                       |

#### Email (Resend)

| Variable                         | Notes                                                  |
| -------------------------------- | ------------------------------------------------------ |
| `RESEND_API_KEY`                 | Outbound + inbound attachment fetch                    |
| `RESEND_FROM_EMAIL`              | Optional verified From; else property `email_reply_to` |
| `RESEND_INBOUND_WEBHOOK_SECRET`  | Svix secret for `approval-email-webhook`               |
| `RESEND_APPROVAL_INBOUND_DOMAIN` | Plus-address domain, e.g. `inbound.kamehomes.space`    |
| `SUPPORT_TEAM_EMAIL`             | Help & Support ticket notify inbox                     |

**Email routing (`EMAIL_TO`, `EMAIL_REPLY_TO`, parking BCC):** **`app_settings`** / **`org_settings`** — not env.

#### Encryption

| Variable                           | Notes                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY` | 32-byte hex/base64 — encrypts Telegram tokens at rest (legacy name)           |
| `SETTINGS_VERIFICATION_SECRET`     | HMAC for settings OTP tokens; falls back to encryption key, then service role |

#### AI

| Variable          | Notes                                    |
| ----------------- | ---------------------------------------- |
| `GEMINI_API_KEYS` | Comma-separated (local/dev rotation)     |
| `GEMINI_API_KEY`  | Single key — **required for production** |
| `GROQ_API_KEY`    | Fallback when Gemini fails               |

#### Meta (Guest Inbox + Marketing publish)

| Variable                               | Notes                   |
| -------------------------------------- | ----------------------- |
| `META_APP_ID`, `META_APP_SECRET`       | Developer app           |
| `META_INBOX_TOKEN_ENCRYPTION_KEY`      | Page token encryption   |
| `META_WEBHOOK_VERIFY_TOKEN`            | Webhook GET verify      |
| `META_OAUTH_ALLOWED_RETURN_ORIGINS`    | SPA origins after OAuth |
| `META_OAUTH_EXCLUDE_PUBLISHING_SCOPES` | `1` = inbox-only OAuth  |
| `META_OAUTH_EXTRA_SCOPES`              | Comma-separated extras  |

#### PayMongo

| Variable                  | Notes                                |
| ------------------------- | ------------------------------------ |
| `PAYMONGO_SECRET_KEY`     | Org subscriptions + parking checkout |
| `PAYMONGO_WEBHOOK_SECRET` | HMAC in `paymongo-webhook`           |

#### Integrations (optional)

| Variable            | Notes                               |
| ------------------- | ----------------------------------- |
| `JAMENDO_CLIENT_ID` | Marketing Studio video music browse |

#### Legacy env fallbacks (prefer DB)

| Variable                                                            | Replaced by                                    |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| `FACEBOOK_REVIEWS_URL`, `AIRBNB_URL`, `INSTAGRAM_URL`, `TIKTOK_URL` | `org_settings` / `app_settings` social columns |

#### Cron webhook secrets (optional)

When set, matching cron endpoints require the corresponding header. See **`docs/archive/operations/scheduled-jobs-and-testing.md`**.

| Variable                                     | Header                                         |
| -------------------------------------------- | ---------------------------------------------- |
| `TELEGRAM_CRON_SECRET`                       | `X-Telegram-Cron-Secret`                       |
| `TELEGRAM_STAFF_CRON_SECRET`                 | `X-Telegram-Cron-Secret`                       |
| `TELEGRAM_ADMIN_CRON_SECRET`                 | `X-Telegram-Cron-Secret`                       |
| `TELEGRAM_FINANCE_CRON_SECRET`               | `X-Telegram-Cron-Secret`                       |
| `TELEGRAM_MAINTENANCE_CRON_SECRET`           | `X-Telegram-Cron-Secret`                       |
| `PARKING_BROADCAST_EXPIRE_CRON_SECRET`       | `X-Parking-Broadcast-Expire-Cron-Secret`       |
| `PARKING_REMINDER_CRON_SECRET`               | `X-Parking-Reminder-Cron-Secret`               |
| `CONTRACT_EXPIRY_CRON_SECRET`                | `X-Contract-Expiry-Cron-Secret`                |
| `DASHBOARD_ASSISTANT_EXPIRE_CRON_SECRET`     | (dashboard assistant expire cron)              |
| `META_INBOX_WEBHOOK_HEALTHCHECK_CRON_SECRET` | `X-Meta-Inbox-Webhook-Healthcheck-Cron-Secret` |
| `PLATFORM_BILLING_CRON_SECRET`               | `X-Platform-Billing-Cron-Secret`               |

**Telegram bot tokens + chat IDs:** per-property/parking DB tables — **not** env. Only `*_CRON_SECRET` vars remain env-only.

#### Deploy / script-only (not edge runtime)

| Variable                                                      | File                       | Notes                                   |
| ------------------------------------------------------------- | -------------------------- | --------------------------------------- |
| `DEV_PROJECT_REF`, `DEV_SUPABASE_URL`, `DEV_SERVICE_ROLE_KEY` | `supabase/.env.dev.local`  | `deploy:supabase:dev`, `dev:remote-api` |
| `PROD_PROJECT_REF`                                            | `supabase/.env.dev.local`  | Safety deny-list vs dev ref             |
| `DEV_DB_URL`                                                  | `supabase/.env.dev.local`  | Rollback script                         |
| `MT_PROD_*`, `LEGACY_PROD_PROJECT_REF`                        | `supabase/.env.prod.local` | Mt-prod bootstrap                       |
| `PROD_DB_URL`                                                 | `supabase/.env.local`      | `sync-prod-public-data-to-local.sh`     |

#### Removed (do not add back)

Google Calendar/Sheets/Gmail OAuth listener env (`GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_CALENDAR_ID`, `GOOGLE_SPREADSHEET_ID`, `GMAIL_OAUTH_*` except encryption key), global Telegram bot env (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, …), `EMAIL_TO` / `EMAIL_REPLY_TO` / `PARKING_OWNER_EMAILS` / `GCASH_*` / `SD_REFUND_CRON_*` / `EMAIL_LOGO_URL` / `PERMIT_APPROVER_EMAIL` — all migrated to **`app_settings`** / **`org_settings`** or per-property Telegram settings.

---

### 11.3 DB operator settings vs env (quick reference)

| Concern                             | DB location                       | Env fallback                            |
| ----------------------------------- | --------------------------------- | --------------------------------------- |
| GAF/pet To + Reply-To + parking BCC | `app_settings`                    | —                                       |
| Payment account + QR                | `app_settings`                    | —                                       |
| SD cron lead / max checkout age     | `app_settings`                    | —                                       |
| Org logo (email chrome)             | `org_settings`                    | default URL in code                     |
| Guest app origin                    | `org_settings`                    | `PUBLIC_GUEST_APP_ORIGIN`               |
| Social review URLs                  | org + property columns            | legacy `FACEBOOK_REVIEWS_URL`, etc.     |
| Telegram bots                       | `telegram_*_settings` (encrypted) | `GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY` only |

Settings UI map unchanged — see prior **`resolveAppSettings`** / Property → Settings guides under `docs/guides/routes/`.
