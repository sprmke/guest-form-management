---
title: 'Super Admin Developments — operator guide'
status: active
tags: [guides, routes, admin, developments]
updated: 2026-08-02
---

# Super Admin Developments — operator guide

Route: `/admin/developments`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                                  |
| ------------------ | -------- | ---------- | ---- | ------------------------------------------------------ |
| Summary cards      | Done     | —          | Done | Total, active, linked properties, linked parking       |
| Search & filters   | Done     | —          | Done | Name/developer/city/location text search, status, type |
| Table / grid views | Done     | —          | Done | Toggle via `SuperAdminListViewToggle`                  |
| Add development    | Done     | Done       | Done | Dialog → navigates to detail on create                 |

---

## Overview

Platform-wide directory of **developments** (condo/subdivision/mixed-use complexes that group multiple properties and parking slots under one project). Super admins use this list to create new developments and jump into a development's settings.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

**Linking model:** a development is not a foreign key on `properties` / `parkings` — it is matched by **name**. `properties.residence_name` / `parkings.residence_name` must equal `developments.name` (case-insensitive) for a property or parking slot to count as "linked" to that development, drive its `propertyCount` / `parkingCount` stats, and appear grouped under it on `/admin/properties`.

---

## Host-facing knowledge

A development represents a whole condo or subdivision project — like "The Sapphire Bloc" — that can contain many individual units and parking slots owned by different hosts. The platform team maintains one development profile so shared details (project photos, amenities, the property-management-office email that receives approval requests) don't need to be re-entered for every unit.

**Common host questions**

- Q: My property doesn't show a development — is that a problem?
  A: No. Not every property belongs to a registered development; standalone houses or projects the platform team hasn't added yet simply won't show one.
- Q: Who receives the GAF/pet approval emails for my unit if my building has a development profile?
  A: The development's registered property-management-office email, if one is set — the platform team manages that address, not the host.

---

## Summary cards

| Card                  | Computation                                          |
| --------------------- | ---------------------------------------------------- |
| **Total**             | Count of all developments                            |
| **Active**            | Count where `status = ACTIVE`                        |
| **Linked properties** | Sum of `stats.propertyCount` across all developments |
| **Linked parking**    | Sum of `stats.parkingCount` across all developments  |

---

## Filters

| Control | Behavior                                                                 |
| ------- | ------------------------------------------------------------------------ |
| Search  | Name, developer name, city, location line, type label, status label      |
| Status  | `ACTIVE` / `INACTIVE`                                                    |
| Type    | `CONDOMINIUM` / `SUBDIVISION` / `MIXED_USE` / `TOWNHOUSE` / `COMMERCIAL` |
| View    | Table or grid                                                            |

---

## Add development

**Add development** button → dialog (name + type; status defaults to `ACTIVE`) → **`POST create-development`** → navigates to `/admin/developments/:slug` on success. Name must be 2–160 characters and unique across all developments (`409` on conflict).

---

## API reference

| Action | Endpoint                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------- |
| List   | `GET list-developments` — all developments + property/parking counts by matching `residence_name` |
| Create | `POST create-development` — `{ name, type? }`, super admin only                                   |

---

## Implementation map

| Concern           | Path                                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page              | `ui/src/features/dashboard/super-admin/pages/SuperAdminDevelopmentsPage.tsx`                                                                                                                                                      |
| Summary / toolbar | `ui/src/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsSummaryCards.tsx`, `ui/src/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsToolbar.tsx` |
| Card / table      | `ui/src/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentCard.tsx`, `ui/src/features/dashboard/super-admin/components/super-admin-developments/SuperAdminDevelopmentsTable.tsx`            |
| Add dialog        | `ui/src/features/dashboard/super-admin/components/super-admin-developments/AddDevelopmentDialog.tsx`                                                                                                                              |
| Filters           | `ui/src/features/dashboard/super-admin/lib/superAdminDevelopmentsFilters.ts`                                                                                                                                                      |
| Query hooks       | `ui/src/features/dashboard/super-admin/hooks/useDevelopments.ts`                                                                                                                                                                  |
| Edge functions    | `supabase/functions/list-developments/index.ts`, `supabase/functions/create-development/index.ts`                                                                                                                                 |
| Linking / stats   | `supabase/functions/_shared/developmentSerialize.ts` (`developmentStatsByName`)                                                                                                                                                   |

---

## Related docs

- [Route index](../README.md)
- [Development detail guide](./development-detail.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None known.
