---
title: 'Parking Announcements'
status: active
tags: [guides, routes, org, parking, announcements]
updated: 2026-09-05
---

# Parking Announcements

Route: `/org/:orgSlug/parking/:parkingSlug/announcements`

Legacy redirect: `/org/:orgSlug/parking/:parkingSlug/help-support/announcements` → dedicated route above.

> **Status:** Documented

## Overview

Identical feature to [Property Announcements](../property/announcements.md), mounted for a parking slot instead of a property. Visible to every parking team member (`bookings:view` baseline). Notices appear only on this archive — no top-of-page banner on other dashboard pages.

## Host-facing knowledge

Same as [Property Announcements](../property/announcements.md).
---

## Testing

| Layer | Path / spec                                                                  | Manual        |
| ----- | ---------------------------------------------------------------------------- | ------------- |
| Unit  | `parkingStatusMachine_test.ts`                                               | —             |
| E2E   | [`parking-playwright.md`](../testing/parking-playwright.md) guest/host specs | PayMongo live |
| N/A   | Parking host dashboard shell load                                            | —             |

## Related

- [Property Announcements](../property/announcements.md)
- [Parking Help & Support](./help-support.md)
