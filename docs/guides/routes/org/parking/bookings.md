# Parking bookings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/bookings`

> **Status:** Documented (UI parity; no reservation API yet)

## Overview

**UI mirrors** property `BookingsListPage`: summary stage cards, search/filters, table/card/calendar/kanban views, date filter, pagination shell. All views render empty until parking reservation APIs connect. Separate from guest-stay `need_parking` on property bookings.

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
