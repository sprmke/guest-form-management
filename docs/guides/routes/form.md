# Guest Form — operator guide

Route: `/properties/:propertySlug/form`

> **Status:** Documented — operational guest flow.

## Progress overview

| Section          | E2E save | Validation | Docs       | Notes                        |
| ---------------- | -------- | ---------- | ---------- | ---------------------------- |
| Submit + scope   | ✅       | ✅         | Documented | Property slug path           |
| Dev controls     | ✅       | —          | Documented | Non-prod FormData flags only |
| Legacy URL strip | ✅       | —          | Documented | `dev` / `testing` / flags    |

---

## Overview

Guest booking form scoped to **`/properties/:propertySlug/form`**. Admin **New booking** on the property bookings list links here via **`guestFormPath(propertySlug)`**.

Legacy **`/form?property=<slug>`** redirects to this route. Deprecated query keys (`dev`, `testing`, submit-form control flags, `from`) are stripped on load; `from=airbnb` migrates to `source=airbnb`.

Non-production builds show a developer controls panel on the last step (FormData flags). Production never exposes that panel and the edge function forces full side effects.

---

## Query params

| Param                          | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `source`                       | `airbnb` — Airbnb copy + booking source |
| `checkInDate` / `checkOutDate` | Seeded from calendar Proceed            |
| `bookingId`                    | Load existing booking for guest update  |

---

## Implementation map

| Concern               | Path                                                  |
| --------------------- | ----------------------------------------------------- |
| Page                  | `ui/src/features/guest/form/components/GuestForm.tsx` |
| Strip legacy URL keys | `bookingSourceFromSearchParams.ts`                    |
| Routes                | `ui/src/features/guest/property/routes/index.tsx`     |
| Paths                 | `ui/src/features/guest/lib/guestPublicPaths.ts`       |
| Submit                | `supabase/functions/submit-form/index.ts`             |

---

## Related docs

- [Route index](../README.md)
- [Calendar](./calendar.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
