---
title: 'Parking bookings — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-17
---

# Parking bookings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/bookings`  
Detail: `/org/:orgSlug/parking/:parkingSlug/bookings/:bookingId`

> **Status:** Documented — admin-created bookings **and** the guest broadcast/claim flow (Phase 1) are both live. Canonical spec: `.cursor/rules/parking-workflow.mdc`.

## Overview

Parking-slot **reservations** for one slot — separate from stay `need_parking` on property bookings. On **phone/tablet**, uses the shared **brand hero** shell (`AdminMobilePage`) with **New booking** as a hero icon and filters in an overlapping toolbar.

- Summary stage cards (Needs action · Pending · Active · Completed labels) — `PENDING_HOST_ACCEPTANCE` buckets into **Needs action**, `NO_HOST_AVAILABLE` into **Completed** (history)
- Search, status filters (including explicit **Awaiting Host** / **No Host Available** chips), table / card / calendar (no kanban)
- **New booking** → admin create modal (host-created, self-approved at `PENDING_REVIEW`, skips the broadcast round below)
- **Public form** → guest marketing form (`/parkings/:parkingSlug/form`) — real broadcast submit, not a preview

---

## Host-facing knowledge

Manage guests who booked **this parking slot only**. If a guest's parking is bundled into their condo stay, that booking still lives on the **property's** bookings page, not here.

**Common host questions**

- Q: How do bookings end up on this page?
  A: Either you create one yourself with **New booking**, or a guest sends a broadcast request without picking a specific slot. Broadcast requests notify every eligible parking slot in your organization at once, and whichever host accepts first gets the booking.
- Q: What happens if I don't respond to a broadcast request in time?
  A: You'll have about 15 minutes to Accept or Decline if check-in is today, or an hour otherwise, and a live countdown shows how much time is left. If nobody accepts in time, or every eligible host declines, the request closes with no host found.
- Q: Can I leave a note for the guest when I accept a request?
  A: Yes. Accepting lets you add a short access instructions note (up to 500 characters) that the guest sees right away.
- Q: What if another host claims a broadcast request before I do?
  A: You'll see "Already claimed" if you click Accept after someone else got there first, and the page updates automatically, so you're never left staring at a stuck button.

---

## API

`GET list-bookings?parking_id=…` — parking team `bookings:view`

`POST create-parking-booking?parking_id=…` — `bookings:edit`

`POST transition-parking-booking?parking_id=…` — `{ bookingId, toStatus }` (rejects `PENDING_HOST_ACCEPTANCE` — use claim/decline below)

`POST claim-parking-booking?parking_id=…` — `{ bookingId, parkingId, endorsementNote? }` — `bookings:edit`

`POST decline-parking-booking?parking_id=…` — `{ bookingId, parkingId }` — `bookings:edit`

`GET get-parking-broadcast-status?bookingId=&parkingId=` — this host's own candidacy (`pending`\|`claimed`\|`declined`\|`expired`) — `bookings:view`

Rows live on `guest_submissions` with `parking_id` set (or null while broadcast-pending) and `property_id` null.

---

## Implementation map

| Concern                            | Path                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| List page                          | `ui/src/features/dashboard/parking/pages/ParkingBookingsPage.tsx`                                                                          |
| Detail (Accept/Decline, countdown) | `ui/src/features/dashboard/parking/pages/ParkingBookingDetailPage.tsx`                                                                     |
| Create modal                       | `ui/src/features/dashboard/parking/components/CreateParkingBookingModal.tsx`                                                               |
| Mutations                          | `ui/src/features/dashboard/parking/hooks/useParkingBookingMutations.ts`                                                                    |
| Countdown component                | `ui/src/features/dashboard/bookings/components/ParkingBroadcastCountdown.tsx`                                                              |
| Guest submit + status              | `ui/src/features/guest/marketing/pages/ParkingFormPage.tsx`, `ui/src/features/guest/marketing/parkings/pages/ParkingRequestStatusPage.tsx` |
| Backend spec                       | `.cursor/rules/parking-workflow.mdc`                                                                                                       |
