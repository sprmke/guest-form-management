---
title: 'Parking dashboard — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-04
---

# Parking dashboard — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug`

> **Status:** Documented

## Overview

Parking-scoped home. **UI mirrors** the property dashboard (`DashboardPage`): on **phone/tablet** the shared **brand hero** shell (`AdminMobilePage`) with date range in an overlapping toolbar and **View Parking** as a hero icon; desktop keeps the compact header + date filter + View Parking. KPI stat cards, finance chart + transactions-due card + mini calendar. Metrics show zeros until a parking-scoped `dashboard-stats` API ships.

---

## Host-facing knowledge

This dashboard is the home screen for one parking slot — same layout you know from property dashboards, but labeled for reservations instead of stays. You can filter by date range, open the public parking listing, and see where revenue and occupancy charts will appear. **Summary numbers may read zero** until reservation analytics are connected; finance and pricing data may still be edited on their own pages.

**Common host questions**

- Q: Why are all my KPI cards showing zero?
  A: Reservation stats for parking dashboards are not fully connected yet. The layout is in place; numbers will populate when parking reservation data feeds this view.
- Q: How is this different from the property dashboard?
  A: It covers a single **parking slot** (tower bay, motorcycle space, etc.), not a rental unit. Labels say “reservations” instead of “bookings.”
- Q: Where do I edit rates or slot details?
  A: Use **Pricing** for nightly rates and the calendar, and **Settings** for photos, location, and payment methods. This dashboard is for at-a-glance monitoring.

---

## Sections

| Section          | Property equivalent                                        | Parking notes                                                                                                                     |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Header           | Dashboard title + date filter + View Property              | Title **Dashboard**; subtitle includes slot display name; **View Parking** opens public detail `/parkings/:parkingSlug` (new tab) |
| KPI cards        | Total Revenue, Total Bookings, Occupancy, Avg Nightly Rate | **Total Reservations** label instead of Total Bookings                                                                            |
| Chart + calendar | `DashboardFinanceCalendarSection`                          | `ParkingDashboardCalendarSection` — same layout, empty data                                                                       |

---

## Implementation map

| Concern        | Path                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| Page           | `ui/src/features/dashboard/parking/pages/ParkingDashboardPage.tsx`                 |
| Stat cards     | `ui/src/features/dashboard/parking/components/ParkingDashboardStatCards.tsx`       |
| Calendar block | `ui/src/features/dashboard/parking/components/ParkingDashboardCalendarSection.tsx` |
| Empty stats    | `ui/src/features/dashboard/parking/lib/parkingDashboardStats.ts`                   |
| Shell          | `ui/src/features/dashboard/org/components/ParkingAdminShell.tsx`                   |
