# Pricing — operator guide

Route: `/org/:orgSlug/property/:propertySlug/pricing`

> **Status:** Documented — E2E save + booking workflow integration.

## Progress overview

| Section               | E2E save | Validation | Docs | Notes                                                                |
| --------------------- | -------- | ---------- | ---- | -------------------------------------------------------------------- |
| Base rates            | ✅       | ✅         | Done | `app_settings.weekday_nightly_rate` / `weekend_nightly_rate`         |
| Calendar custom dates | ✅       | ✅         | Done | `property_pricing_date_overrides`; modal on select/drag              |
| Fee defaults          | ✅       | ✅         | Done | `app_settings` columns; used by `ReviewPricingForm`                  |
| Booked nights         | ✅       | —          | Done | From live `guest_submissions` (non-`CANCELLED`)                      |
| Holiday premiums      | ✅       | ✅         | Done | `app_settings.pricing_holiday_rules`; calendar + `ReviewPricingForm` |
| Team access           | —        | —          | Done | `pricing:view` / `pricing:edit`                                      |

---

## Overview

Property **Pricing** lets managers set default nightly rates (weekday vs **Fri–Sun** weekend), per-date overrides on a calendar, and default fee amounts used when admins review booking pricing (`ReviewPricingForm` on **Proceed to Pending Documents** and booking edit).

**Permissions:** `pricing:view` to open the page; `pricing:edit` to change values. Manager preset includes both; Staff and Viewer get view-only.

Saved defaults apply when a booking row has **no stored pricing columns yet** — existing `guest_submissions` snapshots are never overwritten automatically.

---

## Sections

### Summary cards

Four compact KPI chips: weekday rate, weekend premium %, custom calendar dates, sum of default fees.

### Calendar

- Month grid; **Fri–Sun** use the weekend nightly rate (same cell styling as weekdays — price only differs).
- Legend: **Available**, **Holiday** (sparkle), **Custom** (pen icon), **Booked**, **Selected**.
- Click or drag to select future **available** dates → **Set nightly rate** modal.
- Modal **Apply** / **Reset** persist overrides immediately (`property_pricing_date_overrides`).
- Past dates and booked dates are disabled.

### Base rates & fees (right column)

Single card with **Base rates** and **Fees** sections separated by a divider. **Save** lives at the bottom of this card (not in the page header).

| Field               | DB column              | Default (seed) |
| ------------------- | ---------------------- | -------------- |
| Weekday (per night) | `weekday_nightly_rate` | ₱2,799         |
| Fri–Sun (per night) | `weekend_nightly_rate` | ₱2,999         |

| Label            | Column                         | Default |
| ---------------- | ------------------------------ | ------- |
| Down payment     | `default_down_payment`         | ₱1,500  |
| Security deposit | `default_security_deposit`     | ₱1,500  |
| Pet fee          | `default_pet_fee`              | ₱300    |
| Parking rate     | `default_parking_rate_guest`   | ₱400    |
| Extra guest fee  | `default_guest_additional_fee` | ₱0      |

Each row is a label + amount input. Set unused fees to ₱0. Airbnb bookings still zero DP/SD at workflow time.

**Removed from PMA port:** length-of-stay discounts, holiday pricing list panel, min/max nights.

### Save

**Save** behavior depends on what changed:

| Change                                | Behavior                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------- |
| **Fees only**                         | Saves immediately (no dialog). PATCH sends fee default columns only.        |
| **Weekday and/or Fri–Sun base rates** | Opens **Save pricing** dialog (fees save with the same PATCH when present). |

Dialog options (base rate changes only):

| Option                    | Behavior                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **All future dates**      | Updates `weekday_nightly_rate` / `weekend_nightly_rate` in `app_settings` (property-wide defaults).                                                                               |
| **{Month} only**          | Does not change stored base rates; writes date overrides for each future available day in the visible calendar month at the form’s weekday/weekend rates (incl. holiday premium). |
| **Override custom rates** | When checked, clears existing custom overrides before applying the save (then applies scope above). When unchecked, keeps custom override dates.                                  |

Calendar legend: **Custom** = pen icon on overridden dates.

---

## Booking workflow integration

| Surface                               | Behavior                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewPricingForm` (workflow + edit) | Loads property pricing via `usePropertyPricingDefaults`. **Booking rate** = sum of nightly rates (weekday/weekend + holiday premiums + date overrides) for occupied nights. Custom override wins over holiday premium. Fee fields default from property settings when booking columns are null. **Fri–Sun** weekend rule matches this page. |
| Guest form / public calendar          | No price display (unchanged).                                                                                                                                                                                                                                                                                                               |
| `PayParkingModal`                     | Still uses booking row `parking_rate_guest` or ₱400 fallback; property default flows in when admin sets parking fee at review.                                                                                                                                                                                                              |

---

## API reference

| Method | Function           | Auth                 | Body / query                                                                                                                                                                                                         |
| ------ | ------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `property-pricing` | JWT + `pricing:view` | `?property_id=` (scoped); optional `?month=YYYY-MM` scopes **bookedDateKeys** to that month                                                                                                                          |
| PATCH  | `property-pricing` | JWT + `pricing:edit` | camelCase: `weekdayNightlyRate`, `weekendNightlyRate`, `downPayment`, `securityDeposit`, `petFee`, `parkingRateGuest`, `guestAdditionalFee`, `dateOverrides` (`Record<YYYY-MM-DD, number>`), optional `holidayRules` |

**GET/PATCH response** (`data`):

```json
{
  "weekdayNightlyRate": 2799,
  "weekendNightlyRate": 2999,
  "downPayment": 1500,
  "securityDeposit": 1500,
  "petFee": 300,
  "parkingRateGuest": 400,
  "guestAdditionalFee": 0,
  "dateOverrides": { "2026-07-11": 3499 },
  "bookedDateKeys": ["2026-07-18", "2026-07-19"],
  "holidayRules": [
    {
      "id": "peak-july",
      "name": "Peak season",
      "startDate": "2026-07-04",
      "endDate": "2026-07-04",
      "percentage": 25
    }
  ]
}
```

---

## DB

| Table / column                              | Purpose                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `app_settings.weekday_nightly_rate`         | Mon–Thu default                                                                       |
| `app_settings.weekend_nightly_rate`         | Fri–Sun default                                                                       |
| `app_settings.default_down_payment`         | Review pricing default                                                                |
| `app_settings.default_security_deposit`     | Review pricing default                                                                |
| `app_settings.default_pet_fee`              | When `has_pets`                                                                       |
| `app_settings.default_parking_rate_guest`   | When `need_parking` — **sole admin editor** is this Pricing page (`property-pricing`) |
| `app_settings.default_guest_additional_fee` | Extra guest fee default                                                               |
| `app_settings.pricing_holiday_rules`        | JSON array of `{ id, name, startDate, endDate, percentage }`                          |
| `property_pricing_date_overrides`           | `(property_id, pricing_date)` → `nightly_rate`                                        |

Migrations: `20260910130000_property_pricing.sql`, `20260910140000_pricing_holiday_rules.sql`

---

## Implementation map

| Concern            | Path                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Page               | `ui/src/features/dashboard/pricing/pages/PropertyPricingPage.tsx`                            |
| Rates + fees card  | `ui/src/features/dashboard/pricing/components/PricingRatesFormCard.tsx`                      |
| Save dialog        | `ui/src/features/dashboard/pricing/components/PricingSaveDialog.tsx`                         |
| Save patch builder | `ui/src/features/dashboard/pricing/lib/pricingSave.ts`                                       |
| Hooks / API        | `ui/src/features/dashboard/pricing/hooks/usePropertyPricing.ts`, `lib/propertyPricingApi.ts` |
| Booking rate math  | `ui/src/features/dashboard/pricing/lib/pricingCompute.ts`                                    |
| Calendar           | `ui/src/features/dashboard/pricing/components/PricingCalendarGrid.tsx`                       |
| Date modal         | `ui/src/features/dashboard/pricing/components/PricingDateModal.tsx`                          |
| Defaults           | `ui/src/features/dashboard/pricing/lib/pricingDefaults.ts`                                   |
| Calendar helpers   | `ui/src/features/dashboard/pricing/lib/pricingCalendarUtils.ts`                              |
| Edge function      | `supabase/functions/property-pricing/index.ts`                                               |
| Server service     | `supabase/functions/_shared/propertyPricing.ts`                                              |
| Workflow form      | `ui/src/features/dashboard/bookings/components/ReviewPricingForm.tsx`                        |
| Routes             | `ui/src/features/dashboard/routes/index.tsx`                                                 |
| Permissions        | `propertyTeamPermissions.ts` — `pricing:view`, `pricing:edit`                                |

---

## Related docs

- [Route index](../../README.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
- [Property team](./team.md) — permission presets
- [Bookings detail](./bookings-detail.md) — `ReviewPricingForm` in workflow

---

## Pending / follow-ups

- [ ] Public guest calendar price display (optional — outside this admin module)
