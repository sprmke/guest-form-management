---
title: 'Host Detail — Organizations — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-24
---

# Host Detail — Organizations — operator guide

Route: `/admin/hosts/:hostId/orgs`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                                     |
| ------------------ | -------- | ---------- | ---- | --------------------------------------------------------- |
| Host header shell  | Done     | —          | Done | Avatar/initial, name, email, tabs                         |
| Organizations grid | Done     | —          | Done | Read-only cards + stats                                   |
| Pagination         | Done     | —          | Done | URL-persisted `page`/`limit`, standard admin-list pattern |

---

## Overview

Default tab of the per-host detail shell (`/admin/hosts/:hostId` redirects here). Lists every organization owned by this host, with per-org linked property/parking counts. Read-only — no create/edit action for organizations from this page.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This page shows the platform team every organization a given host owns, side by side with how many properties and parking slots each one has. It's a lookup view for the platform team, not something hosts interact with.

**Common host questions**

- Q: If I own more than one organization, will the platform team see all of them here?
  A: Yes — every organization you own appears on this page under your host profile.
- Q: Can the platform team edit my organization's settings from here?
  A: No — this page only displays organizations; editing happens in your own organization settings, not from the platform team's directory.

---

## Host header shell (shared with Properties tab)

Renders once for both `/orgs` and `/orgs/properties` tabs: host avatar (or initial fallback), name, email, and a two-tab pill switcher (**Organizations** / **Properties**). If `hostId` is missing, redirects to `/admin/hosts`.

---

## Organization card fields

| Field              | Source                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Name / slug / logo | `organizations.name`, `.slug`, `.settings` logo                   |
| Description        | `organizations.description`                                       |
| Host modes         | `organizations.settings.hostModes` (property / parking)           |
| Linked properties  | Count of `properties` rows where `organization_id = org.id`       |
| Linked parking     | Count of `parkings` rows where `organization_id = org.id`         |
| Access kind        | Always `owner` on this page (host is always the org's owner here) |

---

## Behavior / edge cases

- Empty state renders when the host owns zero organizations (shouldn't normally happen since hosts are derived from org ownership, but handled defensively).
- Loading and error states are simple spinner / inline message — no skeleton grid.

---

## Pagination

Standard admin-list pagination (same pattern as `/bookings`): `page`/`limit` are URL-persisted query params, default page size is `ADMIN_DEFAULT_PAGE_SIZE` (31). The pager (`AdminListPagination`) and a per-page selector (`AdminListPerPageSelect`) render above/below the grid; the pager is hidden when there's only one page. Switching to a different host (route `hostId` change) resets back to page 1.

`list-host-organizations` paginates at the database level — `.eq('owner_id', hostId).order('name').range(from, to)` with `{ count: 'exact' }` — instead of fetching every organization the host owns and slicing in memory. Per-org property/parking counts are still computed only for the paged rows. Returns `{ organizations, total, page, limit }`.

---

## API reference

| Action | Endpoint                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Host   | `GET get-host?hostId=` — profile + aggregate stats (used by the shell header)                                                      |
| Orgs   | `GET list-host-organizations?hostId=&page=&limit=` — organizations owned by this host + per-org property/parking counts, paginated |

---

## Implementation map

| Concern        | Path                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Shell (tabs)   | `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostShell.tsx`   |
| Page           | `ui/src/features/dashboard/super-admin/pages/SuperAdminHostOrgsPage.tsx`                       |
| Card           | `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostOrgCard.tsx` |
| Query hooks    | `ui/src/features/dashboard/super-admin/hooks/useHosts.ts` (`useHost`, `useHostOrganizations`)  |
| Edge functions | `supabase/functions/get-host/index.ts`, `supabase/functions/list-host-organizations/index.ts`  |

---

## Related docs

- [Route index](../../README.md)
- [Host properties tab](./properties.md)
- [Hosts list](../hosts.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None known.
