---
title: 'Super Admin property subscriptions — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-18
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

- **Summary cards:** properties, assigned, unassigned, organizations.
- **Run billing cron** — PATCH **`property-subscriptions-admin`** **`{ action: "run_billing_cron" }`** → renewal links, past-due transitions, suspensions (same as hosted **`platform-billing-cron`**).
- **Toolbar:** search, plan filter, table/grid view toggle (grid forced on mobile). Filtering is client-side over the loaded list (up to 500 rows).
- Table/grid: org, current plan + status, plan selector + **Apply** for manual assign.
- Assign calls POST → **`assignPropertyToPlan()`** (snapshots price/commission, audit event, AI credit sync).
- Detail (**`?propertyId=`**): recent subscription events + payment transactions.

New properties auto-receive the default Free plan on creation (`create-property`, `create-organization`).

---

## API

| Method | Edge function                  | Notes                                                                                         |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------- |
| GET    | `property-subscriptions-admin` | List / filter / detail                                                                        |
| POST   | `property-subscriptions-admin` | Manual assign **`{ propertyId, planId, note? }`**                                             |
| PATCH  | `property-subscriptions-admin` | **`run_billing_cron`** or **`extend_period`** **`{ propertyId, periodEnd, status?, note? }`** |

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

Hosts manage paid plans on the property **Plans** page (PayMongo checkout). Contact support for manual plan changes or billing extensions. A **suspended** listing restricts dashboard access to Plans and Help until payment clears; guest booking pages keep working.
