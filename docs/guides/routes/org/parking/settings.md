---
title: 'Parking settings — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-02
---

# Parking settings — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/settings`

> **Status:** Documented

## Overview

Configure one parking slot: name and location, cover photo, dimensions and check-in times, amenities, payment methods (including GCash QR), integrations status, and delete. Saves update the public listing guests see at `/parkings/:slug` and the admin sidebar for this slot.

---

## Host-facing knowledge

Parking **Settings** is where you set up a single slot before guests book it — photos, tower/level/slot labels, map location, size and clearance, amenities, brand color, and how guests pay. Telegram and other integrations link out to **Notifications** for credentials. Most sections save independently; deleting a slot is permanent and lives in the danger zone at the bottom.

**Common host questions**

- Q: What do guests actually see from here?
  A: Everything in basic info, photos, location, amenities, and payment flows to your public parking page. Keep cover photo, description, and GCash details accurate before sharing the link.
- Q: Why did my URL change after I edited the slot name?
  A: The public link slug can regenerate when tower, level, or slot labels change how the display name is built. The app redirects you to the new admin URL automatically.
- Q: Where do I connect Telegram for this parking slot?
  A: On **Notifications** for this slot — settings here only show integration status and shortcuts, not the bot token fields.

---

## Sections

| Section         | Storage                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic info      | `parkings` columns + `parkings.settings` — slug (auto from display name), `brandColor`, `description`; `residence_name`, `parking_type`, `tower`, `level`, `slot_label`         |
| Photos          | `parkings.settings.coverImage` + `coverImageStoragePath` via **`upload-parking-media`** (single image max)                                                                      |
| Parking details | `parkings.settings` — optional `spaceLengthM`, `spaceWidthM`, `heightClearanceM`; `checkInTime`, `checkOutTime` (defaults `14:00`, `12:00`) via **`ParkingDetailsSection`**     |
| Amenities       | `parkings.settings.enabledParkingAmenities`, `customParkingAmenities`, resolved `features[]` (public listing) via **`PATCH update-parking`**                                    |
| Location        | `parkings.settings` — `address`, `city`, `province`, `country`, `zipCode`, `latitude`, `longitude`, `mapsUrl`, `placeId` (same shape as property; **`PropertyLocationPicker`**) |
| Payment         | `parking_settings` (`payment_methods`, GCash QR via **`upload-parking-settings-asset`**)                                                                                        |
| Integrations    | `PropertyIntegrationsPanel` (`telegramLayout="parking"`) — Google status (flags), single **Parking** Telegram channel → notifications page, AI services (platform env)          |
| Danger zone     | `DELETE delete-parking`                                                                                                                                                         |

### Basic info fields

| Field                | Storage                                                                                                                                                                       | Public page                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| URL Slug             | `parkings.slug` (read-only preview; regenerates when tower/level/slot change the display name)                                                                                | `/parkings/:slug`                                 |
| Brand color          | `parkings.settings.brandColor` (empty = inherit org). Where it applies is a **?** tooltip on the label (`FieldLabel`). Admin and listing accents use that hex as `--primary`. | Listing accents via **`ParkingPublicBrandShell`** |
| Parking type         | `parkings.parking_type`                                                                                                                                                       | Type badge on **`ParkingOverview`**               |
| Residence            | `parkings.residence_name`                                                                                                                                                     | Development link in **`ListingPlaceMeta`**        |
| Tower / Level / Slot | `parkings.tower`, `level`, `slot_label`                                                                                                                                       | **`ListingPlaceMeta`** placement labels           |
| Description          | `parkings.settings.description` (legacy `notes` migrated on save)                                                                                                             | **About this parking** section                    |

### Parking details fields

| Field                | Storage                                                         | Public page                                |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Length (m)           | `parkings.settings.spaceLengthM` (default **5.0**)              | Stats grid on **`ParkingOverview`**        |
| Width (m)            | `parkings.settings.spaceWidthM` (default **2.5**)               | Same                                       |
| Height clearance     | `parkings.settings.heightClearanceM` (default **2.1**)          | Same                                       |
| Check-in / Check-out | `checkInTime`, `checkOutTime` (24h, defaults `14:00` / `12:00`) | **`ListingCheckInOutTimes`** (12h display) |

---

## Save paths

- Basic → `PATCH update-parking`
- Photos → `POST` / `DELETE` **`upload-parking-media?parking_id=`** (auto-saved on upload/remove)
- Parking details → `PATCH update-parking` (`settings.spaceLengthM`, `spaceWidthM`, `heightClearanceM`, `checkInTime`, `checkOutTime`)
- Amenities → `PATCH update-parking` (`settings.enabledParkingAmenities`, `settings.customParkingAmenities`, `settings.features`)
- Location → `PATCH update-parking` (location fields in `parkings.settings`)
- Payment methods → `PATCH parking-settings?parking_id=`; primary QR → **`upload-parking-settings-asset?parking_id=`**
- Integrations status → `GET parking-settings?parking_id=` (`parkingIntegrations`, `platformSecrets`); Telegram credentials saved from **Notifications** modules
- Delete → `DELETE delete-parking`

When the display name changes and the slug is regenerated, the app navigates to the new `/org/.../parking/:newSlug/settings` URL.

---

## Implementation map

| Concern              | Path                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| Page                 | `ui/src/features/dashboard/parking/pages/ParkingSettingsPage.tsx`        |
| Card                 | `ui/src/features/dashboard/parking/components/ParkingSettingsCard.tsx`   |
| Field label + help   | `ui/src/components/forms/FieldLabel.tsx`                                 |
| Details section      | `ui/src/features/dashboard/parking/components/ParkingDetailsSection.tsx` |
| Form draft           | `ui/src/features/dashboard/parking/lib/parkingSettingsForm.ts`           |
| Brand resolve (edge) | `supabase/functions/_shared/parkingBranding.ts`                          |
| Public API           | `get-public-parking` → `loadPublicParkingBySlug`                         |
| Public UI            | `ParkingDetailPage`, `ParkingOverview`, `ParkingPublicBrandShell`        |
