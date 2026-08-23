---
title: 'Parking Pricing — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-17
---

# Parking Pricing — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/pricing`

> **Status:** Documented — weekday/weekend base rates + calendar overrides (no fees).

## Progress overview

| Section               | E2E save | Validation | Docs | Notes                                             |
| --------------------- | -------- | ---------- | ---- | ------------------------------------------------- |
| Base rates            | ✅       | ✅         | Done | `parking_settings.weekday_nightly_rate` / weekend |
| Calendar custom dates | ✅       | ✅         | Done | `parking_pricing_date_overrides`                  |
| Date blocks           | ✅       | ✅         | Done | `parking_blocked_dates`; broadcast + calendar UI  |
| Fees                  | —        | —          | N/A  | Not applicable for parking                        |
| Booked nights         | ✅       | —          | Done | `bookedDateKeys` from claimed parking bookings    |
| Team access           | —        | —          | Done | `org:parkings:view` / `org:parkings:manage`       |

---

## Overview

Parking **Pricing** mirrors the property pricing calendar but only stores **weekday** and **Fri–Sun weekend** nightly rates. There are **no fee defaults** (no down payment, security deposit, pet fee, etc.).

**Permissions:** `org:parkings:view` to open the page; `org:parkings:manage` to edit rates and calendar overrides.

**Defaults (seed):** weekday ₱300, weekend ₱400.

---

## Host-facing knowledge

Parking **Pricing** sets how much guests pay per night for this slot. You define a weekday rate and a higher Fri–Sun weekend rate, then optionally override specific future dates on the calendar. There are no stay-style fees like deposits or pet fees, just nightly parking rates. Changes can apply to all future dates or only the month you’re viewing.

**Common host questions**

- Q: How do weekend rates work?
  A: Friday through Sunday nights use the weekend nightly rate automatically. Monday–Thursday use the weekday rate unless you set a custom price on the calendar for those dates.
- Q: Can I charge a special rate for holidays?
  A: Yes. Click or drag those dates on the calendar and set a custom nightly amount. Custom dates show with a pen icon in the legend.
- Q: Will booked or blocked nights block the calendar?
  A: **Booked** nights (claimed reservations) and **Blocked** nights (owner-managed closures) show on the calendar and are excluded from broadcast candidate matching. Block future dates via the pricing modal **Block** action; unblock the same way.

---

## Sections

### Summary cards

Three KPI chips: weekday base rate, weekend premium %, count of custom calendar dates.

### Calendar

- Month grid titled **Rates & availability** (_Manage pricing and availability_ on desktop); legend under the grid.
- Legend: **Available**, **Custom** (pen icon), **Booked**, **Blocked**, **Selected**.
- Click or drag future available dates → **Set nightly rate** modal (**Reset** / **Apply**; close via X). When every selected night is blocked, modal offers **Unblock** only.
- **Block** / **Unblock** in the modal persist via **`parking-pricing`** PATCH (`blockRange` / `unblockDateKeys`).

### Base rates (right column)

| Field               | DB column              | Default |
| ------------------- | ---------------------- | ------- |
| Weekday (per night) | `weekday_nightly_rate` | ₱300    |
| Fri–Sun (per night) | `weekend_nightly_rate` | ₱400    |

**Save** at the bottom of the card when values change.

### Save dialog (base rate changes)

| Option                    | Behavior                                                                       |
| ------------------------- | ------------------------------------------------------------------------------ |
| **All future dates**      | Updates `weekday_nightly_rate` / `weekend_nightly_rate` in `parking_settings`. |
| **{Month} only**          | Writes date overrides for each future day in the visible month at form rates.  |
| **Override custom rates** | Clears existing custom overrides before applying scope.                        |

---

## API

| Method | Edge function     | Query          | Body (PATCH)                                                                                 |
| ------ | ----------------- | -------------- | -------------------------------------------------------------------------------------------- |
| GET    | `parking-pricing` | `?parking_id=` | —                                                                                            |
| PATCH  | `parking-pricing` | `?parking_id=` | `weekdayNightlyRate`, `weekendNightlyRate`, `dateOverrides`, `blockRange`, `unblockDateKeys` |

Auth: signed-in user + org parking permission. `verify_jwt = false`; handler uses `verifyAuthenticatedUser` + `resolveScopedParkingAccess`.

---

## Implementation map

| Layer                | Path                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Page                 | `ui/src/features/dashboard/parking/pages/ParkingPricingPage.tsx`                                                |
| Hooks                | `ui/src/features/dashboard/parking/hooks/useParkingPricing.ts`                                                  |
| API client           | `ui/src/features/dashboard/parking/lib/parkingPricingApi.ts`                                                    |
| Edge                 | `supabase/functions/parking-pricing/index.ts`                                                                   |
| Shared               | `supabase/functions/_shared/parkingPricing.ts`, `parkingBlockedDates.ts`                                        |
| Migration            | `supabase/migrations/20260918140000_parking_pricing.sql`, `20261104120000_parking_blocked_dates_automation.sql` |
| Calendar UI (shared) | `ui/src/features/dashboard/pricing/components/PricingCalendarGrid.tsx`                                          |
