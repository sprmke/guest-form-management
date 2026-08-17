---
title: 'Plans & Pricing page (host-facing, property-scoped)'
status: active
tags: [workflow, planned, billing, pricing]
updated: 2026-08-18
stage: planned
kind: plan
---

# Plans & Pricing page (property-scoped, foundation)

## Context

Hosts currently have no way to see or change their pricing plan — the tier catalog and entitlement backbone were built in a separate, already-in-progress plan ([`host-plans-and-pricing-tiers.md`](../in-progress/host-plans-and-pricing-tiers.md)), but nothing surfaces it to hosts yet. This plan is the first of a deliberately split set of five related intake items (`docs/workflow/intake/_to-plan.md` lines ~505–629): it builds **only the host-facing Plans page** — viewing the 5 subscription tiers for a property listing and switching to a plan — with the actual payment step stubbed out, since PayMongo billing collection is its own separate, not-yet-built plan ([`paymongo-subscription-billing.md`](./paymongo-subscription-billing.md)). Per explicit user direction: do not implement either referenced plan here, build only the pricing page foundation, and document what's created in the same change.

**Verified this session — the data-model prerequisite has already shipped**: `supabase/migrations/20261023120000_pricing_plans_foundation.sql` (tables `pricing_plans`, `property_subscriptions`, `property_subscription_events`, `booking_commission_charges`, seeded with 5 subscription tiers + 1 commission row, exactly one `is_default` Free row), `supabase/functions/_shared/planFeatures.ts` (`PlanFeatures` type, `DEFAULT_PLAN_FEATURES`, `mergePlanFeatures`/`parsePlanFeatures`), and `supabase/functions/_shared/planEntitlements.ts` (`resolvePropertyEntitlements`, `getActivePropertySubscription`, `assignPropertyToPlan`, `ensurePropertySubscription`) — all read in full this session. This plan **consumes** those, it does not modify them. No edge function or UI exposes any of this yet — that's this plan's job.

## User-confirmed scope decisions

1. **Property-scoped page**: new route `/org/:orgSlug/property/:propertySlug/plans` (pricing is per listing, not per org).
2. **Full comparison + review UX, but paid "Pay" is a stub**: build the complete flow (tier comparison → select → review/confirm dialog → confirm), but confirming a **paid** tier only shows a "payment coming soon" toast — no checkout, no payment API call. Confirming the **Free** tier does a real `assignPropertyToPlan` write, since there's no payment step for Free.
3. **Only the 5 flat subscription tiers are shown** — the commission-based plan (`pricing_model = 'commission'`) is excluded from both the API response and the UI; its rate is an unconfirmed placeholder per the tier-catalog plan.

## Backend — one new edge function

**`supabase/functions/property-plan/index.ts`** — `serveAuthenticated('property-plan', ...)`, single function (not two — this is a small read+one-mutation surface; the admin-heavy CRUD belongs to the separate tier-catalog plan's `pricing-plans`/`property-subscriptions-admin` functions, not duplicated here):

- **GET** `?propertyId=` — `resolveScopedPropertyAccess(req, 'settings:view', propertyId)` (any property member who can view settings). Returns the 5 active `pricing_plans` rows where `pricing_model = 'subscription'`, ordered by `sort_order`, plus the property's current subscription via `getActivePropertySubscription(propertyId)`.
- **POST** `{ propertyId, planId }` — `verifyPropertyOwner(req, propertyId)` (owner-only — billing-sensitive). Loads the target plan; **rejects with 400 if it isn't the Free/`is_default` plan** — the backend must not trust the stubbed frontend to gate paid selections. Calls `assignPropertyToPlan(propertyId, planId, user.id)` (already handles the subscription row, audit event, and AI-credit sync). Returns the refreshed subscription.

`supabase/config.toml`: add `[functions.property-plan]` with `verify_jwt = false` (manual JWT verification inside `serveAuthenticated`, matching every other function's Kong ES256 workaround).

No edge function is needed for the stub-pay path — it never leaves the client.

## Frontend — `ui/src/features/dashboard/plans/`

Confirmed no naming collision: `ui/src/features/dashboard/pricing/` is the unrelated nightly-rate calendar feature.

```
ui/src/features/dashboard/plans/
  routes/index.tsx            # plansPropertyRoute(propertyRoute)
  pages/PropertyPlansPage.tsx # dedicated full page — a 5-tier comparison needs its own layout,
                               # not a cramped AdminSection settings tab
  components/
    PlanTierCard.tsx          # single tier: name, price, feature bullets, CTA
    PlanComparisonGrid.tsx    # responsive grid of PlanTierCard, stacks to 1 column on mobile
    PlanCurrentBadge.tsx      # "Current plan" pill on the active tier
    PlanReviewDialog.tsx      # shadcn Dialog — selected-tier summary + Confirm button;
                               # Confirm branches: Free tier -> real mutation, paid tier -> stub toast
  hooks/usePropertyPlan.ts    # TanStack Query: GET property-plan; POST mutation for Free-tier confirm
  lib/
    propertyPlanApi.ts        # fetch wrappers + DTOs, mirrors propertyPricingApi.ts's shape
    planStubPayToast.ts       # toastPlanPaymentComingSoon() — copies aiQuotaToast.ts's two-toast
                               # action pattern into a new file (different domain, don't touch that file)
```

Reuse instead of duplicate:

- Route wiring: add `plansPropertyRoute(propertyRoute)` to the composed list in `ui/src/features/dashboard/routes/index.tsx` alongside `pricingPropertyRoute`/`financePropertyRoute` (confirmed exact pattern at `ui/src/features/dashboard/routes/index.tsx:23,45`).
- Nav + permissions: add a "Plans" entry to `buildPropertyNavSections` (`ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts:116`) and `Plans: 'settings:view'` to `PROPERTY_NAV_VIEW_PERMISSION` + the `PropertySection` union (`ui/src/features/dashboard/team/lib/propertyPermissions.ts:17,40`).
- Data-hook shape: mirror `ui/src/features/dashboard/org/hooks/useAiPlatformSettings.ts` (query key `['property', propertyId, 'plan']`, `scopedFunctionsUrl` + `getAdminJwt()`, `useMutation` + `invalidateQueries`).
- Toast stub pattern: copy the exact shape of `toastAiQuotaExceeded` in `ui/src/features/dashboard/org/lib/aiQuotaToast.ts` (action button → second "coming soon, contact support" toast) into the new `planStubPayToast.ts`.
- Non-owner UX: hide the Confirm-mutation path for paid-tier selection when the viewer isn't the owner (view-only for `settings:view`-but-not-owner members), rather than exposing a button that 403s.

## Phase breakdown

### Phase 1 — Backend

- [ ] `supabase/functions/property-plan/index.ts` (GET + POST as above).
- [ ] `supabase/config.toml` entry.

**Docs (same change):** `docs/architecture/edge-functions.md` new row; `docs/PROJECT.md` new "Plans & Pricing (host-facing)" section stub.

### Phase 2 — Page, comparison grid, tier cards

- [ ] `lib/propertyPlanApi.ts`, `hooks/usePropertyPlan.ts`.
- [ ] `components/PlanTierCard.tsx`, `PlanComparisonGrid.tsx`, `PlanCurrentBadge.tsx`.
- [ ] `pages/PropertyPlansPage.tsx` (loading/error/empty states, minimal copy per `minimal-ui-copy`).
- [ ] `routes/index.tsx` + wire into `dashboard/routes/index.tsx`.
- [ ] Nav entry + permission mapping.

**Docs (same change):** new `docs/guides/routes/org/property/plans.md` (invoke `route-guides` skill) + row in `docs/guides/routes/README.md`; extend `docs/PROJECT.md` section with the route/UI.

### Phase 3 — Review dialog, Free-tier real flow, paid-tier stub

- [ ] `components/PlanReviewDialog.tsx` with the Free/paid Confirm branching.
- [ ] `lib/planStubPayToast.ts`.
- [ ] Success/error toasts on the real Free-tier mutation.

**Docs (same change):** finalize `docs/PROJECT.md` section (Tables reference / Edge function / UI rows, matching an existing completed-module's format); `docs/architecture/edge-functions.md` row finalized with the paid-tier-rejection behavior; `docs/README.md` index row; finalize `plans.md` route guide with the dialog/stub UX.

## Non-goals

- No PayMongo integration — paid "Pay" is a client-side stub only; no checkout link, webhook, or transaction row.
- No super-admin CRUD (`SuperAdminPricingPlansPage`, `pricing-plans`/`property-subscriptions-admin` functions) — owned by the tier-catalog plan.
- No feature-gating/paywall enforcement elsewhere in the app (watermarks, upgrade modals) — a separate intake item.
- No changes to `pricing_plans`/`property_subscriptions` schema, seed data, or `planFeatures.ts`/`planEntitlements.ts` — read-only consumption of what already shipped.
- No commission-plan display.
- No org-level billing tab or `platform_subscriptions` tables — those are the separate, org-scoped PayMongo plan.

## Verification

No automated test suite exists (per `CLAUDE.md`) — manual:

1. `bun run type-check && bun run lint && bun run build`.
2. `mcp__supabase__get_advisors` (expect no new advisories — this plan adds no tables).
3. `bun run dev:api`; curl GET `property-plan` with a host JWT — confirm exactly 5 subscription-model plans (no commission row) + current subscription returned.
4. Curl POST with a paid `planId` — confirm 400 rejection.
5. Curl POST with a non-owner member JWT — confirm 403.
6. Manual/Playwright click-through: sign in as a host with a Free-tier property → `/org/:orgSlug/property/:propertySlug/plans` shows all 5 tiers, Free badged as current → click a paid tier → review dialog → Confirm → "coming soon" toast sequence, confirm no network POST fires (`mcp__playwright__browser_network_requests`) → click Free tier → Confirm → real POST fires, success toast → resize to 375px, confirm the grid stacks to one column.
