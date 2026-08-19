---
title: 'Pricing tiers — portfolio bundling for Pro/Business'
status: planned
tags: [workflow, planned, billing, pricing]
updated: 2026-08-19
stage: planned
kind: plan
---

# Pricing tiers — portfolio bundling for Pro/Business

## Context

Two independent pricing-strategy reports (a ChatGPT report and a Cursor session) analyzed the just-shipped [Host Plans & Pricing Tiers](../done/host-plans-and-pricing-tiers.md) feature for whether the ₱15k–25k/month-net Airbnb host segment is priced fairly, and whether pricing should stay strictly per-property or shift toward portfolio bundles for multi-listing hosts.

Both reports agree the current single-listing prices (Free ₱0 / Starter ₱399 / Pro ₱799 / Business ₱1,439 promo) are well-calibrated for that ICP, and agree that per-property billing becomes painful once a host has 3–10 units (3× Business = ₱4,317/mo, 10× = ₱14,390/mo). They diverge on the fix: Cursor recommends staying per-property and softening the multi-listing cliff with a checkout discount; ChatGPT recommends restructuring into portfolio tiers with property caps (Starter=1, Pro≤3, Business≤5, plus a new Business Plus≤10).

Two things were independently verified before recommending a direction: (1) ChatGPT's cited competitor pricing (PinasBnb, TuloyPH specific numbers) could not be corroborated — search and fetch found no evidence, PinasBnb's pricing page 404s — so that evidence is unreliable and shouldn't be load-bearing; (2) the entire pricing/plans system shipped **2026-08-18** (one day before this decision), built ground-up per-property (`property_subscriptions` has a partial unique index enforcing one live subscription per `property_id`; `resolvePropertyEntitlements` takes a single `propertyId`; the route is `/org/:orgSlug/property/:propertySlug/plans`). The recommendation going in was to keep per-property billing and add a same-org multi-listing checkout discount instead of rearchitecting a 24-hour-old feature.

**The host explicitly chose to proceed with the portfolio-cap pivot anyway**, overriding that recommendation. This plan implements that chosen direction as a genuine, scoped rearchitecture rather than a cosmetic pricing tweak — a per-listing discount schedule is moot under this model since bundling replaces per-unit pricing for the affected tiers.

## Final tier ladder

Single-listing price points are unchanged (both reports agreed on these). What changes is the property cap and the introduction of org-level bundling for Pro, Business, and a new Business Plus tier. Free, Starter, Managed, and Commission remain exactly as they are today (per-property, no architecture change needed — Starter's cap is 1, which is already what a per-property subscription is).

| Tier                | Internal code   | List → Promo (20% off)                       | Property scope                              | Seats    | AI credits/mo | Search tier | Publishing |
| ------------------- | --------------- | -------------------------------------------- | ------------------------------------------- | -------- | ------------- | ----------- | ---------- |
| Free                | `free`          | ₱0                                           | per-property (unchanged)                    | existing | —             | none        | existing   |
| Starter             | `starter`       | ₱499 → ₱399                                  | per-property (unchanged, effectively cap=1) | 3        | —             | existing    | existing   |
| Pro                 | `growth`        | ₱999 → ₱799                                  | **org bundle, up to 3 properties**          | 5        | 1,000         | top-30      | 30/channel |
| Business            | `pro`           | ₱1,799 → ₱1,439                              | **org bundle, up to 5 properties**          | 10       | 10,000        | top-15      | unlimited  |
| Business Plus (NEW) | `business_plus` | ₱2,999 → ₱2,399                              | **org bundle, up to 10 properties**         | 15       | 20,000        | top-10      | unlimited  |
| Managed             | `managed`       | ₱4,999 → ₱3,999 **per property** (unchanged) | per-property (unchanged)                    | 10       | 30,000        | top-5       | unlimited  |
| Commission          | `commission`    | 8% of completed booking revenue (unchanged)  | per-property (unchanged)                    | 10       | 1,000         | top-20      | —          |

Rationale for keeping Managed/Commission per-property: both reports agree — Managed is closer to co-hosting/ops labor than SaaS, and commission is inherently a per-booking revenue share, neither fits bundling.

An org can have at most one active portfolio subscription (Pro/Business/Business Plus) at a time, covering up to the tier's `max_properties`. A property not slotted into the org's portfolio subscription defaults to Free (existing behavior) or can independently run Starter/Managed/Commission as it does today. Exceeding the cap requires upgrading to the next portfolio tier, not an à-la-carte overage add-on (matches ChatGPT's explicit reasoning against unlimited/uncapped bundles diluting margins).

## Implementation plan

### Phase 1 — Schema

New migration (after existing `20261031140000_pricing_plan_discounts.sql`):

- Add `max_properties INT` to `pricing_plans` (NULL = per-property/unbounded model as today; `growth`=3, `pro`=5; new `business_plus`=10).
- Seed new `business_plus` plan row (list ₱2,999, 20% discount → ₱2,399, `max_properties=10`, features: 15 seats, 20,000 AI credits, `searchVisibilityTier: 'top10'`, unlimited publishing, same AI toolkit as `pro`/Business).
- **`org_subscriptions`** — `id`, `organization_id UUID NOT NULL REFERENCES organizations(id)`, `plan_id UUID NOT NULL REFERENCES pricing_plans(id)` (constrained to portfolio-eligible plans: `growth`/`pro`/`business_plus`), `pricing_model`/`price_php_snapshot`/`max_properties_snapshot` (snapshot convention matches `property_subscriptions`), `status TEXT CHECK (... 'active','trialing','past_due','suspended','canceled')`, `current_period_start`/`current_period_end`. Partial unique index on `organization_id` where `status IN ('active','trialing','past_due')` — one live portfolio subscription per org (mirrors the existing `property_subscriptions_one_live_per_property_idx` pattern).
- **`org_subscription_properties`** — join table: `id`, `org_subscription_id FK`, `property_id UUID NOT NULL REFERENCES properties(id)`, unique on `property_id` (a property can only sit in one org subscription's slots at a time), `assigned_at`, `assigned_by`.
- Mirror `property_subscription_events`'s audit convention with an `org_subscription_events` table (assigned/plan_changed/property_added/property_removed/status_changed).

### Phase 2 — Entitlement resolution (`_shared/planEntitlements.ts`)

Extend `resolvePropertyEntitlements(propertyId)`:

1. Look up the property's org and check `org_subscription_properties` for a live assignment.
2. If found, resolve features/limits from the org subscription's plan (reuse the existing `PlanFeatures` JSONB shape — no new feature schema).
3. Else, fall back unchanged to the current `property_subscriptions` lookup (Free/Starter/Managed/Commission untouched).

Add `assignPropertyToOrgSubscription(orgId, propertyId, assignedBy)` / `removePropertyFromOrgSubscription(...)` / `createOrgSubscription(orgId, planId, propertyIds[], assignedBy)` alongside the existing `assignPropertyToPlan`. Enforce `max_properties` server-side on every assignment call (reject if the org subscription is already at capacity).

### Phase 3 — Checkout & PayMongo webhook

New edge function `create-org-subscription-checkout` (parallel to existing `create-subscription-checkout`): org-scoped, takes `plan_id` + selected `property_ids` (≤ cap), returns a PayMongo `checkoutUrl`. Extend `paymongo-webhook` with a branch that activates `org_subscriptions` on payment success — sets `current_period_start`/`end`, inserts the selected `org_subscription_properties` rows — mirroring how it already activates `property_subscriptions` today.

### Phase 4 — UI

- **New org-level Plans page**, e.g. `/org/:orgSlug/plans` (distinct from the existing per-property `/org/:orgSlug/property/:propertySlug/plans`, which continues to handle Free/Starter/Managed/Commission selection for an individual listing). Shows: current portfolio subscription (if any) with assigned properties, the Pro/Business/Business Plus tier ladder, a property picker (checkboxes over the org's properties, capped by the target tier's `max_properties`), and upgrade/downgrade flow reusing `PlanReviewDialog`/checkout patterns from the existing Plans page.
- **Per-property Plans page** (`PropertyPlansPage.tsx`): if the property is currently slotted into an org portfolio subscription, replace the tier-card carousel with a state banner ("Covered by your org's {Business} plan ({n}/{cap} properties) — manage at Org Plans") linking to the new org page; Free/Starter/Managed/Commission selection stays available for properties not in a portfolio.

### Phase 5 — Docs (same-change requirement per CLAUDE.md)

- `docs/guides/routes/org/property/plans.md` — add a note that Pro/Business/Business Plus can be org-bundled, with a link to the new org Plans route guide.
- New `docs/guides/routes/org/plans.md` — operator guide for the new org-level Plans page (route-guides skill conventions).
- `docs/workflow/done/host-plans-and-pricing-tiers.md` — append a note pointing to this plan as the source of truth for the portfolio-tier extension (same convention it already uses for `paymongo-subscription-billing.md`).
- `docs/PROJECT.md` — add the new route + `org_subscriptions`/`org_subscription_properties` tables to the architecture/route inventory.

### Rollout note

Since the pricing feature shipped 24h before this decision, check `property_subscriptions` for any existing paid-tier (`growth`/`pro`) assignments before deploying Phase 3. If any org already has 2+ properties on the same paid tier, that's a candidate for support-assisted migration into the new bundle (not a silent automatic switch, since it changes billing amounts) — flag for manual outreach rather than an automated backfill.

## Verification

No code exists yet — this is the decision + implementation plan. When picked up for implementation, verify per phase: Phase 1 via `bun run db:migrate` + inspecting the new tables/columns locally; Phase 2 via a direct call to `resolvePropertyEntitlements` for a property assigned to a mock org subscription; Phase 3 via a PayMongo sandbox checkout + webhook replay; Phase 4 via Playwright MCP driving the new org Plans page end-to-end (property picker, checkout, per-property banner state).
