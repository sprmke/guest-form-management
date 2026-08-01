# Calendar (booking picker) — operator guide

Route: `/properties/:propertySlug/calendar`

> **Status:** Documented — operational guest flow.

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                                   |
| -------------- | -------- | ---------- | ---------- | --------------------------------------- |
| Date selection | ✅       | ✅         | Documented | Overlap + past-date rules               |
| Proceed → form | ✅       | ✅         | Documented | Guest-auth gate, preserves query params |
| Property scope | ✅       | ✅         | Documented | Slug from URL path segment              |
| Legacy `/`     | —        | —          | Documented | `/?property=` → property calendar       |

---

## Overview

Operational **check-in / check-out picker** before the guest booking form (`CalendarPage`). Guests browse and select dates freely without signing in; authentication is only requested when they commit to book.

**Date selection:** single `Calendar` component in range mode — first tap sets check-in, second tap sets check-out. Past dates and any date that would overlap an existing non-cancelled booking are disabled (`get-booked-dates` + `createDisabledDateMatcher`). Selecting a date on/before the current check-in restarts the selection.

**Proceed to Booking Form:** enabled once both dates are picked. Calls **`requireGuestAuth`** first — if the guest doesn't have an active session, `GuestAuthModal` opens (email OTP or Google/Facebook); once authenticated, navigation resumes automatically via the stored `resume` intent. Navigates to **`/properties/:propertySlug/form`** with **`checkInDate`** / **`checkOutDate`** query params, preserving legitimate params (e.g. `source`). Deprecated keys (`dev`, `testing`, submit-form control flags) are stripped on load and on navigate.

**Share links:** Admin **`guestCalendarPath(slug)`** → **`/properties/<slug>/calendar`**.

**Legacy:** **`/?property=<slug>`** on the marketing landing redirects to **`/properties/<slug>/calendar`**. Old **`/calendar?property=<slug>`** redirects to the same path. **`/properties/:slug/calendar?bookingId=`** redirects to the property's `/form` route (legacy deep link support).

---

## Query params

| Param       | Purpose                           |
| ----------- | --------------------------------- |
| `source`    | e.g. `airbnb` — forwarded to form |
| `bookingId` | Redirects to property form route  |

Property slug is **not** passed as `?property=` on new links — it is the **`:propertySlug`** path segment. Deprecated **`dev`**, **`testing`**, and submit-form flag params are stripped from the URL on load / navigate.

---

## Host-facing knowledge

This is the guest-facing date picker guests see before filling out a booking form — it shows which dates are already taken and blocks anything that overlaps an existing (non-cancelled) stay.

**Common host questions**

- Q: Why does a guest need to sign in just to pick dates?
  A: They don't — browsing and picking dates is open to everyone. Signing in is only required at the very last step, right before they move on to the actual booking form.
- Q: If I cancel a booking, do those dates open back up here right away?
  A: Yes — cancelled bookings no longer block dates on this calendar.
- Q: Can I send a guest directly to this page for a specific property?
  A: Yes, each property has its own calendar link you can share (found next to the property in your dashboard).

---

## API reference

| Action        | Endpoint                         |
| ------------- | -------------------------------- |
| Booked ranges | `GET get-booked-dates?property=` |

---

## Implementation map

| Concern          | Path                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| Page             | `ui/src/features/guest/calendar/pages/CalendarPage.tsx`                        |
| Routes           | `ui/src/features/guest/property/routes/index.tsx`                              |
| Guest-auth gate  | `ui/src/features/guest/auth/context/GuestAuthContext.tsx` (`requireGuestAuth`) |
| Paths            | `ui/src/features/guest/lib/guestPublicPaths.ts`                                |
| Landing redirect | `ui/src/features/guest/marketing/pages/GuestLandingPage.tsx`                   |

---

## Related docs

- [Guest landing](./index-landing.md)
- [Form](./form.md)
- [Guest & host auth](./auth.md)
- [`docs/architecture/routing.md`](../../architecture/routing.md)
