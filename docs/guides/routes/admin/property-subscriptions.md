---
title: 'Super Admin property subscriptions — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-24
---

# Super Admin property subscriptions — operator guide

Route: `/admin/pricing/subscriptions`

> **Status:** Documented

## Progress overview

| Section                | E2E save | Validation | Docs | Notes                               |
| ---------------------- | -------- | ---------- | ---- | ----------------------------------- |
| Property subscriptions | Done     | Server     | Done | Assign, billing cron, extend period |

---

## Overview

Lists properties with their current plan assignment (including **`past_due`** and **`suspended`**). Super-admin can manually assign plans, run the billing dunning cron, or extend a subscription period for support cases.

**Access:** `RequireSuperAdmin`.

**Browser tab title:** `Kame Homes - Property subscriptions`

---

## Behavior

- **Summary cards:** properties, assigned, unassigned, organizations — platform-wide totals, **not** derived from the filtered/paginated list. The edge function answers `?summary=true` with four lightweight `count`-only PostgREST queries (`head: true`, no rows returned): total properties, properties with a live `property_subscriptions!inner` row (`status` in `active`/`trialing`/`past_due`/`suspended`), `property_subscriptions` rows with `status = active`, and organizations with `properties!inner` (distinct via the to-many embed, not row-multiplied). This stays cheap regardless of how many properties/orgs exist — no full-table fetch, and no page-size cap standing in for a total.
- **Run billing cron** — PATCH **`property-subscriptions-admin`** **`{ action: "run_billing_cron" }`** → renewal links, past-due transitions, suspensions (same as hosted **`platform-billing-cron`**).
- **Toolbar:** search, plan filter, table/grid view toggle (grid forced on mobile), per-page select (31/50/100, `AdminListPerPageSelect`). Search and plan-filter are sent as query params and applied **server-side** in the edge function before pagination — search uses `.or()` ilike across property `name`/`slug`; the plan filter switches the properties→property_subscriptions→pricing_plans select to `!inner` joins with `.in('property_subscriptions.status', […])` + `.eq('property_subscriptions.pricing_plans.code', planCode)` so only properties whose _live_ subscription matches the chosen plan are returned (relies on the `property_subscriptions_one_live_per_property_idx` partial unique index to keep at most one live row per property, avoiding row-multiplication).
- **Pagination:** standard admin-list `page`/`limit` pattern (matches Bookings) — `page`/`limit` in the URL, resets to page 1 on filter/limit change, `AdminListPagination` shown once results span more than one page. List query uses `.select('*', { count: 'exact' })` + `.range()` for real database-level pagination — no fetch-all-then-slice. Default is 31, capped 100.
- Table/grid: org, current plan + status, plan selector + **Apply** for manual assign.
- Assign calls POST → **`assignPropertyToPlan()`** (snapshots price/commission, audit event, AI credit sync).
- Detail (**`?propertyId=`**): recent subscription events + payment transactions.

New properties auto-receive the default Free plan on creation (`create-property`, `create-organization`).

---

## API

| Method | Edge function                  | Notes                                                                                                                                                                                                                         |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `property-subscriptions-admin` | Paginated list/filter (`search`, `planCode`, `page`, `limit` — default 31, capped 100), platform-wide aggregate (`summary=true` → `{ summary }`), or detail (`propertyId`); list returns `{ properties, total, page, limit }` |
| POST   | `property-subscriptions-admin` | Manual assign **`{ propertyId, planId, note? }`**                                                                                                                                                                             |
| PATCH  | `property-subscriptions-admin` | **`run_billing_cron`** or **`extend_period`** **`{ propertyId, periodEnd, status?, note? }`**                                                                                                                                 |

---

## Implementation map

| Layer  | Path                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| Page   | `ui/src/features/dashboard/super-admin/pages/SuperAdminPropertySubscriptionsPage.tsx` |
| Hooks  | `usePricingPlans.ts`, `usePlatformPaymentSettings.ts` (`useRunPlatformBillingCron`)   |
| Edge   | `supabase/functions/property-subscriptions-admin/index.ts`                            |
| Shared | `supabase/functions/_shared/planEntitlements.ts`, `subscriptionOrchestrator.ts`       |

---

## Host-facing knowledge

Hosts manage paid plans on the property **Plans & Billing** page (PayMongo checkout). Contact support for manual plan changes or billing extensions. A **suspended** listing restricts dashboard access to Plans & Billing and Help until payment clears; guest booking pages keep working.
