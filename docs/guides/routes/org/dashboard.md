# Organization Dashboard — operator guide

Route: `/org/:orgSlug/dashboard`

> **Status:** Documented

## Progress overview

| Section                  | E2E save | Validation | Docs | Notes                                    |
| ------------------------ | -------- | ---------- | ---- | ---------------------------------------- |
| Date range filter        | —        | —          | Done | Same presets as property dashboard       |
| Stat cards               | —        | —          | Done | Revenue, bookings, occupancy, properties |
| Revenue / bookings chart | —        | —          | Done | Working toggle                           |
| Booking status donut     | —        | —          | Done | Canonical workflow statuses              |
| Recent bookings          | —        | —          | Done | Links to property booking detail         |
| Pending actions          | —        | —          | Done | From `dashboard-stats.attention`         |
| Properties performance   | —        | —          | Done | Per-property period KPIs                 |
| Add asset                | ✅       | ✅         | Done | Opens unified `AddEntityDialog`          |

---

## Overview

Org-level performance overview across **all properties** in the organization. Page header: **Dashboard** with subtitle _Performance overview across all properties in your organization._ The selected **`?from` / `?to`** range (Asia/Manila calendar days) drives KPIs, charts, recent bookings, and property performance rows.

**Add asset** (visible when the signed-in user can create at least one property or parking in the org): header button opens the same unified modal as the workspace switcher **+** — property or parking, with development → tower → slot fields. Creating an asset navigates straight to its new dashboard.

There is **no** New Booking button on this page.

---

## Date range

Uses **`BookingDateRangeFilter`** in the page header — same behavior as the property dashboard:

| Preset | Behavior                                               |
| ------ | ------------------------------------------------------ |
| Week   | Sun–Sat, navigable with arrows                         |
| Month  | Current calendar month (default when URL has no range) |
| Year   | Current calendar year                                  |
| Custom | Calendar popover                                       |

URL params: `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

---

## Stat cards

| Card                 | Source                  | Notes                                                                            |
| -------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| **Total Revenue**    | `kpis.netProfit`        | Operating host net for check-ins in range; trend vs previous equal-length period |
| **Total Bookings**   | `kpis.checkInsInPeriod` | Count of non-cancelled stays with check-in in range                              |
| **Occupancy Rate**   | `kpis.occupancyRate`    | Occupied nights ÷ period days, aggregated org-wide                               |
| **Total Properties** | `propertyCount`         | All properties in the org                                                        |

---

## Revenue Overview chart

Area chart from `trendSeries`:

| Toggle       | `dataKey`  | Y-axis                                                          |
| ------------ | ---------- | --------------------------------------------------------------- |
| **Revenue**  | `revenue`  | PHP (rated lodging allocated to occupied nights in each bucket) |
| **Bookings** | `bookings` | Integer check-in count                                          |

Buckets: **daily** when period ≤ 45 days; otherwise **monthly**.

---

## Booking Status

Donut + legend from `statusBreakdown`. Legend lists six pipeline buckets (plus **Completed**) with **0** when empty. **Pending Documents** sums `PENDING_DOCUMENTS`, `PENDING_GAF`, `PENDING_PARKING_REQUEST`, and `PENDING_PET_REQUEST`. Donut slices render only for counts > 0. Counts are **current** non-cancelled bookings org-wide (not limited to the selected period).

---

## Recent Bookings

Up to **5** stays with check-in in the selected period, sorted by check-in descending. Each row shows guest, property name, stay dates, status badge, and amount. Tapping opens `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` when the property slug is known.

---

## Pending Actions

Vertical list from `attention` (same server rules as property dashboard: pending review, awaiting documents, check-ins/outs today, SD refunds, unpaid guest balance). Links resolve to the org's **first property** bookings list with the same query filters (status / date). Multi-property orgs should switch property from the sidebar when needed.

---

## Properties Performance

Per-property rows for the selected period: check-ins in range, rated lodging revenue, occupancy %. Sorted by revenue descending. Row tap → property dashboard.

---

## Host-facing knowledge

This is the landing page for an organization with more than one property — it rolls up revenue, bookings, and occupancy across everything you manage instead of just one property.

**Common host questions**

- Q: How is this different from a single property's dashboard?
  A: This page combines every property in your organization into one view — the numbers, chart, and status breakdown all cover all of them together.
- Q: Why doesn't a pending-action link take me straight to the right property?
  A: When you manage several properties, these shortcuts open your first property's booking list by default — switch properties from the sidebar if the booking you need is elsewhere.
- Q: Can I create a new property or parking listing from here?
  A: Yes, if you have permission to add assets to this organization you'll see an **Add asset** button in the header.

---

## API

| Function          | Scope | Query                                         |
| ----------------- | ----- | --------------------------------------------- |
| `dashboard-stats` | Org   | `GET ?org_slug=:slug&from=&to=` (or `org_id`) |

Property scope remains `?property_id=…` without org params.

---

## Implementation map

| Concern                | Path                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Page                   | `ui/src/features/dashboard/org/pages/OrgDashboardPage.tsx`                                                                 |
| Hook                   | `ui/src/features/dashboard/org/hooks/useOrgDashboardStats.ts`                                                              |
| Stat cards             | `ui/src/features/dashboard/org/components/org-dashboard/OrgDashboardStatCards.tsx`                                         |
| Revenue chart          | `ui/src/features/dashboard/org/components/org-dashboard/OrgRevenueBookingsChart.tsx`                                       |
| Status donut           | `ui/src/features/dashboard/org/components/org-dashboard/OrgBookingStatusDonut.tsx`                                         |
| Recent bookings        | `ui/src/features/dashboard/org/components/org-dashboard/OrgRecentBookingsList.tsx`                                         |
| Pending actions        | `ui/src/features/dashboard/org/components/org-dashboard/OrgPendingActionsCard.tsx`                                         |
| Properties performance | `ui/src/features/dashboard/org/components/org-dashboard/OrgPropertiesPerformanceCard.tsx`                                  |
| Add asset dialog       | `ui/src/features/dashboard/org/components/AddEntityDialog.tsx`                                                             |
| Aggregates             | `supabase/functions/_shared/dashboardService.ts`                                                                           |
| Edge function          | `supabase/functions/dashboard-stats/index.ts`                                                                              |
| Status labels / colors | `ui/src/features/dashboard/bookings/lib/bookingStatus.ts`, `ui/src/features/dashboard/bookings/components/StatusBadge.tsx` |

---

## Related docs

- [Route index](../README.md)
- [Organization properties](./properties.md)
- [Property dashboard](./property/dashboard.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
