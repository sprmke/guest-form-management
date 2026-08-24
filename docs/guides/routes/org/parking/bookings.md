---
title: 'Parking bookings — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-24
---

# Parking bookings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/bookings`  
Detail: `/org/:orgSlug/parking/:parkingSlug/bookings/:bookingId`

> **Status:** Documented — guest broadcast/claim flow (Phase 1) is live. Dashboard **New booking** opens an in-dashboard modal embedding the same parking registration form (same pattern as property bookings). Canonical spec: `.cursor/rules/parking-workflow.mdc`.

## Overview

Parking-slot **reservations** for one slot — separate from stay `need_parking` on property bookings. On **phone/tablet**, uses the shared **brand hero** shell (`AdminMobilePage`) with **New booking** as a hero icon and filters in an overlapping toolbar.

- Summary stage cards (Needs action · Pending · Active · Completed labels) — `PENDING_HOST_ACCEPTANCE` buckets into **Needs action**, `NO_HOST_AVAILABLE` into **Completed** (history)
- Search, status filters (including explicit **Awaiting Host** / **No Host Available** chips), table / card / calendar (no kanban)
- **New booking** → opens `AdminParkingNewBookingModal`, embedding `ParkingRegistrationForm` (the same component the public parking form uses) — submits through `submit-parking-booking-request`, the same live broadcast/claim flow a guest submission would use

---

## New booking (modal)

**Entry:** **New booking** button in the page header (desktop) or hero icon (mobile). Opens `AdminParkingNewBookingModal` — no route change, target parking slot fixed from the current page context; **Tower** is pre-filled read-only from the slot's record.

Unlike the property booking modal, no admin-only auth bypass is needed here — the underlying `ParkingRegistrationForm` never required guest sign-in to begin with (the public "Reserve" flow gates sign-in earlier, before the form opens; the admin modal skips that pre-gate and opens the form directly).

On success, the modal shows an inline summary (dates, guest, email, phone, vehicle) instead of navigating to the public request-status page, with two actions: **Add another booking** (resets the form for another entry, same modal) and **View booking** (closes the modal and opens the new booking's detail page). The bookings list refreshes in the background so the new booking appears without a manual reload.

---

## Host-facing knowledge

Manage guests who booked **this parking slot only**. If a guest's parking is bundled into their condo stay, that booking still lives on the **property's** bookings page, not here.

**Common host questions**

- Q: How do bookings end up on this page?
  A: Either you use **New booking** to submit one on the guest's behalf right from the dashboard, or a guest sends a broadcast request without picking a specific slot. Broadcast requests notify every eligible parking slot in your organization at once, and whichever host accepts first gets the booking.
- Q: What happens if I don't respond to a broadcast request in time?
  A: You'll have about 15 minutes to Accept or Decline if check-in is today, or an hour otherwise, and a live countdown shows how much time is left. If nobody accepts in time, or every eligible host declines, the request closes with no host found.
- Q: Can I leave a note for the guest when I accept a request?
  A: Yes. Accepting lets you add a short access instructions note (up to 500 characters) that the guest sees right away.
- Q: What if another host claims a broadcast request before I do?
  A: You'll see "Already claimed" if you click Accept after someone else got there first, and the page updates automatically, so you're never left staring at a stuck button.

---

## API

`GET list-bookings?parking_id=…` — parking team `bookings:view`

`POST create-parking-booking?parking_id=…` — `bookings:edit` (API still available; dashboard **New booking** goes through `submit-parking-booking-request` instead, same as a guest submission)

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
| New booking modal                  | `ui/src/features/dashboard/parking/components/AdminParkingNewBookingModal.tsx`                                                             |
| Success summary (shared)           | `ui/src/features/dashboard/bookings/components/AdminBookingSuccessSummary.tsx`                                                             |
| Registration form (embedded)       | `ui/src/features/guest/marketing/parkings/components/ParkingRegistrationForm.tsx`                                                          |
| Detail (Accept/Decline, countdown) | `ui/src/features/dashboard/parking/pages/ParkingBookingDetailPage.tsx`                                                                     |
| Claim / decline / transition hooks | `ui/src/features/dashboard/parking/hooks/useParkingBookingMutations.ts`                                                                    |
| Countdown component                | `ui/src/features/dashboard/bookings/components/ParkingBroadcastCountdown.tsx`                                                              |
| Guest submit + status              | `ui/src/features/guest/marketing/pages/ParkingFormPage.tsx`, `ui/src/features/guest/marketing/parkings/pages/ParkingRequestStatusPage.tsx` |
| Backend spec                       | `.cursor/rules/parking-workflow.mdc`                                                                                                       |
