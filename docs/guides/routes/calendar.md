# Calendar (booking picker) — operator guide

Route: `/properties/:propertySlug/calendar`

> **Status:** Documented — operational guest flow.

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                             |
| -------------- | -------- | ---------- | ---------- | --------------------------------- |
| Date selection | ✅       | ✅         | Documented | Overlap + past-date rules         |
| Proceed → form | ✅       | ✅         | Documented | Preserves query params            |
| Property scope | ✅       | ✅         | Documented | Slug from URL path segment        |
| Legacy `/`     | —        | —          | Documented | `/?property=` → property calendar |

---

## Overview

Operational **check-in / check-out picker** before the guest booking form.

**Proceed** navigates to **`/properties/:propertySlug/form`** with **`checkInDate`** / **`checkOutDate`** and preserves legitimate query params (`source`). Deprecated keys (`dev`, `testing`, submit-form control flags) are stripped.

**Share links:** Admin **`guestCalendarPath(slug)`** → **`/properties/<slug>/calendar`**.

**Legacy:** **`/?property=<slug>`** on the marketing landing redirects to **`/properties/<slug>/calendar`**. Old **`/calendar?property=<slug>`** redirects to the same path.

---

## Query params

| Param       | Purpose                           |
| ----------- | --------------------------------- |
| `source`    | e.g. `airbnb` — forwarded to form |
| `bookingId` | Redirects to property form route  |

Property slug is **not** passed as `?property=` on new links — it is the **`:propertySlug`** path segment. Deprecated **`dev`**, **`testing`**, and submit-form flag params are stripped from the URL on load / navigate.

---

## API reference

| Action        | Endpoint                         |
| ------------- | -------------------------------- |
| Booked ranges | `GET get-booked-dates?property=` |

---

## Implementation map

| Concern          | Path                                                         |
| ---------------- | ------------------------------------------------------------ |
| Page             | `ui/src/features/guest/calendar/pages/CalendarPage.tsx`      |
| Routes           | `ui/src/features/guest/property/routes/index.tsx`            |
| Paths            | `ui/src/features/guest/lib/guestPublicPaths.ts`              |
| Landing redirect | `ui/src/features/guest/marketing/pages/GuestLandingPage.tsx` |

---

## Related docs

- [Guest landing](./index-landing.md)
- [Form](./form.md)
- [`docs/PROJECT.md`](../../PROJECT.md) §4–§5
