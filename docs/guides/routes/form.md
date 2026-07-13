# Guest Form — operator guide

Route: `/properties/:propertySlug/form`

> **Status:** Pending — document when implementing or materially changing this page.

## Progress overview

| Section | E2E save | Validation | Docs    | Notes |
| ------- | -------- | ---------- | ------- | ----- |
| _TBD_   | —        | —          | Pending |       |

---

## Overview

Guest booking form scoped to **`/properties/:propertySlug/form`**. Admin **New booking** on the property bookings list links here via **`guestFormPath(propertySlug)`**.

Legacy **`/form?property=<slug>`** redirects to this route.

---

## Implementation map

| Concern | Path                                                  |
| ------- | ----------------------------------------------------- |
| Page    | `ui/src/features/guest/form/components/GuestForm.tsx` |
| Routes  | `ui/src/features/guest/property/routes/index.tsx`     |
| Paths   | `ui/src/features/guest/lib/guestPublicPaths.ts`       |

---

## Related docs

- [Route index](../README.md)
- [Calendar](./calendar.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
