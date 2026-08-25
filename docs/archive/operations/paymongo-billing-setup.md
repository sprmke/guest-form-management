# PayMongo org subscription billing — setup

Operational guide for host → platform recurring plan payments via PayMongo Payment Links (QRPH, Maya, online banking). **Org-scoped** — one subscription per org (`org_subscriptions`), priced per enrolled property against `pricing_plans`; there is no per-property billing anymore.

Plan: [`docs/workflow/done/paymongo-subscription-billing.md`](../../workflow/done/paymongo-subscription-billing.md) (original per-property build, historical — checkout/webhook code has since been rewritten org-level, see [`docs/workflow/done/org-level-billing-migration.md`](../../workflow/done/org-level-billing-migration.md)).

## Sandbox (development)

1. Create a PayMongo account and enable **Test mode** in the dashboard.
2. **Developers → API Keys** — copy the **Secret test key** (`sk_test_…`).
3. Add to `supabase/.env.local`:
   - `PAYMONGO_SECRET_KEY=sk_test_…`
4. **Developers → Webhooks** — create a test endpoint:
   - URL: hosted dev `https://<project>.supabase.co/functions/v1/paymongo-webhook` (or ngrok → local `functions serve` during pure local webhook testing).
   - Events: `payment.paid`, `payment.failed`, `link.payment.paid` (enable all payment/link events available).
   - Copy the endpoint **signing secret** → `PAYMONGO_WEBHOOK_SECRET` in `supabase/.env.local` and hosted dev secrets.
5. Paid checkout from **Org → Plans & Billing** creates a Payment Link via **`create-org-subscription-checkout`**. After payment, **`paymongo-webhook`** fulfills the subscription (activates it and enrolls the checked-out properties).

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

| Function                           | Role                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `create-org-subscription-checkout` | Org owner creates Payment Link + pending `org_payment_transactions` row (first purchase, tier switch, or property add/remove) |
| `paymongo-webhook`                 | Signature verify, dedupe, fulfill subscription on `payment.paid`                                                              |
| `platform-payment-settings`        | Super-admin dunning config (singleton `platform_payment_settings`)                                                            |
| `platform-billing-cron`            | Daily renewal links + past-due/suspend sweep + pooled seat clawback (see scheduled-jobs doc)                                  |
| `org-plan`                         | Host Plans & Billing page — subscription status, transactions, pending checkout URL                                           |

## PayMongo rails note

Payment Links API does **not** accept a per-link `payment_method_types` filter. Checkout shows all rails enabled on the PayMongo merchant account. Super-admin **Enabled rails** in **`/admin/pricing/payment-settings`** is an ops checklist — mirror changes in the PayMongo dashboard.

## Scope shipped vs original plan

- **Org-scoped** billing on **`org_subscriptions`** / **`pricing_plans`** — the original per-property design (`property_subscriptions`) shipped first, then was fully replaced by the org-level model; see [`docs/workflow/done/org-level-billing-migration.md`](../../workflow/done/org-level-billing-migration.md).
- Host billing UX lives on **Org → Plans & Billing** (`/org/:orgSlug/plans`) — there's no per-property Plans page anymore.
- Super-admin under **`/admin/pricing/*`** (not `/admin/billing/*`).
- **AI credit PayMongo top-up** remains a separate future plan.

## Dual-track deploy

- Multi-tenant dev (`fwor…`): configure test keys on dev Supabase before QA.
- Legacy prod: separate live keys when cutover ships — see [`docs/architecture/deployment.md`](../../architecture/deployment.md).
