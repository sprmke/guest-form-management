# Parking bookings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/bookings`

> **Status:** Documented (UI parity; no reservation API yet)

## Overview

**UI mirrors** property `BookingsListPage`: summary stage cards, search/filters, table/card/calendar/kanban views, date filter, pagination shell. All views render empty until parking reservation APIs connect. Separate from guest-stay `need_parking` on property bookings.

---

## Host-facing knowledge

This is the future home for **parking-only reservations** — guests booking a slot directly, not parking bundled with a stay. The screen matches property bookings (filters, table, calendar, kanban) so your team already knows the layout. **Today the list stays empty** because reservation records are not wired up yet; nothing is broken if you see no rows.

**Common host questions**

- Q: Why is my parking bookings page empty?
  A: Reservation tracking for standalone parking is not live yet. The page is ready visually; bookings will appear here once the parking reservation flow ships.
- Q: Is this where I manage parking for a guest staying at my condo?
  A: No. Parking requested as part of a **stay** is handled on the **property** booking workflow, not this parking-slot bookings page.
- Q: What can I do here right now?
  A: Use **New booking** to open the public parking form (when configured) and **View Parking** to preview the guest-facing listing. Full inbox-style reservation management is coming soon.

---

## Parking-specific UX

| Property                      | Parking                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| **New booking** CTA           | **New booking** → `/parkings/:parkingSlug/form`                     |
| **View parking** CTA          | **View Parking** → public detail `/parkings/:parkingSlug` (new tab) |
| Summary labels                | Needs action · Pending · Active · Completed                         |
| More filters (pets / parking) | Hidden                                                              |
| Search placeholder            | Guest, email, phone, plate                                          |

---

## Implementation map

| Concern           | Path                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Page              | `ui/src/features/dashboard/parking/pages/ParkingBookingsPage.tsx` |
| Shared components | `BookingsSummaryCards`, `BookingFilters`, `BookingTable`, etc.    |
