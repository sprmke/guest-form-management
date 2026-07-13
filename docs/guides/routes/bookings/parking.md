# Pay Parking — operator guide

Route: `/properties/:propertySlug/parking/:bookingId`

> **Status:** Pending — document when implementing or materially changing this page.

## Progress overview

| Section | E2E save | Validation | Docs    | Notes |
| ------- | -------- | ---------- | ------- | ----- |
| _TBD_   | —        | —          | Pending |       |

---

## Overview

Guest **Pay Parking** form scoped to the property slug in the URL. Admin copy-link and **View pay parking** use **`guestPayParkingPath(propertySlug, bookingId)`** (optional **`?admin=true`**).

Legacy **`/bookings/:bookingId/parking`** redirects after **`get-pay-parking`** resolves **`property_slug`**.

---

## Implementation map

| Concern | Path                                                         |
| ------- | ------------------------------------------------------------ |
| Page    | `ui/src/features/guest/pay-parking/pages/PayParkingPage.tsx` |
| Routes  | `ui/src/features/guest/property/routes/index.tsx`            |
| Paths   | `ui/src/features/guest/lib/guestPublicPaths.ts`              |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
