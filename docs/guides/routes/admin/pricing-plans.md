---
title: 'Super Admin pricing plans — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-18
---

# Super Admin pricing plans — operator guide

Route: `/admin/pricing/plans`

> **Status:** Documented

## Progress overview

| Section       | E2E save | Validation | Docs | Notes                        |
| ------------- | -------- | ---------- | ---- | ---------------------------- |
| Pricing plans | Done     | Server     | Done | Edit tier catalog + features |

---

## Overview

Super-admin CRUD surface for the **`pricing_plans`** tier catalog (5 subscription tiers + 1 commission plan). Changes affect entitlement resolution for newly assigned properties and the feature JSONB defaults hosts inherit when assigned to a plan.

**Access:** `RequireSuperAdmin` — email in `SUPER_ADMIN_EMAILS`.

---

## Behavior

- **Summary cards:** total plans, subscription tiers, commission plans, active plans.
- **Toolbar:** search, model filter (subscription/commission), status filter, table/grid view toggle (grid forced on mobile).
- Table uses shared **`AdminDataTable`** shell; grid shows plan cards with the same actions.
- **Results meta:** “Showing X of Y” when the catalog is non-empty.
- **Edit** opens a **`ResponsiveModal`** (bottom sheet on mobile): name, tagline, sort order, **list price** (subscription), **discount %** (0–100, whole pesos; host price = floor(list × (100 − discount) / 100)), commission % (commission plan), AI monthly credits, boolean feature toggles, team max members, active flag. Live preview shows the host checkout price.
- Saving calls **`pricing-plans`** PATCH; does not retroactively change in-flight PayMongo periods (future billing plan).

---

## API

| Method | Edge function   | Notes       |
| ------ | --------------- | ----------- |
| GET    | `pricing-plans` | List all    |
| PATCH  | `pricing-plans` | Update plan |

---

## Implementation map

| Layer  | Path                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| Page   | `ui/src/features/dashboard/super-admin/pages/SuperAdminPricingPlansPage.tsx` |
| Hook   | `ui/src/features/dashboard/super-admin/hooks/usePricingPlans.ts`             |
| Edge   | `supabase/functions/pricing-plans/index.ts`                                  |
| Shared | `supabase/functions/_shared/planFeatures.ts`                                 |

---

## Host-facing knowledge

Hosts do not use this page. They will manage plans per listing on the property **Plans** page once that follow-on plan ships.
