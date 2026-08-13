# AI platform billing and production keys

Operational guide for shared Gemini/Groq AI features (receipt validation, inbox suggest, marketing captions, import column mapping, voice polish).

## Production model

- **One paid Google AI / Gemini project** per environment (dev Supabase + production Supabase).
- Set a **single** `GEMINI_API_KEY` in Supabase Edge secrets — do not rely on multi-key free-tier rotation in production.
- Optional `GROQ_API_KEY` as **emergency fallback only** (paid Groq when you outgrow free tier).
- Enable **billing** on the Google Cloud project linked to AI Studio and configure a **monthly budget alert** in GCP Billing.

## Local / bootstrap

- `GEMINI_API_KEYS` (comma-separated, different Google projects) remains supported for local dev rate-limit rotation.
- See [`docs/architecture/validation-and-env.md`](../../architecture/validation-and-env.md) for env var names.

## Usage metering (in-app)

Migration `20261009120000_ai_platform_usage.sql` adds:

| Table                         | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `ai_platform_global_settings` | Platform kill switch + `enforce_quotas`                         |
| `ai_platform_org_settings`    | Per-org daily/monthly call caps (defaults: 200/day, 5000/month) |
| `ai_platform_usage_daily`     | Aggregated counters per org per UTC day                         |
| `ai_platform_usage_events`    | Append-only audit log per AI call                               |

Edge functions:

- `ai-platform-global-settings` — super-admin GET/PATCH
- `ai-platform-settings` — org GET/PATCH limits
- `ai-platform-usage` — org GET summary

Shared server modules:

- `supabase/functions/_shared/aiModelRouter.ts` — feature → Gemini model tier
- `supabase/functions/_shared/aiUsageService.ts` — quota checks + `recordAiUsage`

## Model tiering (defaults)

| Feature                     | Model                                          |
| --------------------------- | ---------------------------------------------- |
| Receipt / inbox / marketing | `gemini-2.5-flash`                             |
| Import column map           | `gemini-2.5-flash`                             |
| Voice Live                  | separate session caps (`voice_receptionist_*`) |

Verify current rates at [ai.google.dev/pricing](https://ai.google.dev/gemini-api/docs/pricing) before budgeting.

## Dual-track deploy

- **Multi-tenant dev** (`fwor…`): paid dev Gemini key in dev Supabase secrets.
- **Legacy prod** (`zftt…`): separate paid prod key when live users depend on AI — never share dev keys with prod.
- See [`docs/architecture/deployment.md`](../../architecture/deployment.md).

## Upgrade / billing product

Org settings show a stub **Upgrade** CTA when quotas are exceeded (`upgradeHook: true` on 429 responses). Stripe / paid tiers are future work — caps protect margin until billing ships.
