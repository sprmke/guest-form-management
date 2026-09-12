---
title: 'Activity — operator guide'
status: active
tags: [guides, routes, org, parking, activity, audit-log]
updated: 2026-09-06
---

# Activity — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/activity`

> **Status:** Documented

## Overview

Parking-scoped slice of the org **activity / audit timeline** — every action against **this parking listing**: broadcast claims / declines, status changes, cancellations, payout actions, team changes, settings / pricing edits, and guest parking requests. Read-only.

Same feed / filters / detail sheet as the org-level page ([org/activity.md](../activity.md)); scope is locked to this parking (`scope=parking`, `parkingId` bound).

## Permissions

Gated on the coarse **`bookings:view`** parking permission (parking RBAC stays coarse until parking granular RBAC ships). No dedicated `activity` leaf in v1.
---

## Testing

| Layer | Path / spec                                                                  | Manual        |
| ----- | ---------------------------------------------------------------------------- | ------------- |
| Unit  | `parkingStatusMachine_test.ts`                                               | —             |
| E2E   | [`parking-playwright.md`](../testing/parking-playwright.md) guest/host specs | PayMongo live |
| N/A   | Parking host dashboard shell load                                            | —             |

## Related

- Org-wide view: [org/activity.md](../activity.md) · Property: [org/property/activity.md](../property/activity.md)
