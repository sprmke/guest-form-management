---
title: 'Pay Parking — operator guide'
status: active
tags: [guides, routes, parking]
updated: 2026-08-17
---

# Pay Parking — operator guide

Route: `/properties/:propertySlug/parking/:bookingId` (legacy `/bookings/:bookingId/parking` redirects here)

> **Status:** Documented.

## Progress overview

| Section         | E2E save | Validation | Docs       | Notes                                                                   |
| --------------- | -------- | ---------- | ---------- | ----------------------------------------------------------------------- |
| Brand shell     | ✅       | —          | Documented | `MainLayout` band + `GuestFormBrandHeader` via `get-guest-payment-info` |
| Vehicle form    | ✅       | ✅ Zod     | Documented | plate / brand-model / color                                             |
| Owner broadcast | ✅       | Server     | Documented | BCC list or single owner email                                          |
| Admin mode      | ✅       | —          | Documented | `?admin=true` — extra broadcast choice dialogs                          |

---

## Overview

Public, no-login form guests use to submit (or update) their parking vehicle details for a booking that requested paid parking. Scoped to the property slug in the URL. Renders inside **`MainLayout`**: org **brand-color band**, **`GuestOperationalHeader`**, overlapping **`GuestFormBrandHeader`** (logo, dynamic eyebrow, title), then the vehicle form. Instructional copy (last-minute warning, contact hints) is residence-aware via **`guestFormBranding.ts`** + **`get-guest-payment-info`**. Admin **View pay parking** / copy-link uses `guestPayParkingPath(propertySlug, bookingId)`, optionally with **`?admin=true`** when an admin is filling it in on the guest's behalf.

Legacy **`/bookings/:bookingId/parking`** resolves the booking's `property_slug` via `get-pay-parking` and redirects to the scoped route.

---

## Host-facing knowledge

Guests who requested paid parking get a simple link where they enter their car's plate number, brand/model, and color. Submitting it saves the vehicle details to the booking and emails parking owners with the guest's info so a slot can be arranged. If a host fills this in on a guest's behalf (admin mode), they get an extra choice of whether to notify parking owners, and if so, whether to notify all of them or just one specific owner by email.

**Common host questions**

- Q: Does submitting this form change the booking's status?
  A: No, it only saves the vehicle details and (optionally) emails parking owners. It doesn't move the booking forward in its workflow.
- Q: What if a guest submits this very close to their check-in date?
  A: They see a heads-up that parking arrangements this close to arrival may not be guaranteed, since owners need lead time to confirm a slot.
- Q: Can I update a guest's parking details myself after they've already submitted?
  A: Yes, opening the same link in admin mode lets you edit the saved vehicle details and choose whether to re-notify owners (all of them, one specific owner, or no email at all).

---

## Vehicle form

### Fields

| Field             | Storage                              | Validation                 |
| ----------------- | ------------------------------------ | -------------------------- |
| Car plate number  | `guest_submissions.car_plate_number` | Required; stored uppercase |
| Car brand & model | `guest_submissions.car_brand_model`  | Required                   |
| Car color         | `guest_submissions.car_color`        | Required                   |

Read-only context shown above the form: guest name, stay dates/pax, parking rate and parking date range (falls back to the stay's own dates when no separate parking dates were set), and whether this is a first submission or an update.

### Save path

1. Guest (or admin) fills the three vehicle fields → **Submit parking request** / **Update parking details**.
2. Guest mode: submits immediately → **`submit-pay-parking`** POST `{ bookingId, carPlateNumber, carBrandModel, carColor }` (broadcast defaults on).
3. Admin mode (`?admin=true`): opens the **Update & Broadcast** dialog first, offering:
   - **Save & broadcast to all** — sends to every address in the parking-owner BCC list.
   - **Save & email specific owner** — opens a second dialog to enter one owner's email; sends only to that address (no BCC).
   - **Save only** — persists the vehicle fields with no email sent.
4. `submit-pay-parking` sets `need_parking = true` and the vehicle fields; if the parking sub-step had already been marked complete (or the booking is past `PENDING_DOCUMENTS`), it clears `parking_completed_at` so the admin stepper shows it as needing another look.

### Behavior / edge cases

- **Last-minute warning:** if the parking check-in date is very close, the page shows a caution banner (before and after submit) that on-site arrangements this close to arrival aren't guaranteed.
- **Cancelled bookings:** `get-pay-parking` and `submit-pay-parking` both reject once a booking's status is `CANCELLED`.
- **Org automation toggle:** the owner broadcast email is skipped entirely if the property's org has parking-broadcast automation turned off — vehicle details still save.
- **Parking rate:** always read from the database (set by an admin before sharing the link) — the guest never chooses or edits the rate here.
- This form never changes booking `status` — it only touches parking-specific fields.

---

## API reference

| Action                              | Endpoint                  |
| ----------------------------------- | ------------------------- |
| Load pay-parking bootstrap          | `GET get-pay-parking`     |
| Submit / update vehicle + broadcast | `POST submit-pay-parking` |

---

## Implementation map

| Concern            | Path                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Page               | `ui/src/features/guest/pay-parking/pages/PayParkingPage.tsx`                                                           |
| Sections           | `ui/src/features/guest/pay-parking/components/PayParkingSections.tsx`                                                  |
| Broadcast dialog   | `ui/src/features/guest/pay-parking/components/PayParkingUpdateBroadcastDialog.tsx`                                     |
| Owner-email dialog | `ui/src/features/guest/pay-parking/components/PayParkingOwnerEmailDialog.tsx`                                          |
| API client         | `ui/src/features/guest/pay-parking/lib/api.ts`                                                                         |
| Schema             | `ui/src/features/guest/pay-parking/lib/payParkingSchema.ts`                                                            |
| Routes (wired)     | `ui/src/features/guest/property/routes/index.tsx` (`propertyGuestRoutes`; `LegacyPayParkingRedirect`)                  |
| Paths              | `ui/src/features/guest/lib/guestPublicPaths.ts`                                                                        |
| Edge               | `supabase/functions/get-pay-parking/index.ts`, `supabase/functions/submit-pay-parking/index.ts`                        |
| Shared services    | `supabase/functions/_shared/{databaseService,emailService,calendarService,sheetsService,propertyAutomationToggles}.ts` |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
- `.cursor/rules/booking-workflow.mdc` — parking nested-completion rules
