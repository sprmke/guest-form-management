---
title: 'Org Portfolio Plans — operator guide'
status: active
tags: [guides, routes, org]
updated: 2026-08-24
---

# Org Portfolio Plans — operator guide

Route: `/org/:orgSlug/plans`

> **Status:** Documented

## Progress overview

| Section          | E2E save | Validation | Docs | Notes                                       |
| ---------------- | -------- | ---------- | ---- | ------------------------------------------- |
| Portfolio bundle | Yes      | Server     | Done | PayMongo checkout, first-purchase flow only |

---

## Overview

Org-level page for bundling **Pro** (≤3 properties), **Business** (≤5 properties), or **Business Plus** (≤10 properties) under one subscription instead of paying per property. Distinct from the per-property [`org/property/plans.md`](./property/plans.md), which still handles Free/Starter/Managed/Commission for an individual listing regardless of whether the org has a portfolio bundle.

**Access:** any org member can view (`org:settings:view`); starting checkout requires org **owner** (or platform admin) — see `verifyOrgOwner`.

**Page title/subtitle:** "Portfolio Plans" / "Bundle Pro, Business, or Business Plus across multiple properties in one subscription."

---

## Behavior

- **No active bundle:** shows the 3 bundle-eligible tier cards (price, property cap, top feature gains vs. the org's current baseline). Selecting a tier opens a property picker — checkboxes over every org property, capped at the tier's `maxProperties`; properties already covered by another org's bundle... (not applicable — a property can only ever be in one org's bundle, enforced server-side) show as already-covered and are disabled. **Continue to payment** calls `create-org-subscription-checkout` and redirects to PayMongo.
- **Active bundle:** shows a summary card (plan, price, property cap) and the full org property list, each marked **Covered** when it's one of the bundle's slotted properties. No plan-switch or add/remove-property UI yet in this pass — see "Known gaps" below.
- One org can have **at most one live portfolio subscription** at a time (`active`/`trialing`/`past_due`) — enforced server-side (`org_subscriptions` partial unique index + `createOrgSubscriptionCheckoutLink`'s explicit check).
- A property already covered by a bundle is excluded from a _different_ org's bundle automatically (`org_subscription_properties.property_id` is unique).
- **Per-property Plans page banner:** a property slotted into this org's bundle shows a "Covered by your org's {tier} plan" banner instead of its normal tier-card flow — see [`org/property/plans.md`](./property/plans.md).
- **Checkout-time validation, not just fulfillment-time:** `create-org-subscription-checkout` validates property ownership (every checked property belongs to the requesting org) and bundle-availability (none already slotted elsewhere) **before** creating the PayMongo link — a bad request fails fast instead of collecting payment for a checkout that could never be fulfilled. `createOrgSubscription` re-validates both again at webhook-fulfillment time (the authoritative check, protects against a race between checkout and payment). If bundle creation fails partway through slotting properties, it rolls back cleanly (deletes the partial `org_subscriptions` row) and marks the payment transaction `failed` rather than leaving a paid-for, half-slotted bundle with no explanation.
- **`business_plus` cannot be purchased standalone on a single property** — it's rejected at the shared plan-assignment function (`assignPropertyToPlan`) and at per-property checkout-link creation, not just excluded from the per-property Plans page's plan list.

## Known gaps (flagged, not silently dropped)

- **No UI yet for**: removing a property from the bundle, adding a property to an _existing_ bundle (server functions `assignPropertyToOrgSubscription`/`removePropertyFromOrgSubscription` exist in `_shared/planEntitlements.ts`, ready to wire up), switching bundle tiers mid-cycle (no org-level proration yet — Phase 7's per-property proration wasn't extended here), and recurring billing-cycle automation (renewal reminders, past-due/suspension — `runPlatformBillingCycle` only walks `property_subscriptions` today, not `org_subscriptions`).
- No receipt or payment-failed email for org subscriptions yet (per-property equivalents exist).

---

## API

| Method | Edge function                      | Auth                           | Notes                                                                                                                                                             |
| ------ | ---------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `org-plan`                         | Org member (`verifyOrgAccess`) | `?orgId=` or `?orgSlug=` — plans, properties, current bundle + assigned property ids                                                                              |
| POST   | `create-org-subscription-checkout` | Org owner (`verifyOrgOwner`)   | `{ organizationId, planId, propertyIds }` → `checkoutUrl`                                                                                                         |
| —      | `paymongo-webhook`                 | —                              | Dispatches org vs. property transactions via `metadata.kind === 'org_subscription'`; activates the bundle and slots the checked-out properties on payment success |

---

## Implementation map

| Layer               | Path                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/plans/pages/OrgPlansPage.tsx`                                                                                                               |
| Hook                | `ui/src/features/dashboard/plans/hooks/useOrgPlan.ts`                                                                                                                  |
| API                 | `ui/src/features/dashboard/plans/lib/orgPlanApi.ts`                                                                                                                    |
| Edge                | `org-plan`, `create-org-subscription-checkout`, `paymongo-webhook`                                                                                                     |
| Entitlements        | `_shared/planEntitlements.ts` — `getActiveOrgSubscriptionForProperty`, `createOrgSubscription`, `assignPropertyToOrgSubscription`, `removePropertyFromOrgSubscription` |
| Checkout            | `_shared/orgSubscriptionCheckout.ts`                                                                                                                                   |
| Webhook fulfillment | `_shared/subscriptionOrchestrator.ts` — `fulfillOrgSubscriptionPayment`, `resolveOrgTransactionFromWebhookPayload`                                                     |
| Tables              | `org_subscriptions`, `org_subscription_properties`, `org_subscription_events`, `org_payment_transactions`, `pricing_plans.max_properties`                              |

---

## Host-facing knowledge

- Bundling is optional — each property can keep paying its own per-property tier instead.
- A bundle covers a fixed number of properties (3/5/10 for Pro/Business/Business Plus). Once full, upgrading to a higher bundle tier is the only way to add more (no à-la-carte add-ons).
- Managed and Commission-model properties always stay per-property — they're not bundle-eligible.
