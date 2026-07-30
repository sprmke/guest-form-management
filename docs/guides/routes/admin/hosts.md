# Super Admin Hosts — operator guide

Route: `/admin/hosts`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                  |
| ------------------ | -------- | ---------- | ---- | -------------------------------------- |
| Summary cards      | Done     | —          | Done | Total hosts, orgs, properties, parking |
| Search             | Done     | —          | Done | Name / email                           |
| Table / grid views | Done     | —          | Done | Toggle via `SuperAdminListViewToggle`  |

---

## Overview

Platform-wide directory of **hosts** — every distinct organization **owner** across the platform (one row per owner user, not per organization). Super admins use this list to drill into a host's organizations and properties. Read-only: there is no create/edit/delete action on this page.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This page is the platform team's directory of every host account that owns at least one organization — one row per person, even if they own several organizations or properties. Hosts don't see this page themselves.

**Common host questions**

- Q: If I own two organizations, do I show up twice in the platform team's host list?
  A: No — you appear once, and the platform team can see all of your organizations and properties from your single host record.
- Q: Does this page show my booking or revenue data?
  A: No — it only shows counts (how many organizations, properties, and parking slots you have). Booking and financial detail lives in your own dashboard.

---

## Summary cards

| Card              | Computation                                       |
| ----------------- | ------------------------------------------------- |
| **Total hosts**   | Count of distinct organization owner IDs          |
| **Organizations** | Sum of `stats.organizationCount` across all hosts |
| **Properties**    | Sum of `stats.propertyCount` across all hosts     |
| **Parking**       | Sum of `stats.parkingCount` across all hosts      |

---

## Host card / row

| Field         | Source                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Name / avatar | Supabase Auth user profile (`loadAuthUserProfile`) for the owner user               |
| Email         | Supabase Auth user profile                                                          |
| Organizations | `stats.organizationCount` — count of `organizations` rows with `owner_id = host.id` |
| Properties    | `stats.propertyCount` — count of `properties` rows across those org IDs             |
| Parking       | `stats.parkingCount` — count of `parkings` rows across those org IDs                |
| Member since  | Earliest `organizations.created_at` owned by this host                              |

Clicking a host navigates to `/admin/hosts/:hostId/orgs`.

---

## Filters

| Control | Behavior      |
| ------- | ------------- |
| Search  | Name, email   |
| View    | Table or grid |

---

## API reference

| Action | Endpoint                                                                     |
| ------ | ---------------------------------------------------------------------------- |
| List   | `GET list-hosts` — distinct organization owner IDs, one summary row per host |

---

## Implementation map

| Concern             | Path                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/super-admin/pages/SuperAdminHostsPage.tsx`                                                                                                                                 |
| Summary / toolbar   | `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsSummaryCards.tsx`, `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsToolbar.tsx` |
| Card / table        | `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostCard.tsx`, `ui/src/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostsTable.tsx`            |
| Filters             | `ui/src/features/dashboard/super-admin/lib/superAdminHostsFilters.ts`                                                                                                                                 |
| Query hooks         | `ui/src/features/dashboard/super-admin/hooks/useHosts.ts`                                                                                                                                             |
| Edge function       | `supabase/functions/list-hosts/index.ts`                                                                                                                                                              |
| Host stats / lookup | `supabase/functions/_shared/hostSerialize.ts` (`listDistinctHostOwnerIds`, `hostStatsForOwner`)                                                                                                       |

---

## Related docs

- [Route index](../README.md)
- [Host organizations guide](./host-detail/orgs.md)
- [Host properties guide](./host-detail/properties.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None known.
