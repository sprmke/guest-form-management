# Org parkings list — operator guide

Route: `/org/:orgSlug/parkings`

> **Status:** Documented

## Overview

Lists all parking slots for the organization. **UI mirrors** `/org/:orgSlug/properties`: summary KPI cards, search + status + type filters, grid/list toggle, property-style cards with image carousel, stats row, and actions menu. Org owners and admins with `org:parkings:view` may access. **Add parking** opens the same dialog as the tenant switcher **+** menu.

---

## Page sections

| Section       | Property equivalent                                             | Parking notes                                                                                                                |
| ------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Summary cards | Total properties, revenue, avg revenue, avg occupancy           | **Total parkings**; stats from `list-parkings` (`activeReservations`, `monthlyRevenue`, `occupancyRate`)                     |
| Toolbar       | Search, status, type, grid/list                                 | Type filter: inside tower / outside tower / motorcycle                                                                       |
| Card          | Image carousel, title, type, location, beds/baths/guests, stats | Cover image from `settings.coverImage`; **code** subtitle (e.g. `ML2S26`); tower / level / slot chips; **Reservations** stat |
| Actions menu  | Dashboard, Settings, Guest calendar, Copy link                  | **View parking** (public `/parkings/:slug`), **Copy public link**                                                            |
| Empty state   | Filtered vs no slots                                            | Same pattern as properties                                                                                                   |

---

## Save path

- **Add parking** → `POST create-parking` → redirects to parking settings

---

## Implementation map

| Concern           | Path                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| Page              | `ui/src/features/dashboard/org/pages/OrgParkingsPage.tsx`                  |
| Cards / list row  | `ui/src/features/dashboard/org/components/org-parkings/OrgParkingCard.tsx` |
| Summary / toolbar | `OrgParkingsSummaryCards.tsx`, `OrgParkingsToolbar.tsx`                    |
| Filters           | `ui/src/features/dashboard/org/lib/orgParkingsFilters.ts`                  |
| Edge              | `supabase/functions/list-parkings`, `create-parking`                       |
