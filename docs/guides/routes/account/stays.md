---
title: 'Guest Stays — operator guide'
status: active
tags: [guides, routes, account]
updated: 2026-08-02
---

# Guest Stays — operator guide

Route: `/account/stays` (legacy `/account/trips` redirects here)

> **Status:** Documented.

## Progress overview

| Section    | E2E save | Validation | Docs       | Notes                                 |
| ---------- | -------- | ---------- | ---------- | ------------------------------------- |
| Stays list | ✅       | —          | Documented | Read-only; `guest-trips`              |
| Card link  | ✅       | —          | Documented | Routes to form or SD refund by status |

---

## Overview

Lists the signed-in guest's **property rental bookings** — not flights, experiences, or other trip types. A booking appears here once a guest submits the booking form while authenticated, or once their booking's email matches their signed-in account's email.

Each card shows a property thumbnail, property name, status badge, and stay dates. Cards are clickable when an action is available for the booking's current status; otherwise they render as plain (non-clickable) cards.

---

## Host-facing knowledge

Guests see every property they've booked (past or upcoming) in one list once they sign in, with a status badge (e.g. "Pending Review", "Ready For Check-in"). Tapping a stay takes them back to the right next step — their booking form if it's still awaiting review, or their security-deposit refund form once they're near check-out.

**Common host questions**

- Q: A guest says they don't see their old booking in their account.
  A: Stays only show up if the guest was signed in when they booked, or if the email on the booking matches the email on their signed-in account. If they used a different email, ask them to sign in with that email, or you can update the guest's email on the booking to match their account.
- Q: What happens when a guest taps a stay card?
  A: It depends on where the booking currently is — if it's still waiting on review, it opens their booking form; if it's near or after check-out, it opens their security-deposit refund form; otherwise it opens the property page.

---

## Stays list

### Fields (per card)

| Field                | Storage                                              | Notes                                |
| -------------------- | ---------------------------------------------------- | ------------------------------------ |
| Property thumbnail   | Property's public listing image                      | Falls back to empty tile             |
| Property name        | `guest_submissions.property_id` → property name      |                                      |
| Status badge         | `guest_submissions.status`                           | Human label via `STATUS_LABELS`      |
| Check-in / check-out | `guest_submissions.check_in_date` / `check_out_date` |                                      |
| Display name         | `guest_submissions.guest_facebook_name`              | Shown as secondary line when present |

### Load path

1. Page mount → **`guest-trips`** (GET, guest JWT) — returns bookings where `guest_user_id` matches the signed-in `auth.users.id`, or `guest_email` matches the session email.
2. Empty state ("No stays yet.") links to **Browse properties** (`/properties`).

### Card action routing

Tapping a card navigates by the booking's current status:

| Status                                    | Destination                                                   |
| ----------------------------------------- | ------------------------------------------------------------- |
| `PENDING_REVIEW`                          | `/properties/:slug/form?bookingId=` (edit the submitted form) |
| `READY_FOR_CHECKOUT`, `PENDING_SD_REFUND` | `/properties/:slug/sd-form?bookingId=`                        |
| Any other status                          | `/properties/:slug` (property listing page)                   |
| No resolvable property slug               | Card renders but is not clickable                             |

### Behavior / edge cases

- **`submit-form`** sets `guest_submissions.guest_user_id` to the authenticated guest's `auth.users.id` when the request carries a valid session JWT — this is what links a booking to an account after the fact, even for bookings made before the guest signed up.
- List is read-only; there is no save path on this page.

---

## API reference

| Action           | Endpoint          |
| ---------------- | ----------------- |
| List guest stays | `GET guest-trips` |

---

## Implementation map

| Concern    | Path                                                     |
| ---------- | -------------------------------------------------------- |
| Page       | `ui/src/features/guest/account/pages/GuestTripsPage.tsx` |
| Hook       | `ui/src/features/guest/account/hooks/useGuestTrips.ts`   |
| API client | `ui/src/features/guest/account/lib/guestAccountApi.ts`   |
| Edge       | `supabase/functions/guest-trips/index.ts`                |
| Shared     | `supabase/functions/_shared/guestProfileService.ts`      |

---

## Related docs

- [Route index](../README.md)
- [Profile](./profile.md)
- [Form](../form.md)
- [SD refund form](../sd-form.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
- `.cursor/rules/booking-workflow.mdc` — status enum + labels
