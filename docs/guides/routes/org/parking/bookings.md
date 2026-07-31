# Parking bookings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/bookings`  
Detail: `/org/:orgSlug/parking/:parkingSlug/bookings/:bookingId`

> **Status:** Documented (list + admin create; guest public submit e2e follow-up)

## Overview

Parking-slot **reservations** for one slot — separate from stay `need_parking` on property bookings.

- Summary stage cards (Needs action · Pending · Active · Completed labels)
- Search, status filters, table / card / calendar (no kanban)
- **New booking** → admin create modal
- **Public form** → guest marketing form (preview / future e2e)

---

## Host-facing knowledge

Manage guests who booked **this parking slot only**. Stays with parking bundled in the condo workflow stay on the **property** booking page.

**Parking status path (minimal):**

`PENDING_REVIEW` → **Mark active** → `READY_FOR_CHECKIN` → **Complete** → `COMPLETED`, or **Cancel** → `CANCELLED`.

---

## API

`GET list-bookings?parking_id=…` — parking team `bookings:view`

`POST create-parking-booking?parking_id=…` — `bookings:edit`

`POST transition-parking-booking?parking_id=…` — `{ bookingId, toStatus }`

Rows live on `guest_submissions` with `parking_id` set and `property_id` null.

---

## Implementation map

| Concern      | Path                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| List page    | `ui/src/features/dashboard/parking/pages/ParkingBookingsPage.tsx`            |
| Detail       | `ui/src/features/dashboard/parking/pages/ParkingBookingDetailPage.tsx`       |
| Create modal | `ui/src/features/dashboard/parking/components/CreateParkingBookingModal.tsx` |
| Mutations    | `ui/src/features/dashboard/parking/hooks/useParkingBookingMutations.ts`      |
