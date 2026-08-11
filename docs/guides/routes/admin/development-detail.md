---
title: 'Development Settings — operator guide'
status: active
tags: [guides, routes, admin, developments]
updated: 2026-08-03
---

# Development Settings — operator guide

Route: `/admin/developments/:developmentSlug`

> **Status:** Documented

## Progress overview

| Section               | E2E save | Validation | Docs | Notes                                                             |
| --------------------- | -------- | ---------- | ---- | ----------------------------------------------------------------- |
| Basic Information     | Done     | Done       | Done | Name, slug, developer, type, status, description                  |
| Photos & Videos       | Done     | Done       | Done | Shared `PropertyMediaUpload`; saves immediately on reorder/upload |
| Email automations     | Done     | Done       | Done | PMO email (optional)                                              |
| Document Requirements | Done     | Done       | Done | Ordered checklist for PENDING_DOCUMENTS (all properties in dev)   |
| Unit types            | Done     | Done       | Done | Per-type max adults/children capacity presets                     |
| Amenities             | Done     | —          | Done | Suggested chips + free-text add                                   |
| Location              | Done     | Done       | Done | Location line + `PropertyLocationPicker`                          |
| Towers & Parking      | Done     | —          | Done | Free-text tag lists                                               |
| Danger Zone           | Done     | Done       | Done | Delete blocked (409) while linked                                 |

---

## Overview

Single-development settings page for a super admin to edit a development's public profile and manage its lifecycle. All sections save together via one **Save Changes** action, except the media gallery, which persists immediately on upload/reorder/delete.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This page is where the platform team maintains the shared profile for a condo or subdivision project — its name, photos, amenities, location, and the property-management-office email that receives approval requests for every unit inside it. Hosts with a unit inside a registered development benefit from this shared information automatically; they don't edit it themselves.

**Common host questions**

- Q: Can I update my building's development photos or amenities myself?
  A: No — development-level details are managed by the platform team, since they're shared across every unit in the project. Contact the platform team if something needs updating.
- Q: What happens to my unit if the development profile is deleted?
  A: The platform team can't delete a development while properties or parking slots are still linked to it — they'd need to reassign or remove those first, so this shouldn't affect an active unit unexpectedly.

---

## Basic Information

### Fields

| Field       | Storage                       | Validation                                                                      |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Name        | `developments.name`           | 2–160 chars, unique across developments                                         |
| URL slug    | `developments.slug`           | Non-empty, unique; changing it redirects the page                               |
| Developer   | `developments.developer_name` | Optional                                                                        |
| Type        | `developments.type`           | One of `CONDOMINIUM` / `SUBDIVISION` / `MIXED_USE` / `TOWNHOUSE` / `COMMERCIAL` |
| Status      | `developments.status`         | `ACTIVE` / `INACTIVE`                                                           |
| Description | `developments.description`    | Optional free text                                                              |

### Save path

1. **Save Changes** → **`PATCH update-development`** with `developmentId` + changed fields.
2. On success, if the returned `slug` differs from the URL param (name/slug edit), the page navigates to the new slug in place.

---

## Photos & Videos

Reuses the property media-upload component (`PropertyMediaUpload`), scoped by `developmentId` instead of `propertyId`. Uploads/deletes/reorders call **`upload-development-media`** directly and persist immediately — they are not part of the batched Save Changes flow. First uploaded (or first reordered-to-front) image becomes `cover_image_url` automatically. Limits mirror property media (max image/video counts, per-type size caps) from `_shared/propertyMedia.ts`.

---

## Email automations

| Field     | Storage                          | Validation                                                                                                                                                                                    |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PMO email | `developments.settings.pmoEmail` | Optional; must be a valid email if set. Canonical **To:** for GAF/pet approval request emails for every property in this development (overrides legacy per-property `app_settings.email_to`). |

Receives GAF and pet approval requests for **all** properties inside this development (see `.cursor/rules/booking-workflow.mdc` for the request-email flow itself; this field only configures the recipient).

---

## Document Requirements

Ordered checklist of documents required before a booking reaches **Ready for check-in** — applies to every property whose `residence_name` matches this development.

| Field         | Storage                                                       | Notes                                                           |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Document list | `developments.settings.workflowDefaults.documentRequirements` | JSON array; empty list → bookings skip `PENDING_DOCUMENTS` (D2) |

Each row: **label**, **trigger** (Always required / Guest has pets / Guest needs parking), **approval source** (Manual / Email listener).

Save path: batched **Save Changes** → **`PATCH update-development`** with `documentRequirements`.

Edge resolution for bookings: `documentRequirements.ts#resolveDocumentRequirements` (property override column deprecated; development default → `DEFAULT_DOCUMENT_REQUIREMENTS` fallback).

---

## Unit types

Per-unit capacity presets for properties in this development. Stored in **`developments.settings.unitTypes`** (JSON array).

| Field per row | Notes                                                              |
| ------------- | ------------------------------------------------------------------ |
| `id`          | Stable slug (e.g. `studio`, `1br`, `2br`)                          |
| `label`       | Host-facing name (e.g. `Studio`, `1 bedroom`)                      |
| `maxAdults`   | Maximum adults allowed in the unit                                 |
| `maxChildren` | Maximum children allowed (occupancy rule: age ≤ 3 counts as child) |

**Azure North defaults** (when unset): Studio — 4 adults / 1 child; 1 bedroom — 6 / 2; 2 bedroom — 8 / 3.

Save path: batched **Save Changes** → **`PATCH update-development`** with `unitTypes`.

Public read: **`GET get-residence-unit-types?residenceName=`** (used by property settings + guest form capacity).

Properties pick one type under **Property Details → Unit type**; max adults/children are derived from the selection.

---

## Amenities

Stored as `developments.settings.amenities` (string array). Suggested chips toggle on/off; a free-text input appends custom entries not in the suggestion list.

---

## Location

| Field                                                                       | Storage                                                                                            |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Location line                                                               | `developments.location`                                                                            |
| Address / city / province / country / zip / lat / lng / Maps URL / place ID | `developments.settings.{address,city,province,country,zipCode,latitude,longitude,mapsUrl,placeId}` |

Uses the shared `PropertyLocationPicker`. The location line auto-suggests from city + province when it was previously empty or itself auto-generated (`shouldAutoUpdateDevelopmentLocationLine`) — a manually-typed location line is never overwritten by the picker.

---

## Towers & Parking

Three free-text tag lists stored in `developments.settings`: `propertyTowers`, `parkingTowers`, `parkingLevels`. These populate tower/level choices offered to admins when they set up individual properties/parking slots that belong to this development.

---

## Danger Zone

**Delete** → **`POST delete-development`**. Server counts `properties` and `parkings` rows whose `residence_name` matches the development's `name` (case-sensitive exact match) and returns **409** ("Cannot delete a development that still has linked properties or parking slots") if either count is `> 0`. The UI disables the Delete button and shows the same reason whenever `stats.propertyCount` or `stats.parkingCount` is non-zero.

---

## API reference

| Action       | Endpoint                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| Get          | `GET get-development?slug=` — single development + stats                                  |
| Update       | `PATCH update-development` — `{ developmentId, ...changed fields }`                       |
| Delete       | `POST delete-development` — `{ developmentId }`; `409` if properties/parking still linked |
| Upload media | `POST upload-development-media?development_id=` — FormData `file`                         |
| Delete media | `DELETE upload-development-media?development_id=` — `{ storagePath                        | mediaId }` |

---

## Implementation map

| Concern               | Path                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                  | `ui/src/features/dashboard/super-admin/pages/SuperAdminDevelopmentDetailPage.tsx`                                                                                                                         |
| Settings shell        | `ui/src/features/dashboard/super-admin/components/super-admin-development-settings/DevelopmentSettingsCard.tsx`                                                                                           |
| Section fields        | `ui/src/features/dashboard/super-admin/components/super-admin-development-settings/DevelopmentProfileSections.tsx`                                                                                        |
| Form draft / diff     | `ui/src/features/dashboard/super-admin/lib/developmentSettingsForm.ts`                                                                                                                                    |
| Media adapter         | `ui/src/features/dashboard/super-admin/lib/developmentMedia.ts`                                                                                                                                           |
| Location auto-suggest | `ui/src/features/dashboard/super-admin/lib/developmentLocation.ts`                                                                                                                                        |
| Constants             | `ui/src/features/dashboard/super-admin/lib/developmentSettingsConstants.ts`                                                                                                                               |
| Query hooks           | `ui/src/features/dashboard/super-admin/hooks/useDevelopments.ts`, `ui/src/features/dashboard/super-admin/hooks/useUploadDevelopmentMedia.ts`                                                              |
| Edge functions        | `supabase/functions/get-development/index.ts`, `supabase/functions/update-development/index.ts`, `supabase/functions/delete-development/index.ts`, `supabase/functions/upload-development-media/index.ts` |

---

## Related docs

- [Route index](../README.md)
- [Developments list guide](./developments.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None known.
