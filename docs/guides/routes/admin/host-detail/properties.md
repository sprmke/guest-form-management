---
title: 'Host Detail — Properties — operator guide'
status: active
tags: [guides, routes, admin, properties]
updated: 2026-08-24
---

# Host Detail — Properties — operator guide

Route: `/admin/hosts/:hostId/orgs/properties`

> **Status:** Documented

## Progress overview

| Section              | E2E save | Validation | Docs | Notes                                                                 |
| -------------------- | -------- | ---------- | ---- | --------------------------------------------------------------------- |
| Host header shell    | Done     | —          | Done | Shared with Organizations tab                                         |
| Properties grid/list | Done     | —          | Done | Reuses org properties card/row + booking stats                        |
| Filters              | Done     | —          | Done | Search, status, type — server-side (`q`/`status`/`type` query params) |
| Pagination           | Done     | —          | Done | URL-persisted `page`/`limit`, standard admin-list pattern             |

---

## Overview

Second tab of the per-host detail shell. Lists **every property across every organization this host owns**, flattened into one list (with each card/row tagged by its owning organization's name). Unlike `/admin/properties`, this list **does** include booking/revenue/occupancy stats, computed the same way as the org-scoped properties page.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This page gives the platform team a single combined view of every property this host owns, across all of their organizations, including current booking counts, monthly revenue, and occupancy — the same numbers a host would see on their own properties page.

**Common host questions**

- Q: If I own properties under two different organizations, are they combined here?
  A: Yes — the platform team sees all of your properties together in one list, each labeled with which organization it belongs to.
- Q: Does the revenue shown here match what I see in my own dashboard?
  A: Yes — it uses the same current-month calculation as your own organization's properties page.

---

## Property card / row fields

Same fields and stats formulas as [`org/properties.md`](../../org/properties.md) (title, tower/unit subtitle, type, location, beds/baths/guests, active bookings, current-month revenue, current-month occupancy — all `Asia/Manila`), plus:

| Field                           | Source                                    |
| ------------------------------- | ----------------------------------------- |
| Organization label (above card) | `organizationName` for the property's org |

Stats are computed server-side from that property's `guest_submissions` rows (`propertyListStats.ts`), identical formula to the org properties page.

---

## Filters

| Control | Behavior                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Search  | Name, slug, tower/unit, tower, unit number, residence, address — server-side `.or()` `ILIKE` across those columns (`q` param) |
| Status  | `ACTIVE` / `INACTIVE` — server-side `.eq('status', …)`                                                                        |
| Type    | Exact match on `properties.type` (UI sends the uppercase enum value) — server-side `.eq('type', …)`                           |
| View    | Grid or list                                                                                                                  |

All three are URL-persisted via `useSearchParams` and reset `page` to 1 on change. No **Add property** action on this page (host-scoped, read-only for the platform team).

---

## Pagination

Standard admin-list pagination (same pattern as `/bookings`): `page`/`limit` are URL-persisted query params, default page size is `ADMIN_DEFAULT_PAGE_SIZE` (31). The per-page selector (`AdminListPerPageSelect`) sits alongside the search/status/type toolbar, and `AdminListPagination` renders below the list (hidden when there's only one page). Changing the per-page limit, any filter, or the host switches back to page 1.

`list-host-properties` filters and paginates at the database level: it resolves the host's org IDs, then runs `.in('organization_id', orgIds)` plus `.eq('status', …)` / `.eq('type', …)` / `.or()` `ILIKE` search and `.range(from, to)` with `{ count: 'exact' }` on `properties` — no full-table fetch. Booking/revenue/occupancy stats are still computed only for that page's properties (`propertyListStats.ts`), which was already correct and unchanged.

---

## API reference

| Action | Endpoint                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List   | `GET list-host-properties?hostId=&q=&status=&type=&page=&limit=` — searched/filtered properties across all of this host's orgs + booking/revenue/occupancy stats, paginated |

---

## Implementation map

| Concern                  | Path                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Shell (tabs)             | `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostShell.tsx` |
| Page                     | `ui/src/features/dashboard/super-admin/pages/SuperAdminHostPropertiesPage.tsx`               |
| Card / list row (shared) | `ui/src/features/dashboard/org/components/org-properties/OrgPropertyCard.tsx`                |
| Adapter                  | `ui/src/features/dashboard/super-admin/lib/hostPropertyAdapter.ts`                           |
| Filters (shared)         | `ui/src/features/dashboard/org/lib/orgPropertiesFilters.ts`                                  |
| Query hook               | `ui/src/features/dashboard/super-admin/hooks/useHosts.ts` (`useHostProperties`)              |
| Edge function            | `supabase/functions/list-host-properties/index.ts`                                           |
| Stats aggregation        | `supabase/functions/_shared/propertyListStats.ts`                                            |

---

## Related docs

- [Route index](../../README.md)
- [Host organizations tab](./orgs.md)
- [Org properties (per-org equivalent)](../../org/properties.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None known.
