# Organization Properties — operator guide

Route: `/org/:orgSlug/properties`

> **Status:** Documented

## Progress overview

| Section           | E2E save | Validation | Docs | Notes                                                    |
| ----------------- | -------- | ---------- | ---- | -------------------------------------------------------- |
| Summary cards     | Done     | —          | Done | Total, total revenue, avg monthly revenue, avg occupancy |
| Search & filters  | Done     | —          | Done | Name, slug, tower, address, status, type                 |
| Grid / list views | Done     | —          | Done | Gallery carousel + booking KPIs                          |
| Property cards    | Done     | —          | Done | Name title, tower/unit subtitle                          |
| Add property      | Done     | Done       | Done | Dialog → settings on create                              |

---

## Overview

Org-level inventory of all properties. Cards surface profile data from `properties` + `properties.settings` and booking KPIs for the **current Manila calendar month** (not all-time).

**Access:** Requires **`org:properties:view`** (org owner, org ADMIN, platform admin). **Property-only members** (`accessKind: property_member`) cannot open org routes — `RequireOrgPermission` redirects them to an assigned property dashboard.

**Add property:** Requires **`org:properties:create`** (org **Owner** and platform admin only). Org **Admin** may view and edit properties but cannot create new ones.

---

## Stats period (important)

All revenue and occupancy figures on this page use the **current calendar month in `Asia/Manila`**, matching the dashboard default trend window (`dashboardService.ts#defaultManilaMonthRange`).

| Metric                                             | Scope                              | Formula                                                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Per-property revenue** (`stats.monthlyRevenue`)  | Current Manila month, one property | Sum of **booking rate** allocated to **occupied nights** that fall inside the month (same proration as dashboard **rated revenue** / calendar price pills). Excludes `CANCELLED` bookings. |
| **Per-property occupancy** (`stats.occupancyRate`) | Current Manila month, one property | `round(occupiedNightsInMonth ÷ daysInMonth × 100)`. One property → max 100% if every night is booked.                                                                                      |
| **Per-property bookings** (`stats.activeBookings`) | All time (pipeline)                | Count of rows where `status` is not `CANCELLED` and not `COMPLETED`.                                                                                                                       |

---

## Summary cards

| Card                    | Computation                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Total properties**    | Count of all org properties (`ACTIVE` + `INACTIVE`).                            |
| **Total revenue**       | Sum of each property’s `stats.monthlyRevenue` for the **current Manila month**. |
| **Avg monthly revenue** | `totalRevenue ÷ totalProperties` (includes properties with ₱0).                 |
| **Avg. occupancy**      | Mean of each property’s `stats.occupancyRate` for the **current Manila month**. |

---

## Property card / list row

| UI element              | Source                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Image carousel          | `properties.settings.media` — swipe/drag on touch and pointer; arrows and dots change slide only      |
| Card navigation         | Stretched link behind card body; carousel and **⋯** menu sit above it and do not trigger navigation   |
| **Title**               | `properties.name`                                                                                     |
| **Subtitle**            | Tower + unit (`properties.tower` + `properties.unit_number`, or legacy `tower_and_unit`) when present |
| Type                    | `properties.type`                                                                                     |
| Location                | `settings.city`, `settings.province`; fallback residence + address                                    |
| Beds / baths / guests   | `settings.bedrooms`, `settings.bathrooms`, `properties.max_guests`                                    |
| Description (list only) | `settings.description`                                                                                |
| **Bookings**            | Active pipeline count (see table above)                                                               |
| **Revenue**             | Current-month lodging revenue for this property                                                       |
| **Occupancy**           | Current-month occupancy % for this property                                                           |

---

## Filters

| Control | Behavior                                    |
| ------- | ------------------------------------------- |
| Search  | Name, slug, tower, unit, residence, address |
| Status  | `ACTIVE` / `INACTIVE`                       |
| Type    | Case-insensitive match on `properties.type` |
| View    | Grid or list                                |

---

## Actions menu

| Action          | Target                                 |
| --------------- | -------------------------------------- |
| Open dashboard  | `/org/:orgSlug/property/:propertySlug` |
| Settings        | `…/settings`                           |
| Guest calendar  | Public `/?property=<slug>` (new tab)   |
| Copy guest link | Clipboard                              |

---

## Add property

**Add property** (header button, empty state, sidebar switcher **+**) → `AddPropertyDialog` → **`POST create-property`** (`org:properties:create`) → navigates to new property **Settings**. Hidden for org **Admin** and property-only members.

---

## API reference

| Action       | Endpoint                                                                      |
| ------------ | ----------------------------------------------------------------------------- |
| List + stats | `GET list-properties?orgSlug=` → `{ properties: [{ …, stats }] }`             |
| Create       | `POST create-property` — **`org:properties:create`** (owner / platform admin) |

### `stats` shape (per property)

```json
{
  "activeBookings": 2,
  "monthlyRevenue": 95000,
  "occupancyRate": 78
}
```

Server: `list-properties` loads org properties, batch-loads `guest_submissions` for those IDs, then `propertyListStats.ts` → `dashboardService.ts#computePropertyPeriodStats` per property.

---

## Implementation map

| Concern           | Path                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Page              | `ui/src/features/dashboard/org/pages/OrgPropertiesPage.tsx`                                                         |
| Cards / list      | `ui/src/features/dashboard/org/components/org-properties/OrgPropertyCard.tsx`                                       |
| Carousel          | `ui/src/features/dashboard/org/components/org-properties/OrgPropertyImageCarousel.tsx`                              |
| Summary / toolbar | `ui/src/features/dashboard/org/components/org-properties/OrgPropertiesSummaryCards.tsx`, `OrgPropertiesToolbar.tsx` |
| Card model        | `ui/src/features/dashboard/org/lib/orgPropertyCardModel.ts`                                                         |
| Title helpers     | `ui/src/features/dashboard/org/lib/propertyDisplay.ts`                                                              |
| Stats aggregation | `supabase/functions/_shared/propertyListStats.ts`, `dashboardService.ts#computePropertyPeriodStats`                 |
| List API          | `supabase/functions/list-properties/index.ts`                                                                       |

---

## Related docs

- [Route index](../README.md)
- [Property settings](./property/settings.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] Delete/archive shortcuts from card actions menu (today: settings → Danger zone)
- [ ] Per-property deep link to filtered bookings list from stats row
