---
title: 'Plans & Billing — operator guide'
status: active
tags: [guides, routes, org]
updated: 2026-08-28
---

# Plans & Billing — operator guide

Route: `/org/:orgSlug/plans`

> **Status:** Documented

## Progress overview

| Section                | E2E save | Validation | Docs | Notes                                                                    |
| ---------------------- | -------- | ---------- | ---- | ------------------------------------------------------------------------ |
| Plan review + checkout | Yes      | Server     | Done | PayMongo checkout for first purchase, upgrade, property-count changes    |
| Downgrade (paid→paid)  | Yes      | Server     | Done | Immediate via `apply-org-plan-downgrade` — no PayMongo                   |
| Downgrade to Free      | Yes      | Server     | Done | Cancels live `org_subscriptions`, unenrolls properties, reconciles seats |

---

## Overview

**Billing is org-level only.** This is the single Plans & Billing surface for an entire organization — there is no per-property plans page. One `org_subscriptions` row covers enrolled properties, priced **per property** at the chosen tier's rate, with volume discounts as the portfolio grows. Checkout always bills for **every property in the org**; successful payment enrolls all of them. Adding a property on a **paid** plan does not auto-enroll — `create-property` returns `billingRequired: true` and the host completes checkout from this page.

**Access:** any org member can view (`org:settings:view`); starting checkout requires org **owner** (or platform admin) — see `verifyOrgOwner`.

**Page title/subtitle:** "Plans & Billing" / see `PLANS_PAGE_SUBTITLE` in `planPresentation.ts`.

---

## Behavior

- **Layout:** current-plan summary banner (Free when there is no paid org subscription, otherwise the active tier), then **Plans / Compare / Billing** tabs.
- **Plans tab:** `PlanTierRail` — one card per active subscription tier (Free, Starter, Pro, Business, Managed), each showing the **per-property monthly rate** (discounted list price, teal `{n}% off` pill when `discount_percent` > 0). The **current** tier is highlighted (Free by default when no `org_subscriptions` row — unlike the old per-property model, Free is not stored as a subscription row at org level). Paid tiers show **Upgrade**; the current card shows **Current plan**. Clicking a non-current tier opens `PlanReviewDialog` immediately. **Managed** opens **Help & Support → New ticket** instead (sales-assisted, manually quoted by a super-admin).
- **Review dialog:** single step — plan stub comparison (current → target), feature gains/losses, org property count ("Billing covers all X properties in your organization"), live monthly total (`computeOrgSubscriptionTotalPhp` — rate × count, ramp + volume discount, mirrored byte-for-byte from the server), and effective ₱/property when count > 1. **Upgrades / same-plan billing updates** show mid-cycle proration and **Continue to payment** (disabled when the org has zero properties). **Downgrades** (lower ladder tier or Free) show **Confirm downgrade**, skip the proration "due today" block, and apply immediately with no PayMongo step.
- **Volume discounts**: each paid tier carries its own **`volume_discount_tiers`**, **`volume_ramp_floor_php`**, and **`volume_ramp_at_count`** (super-admin editable on **`/admin/pricing/plans`** → Edit). **1–`volume_ramp_at_count` properties:** when the promo rate is above the ramp floor, the per-property rate **ramps linearly** from the full promo rate down to the floor. **Above the ramp count:** `volume_discount_tiers` breakpoints apply to the extended total. Defaults seeded in migrations `20261115120300_smart_volume_discount_tiers.sql` + `20261115120400_pricing_plans_volume_ramp_config.sql` (floor ₱500, ramp at 10, Pro-shaped tier curve). Stacks on top of the flat promotional `discount_percent`.
- **Confirming** a paid **upgrade** (or same-plan billing update) calls `create-org-subscription-checkout` (no `propertyIds` — server resolves every org property) and redirects to PayMongo; this same function handles first purchase, an upgrade tier switch, and a property-count change when properties were added since the last checkout.
- **Confirming a downgrade** (paid→lower paid or paid→Free) calls `apply-org-plan-downgrade` — applies immediately, expires any pending checkout, reconciles pooled team seats and AI credit allowance. Free cancels the live `org_subscriptions` row and unenrolls every property (entitlements fall back to Free). Unused time is not cash-refunded.
- **Compare tab:** `PlanFeatureMatrix` — full feature-by-feature grid across every tier, grouped by product module (Bookings, Finance, Inbox, …) so baseline and paid features for the same page sit together. Same component on **`/for-hosts/pricing`**. Clicking a tier here opens the same review dialog as the Plans tab.
- **Billing tab:** `PlanBillingPanel` — plan, price, renewal date, and `OrgPlanTransactions` (up to 20 `org_payment_transactions` rows with status/method).
- **Mid-cycle changes (proration):** switching tiers or increasing the org's property count while a subscription is already active reuse the same proration math (`subscriptionProration.ts#computeMidCycleProration`) — the "target price" is the recomputed rate × new property count × discount total. The unused portion of the current period is credited toward the new charge; it never goes below ₱0 and is never a cash refund.
- **`past_due`:** banner on org/property routes; full access continues until the grace period expires.
- **`suspended`:** dashboard restricted to **Plans & Billing** and **Help & Support** only (`RequirePropertySubscriptionAccess`, resolved via the property's org subscription); guest-facing booking flows unaffected. Team seats pooled across the org's enrolled properties are clawed back to Free's budget on suspension (`reconcileTeamSeatsForProperty`, run per affected property by the billing cron).
- **Upgrade CTA:** feature gates open the inline **`SubscriptionUpgradeModal`** (plan review in place). **Continue to payment** navigates to `/org/:orgSlug/plans?reviewPlan=<planId>` where PayMongo checkout runs. Optional `?feature=<PlanFeatureKey>` still opens review when landing on Plans directly. Property create on a paid plan uses `?reviewPlan=<currentPlanId>`. Optional `?tab=billing` opens the Billing tab. When the **org** plan already includes the gated feature but the **property** is still Free (not enrolled in `org_subscription_properties`), the modal re-offers the **current** plan (update billing / cover all properties) instead of jumping to the next ladder step — and `TierBadge` labels that current plan, not the ladder minimum.
- **Uncovered properties:** when enrolled count < org property count, `CurrentPlanSummary` shows **Update billing** to open review at the current plan (proration at new count).
- **Pooled quantity limits:** `teamManagement.maxMembers` and the marketing publish cap are shared across every property enrolled in the same org subscription, not allotted per property — see `entitlementPoolPropertyIds` in `_shared/planEntitlements.ts`.
- **Property sidebar:** **Plans & Billing** stays in the property nav for discoverability; the link (and `/org/:orgSlug/property/:propertySlug/plans`) goes to the org Plans page — there is no per-property billing UI.

## Known gaps (flagged, not silently dropped)

- **Managed's price is sales-assisted, not formula-driven** — its `volume_discount_tiers`/`price_php` exist on the row for consistency, but the actual `org_subscriptions.price_php_snapshot` for a Managed org is entered manually by a super-admin via `org-subscriptions-admin`'s override, bypassing the rate × count × discount computation.
- Volume pricing (ramp + tiers) is editable per plan on **`/admin/pricing/plans`**; changes apply to new checkouts and subscription changes, not in-flight PayMongo periods.
- **PayMongo live checkout** for upgrades still requires platform payment secrets / env — downgrades do not.

---

## Tier ladder (host-facing)

Internal plan codes stay stable in the database; hosts see these names. **Monthly (PHP) is the per-property rate**, not a flat plan price — the total charged is this rate × **every property in the org**, then the volume discount curve.

| Display name | Internal code | Per-property monthly (PHP) | Highlights                                                                                                                                                                                |
| ------------ | ------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**     | `free`        | ₱0                         | Dashboard, manual bookings, guest form, manual documents, **standard template management**, finance, maintenance, notifications                                                           |
| **Starter**  | `starter`     | ₱499 → **₱399**            | 20% off list · pricing management, public listing, automated booking emails, verified badge, 3 pooled team seats, **advanced template management**                                        |
| **Pro**      | `growth`      | ₱999 → **₱799**            | 20% off list · 5 pooled seats, 30 publishes/channel, top-30 search, AI validation, **property showcase pages**, 1k pooled AI credits                                                      |
| **Business** | `pro`         | ₱1,799 → **₱1,439**        | 20% off list · 10 pooled seats, unlimited publishing, top-15 search, full AI toolkit, 10k pooled AI credits, absorbs what the retired Business Plus tier covered via its own volume curve |
| **Managed**  | `managed`     | ₱4,999 → **₱3,999**        | 20% off list · Business capabilities + 30k pooled AI credits/mo, full-service ops, sales-assisted pricing                                                                                 |

`business_plus` is retired (`is_active = false`) — folded into Pro's volume-discount curve rather than kept as a separate "many properties" tier.

---

## API

| Method | Edge function                      | Auth                           | Notes                                                                                                                                                                                                         |
| ------ | ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `org-plan`                         | Org member (`verifyOrgAccess`) | `?orgId=` or `?orgSlug=` — every active subscription plan (with `volumeDiscountTiers`), the org's properties, current subscription + enrolled property ids, recent transactions, and any pending checkout URL |
| POST   | `create-org-subscription-checkout` | Org owner (`verifyOrgOwner`)   | `{ organizationId, planId }` → `{ checkoutUrl }` — bills every org property; handles first purchase, upgrade, and property-count changes                                                                      |
| POST   | `apply-org-plan-downgrade`         | Org owner (`verifyOrgOwner`)   | `{ organizationId, planId }` → `{ orgSubscriptionId, toFree }` — immediate paid→lower paid or paid→Free; rejects upgrades (those stay on checkout)                                                            |
| —      | `paymongo-webhook`                 | —                              | Dispatches org transactions via `metadata.kind === 'org_subscription'`; activates/updates the subscription and enrolls the checked-out properties on payment success                                          |

---

## Implementation map

| Layer                 | Path                                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                  | `ui/src/features/dashboard/plans/pages/OrgPlansPage.tsx`                                                                                                                                                                                             |
| Summary card          | `ui/src/features/dashboard/plans/components/CurrentPlanSummary.tsx`                                                                                                                                                                                  |
| Tier rail             | `ui/src/features/dashboard/plans/components/PlanTierRail.tsx`                                                                                                                                                                                        |
| Compare matrix        | `ui/src/features/dashboard/plans/components/PlanFeatureMatrix.tsx`                                                                                                                                                                                   |
| Billing tab           | `ui/src/features/dashboard/plans/components/PlanBillingPanel.tsx`, `ui/src/features/dashboard/plans/components/OrgPlanTransactions.tsx`                                                                                                              |
| Review dialog         | `ui/src/features/dashboard/plans/components/PlanReviewDialog.tsx`                                                                                                                                                                                    |
| FAQs                  | `ui/src/features/dashboard/plans/components/PlanFaqSection.tsx`                                                                                                                                                                                      |
| Hook                  | `ui/src/features/dashboard/plans/hooks/useOrgPlan.ts`                                                                                                                                                                                                |
| API client            | `ui/src/features/dashboard/plans/lib/orgPlanApi.ts`                                                                                                                                                                                                  |
| Pricing math (mirror) | `ui/src/features/dashboard/plans/lib/planPricing.ts` — `computeOrgSubscriptionTotalPhp`, `resolveRampEffectivePerPropertyPhp`, `normalizeVolumeDiscountTiers`, `resolveVolumeDiscountPercent`                                                        |
| Edge                  | `org-plan`, `create-org-subscription-checkout`, `apply-org-plan-downgrade`, `paymongo-webhook`                                                                                                                                                       |
| Entitlements          | `_shared/planEntitlements.ts` — `getActiveOrgSubscription`, `createOrgSubscription`, `changeOrgSubscription`, `applyOrgPlanDowngrade`, `assignPropertyToOrgSubscription`, `autoEnrollPropertyInOrgSubscription`, `removePropertyFromOrgSubscription` |
| Checkout              | `_shared/orgSubscriptionCheckout.ts` — `createOrgSubscriptionCheckoutLink`                                                                                                                                                                           |
| Pricing math (server) | `_shared/planPricing.ts` — `computeOrgSubscriptionTotalPhp`, `resolveRampEffectivePerPropertyPhp`                                                                                                                                                    |
| Webhook fulfillment   | `_shared/subscriptionOrchestrator.ts` — `fulfillOrgSubscriptionPayment`, `resolveOrgTransactionFromWebhookPayload`                                                                                                                                   |
| Billing cron          | `_shared/subscriptionOrchestrator.ts` — `runPlatformBillingCycle` (renewal reminders, past-due/suspension, seat clawback)                                                                                                                            |
| Tables                | `pricing_plans` (+ `volume_discount_tiers`), `org_subscriptions`, `org_subscription_properties`, `org_subscription_events`, `org_payment_transactions`                                                                                               |

Full design/rationale: [`docs/workflow/done/org-level-billing-migration.md`](../../../workflow/done/org-level-billing-migration.md).

---

## Host-facing knowledge

- Pricing is **per property**, but billed and managed **once for the whole organization** — every listing in the org is included automatically.
- The more properties in your org, the lower the effective per-property rate — from 1→10 listings the rate steps down linearly to ₱500/property (when the tier's promo rate is higher), then volume discounts at 10+, 20+, 50+, and 100+ (with extra relief at 200+/300+ for very large portfolios).
- Adding a new property increases your subscription count on the next checkout or is auto-enrolled immediately when you already have an active plan.
- Paid upgrades open PayMongo in the browser; the plan activates after payment clears (usually within seconds).
- Downgrades (including back to Free) apply as soon as you confirm — no payment step. Features above the new tier turn off right away; unused time is not refunded as cash.
- Unpaid orgs become **past due**, then **suspended** after the grace period — pay from Plans & Billing to restore full dashboard access across every property.
- Managed is hands-off, sales-assisted hosting — reach out via Help & Support to get a quote instead of self-serve checkout.
