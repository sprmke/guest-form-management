# PayMongo property subscription billing — setup

Operational guide for host → platform recurring plan payments via PayMongo Payment Links (QRPH, Maya, online banking). Property-scoped — attaches to **`property_subscriptions`** / **`pricing_plans`**, not a separate org plan catalog.

Plan: [`docs/workflow/done/paymongo-subscription-billing.md`](../../workflow/done/paymongo-subscription-billing.md).

## Sandbox (development)

1. Create a PayMongo account and enable **Test mode** in the dashboard.
2. **Developers → API Keys** — copy the **Secret test key** (`sk_test_…`).
3. Add to `supabase/.env.local`:
   - `PAYMONGO_SECRET_KEY=sk_test_…`
4. **Developers → Webhooks** — create a test endpoint:
   - URL: hosted dev `https://<project>.supabase.co/functions/v1/paymongo-webhook` (or ngrok → local `functions serve` during pure local webhook testing).
   - Events: `payment.paid`, `payment.failed`, `link.payment.paid` (enable all payment/link events available).
   - Copy the endpoint **signing secret** → `PAYMONGO_WEBHOOK_SECRET` in `supabase/.env.local` and hosted dev secrets.
5. Paid checkout from **Property → Plans** creates a Payment Link via **`create-subscription-checkout`**. After payment, **`paymongo-webhook`** fulfills the plan assignment.

## Live (production)

1. Complete PayMongo KYB (business registration, ID, proof of address, settlement bank).
2. Request activation for **QRPH**, **Maya**, and **online banking (Dob)** if not enabled by default.
3. Create a **separate live webhook** on the production Supabase project URL with its own signing secret.
4. Store **`PAYMONGO_SECRET_KEY`** (`sk_live_…`) and **`PAYMONGO_WEBHOOK_SECRET`** as **production** Edge secrets only — do not reuse dev keys on prod.

## Env vars

| Variable                       | Where                                | Purpose                                            |
| ------------------------------ | ------------------------------------ | -------------------------------------------------- |
| `PAYMONGO_SECRET_KEY`          | Edge secrets / `supabase/.env.local` | Basic auth for Payment Links API                   |
| `PAYMONGO_WEBHOOK_SECRET`      | Edge secrets / `supabase/.env.local` | HMAC verify `Paymongo-Signature` header            |
| `PLATFORM_BILLING_CRON_SECRET` | Edge secrets (optional)              | Auth header for hosted **`platform-billing-cron`** |

See also [`docs/architecture/validation-and-env.md`](../../architecture/validation-and-env.md).

## Edge functions

| Function                       | Role                                                                      |
| ------------------------------ | ------------------------------------------------------------------------- |
| `create-subscription-checkout` | Owner creates Payment Link + pending `property_payment_transactions` row  |
| `paymongo-webhook`             | Signature verify, dedupe, fulfill subscription on `payment.paid`          |
| `platform-payment-settings`    | Super-admin dunning config (singleton `platform_payment_settings`)        |
| `platform-billing-cron`        | Daily renewal links + past-due/suspend sweep (see scheduled-jobs doc)     |
| `property-plan`                | Host Plans page — subscription status, transactions, pending checkout URL |

## PayMongo rails note

Payment Links API does **not** accept a per-link `payment_method_types` filter. Checkout shows all rails enabled on the PayMongo merchant account. Super-admin **Enabled rails** in **`/admin/pricing/payment-settings`** is an ops checklist — mirror changes in the PayMongo dashboard.

## Scope shipped vs original plan

- **Property-scoped** billing on **`property_subscriptions`** / **`pricing_plans`** (not org-level **`platform_subscriptions`**).
- Host billing UX lives on **Property → Plans** (no org Settings **Billing** tab).
- Super-admin under **`/admin/pricing/*`** (not `/admin/billing/*`).
- **AI credit PayMongo top-up** remains a separate future plan.

## Dual-track deploy

- Multi-tenant dev (`fwor…`): configure test keys on dev Supabase before QA.
- Legacy prod: separate live keys when cutover ships — see [`docs/architecture/deployment.md`](../../architecture/deployment.md).
