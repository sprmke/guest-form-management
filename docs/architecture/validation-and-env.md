---
title: 'Form validation and environment variables'
status: active
tags: [architecture]
updated: 2026-08-19
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

### Secrets hygiene (what belongs in git)

| Safe in git (`*.example`, docs)                                                         | Never commit                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Placeholder names and fake values (`replace-with-…`, `you@example.com`)                 | `*.local`, `.env.development`, `.env.production` (real values)                  |
| Supabase **project ref** in operator docs _(semi-public — visible in browser API URLs)_ | **Service role** key, **anon** key (real JWT), DB passwords, pooler URIs        |
| Local Supabase demo anon JWT in `supabase/snippets/` _(public Supabase CLI default)_    | `SUPABASE_ACCESS_TOKEN` (PAT), Resend/Meta/Google secrets, OAuth client secrets |
| GitHub **secret names** in workflow docs                                                | GitHub secret **values**                                                        |

**Templates:** `ui/.env.example`, `supabase/.env.example`, `supabase/.env.dev.example`, `supabase/.env.prod.example` — placeholders only. Copy to gitignored targets (`ui/.env.development`, `supabase/.env.dev.local`, `supabase/.env.prod.local`). Root + `supabase/.gitignore` block `*.local`.

**Production:** Hosted secrets (Supabase Dashboard), dual Google OAuth clients (GoTrue vs Gmail API), UI host **`VITE_*`**, and **`pg_cron`** setup are stepped in **[[migration-runbook|Migration Runbook — New Booking Flow]] §11**.

### UI (`ui/.env` / Vite)

- `VITE_API_URL` — Supabase functions base URL (local: `http://127.0.0.1:54321/functions/v1` pattern; production: project functions URL).
- `VITE_SUPABASE_URL` — same functions base URL used by the Supabase JS client; project URL is derived by stripping `/functions/v1`.
- `VITE_SUPABASE_ANON_KEY` — public anon key (sent with function requests and used by the Supabase JS client).
- `VITE_NODE_ENV` — `production` toggles production-only behavior in the form.
- `VITE_SUPER_ADMIN_EMAILS` _(optional)_ — comma-separated emails for platform super-admin UX (`/admin/*`, Admin tab in mode switcher). Server enforces `SUPER_ADMIN_EMAILS` on edge functions.
- `VITE_GOOGLE_MAPS_API_KEY` _(optional)_ — Browser API key for **Property → Settings → Location & Access** (`PropertyLocationPicker`: Maps JavaScript API + Places API). Restrict by HTTP referrer in Google Cloud. When unset, address can still be typed manually; map picker is hidden.
- `VITE_SUPABASE_PROJECT_URL` _(optional, Phase 1)_ — override for the Supabase project URL when the auto-derivation from `VITE_SUPABASE_URL` is unwanted.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` _(local Supabase Auth only)_ — **not** `VITE_*`; not exposed to the browser. Used when `supabase/config.toml` enables `[auth.external.google]`: `dev.sh` (both `supabase start` and `supabase functions serve`) and `npm run start:supabase` load `ui/.env.development` before the CLI runs so it can substitute `env(...)`. Do **not** use the `SUPABASE_` prefix (CLI may ignore those names). In Google Cloud, add redirect URIs `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:54321/auth/v1/callback`. Keep `redirect_uri` under `[auth.external.google]` in `supabase/config.toml` (see comment there); after changing that block or these env vars, run **`npm run stop:supabase`** then **`npm run start:supabase`** so the auth container is recreated with `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` — otherwise GoTrue can return `validation_failed` / “missing redirect URI” on `/auth/v1/authorize`. If the SPA shows `Unable to exchange external code`, check **`docker logs supabase_auth_<project>`**: Google often returns `invalid_client` / “The provided client secret is invalid” when the secret does not belong to the same Web client as `GOOGLE_CLIENT_ID`, the value has stray whitespace or quotes, or the stack was not restarted after updating `ui/.env.development`.

### Edge (`supabase/.env.local` / hosted secrets)

**Operator config (non-secrets):** **`org_settings`** (one row per organization — social links, team logo; **Org → Settings**) and **`app_settings`** (one row per property — payment, GAF, **email routing**, automation toggles, **workflow document requirements** (`document_requirements_override`); **Property → Settings**). Edge code merges org branding + property operational fields via **`resolveAppSettings(propertyId)`** (`_shared/appSettings.ts` + `_shared/orgSettings.ts`). Document requirement lists resolve via **`documentRequirements.ts#resolveDocumentRequirements`** (override → `developments.settings.workflowDefaults` → defaults). Secrets **never** go in these tables.

| Settings UI                                                                                 | Table              | Scope        |
| ------------------------------------------------------------------------------------------- | ------------------ | ------------ |
| Org → Settings → Socials                                                                    | **`org_settings`** | organization |
| Property → Settings → Payment / GAF / Email automations / Workflow documents / Integrations | **`app_settings`** | property     |

| Org settings (`org_settings`)                           | Property settings (`app_settings`)                  | Env fallback (legacy)                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Facebook page URL (`/sd-form` review CTA)               | `facebook_reviews_url`                              | **`FACEBOOK_REVIEWS_URL`** when DB column empty                                                         |
| Airbnb listing URL                                      | `airbnb_url`                                        | **`AIRBNB_URL`** when DB column empty _(optional)_                                                      |
| Instagram profile URL                                   | `instagram_url`                                     | **`INSTAGRAM_URL`** when DB column empty _(optional)_                                                   |
| TikTok profile URL                                      | `tiktok_url`                                        | **`TIKTOK_URL`** when DB column empty _(optional)_                                                      |
| Email / team logo (emails, admin chrome, guest pages)   | —                                                   | `EMAIL_LOGO_URL`                                                                                        |
| Guest app origin (email links, default payment QR base) | —                                                   | **`PUBLIC_GUEST_APP_ORIGIN`** (not per-org; legacy `org_settings.public_guest_app_origin` if env unset) |
| —                                                       | GAF/pet **To** (PMO) + inbound sender allow-list    | `developments.settings.pmoEmail` → legacy `email_to` → Azure default                                    | `EMAIL_TO` (last resort)                                                                                   |
| —                                                       | **Reply-To** + new booking notify + GAF/pet **CC**  | `email_reply_to`                                                                                        | `EMAIL_REPLY_TO`                                                                                           |
| —                                                       | Parking broadcast BCC                               | `parking_owner_emails`                                                                                  | `PARKING_OWNER_EMAILS`                                                                                     |
| —                                                       | SD cron email lead (hours in UI; stored as minutes) | `sd_refund_cron_email_lead_minutes`                                                                     | `SD_REFUND_CRON_EMAIL_LEAD_MINUTES`                                                                        |
| —                                                       | SD cron max checkout age (days)                     | `sd_refund_cron_max_checkout_age_days`                                                                  | `SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS`                                                                     |
| —                                                       | Default guest parking rate                          | `default_parking_rate_guest`                                                                            | ₱400 — edit on **Pricing** page only (`property-pricing`)                                                  |
| —                                                       | Weekday nightly rate                                | `weekday_nightly_rate`                                                                                  | ₱2,799 — **Pricing** / `ReviewPricingForm`                                                                 |
| —                                                       | Weekend nightly rate (Fri–Sun)                      | `weekend_nightly_rate`                                                                                  | ₱2,999                                                                                                     |
| —                                                       | Default down payment                                | `default_down_payment`                                                                                  | ₱1,500                                                                                                     |
| —                                                       | Default security deposit                            | `default_security_deposit`                                                                              | ₱1,500                                                                                                     |
| —                                                       | Default pet fee                                     | `default_pet_fee`                                                                                       | ₱300                                                                                                       |
| —                                                       | Default extra guest fee                             | `default_guest_additional_fee`                                                                          | ₱0                                                                                                         |
| —                                                       | Per-date nightly overrides                          | `property_pricing_date_overrides`                                                                       | `(property_id, pricing_date)` → `nightly_rate`                                                             |
| —                                                       | Holiday / peak premiums                             | `pricing_holiday_rules` (JSONB on `app_settings`)                                                       | Seeded PH 2026 rules; used by calendar + `ReviewPricingForm`                                               |
| —                                                       | Owner date blocks                                   | `property_blocked_dates`                                                                                | `(property_id, start_date, end_date)` nights `[start, end)`; edge helper `_shared/propertyBlockedDates.ts` |
| —                                                       | Email automation master toggles                     | `automation_toggles`                                                                                    | —                                                                                                          |
| —                                                       | Payment provider (`payment_provider`)               | —                                                                                                       |
| —                                                       | Account name (`gcash_name`)                         | `GCASH_NAME`                                                                                            |
| —                                                       | Account number (`gcash_number`)                     | `GCASH_NUMBER`                                                                                          |
| —                                                       | Payment QR image (`gcash_qr_image_url`)             | `GCASH_QR_IMAGE_URL`                                                                                    |
| —                                                       | GAF unit owner / tower / contact / signature        | _(built-in defaults if unset)_                                                                          |

**Secrets / infra — env only (Supabase Dashboard secrets; Vercel for `VITE_*`):**

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_INBOUND_WEBHOOK_SECRET` _(optional until Phase 2 cutover)_ — Svix signing secret for **`approval-email-webhook`** (`email.received`).
- `RESEND_APPROVAL_INBOUND_DOMAIN` _(optional)_ — inbound host for plus-address Reply-To, e.g. `inbound.kamehomes.space` → `approvals+{slug}@…`. See **[[approval-email-inbound]]**.
- `RESEND_FROM_EMAIL` _(optional)_ — Verified Resend **From** address for workflow emails (e.g. `mail@yourdomain.com`). When unset, falls back to property **`emailReplyTo`** from **`app_settings`**. Display name is built from unit + org/property labels (`propertyEmailBranding.ts`).
- `ADMIN_ALLOWED_EMAILS` — comma-separated allow list for `verifyAdminJwt` / `isPlatformAdmin` (org owners bypass `verifyAdminJwt`)
- `SUPER_ADMIN_EMAILS` — platform super-admin (`/admin/*`, `serveSuperAdmin`)
- `GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY` _(optional)_ — 32-byte key as **64 hex** chars or base64; encrypts per-property Telegram bot tokens at rest (`propertySecretCrypto.ts`). Legacy name retained from Gmail OAuth era.
- **`TELEGRAM_BOT_TOKEN`**, **`TELEGRAM_CHAT_ID`** _(optional)_ — Telegram Bot API: group or channel id for marketing sends (`telegram-marketing-cron`, `submit-form` new row, `cancel-booking`). When either is unset, sends are skipped (logged).
- **`TELEGRAM_CRON_SECRET`** _(optional)_ — When set, `telegram-marketing-cron` requires request header **`X-Telegram-Cron-Secret`** with the same value (use in `pg_net` from Vault; see **[[telegram-marketing-reminders|Telegram marketing reminders]]**).
- **`CONTRACT_EXPIRY_CRON_SECRET`** _(optional)_ — When set, `contract-expiry-cron` requires header **`X-Contract-Expiry-Cron-Secret`** (see `supabase/snippets/contract-expiry-cron.sql`).
- **`TELEGRAM_STAFF_BOT_TOKEN`** _(optional)_ — Bot token for the staff/cleaner Telegram group. Falls back to `TELEGRAM_BOT_TOKEN` if unset (same bot, different group).
- **`TELEGRAM_STAFF_CHAT_ID`** — Numeric Telegram chat id for the staff/cleaner group (often negative for supergroups). Required for staff notifications.
- **`TELEGRAM_STAFF_CRON_SECRET`** _(optional)_ — When set, `telegram-staff-cron` requires header `X-Telegram-Cron-Secret` with the same value.
- **`TELEGRAM_FINANCE_BOT_TOKEN`** _(optional)_ — Bot token for finance due-date reminders. Falls back to `TELEGRAM_BOT_TOKEN` if unset.
- **`TELEGRAM_FINANCE_CHAT_ID`** — Numeric Telegram chat id for finance reminder alerts (often negative for supergroups).
- **`TELEGRAM_FINANCE_CRON_SECRET`** _(optional)_ — When set, `telegram-finance-cron` requires header `X-Telegram-Cron-Secret` with the same value.
- **`TELEGRAM_MAINTENANCE_BOT_TOKEN`** _(optional)_ — Bot token for maintenance due-date reminders. Falls back to `TELEGRAM_BOT_TOKEN` if unset.
- **`TELEGRAM_MAINTENANCE_CHAT_ID`** — Numeric Telegram chat id for the **Kame Home - Maintenance** group.
- **`TELEGRAM_MAINTENANCE_CRON_SECRET`** _(optional)_ — When set, `telegram-maintenance-cron` requires header `X-Telegram-Cron-Secret` with the same value.
- **`TELEGRAM_ADMIN_BOT_TOKEN`** _(optional)_ — Bot token for the admin operations Telegram group. Falls back to `TELEGRAM_BOT_TOKEN` if unset.
- **`TELEGRAM_ADMIN_CHAT_ID`** — Numeric Telegram chat id for the admin ops group (often negative for supergroups). Required for operations alerts.
- **`TELEGRAM_ADMIN_CRON_SECRET`** _(optional)_ — When set, `telegram-admin-cron` requires header `X-Telegram-Cron-Secret` with the same value.
- **`PARKING_BROADCAST_EXPIRE_CRON_SECRET`** _(optional)_ — When set, **`expire-parking-broadcasts`** requires header **`X-Parking-Broadcast-Expire-Cron-Secret`**. Hosted schedule is created by migration **`20261018120000_parking_broadcast_expire_cron.sql`** via `sync_parking_broadcast_expire_cron_job()`; see `docs/archive/operations/scheduled-jobs-and-testing.md`.
- **`GEMINI_API_KEYS`** _(optional, local/dev)_ — Comma-separated Google AI Studio API keys for rate-limit rotation across **different** Google Cloud projects. **Production:** use one paid **`GEMINI_API_KEY`** instead — see **`docs/archive/operations/ai-platform-billing.md`**. Platform usage is metered per org (`ai_platform_usage_*` tables; `ai-platform-settings` / `ai-platform-usage` edge functions).
- **`GEMINI_API_KEY`** _(optional)_ — Single Gemini key. **Required for production** (paid billing project). When `GEMINI_API_KEYS` is unset, all AI services use this key via `_shared/aiGeminiKeys.ts` + `_shared/aiModelRouter.ts`.
- **`GROQ_API_KEY`** _(optional)_ — Groq API key (Llama 4 Scout). **Fallback only** when Gemini fails — not primary capacity for real users. Sign up at `https://console.groq.com`.
- **`JAMENDO_CLIENT_ID`** _(optional, Marketing Studio video)_ — Free Jamendo API client id ([dev portal](https://devportal.jamendo.com/)). Powers **Trending** / **Search** music in the video editor (`marketing-music`). When unset, browse tabs return empty and **Upload** / **Link** still work. Jamendo tracks are cached to **`property-media`** on select for stable Remotion export URLs. Operators are responsible for license fit on published Meta posts.
- **`META_APP_ID`**, **`META_APP_SECRET`** _(Guest Inbox)_ — Meta developer app credentials for Facebook Page + Instagram messaging OAuth and webhook signature verification.
- **`META_INBOX_TOKEN_ENCRYPTION_KEY`** _(Guest Inbox)_ — 32-byte AES key (64 hex or base64); encrypts Page access tokens in **`social_channel_connections`**.
- **`META_WEBHOOK_VERIFY_TOKEN`** _(Guest Inbox)_ — Shared secret for Meta webhook GET verification (`meta-inbox-webhook`).
- **`META_INBOX_WEBHOOK_HEALTHCHECK_CRON_SECRET`** _(optional, Guest Inbox)_ — When set, `meta-inbox-webhook-healthcheck` requires header **`X-Meta-Inbox-Webhook-Healthcheck-Cron-Secret`**. Hosted schedule: migration `20261101120000_meta_inbox_webhook_health.sql` (`sync_meta_inbox_webhook_healthcheck_cron_job()`, every 10 minutes).
- **`META_OAUTH_ALLOWED_RETURN_ORIGINS`** _(optional, Guest Inbox)_ — Comma-separated SPA origins for Meta OAuth return (defaults include local Vite). Local/staging E2E checklist: **[[inbox-e2e-runbook|Guest Inbox — E2E runbook (local + staging)]]**.
- **`META_OAUTH_EXCLUDE_PUBLISHING_SCOPES`** _(optional)_ — Set to `1` to omit `pages_manage_posts`, `instagram_content_publish`, and `instagram_basic` from OAuth (inbox-only connect). Default: **all scopes included**. Setup guide: **[[meta-app-review|Meta app setup — Guest Inbox + Marketing Content Studio]]**.
- **`META_OAUTH_EXTRA_SCOPES`** _(optional)_ — Comma-separated additional OAuth scopes appended to the default set.
- **`PAYMONGO_SECRET_KEY`** _(org subscription billing)_ — PayMongo secret API key (`sk_test_…` / `sk_live_…`). Used by **`create-org-subscription-checkout`** to create Payment Links. Setup: **`docs/archive/operations/paymongo-billing-setup.md`**.
- **`PAYMONGO_WEBHOOK_SECRET`** _(org subscription billing)_ — Per-endpoint webhook signing secret for HMAC verification in **`paymongo-webhook`**.
- **`PLATFORM_BILLING_CRON_SECRET`** _(optional)_ — When set, **`platform-billing-cron`** requires header **`X-Platform-Billing-Cron-Secret`**. Hosted schedule: migration **`20261024140000_platform_billing_cron.sql`** (`sync_platform_billing_cron_job()`, daily 06:00 UTC).
- Optional: `ENVIRONMENT` / `DENO_ENV` for `isDevelopment()` in shared utils

**UI (`ui/.env` / Vercel):** `VITE_SUPABASE_URL`, `VITE_API_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_NODE_ENV`, `VITE_SUPER_ADMIN_EMAILS` (super-admin UX only), `VITE_GOOGLE_MAPS_API_KEY` (property location picker). Local only: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for GoTrue sign-in.
