# Parking dashboard — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug`

> **Status:** Documented

## Overview

Parking-scoped home. **UI mirrors** the property dashboard (`DashboardPage`): compact header, date-range filter, **View Parking** (public listing), KPI stat cards, finance chart + transactions-due card + mini calendar. Metrics show zeros until a parking-scoped `dashboard-stats` API ships.

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
