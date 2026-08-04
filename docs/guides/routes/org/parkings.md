---
title: 'Org parkings list — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-02
---

# Org parkings list — operator guide

Route: `/org/:orgSlug/parkings`

> **Status:** Documented

## Overview

Lists all parking slots for the organization. **UI mirrors** `/org/:orgSlug/properties`, including the **brand hero** shell on phone/tablet (`AdminMobilePage` + Add parking hero icon). Summary KPI cards, search + status + type filters, grid/list toggle, property-style cards with image carousel, stats row, and actions menu. Org owners and admins with `org:parkings:view` may access. **Add parking** opens the same dialog as the tenant switcher **+** menu.

---

## Host-facing knowledge

This is your parking inventory hub — every slot your organization offers, with search, filters, and summary stats similar to the properties page. Each card shows location, type, cover photo, and high-level reservation metrics. From here you can open a slot’s dashboard, copy its public booking link, or add a new parking space.

**Common host questions**

- Q: Is this the same as parking tied to a stay booking on a property?
  A: No. These are standalone parking listings (tower slots, motorcycle bays, etc.). Guest stays that only need parking at a rental unit are still managed under property bookings.
- Q: How do I add a new parking slot?
  A: Tap **Add parking** (or use the **+** menu in the sidebar switcher), then complete setup on the new slot’s settings page.
- Q: What do the revenue and occupancy numbers mean?
  A: They reflect reservation activity for each slot. Full reservation booking flows are still rolling out — treat dashboard-style metrics as previews until reservation data is connected end to end.

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
