# Org Bookings List — operator guide

Route: `/org/:orgSlug/bookings`

> **Status:** Documented

## Progress overview

| Section                       | E2E save  | Validation | Docs | Notes                                                               |
| ----------------------------- | --------- | ---------- | ---- | ------------------------------------------------------------------- |
| Summary stage cards           | —         | —          | Done | Same as property bookings                                           |
| Filter bar                    | —         | —          | Done | Same toolbar + view toggle                                          |
| Table / card / calendar views | —         | —          | Done | **Property** column / label on every row                            |
| Kanban view                   | via modal | —          | Done | Property name on cards; workflow modal opens property-scoped detail |

---

## Overview

Same paginated booking list as [property bookings](./property/bookings.md), scoped to **all properties in the organization**.

Differences from property list:

1. Each row/card/calendar day item shows **which property** the booking belongs to (`property_name` from `list-bookings`).
2. Calendar view lists **all org bookings** on a selected day (multiple properties on the same night).
3. Row/card/calendar links navigate to `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` using each row’s `property_slug`.
4. **New booking** links to `/org/:orgSlug/properties` (pick a property first).

Layout, stage cards, filters, views (`?view=table|card|calendar|kanban`), and pagination behave the same as the property page.

---

## Host-facing knowledge

This page shows every stay booking across all properties in your organization in one place. Each row tells you which property the guest booked, so you can spot workload across units without switching dashboards. Opening a booking takes you to that property’s detail view for the full workflow.

**Common host questions**

- Q: Why do I see a property name on every booking here but not on a single-property list?
  A: Org Bookings combines stays from every property you manage. The property label helps you know which unit each guest belongs to before you open the record.
- Q: How do I start a new booking from this page?
  A: Use **New booking** — you’ll pick a property first, then continue on that property’s guest form or calendar flow.
- Q: Can I see only one property’s bookings on this screen?
  A: Yes. Use the filters (including property) the same way you would on a property bookings list to narrow the view.

---

## API

`GET /functions/v1/list-bookings?org_slug=…` (or `org_id=…`)

- Permission: `org:bookings:view`
- Loads bookings for all properties in the org (`guest_submissions.property_id IN (…)`).
- Response rows include `property_id`, `property_name`, `property_slug`.
- Optional `?property_id=` narrows to one property within the org.

Property-scoped calls unchanged: `?property_id=…` without org params.

---

## UI map

| Piece         | Path                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| Page          | `ui/src/features/dashboard/org/pages/OrgBookingsPage.tsx`                       |
| Shared list   | `ui/src/features/dashboard/bookings/pages/BookingsListPage.tsx` (`scope="org"`) |
| Hook          | `ui/src/features/dashboard/bookings/hooks/useBookings.ts`                       |
| Edge function | `supabase/functions/list-bookings/index.ts`                                     |
| Nav           | `adminSidebarNav.ts#buildOrgNavSections` — **Bookings** after Dashboard         |

---

## Permissions

- Route guard: `RequireOrgPermission` section `bookings` → `org:bookings:view`
- Granted to org **Owner** (all permissions) and **Admin** by default

Property-only org members are redirected to their property dashboard (same as other org routes).
