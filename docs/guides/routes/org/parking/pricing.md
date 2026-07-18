# Parking Pricing — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/pricing`

> **Status:** Documented — weekday/weekend base rates + calendar overrides (no fees).

## Progress overview

| Section               | E2E save | Validation | Docs | Notes                                             |
| --------------------- | -------- | ---------- | ---- | ------------------------------------------------- |
| Base rates            | ✅       | ✅         | Done | `parking_settings.weekday_nightly_rate` / weekend |
| Calendar custom dates | ✅       | ✅         | Done | `parking_pricing_date_overrides`                  |
| Fees                  | —        | —          | N/A  | Not applicable for parking                        |
| Booked nights         | —        | —          | —    | Reserved for future parking reservation inventory |
| Team access           | —        | —          | Done | `org:parkings:view` / `org:parkings:manage`       |

---

## Overview

Parking **Pricing** mirrors the property pricing calendar but only stores **weekday** and **Fri–Sun weekend** nightly rates. There are **no fee defaults** (no down payment, security deposit, pet fee, etc.).

**Permissions:** `org:parkings:view` to open the page; `org:parkings:manage` to edit rates and calendar overrides.

**Defaults (seed):** weekday ₱300, weekend ₱400.

---

## Sections

### Summary cards

Three KPI chips: weekday base rate, weekend premium %, count of custom calendar dates.

### Calendar

- Month grid; **Fri–Sun** use the weekend nightly rate.
- Legend: **Available**, **Custom** (pen icon), **Booked** (disabled when inventory exists), **Selected**.
- Click or drag future available dates → **Set nightly rate** modal.
- Modal **Apply** / **Reset** persist overrides immediately (`parking_pricing_date_overrides`).

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

| Method | Edge function     | Query          | Body (PATCH)                                                |
| ------ | ----------------- | -------------- | ----------------------------------------------------------- |
| GET    | `parking-pricing` | `?parking_id=` | —                                                           |
| PATCH  | `parking-pricing` | `?parking_id=` | `weekdayNightlyRate`, `weekendNightlyRate`, `dateOverrides` |

Auth: signed-in user + org parking permission. `verify_jwt = false`; handler uses `verifyAuthenticatedUser` + `resolveScopedParkingAccess`.

---

## Implementation map

| Layer                | Path                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| Page                 | `ui/src/features/dashboard/parking/pages/ParkingPricingPage.tsx`       |
| Hooks                | `ui/src/features/dashboard/parking/hooks/useParkingPricing.ts`         |
| API client           | `ui/src/features/dashboard/parking/lib/parkingPricingApi.ts`           |
| Edge                 | `supabase/functions/parking-pricing/index.ts`                          |
| Shared               | `supabase/functions/_shared/parkingPricing.ts`                         |
| Migration            | `supabase/migrations/20260918140000_parking_pricing.sql`               |
| Calendar UI (shared) | `ui/src/features/dashboard/pricing/components/PricingCalendarGrid.tsx` |
