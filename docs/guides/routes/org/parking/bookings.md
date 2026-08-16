---
title: 'Parking bookings — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-16
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

Manage guests who booked **this parking slot only**. Stays with parking bundled in the condo workflow stay on the **property** booking page.

**Two ways a booking reaches this parking:**

1. **Admin-created** (`create-parking-booking`): self-approved straight at `PENDING_REVIEW`, `parking_id` set immediately.
2. **Guest broadcast request**: guest submits without picking a specific slot; every eligible parking in the org (same accepted vehicle type, no date conflict) gets notified via Telegram + email and races to Accept. `parking_id` stays `null` until claimed.

**Full status path:**

`PENDING_HOST_ACCEPTANCE` _(broadcast only)_ → **Accept** → `PENDING_REVIEW` → **Mark active** → `READY_FOR_CHECKIN` → **Complete** → `COMPLETED`, or **Cancel** → `CANCELLED`. A broadcast that nobody accepts ends in `NO_HOST_AVAILABLE` — either every candidate host **Declines**, or the request's TTL (15 min if check-in is today, 1 hr otherwise) expires via cron.

**While a request is `PENDING_HOST_ACCEPTANCE`** (detail page):

- A live countdown shows time remaining next to the status badge (warns under 2 minutes).
- **Accept** / **Decline** only appear if _this_ parking still has a `pending` broadcast candidacy for the booking — already-declined or already-claimed-elsewhere hosts see a read-only summary instead.
- Accept has an optional **access instructions** note (≤500 chars) shown to the guest immediately after.
- If another host claims it first, clicking Accept shows "Already claimed" and the screen updates — never a stuck button.

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
